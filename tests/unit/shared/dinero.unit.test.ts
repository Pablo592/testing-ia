// Dinero en céntimos (ADR-006, docs/arquitectura.md §8; docs/testing.md §5.1):
// el precio que escribe el encargado ("2,50") se convierte a céntimos
// PARSEANDO LA CADENA, nunca con parseFloat(x) * 100, y se muestra con una
// única función `formatCents`. HU-05/CA-F02 (precio mayor que 0 y hasta 999,99,
// máx. 2 decimales) y CA-F06 (más de 2 decimales no se guarda).
//
// Contrato (tests/README.md §7.3, propuesto por Testing, pendiente de confirmar
// por el SE): subruta `@mi-app/shared/money` con
//   parseCents(texto: string): number | null
//     céntimos enteros de un importe escrito con coma o punto y como mucho 2
//     decimales ("2,50", "2.5", "2"); `null` si no es un importe de ese tipo
//     (vacío, letras, más de 2 decimales, signo negativo, más de un separador).
//     No comprueba el rango de HU-05: eso lo hace el formulario (y la API).
//   formatCents(cents: number): string   "1,30 €" (es-ES; el espacio antes del
//     euro puede ser U+00A0). Los precios de producto no llegan a 1.000 €.
import { describe, expect, test } from 'vitest';

// Import dinámico dentro de cada test: mientras `@mi-app/shared/money` no exista, cada test falla por separado
// (y se ve cuál) en vez de romper la carga del fichero.
const MODULO = ['@mi-app/shared', 'money'].join('/');
const dinero = (): Promise<{ parseCents(t: string): number | null; formatCents(c: number): string }> => import(/* @vite-ignore */ MODULO);

describe('parseCents', () => {
  test.each([
    ['2,50', 250],
    ['2.5', 250],
    ['2,5', 250],
    ['2', 200],
    ['0,01', 1],
    ['0.01', 1],
    ['999,99', 99999],
    ['999.99', 99999],
    ['10', 1000],
    ['1,30', 130],
    // Importes cuyo producto por 100 en coma flotante falla (0,57 * 100 = 56,99999999999999):
    ['0,57', 57],
    ['0,29', 29],
    ['1,10', 110],
    ['2,20', 220],
    ['4,35', 435],
    ['8,2', 820],
    ['19,99', 1999],
    ['1.15', 115],
    ['16,39', 1639],
    ['0,10', 10],
  ])('[HU-05/CA-F02][ADR-006] "%s" → %i céntimos exactos', async (texto, cents) => {
    const { parseCents } = await dinero();
    expect(parseCents(texto)).toBe(cents);
  });

  test('[HU-05/CA-F02][ADR-006] cualquier importe de 0,01 a 999,99 (99 999 valores) se convierte sin error de coma flotante', async () => {
    const { parseCents } = await dinero();
    for (let c = 1; c <= 99_999; c++) {
      const euros = Math.trunc(c / 100);
      const resto = String(c % 100).padStart(2, '0');
      const coma = `${euros},${resto}`;
      const punto = `${euros}.${resto}`;
      if (parseCents(coma) !== c || parseCents(punto) !== c) {
        throw new Error(`${coma} / ${punto} deberían ser ${c} céntimos (dieron ${String(parseCents(coma))} / ${String(parseCents(punto))})`);
      }
    }
  });

  test.each([
    [''],
    [' '],
    ['abc'],
    ['2,505'], // 3 decimales
    ['1,999'],
    ['0,001'],
    ['1.005'],
    ['2,50,1'],
    ['2,5,0'],
    ['--1'],
    ['-1'],
    ['-0,50'],
    ['1e2'],
    ['2 €2'],
    ['€2'],
    ['2,'],
    [','],
    ['NaN'],
    ['Infinity'],
    ['0x10'],
  ])('[HU-05/CA-F06][ADR-006] "%s" no es un importe válido → null', async (texto) => {
    const { parseCents } = await dinero();
    expect(parseCents(texto)).toBeNull();
  });
});

describe('formatCents', () => {
  test.each([
    [130, '1,30'],
    [1, '0,01'],
    [10, '0,10'],
    [99999, '999,99'],
    [250, '2,50'],
    [110, '1,10'],
    [0, '0,00'],
    [200, '2,00'],
    [57, '0,57'],
  ])('[HU-05/CA-F02][ADR-006] %i céntimos → "%s €" (es-ES)', async (cents, texto) => {
    const { formatCents } = await dinero();
    expect(formatCents(cents)).toMatch(new RegExp(`^${texto}[\\s\\u00a0]€$`));
  });

  test('[HU-05/CA-F02][ADR-006] formatCents y parseCents son inversas para todos los precios válidos', async () => {
    const { formatCents, parseCents } = await dinero();
    for (let c = 1; c <= 99_999; c++) {
      const texto = formatCents(c).replace(/[\s\u00a0]€$/, '');
      if (parseCents(texto) !== c) throw new Error(`${c} → «${texto}» → ${String(parseCents(texto))}`);
    }
  });
});
