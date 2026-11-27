// Regla general de texto recibido por la API (docs/arquitectura.md §5 y §18.2,
// D-2.5-03 c, SEC-042; confirmada por Cybersecurity en docs/seguridad.md §6.14
// con las condiciones C10 y C11). La implementa HU-05, la primera historia que
// crea nombres, y las tablas de abajo están escritas a mano desde esa decisión
// (no se importa nada de la implementación para calcular el esperado).
//
//   apiText(min, max)  texto libre y el `name` del login: 1. NFC; 2. rechaza
//     \p{Cc} (C0, DEL y C1 U+0080–U+009F), U+2028/U+2029, controles bidireccionales
//     (U+202A–U+202E, U+2066–U+2069) y sustitutos UTF-16 sueltos; 3. longitud
//     (String.length) sobre el texto ya normalizado.
//   apiName(min, max)  nombres únicos y visibles (usuarios, categorías, productos):
//     1. NFC; 2. trim() y tramos de U+0020 → uno; 3. lo de apiText más \p{Cf},
//     \p{Co}, \p{Cn} y cualquier \p{Z} distinto de U+0020; 4. longitud.
//   C11: se implementan como `transform` de zod (no solo `refine`): lo que sale de
//   `parse` es el valor normalizado, y ese es el que llega a la ruta.
//
// La regla (`rule: 'format'` / `min_length` / `max_length`) y el `400` se prueban
// por la API en tests/integration/api/HU-05-texto-api.int.test.ts.
import { describe, expect, test } from 'vitest';
import * as esquemas from '@mi-app/shared/api';

// `apiName` aún no existe en @mi-app/shared/api (lo crea HU-05): se toma del espacio de nombres con un tipo propio
// para que `tsc` compile antes de la implementación y cada test falle por separado en vez de romper la carga.
type Esquema = { safeParse(v: unknown): { success: boolean; data?: unknown } };
const apiText = esquemas.apiText as (min: number, max: number) => Esquema;
const apiName = (esquemas as unknown as { apiName: (min: number, max: number) => Esquema }).apiName;

function parsear(schema: { safeParse(v: unknown): { success: boolean; data?: unknown } }, valor: unknown): { ok: true; valor: unknown } | { ok: false } {
  const r = schema.safeParse(valor);
  return r.success ? { ok: true, valor: r.data } : { ok: false };
}

const visible = (s: string) => JSON.stringify(s).slice(1, -1);

// --- Caracteres prohibidos en apiText (y por tanto también en apiName) ---------

const PROHIBIDOS_EN_TEXTO: [string, string][] = [
  ['NUL (U+0000)', '\u0000'],
  ['BEL (U+0007)', '\u0007'],
  ['tabulador (U+0009)', '\t'],
  ['salto de línea (U+000A)', '\n'],
  ['retorno de carro (U+000D)', '\r'],
  ['ESC (U+001B)', '\u001b'],
  ['DEL (U+007F)', '\u007f'],
  ['C1 primero (U+0080)', '\u0080'],
  ['C1 NEL (U+0085)', '\u0085'],
  ['C1 (U+008D)', '\u008d'],
  ['C1 último (U+009F)', '\u009f'],
  ['separador de línea (U+2028)', '\u2028'],
  ['separador de párrafo (U+2029)', '\u2029'],
  ['LRE (U+202A)', '\u202a'],
  ['RLE (U+202B)', '\u202b'],
  ['PDF (U+202C)', '\u202c'],
  ['LRO (U+202D)', '\u202d'],
  ['RLO (U+202E)', '\u202e'],
  ['LRI (U+2066)', '\u2066'],
  ['RLI (U+2067)', '\u2067'],
  ['FSI (U+2068)', '\u2068'],
  ['PDI (U+2069)', '\u2069'],
  ['sustituto alto suelto al principio', '\ud800'],
  ['sustituto bajo suelto', '\udc00'],
  ['sustituto alto suelto al final', 'a\ud83d'],
  ['sustituto bajo suelto al principio', '\ude00a'],
];

