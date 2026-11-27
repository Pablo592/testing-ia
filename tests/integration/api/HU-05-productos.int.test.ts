// HU-05/CA-F02 (crear producto: nombre 1–40, categoría, precio 0,01–999,99 con IVA
// incluido y máx. 2 decimales → priceCents entero 1–99999), CA-F03 (cambio de
// precio, parte de la API; la de los pedidos enviados necesita HU-02: ver más
// abajo), CA-F05 (desactivar), CA-F06 (datos inválidos: 400 con campo y regla),
// CA-F07 (nombre repetido en la categoría) y CA-N02 (auditoría del cambio de
// precio). Rutas: POST /products, PATCH /products/:id, GET /menu
// (docs/arquitectura.md §5.1). Formas y códigos: tests/README.md §7.
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { codigo, incidencias, type Resp } from '../../support/http.ts';
import { auditoriaDe, buscarProducto, clavesDeImporte, COD, contarFilas, crearEquipo, filaProducto, productosDe, type Equipo } from '../../support/menu.ts';
import { nombreUnico } from '../../support/fixtures.ts';

let ctx: Ctx;
let eq: Equipo;
let cat: string;
beforeEach(async () => {
  ctx = await montarApp();
  eq = await crearEquipo(ctx);
  cat = await eq.m.categoria(nombreUnico('Cafés'));
});
afterEach(async () => {
  await ctx?.cerrar();
});

const reglas = (r: Resp) => incidencias(r).map((i) => `${i.path.join('.')}:${i.rule}`);

describe('CA-F02: crear un producto', () => {
  test('[HU-05/CA-F02][HU-05/CA-U01] nombre, categoría y precio (el cuarto campo, "disponible", es opcional y por defecto disponible) → 201 y aparece en su categoría', async () => {
    const r = await eq.m.crearProducto({ categoryId: cat, name: 'Café con leche', priceCents: 160 });
    expect(r.status, r.raw).toBe(201);
    const p = r.body.product ?? r.body;
    expect(p).toMatchObject({ name: 'Café con leche', priceCents: 160, available: true });
    expect(typeof p.id).toBe('string');

    const menu = await eq.m.categorias();
    expect(menu.find((c) => c.id === cat)?.products).toEqual([expect.objectContaining({ id: p.id, name: 'Café con leche', priceCents: 160, available: true })]);
    // Lo ven los tres roles; barra sin el precio (RS-19).
    expect(buscarProducto(await eq.w.categorias(), p.id)).toMatchObject({ priceCents: 160, available: true });
    const deBarra = await eq.k.menu();
    expect(clavesDeImporte(deBarra.body), 'claves de importe en el menú de barra').toEqual([]);
    expect(productosDe((await eq.k.categorias())).find((x) => x.id === p.id)).toMatchObject({ name: 'Café con leche', available: true });
  });

  test('[HU-05/CA-F02][HU-05/CA-U01] con available:false nace agotado; con available:true, disponible', async () => {
    const a = await eq.m.producto(cat, 'Moca', 250, false);
    const b = await eq.m.producto(cat, 'Cortado', 140, true);
    expect(await filaProducto(ctx, a)).toMatchObject({ available: false, active: true });
    expect(await filaProducto(ctx, b)).toMatchObject({ available: true, active: true });
  });

  test('[HU-05/CA-F02] precio mínimo (0,01 €) y máximo (999,99 €) se aceptan y se guardan en céntimos', async () => {
    const barato = await eq.m.producto(cat, 'Sobre de azúcar', 1);
    const caro = await eq.m.producto(cat, 'Botella de reserva', 99_999);
    expect(await filaProducto(ctx, barato)).toMatchObject({ price_cents: 1 });
    expect(await filaProducto(ctx, caro)).toMatchObject({ price_cents: 99_999 });
  });

  test('[HU-05/CA-F02][HU-05/CA-F09] el producto nuevo va al final de su categoría', async () => {
    const ids: string[] = [];
    for (const n of ['A', 'B', 'C']) ids.push(await eq.m.producto(cat, n, 100));
    const delMenu = (await eq.m.categorias()).find((c) => c.id === cat)!.products.map((p) => p.id);
    expect(delMenu).toEqual(ids);
  });

  test('[HU-05/CA-F02] el mismo nombre en otra categoría es otro producto', async () => {
    const otra = await eq.m.categoria(nombreUnico('Infusiones'));
    const a = await eq.m.producto(cat, 'Manzanilla', 150);
    const b = await eq.m.crearProducto({ categoryId: otra, name: 'Manzanilla', priceCents: 150 });
    expect(b.status, b.raw).toBe(201);
    expect(a).not.toBe((b.body.product ?? b.body).id);
  });

  test('[HU-05/CA-F02] nombre de 40 caracteres se acepta; el guardado es el normalizado', async () => {
    const r = await eq.m.crearProducto({ categoryId: cat, name: 'N'.repeat(40), priceCents: 100 });
    expect(r.status, r.raw).toBe(201);
    const r2 = await eq.m.crearProducto({ categoryId: cat, name: '  Café   solo  ', priceCents: 100 });
    expect(r2.status, r2.raw).toBe(201);
    expect((r2.body.product ?? r2.body).name).toBe('Café solo');
  });

  test('[HU-05/CA-F02] categoría que no existe o archivada → 404 o 422 y no se crea nada', async () => {
    const antes = await contarFilas(ctx, 'products');
    const inexistente = await eq.m.crearProducto({ categoryId: randomUUID(), name: 'Huérfano', priceCents: 100 });
    expect([404, 422], inexistente.raw).toContain(inexistente.status);
    const archivada = await eq.m.categoria(nombreUnico('Vieja'));
    expect([200, 204]).toContain((await eq.m.borrarCategoria(archivada)).status);
    const enArchivada = await eq.m.crearProducto({ categoryId: archivada, name: 'Huérfano', priceCents: 100 });
    expect([404, 422], enArchivada.raw).toContain(enArchivada.status);
    expect(await contarFilas(ctx, 'products')).toBe(antes);
  });

  test('[HU-05/CA-F02][RS-35] un nombre con SQL se guarda literal', async () => {
    const nombre = "x'); DROP TABLE products;--";
    const r = await eq.m.crearProducto({ categoryId: cat, name: nombre, priceCents: 100 });
    expect(r.status, r.raw).toBe(201);
    expect(productosDe(await eq.m.categorias()).map((p) => p.name)).toContain(nombre);
  });
});

