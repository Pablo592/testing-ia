// Regresión automática de SEC-041 (tarea 2.8a, D-2.5-02; RS-27): TODA respuesta
// de /api lleva `Cache-Control: no-store`, sea cual sea su estado (200, 204,
// 400, 401, 403, 404, 423, 429, 503) y su ruta (también las que no existen). El
// flujo SSE conserva `no-cache, no-transform` (hijack). Los tests recorren todas
// las rutas de HU-01 y varios errores en lugar de comprobar solo tres: así una
// ruta nueva de HU-02..HU-08 que olvide la cabecera se detecta aquí.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { cookieSesion, IP_A, ipUnica, pedir, sesion, type Peticion, type Resp } from '../../support/http.ts';
import { crearUsuario, pinIncorrecto } from '../../support/fixtures.ts';
import { abrirSse } from '../../support/sse.ts';

let ctx: Ctx;
beforeEach(async () => {
  ctx = await montarApp();
});
afterEach(async () => {
  await ctx?.cerrar();
});

function noStore(r: Resp): string {
  return String(r.headers['cache-control']);
}

interface Caso {
  nombre: string;
  estado: number;
  peticion: Peticion;
}

async function comprobar(casos: Caso[]): Promise<void> {
  for (const c of casos) {
    const r = await pedir(ctx, c.peticion);
    expect(r.status, `${c.nombre}: estado (${r.raw.slice(0, 120)})`).toBe(c.estado);
    expect(noStore(r), `${c.nombre}: Cache-Control`).toBe('no-store');
  }
}

