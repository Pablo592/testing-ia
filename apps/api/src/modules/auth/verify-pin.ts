// Módulo auth: única verificación de PIN (`verifyPin`, SEC-016) y único cálculo
// de hashes nuevos (`hashNewPin`). Es el ÚNICO componente que recibe el hasher
// (docs/arquitectura.md §2.1, §7). Las rutas solo traducen `reason` a su
// error público. Único punto que emite auth_verifications_total y auth.verify.*.
import { sql } from 'kysely';
import { lockoutForFailures } from '@mi-app/shared/lockout';
import { validatePin, type PinRule, type Role } from '@mi-app/shared/pin';
import { secondsUntil } from '@mi-app/shared/retry';
import type { Clock } from '../../clock.ts';
import type { Db } from '../../db/database.ts';
import type { Logger } from '../../logging/logger.ts';
import type { AppMetrics, Purpose, VerifyResult } from '../../metrics/metrics.ts';
import { DUMMY_PIN_HASH, type PinHasher } from './hasher.ts';
import { FailureWindow, IP_LIMIT, SESSION_APPROVAL_LIMIT } from './rate-limit.ts';

/** Datos del usuario cuyo PIN se verifica (leídos por la ruta). */
export interface PinTarget {
  id: string;
  role: Role;
  pin_hash: string;
  locked_until: Date | null;
  locked_manual: boolean;
}

export interface VerifyContext {
  ip: string;
  sessionId?: string;
  purpose: Purpose;
  /** Logger de la petición (lleva request_id); si no, el del módulo. */
  log?: Logger;
  uaFamily?: string;
}

export type VerifyOutcome =
  | { ok: true }
  | {
      ok: false;
      reason: 'invalid' | 'locked' | 'locked_manual' | 'rate_limited';
      retryAfterSeconds?: number;
      scope?: 'ip' | 'session';
      /** Contador del usuario tras este fallo (solo `invalid` con usuario). */
      failedAttempts?: number;
      /** Este fallo ha llevado la cuenta al bloqueo indefinido y ha revocado todas sus sesiones. */
      lockedManualNow?: boolean;
    };

export type HashResult = { ok: true; hash: string } | { ok: false; rule: PinRule };

export interface AuthModuleDeps {
  db: Db;
  hasher: PinHasher;
  clock: Clock;
  log: Logger;
  metrics: AppMetrics;
  /** Tras el COMMIT de una revocación: cierra los flujos SSE y devuelve cuántos cerró. */
  onSessionsRevoked: (sessionIds: string[], reason: 'account_locked_manual') => number;
}

export interface AuthModule {
  verifyPin(target: PinTarget | null, pin: string, ctx: VerifyContext): Promise<VerifyOutcome>;
  hashNewPin(pin: string, role: Role): Promise<HashResult>;
  /** Milisegundos de bloqueo que quedan a una IP (también para GET /auth/login-options). */
  ipBlockedFor(ip: string): number;
  stop(): void;
}

const DAY_MS = 24 * 3600_000;

