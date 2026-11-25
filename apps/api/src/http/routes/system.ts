// /healthz (liveness, sin BD), /readyz (BD + migraciones) y GET /events (SSE).
// docs/logging.md §8.1; docs/arquitectura.md §5.1, §6.
import { monitorEventLoopDelay } from 'node:perf_hooks';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sql } from 'kysely';
import { API_PREFIX } from '@mi-app/shared/api';
import type { AppContext } from '../context.ts';
import { LATEST_MIGRATION } from '../../db/migrations/index.ts';

const LAG_LIMIT_MS = 1000;

export function registerSystemRoutes(app: FastifyInstance, ctx: AppContext): () => void {
  const lag = monitorEventLoopDelay({ resolution: 20 });
  lag.enable();

  app.route({
    method: 'GET',
    url: '/healthz',
    config: { internal: true },
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const p99 = lag.percentile(99) / 1e6;
      lag.reset();
      if (p99 > LAG_LIMIT_MS) return reply.code(503).send({ status: 'fail' });
      return reply.send({ status: 'ok' });
    },
  });

  app.route({
    method: 'GET',
    url: '/readyz',
    config: { internal: true },
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const checks = { db: 'fail', migrations: 'fail' };
      try {
        await Promise.race([
          (async () => {
            await sql`SELECT 1`.execute(ctx.db);
            checks.db = 'ok';
            const r = await ctx.db
              .selectFrom('schema_migrations')
              .select('name')
              .where('name', '=', LATEST_MIGRATION)
              .executeTakeFirst();
            if (r) checks.migrations = 'ok';
          })(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000).unref()),
        ]);
      } catch {
        /* se informa como fail, sin mensajes ni versiones */
      }
      const ok = checks.db === 'ok' && checks.migrations === 'ok';
      return reply.code(ok ? 200 : 503).send({ status: ok ? 'ok' : 'fail', checks });
    },
  });

  app.route({
    method: 'GET',
    url: `${API_PREFIX}/events`,
    config: { permission: 'events:subscribe', activity: false },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const s = request.auth!;
      reply.hijack();
      ctx.hub.open(reply.raw, { sessionId: s.id, userId: s.userId, role: s.role, expiresAt: s.expiresAt }, request.id);
    },
  });

  return () => lag.disable();
}
