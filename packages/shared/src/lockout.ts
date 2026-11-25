// Escala del bloqueo progresivo (docs/seguridad.md §6.1.3; docs/arquitectura.md §3.1).
// Efecto de LLEGAR a `failedAttempts` fallos consecutivos acumulados:
// 5 → 5 min, 10 → 15 min, 15 → 60 min, ≥ 20 → indefinido (manual); el resto → nada.
export type Lockout = { kind: 'none' } | { kind: 'temporary'; minutes: 5 | 15 | 60 } | { kind: 'manual' };

export const MANUAL_LOCK_AT = 20;

export function lockoutForFailures(failedAttempts: number): Lockout {
  if (failedAttempts >= MANUAL_LOCK_AT) return { kind: 'manual' };
  if (failedAttempts === 5) return { kind: 'temporary', minutes: 5 };
  if (failedAttempts === 10) return { kind: 'temporary', minutes: 15 };
  if (failedAttempts === 15) return { kind: 'temporary', minutes: 60 };
  return { kind: 'none' };
}
