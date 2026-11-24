// HU-01/CA-F06, CA-F11, CA-F12 (I-03): "X min" = minutos restantes redondeados
// hacia arriba desde retryAfterSeconds; nunca "0 min".
import { expect, test } from 'vitest';
import { retryMinutes } from '@mi-app/shared/retry';

test.each([
  [1, 1],
  [59, 1],
  [60, 1],
  [61, 2],
  [240, 4],
  [241, 5], // 4 min 1 s → 5 min (ejemplo de I-03)
  [300, 5],
  [540, 9],
  [600, 10],
  [900, 15],
  [3540, 59],
  [3541, 60],
  [3600, 60],
])('[HU-01/CA-F06][HU-01/CA-F11][HU-01/CA-F12] %i s → %i min', (s, min) => {
  expect(retryMinutes(s)).toBe(min);
});

test('[HU-01/CA-F06] nunca devuelve 0 (0 s o valores sin sentido → 1 min)', () => {
  expect(retryMinutes(0)).toBe(1);
  expect(retryMinutes(0.2)).toBe(1);
});
