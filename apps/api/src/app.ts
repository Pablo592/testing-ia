// buildApp(deps): factoría de la app (docs/arquitectura.md §2.1). main.ts la
// compone con SystemClock y la configuración de loadConfig(); los tests de
// integración, en proceso, con un FakeClock y la BD real. No llama a listen.
import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyBaseLogger, type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import {
  ConfigError,
  isExactOrigin,
  isIntegerInRange,
  KITCHEN_ACTIVITY_INTERVAL_MS,
  LOG_LEVELS,
  SESSION_MAX_HOURS,
  validateTrustedProxyList,
  type DatabaseDeps,
} from './config.ts';
import type { Clock } from './clock.ts';
import { createDb } from './db/database.ts';
import { createLogger } from './logging/logger.ts';
import { createMetrics } from './metrics/metrics.ts';
import type { PinHasher } from './modules/auth/hasher.ts';
import { createAuthModule } from './modules/auth/verify-pin.ts';
import { Hub } from './realtime/hub.ts';
import { COOKIE_CLEAR } from './http/cookies.ts';
import { clientIp, uaFamily, type AppContext } from './http/context.ts';
import { HttpError, MESSAGES, sendError, ValidationError } from './http/errors.ts';
import { createGuard, isApiPath } from './http/guard.ts';
import { loadSpa } from './http/spa.ts';
import { registerAuthRoutes } from './http/routes/auth.ts';
import { registerSystemRoutes } from './http/routes/system.ts';

export type { Clock } from './clock.ts';
export type { DatabaseDeps } from './config.ts';
export type { PinHasher } from './modules/auth/hasher.ts';

export interface AppDeps {
  clock: Clock;
  database: DatabaseDeps;
  pinHasher: PinHasher;
  publicOrigin: string;
  trustedProxies: string[];
  installation: { tableCount: number; delayThresholdMinutes: number };
  sessionMaxHours?: number;
  kitchenActivityIntervalMs?: number;
  logDestination?: NodeJS.WritableStream;
  logLevel?: string;
  onRoute?: (route: { method: string | string[]; url: string; config?: unknown }) => void;
}

/** Límite de cuerpo (RS-23): las rutas inexistentes responden 404 antes de leerlo. */
export const BODY_LIMIT = 64 * 1024;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Misma validación que parseSettings, sobre AppDeps (defensa en profundidad, §2.1). */
function validateDeps(deps: AppDeps): { sessionMaxHours: number; kitchenActivityIntervalMs: number; trustedProxies: string[]; logLevel: string } {
  if (!deps || typeof deps !== 'object') throw new ConfigError('deps', 'faltan las dependencias');
  if (!deps.clock || typeof deps.clock.now !== 'function') throw new ConfigError('clock', 'debe tener now()');
  if (!deps.pinHasher || typeof deps.pinHasher.verify !== 'function' || typeof deps.pinHasher.hash !== 'function') {
    throw new ConfigError('pinHasher', 'debe tener hash() y verify()');
  }
  const db = deps.database;
  if (!db || typeof db.host !== 'string' || typeof db.database !== 'string' || typeof db.user !== 'string' || typeof db.password !== 'string') {
    throw new ConfigError('database', 'incompleta');
  }
  if (!isIntegerInRange(db.port, 1, 65535)) throw new ConfigError('database', 'puerto fuera de rango');
  if (db.poolMax !== undefined && !isIntegerInRange(db.poolMax, 1, 50)) throw new ConfigError('database', 'poolMax fuera de 1–50');
  if (!isExactOrigin(deps.publicOrigin)) throw new ConfigError('publicOrigin', 'debe ser un origen esquema://host[:puerto]');
  const trustedProxies = validateTrustedProxyList(deps.trustedProxies, 'trustedProxies');
  const inst = deps.installation;
  if (!inst || !isIntegerInRange(inst.tableCount, 1, 99) || !isIntegerInRange(inst.delayThresholdMinutes, 1, 60)) {
    throw new ConfigError('installation', 'tableCount 1–99 y delayThresholdMinutes 1–60');
  }
  const sessionMaxHours = deps.sessionMaxHours ?? SESSION_MAX_HOURS.default;
  if (!isIntegerInRange(sessionMaxHours, SESSION_MAX_HOURS.min, SESSION_MAX_HOURS.max)) {
    throw new ConfigError('sessionMaxHours', `debe ser un entero entre ${SESSION_MAX_HOURS.min} y ${SESSION_MAX_HOURS.max}`);
  }
  const kitchenActivityIntervalMs = deps.kitchenActivityIntervalMs ?? KITCHEN_ACTIVITY_INTERVAL_MS.default;
  if (!isIntegerInRange(kitchenActivityIntervalMs, KITCHEN_ACTIVITY_INTERVAL_MS.min, KITCHEN_ACTIVITY_INTERVAL_MS.max)) {
    throw new ConfigError('kitchenActivityIntervalMs', `debe ser un entero entre ${KITCHEN_ACTIVITY_INTERVAL_MS.min} y ${KITCHEN_ACTIVITY_INTERVAL_MS.max}`);
  }
  const logLevel = deps.logLevel ?? 'info';
  if (!(LOG_LEVELS as readonly string[]).includes(logLevel)) throw new ConfigError('logLevel', `debe ser uno de: ${LOG_LEVELS.join(', ')}`);
  return { sessionMaxHours, kitchenActivityIntervalMs, trustedProxies, logLevel };
}

