// Cliente SSE de GET /api/v1/events (docs/arquitectura.md §6). Un flujo por
// dispositivo; vigilante de 5 s sin mensajes → reconexión forzada; al recibir
// `session.revoked` se cierra sin reconectar. `stop()` cierra el EventSource
// y cancela todos sus temporizadores (SEC-032).
import { API_PREFIX, type RevokedReason } from '@mi-app/shared/api-constants';

export interface EventsHandlers {
  /** `hello` de una reconexión (no el de la primera conexión). */
  onReconnected(): void;
  onRevoked(reason: RevokedReason | string): void;
  onSessionUpdated(): void;
  /** El servidor rechazó el flujo (p. ej. 401): hay que comprobar la sesión. */
  onRejected(): void;
  /**
   * T-48: antes de REABRIR el flujo (vigilante o reintento), la comprobación de
   * sesión en curso que hay que esperar, si la hay. El `401` de `/events` borra la
   * cookie y un `EventSource` no puede leer su motivo: si se reabre mientras
   * `GET /auth/me` está en curso (o con la sesión ya caducada), ese GET sale sin
   * cookie y la vuelta a P-01 pierde el banner.
   */
  sessionCheck?(): Promise<unknown> | undefined;
}

const WATCHDOG_MS = 5000;

export class EventsClient {
  private es: EventSource | undefined;
  private watchdog: ReturnType<typeof setInterval> | undefined;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private lastMessage = 0;
  private connectedOnce = false;
  private stopped = true;
  /** Cambia en cada start/stop: una reapertura aplazada de una vuelta anterior no abre nada. */
  private epoch = 0;
  private readonly handlers: EventsHandlers;

  constructor(handlers: EventsHandlers) {
    this.handlers = handlers;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.epoch += 1;
    this.connectedOnce = false;
    this.open();
    this.watchdog = setInterval(() => {
      if (this.stopped) return;
      if (Date.now() - this.lastMessage > WATCHDOG_MS) this.reopen();
    }, 1000);
  }

  stop(): void {
    this.stopped = true;
    this.epoch += 1;
    if (this.watchdog !== undefined) clearInterval(this.watchdog);
    if (this.retry !== undefined) clearTimeout(this.retry);
    this.watchdog = undefined;
    this.retry = undefined;
    this.es?.close();
    this.es = undefined;
  }

  private reopen(): void {
    if (this.retry !== undefined) clearTimeout(this.retry);
    this.retry = undefined;
    this.es?.close();
    this.es = undefined;
    this.openWhenChecked();
  }

  /** Reabre el flujo cuando no hay ninguna comprobación de sesión pendiente (T-48). */
  private openWhenChecked(): void {
    if (this.stopped) return;
    const pending = this.handlers.sessionCheck?.();
    if (!pending) {
      this.open();
      return;
    }
    const epoch = this.epoch;
    // Mientras se espera, el vigilante no vuelve a disparar.
    this.lastMessage = Date.now();
    const resume = () => {
      if (this.stopped || this.epoch !== epoch || this.es !== undefined) return;
      this.openWhenChecked();
    };
    pending.then(resume, resume);
  }

  private open(): void {
    if (this.stopped) return;
    this.lastMessage = Date.now();
    const es = new EventSource(`${API_PREFIX}/events`, { withCredentials: true });
    this.es = es;
    const seen = () => {
      this.lastMessage = Date.now();
    };
    es.addEventListener('hello', () => {
      seen();
      if (this.connectedOnce) this.handlers.onReconnected();
      this.connectedOnce = true;
    });
    es.addEventListener('ping', seen);
    es.addEventListener('session.revoked', (ev) => {
      let reason: string = 'desconocido';
      try {
        reason = String((JSON.parse((ev as MessageEvent<string>).data) as { reason?: unknown }).reason ?? reason);
      } catch {
        /* motivo desconocido */
      }
      this.stop();
      this.handlers.onRevoked(reason);
    });
    es.addEventListener('session.updated', () => {
      seen();
      this.handlers.onSessionUpdated();
    });
    es.onerror = () => {
      if (this.stopped || this.es !== es) return;
      // CLOSED = el servidor respondió algo que no es un flujo (401/403): se
      // comprueba la sesión y, si sigue viva, se reintenta más tarde.
      if (es.readyState === EventSource.CLOSED) {
        this.es = undefined;
        this.handlers.onRejected();
        if (this.retry !== undefined) clearTimeout(this.retry);
        this.retry = setTimeout(() => {
          this.retry = undefined;
          this.openWhenChecked();
        }, 3000);
      }
    };
  }
}