describe('CA-F06: datos inválidos → 400 que indica el campo y la regla; no se guarda', () => {
  const valido = () => ({ categoryId: cat, name: nombreUnico('Prod'), priceCents: 150 });

  test.each([
    ['precio 0', { priceCents: 0 }, [['priceCents', 'min']]],
    ['precio negativo', { priceCents: -1 }, [['priceCents', 'min']]],
    ['precio negativo grande', { priceCents: -99_999 }, [['priceCents', 'min']]],
    ['precio 1.000,00 € (100 000 céntimos)', { priceCents: 100_000 }, [['priceCents', 'max']]],
    ['precio enorme', { priceCents: 2_147_483_648 }, [['priceCents', 'max']]],
    ['precio con decimales de céntimo (1,5 céntimos)', { priceCents: 1.5 }, [['priceCents', 'type']]],
    ['precio con decimales (250,25 céntimos)', { priceCents: 250.25 }, [['priceCents', 'type']]],
    ['precio como texto', { priceCents: '250' }, [['priceCents', 'type']]],
    ['precio en euros con decimales como texto', { priceCents: '2,50' }, [['priceCents', 'type']]],
    ['precio null', { priceCents: null }, [['priceCents', 'type']]],
    ['precio booleano', { priceCents: true }, [['priceCents', 'type']]],
    ['sin precio', { priceCents: undefined }, [['priceCents', 'required']]],
    ['nombre vacío', { name: '' }, [['name', 'min_length']]],
    ['nombre de solo espacios', { name: '     ' }, [['name', 'min_length']]],
    ['nombre de 41 caracteres', { name: 'N'.repeat(41) }, [['name', 'max_length']]],
    ['sin nombre', { name: undefined }, [['name', 'required']]],
    ['nombre que no es texto', { name: 7 }, [['name', 'type']]],
    ['sin categoría', { categoryId: undefined }, [['categoryId', 'required']]],
    ['disponible que no es booleano', { available: 'si' }, [['available', 'type']]],
    ['nombre vacío y precio 0 a la vez: se indican los dos campos', { name: '', priceCents: 0 }, [['name', 'min_length'], ['priceCents', 'min']]],
  ] as [string, Record<string, unknown>, [string, string][]][])('[HU-05/CA-F06][HU-05/CA-U03] %s', async (_d, cambio, esperado) => {
    const antes = await contarFilas(ctx, 'products');
    const r = await eq.m.crearProducto({ ...valido(), ...cambio });
    expect([r.status, codigo(r)], r.raw).toEqual([400, 'VALIDATION_FAILED']);
    expect(reglas(r).sort()).toEqual(esperado.map(([c, regla]) => `${c}:${regla}`).sort());
    // El error no repite lo recibido (docs/arquitectura.md §5).
    for (const v of Object.values(cambio)) if (typeof v === 'string' && v.length > 3) expect(r.raw).not.toContain(v);
    expect(await contarFilas(ctx, 'products'), 'no se ha guardado nada').toBe(antes);
  });

  test('[HU-05/CA-F06] campos que no existen (RS-20) → 400 not_allowed y no se guarda: el cliente no impone id, active, position ni nada del servidor', async () => {
    const antes = await contarFilas(ctx, 'products');
    for (const extra of [{ foo: 1 }, { unitPriceCents: 1 }, { position: 0 }, { id: randomUUID() }, { archivedAt: null }]) {
      const r = await eq.m.crearProducto({ ...valido(), ...extra });
      expect(r.status, JSON.stringify(extra)).toBe(400);
      expect(reglas(r), JSON.stringify(extra)).toEqual([`${Object.keys(extra)[0]}:not_allowed`]);
    }
    expect(await contarFilas(ctx, 'products')).toBe(antes);
  });

  test('[HU-05/CA-F06] la edición aplica las mismas reglas y no cambia nada si falla', async () => {
    const id = await eq.m.producto(cat, nombreUnico('Edit'), 150);
    const antes = await filaProducto(ctx, id);
    for (const [cambio, esperado] of [
      [{ priceCents: 0 }, 'priceCents:min'],
      [{ priceCents: 100_000 }, 'priceCents:max'],
      [{ priceCents: 1.5 }, 'priceCents:type'],
      [{ name: '' }, 'name:min_length'],
      [{ name: 'N'.repeat(41) }, 'name:max_length'],
      [{ active: 'no' }, 'active:type'],
      [{ foo: 1 }, 'foo:not_allowed'],
    ] as [Record<string, unknown>, string][]) {
      const r = await eq.m.editarProducto(id, cambio);
      expect([r.status, codigo(r)], JSON.stringify(cambio)).toEqual([400, 'VALIDATION_FAILED']);
      expect(reglas(r), JSON.stringify(cambio)).toEqual([esperado]);
    }
    expect(await filaProducto(ctx, id)).toEqual(antes);
    expect(await auditoriaDe(ctx, id, 'price.changed')).toEqual([]);
  });
});

