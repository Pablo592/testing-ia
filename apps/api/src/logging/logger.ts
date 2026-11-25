// Logger JSON con pino (docs/logging.md §2, §4.3; docs/arquitectura.md §11).
// Dos barreras de redacción, las dos obligatorias:
//  (a) `redact` de pino con las rutas fijas de docs/logging.md §4.3 (a);
//  (b) regla /pin/i sobre el NOMBRE de cualquier clave, a cualquier
//      profundidad (formatters.log, formatters.bindings y serializador err).
// La primera barrera es no registrar nunca cuerpos, cabeceras ni filas.
import pino, { type Logger as PinoLogger, type DestinationStream } from 'pino';

/** Lo que usa la app de un logger (vale el de pino y el de la petición de Fastify). */
export type Logger = Pick<PinoLogger, 'info' | 'warn' | 'error' | 'debug'>;

const CENSOR = '[REDACTED]';
const TRUNCATED = '[TRUNCATED]';
const MAX_DEPTH = 10;
const PIN_KEY = /pin/i;
const STACK_MAX = 2048;

const FIXED_FIELDS = [
  'pin', 'currentPin', 'newPin', 'confirmPin', 'managerApproval', 'pinHash', 'pin_hash', 'pepper',
  'token', 'tokenHash', 'token_hash', 'sid', '["__Host-sid"]', 'password', 'customerRef', 'customer_ref',
  'note', 'reasonText', 'reason_text', 'body',
];

export const REDACT_PATHS: string[] = [
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["proxy-authorization"]',
  'res.headers["set-cookie"]',
  'req.cookies["__Host-sid"]',
  'headers.cookie',
  'headers.authorization',
  ...FIXED_FIELDS,
  ...FIXED_FIELDS.map((f) => (f.startsWith('[') ? `*${f}` : `*.${f}`)),
];

/** Regla (b): copia del valor con toda clave que case con /pin/i redactada. */
export function redactPinKeys(value: unknown, depth = 0, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Error || value instanceof Date || Buffer.isBuffer(value)) return value;
  if (depth >= MAX_DEPTH) return TRUNCATED;
  if (seen.has(value)) return TRUNCATED;
  seen.add(value);
  if (Array.isArray(value)) return value.map((v) => redactPinKeys(v, depth + 1, seen));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = PIN_KEY.test(k) ? CENSOR : redactPinKeys(v, depth + 1, seen);
  }
  return out;
}

/** Serializador de errores (docs/logging.md §4.4): solo {type, message, code, stack}. */
export function serializeError(err: unknown): unknown {
  if (!(err instanceof Error)) return redactPinKeys(err);
  const e = err as Error & { code?: unknown };
  const out: Record<string, unknown> = {
    type: e.name,
    message: e.message,
    code: typeof e.code === 'string' || typeof e.code === 'number' ? e.code : undefined,
    stack: typeof e.stack === 'string' ? e.stack.slice(0, STACK_MAX) : undefined,
  };
  return redactPinKeys(out);
}

export interface LoggerOptions {
  level?: string;
  destination?: NodeJS.WritableStream;
  service?: string;
}

function envLabel(): string {
  const v = process.env.APP_ENV;
  if (v === 'dev' || v === 'test' || v === 'demo' || v === 'prod') return v;
  return process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
}

export function createLogger(opts: LoggerOptions = {}): PinoLogger {
  const destination = (opts.destination ?? process.stdout) as unknown as DestinationStream;
  return pino(
    {
      level: opts.level ?? 'info',
      base: { service: opts.service ?? 'app', env: envLabel(), version: process.env.APP_VERSION ?? 'dev' },
      timestamp: pino.stdTimeFunctions.isoTime,
      messageKey: 'msg',
      redact: { paths: REDACT_PATHS, censor: CENSOR },
      serializers: { err: serializeError, error: serializeError },
      formatters: {
        level: (label) => ({ level: label }),
        bindings: (bindings) => redactPinKeys(bindings) as Record<string, unknown>,
        log: (object) => redactPinKeys(object) as Record<string, unknown>,
      },
    },
    destination,
  );
}
