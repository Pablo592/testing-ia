// "X min" a partir de retryAfterSeconds (interpretación I-03 de docs/testing.md):
// minutos redondeados hacia arriba, nunca 0.
export function retryMinutes(retryAfterSeconds: number): number {
  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) return 1;
  return Math.max(1, Math.ceil(retryAfterSeconds / 60));
}

/** Segundos restantes hasta `untilMs` desde `nowMs`, redondeados hacia arriba (≥ 1). */
export function secondsUntil(untilMs: number, nowMs: number): number {
  return Math.max(1, Math.ceil((untilMs - nowMs) / 1000));
}
