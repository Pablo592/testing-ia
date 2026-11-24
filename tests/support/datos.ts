// Datos de prueba sin dependencias de la app (los usan integración y E2E).
// PIN aleatorios por ejecución (docs/testing.md §9.1): nunca fijos en el repo.
import { randomInt, randomUUID } from 'node:crypto';
import { validatePin } from '@mi-app/shared/pin';

export type Rol = 'waiter' | 'kitchen' | 'manager';

export const ROL_TEXTO: Record<Rol, string> = { waiter: 'Camarero', kitchen: 'Barra', manager: 'Encargado' };

/**
 * PIN aleatorio válido para el rol. `validatePin` se usa solo como filtro de
 * datos de prueba (no es el oráculo: las reglas se prueban contra una tabla
 * escrita a mano en tests/unit/shared/pin-reglas.unit.test.ts).
 */
export function pinAleatorio(rol: Rol, longitud?: number): string {
  for (let i = 0; i < 1000; i++) {
    const n = longitud ?? (rol === 'manager' ? 6 : 4 + randomInt(3));
    let pin = '';
    for (let j = 0; j < n; j++) pin += String(randomInt(10));
    if (validatePin(pin, rol).ok) return pin;
  }
  throw new Error(`No se pudo generar un PIN válido para ${rol}`);
}

/** PIN distinto del dado, misma longitud (para intentos fallidos). */
export function pinIncorrecto(pin: string): string {
  for (;;) {
    let otro = '';
    for (let j = 0; j < pin.length; j++) otro += String(randomInt(10));
    if (otro !== pin) return otro;
  }
}

let secuencia = 0;
export function nombreUnico(base = 'u'): string {
  secuencia += 1;
  // varchar(30), único sin distinguir mayúsculas.
  return `${base}${secuencia}-${randomUUID().slice(0, 8)}`.slice(0, 30);
}
