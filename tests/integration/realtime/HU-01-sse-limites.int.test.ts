// Regresión automática de SEC-039 y SEC-040 (tarea 2.8a, D-2.5-02). Cybersecurity
// los verificó a mano en la 2.6 (docs/seguridad.md §6.9 punto 3); aquí quedan
// como tests que se ejecutan en cada `integration`.
//
// SEC-039 (RS-12, HU-01/CA-F09): el flujo SSE no cuenta como actividad, así que
//   el flujo de un camarero/encargado inactivo ≥ 15 min se cierra solo (en el
//   siguiente `ping`, cada 2 s, sin ninguna petición REST); con actividad real
//   sigue abierto y la barra con la cola abierta está exenta.
// SEC-040 (RS-23, docs/permisos.md §3.2): ≤ 2 flujos por sesión y ≤ 50 en total.
//   El 51.º flujo de OTRA sesión recibe 503 con `Retry-After: 5`; el 3.º de una
//   sesión que ya tiene 2 sustituye al más antiguo de esa sesión.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { pedir, sesion } from '../../support/http.ts';
import { crearUsuario } from '../../support/fixtures.ts';
import { abrirSse, type ClienteSse } from '../../support/sse.ts';

let ctx: Ctx;
let base: string;
const abiertos: ClienteSse[] = [];

beforeEach(async () => {
  ctx = await montarApp();
  base = await ctx.escuchar();
});
afterEach(async () => {
  abiertos.splice(0).forEach((s) => s.cerrar());
  await ctx?.cerrar();
});

async function abrir(cookie: string): Promise<ClienteSse> {
  const s = await abrirSse(base, cookie);
  abiertos.push(s);
  return s;
}

/** El flujo sigue abierto: no lo cierra el servidor y sigue recibiendo `ping` (cada 2 s). */
async function sigueAbierto(s: ClienteSse, ms = 4500): Promise<void> {
  const antes = s.eventos.length;
  await expect(s.esperarCierre(ms), 'el servidor no debe cerrar el flujo').rejects.toThrow(/no cerró el flujo/);
  expect(s.eventos.length, 'sigue recibiendo ping').toBeGreaterThan(antes);
}

describe('SEC-039: el flujo SSE de una sesión inactiva se cierra', () => {
  test('[HU-01/CA-F09][SEC-039] camarero con flujo y 15 min sin peticiones → el flujo se cierra en el siguiente ping, sin ninguna petición REST', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    const sse = await abrir(cookie);
    await sse.esperar('hello', 2000);

    ctx.reloj.avanzar({ min: 15 });
    // El ping es cada 2 s: ≤ 1 ping (con margen) y sin tocar la API.
    await sse.esperarCierre(5000);

    expect(sse.eventos.some((e) => e.event === 'session.revoked'), 'no es una revocación').toBe(false);
    const cierres = ctx.logs.eventos('sse.disconnected');
    expect(cierres.map((c) => c.reason), 'el motivo del cierre queda registrado').toEqual(['expired']);
  });

  test('[HU-01/CA-F09][SEC-039] con 14 min de inactividad el flujo sigue abierto (el límite es de 15 min, sin tolerancia)', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const sse = await abrir(await sesion(ctx, u.nombre, u.pin));
    await sse.esperar('hello', 2000);

    ctx.reloj.avanzar({ min: 14, s: 59 });
    await sigueAbierto(sse);
  });

  test('[HU-01/CA-F09][SEC-039] una petición activa a los 10 min mantiene abierto el flujo; sin más actividad se cierra a los 15 min de ELLA', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    const sse = await abrir(cookie);
    await sse.esperar('hello', 2000);

    ctx.reloj.avanzar({ min: 10 });
    expect((await pedir(ctx, { ruta: '/auth/me', cookie })).status, 'GET /auth/me activo').toBe(200);
    ctx.reloj.avanzar({ min: 10 }); // 20 min desde el login, 10 desde la última actividad
    await sigueAbierto(sse);

    ctx.reloj.avanzar({ min: 5 }); // 15 min desde la última actividad
    await sse.esperarCierre(5000);
  });

  test('[HU-01/CA-F09][SEC-039][SEC-030] una petición pasiva (X-Activity: passive) no cuenta como actividad: el flujo se cierra igualmente', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    const sse = await abrir(cookie);
    await sse.esperar('hello', 2000);

    ctx.reloj.avanzar({ min: 10 });
    expect((await pedir(ctx, { ruta: '/auth/me', cookie, pasiva: true })).status).toBe(200);
    ctx.reloj.avanzar({ min: 5 });
    await sse.esperarCierre(5000);
  });

  test('[HU-01/CA-F09][SEC-039] si la petición REST detecta la inactividad (401 idle), el flujo de esa sesión se cierra en ≤ 1 s', async () => {
    const u = await crearUsuario(ctx, { rol: 'manager' });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    const sse = await abrir(cookie);
    await sse.esperar('hello', 2000);

    ctx.reloj.avanzar({ min: 15 });
    const t0 = performance.now();
    const r = await pedir(ctx, { ruta: '/auth/me', cookie });
    expect([r.status, r.body?.error?.details], 'GET /auth/me tras 15 min').toEqual([401, { reason: 'idle' }]);
    const cierre = await sse.esperarCierre(1000);
    expect(cierre - t0).toBeLessThanOrEqual(1000);
  });

  test('[HU-01/CA-F09][SEC-039] la barra con la cola abierta está exenta: tras 30 min sin peticiones su flujo sigue abierto', async () => {
    const u = await crearUsuario(ctx, { rol: 'kitchen' });
    const sse = await abrir(await sesion(ctx, u.nombre, u.pin));
    await sse.esperar('hello', 2000);

    ctx.reloj.avanzar({ min: 30 });
    await sigueAbierto(sse);
  });
});

