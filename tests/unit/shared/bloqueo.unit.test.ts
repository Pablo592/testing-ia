// HU-01/CA-F06 (I-01); RS-03. Escala de bloqueo al LLEGAR a N fallos consecutivos
// (docs/seguridad.md §6.1.3). El reloj y la persistencia se prueban en
// integración (tests/integration/api/HU-01-bloqueo.int.test.ts).
import { describe, expect, test } from 'vitest';
import { lockoutForFailures } from '@mi-app/shared/lockout';

describe('[HU-01/CA-F06][RS-03] Escala del bloqueo progresivo', () => {
  const esperado = (n: number) => {
    if (n === 5) return { kind: 'temporary', minutes: 5 };
    if (n === 10) return { kind: 'temporary', minutes: 15 };
    if (n === 15) return { kind: 'temporary', minutes: 60 };
    if (n >= 20) return { kind: 'manual' };
    return { kind: 'none' };
  };

  test('[HU-01/CA-F06][RS-03] tabla de 0 a 25 fallos: 5 → 5 min, 10 → 15 min, 15 → 60 min, 20 → indefinido', () => {
    for (let n = 0; n <= 25; n++) expect(lockoutForFailures(n), `n = ${n}`).toEqual(esperado(n));
  });

  test('[HU-01/CA-F06] los fallos entre escalones no bloquean (el contador no se reinicia al expirar, I-01)', () => {
    for (const n of [6, 7, 8, 9, 11, 14, 16, 19]) expect(lockoutForFailures(n)).toEqual({ kind: 'none' });
  });
});
