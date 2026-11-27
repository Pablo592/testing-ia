// HU-05/CA-F03 (los pedidos ya enviados conservan su precio) y CA-F05 (un
// producto desactivado se conserva en el histórico de pedidos y ventas).
// Necesitan POST /orders (HU-02, docs/arquitectura.md §5.1) y las tablas
// `orders`/`order_lines` (§4.1): se ejecutan cuando HU-02 entra en
// tests/support/alcance.ts, igual que HU-01/CA-F10. Mientras tanto la parte de
// la API de estos criterios (precio y desactivación) está en HU-05-productos
// y HU-05-menu-lectura, y que la BD no deja borrar productos, en HU-05-bd.
//
// Lo que se afirma sale de la arquitectura: `order_lines.unit_price_cents` y
// `order_lines.product_name` son una instantánea al enviar (§4.1) y el precio de
// la línea lo pone el servidor.
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { enAlcance } from '../../support/alcance.ts';
import { montarApp, type Ctx } from '../../support/app.ts';
import { pedir } from '../../support/http.ts';
import { crearEquipo, type Equipo } from '../../support/menu.ts';
import { nombreUnico } from '../../support/fixtures.ts';

describe.runIf(enAlcance('HU-02'))('pedidos y menú (necesita HU-02)', () => {
  let ctx: Ctx;
  let eq: Equipo;
  beforeEach(async () => {
    ctx = await montarApp();
    eq = await crearEquipo(ctx);
  });
  afterEach(async () => {
    await ctx?.cerrar();
  });

  async function enviarPedido(cookie: string, productId: string, quantity = 1): Promise<string> {
    const id = randomUUID();
    const r = await pedir(ctx, { metodo: 'POST', ruta: '/orders', cookie, cuerpo: { id, type: 'counter', lines: [{ id: randomUUID(), productId, quantity }] } });
    if (r.status !== 201) throw new Error(`POST /orders: ${r.status} ${r.raw.slice(0, 300)}`);
    return id;
  }

  async function lineas(orderId: string): Promise<{ unit_price_cents: number; product_name: string; product_id: string }[]> {
    const r = await ctx.bd.query(`SELECT unit_price_cents, product_name, product_id FROM order_lines WHERE order_id = $1`, [orderId]);
    return r.rows;
  }

  test('[HU-05/CA-F03] cambiar el precio afecta a los pedidos que se envían después; los ya enviados conservan el suyo', async () => {
    const p = await eq.m.producto(await eq.m.categoria(nombreUnico('Cafés')), 'Capuchino', 220);
    const antes = await enviarPedido(eq.cookies.w, p);
    expect((await eq.m.editarProducto(p, { priceCents: 260 })).status).toBe(200);
    const despues = await enviarPedido(eq.cookies.w, p, 2);

    expect((await lineas(antes))[0]).toMatchObject({ unit_price_cents: 220, product_name: 'Capuchino' });
    expect((await lineas(despues))[0]).toMatchObject({ unit_price_cents: 260 });
    const totales = await ctx.bd.query<{ id: string; total_cents: number }>(`SELECT id, total_cents FROM orders WHERE id = ANY($1)`, [[antes, despues]]);
    const total = (id: string) => totales.rows.find((f) => f.id === id)!.total_cents;
    expect(total(antes)).toBe(220);
    expect(total(despues)).toBe(520);

    // Y otra vez a la baja: el segundo tampoco cambia.
    expect((await eq.m.editarProducto(p, { priceCents: 100 })).status).toBe(200);
    expect((await lineas(despues))[0]).toMatchObject({ unit_price_cents: 260 });
  });

  test('[HU-05/CA-F05] un producto desactivado después de pedirse sigue en el pedido (nombre y precio de la instantánea) y en el detalle', async () => {
    const p = await eq.m.producto(await eq.m.categoria(nombreUnico('Cafés')), 'Descafeinado', 140);
    const pedido = await enviarPedido(eq.cookies.w, p);
    await eq.m.desactivar(p);

    expect((await lineas(pedido))[0]).toMatchObject({ product_id: p, product_name: 'Descafeinado', unit_price_cents: 140 });
    const detalle = await pedir(ctx, { ruta: `/orders/${pedido}`, cookie: eq.cookies.w });
    expect(detalle.status, detalle.raw).toBe(200);
    expect(detalle.raw).toContain('Descafeinado');
  });

  test('[HU-05/CA-F03][HU-05/CA-F05] renombrar un producto no cambia el nombre de las líneas ya enviadas', async () => {
    const p = await eq.m.producto(await eq.m.categoria(nombreUnico('Cafés')), 'Cortado', 140);
    const pedido = await enviarPedido(eq.cookies.m, p);
    expect((await eq.m.editarProducto(p, { name: 'Cortado largo' })).status).toBe(200);
    expect((await lineas(pedido))[0]).toMatchObject({ product_name: 'Cortado' });
  });
});
