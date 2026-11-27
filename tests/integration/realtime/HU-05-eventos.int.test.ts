// HU-05/CA-F04 y CA-F09 por el flujo SSE (docs/arquitectura.md §6): cada cambio
// del menú se publica TRAS el COMMIT a todos los dispositivos conectados, con
// `emittedAt`, y barra nunca recibe una clave de importe (RS-19).
//   product.updated  disponibilidad / precio / activo        W, K (sin precio), M
//   menu.changed     estructura u orden → recarga GET /menu   W, K, M
// Forma propuesta (tests/README.md §7.2):
//   product.updated  { productId, available, active, priceCents?, emittedAt }
//   menu.changed     { emittedAt }
// El tiempo de propagación (<= 5 s p95) se mide en HU-05-agotado-propagacion.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { clavesDeImporte, crearEquipo, buscarProducto, type Equipo } from '../../support/menu.ts';
import { abrirSse, type ClienteSse, type EventoSse } from '../../support/sse.ts';
import { nombreUnico } from '../../support/fixtures.ts';

let ctx: Ctx;
let eq: Equipo;
let sse: { w: ClienteSse; k: ClienteSse; m: ClienteSse };
beforeEach(async () => {
  ctx = await montarApp();
  const base = await ctx.escuchar();
  eq = await crearEquipo(ctx);
  sse = { w: await abrirSse(base, eq.cookies.w), k: await abrirSse(base, eq.cookies.k), m: await abrirSse(base, eq.cookies.m) };
  for (const s of Object.values(sse)) {
    expect(s.status).toBe(200);
    await s.esperar('hello', 2000);
  }
});
afterEach(async () => {
  for (const s of Object.values(sse ?? {})) s.cerrar();
  await ctx?.cerrar();
});

const NOMBRES = ['product.updated', 'menu.changed'];

/** Primer evento de `nombre` (que cumpla `pred`) recibido a partir de `desde`. */
async function evento(s: ClienteSse, nombre: string, desde: number, pred: (d: Record<string, unknown>) => boolean = () => true, ms = 3000): Promise<EventoSse> {
  const t0 = Date.now();
  for (;;) {
    const e = s.eventos.slice(desde).find((x) => x.event === nombre && pred(x.data as Record<string, unknown>));
    if (e) return e;
    if (Date.now() - t0 > ms) throw new Error(`no llegó «${nombre}» en ${ms} ms; llegaron: ${s.eventos.slice(desde).map((x) => x.event).join(', ')}`);
    await new Promise((ok) => setTimeout(ok, 20));
  }
}

/** Número de eventos ya recibidos por cada flujo, tras dejar que se asienten los de la preparación de datos. */
async function marcas(): Promise<{ w: number; k: number; m: number }> {
  await new Promise((ok) => setTimeout(ok, 250));
  return { w: sse.w.eventos.length, k: sse.k.eventos.length, m: sse.m.eventos.length };
}

const idDe = (d: Record<string, unknown>) => (d.productId ?? d.id) as string;

