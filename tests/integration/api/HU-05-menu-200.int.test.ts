// HU-05/CA-N03: con un menú de 200 productos en 20 categorías (supuesto 3,
// conjunto `menu-200` de docs/testing.md §9.1) se siguen cumpliendo, y solo
// estos (lista cerrada, T-17, I-06): HU-02/CA-N01, HU-02/CA-U05, HU-02/CA-F23,
// HU-02/CA-N05 y HU-05/CA-F04. De ellos, lo que depende de HU-05 es que el menú
// de 200 productos exista, se lea entero y en orden, se pueda reordenar y que
// "Agotado" llegue a todos en <= 5 s (tests/integration/realtime/HU-05-agotado-
// propagacion.int.test.ts, con este mismo menú). Los criterios de HU-02 se miden
// cuando existan sus pantallas (HU-02, Etapa 3 con Toxiproxy). Aquí no hay
// umbrales de tiempo propios: no son criterio de esta historia.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { clavesDeImporte, crearEquipo, crearMenu200, productosDe, type Equipo, type Menu200 } from '../../support/menu.ts';

let ctx: Ctx;
let eq: Equipo;
let menu: Menu200;
beforeEach(async () => {
  ctx = await montarApp({ bdAislada: true });
  eq = await crearEquipo(ctx);
  menu = await crearMenu200(eq.m);
}, 120_000);
afterEach(async () => {
  await ctx?.cerrar();
});

describe('menu-200 (20 categorías x 10 productos)', () => {
  test('[HU-05/CA-N03][HU-05/CA-F01][HU-05/CA-F02] GET /menu devuelve las 20 categorías y los 200 productos, en orden y con su precio exacto, a camarero y a encargado', async () => {
    for (const [quien, c] of [['camarero', eq.w], ['encargado', eq.m]] as const) {
      const leido = await c.categorias();
      expect(leido, quien).toHaveLength(20);
      expect(productosDe(leido), quien).toHaveLength(200);
      leido.forEach((cat, i) => {
        const esperada = menu.categorias[i]!;
        expect(cat.id, `${quien} categoría ${i}`).toBe(esperada.id);
        expect(cat.name).toBe(esperada.nombre);
        expect(cat.products.map((p) => [p.id, p.name, p.priceCents, p.available])).toEqual(esperada.productos.map((p) => [p.id, p.nombre, p.centimos, true]));
      });
    }
  });

  test('[HU-05/CA-N03][HU-05/CA-F02] hay categorías de 30 caracteres y productos de 40 caracteres (los límites) y se leen enteros', async () => {
    const leido = await eq.w.categorias();
    expect(Math.max(...leido.map((c) => c.name.length))).toBe(30);
    expect(Math.max(...productosDe(leido).map((p) => p.name.length))).toBe(40);
  });

  test('[HU-05/CA-N03][RS-19] barra recibe el menú de 200 productos sin ninguna clave de importe', async () => {
    const r = await eq.k.menu();
    expect(r.status).toBe(200);
    expect(clavesDeImporte(r.body)).toEqual([]);
    expect(productosDe(await eq.k.categorias())).toHaveLength(200);
  });

  test('[HU-05/CA-N03][HU-05/CA-F04] marcar Agotado un producto de cada categoría (20 cambios) se refleja en la lectura y no toca al resto', async () => {
    const elegidos = menu.categorias.map((c) => c.productos[4]!.id);
    for (const id of elegidos) expect((await eq.w.disponibilidad(id, { available: false })).status).toBe(200);
    const agotados = productosDe(await eq.k.categorias()).filter((p) => !p.available).map((p) => p.id);
    expect(agotados.sort()).toEqual([...elegidos].sort());
  });

  test('[HU-05/CA-N03][HU-05/CA-F09] reordenar las 20 categorías y los 10 productos de cada una (de una vez) se refleja entero', async () => {
    const categories = menu.categorias.map((c) => c.id).reverse();
    const products = Object.fromEntries(menu.categorias.map((c) => [c.id, c.productos.map((p) => p.id).reverse()]));
    const r = await eq.m.ordenar({ categories, products });
    expect([200, 204], r.raw).toContain(r.status);
    const leido = await eq.w.categorias();
    expect(leido.map((c) => c.id)).toEqual(categories);
    for (const cat of leido) expect(cat.products.map((p) => p.id)).toEqual(products[cat.id]);
  });
});
