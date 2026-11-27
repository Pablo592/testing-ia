// HU-05/CA-N01: "solo el encargado puede crear, editar, desactivar, reordenar o
// cambiar precios; marcar Agotado/Disponible está permitido también al
// camarero. Validado en servidor." Con cuerpos VÁLIDOS y destinos que existen
// (la matriz de tests/security/matriz-autorizacion.sec.test.ts prueba la tabla
// de permisos con cuerpos vacíos): un 403 no puede deberse a un cuerpo inválido,
// y un rol denegado no deja ningún rastro en la BD. Permisos de
// docs/permisos.md §3.2: menu:read (W, K, M), product:set_availability (W, M),
// menu:manage (M). RS-15, RS-24, RS-18 aplican igual que en HU-01.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { codigo, esperar401, pedir, sesion, type Resp } from '../../support/http.ts';
import { ClienteMenu, crearEquipo, filaProducto, type Equipo } from '../../support/menu.ts';
import { crearUsuario, nombreUnico } from '../../support/fixtures.ts';
import { fabricarDesactivado, fabricarRol, huella } from '../../support/bd.ts';

let ctx: Ctx;
let eq: Equipo;
beforeEach(async () => {
  ctx = await montarApp();
  eq = await crearEquipo(ctx);
});
afterEach(async () => {
  await ctx?.cerrar();
});

type Quien = 'm' | 'w' | 'k';

interface Operacion {
  nombre: string;
  permitidos: Quien[];
  /** Prepara los destinos (siempre como encargado) y devuelve la petición a probar. */
  preparar(): Promise<(c: ClienteMenu) => Promise<Resp>>;
}

const OPERACIONES: Operacion[] = [
  { nombre: 'GET /menu', permitidos: ['m', 'w', 'k'], preparar: async () => (c) => c.menu() },
  { nombre: 'POST /categories', permitidos: ['m'], preparar: async () => (c) => c.crearCategoria({ name: nombreUnico('Nueva') }) },
  {
    nombre: 'PATCH /categories/:id (renombrar)',
    permitidos: ['m'],
    preparar: async () => {
      const id = await eq.m.categoria(nombreUnico('Vieja'));
      return (c) => c.renombrarCategoria(id, { name: nombreUnico('Nueva') });
    },
  },
  {
    nombre: 'DELETE /categories/:id',
    permitidos: ['m'],
    preparar: async () => {
      const id = await eq.m.categoria(nombreUnico('Borrable'));
      return (c) => c.borrarCategoria(id);
    },
  },
  {
    nombre: 'POST /products',
    permitidos: ['m'],
    preparar: async () => {
      const cat = await eq.m.categoria(nombreUnico('Cat'));
      return (c) => c.crearProducto({ categoryId: cat, name: nombreUnico('Prod'), priceCents: 150 });
    },
  },
  {
    nombre: 'PATCH /products/:id (cambiar el precio)',
    permitidos: ['m'],
    preparar: async () => {
      const id = await eq.m.producto(await eq.m.categoria(nombreUnico('Cat')), nombreUnico('Prod'), 150);
      return (c) => c.editarProducto(id, { priceCents: 175 });
    },
  },
  {
    nombre: 'PATCH /products/:id (desactivar)',
    permitidos: ['m'],
    preparar: async () => {
      const id = await eq.m.producto(await eq.m.categoria(nombreUnico('Cat')), nombreUnico('Prod'), 150);
      return (c) => c.editarProducto(id, { active: false });
    },
  },
  {
    nombre: 'PATCH /products/:id/availability',
    permitidos: ['m', 'w'],
    preparar: async () => {
      const id = await eq.m.producto(await eq.m.categoria(nombreUnico('Cat')), nombreUnico('Prod'), 150);
      return (c) => c.disponibilidad(id, { available: false });
    },
  },
  {
    nombre: 'PUT /menu/order',
    permitidos: ['m'],
    preparar: async () => {
      await eq.m.categoria(nombreUnico('A'));
      await eq.m.categoria(nombreUnico('B'));
      const ids = (await eq.m.categorias()).map((c) => c.id).reverse();
      return (c) => c.ordenar({ categories: ids, products: {} });
    },
  },
];

const CLIENTE = (q: Quien): ClienteMenu => eq[q];

describe('CA-N01: cada rol puede lo que le corresponde, comprobado en el servidor con peticiones bien formadas', () => {
  for (const op of OPERACIONES) {
    for (const q of ['m', 'w', 'k'] as Quien[]) {
      const permitido = op.permitidos.includes(q);
      test(`[HU-05/CA-N01] ${op.nombre} como ${q === 'm' ? 'encargado' : q === 'w' ? 'camarero' : 'barra'} → ${permitido ? 'permitido (2xx)' : '403 FORBIDDEN y sin ningún cambio en la BD'}`, async () => {
        const peticion = await op.preparar();
        const antes = await huella(ctx.bd);
        const r = await peticion(CLIENTE(q));
        if (permitido) {
          expect(r.status, r.raw).toBeGreaterThanOrEqual(200);
          expect(r.status, r.raw).toBeLessThan(300);
        } else {
          expect([r.status, codigo(r)], r.raw).toEqual([403, 'FORBIDDEN']);
          expect(r.body.error.details).toBeUndefined();
          expect(await huella(ctx.bd), 'sin efecto en BD').toBe(antes);
          // Y el servidor tampoco avisó a nadie de nada (ni log de éxito de menú).
          expect(ctx.logs.eventos('product.price_changed')).toEqual([]);
          expect(ctx.logs.eventos('category.archived')).toEqual([]);
        }
      });
    }
  }
});

