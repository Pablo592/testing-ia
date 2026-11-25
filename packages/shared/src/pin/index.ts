// Reglas de composición del PIN (docs/arquitectura.md §7, docs/seguridad.md
// §6.1.1-2). Función pura, la misma en servidor y cliente. Se aplica al crear,
// restablecer y cambiar un PIN; NUNCA al verificar uno (login).
import { COMMON_PINS } from './common-pins.ts';

export type Role = 'waiter' | 'kitchen' | 'manager';

export const ROLES: readonly Role[] = ['waiter', 'kitchen', 'manager'];

/** Códigos estables, en el orden en que se comprueban (y se muestran). */
export type PinRule = 'digits_only' | 'length' | 'manager_length' | 'all_same' | 'sequence' | 'repeated_block' | 'common';

export const PIN_RULES: readonly PinRule[] = [
  'digits_only',
  'length',
  'manager_length',
  'all_same',
  'sequence',
  'repeated_block',
  'common',
];

export type PinValidation = { ok: true } | { ok: false; rule: PinRule };

/** Longitud admitida por rol: encargado exactamente 6; el resto de 4 a 6. */
export function pinLengthFor(role: Role): { min: number; max: number } {
  return role === 'manager' ? { min: 6, max: 6 } : { min: 4, max: 6 };
}

function isAsciiDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

function onlyAsciiDigits(pin: string): boolean {
  for (let i = 0; i < pin.length; i++) {
    if (!isAsciiDigit(pin.charCodeAt(i))) return false;
  }
  return true;
}

function allSame(pin: string): boolean {
  for (let i = 1; i < pin.length; i++) if (pin[i] !== pin[0]) return false;
  return true;
}

/** 4 o más dígitos consecutivos (+1 o −1) en cualquier posición, sin vuelta de 9 a 0. */
function hasSequence(pin: string): boolean {
  let up = 1;
  let down = 1;
  for (let i = 1; i < pin.length; i++) {
    const d = pin.charCodeAt(i) - pin.charCodeAt(i - 1);
    up = d === 1 ? up + 1 : 1;
    down = d === -1 ? down + 1 : 1;
    if (up >= 4 || down >= 4) return true;
  }
  return false;
}

/** El PIN entero es un bloque de 2 o 3 dígitos repetido al menos 2 veces. */
function isRepeatedBlock(pin: string): boolean {
  for (const size of [2, 3]) {
    if (pin.length % size !== 0 || pin.length / size < 2) continue;
    const block = pin.slice(0, size);
    if (block.repeat(pin.length / size) === pin) return true;
  }
  return false;
}

export function validatePin(pin: string, role: Role): PinValidation {
  if (!onlyAsciiDigits(pin)) return { ok: false, rule: 'digits_only' };
  const { min, max } = pinLengthFor(role);
  if (pin.length < min || pin.length > max) {
    return { ok: false, rule: role === 'manager' ? 'manager_length' : 'length' };
  }
  if (allSame(pin)) return { ok: false, rule: 'all_same' };
  if (hasSequence(pin)) return { ok: false, rule: 'sequence' };
  if (isRepeatedBlock(pin)) return { ok: false, rule: 'repeated_block' };
  if (COMMON_PINS.has(pin)) return { ok: false, rule: 'common' };
  return { ok: true };
}
