// Regla general de texto recibido (docs/arquitectura.md §5 y §18.2, D-2.5-03 c;
// confirmada por Cybersecurity en docs/seguridad.md §6.14, C10 y C11), vista
// desde la API: HU-05 es la primera historia que crea nombres únicos y visibles
// (categorías y productos), así que aquí se prueba `apiName` por las rutas, y
// `apiText` heredado por el login (un C1 pasa de 401 a 400 `format`: los casos
// están en HU-01-nombre-control.int.test.ts).
//   - un nombre con un carácter prohibido → 400 VALIDATION_FAILED con una sola
//     incidencia { path: ["name"], rule: "format" }, sin 500, sin líneas de error
//     en el log, sin repetir el valor y sin guardar nada;
//   - lo que se guarda es el valor YA NORMALIZADO (NFC, trim, espacios U+0020
//     colapsados) y la unicidad se calcula sobre él;
//   - C11: el valor normalizado es el que llega a la ruta (`transform`): el login
//     con "José" descompuesto entra en la cuenta "José" y comparte su carril
//     `user:<id>` (contador de fallos y cerrojo);
//   - C10: ningún nombre de usuario existente es no-NFC ni lleva controles.
import { randomInt } from 'node:crypto';
import pg from 'pg';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { codigo, incidencias, ipUnica, pedir, type Resp } from '../../support/http.ts';
import { ClienteMenu, contarFilas, crearEquipo, filaCategoria, filaProducto, nombresDe, type Equipo } from '../../support/menu.ts';
import { crearUsuario, nombreUnico, pinIncorrecto } from '../../support/fixtures.ts';
import { sesionesDe, usuario } from '../../support/bd.ts';
import { bdApp, variable } from '../../support/entorno.ts';

let ctx: Ctx;
let eq: Equipo;
beforeEach(async () => {
  ctx = await montarApp();
  eq = await crearEquipo(ctx);
});
afterEach(async () => {
  await ctx?.cerrar();
});

/** Nombres rechazados por apiName (docs/arquitectura.md §5): todo lo de apiText más Cf, Co, Cn y Z distinto de U+0020. */
const INVALIDOS: [string, string][] = [
  ['NUL', 'Ca\u0000fé'],
  ['tabulador en medio', 'Ca\tfé'],
  ['salto de línea en medio', 'Ca\nfé'],
  ['ESC', 'Ca\u001bfé'],
  ['DEL', 'Ca\u007ffé'],
  ['C1 NEL (U+0085)', 'Ca\u0085fé'],
  ['C1 último (U+009F)', 'Ca\u009ffé'],
  ['override bidireccional (U+202E)', 'Ca\u202efé'],
  ['aislamiento bidireccional (U+2066)', 'Ca\u2066fé'],
  ['separador de línea (U+2028)', 'Ca\u2028fé'],
  ['separador de párrafo (U+2029)', 'Ca\u2029fé'],
  ['sustituto UTF-16 suelto', 'Ca\ud800fé'],
  ['guion blando (U+00AD)', 'Ca\u00adfé'],
  ['espacio de ancho cero (U+200B)', 'Ca\u200bfé'],
  ['ZWJ (U+200D)', 'Ca\u200dfé'],
  ['LRM (U+200E)', 'Ca\u200efé'],
  ['marca de letra árabe (U+061C)', 'Ca\u061cfé'],
  ['BOM en medio (U+FEFF)', 'Ca\ufefffé'],
  ['uso privado (U+E000)', 'Ca\ue000fé'],
  ['sin asignar (U+0378)', 'Ca\u0378fé'],
  ['NBSP (U+00A0)', 'Ca\u00a0fé'],
  ['espacio en cuadratín (U+2003)', 'Ca\u2003fé'],
  ['espacio ideográfico (U+3000)', 'Ca\u3000fé'],
];

/** Cada ruta que recibe un nombre: cómo se prueba y cómo se comprueba que no cambió nada. */
interface RutaDeNombre {
  nombre: string;
  enviar(c: ClienteMenu, nombre: string): Promise<Resp>;
  intacto(): Promise<unknown>;
}

