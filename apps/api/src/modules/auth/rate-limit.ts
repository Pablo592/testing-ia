// Límites en memoria de la instancia (docs/arquitectura.md §7; docs/seguridad.md §6.1.5).
// Una sola instancia de `app`: un reinicio los vacía (riesgo aceptado).
// IP: 10 fallos de cualquier verificación de PIN en 10 min (ventana móvil) →
// rechazo durante 10 min desde el fallo que alcanza el límite. Los rechazos no
// alargan el bloqueo y los aciertos no restan (I-02).

export interface FailureWindowOptions {
  maxFailures: number;
  windowMs: number;
  blockMs: number;
  /** Tope de claves en memoria (defensa frente a muchas IP distintas). */
  maxKeys?: number;
}

interface Entry {
  failures: number[];
  blockedUntil: number;
}

export class FailureWindow {
  private readonly entries = new Map<string, Entry>();
  private readonly maxKeys: number;
  private readonly opts: FailureWindowOptions;

  constructor(opts: FailureWindowOptions) {
    this.opts = opts;
    this.maxKeys = opts.maxKeys ?? 10_000;
  }

  /** Milisegundos de bloqueo restantes para `key` (0 si no está bloqueada). */
  blockedFor(key: string, nowMs: number): number {
    const e = this.entries.get(key);
    if (!e) return 0;
    return e.blockedUntil > nowMs ? e.blockedUntil - nowMs : 0;
  }

  /** Registra un fallo; devuelve true si con él se alcanza el límite. */
  recordFailure(key: string, nowMs: number): boolean {
    let e = this.entries.get(key);
    if (!e) {
      if (this.entries.size >= this.maxKeys) this.prune(nowMs);
      e = { failures: [], blockedUntil: 0 };
      this.entries.set(key, e);
    }
    const desde = nowMs - this.opts.windowMs;
    e.failures = e.failures.filter((t) => t > desde);
    e.failures.push(nowMs);
    if (e.failures.length >= this.opts.maxFailures) {
      e.blockedUntil = nowMs + this.opts.blockMs;
      return true;
    }
    return false;
  }

  private prune(nowMs: number): void {
    const desde = nowMs - this.opts.windowMs;
    for (const [k, e] of this.entries) {
      if (e.blockedUntil <= nowMs && e.failures.every((t) => t <= desde)) this.entries.delete(k);
    }
    // Si sigue lleno, se descarta la más antigua (Map conserva el orden de inserción).
    while (this.entries.size >= this.maxKeys) {
      const first = this.entries.keys().next();
      if (first.done) break;
      this.entries.delete(first.value);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}

export const IP_LIMIT = { maxFailures: 10, windowMs: 10 * 60_000, blockMs: 10 * 60_000 } as const;
/** Solo aprobaciones de encargado (HU-06, T-20): 5 fallos por sesión en 10 min. */
export const SESSION_APPROVAL_LIMIT = { maxFailures: 5, windowMs: 10 * 60_000, blockMs: 10 * 60_000 } as const;
