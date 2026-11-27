// HU-05: lectura del menú que usa la toma de pedidos (HU-02) y la pantalla de
// gestión. GET /menu (docs/arquitectura.md §5.1): "categorías y productos
// activos ordenados, con `available` (K sin precio)". CA-F01, CA-F02, CA-F05
// (los desactivados no salen), CA-F09 (orden) y RS-19 (barra no recibe ni una
// clave de importe). Forma propuesta (tests/README.md §7.1):
//   200 { categories: [ { id, name, products: [ { id, name, available, priceCents? } ] } ] }
//   GET /menu?includeInactive=true (solo encargado): añade `active` y los desactivados.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { codigo, esperar401, pedir } from '../../support/http.ts';
import { buscarProducto, categoriasDe, clavesDeImporte, crearEquipo, productosDe, type Equipo } from '../../support/menu.ts';

let ctx: Ctx;
let eq: Equipo;
beforeEach(async () => {
  ctx = await montarApp({ bdAislada: true });
  eq = await crearEquipo(ctx);
});
afterEach(async () => {
  await ctx?.cerrar();
});

describe('GET /menu', () => {
  test('[HU-05/CA-F01] sin categorías → 200 con la lista vacía (para el estado vacío de la toma y de la gestión)', async () => {
    for (const c of [eq.m, eq.w, eq.k]) {
      const r = await c.menu();
      expect(r.status, r.raw).toBe(200);
      expect(categoriasDe(r)).toEqual([]);
    }
  });

  test('[HU-05/CA-F01][HU-05/CA-F02][HU-05/CA-F09] categorías y productos en el orden del menú; una categoría sin productos sale con la lista vacía', async () => {
    const a = await eq.m.categoria('Cafés');
    const b = await eq.m.categoria('Infusiones');
    const c = await eq.m.categoria('Bollería');
    for (const [n, p] of [['Café solo', 130], ['Café con leche', 160], ['Moca', 250]] as const) await eq.m.producto(a, n, p);
    await eq.m.producto(c, 'Cruasán', 180);

    const menu = await eq.w.categorias();
    expect(menu.map((x) => x.name)).toEqual(['Cafés', 'Infusiones', 'Bollería']);
    expect(menu[0]!.products.map((p) => [p.name, p.priceCents, p.available])).toEqual([
      ['Café solo', 130, true],
      ['Café con leche', 160, true],
      ['Moca', 250, true],
    ]);
    expect(menu[1]).toMatchObject({ id: b, products: [] });
    expect(menu[2]!.products.map((p) => p.name)).toEqual(['Cruasán']);
  });

  test('[HU-05/CA-F05] los productos desactivados no salen para camarero, barra ni encargado; el encargado los ve con includeInactive=true y active:false', async () => {
    const cat = await eq.m.categoria('Cafés');
    const activo = await eq.m.producto(cat, 'Solo');
    const inactivo = await eq.m.producto(cat, 'Descafeinado', 140);
    await eq.m.desactivar(inactivo);

    for (const c of [eq.w, eq.k, eq.m]) {
      const ids = productosDe(await c.categorias()).map((p) => p.id);
      expect(ids).toEqual([activo]);
    }
    const todos = await eq.m.categorias({ incluirInactivos: true });
    expect(productosDe(todos).map((p) => [p.id, p.active])).toEqual([[activo, true], [inactivo, false]]);
  });

  test('[HU-05/CA-N01] includeInactive es solo del encargado: camarero y barra reciben 403 FORBIDDEN (no se filtra lo desactivado)', async () => {
    const cat = await eq.m.categoria('Cafés');
    await eq.m.desactivar(await eq.m.producto(cat, 'Oculto'));
    for (const c of [eq.w, eq.k]) {
      const r = await c.menu({ incluirInactivos: true });
      expect([r.status, codigo(r)]).toEqual([403, 'FORBIDDEN']);
      expect(r.raw).not.toContain('Oculto');
    }
  });

  test('[HU-05/CA-F04] los agotados salen con available:false (siguen en el menú, deshabilitados en la toma)', async () => {
    const cat = await eq.m.categoria('Cafés');
    const moca = await eq.m.producto(cat, 'Moca', 250);
    await eq.m.disponibilidad(moca, { available: false });
    for (const c of [eq.w, eq.k, eq.m]) expect(buscarProducto(await c.categorias(), moca)).toMatchObject({ name: 'Moca', available: false });
  });

  test('[HU-05/CA-F02][RS-19] barra no recibe ninguna clave de importe en el menú; camarero y encargado reciben priceCents entero', async () => {
    const cat = await eq.m.categoria('Cafés');
    for (const [n, p] of [['A', 10], ['B', 1], ['C', 99_999], ['D', 220]] as const) await eq.m.producto(cat, n, p);

    const deBarra = await eq.k.menu();
    expect(deBarra.status).toBe(200);
    expect(clavesDeImporte(deBarra.body), 'claves /cents|price|total|amount|tendered|change/ en la respuesta de barra').toEqual([]);
    expect(deBarra.raw).not.toMatch(/priceCents|price_cents/);
    expect(productosDe(categoriasDe(deBarra)).map((p) => p.name)).toEqual(['A', 'B', 'C', 'D']);

    for (const c of [eq.w, eq.m]) {
      const precios = productosDe(await c.categorias()).map((p) => p.priceCents);
      expect(precios).toEqual([10, 1, 99_999, 220]);
      for (const p of precios) expect(Number.isInteger(p)).toBe(true);
    }
  });

  test('[HU-05/CA-F01] sin sesión → 401 sin details; la respuesta no se guarda en caché (RS-27)', async () => {
    esperar401(await pedir(ctx, { ruta: '/menu' }), null);
    const r = await eq.w.menu();
    expect(r.headers['cache-control']).toBe('no-store');
  });

  test('[HU-05/CA-F01][SEC-030] la recarga pasiva del menú (X-Activity: passive) se admite igual', async () => {
    expect((await eq.w.menu({ pasiva: true })).status).toBe(200);
  });
});
