// HU-05/CA-F09: cuando el encargado cambia el orden de categorías o productos,
// el nuevo orden se refleja en la toma de pedidos (GET /menu). PUT /menu/order
// { categories: [id…], products: { categoryId: [id…] } } (docs/arquitectura.md
// §5.1). Contrato propuesto (tests/README.md §7.1):
//   - `categories`: TODAS las categorías no archivadas, en el orden nuevo;
//   - `products`: mapa (puede ser {}) de categoría → TODOS los productos no
//     archivados de esa categoría (activos o no), en el orden nuevo; las
//     categorías que no aparecen conservan su orden;
//   - ids repetidos, desconocidos, de otra categoría o que faltan → 400 o 422
//     (el SE fija el código) y no cambia nada; éxito → 200 o 204.
// Sin arrastrar: el orden se cambia con Subir/Bajar en la interfaz (CA-N04) y
// eso es solo un envío de este mismo PUT.
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { incidencias } from '../../support/http.ts';
import { crearEquipo, productosDe, type CategoriaMenu, type Equipo } from '../../support/menu.ts';
import { nombreUnico } from '../../support/fixtures.ts';

let ctx: Ctx;
let eq: Equipo;
beforeEach(async () => {
  ctx = await montarApp({ bdAislada: true });
  eq = await crearEquipo(ctx);
});
afterEach(async () => {
  await ctx?.cerrar();
});

const ok = (s: number) => s === 200 || s === 204;

async function crearMenu(): Promise<{ cats: string[]; prods: Record<string, string[]> }> {
  const cats: string[] = [];
  const prods: Record<string, string[]> = {};
  for (const n of ['Cafés', 'Infusiones', 'Zumos', 'Bollería']) {
    const c = await eq.m.categoria(n);
    cats.push(c);
    prods[c] = [];
    for (const p of ['Uno', 'Dos', 'Tres', 'Cuatro']) prods[c]!.push(await eq.m.producto(c, `${n} ${p}`, 100));
  }
  return { cats, prods };
}

const idsCat = (m: CategoriaMenu[]) => m.map((c) => c.id);
const idsProd = (m: CategoriaMenu[], cat: string) => m.find((c) => c.id === cat)!.products.map((p) => p.id);

