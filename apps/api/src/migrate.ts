// Servicio efímero `migrate` (rol app_owner): aplica las migraciones y sale
// con 0, o con 1 si falla la configuración o una migración.
import { loadConfig, ConfigError } from './config.ts';
import { createDb } from './db/database.ts';
import { runMigrations } from './db/migrator.ts';
import { createLogger } from './logging/logger.ts';

const log = createLogger({ service: 'migrate', level: process.env.LOG_LEVEL || 'info' });

async function main(): Promise<number> {
  let config;
  try {
    config = loadConfig(process.env);
  } catch (err) {
    log.error(
      { event: 'config.invalid', category: 'system', invalid_keys: err instanceof ConfigError ? [err.variable] : [] },
      err instanceof ConfigError ? err.message : 'No se pudo leer la configuración',
    );
    return 1;
  }
  const handle = createDb({ ...config.database, poolMax: 1 }, log, 1);
  try {
    const n = await runMigrations(handle.pool, log);
    log.info({ event: 'db.migrations.done', category: 'system', applied: n }, 'Migraciones al día');
    return 0;
  } catch (err) {
    log.error({ event: 'db.migration.failed', category: 'system', err }, 'Fallo al migrar');
    return 1;
  } finally {
    await handle.destroy();
  }
}

process.exitCode = await main();