export function createAuthModule(deps: AuthModuleDeps): AuthModule {
  const { db, hasher, clock, metrics } = deps;
  const ipLimiter = new FailureWindow(IP_LIMIT);
  const sessionLimiter = new FailureWindow(SESSION_APPROVAL_LIMIT);
  /** Bloqueos por usuario en las últimas 24 h (campo lockouts_24h). */
  const lockHistory = new Map<string, number[]>();

  function lockouts24h(userId: string, nowMs: number): number {
    const list = (lockHistory.get(userId) ?? []).filter((t) => t > nowMs - DAY_MS);
    list.push(nowMs);
    lockHistory.set(userId, list);
    return list.length;
  }

  function count(purpose: Purpose, result: VerifyResult): void {
    metrics.verifications.inc({ purpose, result });
  }

  async function registerFailure(
    target: PinTarget,
    ctx: VerifyContext,
    log: Logger,
  ): Promise<{ failedAttempts: number; lockedManualNow: boolean }> {
    const now = clock.now();
    const result = await db.transaction().execute(async (trx) => {
      const row = await trx
        .updateTable('users')
        .set({ failed_attempts: sql<number>`failed_attempts + 1`, updated_at: now })
        .where('id', '=', target.id)
        .returning(['failed_attempts', 'role'])
        .executeTakeFirst();
      if (!row) return { failedAttempts: 0, role: target.role, lock: { kind: 'none' } as const, revoked: [] as string[], lockedUntil: null };
      const lock = lockoutForFailures(row.failed_attempts);
      let revoked: string[] = [];
      let lockedUntil: Date | null = null;
      if (lock.kind === 'temporary') {
        lockedUntil = new Date(now.getTime() + lock.minutes * 60_000);
        await trx.updateTable('users').set({ locked_until: lockedUntil }).where('id', '=', target.id).execute();
      } else if (lock.kind === 'manual') {
        await trx.updateTable('users').set({ locked_manual: true }).where('id', '=', target.id).execute();
        const rows = await trx
          .updateTable('sessions')
          .set({ revoked_at: now, revoked_reason: 'account_locked_manual' })
          .where('user_id', '=', target.id)
          .where('revoked_at', 'is', null)
          .returning('id')
          .execute();
        revoked = rows.map((r) => r.id);
      }
      return { failedAttempts: row.failed_attempts, role: row.role, lock, revoked, lockedUntil };
    });

    if (result.lock.kind !== 'none') {
      const manual = result.lock.kind === 'manual';
      metrics.lockouts.inc({ kind: result.lock.kind, purpose: ctx.purpose, target_role: result.role });
      const fields: Record<string, unknown> = {
        event: 'auth.account.locked',
        category: 'security',
        client_ip: ctx.ip,
        ua_family: ctx.uaFamily,
        purpose: ctx.purpose,
        target_user_id: target.id,
        target_role: result.role,
        lock_kind: result.lock.kind,
        failed_attempts: result.failedAttempts,
        lockouts_24h: lockouts24h(target.id, now.getTime()),
      };
      if (manual) fields.sessions_revoked = result.revoked.length;
      else fields.locked_until = result.lockedUntil?.toISOString();
      if (manual) log.error(fields, 'Cuenta bloqueada de forma indefinida');
      else log.warn(fields, 'Cuenta bloqueada temporalmente');
    }
    if (result.lock.kind === 'manual') {
      const sseClosed = deps.onSessionsRevoked(result.revoked, 'account_locked_manual');
      metrics.sessionsRevokedOnLock.inc(result.revoked.length);
      metrics.sessionsEnded.inc({ reason: 'account_locked_manual' }, result.revoked.length);
      log.warn(
        {
          event: 'auth.sessions.revoked',
          category: 'security',
          client_ip: ctx.ip,
          ua_family: ctx.uaFamily,
          target_user_id: target.id,
          reason: 'account_locked_manual',
          purpose: ctx.purpose,
          sessions_revoked: result.revoked.length,
          sse_closed: sseClosed,
          from_own_session: ctx.sessionId !== undefined && result.revoked.includes(ctx.sessionId),
        },
        'Sesiones revocadas por bloqueo indefinido',
      );
    }
    return { failedAttempts: result.failedAttempts, lockedManualNow: result.lock.kind === 'manual' };
  }

  async function verifyPin(target: PinTarget | null, pin: string, ctx: VerifyContext): Promise<VerifyOutcome> {
    const log = ctx.log ?? deps.log;
    const nowMs = clock.now().getTime();
    const base = { category: 'security', client_ip: ctx.ip, ua_family: ctx.uaFamily, purpose: ctx.purpose };

    // 1. Límite por IP (todos los usos), antes del hash.
    const ipWait = ipLimiter.blockedFor(ctx.ip, nowMs);
    if (ipWait > 0) {
      const retryAfterSeconds = secondsUntil(nowMs + ipWait, nowMs);
      count(ctx.purpose, 'rate_limited_ip');
      log.warn({ event: 'auth.verify.rate_limited', ...base, scope: 'ip', retry_after_s: retryAfterSeconds }, 'Demasiados intentos desde el dispositivo');
      return { ok: false, reason: 'rate_limited', scope: 'ip', retryAfterSeconds };
    }

    // 2. Límite por sesión: solo aprobaciones (T-20).
    if (ctx.purpose === 'approval' && ctx.sessionId) {
      const sWait = sessionLimiter.blockedFor(ctx.sessionId, nowMs);
      if (sWait > 0) {
        const retryAfterSeconds = secondsUntil(nowMs + sWait, nowMs);
        count(ctx.purpose, 'rate_limited_session');
        log.warn(
          { event: 'auth.verify.rate_limited', ...base, scope: 'session', session_id: ctx.sessionId, retry_after_s: retryAfterSeconds },
          'Demasiadas aprobaciones fallidas en la sesión',
        );
        return { ok: false, reason: 'rate_limited', scope: 'session', retryAfterSeconds };
      }
    }

    // 3. Bloqueo de la cuenta: sin hash y sin contar (en aprobación suma IP y sesión).
    if (target && (target.locked_manual || (target.locked_until && target.locked_until.getTime() > nowMs))) {
      const manual = target.locked_manual;
      const retryAfterSeconds = manual ? undefined : secondsUntil(target.locked_until!.getTime(), nowMs);
      count(ctx.purpose, 'locked');
      log.warn(
        {
          event: 'auth.verify.locked',
          ...base,
          target_user_id: target.id,
          lock_kind: manual ? 'manual' : 'temporary',
          ...(retryAfterSeconds === undefined ? {} : { retry_after_s: retryAfterSeconds }),
        },
        'Intento con la cuenta bloqueada',
      );
      if (ctx.purpose === 'approval') {
        // SEC-025: indistinguible de un PIN erróneo; la igualación de tiempo llega con HU-06.
        ipLimiter.recordFailure(ctx.ip, nowMs);
        if (ctx.sessionId) sessionLimiter.recordFailure(ctx.sessionId, nowMs);
        return { ok: false, reason: 'invalid' };
      }
      return manual ? { ok: false, reason: 'locked_manual' } : { ok: false, reason: 'locked', retryAfterSeconds };
    }

    // 4. Hash (con un hash ficticio si el usuario no existe: tiempo constante).
    const ok = await hasher.verify(target?.pin_hash ?? DUMMY_PIN_HASH, pin);
    if (ok && target) {
      await db
        .updateTable('users')
        .set({ failed_attempts: 0, locked_until: null })
        .where('id', '=', target.id)
        .where((eb) => eb.or([eb('failed_attempts', '<>', 0), eb('locked_until', 'is not', null)]))
        .execute();
      count(ctx.purpose, 'success');
      return { ok: true };
    }

    // 5. Fallo: contadores de IP (y de sesión en aprobaciones) y del usuario.
    const failedAt = clock.now().getTime();
    ipLimiter.recordFailure(ctx.ip, failedAt);
    if (ctx.purpose === 'approval' && ctx.sessionId) sessionLimiter.recordFailure(ctx.sessionId, failedAt);
    count(ctx.purpose, 'invalid');
    if (!target) return { ok: false, reason: 'invalid' };
    const { failedAttempts, lockedManualNow } = await registerFailure(target, ctx, log);
    return { ok: false, reason: 'invalid', failedAttempts, lockedManualNow };
  }

  async function hashNewPin(pin: string, role: Role): Promise<HashResult> {
    const v = validatePin(pin, role);
    if (!v.ok) return { ok: false, rule: v.rule };
    return { ok: true, hash: await hasher.hash(pin) };
  }

  return {
    verifyPin,
    hashNewPin,
    ipBlockedFor: (ip) => ipLimiter.blockedFor(ip, clock.now().getTime()),
    stop() {
      ipLimiter.clear();
      sessionLimiter.clear();
      lockHistory.clear();
    },
  };
}