describe('SEC-040: tope de 50 flujos SSE en total (RS-23)', () => {
  const SESIONES = 25; // 25 sesiones × 2 flujos = 50

  /** 25 sesiones de la misma barra con 2 flujos cada una: el tope global justo lleno. */
  async function llenar(): Promise<{ cookies: string[]; flujos: ClienteSse[][] }> {
    const u = await crearUsuario(ctx, { rol: 'kitchen' });
    const cookies: string[] = [];
    for (let i = 0; i < SESIONES; i++) cookies.push(await sesion(ctx, u.nombre, u.pin));
    const flujos: ClienteSse[][] = [];
    for (const c of cookies) {
      const par = [await abrir(c), await abrir(c)];
      for (const s of par) expect(s.status, 'los primeros 50 flujos entran').toBe(200);
      flujos.push(par);
    }
    await Promise.all(flujos.flat().map((s) => s.esperar('hello', 5000)));
    return { cookies, flujos };
  }

  test('[RS-23][SEC-040] el flujo 51.º de otra sesión recibe 503 con Retry-After: 5, sin caché, y los 50 anteriores siguen abiertos', async () => {
    const { flujos } = await llenar();
    const u = await crearUsuario(ctx, { rol: 'kitchen' });
    const cookieNueva = await sesion(ctx, u.nombre, u.pin);

    const r = await fetch(`${base}/api/v1/events`, { headers: { accept: 'text/event-stream', cookie: cookieNueva } });
    const cuerpo = (await r.json()) as { error?: { code?: string } };

    expect(r.status, 'flujo 51.º').toBe(503);
    expect(cuerpo.error?.code).toBe('SERVICE_UNAVAILABLE');
    expect(r.headers.get('retry-after')).toBe('5');
    expect(r.headers.get('cache-control')).toBe('no-store');
    const rechazos = ctx.logs.eventos('sse.rejected');
    expect(rechazos.map((x) => x.reason), 'sse.rejected con el motivo global_limit').toEqual(['global_limit']);

    // Los 50 anteriores no se tocan: todos reciben el siguiente ping.
    const antes = flujos.flat().map((s) => s.eventos.length);
    await new Promise((ok) => setTimeout(ok, 2600));
    flujos.flat().forEach((s, i) => expect(s.eventos.length, `flujo ${i} sigue recibiendo ping`).toBeGreaterThan(antes[i]));
  });

  test('[RS-23][SEC-040] el 3.er flujo de una sesión con los 50 abiertos entra (200) y sustituye a su flujo más antiguo', async () => {
    const { cookies, flujos } = await llenar();

    const tercero = await abrir(cookies[0]);
    expect(tercero.status, '3.er flujo de una sesión que ya tiene 2').toBe(200);
    await tercero.esperar('hello', 3000);

    // El más antiguo de ESA sesión se cierra; el segundo y los de las demás sesiones siguen.
    await flujos[0][0].esperarCierre(2000);
    await expect(flujos[0][1].esperarCierre(500)).rejects.toThrow(/no cerró el flujo/);
    await expect(flujos[1][0].esperarCierre(500)).rejects.toThrow(/no cerró el flujo/);
    expect(ctx.logs.eventos('sse.rejected'), 'no se rechazó nada').toEqual([]);
  });

  test('[RS-23][SEC-040] al cerrarse un flujo queda hueco: el siguiente de otra sesión entra', async () => {
    const { flujos } = await llenar();
    flujos[0][0].cerrar();
    // El hub se entera al cerrarse la conexión; poll hasta que el hueco está libre.
    const u = await crearUsuario(ctx, { rol: 'kitchen' });
    const cookieNueva = await sesion(ctx, u.nombre, u.pin);
    await expect
      .poll(async () => (await abrir(cookieNueva)).status, { timeout: 3000, message: 'un flujo cerrado libera un hueco del tope global' })
      .toBe(200);
  });
});
