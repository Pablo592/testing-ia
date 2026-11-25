// HU-01: inicio y cierre de sesión, rejilla de P-01, /auth/me, cambio
// obligatorio del PIN provisional y latido de actividad (docs/arquitectura.md §5.1).
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sql } from 'kysely';
import { API_PREFIX, ChangePinBody, EmptyBody, LoginBody, type LoginOption, type MeResponse } from '@mi-app/shared/api';
import { businessDate } from '@mi-app/shared/business-date';
import { PERMISSIONS_BY_ROLE } from '@mi-app/shared/permissions';
import { validatePin, type Role } from '@mi-app/shared/pin';
import { secondsUntil } from '@mi-app/shared/retry';
import { COOKIE_CLEAR, sessionCookie } from '../cookies.ts';
import { clientIp, uaFamily, type AppContext } from '../context.ts';
import { HttpError, retryError, ValidationError } from '../errors.ts';
import { validateBody } from '../validate.ts';
import { newSessionToken, tokenHash } from '../../modules/auth/tokens.ts';
import type { PinTarget, VerifyOutcome } from '../../modules/auth/verify-pin.ts';

const MSG = {
  invalidCredentials: 'Usuario o PIN incorrectos',
  locked: 'Cuenta bloqueada temporalmente',
  lockedManual: 'Cuenta bloqueada',
  tooMany: 'Demasiados intentos',
  disabled: 'Usuario desactivado',
  pinInvalid: 'El PIN actual no es correcto',
} as const;

function localConfigFor(role: Role, installation: AppContext['installation']): MeResponse['localConfig'] {
  if (role === 'waiter') return { tableCount: installation.tableCount };
  if (role === 'kitchen') return { delayThresholdMinutes: installation.delayThresholdMinutes };
  return { tableCount: installation.tableCount, delayThresholdMinutes: installation.delayThresholdMinutes };
}

/** Traducción común de los rechazos de verifyPin que no son "PIN incorrecto". */
function lockOrLimitError(outcome: Exclude<VerifyOutcome, { ok: true }>): HttpError | undefined {
  if (outcome.reason === 'rate_limited') return retryError(429, 'TOO_MANY_ATTEMPTS', MSG.tooMany, outcome.retryAfterSeconds ?? 1);
  if (outcome.reason === 'locked') return retryError(423, 'LOCKED', MSG.locked, outcome.retryAfterSeconds ?? 1);
  if (outcome.reason === 'locked_manual') return new HttpError(423, 'ACCOUNT_LOCKED_MANUAL', MSG.lockedManual);
  return undefined;
}

