// HU-01/CA-N01, HU-07/CA-F06; RS-01, RS-02 (docs/seguridad.md §6.1.1-2).
// Oráculo escrito a mano desde la política de PIN, no desde el código.
// Contrato: tests/README.md §1 (validatePin, PinRule y orden de las reglas).
import { describe, expect, test } from 'vitest';
import { validatePin } from '@mi-app/shared/pin';

type Rol = 'waiter' | 'kitchen' | 'manager';
const ROLES_4_6: Rol[] = ['waiter', 'kitchen'];

describe('[HU-01/CA-N01][RS-01] Longitud del PIN por rol', () => {
  for (const rol of ROLES_4_6) {
    test(`[HU-01/CA-N01][RS-01] ${rol}: acepta 4, 5 y 6 dígitos válidos`, () => {
      for (const pin of ['4831', '48317', '739164']) expect(validatePin(pin, rol)).toEqual({ ok: true });
    });
    test(`[HU-01/CA-N01][RS-01] ${rol}: rechaza 3 y 7 dígitos con la regla "length"`, () => {
      expect(validatePin('483', rol)).toEqual({ ok: false, rule: 'length' });
      expect(validatePin('7391648', rol)).toEqual({ ok: false, rule: 'length' });
      expect(validatePin('', rol)).toEqual({ ok: false, rule: 'length' });
    });
  }

  test('[HU-01/CA-N01][RS-01] encargado: solo exactamente 6 dígitos', () => {
    expect(validatePin('739164', 'manager')).toEqual({ ok: true });
    for (const pin of ['4831', '48317', '7391648', '483']) {
      expect(validatePin(pin, 'manager')).toEqual({ ok: false, rule: 'manager_length' });
    }
  });
});

