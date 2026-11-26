// Módulo auth: única verificación de PIN (`verifyPin`, SEC-016) y único cálculo
// de hashes nuevos (`hashNewPin`). Es el ÚNICO componente que recibe el hasher
// (docs/arquitectura.md §2.1, §7). Las rutas solo traducen `reason` a su
// error público. Único punto que emite auth_verifications_total y auth.verify.*.
import { sql, type Transaction } from 'kysely';
import { lockoutForFailures } from '@mi-app/shared/lockout';
import { validatePin, type PinRule, type Role } from '@mi-app/shared/pin';
import { secondsUntil } from '@mi-app/shared/retry';
import type { Clock } from '../../clock.ts';
import type { Db } from '../../db/database.ts';
import type { Database } from '../../db/schema.ts';
import type { Logger } from '../../logging/logger.ts';
import type { AppMetrics, Purpose, VerifyResult } from '../../metrics/metrics.ts';
import { DUMMY_PIN_HASH, type PinHasher } from './hasher.ts';
import { FailureWindow, IP_LIMIT, SESSION_APPROVAL_LIMIT } from './rate-limit.ts';
import { KeyedSerializer, Semaphore } from './serialize.ts';

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

export type VerifyFailure = {
  ok: false;
  reason: 'invalid' | 'locked' | 'locked_manual' | 'rate_limited';
  retryAfterSeconds?: number;
  scope?: 'ip' | 'session';
  /** Contador del usuario tras este fallo (solo `invalid` con usuario). */
  failedAttempts?: number;
  /** Este fallo ha llevado la cuenta al bloqueo indefinido y ha revocado todas sus sesiones. */
  lockedManualNow?: boolean;
};

export type VerifyOutcome = { ok: true } | VerifyFailure;

/**
 * Un intento de PIN completo (SEC-038, RS-05b). Todo ocurre dentro del
 * cerrojo de la cuenta (`accountKey`), en este orden:
 *  1. reserva síncrona del cupo de IP (y de sesión en aprobaciones), antes de cualquier `await`;
 *  2. resolución de la clave de la cuenta (`user:<id>`, SEC-047), espera de su
 *     turno y `load()` con el estado de bloqueo ACTUAL;
 *  3. cuenta bloqueada → rechazo sin hash ni conteo;
 *  4. hash; si falla, se anota en IP, sesión y cuenta (escala 5/10/15/20);
 *  5. si acierta, `prepare()` (p. ej. hash del PIN nuevo) y una transacción que
 *     pone el contador a 0 SOLO si la cuenta sigue sin bloqueo
 *     (`UPDATE … WHERE NOT locked_manual AND (locked_until IS NULL OR locked_until <= now)`)
 *     y, en ella, `onSuccess` (crear la sesión, cambiar el PIN). Si la cuenta se
 *     bloqueó entretanto, no se crea sesión ni se cambia nada: `423`.
 */
export interface PinAttempt<U extends PinTarget, P, T> {
  /**
   * Carril del cerrojo de la cuenta (SEC-047): `user:<id>` de la cuenta, resuelto
   * con la misma condición que la búsqueda (`lower(name) = lower($1)` de
   * PostgreSQL), nunca con `toLowerCase()` de JavaScript. Puede ser una función
   * asíncrona: se resuelve DESPUÉS de la reserva síncrona del cupo de IP.
   */
  accountKey: string | (() => Promise<string>);
  load(): Promise<U | null>;
  pin: string;
  ctx: VerifyContext;
  prepare?(user: U): Promise<P>;
  onSuccess(trx: Transaction<Database>, user: U, prepared: P | undefined): Promise<T>;
}

