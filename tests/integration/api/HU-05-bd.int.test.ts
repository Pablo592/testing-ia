// HU-05: la BD impone lo que el servidor valida, aunque falle la lógica de
// aplicación (docs/arquitectura.md §4.1, "categories" y "products"; RS-32). Se
// escribe como app_rw (`ctx.bd`), sin pasar por la API, para fabricar casos
// imposibles:
//   - nombre de categoría <= 30 y de producto <= 40 caracteres;
//   - categories: único `lower(name)` entre las no archivadas;
//   - products: `price_cents` entre 1 y 99999 (0,01–999,99 €) y único
//     `(category_id, lower(name))` entre los activos;
//   - integridad referencial;
//   - "borrar" no existe: app_rw no tiene DELETE (CA-F05: el histórico se conserva;
//     CA-F08: se archiva) ni TRUNCATE.
// Contrato (tests/README.md §7.5): las inserciones de estos tests dan exactamente
// estas columnas; cualquier otra columna NOT NULL debe tener valor por defecto.
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';

let ctx: Ctx;
beforeEach(async () => {
  ctx = await montarApp({ bdAislada: true });
});
afterEach(async () => {
  await ctx?.cerrar();
});

async function codigoPg(accion: Promise<unknown>): Promise<string | undefined> {
  try {
    await accion;
    return undefined;
  } catch (e) {
    return (e as { code?: string }).code;
  }
}

function categoria(nombre: string, posicion: number, archivada = false): Promise<unknown> {
  return ctx.bd.query(`INSERT INTO categories (id, name, position, archived_at) VALUES ($1, $2, $3, $4)`, [
    randomUUID(),
    nombre,
    posicion,
    archivada ? new Date('2026-11-24T09:00:00Z') : null,
  ]);
}

async function idCategoria(nombre: string, posicion = 0): Promise<string> {
  const id = randomUUID();
  await ctx.bd.query(`INSERT INTO categories (id, name, position, archived_at) VALUES ($1, $2, $3, NULL)`, [id, nombre, posicion]);
  return id;
}

function producto(categoryId: string, nombre: string, centimos: number, o: { activo?: boolean; posicion?: number } = {}): Promise<unknown> {
  return ctx.bd.query(
    `INSERT INTO products (id, category_id, name, price_cents, available, active, position, updated_at)
     VALUES ($1, $2, $3, $4, true, $5, $6, now())`,
    [randomUUID(), categoryId, nombre, centimos, o.activo ?? true, o.posicion ?? 0],
  );
}

describe('categories', () => {
  test('[HU-05/CA-F01] el nombre admite 30 caracteres y no 31 (22001, o 23514 si se impone con CHECK)', async () => {
    expect(await codigoPg(categoria('C'.repeat(30), 0))).toBeUndefined();
    expect(['22001', '23514']).toContain(await codigoPg(categoria('C'.repeat(31), 1)));
  });

  test('[HU-05/CA-F01] el nombre es único sin distinguir mayúsculas entre las no archivadas (23505); una archivada libera el nombre', async () => {
    expect(await codigoPg(categoria('Cafés', 0))).toBeUndefined();
    expect(await codigoPg(categoria('CAFÉS', 1))).toBe('23505');
    expect(await codigoPg(categoria('cafés', 1))).toBe('23505');
    expect(await codigoPg(categoria('Infusiones', 1, true))).toBeUndefined();
    expect(await codigoPg(categoria('Infusiones', 2))).toBeUndefined();
    // Dos archivadas con el mismo nombre también caben (el índice es parcial).
    expect(await codigoPg(categoria('Infusiones', 3, true))).toBeUndefined();
  });

  test('[HU-05/CA-F08] archivar es un UPDATE de archived_at; borrar la fila o vaciar la tabla no está permitido a app_rw (42501)', async () => {
    const id = await idCategoria('Postres');
    expect(await codigoPg(ctx.bd.query(`UPDATE categories SET archived_at = now() WHERE id = $1`, [id]))).toBeUndefined();
    expect(await codigoPg(ctx.bd.query(`DELETE FROM categories WHERE id = $1`, [id]))).toBe('42501');
    expect(await codigoPg(ctx.bd.query(`TRUNCATE categories CASCADE`))).toBe('42501');
    expect((await ctx.bd.query(`SELECT 1 FROM categories WHERE id = $1`, [id])).rowCount).toBe(1);
  });
});

describe('products', () => {
  test('[HU-05/CA-F02][HU-05/CA-F06] price_cents solo admite de 1 a 99999 (23514): 0, negativo y 100000 se rechazan', async () => {
    const cat = await idCategoria('Cafés');
    expect(await codigoPg(producto(cat, 'Barato', 1))).toBeUndefined();
    expect(await codigoPg(producto(cat, 'Caro', 99_999))).toBeUndefined();
    for (const [nombre, c] of [['Cero', 0], ['Negativo', -1], ['Demasiado', 100_000], ['Enorme', 2_000_000_000]] as const) {
      expect(await codigoPg(producto(cat, nombre, c)), `${nombre}: ${c}`).toBe('23514');
    }
  });

  test('[HU-05/CA-F02][HU-05/CA-F06] el nombre admite 40 caracteres y no 41 (22001, o 23514 si se impone con CHECK)', async () => {
    const cat = await idCategoria('Cafés');
    expect(await codigoPg(producto(cat, 'N'.repeat(40), 100))).toBeUndefined();
    expect(['22001', '23514']).toContain(await codigoPg(producto(cat, 'N'.repeat(41), 100, { posicion: 1 })));
  });

  test('[HU-05/CA-F07] único (categoría, lower(nombre)) entre los activos (23505); los desactivados no cuentan; en otra categoría sí vale', async () => {
    const a = await idCategoria('Cafés', 0);
    const b = await idCategoria('Infusiones', 1);
    expect(await codigoPg(producto(a, 'Moca', 250))).toBeUndefined();
    expect(await codigoPg(producto(a, 'MOCA', 250, { posicion: 1 }))).toBe('23505');
    expect(await codigoPg(producto(b, 'Moca', 250))).toBeUndefined();
    // Uno desactivado con ese nombre cabe, y reactivarlo con otro activo ya presente falla.
    expect(await codigoPg(producto(a, 'Moca', 250, { activo: false, posicion: 2 }))).toBeUndefined();
    expect(await codigoPg(ctx.bd.query(`UPDATE products SET active = true WHERE category_id = $1 AND NOT active`, [a]))).toBe('23505');
  });

  test('[HU-05/CA-F02] la categoría tiene que existir (23503)', async () => {
    expect(await codigoPg(producto(randomUUID(), 'Huérfano', 100))).toBe('23503');
  });

  test('[HU-05/CA-F05] un producto no se borra: app_rw no tiene DELETE ni TRUNCATE (42501) y la fila sigue ahí (el histórico de pedidos y ventas la referencia)', async () => {
    const cat = await idCategoria('Cafés');
    await producto(cat, 'Solo', 130);
    expect(await codigoPg(ctx.bd.query(`DELETE FROM products WHERE category_id = $1`, [cat]))).toBe('42501');
    expect(await codigoPg(ctx.bd.query(`TRUNCATE products`))).toBe('42501');
    expect(await codigoPg(ctx.bd.query(`UPDATE products SET active = false, price_cents = 140 WHERE category_id = $1`, [cat]))).toBeUndefined();
    const f = await ctx.bd.query<{ active: boolean; price_cents: number }>(`SELECT active, price_cents FROM products WHERE category_id = $1`, [cat]);
    expect(f.rows).toEqual([{ active: false, price_cents: 140 }]);
  });
});
