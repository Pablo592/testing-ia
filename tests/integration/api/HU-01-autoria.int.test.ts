// HU-01/CA-F10: un pedido creado o cobrado queda registrado con el usuario que
// hizo la acción. Necesita POST /orders (HU-02) y POST /payments (HU-04): estos
// casos se ejecutan cuando esas historias entran en tests/support/alcance.ts.
// Hasta entonces HU-01/CA-F10 figura como "pendiente de HU-02/HU-04" en
// docs/testing.md §12.
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { enAlcance } from '../../support/alcance.ts';
import { montarApp, type Ctx } from '../../support/app.ts';
import { pedir, sesion } from '../../support/http.ts';
import { crearUsuario } from '../../support/fixtures.ts';

let ctx: Ctx;
beforeEach(async () => {
  ctx = await montarApp();
});
afterEach(async () => {
  await ctx?.cerrar();
});

async function productoDePrueba(): Promise<string> {
  const cat = randomUUID();
  const prod = randomUUID();
  await ctx.bd.query(`INSERT INTO categories (id, name, position) VALUES ($1, $2, 999)`, [cat, `cat-${cat.slice(0, 8)}`]);
  await ctx.bd.query(
    `INSERT INTO products (id, category_id, name, price_cents, available, active, position, updated_at)
     VALUES ($1, $2, $3, 150, true, true, 1, $4)`,
    [prod, cat, `prod-${prod.slice(0, 8)}`, ctx.reloj.now()],
  );
  return prod;
}

describe.runIf(enAlcance('HU-02'))('Autoría del pedido (HU-02)', () => {
  test('[HU-01/CA-F10] el pedido creado registra created_by = usuario de la sesión', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    const id = randomUUID();
    const r = await pedir(ctx, {
      metodo: 'POST',
      ruta: '/orders',
      cookie,
      cuerpo: { id, type: 'counter', lines: [{ id: randomUUID(), productId: await productoDePrueba(), quantity: 1 }] },
    });
    expect(r.status).toBe(201);
    const fila = await ctx.bd.query(`SELECT created_by FROM orders WHERE id = $1`, [id]);
    expect(fila.rows[0].created_by).toBe(u.id);
  });
});

describe.runIf(enAlcance('HU-02', 'HU-04'))('Autoría del cobro (HU-04)', () => {
  test('[HU-01/CA-F10] el cobro registra paid_by = usuario de la sesión (distinto del que creó el pedido)', async () => {
    const creador = await crearUsuario(ctx, { rol: 'waiter' });
    const cajero = await crearUsuario(ctx, { rol: 'waiter' });
    const c1 = await sesion(ctx, creador.nombre, creador.pin);
    const c2 = await sesion(ctx, cajero.nombre, cajero.pin);
    const pedido = randomUUID();
    await pedir(ctx, {
      metodo: 'POST',
      ruta: '/orders',
      cookie: c1,
      cuerpo: { id: pedido, type: 'counter', lines: [{ id: randomUUID(), productId: await productoDePrueba(), quantity: 2 }] },
    });
    const cobro = randomUUID();
    const r = await pedir(ctx, {
      metodo: 'POST',
      ruta: '/payments',
      cookie: c2,
      cuerpo: { id: cobro, orderIds: [pedido], method: 'card', expectedTotalCents: 300 },
    });
    expect(r.status).toBe(201);
    const fila = await ctx.bd.query(`SELECT paid_by FROM payments WHERE id = $1`, [cobro]);
    expect(fila.rows[0].paid_by).toBe(cajero.id);
  });
});
