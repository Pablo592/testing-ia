// Arranque de la API (docs/arquitectura.md §2.1, §10.1, §11): configuración,
// buildApp con SystemClock, listen, servidor de métricas en METRICS_PORT y
// cierre ordenado con SIGTERM/SIGINT (Node es PID 1 en la imagen distroless).
import { createServer } from 'node:http';
import { collectDefaultMetrics, Registry } from 'prom-client';
import { buildApp } from './app.ts';
import { systemClock } from './clock.ts';
import { ConfigError, loadConfig, type Config } from './config.ts';
import { createLogger } from './logging/logger.ts';
import { createPinHasher } from './modules/auth/hasher.ts';

const startedAt = performance.now();
const bootLog = createLogger({ level: 'info' });

let config: Config;
try {
  config = loadConfig(process.env);
  if (!config.pinPepper) throw new ConfigError('PIN_PEPPER_FILE', 'obligatoria');
} catch (err) {
  const variable = err instanceof ConfigError ? err.variable : undefined;
  bootLog.error(
    { event: 'config.invalid', category: 'system', invalid_keys: variable ? [variable] : [], err: err instanceof ConfigError ? undefined : err },
    err instanceof ConfigError ? err.message : 'No se pudo leer la configuración',
  );
  process.exit(1);
}

const app = await buildApp({
  clock: systemClock,
  database: config.database,
  pinHasher: createPinHasher({ pepper: config.pinPepper! }),
  publicOrigin: config.publicOrigin,
  trustedProxies: config.trustedProxies,
  installation: config.installation,
  sessionMaxHours: config.sessionMaxHours,
  logLevel: config.logLevel,
});

const defaults = new Registry();
collectDefaultMetrics({ register: defaults });
const metricsServer = createServer((req, res) => {
  if (req.method !== 'GET' || (req.url ?? '').split('?')[0] !== '/metrics') {
    res.writeHead(404).end();
    return;
  }
  Promise.all([app.metricsText(), defaults.metrics()])
    .then(([a, b]) => {
      res.writeHead(200, { 'content-type': defaults.contentType }).end(`${a}\n${b}`);
    })
    .catch(() => res.writeHead(500).end());
});

try {
  await app.listen({ host: config.host, port: config.port });
  await new Promise<void>((ok, fail) => {
    metricsServer.once('error', fail);
    metricsServer.listen(config.metricsPort, config.host, () => ok());
  });
} catch (err) {
  app.log.error({ event: 'app.start.failed', category: 'system', err }, 'No se pudo arrancar');
  await app.close().catch(() => undefined);
  process.exit(1);
}

app.log.info(
  {
    event: 'app.started',
    category: 'system',
    node_version: process.version,
    log_level: config.logLevel,
    listen_port: config.port,
    metrics_port: config.metricsPort,
    config_keys: Object.keys(process.env).filter((k) => /^(HOST|PORT|METRICS_PORT|LOG_LEVEL|PUBLIC_ORIGIN|TRUSTED_PROXIES|TABLE_COUNT|DELAY_THRESHOLD_MINUTES|SESSION_MAX_HOURS|DATABASE_[A-Z_]+|PIN_PEPPER_FILE)$/.test(k)).sort(),
    table_count: config.installation.tableCount,
    delay_threshold_minutes: config.installation.delayThresholdMinutes,
  },
  'API arrancada',
);
app.log.info({ event: 'app.ready', category: 'system', startup_ms: Math.round(performance.now() - startedAt) }, 'API lista');

let stopping = false;
async function stop(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  app.log.info({ event: 'app.stopping', category: 'system', signal }, 'Parando la API');
  const force = setTimeout(() => process.exit(1), 8000);
  force.unref();
  try {
    await app.close();
    await new Promise<void>((ok) => metricsServer.close(() => ok()));
  } finally {
    process.exit(0);
  }
}
process.on('SIGTERM', () => void stop('SIGTERM'));
process.on('SIGINT', () => void stop('SIGINT'));