async function rutas(): Promise<RutaDeNombre[]> {
  const categoria = await eq.m.categoria(nombreUnico('Cat'));
  const producto = await eq.m.producto(categoria, nombreUnico('Prod'), 150);
  return [
    {
      nombre: 'POST /categories',
      enviar: (c, name) => c.crearCategoria({ name }),
      intacto: () => contarFilas(ctx, 'categories'),
    },
    {
      nombre: 'PATCH /categories/:id',
      enviar: (c, name) => c.renombrarCategoria(categoria, { name }),
      intacto: async () => (await filaCategoria(ctx, categoria))?.name,
    },
    {
      nombre: 'POST /products',
      enviar: (c, name) => c.crearProducto({ categoryId: categoria, name, priceCents: 100 }),
      intacto: () => contarFilas(ctx, 'products'),
    },
    {
      nombre: 'PATCH /products/:id (renombrar)',
      enviar: (c, name) => c.editarProducto(producto, { name }),
      intacto: async () => (await filaProducto(ctx, producto))?.name,
    },
  ];
}

describe('apiName en las rutas de HU-05: caracteres prohibidos → 400 format', () => {
  for (const nombreRuta of ['POST /categories', 'PATCH /categories/:id', 'POST /products', 'PATCH /products/:id (renombrar)']) {
    test(`[HU-05/CA-F06][HU-05/CA-F01][HU-05/CA-F02][SEC-042] ${nombreRuta}: ${INVALIDOS.length} nombres con caracteres de control, invisibles o espacios raros → 400 VALIDATION_FAILED { name, format }, sin guardar, sin repetir el valor y sin errores en el log`, async () => {
      const ruta = (await rutas()).find((r) => r.nombre === nombreRuta)!;
      const antes = JSON.stringify(await ruta.intacto());
      for (const [descripcion, nombre] of INVALIDOS) {
        const r = await ruta.enviar(eq.m, nombre);
        expect([r.status, codigo(r)], `${descripcion}: ${r.raw.slice(0, 200)}`).toEqual([400, 'VALIDATION_FAILED']);
        expect(incidencias(r), descripcion).toEqual([{ path: ['name'], rule: 'format' }]);
        expect(r.raw, `${descripcion}: no repite el valor recibido`).not.toContain(JSON.stringify(nombre).slice(1, -1));
      }
      expect(JSON.stringify(await ruta.intacto()), 'no se ha guardado ni cambiado nada').toBe(antes);
      const graves = ctx.logs.registros.filter((l) => l.level === 'error' || l.level === 'fatal');
      expect(graves.map((l) => `${l.event}: ${String(l.msg)}`), 'líneas de nivel error o fatal').toEqual([]);
      expect(ctx.logs.eventos('http.request.unhandled_error')).toEqual([]);
    });
  }

  test('[HU-05/CA-F06][SEC-042] un nombre prohibido no revela nada de lo que ya existe: la respuesta es la misma haya o no un duplicado', async () => {
    await eq.m.categoria('Café');
    const con = await eq.m.crearCategoria({ name: 'Ca\u200bfé' });
    const sin = await eq.m.crearCategoria({ name: 'Ca\u200bfé distinto' });
    expect([con.status, codigo(con)]).toEqual([400, 'VALIDATION_FAILED']);
    expect(incidencias(con)).toEqual(incidencias(sin));
  });
});

