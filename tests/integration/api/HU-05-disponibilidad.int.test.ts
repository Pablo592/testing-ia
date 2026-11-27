// HU-05/CA-F04 (parte de la API: cualquier camarero o el encargado marca un
// producto "Agotado" y vuelve a "Disponible"; barra no) y CA-N01 (el camarero
// solo puede cambiar la disponibilidad, no el precio ni nada más: lo decide el
// servidor). PATCH /products/:id/availability { available } (docs/arquitectura.md
// §5.1, permiso product:set_availability). La propagación a todos los dispositivos
// en <= 5 s (SSE) está en tests/integration/realtime/HU-05-*.int.test.ts.
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { codigo, incidencias } from '../../support/http.ts';
import { auditoriaDe, buscarProducto, crearEquipo, filaProducto, type Equipo } from '../../support/menu.ts';
import { huella } from '../../support/bd.ts';
import { nombreUnico } from '../../support/fixtures.ts';

let ctx: Ctx;
let eq: Equipo;
let id: string;
beforeEach(async () => {
  ctx = await montarApp();
  eq = await crearEquipo(ctx);
  id = await eq.m.producto(await eq.m.categoria(nombreUnico('Cafés')), 'Moca', 250);
});
afterEach(async () => {
  await ctx?.cerrar();
});

describe('CA-F04: Agotado / Disponible', () => {
  test.each([
    ['camarero', 'w'],
    ['encargado', 'm'],
  ] as const)('[HU-05/CA-F04][HU-05/CA-N01] el %s marca Agotado → 200 y lo ven camarero, barra y encargado como no disponible, sin salir del menú', async (_quien, clave) => {
    const r = await eq[clave].disponibilidad(id, { available: false });
    expect(r.status, r.raw).toBe(200);
    expect((r.body.product ?? r.body).available).toBe(false);

    for (const [nombre, c] of [['camarero', eq.w], ['barra', eq.k], ['encargado', eq.m]] as const) {
      expect(buscarProducto(await c.categorias(), id), `${nombre} sigue viendo el producto, agotado`).toMatchObject({ name: 'Moca', available: false });
    }
    expect(await filaProducto(ctx, id)).toMatchObject({ available: false, active: true, price_cents: 250 });
  });

  test('[HU-05/CA-F04] marcarlo Disponible otra vez lo devuelve a poder pedirse; repetir el mismo valor es inocuo', async () => {
    expect((await eq.w.disponibilidad(id, { available: false })).status).toBe(200);
    expect((await eq.w.disponibilidad(id, { available: false })).status).toBe(200);
    expect((await eq.m.disponibilidad(id, { available: true })).status).toBe(200);
    expect((await eq.m.disponibilidad(id, { available: true })).status).toBe(200);
    for (const c of [eq.w, eq.k, eq.m]) expect(buscarProducto(await c.categorias(), id)).toMatchObject({ available: true });
  });

  test('[HU-05/CA-F04][HU-05/CA-N01] barra no puede: 403 FORBIDDEN, sin details y sin cambios en la BD', async () => {
    const antes = await huella(ctx.bd);
    for (const available of [false, true]) {
      const r = await eq.k.disponibilidad(id, { available });
      expect([r.status, codigo(r)]).toEqual([403, 'FORBIDDEN']);
      expect(r.body.error.details).toBeUndefined();
    }
    expect(await huella(ctx.bd)).toBe(antes);
  });

  test('[HU-05/CA-F04] registra el cambio en el log (product.availability_changed: product_id y available)', async () => {
    await eq.w.disponibilidad(id, { available: false });
    const ev = ctx.logs.eventos('product.availability_changed').filter((e) => e.product_id === id);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ available: false });
  });

  test('[HU-05/CA-F04] producto que no existe → 404; id que no es un UUID → 400 o 404, nunca 500', async () => {
    expect((await eq.w.disponibilidad(randomUUID(), { available: false })).status).toBe(404);
    expect([400, 404]).toContain((await eq.w.disponibilidad('no-es-un-uuid', { available: false })).status);
    expect(ctx.logs.eventos('http.request.unhandled_error')).toEqual([]);
  });

  test('[HU-05/CA-F06] cuerpo inválido → 400 con campo y regla: sin available (required), no booleano (type)', async () => {
    expect(incidencias(await eq.w.disponibilidad(id, {}))).toEqual([{ path: ['available'], rule: 'required' }]);
    for (const available of ['false', 0, 1, null, 'no']) {
      const r = await eq.w.disponibilidad(id, { available });
      expect([r.status, codigo(r)], JSON.stringify(available)).toEqual([400, 'VALIDATION_FAILED']);
      expect(incidencias(r), JSON.stringify(available)).toEqual([{ path: ['available'], rule: 'type' }]);
    }
    expect(await filaProducto(ctx, id)).toMatchObject({ available: true });
  });
});

describe('CA-N01: el camarero solo cambia la disponibilidad', () => {
  test('[HU-05/CA-N01][RS-20] por esta ruta, cualquier otro campo (precio, nombre, activo, categoría) → 400 not_allowed y no cambia nada', async () => {
    const antes = await filaProducto(ctx, id);
    for (const extra of [{ priceCents: 1 }, { name: 'Gratis' }, { active: false }, { categoryId: randomUUID() }, { foo: 1 }]) {
      const r = await eq.w.disponibilidad(id, { available: false, ...extra });
      expect([r.status, codigo(r)], JSON.stringify(extra)).toEqual([400, 'VALIDATION_FAILED']);
      expect(incidencias(r), JSON.stringify(extra)).toEqual([{ path: [Object.keys(extra)[0]!], rule: 'not_allowed' }]);
    }
    expect(await filaProducto(ctx, id)).toEqual(antes);
    expect(await auditoriaDe(ctx, id, 'price.changed')).toEqual([]);
  });

  test('[HU-05/CA-N01] el camarero no puede editar el producto por la ruta del encargado, ni siquiera para marcar agotado: 403 y sin cambios', async () => {
    const antes = await huella(ctx.bd);
    for (const cuerpo of [{ available: false }, { priceCents: 1 }, { name: 'Otro' }, { active: false }]) {
      const r = await eq.w.editarProducto(id, cuerpo);
      expect([r.status, codigo(r)], JSON.stringify(cuerpo)).toEqual([403, 'FORBIDDEN']);
    }
    expect(await huella(ctx.bd)).toBe(antes);
  });
});