describe('CA-F09: reordenar', () => {
  test('[HU-05/CA-F09] reordenar las categorías se refleja para camarero, barra y encargado; los productos no cambian', async () => {
    const { cats, prods } = await crearMenu();
    const nuevo = [cats[2]!, cats[0]!, cats[3]!, cats[1]!];
    const r = await eq.m.ordenar({ categories: nuevo, products: {} });
    expect(ok(r.status), r.raw).toBe(true);
    for (const [quien, c] of [['camarero', eq.w], ['barra', eq.k], ['encargado', eq.m]] as const) {
      const menu = await c.categorias();
      expect(idsCat(menu), quien).toEqual(nuevo);
      for (const cat of cats) expect(idsProd(menu, cat), `${quien}: productos de ${cat}`).toEqual(prods[cat]);
    }
  });

  test('[HU-05/CA-F09] reordenar los productos de una categoría se refleja; las demás categorías no cambian', async () => {
    const { cats, prods } = await crearMenu();
    const [c0, c1] = [cats[0]!, cats[1]!];
    const p = prods[c0]!;
    const nuevo = [p[2]!, p[0]!, p[3]!, p[1]!];
    const r = await eq.m.ordenar({ categories: cats, products: { [c0]: nuevo } });
    expect(ok(r.status), r.raw).toBe(true);
    for (const c of [eq.w, eq.k, eq.m]) {
      const menu = await c.categorias();
      expect(idsProd(menu, c0)).toEqual(nuevo);
      expect(idsProd(menu, c1)).toEqual(prods[c1]);
      expect(idsCat(menu)).toEqual(cats);
    }
  });

  test('[HU-05/CA-F09] se pueden mandar a la vez categorías y productos de varias categorías', async () => {
    const { cats, prods } = await crearMenu();
    const invertidas = [...cats].reverse();
    const r = await eq.m.ordenar({
      categories: invertidas,
      products: { [cats[0]!]: [...prods[cats[0]!]!].reverse(), [cats[3]!]: [...prods[cats[3]!]!].reverse() },
    });
    expect(ok(r.status), r.raw).toBe(true);
    const menu = await eq.w.categorias();
    expect(idsCat(menu)).toEqual(invertidas);
    expect(idsProd(menu, cats[0]!)).toEqual([...prods[cats[0]!]!].reverse());
    expect(idsProd(menu, cats[3]!)).toEqual([...prods[cats[3]!]!].reverse());
    expect(idsProd(menu, cats[1]!)).toEqual(prods[cats[1]!]);
  });

  test('[HU-05/CA-F09] el orden persiste: posiciones distintas y consecutivas en BD, y un producto desactivado conserva su sitio', async () => {
    const { cats, prods } = await crearMenu();
    const c0 = cats[0]!;
    const p = prods[c0]!;
    await eq.m.desactivar(p[1]!);
    // El encargado ve la lista completa (activos e inactivos) y la reordena entera.
    const completo = idsProd(await eq.m.categorias({ incluirInactivos: true }), c0);
    expect(completo).toEqual(p);
    const nuevo = [p[3]!, p[1]!, p[0]!, p[2]!];
    expect(ok((await eq.m.ordenar({ categories: cats, products: { [c0]: nuevo } })).status)).toBe(true);

    expect(idsProd(await eq.m.categorias({ incluirInactivos: true }), c0)).toEqual(nuevo);
    // Para la toma de pedidos, el mismo orden sin el desactivado.
    expect(idsProd(await eq.w.categorias(), c0)).toEqual(nuevo.filter((id) => id !== p[1]));
    const pos = await ctx.bd.query<{ position: number }>(`SELECT position FROM products WHERE category_id = $1 ORDER BY position`, [c0]);
    const posiciones = pos.rows.map((f) => f.position);
    expect(new Set(posiciones).size, 'posiciones sin repetir').toBe(posiciones.length);
    const posCat = await ctx.bd.query<{ position: number }>(`SELECT position FROM categories WHERE archived_at IS NULL ORDER BY position`);
    expect(new Set(posCat.rows.map((f) => f.position)).size).toBe(posCat.rowCount);
  });

  test('[HU-05/CA-F09] después de reordenar, lo nuevo se añade al final (categoría y producto)', async () => {
    const { cats } = await crearMenu();
    expect(ok((await eq.m.ordenar({ categories: [...cats].reverse(), products: {} })).status)).toBe(true);
    const nueva = await eq.m.categoria(nombreUnico('Última'));
    const p = await eq.m.producto(cats[0]!, 'Añadido al final', 100);
    const menu = await eq.w.categorias();
    expect(idsCat(menu).at(-1)).toBe(nueva);
    expect(idsProd(menu, cats[0]!).at(-1)).toBe(p);
  });

  test('[HU-05/CA-F09] al archivar una categoría, las demás conservan su orden relativo y el PUT ya no la admite', async () => {
    const { cats } = await crearMenu();
    expect(ok((await eq.m.ordenar({ categories: [cats[3]!, cats[2]!, cats[1]!, cats[0]!], products: {} })).status)).toBe(true);
    // Se vacían y archivan las dos del medio de ese orden.
    for (const c of [cats[2]!, cats[1]!]) {
      for (const p of (await eq.m.categorias({ incluirInactivos: true })).find((x) => x.id === c)!.products) await eq.m.desactivar(p.id);
      expect([200, 204]).toContain((await eq.m.borrarCategoria(c)).status);
    }
    expect(idsCat(await eq.w.categorias())).toEqual([cats[3], cats[0]]);
    const incluyendoArchivada = await eq.m.ordenar({ categories: [cats[3]!, cats[2]!, cats[0]!], products: {} });
    expect([400, 422]).toContain(incluyendoArchivada.status);
    expect(ok((await eq.m.ordenar({ categories: [cats[0]!, cats[3]!], products: {} })).status)).toBe(true);
    expect(idsCat(await eq.w.categorias())).toEqual([cats[0], cats[3]]);
  });
});

