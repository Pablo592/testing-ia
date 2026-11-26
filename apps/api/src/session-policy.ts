// Política de sesión compartida por la guarda HTTP y el hub SSE (docs/arquitectura.md §7).
/** Inactividad: `now >= last_activity_at + 15 min`, sin margen (T-37). */
export const IDLE_TIMEOUT_MS = 15 * 60_000;