// Los esquemas se crean DENTRO de cada test (fábricas): así, mientras apiName no exista, cada test falla por
// separado en vez de romper la carga del fichero.
describe.each([
  ['apiText', () => apiText(1, 100), false],
  ['apiName', () => apiName(1, 100), true],
] as const)('%s: caracteres que se rechazan siempre', (_nombre, fabrica, recorta) => {
  for (const [descripcion, c] of PROHIBIDOS_EN_TEXTO) {
    test(`[HU-05/CA-F06][SEC-042] ${descripcion} en medio, al principio o al final → rechazado`, () => {
      const schema = fabrica();
      expect(parsear(schema, `Caf${c}é`), `en medio: ${visible(`Caf${c}é`)}`).toEqual({ ok: false });
      expect(parsear(schema, c), `solo ese carácter: ${visible(c)}`).toEqual({ ok: false });
      // apiName hace trim() ANTES de rechazar (docs/arquitectura.md §5, paso 2): un tabulador, un salto de
      // línea, un retorno de carro o U+2028/U+2029 en un extremo son espacios de ECMAScript y desaparecen
      // en el trim. Es la letra de la decisión y no se afirma nada sobre esos casos en apiName (pregunta de
      // docs/testing.md §14.10). El resto (y todo en apiText, que no recorta) se rechaza también en los extremos.
      const loQuitaElTrim = recorta && /[\t\n\r\u2028\u2029]/.test(c);
      if (!loQuitaElTrim) {
        expect(parsear(schema, `${c}Café`), `al principio: ${visible(`${c}Café`)}`).toEqual({ ok: false });
        expect(parsear(schema, `Café${c}`), `al final: ${visible(`Café${c}`)}`).toEqual({ ok: false });
      }
    });
  }

  test('[HU-05/CA-F06] lo que no es una cadena se rechaza', () => {
    const schema = fabrica();
    for (const v of [undefined, null, 5, true, {}, [], ['Café']]) expect(parsear(schema, v), String(v)).toEqual({ ok: false });
  });
});

// --- apiText ------------------------------------------------------------------

describe('apiText: texto libre', () => {
  const t = apiText(1, 100);

  test('[HU-05/CA-F06][SEC-042] acepta acentos, eñes, símbolos, emoji y texto corriente', () => {
    for (const s of ['Café', 'Tostada c/ tomate', 'Té', 'José Mª Ñandú-2', '100% natural, sin azúcar (2×1)', '☕', '🍰', 'お茶', 'Crème brûlée']) {
      expect(parsear(t, s), s).toEqual({ ok: true, valor: s });
    }
  });

  test('[HU-05/CA-F06] las marcas direccionales (U+200E, U+200F, U+061C), U+200D y el NBSP se aceptan en texto libre (docs/seguridad.md §6.14)', () => {
    for (const s of ['a\u200eb', 'a\u200fb', 'a\u061cb', '👨\u200d👩\u200d👧', 'a\u00a0b', 'a\u3000b']) {
      expect(parsear(t, s), visible(s)).toEqual({ ok: true, valor: s });
    }
  });

  test('[HU-05/CA-F06] apiText no recorta ni colapsa espacios (solo apiName lo hace)', () => {
    expect(parsear(t, '  Ana   Pérez  ')).toEqual({ ok: true, valor: '  Ana   Pérez  ' });
  });

  test('[HU-05/CA-F06][C11] normaliza a NFC y devuelve el valor normalizado (transform, no solo refine)', () => {
    const descompuesto = 'Jose\u0301';
    expect(descompuesto).not.toBe('José');
    expect(parsear(t, descompuesto)).toEqual({ ok: true, valor: 'José' });
    // Ya normalizado: igual.
    expect(parsear(t, 'José')).toEqual({ ok: true, valor: 'José' });
    // Idempotente.
    const una = parsear(t, descompuesto);
    expect(una.ok && parsear(t, una.valor)).toEqual(una);
  });

  test('[HU-05/CA-F06] la longitud (min_length / max_length) se mide con String.length sobre el texto ya normalizado', () => {
    const corto = apiText(2, 5);
    expect(parsear(corto, 'a')).toEqual({ ok: false });
    expect(parsear(corto, 'ab')).toEqual({ ok: true, valor: 'ab' });
    expect(parsear(corto, 'abcde')).toEqual({ ok: true, valor: 'abcde' });
    expect(parsear(corto, 'abcdef')).toEqual({ ok: false });
    // 5 «é» descompuestas son 10 unidades UTF-16 y 5 tras la NFC: caben en max 5.
    expect(parsear(corto, 'e\u0301'.repeat(5))).toEqual({ ok: true, valor: 'é'.repeat(5) });
    expect(parsear(corto, 'e\u0301'.repeat(6))).toEqual({ ok: false });
    // Un carácter fuera del plano básico son 2 unidades: 3 de máximo no admiten 2 pasteles.
    expect(parsear(apiText(1, 3), '🍰')).toEqual({ ok: true, valor: '🍰' });
    expect(parsear(apiText(1, 3), '🍰🍰')).toEqual({ ok: false });
    expect(parsear(apiText(1, 4), '🍰🍰')).toEqual({ ok: true, valor: '🍰🍰' });
  });
});