describe('Peticiones de orden inválidas: no cambian nada', () => {
  async function instantanea(): Promise<string> {
    return JSON.stringify(await eq.m.categorias({ incluirInactivos: true }));
  }

  test('[HU-05/CA-F09] ids repetidos, desconocidos, que faltan o de otra categoría → 400 o 422, sin 500 y sin cambios', async () => {
    const { cats, prods } = await crearMenu();
    const antes = await instantanea();
    const [c0, c1] = [cats[0]!, cats[1]!];
    const casos: [string, unknown][] = [
      ['categoría repetida', { categories: [c0, c0, cats[2], cats[3]], products: {} }],
      ['categoría desconocida', { categories: [...cats, randomUUID()], products: {} }],
      ['falta una categoría', { categories: cats.slice(1), products: {} }],
      ['lista de categorías vacía', { categories: [], products: {} }],
      ['producto repetido', { categories: cats, products: { [c0]: [prods[c0]![0], prods[c0]![0], prods[c0]![2], prods[c0]![3]] } }],
      ['producto desconocido', { categories: cats, products: { [c0]: [...prods[c0]!, randomUUID()] } }],
      ['falta un producto', { categories: cats, products: { [c0]: prods[c0]!.slice(1) } }],
      ['producto de otra categoría', { categories: cats, products: { [c0]: [...prods[c0]!.slice(1), prods[c1]![0]] } }],
      ['categoría desconocida en products', { categories: cats, products: { [randomUUID()]: [] } }],
    ];
    for (const [descripcion, cuerpo] of casos) {
      const r = await eq.m.ordenar(cuerpo);
      expect([400, 422], `${descripcion}: ${r.raw.slice(0, 200)}`).toContain(r.status);
      expect(await instantanea(), `${descripcion}: no cambia el orden`).toBe(antes);
    }
    expect(ctx.logs.eventos('http.request.unhandled_error')).toEqual([]);
  });

  test('[HU-05/CA-F09][HU-05/CA-F06] forma del cuerpo: sin categories (required), tipos incorrectos (type), campos de más (not_allowed) e ids que no son UUID', async () => {
    const { cats } = await crearMenu();
    const antes = await instantanea();
    expect(incidencias(await eq.m.ordenar({ products: {} }))).toEqual([{ path: ['categories'], rule: 'required' }]);
    expect(incidencias(await eq.m.ordenar({ categories: 'x', products: {} }))).toEqual([{ path: ['categories'], rule: 'type' }]);
    expect(incidencias(await eq.m.ordenar({ categories: cats, products: [] }))).toEqual([{ path: ['products'], rule: 'type' }]);
    expect(incidencias(await eq.m.ordenar({ categories: cats, products: {}, foo: 1 }))).toEqual([{ path: ['foo'], rule: 'not_allowed' }]);
    const r = await eq.m.ordenar({ categories: [...cats.slice(1), 'no-es-uuid'], products: {} });
    expect([400, 422], r.raw).toContain(r.status);
    expect(await instantanea()).toBe(antes);
  });

  test('[HU-05/CA-F09] cinco reordenaciones simultáneas distintas → ninguna da 5xx y el resultado es exactamente una de ellas (nunca una mezcla)', async () => {
    const { cats } = await crearMenu();
    const permutaciones = [
      [cats[1], cats[0], cats[3], cats[2]],
      [cats[3], cats[2], cats[1], cats[0]],
      [cats[2], cats[3], cats[0], cats[1]],
      [cats[0], cats[2], cats[1], cats[3]],
      [cats[1], cats[3], cats[0], cats[2]],
    ] as string[][];
    const rs = await Promise.all(permutaciones.map((categories) => eq.m.ordenar({ categories, products: {} })));
    for (const r of rs) expect([200, 204, 409], r.raw).toContain(r.status);
    expect(rs.some((r) => ok(r.status))).toBe(true);
    const final = idsCat(await eq.m.categorias());
    expect(permutaciones.map((p) => p.join())).toContain(final.join());
    const pos = await ctx.bd.query<{ position: number }>(`SELECT position FROM categories WHERE archived_at IS NULL`);
    expect(new Set(pos.rows.map((f) => f.position)).size, 'posiciones sin repetir').toBe(pos.rowCount);
  });
});

describe('Lectura tras reordenar', () => {
  test('[HU-05/CA-F09] los productos de todo el menú siguen siendo los mismos (reordenar no pierde ni duplica)', async () => {
    const { cats, prods } = await crearMenu();
    const antes = productosDe(await eq.m.categorias()).map((p) => p.id).sort();
    await eq.m.ordenar({ categories: [...cats].reverse(), products: { [cats[0]!]: [...prods[cats[0]!]!].reverse() } });
    expect(productosDe(await eq.m.categorias()).map((p) => p.id).sort()).toEqual(antes);
  });
});
