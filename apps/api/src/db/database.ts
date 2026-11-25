// Cliente Kysely sobre un Pool de `pg` (ADR-003). Toda conexión creada desde
// DatabaseDeps fija search_path=public en el arranque de la conexión
// (docs/arquitectura.md §2.1, 2.1i): prevalece sobre ALTER DATABASE/ROLE … SET.
import pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { DatabaseDeps } from '../config.ts';
import type { Database } from './schema.ts';
import type { Logger } from '../logging/logger.ts';

export type Db = Kysely<Database>;

export interface DbHandle {
  db: Db;
  pool: pg.Pool;
  destroy(): Promise<void>;
}

export function createDb(deps: DatabaseDeps, log?: Logger, defaultMax = 10): DbHandle {
  const pool = new pg.Pool({
    host: deps.host,
    port: deps.port,
    database: deps.database,
    user: deps.user,
    password: deps.password,
    max: deps.poolMax ?? defaultMax,
    options: '-c search_path=public',
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    application_name: 'mi-app',
  });
  // Un error de un cliente ocioso (BD reiniciada) no debe tumbar el proceso.
  pool.on('error', (err) => {
    log?.error({ event: 'db.connection.lost', category: 'system', err }, 'Conexión con la BD perdida');
  });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  let destroyed = false;
  return {
    db,
    pool,
    async destroy() {
      if (destroyed) return;
      destroyed = true;
      await db.destroy();
    },
  };
}
