// HU-05/CA-F01 (crear categoría: 1 a 30 caracteres, única; aparece en el menú que
// usa la toma de pedidos) y CA-F08 (no se borra una categoría con productos
// activos y se dice cuántos). Rutas de docs/arquitectura.md §5.1:
// POST /categories, PATCH /categories/:id, DELETE /categories/:id (archiva) y
// GET /menu. Formas y códigos concretos: tests/README.md §7 (propuestos por
// Testing; el punto único de adaptación es tests/support/menu.ts).
// "Aparece en la pantalla de toma de pedidos": la toma (HU-02) lee GET /menu; la
// pantalla se prueba en e2e/HU-05-gestionar-menu.e2e.ts y, cuando exista, en HU-02.
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { codigo, incidencias, pedir } from '../../support/http.ts';
import { filaCategoria, filaProducto, COD, contarFilas, crearEquipo, nombresDe, type Equipo } from '../../support/menu.ts';
import { nombreUnico } from '../../support/fixtures.ts';

let ctx: Ctx;
let eq: Equipo;
beforeEach(async () => {
  ctx = await montarApp();
  eq = await crearEquipo(ctx);
});
afterEach(async () => {
  await ctx?.cerrar();
});

/** Posición (0, 1, …) de cada nombre en el menú de un rol, solo de los dados. */
async function orden(c: { categorias(): Promise<{ name: string }[]> }, nombres: string[]): Promise<string[]> {
  return (await c.categorias()).map((x) => x.name).filter((n) => nombres.includes(n));
}