describe('CA-F07: nombre ya existente en la misma categoría', () => {
  test('[HU-05/CA-F07] al crear → 409 PRODUCT_NAME_TAKEN (también con otras mayúsculas, formas Unicode y espacios) y no se crea otro', async () => {
    await eq.m.producto(cat, 'Café solo', 130);
    const antes = await contarFilas(ctx, 'products');
    for (const repetido of ['Café solo', 'CAFÉ SOLO', 'café solo', '  Café   solo ', 'Cafe\u0301 solo']) {
      const r = await eq.m.crearProducto({ categoryId: cat, name: repetido, priceCents: 200 });
      expect([r.status, codigo(r)], JSON.stringify(repetido)).toEqual([409, COD.productoDuplicado]);
    }
    expect(await contarFilas(ctx, 'products')).toBe(antes);
  });

  test('[HU-05/CA-F07] al renombrar a un nombre que ya tiene otro producto de la categoría → 409; el propio nombre (o solo cambiar mayúsculas) no es duplicado', async () => {
    const a = await eq.m.producto(cat, 'Cortado', 140);
    await eq.m.producto(cat, 'Moca', 250);
    const r = await eq.m.editarProducto(a, { name: 'moca' });
    expect([r.status, codigo(r)]).toEqual([409, COD.productoDuplicado]);
    expect(await filaProducto(ctx, a)).toMatchObject({ name: 'Cortado' });
    expect((await eq.m.editarProducto(a, { name: 'Cortado' })).status).toBe(200);
    expect((await eq.m.editarProducto(a, { name: 'CORTADO' })).status).toBe(200);
  });

  test('[HU-05/CA-F07] al mover un producto a otra categoría donde ya existe ese nombre → 409; si no existe, se mueve y aparece allí', async () => {
    const otra = await eq.m.categoria(nombreUnico('Infusiones'));
    const a = await eq.m.producto(cat, 'Poleo', 150);
    await eq.m.producto(otra, 'Poleo', 160);
    const r = await eq.m.editarProducto(a, { categoryId: otra });
    expect([r.status, codigo(r)]).toEqual([409, COD.productoDuplicado]);

    const b = await eq.m.producto(cat, 'Té verde', 150);
    expect((await eq.m.editarProducto(b, { categoryId: otra })).status).toBe(200);
    const menu = await eq.m.categorias();
    expect(menu.find((c) => c.id === otra)?.products.map((p) => p.id)).toContain(b);
    expect(menu.find((c) => c.id === cat)?.products.map((p) => p.id)).not.toContain(b);
  });

  test('[HU-05/CA-F07][HU-05/CA-F05] el nombre de un producto desactivado queda libre; al reactivar el antiguo, si ya hay uno activo con ese nombre → 409', async () => {
    const viejo = await eq.m.producto(cat, 'Tarta', 300);
    await eq.m.desactivar(viejo);
    const nuevo = await eq.m.crearProducto({ categoryId: cat, name: 'Tarta', priceCents: 320 });
    expect(nuevo.status, nuevo.raw).toBe(201);
    const r = await eq.m.editarProducto(viejo, { active: true });
    expect([r.status, codigo(r)]).toEqual([409, COD.productoDuplicado]);
    expect(await filaProducto(ctx, viejo)).toMatchObject({ active: false });
  });

  test('[HU-05/CA-F07] dos altas simultáneas con el mismo nombre → una 201 y otra 409 (la BD lo impide aunque falle la comprobación)', async () => {
    const nombre = nombreUnico('Simultáneo');
    const rs = await Promise.all(Array.from({ length: 6 }, () => eq.m.crearProducto({ categoryId: cat, name: nombre, priceCents: 100 })));
    expect(rs.filter((r) => r.status === 201)).toHaveLength(1);
    expect(rs.filter((r) => r.status === 409).every((r) => codigo(r) === COD.productoDuplicado)).toBe(true);
    expect(rs.filter((r) => ![201, 409].includes(r.status)).map((r) => r.status), 'ningún 500').toEqual([]);
  });
});