describe('CA-N01: los permisos se leen en cada petición (no los recuerda la sesión ni los decide la interfaz)', () => {
  test('[HU-05/CA-N01][RS-14] un encargado degradado a camarero en otro dispositivo pierde el acceso a la gestión en su siguiente petición, y conserva el de Agotado', async () => {
    const otro = await crearUsuario(ctx, { rol: 'manager' });
    const cookie = await sesion(ctx, otro.nombre, otro.pin);
    const c = new ClienteMenu(ctx, cookie);
    expect((await c.crearCategoria({ name: nombreUnico('Antes') })).status).toBe(201);

    await fabricarRol(ctx.bd, otro.id, 'waiter');
    const antes = await huella(ctx.bd);
    const r = await c.crearCategoria({ name: nombreUnico('Despues') });
    expect([r.status, codigo(r)]).toEqual([403, 'FORBIDDEN']);
    expect(await huella(ctx.bd)).toBe(antes);

    const p = await eq.m.producto(await eq.m.categoria(nombreUnico('Cat')), nombreUnico('Prod'));
    expect((await c.disponibilidad(p, { available: false })).status).toBe(200);
  });

  test('[HU-05/CA-N01][RS-14] un encargado desactivado con la sesión abierta recibe 401 revoked y no cambia nada', async () => {
    const otro = await crearUsuario(ctx, { rol: 'manager' });
    const cookie = await sesion(ctx, otro.nombre, otro.pin);
    await fabricarDesactivado(ctx.bd, otro.id);
    const antes = await huella(ctx.bd);
    const r = await new ClienteMenu(ctx, cookie).crearCategoria({ name: nombreUnico('Nueva') });
    esperar401(r, { reason: 'revoked', revokedReason: 'user_disabled' });
    expect(await huella(ctx.bd)).toBe(antes);
  });

  test('[HU-05/CA-N01][RS-15] un encargado con PIN provisional no gestiona el menú: 403 PIN_CHANGE_REQUIRED en todas las rutas, sin efecto', async () => {
    const prov = await crearUsuario(ctx, { rol: 'manager', pinProvisional: true });
    const c = new ClienteMenu(ctx, await sesion(ctx, prov.nombre, prov.pin));
    const p = await eq.m.producto(await eq.m.categoria(nombreUnico('Cat')), nombreUnico('Prod'));
    const antes = await huella(ctx.bd);
    for (const r of [
      await c.menu(),
      await c.crearCategoria({ name: nombreUnico('X') }),
      await c.editarProducto(p, { priceCents: 1 }),
      await c.disponibilidad(p, { available: false }),
      await c.ordenar({ categories: [], products: {} }),
    ]) {
      expect([r.status, codigo(r)], r.raw).toEqual([403, 'PIN_CHANGE_REQUIRED']);
    }
    expect(await huella(ctx.bd)).toBe(antes);
  });

  test('[HU-05/CA-N01][RS-24] sin Origin, o con uno ajeno, las escrituras de menú dan 403 ORIGIN_NOT_ALLOWED aunque la sesión sea del encargado y el cuerpo sea válido', async () => {
    const p = await eq.m.producto(await eq.m.categoria(nombreUnico('Cat')), nombreUnico('Prod'), 150);
    const antes = await huella(ctx.bd);
    for (const origen of [{ sinOrigen: true }, { cabeceras: { origin: 'https://evil.test' } }]) {
      for (const [metodo, ruta, cuerpo] of [
        ['POST', '/categories', { name: nombreUnico('X') }],
        ['PATCH', `/products/${p}`, { priceCents: 1 }],
        ['PATCH', `/products/${p}/availability`, { available: false }],
        ['PUT', '/menu/order', { categories: [], products: {} }],
      ] as const) {
        const r = await pedir(ctx, { metodo, ruta, cookie: eq.cookies.m, cuerpo, ...origen });
        expect([r.status, codigo(r)], `${metodo} ${ruta} ${JSON.stringify(origen)}`).toEqual([403, 'ORIGIN_NOT_ALLOWED']);
      }
    }
    expect(await huella(ctx.bd)).toBe(antes);
    expect(await filaProducto(ctx, p)).toMatchObject({ price_cents: 150, available: true });
  });

  test('[HU-05/CA-N01][RS-24] el cuerpo debe ser JSON: text/plain → 415 UNSUPPORTED_MEDIA_TYPE, sin efecto', async () => {
    const antes = await huella(ctx.bd);
    const r = await pedir(ctx, {
      metodo: 'POST',
      ruta: '/categories',
      cookie: eq.cookies.m,
      cuerpo: 'name=Hola',
      cabeceras: { 'content-type': 'text/plain' },
    });
    expect([r.status, codigo(r)]).toEqual([415, 'UNSUPPORTED_MEDIA_TYPE']);
    expect(await huella(ctx.bd)).toBe(antes);
  });
});