describe('CA-F01: crear una categoría', () => {
  test('[HU-05/CA-F01] el encargado crea una categoría → 201 con id y nombre, y la ven camarero, barra y encargado en GET /menu', async () => {
    const nombre = nombreUnico('Cafés');
    const r = await eq.m.crearCategoria({ name: nombre });
    expect(r.status, r.raw).toBe(201);
    const cuerpo = r.body.category ?? r.body;
    expect(cuerpo).toMatchObject({ name: nombre });
    expect(typeof cuerpo.id).toBe('string');

    for (const [quien, c] of [['encargado', eq.m], ['camarero', eq.w], ['barra', eq.k]] as const) {
      const cat = (await c.categorias()).find((x) => x.id === cuerpo.id);
      expect(cat, `${quien} ve la categoría`).toMatchObject({ name: nombre, products: [] });
    }
  });

  test('[HU-05/CA-F01][HU-05/CA-F09] una categoría nueva va al final del menú, detrás de las que ya había', async () => {
    const a = nombreUnico('A');
    const b = nombreUnico('B');
    await eq.m.categoria(a);
    await eq.m.categoria(b);
    const todas = nombresDe(await eq.m.categorias());
    expect(todas.indexOf(b)).toBe(todas.length - 1);
    expect(todas.indexOf(a)).toBe(todas.length - 2);
  });

  test('[HU-05/CA-F01] nombres de 1 y de 30 caracteres se aceptan y se guardan tal cual (BD sin otras categorías)', async () => {
    const limpia = await montarApp({ bdAislada: true });
    try {
      const m = (await crearEquipo(limpia)).m;
      const treinta = randomUUID().replace(/-/g, '').slice(0, 30);
      expect(treinta).toHaveLength(30);
      for (const nombre of ['x', treinta]) {
        const r = await m.crearCategoria({ name: nombre });
        expect(r.status, `${nombre}: ${r.raw}`).toBe(201);
      }
      expect(nombresDe(await m.categorias())).toEqual(['x', treinta]);
    } finally {
      await limpia.cerrar();
    }
  });

  test.each([
    ['vacío', '', 'min_length'],
    ['solo espacios', '    ', 'min_length'],
    ['31 caracteres', 'C'.repeat(31), 'max_length'],
    ['100 caracteres', 'C'.repeat(100), 'max_length'],
  ])('[HU-05/CA-F01][HU-05/CA-F06] nombre %s → 400 VALIDATION_FAILED con campo y regla, sin crear nada', async (_d, nombre, regla) => {
    const antes = await contarFilas(ctx, 'categories');
    const r = await eq.m.crearCategoria({ name: nombre });
    expect([r.status, codigo(r)]).toEqual([400, 'VALIDATION_FAILED']);
    expect(incidencias(r)).toEqual([{ path: ['name'], rule: regla }]);
    expect(await contarFilas(ctx, 'categories')).toBe(antes);
  });

  test('[HU-05/CA-F01][HU-05/CA-F06] sin nombre → required; nombre que no es texto → type; campos que no existen → not_allowed (RS-20)', async () => {
    expect(incidencias(await eq.m.crearCategoria({}))).toEqual([{ path: ['name'], rule: 'required' }]);
    expect(incidencias(await eq.m.crearCategoria({ name: 5 }))).toEqual([{ path: ['name'], rule: 'type' }]);
    const extra = await eq.m.crearCategoria({ name: nombreUnico('E'), foo: 1, position: 0, archivedAt: null });
    expect(extra.status).toBe(400);
    expect(incidencias(extra).map((i) => `${i.path.join('.')}:${i.rule}`).sort()).toEqual(['archivedAt:not_allowed', 'foo:not_allowed', 'position:not_allowed']);
  });

  test('[HU-05/CA-F01] el nombre es único sin distinguir mayúsculas ni formas Unicode ni espacios sobrantes → 409 y no se crea otra', async () => {
    const base = `Cafés ${nombreUnico('')}`;
    const id = await eq.m.categoria(base);
    const antes = await contarFilas(ctx, 'categories');
    for (const repetido of [base, base.toUpperCase(), base.toLowerCase(), `  ${base}  `, base.replace(' ', '   '), base.normalize('NFD')]) {
      const r = await eq.m.crearCategoria({ name: repetido });
      expect([r.status, codigo(r)], JSON.stringify(repetido)).toEqual([409, COD.categoriaDuplicada]);
    }
    expect(await contarFilas(ctx, 'categories')).toBe(antes);
    // Un nombre distinto (otra tilde) sí es otra categoría.
    expect((await eq.m.crearCategoria({ name: base.replace('é', 'e') })).status).toBe(201);
    expect(await filaCategoria(ctx, id)).toMatchObject({ name: base });
  });

  test('[HU-05/CA-F01] una categoría archivada libera su nombre para otra nueva', async () => {
    const nombre = nombreUnico('Temp');
    const id = await eq.m.categoria(nombre);
    expect([200, 204]).toContain((await eq.m.borrarCategoria(id)).status);
    const otra = await eq.m.crearCategoria({ name: nombre });
    expect(otra.status, otra.raw).toBe(201);
  });

  test('[HU-05/CA-F01][RS-35] un nombre con comillas y SQL se guarda y se devuelve literal; las tablas siguen ahí', async () => {
    const nombre = "Robert'); DROP TABLE categories;--";
    const r = await eq.m.crearCategoria({ name: nombre });
    expect(r.status, r.raw).toBe(201);
    expect(nombresDe(await eq.m.categorias())).toContain(nombre);
    expect(await contarFilas(ctx, 'categories')).toBeGreaterThan(0);
  });

  test('[HU-05/CA-F01] renombrar: PATCH /categories/:id cambia el nombre; las reglas son las mismas que al crear', async () => {
    const id = await eq.m.categoria(nombreUnico('Viejo'));
    const otra = nombreUnico('Otra');
    await eq.m.categoria(otra);

    const nuevo = nombreUnico('Nuevo');
    const ok = await eq.m.renombrarCategoria(id, { name: nuevo });
    expect(ok.status, ok.raw).toBe(200);
    expect(await filaCategoria(ctx, id)).toMatchObject({ name: nuevo });
    expect((await eq.k.categorias()).find((c) => c.id === id)?.name).toBe(nuevo);

    // Cambiar solo las mayúsculas de su propio nombre no es un duplicado.
    expect((await eq.m.renombrarCategoria(id, { name: nuevo.toUpperCase() })).status).toBe(200);
    // El de otra categoría sí.
    const dup = await eq.m.renombrarCategoria(id, { name: otra.toLowerCase() });
    expect([dup.status, codigo(dup)]).toEqual([409, COD.categoriaDuplicada]);
    // Validación.
    expect(incidencias(await eq.m.renombrarCategoria(id, { name: '' }))).toEqual([{ path: ['name'], rule: 'min_length' }]);
    expect(incidencias(await eq.m.renombrarCategoria(id, { name: 'C'.repeat(31) }))).toEqual([{ path: ['name'], rule: 'max_length' }]);
    expect(incidencias(await eq.m.renombrarCategoria(id, { name: nuevo, foo: 1 }))).toEqual([{ path: ['foo'], rule: 'not_allowed' }]);
    // No existe.
    expect((await eq.m.renombrarCategoria(randomUUID(), { name: nombreUnico('Z') })).status).toBe(404);
  });
});