describe('product.updated: disponibilidad, precio y activo', () => {
  test('[HU-05/CA-F04] el camarero marca Agotado → camarero, barra y encargado reciben product.updated con el producto y available:false, tras el COMMIT', async () => {
    const id = await eq.m.producto(await eq.m.categoria(nombreUnico('Cafés')), 'Moca', 250);
    const desde = await marcas();
    expect((await eq.w.disponibilidad(id, { available: false })).status).toBe(200);

    for (const [quien, s, d] of [['camarero', sse.w, desde.w], ['barra', sse.k, desde.k], ['encargado', sse.m, desde.m]] as const) {
      const e = await evento(s, 'product.updated', d, (x) => idDe(x) === id);
      expect(e.data, quien).toMatchObject({ available: false });
      expect(Number.isNaN(Date.parse(String((e.data as { emittedAt?: string }).emittedAt))), `${quien}: emittedAt es una fecha ISO`).toBe(false);
    }
    // Publicado tras el COMMIT: al llegar el evento, la lectura ya lo refleja.
    expect(buscarProducto(await eq.k.categorias(), id)).toMatchObject({ available: false });
  });

  test('[HU-05/CA-F04] marcar Disponible otra vez lo publica igual (available:true)', async () => {
    const id = await eq.m.producto(await eq.m.categoria(nombreUnico('Cafés')), 'Moca', 250);
    await eq.m.disponibilidad(id, { available: false });
    const desde = await marcas();
    await eq.m.disponibilidad(id, { available: true });
    for (const [s, d] of [[sse.w, desde.w], [sse.k, desde.k], [sse.m, desde.m]] as const) {
      expect((await evento(s, 'product.updated', d, (x) => idDe(x) === id && x.available === true)).data).toMatchObject({ available: true });
    }
  });

  test('[HU-05/CA-F03][RS-19] un cambio de precio llega a camarero y encargado con priceCents y a barra SIN ninguna clave de importe', async () => {
    const id = await eq.m.producto(await eq.m.categoria(nombreUnico('Cafés')), 'Capuchino', 220);
    const desde = await marcas();
    await eq.m.editarProducto(id, { priceCents: 260 });

    for (const [s, d] of [[sse.w, desde.w], [sse.m, desde.m]] as const) {
      expect((await evento(s, 'product.updated', d, (x) => idDe(x) === id)).data).toMatchObject({ priceCents: 260 });
    }
    const deBarra = await evento(sse.k, 'product.updated', desde.k, (x) => idDe(x) === id);
    expect(clavesDeImporte(deBarra.data), 'claves de importe en el evento de barra').toEqual([]);
    expect(JSON.stringify(deBarra.data)).not.toMatch(/cents|price/i);
  });

  test('[HU-05/CA-F05] desactivar un producto lo publica con active:false a los tres roles', async () => {
    const id = await eq.m.producto(await eq.m.categoria(nombreUnico('Cafés')), 'Descafeinado', 140);
    const desde = await marcas();
    await eq.m.desactivar(id);
    for (const [s, d] of [[sse.w, desde.w], [sse.k, desde.k], [sse.m, desde.m]] as const) {
      expect((await evento(s, 'product.updated', d, (x) => idDe(x) === id)).data).toMatchObject({ active: false });
    }
  });

  test('[HU-05/CA-F04][RS-19] ningún evento que recibe barra durante todo el test lleva claves de importe (recorrido recursivo)', async () => {
    const cat = await eq.m.categoria(nombreUnico('Cafés'));
    const id = await eq.m.producto(cat, 'Moca', 250);
    await eq.m.editarProducto(id, { priceCents: 300 });
    await eq.w.disponibilidad(id, { available: false });
    await eq.m.desactivar(id);
    await eq.m.ordenar({ categories: (await eq.m.categorias()).map((c) => c.id).reverse(), products: {} });
    await new Promise((ok) => setTimeout(ok, 300));
    expect(sse.k.eventos.length).toBeGreaterThan(1);
    for (const e of sse.k.eventos) expect(clavesDeImporte(e.data), `evento ${e.event}`).toEqual([]);
  });
});