describe('[HU-01/CA-N01][RS-02] Composición del PIN', () => {
  const todos: Rol[] = ['waiter', 'kitchen', 'manager'];

  test.each([
    ['48a1'],
    [' 4831'],
    ['4831 '],
    ['48.31'],
    ['-4831'],
    ['٤٨٣١'], // dígitos arábigo-índicos: no son ASCII
    ['４８３１'], // dígitos de ancho completo
  ])('[HU-01/CA-N01] "%s" no son solo dígitos ASCII → "digits_only"', (pin) => {
    for (const rol of ROLES_4_6) expect(validatePin(pin, rol)).toEqual({ ok: false, rule: 'digits_only' });
  });

  test.each([['1111'], ['0000'], ['77777'], ['999999'], ['000000']])(
    '[HU-01/CA-N01][RS-02] "%s" (mismo dígito repetido) → "all_same"',
    (pin) => {
      for (const rol of todos) {
        if (rol === 'manager' && pin.length !== 6) continue;
        expect(validatePin(pin, rol)).toEqual({ ok: false, rule: 'all_same' });
      }
    },
  );

  test.each([
    ['1234'],
    ['4321'],
    ['0123'],
    ['9876'],
    ['3456'],
    ['56789'],
    ['381234'], // secuencia al final
    ['123498'], // al principio
    ['836543'], // descendente en medio y al final
    ['901234'],
    ['987654'],
  ])('[HU-01/CA-N01][RS-02] "%s" contiene una secuencia de ≥ 4 consecutivos → "sequence"', (pin) => {
    for (const rol of todos) {
      if (rol === 'manager' && pin.length !== 6) continue;
      expect(validatePin(pin, rol)).toEqual({ ok: false, rule: 'sequence' });
    }
  });

  test.each([['1212'], ['4545'], ['123123'], ['121212'], ['383838'], ['847847']])(
    '[HU-01/CA-N01][RS-02] "%s" es un bloque repetido → "repeated_block"',
    (pin) => {
      for (const rol of todos) {
        if (rol === 'manager' && pin.length !== 6) continue;
        expect(validatePin(pin, rol)).toEqual({ ok: false, rule: 'repeated_block' });
      }
    },
  );

  // Ejemplos de la lista de PIN prohibidos citados en docs/seguridad.md §6.1.2.
  // (6969 y 696969 también están en la lista, pero son bloques repetidos: los
  // cubre "repeated_block", que va antes en el orden de las reglas.)
  test.each([['2580'], ['1004'], ['2000'], ['1122'], ['0852'], ['112233'], ['147258'], ['159753']])(
    '[HU-01/CA-N01][RS-02] "%s" está en la lista de PIN prohibidos → "common"',
    (pin) => {
      for (const rol of todos) {
        if (rol === 'manager' && pin.length !== 6) continue;
        expect(validatePin(pin, rol)).toEqual({ ok: false, rule: 'common' });
      }
    },
  );

  test('[HU-01/CA-N01][RS-02] acepta PIN sin patrón: 4831, 48317, 739164 (y 739164 para encargado)', () => {
    for (const rol of ROLES_4_6) {
      expect(validatePin('4831', rol)).toEqual({ ok: true });
      expect(validatePin('48317', rol)).toEqual({ ok: true });
    }
    for (const rol of todos) expect(validatePin('739164', rol)).toEqual({ ok: true });
  });

  test('[HU-01/CA-N01] tres consecutivos no son secuencia (1235, 7891 válidos si no están en la lista)', () => {
    // 1235: "123" no llega a 4; 7891: 7-8-9 y el 1 no continúa.
    for (const pin of ['1235', '7891']) {
      const r = validatePin(pin, 'waiter');
      expect(r.ok || (r as { rule: string }).rule === 'common').toBe(true);
    }
  });

  test('[HU-01/CA-N01] sin vuelta de 9 a 0: 7890, 8901, 9012, 2109 y 1098 no son "sequence" (docs/arquitectura.md §7)', () => {
    for (const pin of ['7890', '8901', '9012', '2109', '1098']) {
      expect(validatePin(pin, 'waiter'), pin).not.toEqual({ ok: false, rule: 'sequence' });
    }
  });

  test('[HU-01/CA-N01] "repeated_block" exige que el PIN entero sea el bloque repetido: 12121, 48348, 121234 no lo son', () => {
    // 5 dígitos no es múltiplo de 2 ni de 3; 121234 repite "12" pero no entero
    // (y contiene 1234: es "sequence").
    for (const pin of ['12121', '48348']) {
      expect(validatePin(pin, 'waiter'), pin).not.toEqual({ ok: false, rule: 'repeated_block' });
    }
    expect(validatePin('121234', 'waiter')).toEqual({ ok: false, rule: 'sequence' });
  });

  test('[HU-01/CA-N01] orden: "digits_only" antes que la longitud; la cadena vacía es "length"/"manager_length"', () => {
    expect(validatePin('48a', 'waiter')).toEqual({ ok: false, rule: 'digits_only' });
    expect(validatePin('48a1', 'manager')).toEqual({ ok: false, rule: 'digits_only' });
    expect(validatePin('４８３１７３', 'manager')).toEqual({ ok: false, rule: 'digits_only' });
    expect(validatePin('', 'manager')).toEqual({ ok: false, rule: 'manager_length' });
    expect(validatePin('', 'kitchen')).toEqual({ ok: false, rule: 'length' });
  });

  test('[HU-01/CA-N01] orden de las reglas: longitud antes que composición', () => {
    // 11111 es "mismo dígito" pero para un encargado falla antes por longitud.
    expect(validatePin('11111', 'manager')).toEqual({ ok: false, rule: 'manager_length' });
    expect(validatePin('1111111', 'waiter')).toEqual({ ok: false, rule: 'length' });
    // "mismo dígito" antes que "secuencia"/"bloque" (1111 también es bloque "11" repetido).
    expect(validatePin('1111', 'waiter')).toEqual({ ok: false, rule: 'all_same' });
    // 6969 está en la lista de prohibidos y además es un bloque repetido: gana el bloque.
    expect(validatePin('6969', 'waiter')).toEqual({ ok: false, rule: 'repeated_block' });
    expect(validatePin('234234', 'waiter')).toEqual({ ok: false, rule: 'repeated_block' });
  });
});
