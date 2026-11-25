// Configuración de `app` (docs/arquitectura.md §10.1, forma fijada en la 2.1i, T-38).
// parseSettings(env) es pura: solo variables no secretas. loadConfig(env) añade
// los secretos leídos de los ficheros *_FILE. Cualquier error → ConfigError con
// el NOMBRE de la variable y nunca su valor; los puntos de entrada no arrancan.
import { readFileSync } from 'node:fs';
import { isIPv6 } from 'node:net';

export interface DatabaseSettings {
  host: string;
  port: number;
  database: string;
  user: string;
}

export interface DatabaseDeps extends DatabaseSettings {
  password: string;
  poolMax?: number;
}

export interface Settings {
  host: string;
  port: number;
  metricsPort: number;
  logLevel: string;
  publicOrigin: string;
  trustedProxies: string[];
  installation: { tableCount: number; delayThresholdMinutes: number };
  sessionMaxHours: number;
  database: DatabaseSettings;
}

export interface Config extends Omit<Settings, 'database'> {
  database: DatabaseDeps;
  pinPepper?: Buffer;
  initialManager?: { name: string; pin: string };
}

export class ConfigError extends Error {
  readonly variable: string;
  constructor(variable: string, rule: string) {
    super(`${variable}: ${rule}`);
    this.name = 'ConfigError';
    this.variable = variable;
  }
}

export type Env = Record<string, string | undefined>;

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
export const SESSION_MAX_HOURS = { min: 1, max: 12, default: 12 } as const;
export const KITCHEN_ACTIVITY_INTERVAL_MS = { min: 10, max: 60_000, default: 60_000 } as const;
export const TRUSTED_PROXIES_MAX = 4;
export const PEPPER_MIN_BYTES = 32;

// --- Reglas reutilizables (también las usa buildApp sobre AppDeps, §2.1) ----

export function isIntegerInRange(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;
}

function intFrom(env: Env, name: string, min: number, max: number, def?: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') {
    if (def === undefined) throw new ConfigError(name, 'obligatoria');
    return def;
  }
  if (!/^[0-9]+$/.test(raw)) throw new ConfigError(name, `debe ser un entero entre ${min} y ${max}`);
  const n = Number(raw);
  if (!isIntegerInRange(n, min, max)) throw new ConfigError(name, `debe ser un entero entre ${min} y ${max}`);
  return n;
}

function requiredString(env: Env, name: string): string {
  const raw = env[name];
  if (raw === undefined || raw === '') throw new ConfigError(name, 'obligatoria');
  return raw;
}

const IPV4_PART = /^(0|[1-9][0-9]{0,2})$/;

/** IPv4 literal: cuatro números 0–255 sin ceros a la izquierda. */
export function isStrictIPv4(x: string): boolean {
  const parts = x.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => IPV4_PART.test(p) && Number(p) <= 255);
}

/** IPv6 literal sin zona ni corchetes. */
export function isStrictIPv6(x: string): boolean {
  return !x.includes('%') && !x.includes('[') && !x.includes(']') && isIPv6(x);
}

/**
 * Valida un elemento de TRUSTED_PROXIES (SEC-029): IP literal o CIDR con
 * prefijo 24–32 (IPv4) o 120–128 (IPv6). Devuelve la regla incumplida o null.
 */
export function trustedProxyProblem(x: string): string | null {
  if (x === '') return 'está vacío';
  const slash = x.indexOf('/');
  if (slash === -1) {
    return isStrictIPv4(x) || isStrictIPv6(x) ? null : 'no es una IP literal ni un CIDR admitido';
  }
  const addr = x.slice(0, slash);
  const prefix = x.slice(slash + 1);
  if (!/^(0|[1-9][0-9]*)$/.test(prefix)) return 'tiene un prefijo mal escrito';
  const n = Number(prefix);
  if (isStrictIPv4(addr)) return n >= 24 && n <= 32 ? null : 'tiene un prefijo IPv4 fuera de 24–32';
  if (isStrictIPv6(addr)) return n >= 120 && n <= 128 ? null : 'tiene un prefijo IPv6 fuera de 120–128';
  return 'no es una IP literal ni un CIDR admitido';
}

/** Reglas 1–5 de §10.1 sobre la cadena de la variable. */
export function parseTrustedProxies(raw: string | undefined, variable = 'TRUSTED_PROXIES'): string[] {
  if (raw === undefined || raw === '') return [];
  return validateTrustedProxyList(raw.split(','), variable);
}

/** Mismo validador sobre una lista ya partida (buildApp, `trustedProxies`). */
export function validateTrustedProxyList(items: unknown, variable: string): string[] {
  if (!Array.isArray(items)) throw new ConfigError(variable, 'debe ser una lista');
  if (items.length > TRUSTED_PROXIES_MAX) throw new ConfigError(variable, `admite como máximo ${TRUSTED_PROXIES_MAX} elementos`);
  const out: string[] = [];
  items.forEach((item, i) => {
    const problem = typeof item === 'string' ? trustedProxyProblem(item) : 'no es una cadena';
    if (problem) throw new ConfigError(variable, `el elemento ${i + 1} ${problem}`);
    out.push(item as string);
  });
  return out;
}

