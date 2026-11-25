// Aplica las migraciones pendientes (servicio `migrate`, rol app_owner).
// Cada migración en su transacción; un cerrojo consultivo evita dos `migrate`
// a la vez. La tabla schema_migrations la lee /readyz (rol app_rw).
import type pg from 'pg';
import type { Logger } from '../logging/logger.ts';
import { LATEST_MIGRATION, MIGRATIONS } from './migrations/index.ts';

const MIGRATION_LOCK = 7_318_401_001;

export async function runMigrations(pool: pg.Pool, log: Logger): Promise<number> {
  const client = await pool.connect();
  let applied = 0;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);
    await client.query('GRANT SELECT ON schema_migrations TO app_rw');
    const done = new Set((await client.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    for (const m of MIGRATIONS) {
      if (done.has(m.name)) continue;
      const t0 = performance.now();
      try {
        await client.query('BEGIN');
        await client.query(m.sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [m.name]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        log.error(
          { event: 'db.migration.failed', category: 'system', migration: m.name, err },
          'La migración ha fallado',
        );
        throw err;
      }
      applied += 1;
      log.info(
        { event: 'db.migration.applied', category: 'system', migration: m.name, duration_ms: Math.round(performance.now() - t0) },
        'Migración aplicada',
      );
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK]).catch(() => undefined);
    client.release();
  }
  return applied;
}

export { LATEST_MIGRATION };
