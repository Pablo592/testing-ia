// Peticiones a la app en proceso (inject) y lectura del formato de errores
// (docs/arquitectura.md §5; contrato en tests/README.md §3).
import { createHash } from 'node:crypto';
import { ORIGEN, type Ctx } from './app.ts';

export const API = '/api/v1';
export const COOKIE = '__Host-sid';

export interface Resp {
  status: number;
  headers: Record<string, string | string[] | number | undefined>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  raw: string;
}

export interface Peticion {
  metodo?: string;
  ruta: string;
  cookie?: string;
  ip?: string;
  cuerpo?: unknown;
  cabeceras?: Record<string, string>;
  /** No enviar Origin (para RS-24). */
  sinOrigen?: boolean;
}

export const IP_A = '10.0.0.11';
export const IP_B = '10.0.0.12';
export const IP_C = '10.0.0.13';
export const IP_D = '10.0.0.14';

let contadorIp = 0;
/** IP de "dispositivo" única (para que el límite por IP no interfiera cuando no se prueba). */
export function ipUnica(): string {
  contadorIp += 1;
  return `10.${100 + Math.floor(contadorIp / 65_000)}.${Math.floor((contadorIp % 65_000) / 250)}.${(contadorIp % 250) + 1}`;
}

export async function pedir(ctx: Ctx, p: Peticion): Promise<Resp> {
  const metodo = (p.metodo ?? 'GET').toUpperCase();
  const cabeceras: Record<string, string> = { ...(p.cabeceras ?? {}) };
  if (!p.sinOrigen && metodo !== 'GET' && metodo !== 'HEAD') cabeceras.origin ??= ORIGEN;
  if (p.cookie) cabeceras.cookie = p.cookie;
  let payload: string | undefined;
  if (p.cuerpo !== undefined) {
    payload = typeof p.cuerpo === 'string' ? p.cuerpo : JSON.stringify(p.cuerpo);
    cabeceras['content-type'] ??= 'application/json';
  }
  const r = await ctx.app.inject({
    method: metodo,
    url: p.ruta.startsWith('/api/') || p.ruta.startsWith('/healthz') || p.ruta.startsWith('/readyz') ? p.ruta : API + p.ruta,
    headers: cabeceras,
    payload,
    remoteAddress: p.ip ?? IP_A,
  });
  let body: unknown;
  try {
    body = r.body === '' ? undefined : JSON.parse(r.body);
  } catch {
    body = undefined;
  }
  return { status: r.statusCode, headers: r.headers, body, raw: r.body };
}

export function setCookies(r: Resp): string[] {
  const sc = r.headers['set-cookie'];
  if (sc === undefined) return [];
  return Array.isArray(sc) ? sc : [String(sc)];
}

/** Valor de la cookie de sesión listo para la cabecera Cookie ("__Host-sid=…"). */
export function cookieSesion(r: Resp): string | undefined {
  const c = setCookies(r).find((s) => s.startsWith(`${COOKIE}=`));
  return c?.split(';')[0];
}

export function tokenDe(cookie: string): string {
  return cookie.slice(COOKIE.length + 1);
}

export function sha256(texto: string): Buffer {
  return createHash('sha256').update(texto).digest();
}

export function codigo(r: Resp): string | undefined {
  return r.body?.error?.code;
}

/**
 * Segundos de espera de un 423 LOCKED / 429 (docs/arquitectura.md §5). Además
 * de devolverlo, comprueba el contrato: entero ≥ 1 y cabecera Retry-After con
 * el mismo valor; si no hay `retryAfterSeconds`, tampoco debe haber cabecera
 * (423 ACCOUNT_LOCKED_MANUAL). Lanza si no se cumple.
 */
export function reintentarEn(r: Resp): number | undefined {
  const v: unknown = r.body?.error?.details?.retryAfterSeconds;
  const cabecera = r.headers['retry-after'];
  if (v === undefined) {
    if (cabecera !== undefined) throw new Error(`Retry-After (${String(cabecera)}) sin details.retryAfterSeconds`);
    return undefined;
  }
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) {
    throw new Error(`retryAfterSeconds debe ser un entero ≥ 1 (recibido ${JSON.stringify(v)})`);
  }
  if (String(cabecera) !== String(v)) {
    throw new Error(`Retry-After (${String(cabecera)}) distinto de retryAfterSeconds (${v})`);
  }
  return v;
}

/** `issues[].path` como lo da zod: los índices de array son números (docs/arquitectura.md §5). */
export type RutaCampo = (string | number)[];

export function incidencias(r: Resp): { path: RutaCampo; rule: string }[] {
  return r.body?.error?.details?.issues ?? [];
}

/** Incidencias de un campo concreto (path exacto). */
export function incidenciasDe(r: Resp, path: RutaCampo): { path: RutaCampo; rule: string }[] {
  return incidencias(r).filter((i) => JSON.stringify(i.path) === JSON.stringify(path));
}

export function detalles(r: Resp): Record<string, unknown> | undefined {
  return r.body?.error?.details;
}

/** Motivo de fin de sesión de un 401 UNAUTHENTICATED (docs/arquitectura.md §5). */
export type Motivo401 =
  | { reason: 'idle' }
  | { reason: 'absolute' }
  | { reason: 'revoked'; revokedReason: 'logout' | 'user_disabled' | 'pin_reset' | 'pin_changed' | 'account_locked_manual' };

/**
 * Comprueba un 401 UNAUTHENTICATED y su `details`: con motivo si la cookie es
 * de una sesión que existió; sin `details` si no hay cookie o el token es
 * desconocido (`motivo` = null).
 */
export function esperar401(r: Resp, motivo: Motivo401 | null): void {
  if (r.status !== 401 || codigo(r) !== 'UNAUTHENTICATED') {
    throw new Error(`se esperaba 401 UNAUTHENTICATED, llegó ${r.status} ${codigo(r) ?? ''}: ${r.raw.slice(0, 200)}`);
  }
  const d = detalles(r);
  const esperado = motivo === null ? undefined : motivo;
  if (JSON.stringify(d) !== JSON.stringify(esperado)) {
    throw new Error(`details del 401: esperado ${JSON.stringify(esperado)}, recibido ${JSON.stringify(d)}`);
  }
}

export async function iniciarSesion(
  ctx: Ctx,
  nombre: string,
  pin: string,
  ip: string = ipUnica(),
): Promise<{ res: Resp; cookie: string | undefined }> {
  const res = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: nombre, pin }, ip });
  return { res, cookie: cookieSesion(res) };
}

/** Inicia sesión y falla el test si no se obtiene la cookie. */
export async function sesion(ctx: Ctx, nombre: string, pin: string, ip: string = ipUnica()): Promise<string> {
  const { res, cookie } = await iniciarSesion(ctx, nombre, pin, ip);
  if (res.status !== 200 || !cookie) {
    throw new Error(`No se pudo iniciar sesión como ${nombre}: ${res.status} ${res.raw}`);
  }
  return cookie;
}

/** Cuerpo del error sin requestId (para comparar respuestas que deben ser idénticas). */
export function errorSinId(r: Resp): unknown {
  if (!r.body?.error) return r.body;
  const { requestId: _omitido, ...resto } = r.body.error;
  return { ...r.body, error: resto };
}