function routeTemplate(request: FastifyRequest): string {
  return request.is404 ? 'not_found' : (request.routeOptions.url ?? 'not_found');
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  // Antes de abrir el pool: fuera de rango → la promesa se rechaza.
  const v = validateDeps(deps);
  const log = createLogger({ level: v.logLevel, destination: deps.logDestination });

  const app = Fastify({
    loggerInstance: log as unknown as FastifyBaseLogger,
    disableRequestLogging: true,
    requestIdHeader: false,
    requestIdLogLabel: 'request_id',
    // X-Request-Id de Caddy si es un UUID válido; si no, uno nuevo (M-04).
    genReqId: (req) => {
      const h = req.headers['x-request-id'];
      return typeof h === 'string' && UUID.test(h) ? h.toLowerCase() : randomUUID();
    },
    // SEC-029: el array ya validado o false; nunca una cadena, un número ni true.
    trustProxy: v.trustedProxies.length > 0 ? v.trustedProxies : false,
    bodyLimit: BODY_LIMIT,
    return503OnClosing: true,
  });

  // RS-17: el onRoute de los tests es el PRIMER hook onRoute, antes de cualquier ruta.
  if (deps.onRoute) {
    const onRoute = deps.onRoute;
    app.addHook('onRoute', (r) => onRoute({ method: r.method, url: r.url, config: r.config }));
  }
  app.addHook('onRoute', (r) => {
    const c = (r.config ?? {}) as Record<string, unknown>;
    const declared = ['permission', 'public', 'internal'].filter((k) => c[k] !== undefined);
    if (declared.length > 1) throw new Error(`La ruta ${String(r.method)} ${r.url} declara más de uno de permission/public/internal`);
  });

  const handle = createDb(deps.database, log);
  const metrics = createMetrics();
  const hubRef: { hub?: Hub } = {};
  const auth = createAuthModule({
    db: handle.db,
    hasher: deps.pinHasher,
    clock: deps.clock,
    log,
    metrics,
    onSessionsRevoked: (ids, reason) => hubRef.hub?.revoke(ids, reason) ?? 0,
  });
  const hub = new Hub({ db: handle.db, clock: deps.clock, log, metrics, kitchenActivityIntervalMs: v.kitchenActivityIntervalMs });
  hubRef.hub = hub;

  const ctx: AppContext = {
    db: handle.db,
    clock: deps.clock,
    auth,
    hub,
    metrics,
    log,
    publicOrigin: deps.publicOrigin,
    sessionMaxHours: v.sessionMaxHours,
    installation: { ...deps.installation },
  };

  app.decorate('metricsText', () => metrics.registry.metrics());
  app.decorateRequest('auth', null);
  app.decorateRequest('hadSessionCookie', false);

  // Solo JSON (sin text/plain ni formularios): el resto → 415 UNSUPPORTED_MEDIA_TYPE.
  app.removeAllContentTypeParsers();
  app.addContentTypeParser('application/json', { parseAs: 'string', bodyLimit: BODY_LIMIT }, (_req, body, done) => {
    const text = typeof body === 'string' ? body : body.toString('utf8');
    if (text.trim() === '') return done(null, undefined);
    try {
      done(null, JSON.parse(text));
    } catch {
      done(new ValidationError([{ path: [], rule: 'invalid_json' }]), undefined);
    }
  });

  // Hooks onRequest en orden fijo: request_id → guardas (§5).
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
    if (request.routeOptions.url !== '/api/v1/events') metrics.httpInFlight.inc();
  });
  app.addHook('onRequest', createGuard(ctx));

  // SEC-041 (RS-27): toda respuesta de /api lleva Cache-Control: no-store (también
  // 401/403/404/204/503). El flujo SSE no pasa por aquí (hijack) y conserva
  // `no-cache, no-transform`.
  app.addHook('onSend', async (request, reply, payload) => {
    if (isApiPath(request.url)) reply.header('cache-control', 'no-store');
    return payload;
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const route = routeTemplate(request);
    if (route === '/api/v1/events') return;
    metrics.httpInFlight.dec();
    if (route === '/healthz' || route === '/readyz') return;
    const status = reply.statusCode;
    const statusClass = `${Math.floor(status / 100)}xx`;
    const notable = [401, 403, 409, 423, 429].includes(status) ? String(status) : '';
    metrics.httpRequests.inc({ method: request.method, route, status_class: statusClass, status: notable });
    metrics.httpDuration.observe({ method: request.method, route }, reply.elapsedTime / 1000);
    const fields = {
      event: 'http.request',
      category: 'http',
      method: request.method,
      route,
      status,
      duration_ms: Math.round(reply.elapsedTime * 10) / 10,
      res_bytes: Number(reply.getHeader('content-length') ?? 0),
      client_ip: clientIp(request),
      ua_family: uaFamily(request),
      ...(request.auth ? { user_id: request.auth.userId, role: request.auth.role, session_id: request.auth.id } : {}),
    };
    if (status >= 500) request.log.error(fields, 'Petición HTTP');
    else request.log.info(fields, 'Petición HTTP');
  });

  app.setErrorHandler((err: unknown, request: FastifyRequest, reply: FastifyReply) => {
    if (err instanceof HttpError) {
      if (err.headers) for (const [k, val] of Object.entries(err.headers)) reply.header(k, val);
      // 401 de una petición que traía __Host-sid: siempre el mismo Set-Cookie de borrado (2.1i).
      if (err.status === 401 && err.code === 'UNAUTHENTICATED' && request.hadSessionCookie) reply.header('set-cookie', COOKIE_CLEAR);
      if (err instanceof ValidationError) {
        const issues = (err.details?.issues ?? []) as { path: unknown; rule: string }[];
        request.log.info(
          { event: 'http.validation.failed', category: 'http', route: routeTemplate(request), issues: issues.map((i) => ({ path: i.path, code: i.rule })) },
          'Validación fallida',
        );
      }
      return sendError(request, reply, err.status, err.code, err.message, err.details);
    }
    const code = (err as { code?: unknown })?.code;
    if (code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') return sendError(request, reply, 415, 'UNSUPPORTED_MEDIA_TYPE', MESSAGES.UNSUPPORTED_MEDIA_TYPE);
    if (code === 'FST_ERR_CTP_BODY_TOO_LARGE') return sendError(request, reply, 413, 'PAYLOAD_TOO_LARGE', MESSAGES.PAYLOAD_TOO_LARGE);
    if (code === 'FST_ERR_CTP_EMPTY_JSON_BODY' || code === 'FST_ERR_CTP_INVALID_JSON_BODY' || code === 'FST_ERR_CTP_INVALID_CONTENT_LENGTH') {
      return sendError(request, reply, 400, 'VALIDATION_FAILED', 'Datos no válidos', { issues: [{ path: [], rule: 'invalid_json' }] });
    }
    request.log.error({ event: 'http.request.unhandled_error', category: 'http', route: routeTemplate(request), err }, 'Error no controlado');
    return sendError(request, reply, 500, 'INTERNAL', MESSAGES.INTERNAL);
  });

  // Rutas inexistentes: bajo /api/ (y cualquier método que no sea GET/HEAD)
  // el 404 ya lo da la guarda; aquí llega el GET/HEAD de la SPA.
  const spa = loadSpa();
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    if (!isApiPath(request.url) && (request.method === 'GET' || request.method === 'HEAD')) {
      const file = spa.resolve(request.url.split('?')[0] ?? '/');
      if (file) {
        reply.header('cache-control', file.cache).type(file.type);
        return reply.send(request.method === 'HEAD' ? undefined : file.body);
      }
    }
    return sendError(request, reply, 404, 'NOT_FOUND', MESSAGES.NOT_FOUND);
  });

  const stopSystem = registerSystemRoutes(app, ctx);
  registerAuthRoutes(app, ctx);

  // preClose: cierra los flujos SSE (si no, server.close esperaría) y las
  // escrituras pendientes del hub; onClose: límites en memoria y pool.
  app.addHook('preClose', async () => {
    await hub.close();
  });
  app.addHook('onClose', async () => {
    stopSystem();
    auth.stop();
    await handle.destroy();
  });

  return app;
}
