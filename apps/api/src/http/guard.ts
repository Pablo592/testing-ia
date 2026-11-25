// Guardas de toda petición, en un único hook `onRequest` del contexto raíz y en
// el orden fijo de docs/arquitectura.md §5:
//   404 (rutas inexistentes, T-40/SEC-031) → Origin → sesión → PIN provisional
//   → permiso; después Fastify analiza el cuerpo (415/400) y valida con zod.
// Nada de esto toca la BD salvo la lectura de la sesión (una consulta por
// token_hash) y la actualización de last_activity_at.
import type { FastifyReply, FastifyRequest } from 'fastify';
import { sql } from 'kysely';
import { hasPermission } from '@mi-app/shared/permissions';
import type { RevokedReason, UnauthenticatedDetails } from '@mi-app/shared/api';
import { REVOKED_REASONS } from '@mi-app/shared/api';
import type { Role } from '@mi-app/shared/pin';
import { readSessionCookie } from './cookies.ts';
import { clientIp, type AppContext, type AuthSession } from './context.ts';
import { HttpError, MESSAGES, sendError } from './errors.ts';
import { tokenHash } from '../modules/auth/tokens.ts';

export const IDLE_TIMEOUT_MS = 15 * 60_000;
const MODIFYING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function isApiPath(url: string): boolean {
  const path = url.split('?')[0] ?? '';
  return path === '/api' || path.startsWith('/api/');
}

export function unauthenticated(details?: UnauthenticatedDetails): HttpError {
  return new HttpError(401, 'UNAUTHENTICATED', MESSAGES.UNAUTHENTICATED, details);
}

interface SessionRow {
  id: string;
  user_id: string;
  created_at: Date;
  last_activity_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  revoked_reason: RevokedReason | null;
  expired_reason: 'idle' | 'absolute' | null;
  name: string;
  role: Role;
  active: boolean;
  must_change_pin: boolean;
}