describe('apiName: lo que se guarda es el valor normalizado', () => {
  test('[HU-05/CA-F01] categoría: NFC, trim y espacios colapsados antes de guardar; el menú y la BD tienen el valor normalizado', async () => {
    const r = await eq.m.crearCategoria({ name: '  Cafe\u0301    solo ' });
    expect(r.status, r.raw).toBe(201);
    expect((r.body.category ?? r.body).name).toBe('Café solo');
    expect(nombresDe(await eq.m.categorias())).toContain('Café solo');
    const f = await ctx.bd.query<{ n: boolean }>(`SELECT name IS NFC NORMALIZED AS n FROM categories WHERE name = 'Café solo'`);
    expect(f.rows).toEqual([{ n: true }]);
  });

  test('[HU-05/CA-F02] producto: NFC, trim y espacios colapsados antes de guardar', async () => {
    const cat = await eq.m.categoria(nombreUnico('Cat'));
    const r = await eq.m.crearProducto({ categoryId: cat, name: '  Croissant   de  chocolate ', priceCents: 180 });
    expect(r.status, r.raw).toBe(201);
    expect((r.body.product ?? r.body).name).toBe('Croissant de chocolate');
    const r2 = await eq.m.crearProducto({ categoryId: cat, name: 'Te\u0301 verde', priceCents: 150 });
    expect((r2.body.product ?? r2.body).name).toBe('Té verde');
    const f = await ctx.bd.query<{ n: boolean }>(`SELECT name IS NFC NORMALIZED AS n FROM products WHERE category_id = $1 ORDER BY position`, [cat]);
    expect(f.rows.every((x) => x.n)).toBe(true);
  });

  test('[HU-05/CA-F01][HU-05/CA-F07] la unicidad se calcula sobre el valor normalizado: "Ana" y "Ana␣", "José" compuesto y descompuesto son el mismo nombre (409)', async () => {
    const cat = await eq.m.categoria(nombreUnico('Cat'));
    const base = nombreUnico('Jose');
    await eq.m.categoria(`${base}é`);
    await eq.m.producto(cat, `Pan ${base}`, 100);
    for (const variante of [`${base}e\u0301`, `${base}é `, ` ${base}é`, `${base}É`]) {
      expect((await eq.m.crearCategoria({ name: variante })).status, JSON.stringify(variante)).toBe(409);
    }
    for (const variante of [`Pan ${base} `, `Pan   ${base}`, `PAN ${base}`]) {
      const r = await eq.m.crearProducto({ categoryId: cat, name: variante, priceCents: 100 });
      expect(r.status, JSON.stringify(variante)).toBe(409);
    }
  });

  test('[HU-05/CA-F01] los nombres corrientes (acentos, eñes, símbolos, emoji, CJK, comillas, SQL y HTML como texto) se aceptan y se devuelven tal cual', async () => {
    const cat = await eq.m.categoria(nombreUnico('Cat'));
    const nombres = ['Tostada c/ tomate', 'Té', 'José Mª Ñandú-2', 'Zumo (naranja) 0,2 L', '☕ Café', 'お茶', "Robert'); DROP TABLE x;--", '<img src=x onerror=alert(1)>', '100% natural'];
    for (const n of nombres) {
      const r = await eq.m.crearProducto({ categoryId: cat, name: n, priceCents: 100 });
      expect(r.status, `${n}: ${r.raw}`).toBe(201);
    }
    const guardados = (await eq.m.categorias()).find((c) => c.id === cat)!.products.map((p) => p.name);
    expect(guardados).toEqual(nombres);
  });

  test('[HU-05/CA-F01][HU-05/CA-F06] longitud medida con String.length tras normalizar: 15 pasteles (30 unidades) caben en una categoría, 16 no; 30 «é» descompuestas caben', async () => {
    expect((await eq.m.crearCategoria({ name: '\u{1F370}'.repeat(15) })).status).toBe(201);
    const r = await eq.m.crearCategoria({ name: '\u{1F370}'.repeat(16) });
    expect(incidencias(r)).toEqual([{ path: ['name'], rule: 'max_length' }]);
    expect((await eq.m.crearCategoria({ name: 'e\u0301'.repeat(30) })).status).toBe(201);
    expect(incidencias(await eq.m.crearCategoria({ name: 'e\u0301'.repeat(31) }))).toEqual([{ path: ['name'], rule: 'max_length' }]);
  });
});