/** Origen exacto `esquema://host[:puerto]`, sin ruta ni barra final (RS-24). */
export function isExactOrigin(x: unknown): x is string {
  if (typeof x !== 'string' || x === '') return false;
  let u: URL;
  try {
    u = new URL(x);
  } catch {
    return false;
  }
  return (u.protocol === 'http:' || u.protocol === 'https:') && u.origin === x;
}

function isIp(x: string): boolean {
  return isStrictIPv4(x) || isStrictIPv6(x);
}

// --- parseSettings / loadConfig ---------------------------------------------

export function parseSettings(env: Env): Settings {
  const hostRaw = env.HOST;
  const host = hostRaw === undefined || hostRaw === '' ? '0.0.0.0' : hostRaw;
  if (!isIp(host)) throw new ConfigError('HOST', 'debe ser una dirección IP');

  const port = intFrom(env, 'PORT', 1025, 65535, 3000);
  const metricsPort = intFrom(env, 'METRICS_PORT', 1025, 65535, 9464);
  if (metricsPort === port) throw new ConfigError('METRICS_PORT', 'debe ser distinto de PORT');

  const levelRaw = env.LOG_LEVEL;
  const logLevel = levelRaw === undefined || levelRaw === '' ? 'info' : levelRaw;
  if (!(LOG_LEVELS as readonly string[]).includes(logLevel)) {
    throw new ConfigError('LOG_LEVEL', `debe ser uno de: ${LOG_LEVELS.join(', ')}`);
  }

  const publicOrigin = requiredString(env, 'PUBLIC_ORIGIN');
  if (!isExactOrigin(publicOrigin)) {
    throw new ConfigError('PUBLIC_ORIGIN', 'debe ser un origen esquema://host[:puerto] sin ruta ni barra final');
  }

  const trustedProxies = parseTrustedProxies(env.TRUSTED_PROXIES);
  const tableCount = intFrom(env, 'TABLE_COUNT', 1, 99, 20);
  const delayThresholdMinutes = intFrom(env, 'DELAY_THRESHOLD_MINUTES', 1, 60, 10);
  const sessionMaxHours = intFrom(env, 'SESSION_MAX_HOURS', SESSION_MAX_HOURS.min, SESSION_MAX_HOURS.max, SESSION_MAX_HOURS.default);

  const database: DatabaseSettings = {
    host: requiredString(env, 'DATABASE_HOST'),
    port: intFrom(env, 'DATABASE_PORT', 1, 65535),
    database: requiredString(env, 'DATABASE_NAME'),
    user: requiredString(env, 'DATABASE_USER'),
  };

  return {
    host,
    port,
    metricsPort,
    logLevel,
    publicOrigin,
    trustedProxies,
    installation: { tableCount, delayThresholdMinutes },
    sessionMaxHours,
    database,
  };
}

/** Lee un fichero de secreto quitando el salto de línea final. */
function readSecret(env: Env, name: string): Buffer {
  const path = env[name];
  if (path === undefined || path === '') throw new ConfigError(name, 'obligatoria');
  let data: Buffer;
  try {
    data = readFileSync(path);
  } catch {
    throw new ConfigError(name, 'no se puede leer el fichero');
  }
  let end = data.length;
  if (end > 0 && data[end - 1] === 0x0a) end -= 1;
  if (end > 0 && data[end - 1] === 0x0d) end -= 1;
  return data.subarray(0, end);
}

export function loadConfig(env: Env = process.env): Config {
  const settings = parseSettings(env);
  const password = readSecret(env, 'DATABASE_PASSWORD_FILE').toString('utf8');
  const config: Config = { ...settings, database: { ...settings.database, password } };

  if (env.PIN_PEPPER_FILE !== undefined && env.PIN_PEPPER_FILE !== '') {
    const pepper = readSecret(env, 'PIN_PEPPER_FILE');
    if (pepper.length < PEPPER_MIN_BYTES) throw new ConfigError('PIN_PEPPER_FILE', `debe tener al menos ${PEPPER_MIN_BYTES} bytes`);
    config.pinPepper = Buffer.from(pepper);
  }

  const nameFile = env.INITIAL_MANAGER_NAME_FILE;
  const pinFile = env.INITIAL_MANAGER_PIN_FILE;
  if (nameFile !== undefined && nameFile !== '' && pinFile !== undefined && pinFile !== '') {
    config.initialManager = {
      name: readSecret(env, 'INITIAL_MANAGER_NAME_FILE').toString('utf8'),
      pin: readSecret(env, 'INITIAL_MANAGER_PIN_FILE').toString('utf8'),
    };
  }
  return config;
}
