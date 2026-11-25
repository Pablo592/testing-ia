// Peticiones a la app en proceso (inject) y lectura del formato de errores
// (docs/arquitectura.md §5; contrato en tests/README.md §3).
import { createHash } from 'node:crypto';
import { expect } from 'vitest';
import { ORIGEN, type Ctx } from './app.ts';

export const API = '/api/v1';
export const COOKIE = '__Host-sid';

export interface Resp {
  status: number;
  headers: Record<string, string | string[] | number | undefined>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  raw: string;
  /** La petición llevaba la cookie __Host-sid (decide si un 401 debe borrarla, docs/arquitectura.md §5). */
  conCookie: boolean;
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
  /**
   * Petición pasiva (SEC-030, docs/arquitectura.md §7): añade
   * `X-Activity: passive`, como hace el cliente en /auth/me y en los snapshots.
   */
  pasiva?: boolean;
  /** Ruta tal cual, sin el prefijo /api/v1 (rutas de la SPA, RS-18 / SEC-031). */
  sinPrefijo?: boolean;
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
  if (p.pasiva) cabeceras['x-activity'] = 'passive';
  let payload: string | undefined;
  if (p.cuerpo !== undefined) {
    payload = typeof p.cuerpo === 'string' ? p.cuerpo : JSON.stringify(p.cuerpo);
    cabeceras['content-type'] ??= 'application/json';
  }
  const r = await ctx.app.inject({
    method: metodo,
    url: p.sinPrefijo || p.ruta.startsWith('/api/') || p.ruta.startsWith('/healthz') || p.ruta.startsWith('/readyz') ? p.ruta : API + p.ruta,
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
  return { status: r.statusCode, headers: r.headers, body, raw: r.body, conCookie: /(?:^|;\s*)__Host-sid=/.test(p.cookie ?? '') };
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
 * Set-Cookie de borrado de la sesión (docs/arquitectura.md §5, 2.1i): igual,
 * byte a byte, en todo 401 UNAUTHENTICATED de una petición con cookie y en el
 * 204 del logout.
 */
export const COOKIE_BORRADA = '__Host-sid=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict';

/** La respuesta lleva exactamente un Set-Cookie, el de borrado. */
export function esperarCookieBorrada(r: Resp): void {
  expect(setCookies(r), 'Set-Cookie de borrado de __Host-sid').toEqual([COOKIE_BORRADA]);
}

/** La respuesta no lleva ningún Set-Cookie. */
export function esperarSinSetCookie(r: Resp): void {
  expect(setCookies(r), 'sin Set-Cookie').toEqual([]);
}

/**
 * Comprueba un 401 UNAUTHENTICATED y su `details`, comparado exacto con
 * toEqual: con motivo si la cookie es de una sesión que existió; sin
 * `details` si no hay cookie, el token es desconocido o la cookie está mal
 * formada (`motivo` = null). Además, el Set-Cookie (§5, 2.1i): si la petición
 * llevaba cookie, exactamente el de borrado; si no, ninguno.
 */
export function esperar401(r: Resp, motivo: Motivo401 | null): void {
  expect([r.status, codigo(r)], `401 UNAUTHENTICATED; llegó: ${r.raw.slice(0, 200)}`).toEqual([401, 'UNAUTHENTICATED']);
  const error = r.body.error as Record<string, unknown>;
  if (motivo === null) {
    expect('details' in error, `401 sin details; llegó ${JSON.stringify(error.details)}`).toBe(false);
  } else {
    expect(error.details, 'details del 401').toEqual(motivo);
  }
  if (r.conCookie) esperarCookieBorrada(r);
  else esperarSinSetCookie(r);
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