describe('C11: apiText/apiName como transform — el valor normalizado es el que llega a la ruta', () => {
  const login = (nombre: string, pin: string, ip: string = ipUnica()) => pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: nombre, pin }, ip });
  let compuesto: string;
  let descompuesto: string;
  beforeEach(() => {
    compuesto = `José-${randomInt(100_000, 999_999)}`;
    descompuesto = compuesto.normalize('NFD');
    expect(descompuesto).not.toBe(compuesto);
  });

  test('[HU-01/CA-F05][HU-05/CA-F01] el login con "José" descompuesto entra en la cuenta "José" compuesta (y al revés)', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter', nombre: compuesto });
    const r = await login(descompuesto, u.pin);
    expect(r.status, r.raw).toBe(200);
    expect(r.body.user).toMatchObject({ id: u.id, name: compuesto });
    expect((await sesionesDe(ctx.bd, u.id)).length).toBe(1);

    const otra = await crearUsuario(ctx, { rol: 'waiter', nombre: `${compuesto}-2` });
    expect((await login(`${descompuesto}-2`, otra.pin)).status).toBe(200);
  });

  test('[HU-01/CA-F06][HU-05/CA-F01] la forma compuesta y la descompuesta comparten el mismo contador de fallos y bloqueo (carril user:<id>)', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter', nombre: compuesto });
    for (let i = 0; i < 3; i++) expect((await login(descompuesto, pinIncorrecto(u.pin))).status).toBe(401);
    for (let i = 0; i < 2; i++) expect((await login(compuesto, pinIncorrecto(u.pin))).status).toBe(401);
    expect(await usuario(ctx.bd, u.id)).toMatchObject({ failed_attempts: 5 });
    // Bloqueo de 5 min en la cuenta: el PIN correcto con cualquiera de las dos formas recibe 423.
    for (const nombre of [compuesto, descompuesto]) {
      const r = await login(nombre, u.pin);
      expect([r.status, codigo(r)], JSON.stringify(nombre)).toEqual([423, 'LOCKED']);
    }
  });

  test('[HU-01/CA-F06][HU-05/CA-F01] 16 intentos simultáneos con PIN erróneo mezclando las dos formas del nombre, desde IP distintas → como mucho 5 verificaciones y el resto 423', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter', nombre: compuesto });
    const antes = ctx.hasher.verificaciones;
    const rs = await Promise.all(Array.from({ length: 16 }, (_, i) => login(i % 2 === 0 ? compuesto : descompuesto, pinIncorrecto(u.pin))));
    expect(ctx.hasher.verificaciones - antes, 'verificaciones argon2').toBeLessThanOrEqual(5);
    expect(rs.filter((r) => r.status === 401).length).toBeLessThanOrEqual(5);
    expect(rs.every((r) => r.status === 401 || r.status === 423), rs.map((r) => r.status).join()).toBe(true);
    expect((await usuario(ctx.bd, u.id)).failed_attempts).toBeLessThanOrEqual(5);
  });

  test('[HU-01/CA-F05][HU-05/CA-F01] un nombre que no existe da 401 igual con las dos formas (no revela nada) y no abre sesión', async () => {
    const a = await login(descompuesto, '482916');
    const b = await login(compuesto, '482916');
    expect([a.status, codigo(a)]).toEqual([401, 'INVALID_CREDENTIALS']);
    expect([b.status, codigo(b)]).toEqual([401, 'INVALID_CREDENTIALS']);
  });
});

describe('C10: los nombres de usuario que ya existen son NFC y sin controles', () => {
  const CONSULTA = `SELECT id FROM users WHERE name IS NOT NFC NORMALIZED OR name ~ '[[:cntrl:]]'`;

  test('[HU-05/CA-F01][C10] en la BD de este fichero: 0 filas', async () => {
    await crearUsuario(ctx, { rol: 'waiter', nombre: nombreUnico('Zoë') });
    expect((await ctx.bd.query(CONSULTA)).rowCount).toBe(0);
  });

  test('[HU-05/CA-F01][C10] en la BD de la pila TESTING (DATABASE_NAME): 0 filas (en DEV lo comprueba Infrastructure al empezar HU-05, tests/README.md §7.8)', async () => {
    const pool = new pg.Pool({ ...bdApp(variable('DATABASE_NAME')), max: 1 });
    try {
      expect((await pool.query(CONSULTA)).rowCount).toBe(0);
    } finally {
      await pool.end();
    }
  });
});