export function registerAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { db, clock, auth, hub, metrics } = ctx;

  // --- GET /auth/login-options (público, SEC-005) ---------------------------
  app.route({
    method: 'GET',
    url: `${API_PREFIX}/auth/login-options`,
    config: { public: true },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const ip = clientIp(request);
      const wait = auth.ipBlockedFor(ip);
      if (wait > 0) {
        const nowMs = clock.now().getTime();
        const retry = secondsUntil(nowMs + wait, nowMs);
        request.log.warn(
          { event: 'auth.verify.rate_limited', category: 'security', client_ip: ip, ua_family: uaFamily(request), purpose: 'login_options', scope: 'ip', retry_after_s: retry },
          'Demasiados intentos desde el dispositivo',
        );
        throw retryError(429, 'TOO_MANY_ATTEMPTS', MSG.tooMany, retry);
      }
      const rows = await db
        .selectFrom('users')
        .select(['name', 'role'])
        .where('active', '=', true)
        .orderBy(sql`lower(name)`)
        .limit(500)
        .execute();
      const body: LoginOption[] = rows.map((r) => ({ name: r.name, role: r.role }));
      return reply.header('cache-control', 'no-store').send(body);
    },
  });

  // --- POST /auth/login (público) -------------------------------------------
  app.route({
    method: 'POST',
    url: `${API_PREFIX}/auth/login`,
    config: { public: true },
    preValidation: validateBody(LoginBody),
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as LoginBody;
      const ip = clientIp(request);
      const ua = uaFamily(request);
      const user = await db
        .selectFrom('users')
        .select(['id', 'name', 'role', 'pin_hash', 'locked_until', 'locked_manual', 'active', 'must_change_pin'])
        .where(sql`lower(name)`, '=', sql`lower(${body.name})`)
        .executeTakeFirst();
      const target: PinTarget | null = user
        ? { id: user.id, role: user.role, pin_hash: user.pin_hash, locked_until: user.locked_until, locked_manual: user.locked_manual }
        : null;
      const outcome = await auth.verifyPin(target, body.pin, { ip, purpose: 'login', log: request.log, uaFamily: ua });

      if (!outcome.ok) {
        const err = lockOrLimitError(outcome);
        if (err) {
          metrics.loginAttempts.inc({ result: outcome.reason === 'rate_limited' ? 'ip_rate_limited' : 'locked' });
          throw err;
        }
        metrics.loginAttempts.inc({ result: user ? 'bad_pin' : 'unknown_user' });
        request.log.warn(
          {
            event: 'auth.login.failed',
            category: 'security',
            client_ip: ip,
            ua_family: ua,
            reason: user ? 'bad_pin' : 'unknown_user',
            ...(user ? { target_user_id: user.id, failed_attempts: outcome.failedAttempts } : {}),
          },
          'Inicio de sesión fallido',
        );
        throw new HttpError(401, 'INVALID_CREDENTIALS', MSG.invalidCredentials);
      }
      if (!user) throw new HttpError(401, 'INVALID_CREDENTIALS', MSG.invalidCredentials);
      if (!user.active) {
        metrics.loginAttempts.inc({ result: 'disabled' });
        request.log.warn(
          { event: 'auth.login.disabled_user', category: 'security', client_ip: ip, ua_family: ua, target_user_id: user.id },
          'Inicio de sesión de un usuario desactivado',
        );
        throw new HttpError(403, 'USER_DISABLED', MSG.disabled);
      }

      const now = clock.now();
      const token = newSessionToken();
      const sessionId = randomUUID();
      await db
        .insertInto('sessions')
        .values({
          id: sessionId,
          token_hash: tokenHash(token),
          user_id: user.id,
          created_at: now,
          last_activity_at: now,
          expires_at: new Date(now.getTime() + ctx.sessionMaxHours * 3600_000),
          revoked_at: null,
          revoked_reason: null,
          expired_reason: null,
          user_agent: String(request.headers['user-agent'] ?? '').slice(0, 200) || null,
        })
        .execute();
      metrics.loginAttempts.inc({ result: 'success' });
      request.log.info(
        {
          event: 'auth.login.succeeded',
          category: 'security',
          client_ip: ip,
          ua_family: ua,
          user_id: user.id,
          role: user.role,
          session_id: sessionId,
          provisional_credential: user.must_change_pin,
        },
        'Inicio de sesión correcto',
      );
      return reply
        .header('set-cookie', sessionCookie(token))
        .header('cache-control', 'no-store')
        .send({ user: { id: user.id, name: user.name, role: user.role, mustChangePin: user.must_change_pin } });
    },
  });

  // --- POST /auth/logout ------------------------------------------------------
  app.route({
    method: 'POST',
    url: `${API_PREFIX}/auth/logout`,
    config: { permission: 'session:self', allowProvisional: true },
    preValidation: validateBody(EmptyBody),
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const s = request.auth!;
      const now = clock.now();
      await db
        .updateTable('sessions')
        .set({ revoked_at: now, revoked_reason: 'logout' })
        .where('id', '=', s.id)
        .where('revoked_at', 'is', null)
        .execute();
      hub.revoke([s.id], 'logout');
      metrics.sessionsEnded.inc({ reason: 'logout' });
      request.log.info({ event: 'auth.logout', category: 'security', client_ip: clientIp(request), user_id: s.userId, role: s.role, session_id: s.id }, 'Sesión cerrada');
      return reply.code(204).header('set-cookie', COOKIE_CLEAR).send();
    },
  });

  // --- GET /auth/me -----------------------------------------------------------
  app.route({
    method: 'GET',
    url: `${API_PREFIX}/auth/me`,
    config: { permission: 'session:self', allowProvisional: true },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const s = request.auth!;
      const now = clock.now();
      const body: MeResponse = {
        user: { id: s.userId, name: s.name, role: s.role, mustChangePin: s.mustChangePin },
        permissions: [...PERMISSIONS_BY_ROLE[s.role]],
        session: { expiresAt: s.expiresAt.toISOString() },
        serverTime: now.toISOString(),
        businessDate: businessDate(now),
        localConfig: localConfigFor(s.role, ctx.installation),
      };
      return reply.header('cache-control', 'no-store').send(body);
    },
  });

  // --- POST /auth/pin: solo el cambio obligatorio del PIN provisional ---------
  app.route({
    method: 'POST',
    url: `${API_PREFIX}/auth/pin`,
    config: { permission: 'session:self', allowProvisional: true, provisionalPinOnly: true },
    preValidation: validateBody(ChangePinBody),
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const s = request.auth!;
      const body = request.body as ChangePinBody;
      const ip = clientIp(request);
      const ua = uaFamily(request);
      const logBase = { category: 'security', client_ip: ip, ua_family: ua, user_id: s.userId, role: s.role, session_id: s.id };

      // Regla de PIN por rol: parte de la validación (400), antes de verificar nada.
      const rule = validatePin(body.newPin, s.role);
      if (!rule.ok) {
        metrics.pinChangeRejected.inc({ reason: 'rule_violation' });
        request.log.warn({ event: 'auth.pin.change_failed', ...logBase, reason: 'rule_violation', rule: rule.rule }, 'PIN nuevo no válido');
        throw new ValidationError([{ path: ['newPin'], rule: rule.rule }]);
      }

      const user = await db
        .selectFrom('users')
        .select(['id', 'role', 'pin_hash', 'locked_until', 'locked_manual'])
        .where('id', '=', s.userId)
        .executeTakeFirstOrThrow();
      const outcome = await auth.verifyPin(user, body.currentPin, { ip, sessionId: s.id, purpose: 'change', log: request.log, uaFamily: ua });
      if (!outcome.ok) {
        const err = lockOrLimitError(outcome);
        if (err) throw err;
        metrics.pinChangeRejected.inc({ reason: 'wrong_current' });
        request.log.warn(
          { event: 'auth.pin.change_failed', ...logBase, reason: 'wrong_current', failed_attempts: outcome.failedAttempts },
          'PIN actual incorrecto',
        );
        // El fallo que lleva al bloqueo indefinido revoca también esta sesión (CA-F13).
        if (outcome.lockedManualNow) throw new HttpError(423, 'ACCOUNT_LOCKED_MANUAL', MSG.lockedManual);
        throw new HttpError(403, 'PIN_INVALID', MSG.pinInvalid);
      }

      const hashed = await auth.hashNewPin(body.newPin, s.role);
      if (!hashed.ok) throw new ValidationError([{ path: ['newPin'], rule: hashed.rule }]);
      const now = clock.now();
      const revoked = await db.transaction().execute(async (trx) => {
        await trx
          .updateTable('users')
          .set({ pin_hash: hashed.hash, pin_digits: body.newPin.length, must_change_pin: false, updated_at: now })
          .where('id', '=', s.userId)
          .execute();
        const rows = await trx
          .updateTable('sessions')
          .set({ revoked_at: now, revoked_reason: 'pin_changed' })
          .where('user_id', '=', s.userId)
          .where('id', '<>', s.id)
          .where('revoked_at', 'is', null)
          .returning('id')
          .execute();
        return rows.map((r) => r.id);
      });
      hub.revoke(revoked, 'pin_changed');
      metrics.sessionsEnded.inc({ reason: 'pin_changed' }, revoked.length);
      request.log.info({ event: 'auth.pin.changed', ...logBase, sessions_revoked: revoked.length }, 'PIN provisional cambiado');
      return reply.code(204).send();
    },
  });

  // --- POST /session/activity: latido de interacción ---------------------------
  app.route({
    method: 'POST',
    url: `${API_PREFIX}/session/activity`,
    config: { permission: 'session:self' },
    preValidation: validateBody(EmptyBody),
    handler: async (_request: FastifyRequest, reply: FastifyReply) => reply.code(204).send(),
  });
}