describe('CA-F03 y CA-N02: cambio de precio y auditoría', () => {
  test('[HU-05/CA-F03][HU-05/CA-N02] cambiar el precio → 200, el menú lo muestra y queda auditado con usuario, fecha, precio anterior y nuevo', async () => {
    const id = await eq.m.producto(cat, 'Capuchino', 220);
    eq.m.ctx.reloj.avanzar({ min: 3 });
    const momento = eq.m.ctx.reloj.now();
    const r = await eq.m.editarProducto(id, { priceCents: 240 });
    expect(r.status, r.raw).toBe(200);
    expect((r.body.product ?? r.body).priceCents).toBe(240);
    expect(buscarProducto(await eq.w.categorias(), id)).toMatchObject({ priceCents: 240 });

    const filas = await auditoriaDe(ctx, id, 'price.changed');
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ actor_id: eq.encargado.id, entity_type: 'product', entity_id: id });
    expect(filas[0]!.at.getTime(), 'fecha = hora del reloj de la app').toBe(momento.getTime());
    expect(filas[0]!.details).toMatchObject({ old_price_cents: 220, new_price_cents: 240 });
    // Sin PIN ni hashes en la auditoría (docs/arquitectura.md §4.1).
    expect(JSON.stringify(filas[0])).not.toMatch(/pin|hash/i);

    // Evento de log del catálogo (docs/logging.md §3.3).
    const ev = ctx.logs.eventos('product.price_changed').filter((e) => e.product_id === id);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ old_price_cents: 220, new_price_cents: 240 });
  });

  test('[HU-05/CA-N02] varios cambios dejan una fila por cambio, con la cadena anterior → nuevo; renombrar o repetir el mismo precio no audita', async () => {
    const id = await eq.m.producto(cat, 'Tostada', 200);
    for (const p of [210, 250, 99_999]) {
      eq.m.ctx.reloj.avanzar({ s: 5 });
      expect((await eq.m.editarProducto(id, { priceCents: p })).status).toBe(200);
    }
    expect((await eq.m.editarProducto(id, { priceCents: 99_999 })).status, 'mismo precio').toBe(200);
    expect((await eq.m.editarProducto(id, { name: 'Tostada integral' })).status, 'solo el nombre').toBe(200);
    expect((await eq.m.editarProducto(id, { active: false })).status, 'desactivar').toBe(200);
    const filas = await auditoriaDe(ctx, id, 'price.changed');
    expect(filas.map((f) => [f.details.old_price_cents, f.details.new_price_cents])).toEqual([
      [200, 210],
      [210, 250],
      [250, 99_999],
    ]);
  });

  test('[HU-05/CA-F03][HU-05/CA-N02] un cambio de precio rechazado (validación o permisos) no deja fila de auditoría ni cambia el precio', async () => {
    const id = await eq.m.producto(cat, 'Bocadillo', 350);
    expect((await eq.m.editarProducto(id, { priceCents: 0 })).status).toBe(400);
    expect((await eq.w.editarProducto(id, { priceCents: 1 })).status).toBe(403);
    expect((await eq.k.editarProducto(id, { priceCents: 1 })).status).toBe(403);
    expect(await filaProducto(ctx, id)).toMatchObject({ price_cents: 350 });
    expect(await auditoriaDe(ctx, id, 'price.changed')).toEqual([]);
  });

  test('[HU-05/CA-F03][HU-05/CA-N02] la auditoría no se puede modificar ni borrar ni siquiera con el rol de la aplicación (RS-33)', async () => {
    const id = await eq.m.producto(cat, 'Croissant', 180);
    await eq.m.editarProducto(id, { priceCents: 190 });
    await expect(ctx.bd.query(`UPDATE audit_log SET details = '{}' WHERE entity_id = $1`, [id])).rejects.toThrow();
    await expect(ctx.bd.query(`DELETE FROM audit_log WHERE entity_id = $1`, [id])).rejects.toThrow();
    expect(await auditoriaDe(ctx, id, 'price.changed')).toHaveLength(1);
  });
});