describe('CA-F08: borrar una categoría (se archiva) solo si no tiene productos activos', () => {
  test('[HU-05/CA-F08] con productos activos → 409 CATEGORY_HAS_ACTIVE_PRODUCTS con details.count y no se borra nada', async () => {
    const cat = await eq.m.categoria(nombreUnico('Cafés'));
    const productos: string[] = [];
    for (let i = 0; i < 7; i++) productos.push(await eq.m.producto(cat, `Café ${i}`, 130 + i));

    const r = await eq.m.borrarCategoria(cat);
    expect([r.status, codigo(r)], r.raw).toEqual([409, COD.categoriaConProductos]);
    expect(r.body.error.details).toEqual({ count: 7 });

    expect(await filaCategoria(ctx, cat)).toMatchObject({ archived_at: null });
    expect((await eq.m.categorias()).find((c) => c.id === cat)?.products).toHaveLength(7);
    for (const p of productos) expect(await filaProducto(ctx, p)).toMatchObject({ active: true });
  });

  test('[HU-05/CA-F08] un producto agotado sigue contando como activo; uno desactivado no', async () => {
    const cat = await eq.m.categoria(nombreUnico('Zumos'));
    const a = await eq.m.producto(cat, 'Naranja');
    const b = await eq.m.producto(cat, 'Piña');
    const c = await eq.m.producto(cat, 'Manzana');
    expect((await eq.m.disponibilidad(b, { available: false })).status).toBe(200);
    await eq.m.desactivar(c);

    const r = await eq.m.borrarCategoria(cat);
    expect([r.status, codigo(r)]).toEqual([409, COD.categoriaConProductos]);
    expect(r.body.error.details).toEqual({ count: 2 });

    await eq.m.desactivar(a);
    const uno = await eq.m.borrarCategoria(cat);
    expect(uno.body.error.details).toEqual({ count: 1 });
  });

  test('[HU-05/CA-F08][HU-05/CA-F05] sin productos activos se archiva: sale del menú, la fila y sus productos desactivados se conservan', async () => {
    const nombre = nombreUnico('Postres');
    const cat = await eq.m.categoria(nombre);
    const p = await eq.m.producto(cat, 'Flan', 220);
    await eq.m.desactivar(p);

    const r = await eq.m.borrarCategoria(cat);
    expect([200, 204], r.raw).toContain(r.status);

    for (const c of [eq.m, eq.w, eq.k]) expect((await c.categorias()).map((x) => x.id)).not.toContain(cat);
    expect(await filaCategoria(ctx, cat), 'la fila se conserva (archivar, no borrar)').toMatchObject({ name: nombre });
    expect((await filaCategoria(ctx, cat))?.archived_at).toBeInstanceOf(Date);
    expect(await filaProducto(ctx, p), 'el producto desactivado se conserva para el histórico').toMatchObject({ name: 'Flan', price_cents: 220, active: false });
    // Evento de log del catálogo de docs/logging.md §3.3.
    expect(JSON.stringify(ctx.logs.eventos('category.archived'))).toContain(cat);
    // Ya no existe para el encargado: segunda vez → 404, y no se puede renombrar.
    expect((await eq.m.borrarCategoria(cat)).status).toBe(404);
    expect((await eq.m.renombrarCategoria(cat, { name: nombreUnico('X') })).status).toBe(404);
  });

  test('[HU-05/CA-F08] una categoría vacía se archiva sin más', async () => {
    const cat = await eq.m.categoria(nombreUnico('Vacía'));
    expect([200, 204]).toContain((await eq.m.borrarCategoria(cat)).status);
    expect((await filaCategoria(ctx, cat))?.archived_at).toBeInstanceOf(Date);
  });

  test('[HU-05/CA-F08] categoría que no existe → 404; id que no es un UUID → 400 o 404, nunca 500', async () => {
    expect((await eq.m.borrarCategoria(randomUUID())).status).toBe(404);
    const r = await eq.m.borrarCategoria('no-es-un-uuid');
    expect([400, 404]).toContain(r.status);
    expect(ctx.logs.eventos('http.request.unhandled_error')).toEqual([]);
  });

  test('[HU-05/CA-F08] la respuesta de rechazo no depende de quién pregunta más que por el rol: el camarero recibe 403, no el recuento', async () => {
    const cat = await eq.m.categoria(nombreUnico('Cafés'));
    await eq.m.producto(cat, 'Solo');
    const r = await eq.w.borrarCategoria(cat);
    expect([r.status, codigo(r)]).toEqual([403, 'FORBIDDEN']);
    expect(r.body.error.details).toBeUndefined();
  });
});

describe('Orden de lectura de las categorías', () => {
  test('[HU-05/CA-F01][HU-05/CA-F09] GET /menu devuelve las categorías en el orden de creación mientras nadie las reordene', async () => {
    const nombres = [nombreUnico('Uno'), nombreUnico('Dos'), nombreUnico('Tres')];
    for (const n of nombres) await eq.m.categoria(n);
    expect(await orden(eq.m, nombres)).toEqual(nombres);
    expect(await orden(eq.w, nombres)).toEqual(nombres);
    expect(await orden(eq.k, nombres)).toEqual(nombres);
  });

  test('[HU-05/CA-F01] sin sesión no hay menú: 401', async () => {
    const r = await pedir(ctx, { ruta: '/menu' });
    expect([r.status, codigo(r)]).toEqual([401, 'UNAUTHENTICATED']);
  });
});