describe('menu.changed: estructura y orden', () => {
  test.each([
    ['crear una categoría', async () => undefined, async () => eq.m.crearCategoria({ name: nombreUnico('Nueva') })],
    [
      'crear un producto',
      async () => eq.m.categoria(nombreUnico('Cat')),
      async (cat: unknown) => eq.m.crearProducto({ categoryId: cat as string, name: nombreUnico('Prod'), priceCents: 100 }),
    ],
    ['archivar una categoría', async () => eq.m.categoria(nombreUnico('Borrable')), async (cat: unknown) => eq.m.borrarCategoria(cat as string)],
    [
      'reordenar',
      async () => {
        await eq.m.categoria(nombreUnico('A'));
        await eq.m.categoria(nombreUnico('B'));
        return (await eq.m.categorias()).map((c) => c.id).reverse();
      },
      async (ids: unknown) => eq.m.ordenar({ categories: ids as string[], products: {} }),
    ],
  ])('[HU-05/CA-F01][HU-05/CA-F09] %s → menu.changed a camarero, barra y encargado (la toma recarga GET /menu)', async (_d, preparar, accion) => {
    const datos = await preparar();
    const desde = await marcas();
    const r = (await accion(datos)) as { status: number; raw: string };
    expect(r.status, r.raw).toBeLessThan(300);
    for (const [quien, s, d] of [['camarero', sse.w, desde.w], ['barra', sse.k, desde.k], ['encargado', sse.m, desde.m]] as const) {
      const e = await evento(s, 'menu.changed', d);
      expect(Number.isNaN(Date.parse(String((e.data as { emittedAt?: string }).emittedAt))), `${quien}: emittedAt`).toBe(false);
    }
  });

  test('[HU-05/CA-F01][HU-05/CA-F09] al llegar menu.changed, GET /menu ya devuelve el cambio (publicado tras el COMMIT)', async () => {
    const nombre = nombreUnico('Nueva');
    const desde = await marcas();
    const r = await eq.m.crearCategoria({ name: nombre });
    expect(r.status, r.raw).toBe(201);
    await evento(sse.w, 'menu.changed', desde.w);
    expect((await eq.w.categorias()).map((c) => c.name)).toContain(nombre);
  });

  test('[HU-05/CA-F02] renombrar o mover un producto se publica a todos (product.updated o menu.changed)', async () => {
    const cat = await eq.m.categoria(nombreUnico('Cat'));
    const id = await eq.m.producto(cat, nombreUnico('Viejo'), 100);
    const desde = await marcas();
    await eq.m.editarProducto(id, { name: nombreUnico('Nuevo') });
    for (const [s, d] of [[sse.w, desde.w], [sse.k, desde.k], [sse.m, desde.m]] as const) {
      const t0 = Date.now();
      for (;;) {
        const e = s.eventos.slice(d).find((x) => NOMBRES.includes(x.event));
        if (e) break;
        if (Date.now() - t0 > 3000) throw new Error('no llegó ningún evento de menú');
        await new Promise((ok) => setTimeout(ok, 20));
      }
    }
  });
});

describe('Lo que no se guarda no se publica', () => {
  test('[HU-05/CA-N01][HU-05/CA-F06][HU-05/CA-F07][HU-05/CA-F08] escrituras rechazadas (403, 400, 409) no emiten ningún evento de menú', async () => {
    const cat = await eq.m.categoria(nombreUnico('Cat'));
    const id = await eq.m.producto(cat, 'Solo', 130);
    const desde = await marcas();

    expect((await eq.w.crearCategoria({ name: nombreUnico('X') })).status).toBe(403);
    expect((await eq.k.disponibilidad(id, { available: false })).status).toBe(403);
    expect((await eq.m.crearCategoria({ name: '' })).status).toBe(400);
    expect((await eq.m.editarProducto(id, { priceCents: 0 })).status).toBe(400);
    expect((await eq.m.crearProducto({ categoryId: cat, name: 'solo', priceCents: 100 })).status).toBe(409);
    expect((await eq.m.borrarCategoria(cat)).status).toBe(409);
    expect((await eq.m.ordenar({ categories: [], products: {} })).status).toBeGreaterThanOrEqual(400);
    await new Promise((ok) => setTimeout(ok, 700));

    for (const [quien, s, d] of [['camarero', sse.w, desde.w], ['barra', sse.k, desde.k], ['encargado', sse.m, desde.m]] as const) {
      const recibidos = s.eventos.slice(d).filter((e) => NOMBRES.includes(e.event)).map((e) => e.event);
      expect(recibidos, `${quien} no debe recibir eventos de menú`).toEqual([]);
    }
  });
});