describe('CA-F05: desactivar un producto', () => {
  test('[HU-05/CA-F05] desactivar → 200; deja de salir en el menú de camarero, barra y encargado; el encargado lo sigue viendo con includeInactive', async () => {
    const id = await eq.m.producto(cat, 'Descafeinado', 140);
    const r = await eq.m.editarProducto(id, { active: false });
    expect(r.status, r.raw).toBe(200);

    for (const [quien, c] of [['camarero', eq.w], ['barra', eq.k], ['encargado', eq.m]] as const) {
      expect(buscarProducto(await c.categorias(), id), `${quien} no lo ve en la toma de pedidos`).toBeUndefined();
    }
    const gestion = buscarProducto(await eq.m.categorias({ incluirInactivos: true }), id);
    expect(gestion).toMatchObject({ name: 'Descafeinado', priceCents: 140, active: false });
  });

  test('[HU-05/CA-F05] se conserva para el histórico: la fila sigue en BD con su nombre y precio, y nadie con el rol de la aplicación puede borrarla', async () => {
    const id = await eq.m.producto(cat, 'Té rojo', 175);
    await eq.m.desactivar(id);
    expect(await filaProducto(ctx, id)).toMatchObject({ name: 'Té rojo', price_cents: 175, active: false });
    await expect(ctx.bd.query(`DELETE FROM products WHERE id = $1`, [id])).rejects.toThrow(/permission denied|permiso denegado/i);
    expect(await filaProducto(ctx, id)).toBeDefined();
  });

  test('[HU-05/CA-F05] reactivar (active:true) lo devuelve a la toma de pedidos; desactivar dos veces es inocuo', async () => {
    const id = await eq.m.producto(cat, 'Chocolate', 200);
    expect((await eq.m.editarProducto(id, { active: false })).status).toBe(200);
    expect((await eq.m.editarProducto(id, { active: false })).status).toBe(200);
    expect(buscarProducto(await eq.w.categorias(), id)).toBeUndefined();
    expect((await eq.m.editarProducto(id, { active: true })).status).toBe(200);
    expect(buscarProducto(await eq.w.categorias(), id)).toMatchObject({ name: 'Chocolate', priceCents: 200 });
  });

  test('[HU-05/CA-F05] producto que no existe → 404 al editar', async () => {
    expect((await eq.m.editarProducto(randomUUID(), { priceCents: 100 })).status).toBe(404);
  });
});