describe('Cache-Control: no-store en toda respuesta de /api (RS-27, SEC-041)', () => {
  test('[RS-27][SEC-041] respuestas correctas: login 200, /auth/me 200, login-options 200, logout 204, activity 204', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const login = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: u.nombre, pin: u.pin }, ip: ipUnica() });
    const cookie = cookieSesion(login)!;
    expect(noStore(login), 'POST /auth/login 200').toBe('no-store');

    await comprobar([
      { nombre: 'GET /auth/login-options', estado: 200, peticion: { ruta: '/auth/login-options' } },
      { nombre: 'GET /auth/me', estado: 200, peticion: { ruta: '/auth/me', cookie } },
      { nombre: 'GET /auth/me con query string', estado: 200, peticion: { ruta: '/auth/me?x=1', cookie } },
      { nombre: 'GET /auth/me pasivo', estado: 200, peticion: { ruta: '/auth/me', cookie, pasiva: true } },
      { nombre: 'POST /session/activity', estado: 204, peticion: { metodo: 'POST', ruta: '/session/activity', cookie } },
      { nombre: 'POST /auth/logout', estado: 204, peticion: { metodo: 'POST', ruta: '/auth/logout', cookie } },
    ]);
  });

  test('[RS-27][SEC-041] errores de sesión: 401 de /auth/me con y sin cookie, con la sesión cerrada, y 401 de los POST', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout', cookie });

    await comprobar([
      { nombre: 'GET /auth/me sin cookie', estado: 401, peticion: { ruta: '/auth/me' } },
      { nombre: 'GET /auth/me con la sesión cerrada', estado: 401, peticion: { ruta: '/auth/me', cookie } },
      { nombre: 'GET /auth/me con token inventado', estado: 401, peticion: { ruta: '/auth/me', cookie: '__Host-sid=' + 'A'.repeat(43) } },
      { nombre: 'POST /auth/logout sin cookie', estado: 401, peticion: { metodo: 'POST', ruta: '/auth/logout' } },
      { nombre: 'POST /session/activity sin cookie', estado: 401, peticion: { metodo: 'POST', ruta: '/session/activity' } },
      { nombre: 'POST /auth/pin sin cookie', estado: 401, peticion: { metodo: 'POST', ruta: '/auth/pin', cuerpo: { currentPin: '1', newPin: '2' } } },
      { nombre: 'GET /events sin cookie', estado: 401, peticion: { ruta: '/events' } },
    ]);
  });

  test('[RS-27][SEC-041] errores del login: 400 (cuerpo inválido), 401 (credenciales), 403 (sin Origin), 423 (bloqueo temporal e indefinido)', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const bloqueado = await crearUsuario(ctx, { rol: 'waiter', bloqueadoHasta: new Date(ctx.reloj.now().getTime() + 5 * 60_000), fallos: 5 });
    const indefinido = await crearUsuario(ctx, { rol: 'waiter', bloqueoIndefinido: true, fallos: 20 });
    const ip = ipUnica();

    await comprobar([
      { nombre: 'POST /auth/login con cuerpo vacío', estado: 400, peticion: { metodo: 'POST', ruta: '/auth/login', cuerpo: {}, ip } },
      { nombre: 'POST /auth/login con JSON roto', estado: 400, peticion: { metodo: 'POST', ruta: '/auth/login', cuerpo: '{', ip } },
      { nombre: 'POST /auth/login con PIN incorrecto', estado: 401, peticion: { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: u.nombre, pin: pinIncorrecto(u.pin) }, ip } },
      { nombre: 'POST /auth/login sin Origin', estado: 403, peticion: { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: u.nombre, pin: u.pin }, sinOrigen: true, ip } },
      { nombre: 'POST /auth/login de una cuenta bloqueada 5 min', estado: 423, peticion: { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: bloqueado.nombre, pin: bloqueado.pin }, ip } },
      { nombre: 'POST /auth/login de una cuenta bloqueada sin límite', estado: 423, peticion: { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: indefinido.nombre, pin: indefinido.pin }, ip } },
    ]);
  });

  test('[RS-27][SEC-041] 429 por dispositivo (10 fallos desde una IP) y 403 FORBIDDEN de POST /auth/pin sin PIN provisional', async () => {
    const a = await crearUsuario(ctx, { rol: 'waiter' });
    const b = await crearUsuario(ctx, { rol: 'waiter' });
    // La sesión se abre antes: con 5 fallos la cuenta queda bloqueada 5 min.
    const cookie = await sesion(ctx, a.nombre, a.pin);
    // 5 + 5 fallos: ninguna cuenta pasa del umbral de su bloqueo y la IP llega a 10.
    for (const u of [a, b]) {
      for (let i = 0; i < 5; i++) {
        await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: u.nombre, pin: pinIncorrecto(u.pin) }, ip: IP_A });
      }
    }

    await comprobar([
      { nombre: 'POST /auth/login desde una IP con 10 fallos', estado: 429, peticion: { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: a.nombre, pin: a.pin }, ip: IP_A } },
      { nombre: 'GET /auth/login-options desde esa IP', estado: 429, peticion: { ruta: '/auth/login-options', ip: IP_A } },
      { nombre: 'POST /auth/pin sin PIN provisional', estado: 403, peticion: { metodo: 'POST', ruta: '/auth/pin', cookie, cuerpo: { currentPin: a.pin, newPin: '482916' } } },
      { nombre: 'POST /auth/pin sin PIN provisional y sin cuerpo', estado: 403, peticion: { metodo: 'POST', ruta: '/auth/pin', cookie } },
    ]);
  });

  test('[RS-27][SEC-041][RS-18] rutas que no existen: 404 de GET, POST, OPTIONS y con barra final, con y sin sesión; 403 sin Origin', async () => {
    const u = await crearUsuario(ctx, { rol: 'manager' });
    const cookie = await sesion(ctx, u.nombre, u.pin);

    await comprobar([
      { nombre: 'GET /api/v1/no-existe', estado: 404, peticion: { ruta: '/api/v1/no-existe' } },
      { nombre: 'GET /api/v1/no-existe con sesión', estado: 404, peticion: { ruta: '/api/v1/no-existe', cookie } },
      { nombre: 'POST /api/v1/no-existe', estado: 404, peticion: { metodo: 'POST', ruta: '/api/v1/no-existe', cuerpo: {}, cookie } },
      { nombre: 'OPTIONS /api/v1/auth/me', estado: 404, peticion: { metodo: 'OPTIONS', ruta: '/api/v1/auth/me', cookie } },
      { nombre: 'GET /api/v1/auth/me/ (barra final)', estado: 404, peticion: { ruta: '/api/v1/auth/me/', cookie } },
      { nombre: 'POST /api/v1/auth/logout sin Origin', estado: 403, peticion: { metodo: 'POST', ruta: '/api/v1/auth/logout', cookie, sinOrigen: true } },
    ]);
  });

  test('[RS-27][SEC-041] el flujo SSE conserva `no-cache, no-transform` y el 401 de /events lleva no-store', async () => {
    const base = await ctx.escuchar();
    const u = await crearUsuario(ctx, { rol: 'kitchen' });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    const sse = await abrirSse(base, cookie);
    try {
      expect(sse.status).toBe(200);
      expect(sse.headers.get('cache-control')).toBe('no-cache, no-transform');
    } finally {
      sse.cerrar();
    }
    const sin = await abrirSse(base, undefined);
    expect(sin.status).toBe(401);
    expect(sin.headers.get('cache-control')).toBe('no-store');
  });
});