// --- apiName ------------------------------------------------------------------

describe('apiName: nombres únicos y visibles', () => {
  const n = () => apiName(1, 30);

  test('[HU-05/CA-F01][HU-05/CA-F02] acepta nombres reales de cafetería (sin lista de permitidos)', () => {
    for (const s of [
      'Café con leche',
      'Tostada c/ tomate',
      'Té',
      'José Mª Ñandú-2',
      'Zumo (naranja) 0,2 L',
      '☕ Café',
      'お茶',
      'Crème brûlée',
      '100% natural',
      "Robert'); DROP TABLE x;--",
      '<img src=x onerror=alert(1)>',
      '☕\ufe0f', // selector de variación (Mn): se permite
    ]) {
      expect(parsear(n(), s), s).toEqual({ ok: true, valor: s });
    }
  });

  test('[HU-05/CA-F01] trim y espacios U+0020 seguidos → uno ("Ana" y "Ana␣" son el mismo nombre, docs/arquitectura.md §5)', () => {
    expect(parsear(n(), '  Café   con  leche ')).toEqual({ ok: true, valor: 'Café con leche' });
    expect(parsear(n(), 'Ana ')).toEqual(parsear(n(), 'Ana'));
    expect(parsear(n(), ' Ana')).toEqual({ ok: true, valor: 'Ana' });
    expect(parsear(n(), 'a' + ' '.repeat(40) + 'b')).toEqual({ ok: true, valor: 'a b' });
  });

  test('[HU-05/CA-F01][C11] NFC y devuelve el valor normalizado: "José" compuesto y descompuesto son el mismo nombre', () => {
    const compuesto = parsear(n(), 'José');
    const descompuesto = parsear(n(), 'Jose\u0301');
    expect(descompuesto).toEqual({ ok: true, valor: 'José' });
    expect(descompuesto).toEqual(compuesto);
    // NFC + espacios a la vez, y lo que sale vuelve a ser válido y no cambia.
    const mezcla = parsear(n(), '  Cafe\u0301   solo ');
    expect(mezcla).toEqual({ ok: true, valor: 'Café solo' });
    expect(mezcla.ok && parsear(n(), mezcla.valor)).toEqual(mezcla);
  });

  test('[HU-05/CA-F06] la longitud se mide al final: tras NFC y tras colapsar espacios (1 a 30)', () => {
    expect(parsear(n(), '')).toEqual({ ok: false });
    expect(parsear(n(), '   ')).toEqual({ ok: false });
    expect(parsear(n(), 'a'.repeat(30))).toEqual({ ok: true, valor: 'a'.repeat(30) });
    expect(parsear(n(), 'a'.repeat(31))).toEqual({ ok: false });
    expect(parsear(n(), ` ${'a'.repeat(30)} `)).toEqual({ ok: true, valor: 'a'.repeat(30) });
    expect(parsear(n(), `${'a'.repeat(15)}  ${'a'.repeat(14)}`)).toEqual({ ok: true, valor: `${'a'.repeat(15)} ${'a'.repeat(14)}` });
    expect(parsear(n(), 'e\u0301'.repeat(30))).toEqual({ ok: true, valor: 'é'.repeat(30) });
    expect(parsear(n(), 'e\u0301'.repeat(31))).toEqual({ ok: false });
    // String.length: 15 pasteles son 30 unidades (caben); 16 son 32 (no).
    expect(parsear(n(), '🍰'.repeat(15))).toEqual({ ok: true, valor: '🍰'.repeat(15) });
    expect(parsear(n(), '🍰'.repeat(16))).toEqual({ ok: false });
  });

  const SOLO_EN_NOMBRES: [string, string][] = [
    ['guion blando (U+00AD, Cf)', '\u00ad'],
    ['espacio de ancho cero (U+200B, Cf)', '\u200b'],
    ['ZWNJ (U+200C, Cf)', '\u200c'],
    ['ZWJ (U+200D, Cf)', '\u200d'],
    ['LRM (U+200E, Cf)', '\u200e'],
    ['RLM (U+200F, Cf)', '\u200f'],
    ['marca de letra árabe (U+061C, Cf)', '\u061c'],
    ['unión de palabras (U+2060, Cf)', '\u2060'],
    ['función de aplicación (U+2061, Cf)', '\u2061'],
    ['invisible (U+2064, Cf)', '\u2064'],
    ['BOM en medio (U+FEFF, Cf)', '\ufeff'],
    ['ancla interlineal (U+FFF9, Cf)', '\ufff9'],
    ['uso privado (U+E000, Co)', '\ue000'],
    ['uso privado suplementario (U+F0000, Co)', '\u{F0000}'],
    ['sin asignar (U+0378, Cn)', '\u0378'],
    ['no carácter (U+FFFF, Cn)', '\uffff'],
    ['NBSP (U+00A0, Zs)', '\u00a0'],
    ['marca de espacio ogham (U+1680, Zs)', '\u1680'],
    ['espacio en cuadratín (U+2003, Zs)', '\u2003'],
    ['espacio fino (U+2009, Zs)', '\u2009'],
    ['espacio de ancho fijo estrecho (U+202F, Zs)', '\u202f'],
    ['espacio matemático medio (U+205F, Zs)', '\u205f'],
    ['espacio ideográfico (U+3000, Zs)', '\u3000'],
  ];

  for (const [descripcion, c] of SOLO_EN_NOMBRES) {
    test(`[HU-05/CA-F06][SEC-042] ${descripcion} dentro del nombre → rechazado (apiText lo acepta, apiName no)`, () => {
      const dentro = `Caf${c}é`;
      expect(parsear(n(), dentro), `apiName ${visible(dentro)}`).toEqual({ ok: false });
      expect(parsear(n(), `Café ${c}solo`), `tras un espacio ${visible(c)}`).toEqual({ ok: false });
    });
  }

  test('[HU-05/CA-F06] los invisibles (Cf) que trim() no quita tampoco valen al principio ni al final', () => {
    // U+FEFF, U+00A0 y U+3000 los quita trim() (son espacios de ECMAScript) y no se prueban aquí: ver la pregunta
    // de docs/testing.md §14.10 (qué hacer con un NBSP en los extremos). U+200B, U+00AD y U+200D no son espacios.
    for (const c of ['\u200b', '\u00ad', '\u200d', '\u2060']) {
      expect(parsear(n(), `${c}Café`), `al principio ${visible(c)}`).toEqual({ ok: false });
      expect(parsear(n(), `Café${c}`), `al final ${visible(c)}`).toEqual({ ok: false });
    }
  });

  test('[HU-05/CA-F06] consecuencia aceptada de rechazar \\p{Cf}: un emoji con ZWJ no es un nombre válido', () => {
    expect(parsear(n(), '👨\u200d👩\u200d👧')).toEqual({ ok: false });
    // El mismo texto sí es válido como texto libre (nota, motivo).
    expect(parsear(apiText(1, 30), '👨\u200d👩\u200d👧').ok).toBe(true);
  });
});
