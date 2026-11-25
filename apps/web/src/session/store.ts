// Estado de sesión de la SPA y sus canales (cliente HTTP, flujo SSE,
// temporizadores de inactividad y de caducidad). docs/arquitectura.md §5, §6, §7.
// Al terminar la sesión (primer 401, session.revoked, inactividad o logout) se
// cierran TODOS los canales antes de mostrar P-01 (SEC-032).
import { useSyncExternalStore } from 'react';
import { REVOKED_REASONS, type LoginResponse, type MeResponse } from '@mi-app/shared/api';
import { abortAll, api, lastActiveRequest, setClientHandlers } from '../api/client.ts';
import { EventsClient } from '../realtime/events.ts';

export type BannerKey = 'idle' | 'absolute' | 'user_disabled' | 'pin_reset' | 'pin_changed' | 'account_locked_manual' | 'desconocido';

export interface SessionState {
  status: 'booting' | 'anonymous' | 'authenticated';
  me?: MeResponse;
  /** Motivo del cierre para el banner del paso 1 de P-01. */
  banner: BannerKey | null;
  /** Ruta en la que un 403 FORBIDDEN sustituyó la pantalla por "Acceso denegado". */
  forbiddenPath: string | null;
  idleWarning: boolean;
  /** Hora (ISO) de la caducidad absoluta si faltan ≤ 15 min. */
  expiryWarning: string | null;
  toast: string | null;
}

export const IDLE_MS = 15 * 60_000;
export const IDLE_WARNING_MS = 14 * 60_000;
export const EXPIRY_WARNING_MS = 15 * 60_000;
const HEARTBEAT_MIN_MS = 60_000;
const EXPIRY_CHECK_EVERY_MS = 30_000;

let state: SessionState = { status: 'booting', banner: null, forbiddenPath: null, idleWarning: false, expiryWarning: null, toast: null };
const listeners = new Set<() => void>();

