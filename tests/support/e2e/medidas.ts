// Medidas del DOM renderizado (docs/testing.md §3, "medidas.ts").
import { expect, type Locator } from '@playwright/test';

export async function caja(l: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const b = await l.boundingBox();
  if (!b) throw new Error('elemento sin caja (no visible)');
  return b;
}

export async function esperarTamanoMinimo(l: Locator, minAncho: number, minAlto: number): Promise<void> {
  const b = await caja(l);
  expect(b.width, 'ancho').toBeGreaterThanOrEqual(minAncho);
  expect(b.height, 'alto').toBeGreaterThanOrEqual(minAlto);
}

/** `b` empieza debajo de `a` (o a su lado) a menos de `maxPx` y se solapan en horizontal. */
export async function junto(a: Locator, b: Locator, maxPx = 120): Promise<void> {
  const ca = await caja(a);
  const cb = await caja(b);
  const distanciaVertical = cb.y - (ca.y + ca.height);
  expect(distanciaVertical, 'distancia vertical al campo').toBeLessThanOrEqual(maxPx);
  expect(distanciaVertical, 'debajo del campo, no encima').toBeGreaterThanOrEqual(-ca.height);
  const solapeH = Math.min(ca.x + ca.width, cb.x + cb.width) - Math.max(ca.x, cb.x);
  expect(solapeH, 'solape horizontal con el campo').toBeGreaterThan(0);
}
