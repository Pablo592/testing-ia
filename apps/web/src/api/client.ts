// Cliente HTTP único de la SPA (docs/arquitectura.md §5, §7; SEC-030, SEC-032).
// - `{ passive: true }` añade `X-Activity: passive`: solo lo usa el código que
//   pide algo sin un gesto del usuario (GET /auth/me, snapshots por hello,
//   recargas por temporizador). Las acciones del usuario nunca lo llevan.
// - Toda petición lleva un AbortController; al primer 401 se abortan todas
//   (`abortAll`) para que ninguna respuesta tardía de la sesión vieja borre la
//   cookie de un login nuevo. Nunca se usan sendBeacon ni fetch({ keepalive }).
import type { ApiError } from '@mi-app/shared/api';
import { API_PREFIX } from '@mi-app/shared/api-constants';

export interface ApiResult<T = unknown> {
  status: number;
  ok: boolean;
  data?: T;
  error?: ApiError['error'];
  /** Sin respuesta (red, abortada). */
  network?: boolean;
}

export interface RequestOptions {
  body?: unknown;
  passive?: boolean;
  /** Rutas de P-01 (login, rejilla): sus 401/403 no cierran la sesión. */
  publicRoute?: boolean;
}

export interface ClientHandlers {
  onUnauthenticated(details: unknown): void;
  onForbidden(): void;
  onPinChangeRequired(): void;
}

const inFlight = new Set<AbortController>();
let handlers: ClientHandlers | undefined;
/** Generación de sesión: las respuestas de una generación anterior se ignoran. */
let generation = 0;
let lastActiveRequestAt = 0;

export function setClientHandlers(h: ClientHandlers): void {
  handlers = h;
}

/** Aborta todas las peticiones en curso y descarta sus respuestas (SEC-032). */
export function abortAll(): void {
  generation += 1;
  for (const c of [...inFlight]) c.abort();
  inFlight.clear();
}

/** Momento (reloj del cliente) de la última petición activa: el latido la evita si es reciente. */
export function lastActiveRequest(): number {
  return lastActiveRequestAt;
}

export async function api<T = unknown>(method: string, path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
  const ctl = new AbortController();
  inFlight.add(ctl);
  const gen = generation;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (opts.passive) headers['x-activity'] = 'passive';
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  if (!opts.passive) lastActiveRequestAt = Date.now();
  let res: Response;
  try {
    res = await fetch(API_PREFIX + path, { method, headers, body, signal: ctl.signal, credentials: 'same-origin', cache: 'no-store' });
  } catch {
    inFlight.delete(ctl);
    return { status: 0, ok: false, network: true };
  }
  inFlight.delete(ctl);
  let parsed: unknown;
  const text = await res.text().catch(() => '');
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
  }
  if (gen !== generation) return { status: 0, ok: false, network: true };
  const error = res.ok ? undefined : (parsed as ApiError | undefined)?.error;
  if (!opts.publicRoute && handlers) {
    if (res.status === 401 && error?.code === 'UNAUTHENTICATED') handlers.onUnauthenticated(error.details);
    else if (res.status === 403 && error?.code === 'FORBIDDEN') handlers.onForbidden();
    else if (res.status === 403 && error?.code === 'PIN_CHANGE_REQUIRED') handlers.onPinChangeRequired();
  }
  return { status: res.status, ok: res.ok, data: res.ok ? (parsed as T) : undefined, error };
}

/** Segundos de espera de un 423/429 (details.retryAfterSeconds o Retry-After). */
export function retryAfterOf(r: ApiResult): number {
  const v = (r.error?.details as { retryAfterSeconds?: unknown } | undefined)?.retryAfterSeconds;
  return typeof v === 'number' && v > 0 ? v : 60;
}