function set(patch: Partial<SessionState>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function getSession(): SessionState {
  return state;
}

export function useSession(): SessionState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

/** Desfase servidor − cliente, fijado al iniciar la sesión (no en cada reconexión). */
let skewMs = 0;
/** La barra con la cola abierta está exenta de la inactividad (HU-01/CA-F09). */
let idleExempt = false;
let lastInteraction = Date.now();
let pendingActivity = false;
let ticker: ReturnType<typeof setInterval> | undefined;
let lastExpiryCheck = 0;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let ending = false;

const events = new EventsClient({
  onReconnected: () => {
    void loadMe(false);
    // Toques sin red: se envía el latido al reconectar, antes de los snapshots (§7).
    if (pendingActivity) void sendActivity();
  },
  onRevoked: (reason) => end(bannerFromRevoked(reason)),
  onSessionUpdated: () => void loadMe(false),
  onRejected: () => void loadMe(false),
});

function bannerFromRevoked(reason: string): BannerKey | null {
  if (reason === 'logout') return null;
  return (REVOKED_REASONS as readonly string[]).includes(reason) ? (reason as BannerKey) : 'desconocido';
}

/** Banner por `details` del 401 (§5): sin `details` o `logout` → sin banner. */
export function bannerFromDetails(details: unknown): BannerKey | null {
  if (!details || typeof details !== 'object') return null;
  const d = details as { reason?: unknown; revokedReason?: unknown };
  if (d.reason === 'idle' || d.reason === 'absolute') return d.reason;
  if (d.reason === 'revoked') return typeof d.revokedReason === 'string' ? bannerFromRevoked(d.revokedReason) : 'desconocido';
  return 'desconocido';
}

setClientHandlers({
  onUnauthenticated: (details) => {
    if (state.status === 'authenticated' || state.status === 'booting') end(bannerFromDetails(details));
  },
  onForbidden: () => {
    set({ forbiddenPath: window.location.pathname });
    void loadMe(false);
  },
  onPinChangeRequired: () => void loadMe(false),
});

function stopChannels(): void {
  abortAll();
  events.stop();
  if (ticker !== undefined) clearInterval(ticker);
  ticker = undefined;
  pendingActivity = false;
}

/** La sesión terminó durante esta carga de página: la vuelta a P-01 se apila en el historial. */
let endedHere = false;

/** Una sola vez tras `end()`: la guarda navega a P-01 con push (Atrás vuelve a P-01, no fuera de la app). */
export function consumeSessionEnd(): boolean {
  const v = endedHere;
  endedHere = false;
  return v;
}

/** Termina la sesión en el cliente: canales cerrados y P-01 con el banner del motivo. */
export function end(banner: BannerKey | null): void {
  endedHere = state.status === 'authenticated';
  stopChannels();
  set({ status: 'anonymous', me: undefined, banner, forbiddenPath: null, idleWarning: false, expiryWarning: null });
}

function onInteraction(): void {
  // Solo se anota: el aviso lo retira el temporizador de 1 s. Quitarlo aquí, en
  // `pointerdown`, borraría "Seguir conectado" antes de su propio `click`.
  lastInteraction = Date.now();
  if (state.status === 'authenticated' && Date.now() - lastActiveRequest() >= HEARTBEAT_MIN_MS) void sendActivity();
}

async function sendActivity(): Promise<void> {
  pendingActivity = true;
  const r = await api('POST', '/session/activity');
  if (!r.network) pendingActivity = false;
}

function tick(): void {
  if (state.status !== 'authenticated' || !state.me) return;
  const now = Date.now();
  if (idleExempt) lastInteraction = now;
  const idle = now - lastInteraction;
  if (idle >= IDLE_MS) {
    void idleLogout();
    return;
  }
  const warn = idle >= IDLE_WARNING_MS;
  if (warn !== state.idleWarning) set({ idleWarning: warn });

  const expiresAt = Date.parse(state.me.session.expiresAt);
  const remaining = expiresAt - (now + skewMs);
  const expiryWarning = remaining <= EXPIRY_WARNING_MS ? state.me.session.expiresAt : null;
  if (expiryWarning !== state.expiryWarning) set({ expiryWarning });
  if (remaining <= 0 && now - lastExpiryCheck >= EXPIRY_CHECK_EVERY_MS) {
    lastExpiryCheck = now;
    // El servidor decide: su 401 trae `reason: absolute` y elige el banner.
    void loadMe(false);
  }
}

async function idleLogout(): Promise<void> {
  if (ending) return;
  ending = true;
  try {
    stopChannels();
    // La sesión se revoca también en el servidor; el banner es el de inactividad.
    await api('POST', '/auth/logout', { publicRoute: true });
  } finally {
    ending = false;
    end('idle');
  }
}

function startChannels(me: MeResponse, fresh: boolean): void {
  // Solo una sesión nueva reinicia el temporizador: una recarga pasiva de
  // /auth/me (hello, reconexión, session.updated) no es interacción (SEC-030).
  if (fresh) lastInteraction = Date.now();
  if (ticker === undefined) ticker = setInterval(tick, 1000);
  if (!me.user.mustChangePin) events.start();
  else events.stop();
}

/** GET /auth/me (siempre pasiva, SEC-030). `first`: fija el desfase del reloj. */
export async function loadMe(first: boolean): Promise<boolean> {
  const r = await api<MeResponse>('GET', '/auth/me', { passive: true });
  if (!r.ok || !r.data) return false;
  if (state.status === 'anonymous' && !first) return false;
  const me = r.data;
  if (first) skewMs = Date.parse(me.serverTime) - Date.now();
  const fresh = state.status !== 'authenticated';
  set({ status: 'authenticated', me, banner: null });
  startChannels(me, fresh);
  return true;
}

export async function boot(): Promise<void> {
  window.addEventListener('pointerdown', onInteraction, { capture: true, passive: true });
  window.addEventListener('keydown', onInteraction, { capture: true, passive: true });
  const ok = await loadMe(true);
  if (!ok && state.status === 'booting') set({ status: 'anonymous' });
}

export async function loginSucceeded(_login: LoginResponse): Promise<boolean> {
  set({ banner: null });
  const ok = await loadMe(true);
  if (!ok) end(null);
  return ok;
}

export async function logout(): Promise<void> {
  const r = await api('POST', '/auth/logout');
  // Un 401 ya lo ha gestionado el cliente HTTP (banner por su motivo).
  if (state.status === 'authenticated') end(r.status === 401 ? state.banner : null);
}

export function setIdleExempt(exempt: boolean): void {
  idleExempt = exempt;
  if (exempt) lastInteraction = Date.now();
}

export function keepAlive(): void {
  lastInteraction = Date.now();
  set({ idleWarning: false });
  void sendActivity();
}

export function clearBanner(): void {
  if (state.banner) set({ banner: null });
}

export function clearForbidden(): void {
  if (state.forbiddenPath) set({ forbiddenPath: null });
}

export function showToast(text: string): void {
  if (toastTimer !== undefined) clearTimeout(toastTimer);
  set({ toast: text });
  toastTimer = setTimeout(() => set({ toast: null }), 5000);
}