export type AttemptOutcome<U, T> = { ok: true; user: U; value: T } | (VerifyFailure & { user: U | null });

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
  verifyPin<U extends PinTarget, P, T>(attempt: PinAttempt<U, P, T>): Promise<AttemptOutcome<U, T>>;
  hashNewPin(pin: string, role: Role): Promise<HashResult>;
  /** Milisegundos de bloqueo que quedan a una IP (también para GET /auth/login-options). */
  ipBlockedFor(ip: string): number;
  stop(): void;
}

const DAY_MS = 24 * 3600_000;
/** Operaciones argon2 simultáneas (SEC-038 punto 4; el threadpool de libuv tiene 4 hilos por defecto). */
export const ARGON2_CONCURRENCY = 4;

/** Señal interna: la cuenta se bloqueó entre la lectura y el acierto (se deshace la transacción). */
class AccountLockedDuringVerify extends Error {}

export function createAuthModule(deps: AuthModuleDeps): AuthModule {
  const { db, hasher, clock, metrics } = deps;
  const ipLimiter = new FailureWindow(IP_LIMIT);
  const sessionLimiter = new FailureWindow(SESSION_APPROVAL_LIMIT);
  const accounts = new KeyedSerializer();
  const argon2Slots = new Semaphore(ARGON2_CONCURRENCY);
  const verifyHash = (hash: string, pin: string) => argon2Slots.run(() => hasher.verify(hash, pin));
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

  function isLocked(t: PinTarget, nowMs: number): boolean {
    return t.locked_manual || (t.locked_until !== null && t.locked_until.getTime() > nowMs);
  }

  function lockedOutcome(t: PinTarget, nowMs: number): VerifyFailure {
    if (t.locked_manual || !t.locked_until) return { ok: false, reason: 'locked_manual' };
    return { ok: false, reason: 'locked', retryAfterSeconds: secondsUntil(t.locked_until.getTime(), nowMs) };
  }

  async function verifyPin<U extends PinTarget, P, T>(attempt: PinAttempt<U, P, T>): Promise<AttemptOutcome<U, T>> {
    const { ctx } = attempt;
    const log = ctx.log ?? deps.log;
    const nowMs = clock.now().getTime();
    const base = { category: 'security', client_ip: ctx.ip, ua_family: ctx.uaFamily, purpose: ctx.purpose };
    const approval = ctx.purpose === 'approval' && ctx.sessionId !== undefined;

    // 1. Reserva síncrona del cupo de IP (todos los usos), antes del primer await.
    const ipRes = ipLimiter.tryReserve(ctx.ip, nowMs);
    if (!ipRes.ok) {
      const retryAfterSeconds = secondsUntil(nowMs + ipRes.waitMs, nowMs);
      count(ctx.purpose, 'rate_limited_ip');
      log.warn({ event: 'auth.verify.rate_limited', ...base, scope: 'ip', retry_after_s: retryAfterSeconds }, 'Demasiados intentos desde el dispositivo');
      return { ok: false, reason: 'rate_limited', scope: 'ip', retryAfterSeconds, user: null };
    }

    // 2. Cupo por sesión: solo aprobaciones (T-20).
    if (approval && ctx.sessionId) {
      const sRes = sessionLimiter.tryReserve(ctx.sessionId, nowMs);
      if (!sRes.ok) {
        ipLimiter.release(ctx.ip);
        const retryAfterSeconds = secondsUntil(nowMs + sRes.waitMs, nowMs);
        count(ctx.purpose, 'rate_limited_session');
        log.warn(
          { event: 'auth.verify.rate_limited', ...base, scope: 'session', session_id: ctx.sessionId, retry_after_s: retryAfterSeconds },
          'Demasiadas aprobaciones fallidas en la sesión',
        );
        return { ok: false, reason: 'rate_limited', scope: 'session', retryAfterSeconds, user: null };
      }
    }

    // Cada reserva se cierra exactamente una vez: como fallo o liberada.
    let settled = false;
    const settle = (failed: boolean) => {
      if (settled) return;
      settled = true;
      const at = clock.now().getTime();
      if (failed) ipLimiter.commitFailure(ctx.ip, at);
      else ipLimiter.release(ctx.ip);
      if (approval && ctx.sessionId) {
        if (failed) sessionLimiter.commitFailure(ctx.sessionId, at);
        else sessionLimiter.release(ctx.sessionId);
      }
    };

    try {
      const key = typeof attempt.accountKey === 'string' ? attempt.accountKey : await attempt.accountKey();
      return await accounts.run(key, async () => {
        // 3. Estado de la cuenta leído en su turno (no el de antes de esperar).
        const target = await attempt.load();
        const turnMs = clock.now().getTime();
        if (target && isLocked(target, turnMs)) {
          const out = lockedOutcome(target, turnMs);
          count(ctx.purpose, 'locked');
          log.warn(
            {
              event: 'auth.verify.locked',
              ...base,
              target_user_id: target.id,
              lock_kind: out.reason === 'locked_manual' ? 'manual' : 'temporary',
              ...(out.retryAfterSeconds === undefined ? {} : { retry_after_s: out.retryAfterSeconds }),
            },
            'Intento con la cuenta bloqueada',
          );
          if (ctx.purpose === 'approval') {
            // SEC-025: indistinguible de un PIN erróneo; la igualación de tiempo llega con HU-06.
            settle(true);
            return { ok: false, reason: 'invalid', user: target };
          }
          settle(false);
          return { ...out, user: target };
        }

        // 4. Hash (con un hash ficticio si el usuario no existe: tiempo constante).
        const ok = await verifyHash(target?.pin_hash ?? DUMMY_PIN_HASH, attempt.pin);
        if (ok && target) {
          const prepared = attempt.prepare ? await attempt.prepare(target) : undefined;
          const now = clock.now();
          try {
            const value = await db.transaction().execute(async (trx) => {
              const row = await trx
                .updateTable('users')
                .set({ failed_attempts: 0, locked_until: null })
                .where('id', '=', target.id)
                .where('locked_manual', '=', false)
                .where((eb) => eb.or([eb('locked_until', 'is', null), eb('locked_until', '<=', now)]))
                .returning('id')
                .executeTakeFirst();
              if (!row) throw new AccountLockedDuringVerify();
              return attempt.onSuccess(trx, target, prepared);
            });
            settle(false);
            count(ctx.purpose, 'success');
            return { ok: true, user: target, value };
          } catch (err) {
            if (!(err instanceof AccountLockedDuringVerify)) throw err;
            // La cuenta se bloqueó durante el hash: se trata como bloqueada (RS-05b).
            const fresh = await attempt.load();
            const out = fresh ? lockedOutcome(fresh, now.getTime()) : ({ ok: false, reason: 'locked_manual' } as const);
            settle(false);
            count(ctx.purpose, 'locked');
            log.warn(
              { event: 'auth.verify.locked', ...base, target_user_id: target.id, lock_kind: out.reason === 'locked_manual' ? 'manual' : 'temporary' },
              'Acierto con la cuenta ya bloqueada',
            );
            return { ...out, user: fresh ?? target };
          }
        }

        // 5. Fallo: contadores de IP (y de sesión en aprobaciones) y del usuario.
        settle(true);
        count(ctx.purpose, 'invalid');
        if (!target) return { ok: false, reason: 'invalid', user: null };
        const { failedAttempts, lockedManualNow } = await registerFailure(target, ctx, log);
        return { ok: false, reason: 'invalid', failedAttempts, lockedManualNow, user: target };
      });
    } finally {
      // Error inesperado (BD caída…): la reserva no se queda ocupada.
      settle(false);
    }
  }

  async function hashNewPin(pin: string, role: Role): Promise<HashResult> {
    const v = validatePin(pin, role);
    if (!v.ok) return { ok: false, rule: v.rule };
    return { ok: true, hash: await argon2Slots.run(() => hasher.hash(pin)) };
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