export function createGuard(ctx: AppContext) {
  const { db, clock, metrics, hub } = ctx;

  async function markExpired(request: FastifyRequest, row: SessionRow, reason: 'idle' | 'absolute'): Promise<void> {
    const r = await db
      .updateTable('sessions')
      .set({ expired_reason: reason })
      .where('id', '=', row.id)
      .where('expired_reason', 'is', null)
      .where('revoked_at', 'is', null)
      .executeTakeFirst();
    if (Number(r.numUpdatedRows) === 1) {
      metrics.sessionsEnded.inc({ reason });
      request.log.info(
        { event: 'auth.session.expired', category: 'security', user_id: row.user_id, session_id: row.id, reason },
        'Sesión caducada',
      );
    }
  }

  function invalid(request: FastifyRequest, reason: 'not_found' | 'revoked' | 'expired', details?: UnauthenticatedDetails): HttpError {
    metrics.invalidSession.inc({ reason });
    request.log.info(
      { event: 'auth.session.invalid', category: 'security', client_ip: clientIp(request), reason },
      'Cookie de sesión no válida',
    );
    return unauthenticated(details);
  }

  async function resolveSession(request: FastifyRequest): Promise<AuthSession> {
    const cookie = readSessionCookie(request.headers.cookie);
    request.hadSessionCookie = cookie.present;
    if (!cookie.present) throw unauthenticated();
    // Con cookie, siempre SHA-256 y UNA consulta por token_hash que trae sesión y usuario (§5).
    const row = (await db
      .selectFrom('sessions as s')
      .innerJoin('users as u', 'u.id', 's.user_id')
      .select([
        's.id',
        's.user_id',
        's.created_at',
        's.last_activity_at',
        's.expires_at',
        's.revoked_at',
        's.revoked_reason',
        's.expired_reason',
        'u.name',
        'u.role',
        'u.active',
        'u.must_change_pin',
      ])
      .where('s.token_hash', '=', tokenHash(cookie.value))
      .executeTakeFirst()) as SessionRow | undefined;
    if (!row) throw invalid(request, 'not_found');
    if (row.revoked_at) {
      const reason = row.revoked_reason;
      const details = reason && (REVOKED_REASONS as readonly string[]).includes(reason) ? { reason: 'revoked' as const, revokedReason: reason } : undefined;
      throw invalid(request, 'revoked', details);
    }
    if (!row.active) throw invalid(request, 'revoked', { reason: 'revoked', revokedReason: 'user_disabled' });
    if (row.expired_reason) throw invalid(request, 'expired', { reason: row.expired_reason });
    const nowMs = clock.now().getTime();
    if (nowMs >= row.expires_at.getTime()) {
      await markExpired(request, row, 'absolute');
      throw invalid(request, 'expired', { reason: 'absolute' });
    }
    // Barra con la cola abierta: exenta de la inactividad (no de las 12 h, §7).
    const kitchenOpen = row.role === 'kitchen' && hub.hasKitchenStream(row.id);
    if (!kitchenOpen && nowMs >= row.last_activity_at.getTime() + IDLE_TIMEOUT_MS) {
      await markExpired(request, row, 'idle');
      throw invalid(request, 'expired', { reason: 'idle' });
    }
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      role: row.role,
      mustChangePin: row.must_change_pin,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  /** `last_activity_at` en cada petición que cuenta, sin intervalo mínimo (T-37). */
  async function touch(sessionId: string): Promise<void> {
    const now = clock.now();
    await db
      .updateTable('sessions')
      .set({ last_activity_at: sql<Date>`GREATEST(last_activity_at, ${now})` })
      .where('id', '=', sessionId)
      .execute();
  }

  return async function guard(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | undefined> {
    // Rutas o métodos no declarados (T-40, SEC-031): 404 aquí mismo, igual para
    // todos, antes de leer el cuerpo y sin BD ni Set-Cookie. Fuera de /api/,
    // GET/HEAD siguen al not-found handler, que sirve la SPA.
    if (request.is404) {
      if (isApiPath(request.url) || (request.method !== 'GET' && request.method !== 'HEAD')) {
        return sendError(request, reply, 404, 'NOT_FOUND', MESSAGES.NOT_FOUND);
      }
      return undefined;
    }
    const config = request.routeOptions.config;
    if (config.internal) return undefined;

    if (MODIFYING.has(request.method) && request.headers.origin !== ctx.publicOrigin) {
      metrics.csrfRejected.inc();
      let originHost: string | undefined;
      try {
        originHost = request.headers.origin ? new URL(request.headers.origin).host : undefined;
      } catch {
        originHost = undefined;
      }
      request.log.warn(
        { event: 'csrf.origin_rejected', category: 'security', client_ip: clientIp(request), route: request.routeOptions.url, origin_host: originHost },
        'Origin no permitido',
      );
      throw new HttpError(403, 'ORIGIN_NOT_ALLOWED', MESSAGES.ORIGIN_NOT_ALLOWED);
    }
    if (config.public) return undefined;

    const session = await resolveSession(request);
    request.auth = session;

    if (session.mustChangePin && !config.allowProvisional) {
      request.log.info(
        { event: 'auth.must_change_pin.blocked', category: 'security', user_id: session.userId, role: session.role, session_id: session.id, route: request.routeOptions.url },
        'Ruta no permitida con PIN provisional',
      );
      throw new HttpError(403, 'PIN_CHANGE_REQUIRED', MESSAGES.PIN_CHANGE_REQUIRED);
    }

    if (!config.permission || !hasPermission(session.role, config.permission)) {
      metrics.authzDenied.inc({ permission: config.permission ?? 'none' });
      request.log.warn(
        {
          event: 'authz.denied',
          category: 'security',
          client_ip: clientIp(request),
          user_id: session.userId,
          role: session.role,
          session_id: session.id,
          route: request.routeOptions.url,
          method: request.method,
          permission: config.permission ?? 'none',
        },
        'Acceso denegado',
      );
      throw new HttpError(403, 'FORBIDDEN', MESSAGES.FORBIDDEN);
    }

    if (config.provisionalPinOnly && !session.mustChangePin) {
      metrics.pinChangeRejected.inc({ reason: 'not_provisional' });
      request.log.warn(
        {
          event: 'auth.pin.change_failed',
          category: 'security',
          client_ip: clientIp(request),
          user_id: session.userId,
          role: session.role,
          session_id: session.id,
          reason: 'not_provisional',
        },
        'Cambio de PIN sin PIN provisional',
      );
      throw new HttpError(403, 'FORBIDDEN', MESSAGES.FORBIDDEN);
    }

    // SEC-030: `X-Activity: passive` (valor exacto) solo resta actividad.
    if (config.activity !== false && request.headers['x-activity'] !== 'passive') await touch(session.id);
    return undefined;
  };
}
