// HU-01/CA-F09 (inactividad 15 min) y CA-N06 (caducidad absoluta 12 h); RS-12, RS-13.
// Con FakeClock. Cuenta como actividad cualquier petición REST (salvo
// /telemetry) y POST /session/activity; no el flujo SSE ni sus ping. Rol barra:
// sin caducidad por inactividad mientras su flujo SSE está abierto; al cerrarse
// el flujo, la inactividad cuenta desde el cierre.
// Regla exacta (docs/arquitectura.md §7, T-37): caducada si
// now >= last_activity_at + 15 min, sin tolerancia; last_activity_at se
// escribe en cada petición que cuenta. Caducidad absoluta: now >= expires_at,
// expires_at = created_at + SESSION_MAX_HOURS (por defecto 12).
// Peticiones pasivas (SEC-030, 2.1i): `X-Activity: passive` (valor exacto)
// pasa por todas las comprobaciones pero no escribe last_activity_at; en
// cualquier ruta, también POST /session/activity.
// Escrituras del hub (2.1i, T-43): al cerrarse el flujo y con el temporizador
// de kitchenActivityIntervalMs, solo para sesiones de barra no revocadas ni
// caducadas, con la hora del Clock.
import { buildApp } from '@mi-app/api/app';
import { ConfigError } from '@mi-app/api/config';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { depsApp, montarApp, type Ctx } from '../../support/app.ts';
import { enAlcance } from '../../support/alcance.ts';
import { esperar401, IP_B, iniciarSesion, pedir, sesion } from '../../support/http.ts';
import { crearUsuario, pinIncorrecto, type Rol } from '../../support/fixtures.ts';
import { fabricarBloqueo, fabricarCaducidad, fabricarRevocada, fabricarRol, sesionesDe } from '../../support/bd.ts';
import { abrirSse, type ClienteSse } from '../../support/sse.ts';

let ctx: Ctx;
let flujos: ClienteSse[];
let base: string | undefined;
beforeEach(async () => {
  ctx = await montarApp();
  flujos = [];
  base = undefined;
});
afterEach(async () => {
  flujos.forEach((f) => f.cerrar());
  await ctx?.cerrar();
});

async function entrar(rol: Rol): Promise<{ id: string; cookie: string; nombre: string; pin: string }> {
  const u = await crearUsuario(ctx, { rol });
  return { id: u.id, cookie: await sesion(ctx, u.nombre, u.pin), nombre: u.nombre, pin: u.pin };
}
const me = (cookie: string) => pedir(ctx, { ruta: '/auth/me', cookie });
const mePasiva = (cookie: string) => pedir(ctx, { ruta: '/auth/me', cookie, pasiva: true });
const dormir = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
async function actividadDe(userId: string): Promise<number> {
  return (await sesionesDe(ctx.bd, userId))[0].last_activity_at.getTime();
}

async function conCola(cookie: string): Promise<ClienteSse> {
  base ??= await ctx.escuchar();
  const sse = await abrirSse(base, cookie);
  expect(sse.status).toBe(200);
  await sse.esperar('hello', 2000);
  flujos.push(sse);
  return sse;
}

describe('Cierre por inactividad de 15 min', () => {
  for (const rol of ['waiter', 'manager'] as Rol[]) {
    test(`[HU-01/CA-F09][RS-12] ${rol}: a 14 min 59 s de la última petición sigue; a los 15 min 0 s exactos → 401 reason idle`, async () => {
      const { id, cookie } = await entrar(rol);
      ctx.reloj.avanzar({ min: 14, s: 59 });
      expect((await me(cookie)).status).toBe(200); // esta petición es actividad
      ctx.reloj.avanzar({ min: 14, s: 59 }); // 29 min 58 s desde el login: cuenta desde la última petición
      expect((await me(cookie)).status).toBe(200);
      ctx.reloj.avanzar({ min: 15 });
      esperar401(await me(cookie), { reason: 'idle' });
      // Se comprueba antes de registrar la actividad: la petición rechazada no la reaviva.
      esperar401(await me(cookie), { reason: 'idle' });
      const ev = ctx.logs.eventos('auth.session.expired').filter((e) => e.user_id === id);
      expect(ev).toHaveLength(1);
      expect(ev[0].reason).toBe('idle');
    });
  }

  test('[HU-01/CA-F09][RS-12] last_activity_at se escribe en cada petición que cuenta, sin intervalo mínimo', async () => {
    const { id, cookie } = await entrar('waiter');
    for (const s of [1, 5, 29]) {
      ctx.reloj.avanzar({ s });
      expect((await me(cookie)).status).toBe(200);
      const [fila] = await sesionesDe(ctx.bd, id);
      expect(fila.last_activity_at.getTime()).toBe(ctx.reloj.now().getTime());
    }
  });

  // POST /telemetry llega con M-03 (fila de la matriz de autorización).
  test.runIf(enAlcance('M-03'))('[HU-01/CA-F09][RS-12] POST /telemetry no cuenta como actividad', async () => {
    const { id, cookie } = await entrar('waiter');
    const [antes] = await sesionesDe(ctx.bd, id);
    ctx.reloj.avanzar({ min: 1 });
    await pedir(ctx, { metodo: 'POST', ruta: '/telemetry', cookie, cuerpo: { metrics: [] } });
    const [despues] = await sesionesDe(ctx.bd, id);
    expect(despues.last_activity_at.getTime()).toBe(antes.last_activity_at.getTime());
  });

  test('[HU-01/CA-F09][RS-12] POST /session/activity cuenta como actividad', async () => {
    const { cookie } = await entrar('waiter');
    ctx.reloj.avanzar({ min: 10 });
    const r = await pedir(ctx, { metodo: 'POST', ruta: '/session/activity', cookie });
    expect(r.status).toBe(204);
    ctx.reloj.avanzar({ min: 10 }); // 20 min desde el login, 10 desde la actividad
    expect((await me(cookie)).status).toBe(200);
  });

  test('[HU-01/CA-F09][RS-12] encargado con la cola abierta (SSE) también caduca: el flujo y sus ping no son actividad', async () => {
    const { cookie } = await entrar('manager');
    await conCola(cookie);
    ctx.reloj.avanzar({ min: 15 });
    esperar401(await me(cookie), { reason: 'idle' });
  });

  test('[HU-01/CA-F09][RS-12] camarero con el flujo SSE abierto también caduca', async () => {
    const { cookie } = await entrar('waiter');
    await conCola(cookie);
    ctx.reloj.avanzar({ min: 15 });
    esperar401(await me(cookie), { reason: 'idle' });
  });

  test('[HU-01/CA-F09][RS-12] barra con la cola abierta no caduca por inactividad (30 min y 11 h 59 min sin tocarla)', async () => {
    const { cookie } = await entrar('kitchen');
    await conCola(cookie);
    ctx.reloj.avanzar({ min: 30 });
    expect((await me(cookie)).status).toBe(200);
    ctx.reloj.avanzar({ h: 11, min: 29 }); // 11 h 59 min desde el login
    expect((await me(cookie)).status).toBe(200);
  });

  test('[HU-01/CA-F09][RS-12] barra sin la cola abierta caduca a los 15 min como los demás', async () => {
    const { cookie } = await entrar('kitchen');
    ctx.reloj.avanzar({ min: 15 });
    esperar401(await me(cookie), { reason: 'idle' });
  });

  test('[HU-01/CA-F09][RS-12] barra que cierra la cola: la inactividad cuenta desde el cierre (14 min 59 s sigue, 15 min → 401)', async () => {
    const { id, cookie } = await entrar('kitchen');
    const sse = await conCola(cookie);
    ctx.reloj.avanzar({ min: 40 });
    const cierre = ctx.reloj.now().getTime();
    sse.cerrar();
    // El hub escribe last_activity_at = clock.now() al cerrarse el flujo.
    await expect.poll(async () => (await sesionesDe(ctx.bd, id))[0].last_activity_at.getTime(), { timeout: 2000 }).toBe(cierre);
    ctx.reloj.avanzar({ min: 14, s: 59 });
    expect((await me(cookie)).status).toBe(200);
    ctx.reloj.avanzar({ min: 15 });
    esperar401(await me(cookie), { reason: 'idle' });
  });

  // La escritura periódica del hub (reinicio brusco de app) está en
  // "Escrituras del hub" (T-43); el reinicio real, en la Etapa 3.
  test('[HU-01/CA-F09][RS-12] barra 30 min sin tocar nada con la cola abierta: tras un corte breve se reconecta y sigue dentro', async () => {
    const { cookie } = await entrar('kitchen');
    const sse = await conCola(cookie);
    ctx.reloj.avanzar({ min: 30 }); // la última petición REST fue el login
    sse.cerrar(); // corte de Wi-Fi
    await new Promise((r) => setTimeout(r, 300));
    ctx.reloj.avanzar({ s: 5 });
    const otra = await conCola(cookie); // reconexión: 200 y hello
    expect(otra.status).toBe(200);
    expect((await me(cookie)).status).toBe(200);
  });
});

describe('Peticiones pasivas: X-Activity: passive (SEC-030)', () => {
  test('[HU-01/CA-F09][RS-12] GET /auth/me pasivo a los 14 min → 200 sin renovar; a los 15 min de la última activa → 401 idle', async () => {
    const { id, cookie } = await entrar('waiter');
    const t0 = await actividadDe(id);
    ctx.reloj.avanzar({ min: 14 });
    const r = await mePasiva(cookie);
    expect(r.status).toBe(200);
    expect(await actividadDe(id), 'la pasiva no escribe last_activity_at').toBe(t0);
    ctx.reloj.avanzar({ min: 1 });
    // También la pasiva pasa por la comprobación de inactividad.
    esperar401(await mePasiva(cookie), { reason: 'idle' });
    esperar401(await me(cookie), { reason: 'idle' });
  });

  test('[HU-01/CA-F09][RS-12] control: la misma petición sin la cabecera renueva la sesión', async () => {
    const { id, cookie } = await entrar('waiter');
    ctx.reloj.avanzar({ min: 14 });
    expect((await me(cookie)).status).toBe(200);
    expect(await actividadDe(id)).toBe(ctx.reloj.now().getTime());
    ctx.reloj.avanzar({ min: 1 });
    expect((await me(cookie)).status).toBe(200);
  });

  test.each([['other'], ['Passive'], ['PASSIVE'], ['active'], ['passive, x'], ['passive;x']])(
    '[HU-01/CA-F09][RS-12] X-Activity: %s no es el valor exacto → cuenta como actividad, sin error',
    async (valor) => {
      const { id, cookie } = await entrar('waiter');
      ctx.reloj.avanzar({ min: 14 });
      const r = await pedir(ctx, { ruta: '/auth/me', cookie, cabeceras: { 'x-activity': valor } });
      expect(r.status).toBe(200);
      expect(await actividadDe(id)).toBe(ctx.reloj.now().getTime());
      ctx.reloj.avanzar({ min: 1 });
      expect((await me(cookie)).status).toBe(200);
    },
  );

  test('[HU-01/CA-F09][RS-12] POST /session/activity con X-Activity: passive no renueva (regla uniforme, sin lista de rutas)', async () => {
    const { id, cookie } = await entrar('waiter');
    const t0 = await actividadDe(id);
    ctx.reloj.avanzar({ min: 10 });
    const r = await pedir(ctx, { metodo: 'POST', ruta: '/session/activity', cookie, pasiva: true });
    expect(r.status).toBe(204);
    expect(await actividadDe(id)).toBe(t0);
    ctx.reloj.avanzar({ min: 5 }); // 15 min desde el login, la última activa
    esperar401(await me(cookie), { reason: 'idle' });
  });
});

describe('Escrituras del hub para la barra (T-43, kitchenActivityIntervalMs corto)', () => {
  const INTERVALO_MS = 20;
  /** Varias vueltas del temporizador (tiempo real; el reloj de la app no avanza solo). */
  const VARIAS_VUELTAS_MS = 15 * INTERVALO_MS;
  beforeEach(async () => {
    await ctx.cerrar();
    ctx = await montarApp({ kitchenActivityIntervalMs: INTERVALO_MS });
  });

  test('[HU-01/CA-F09][RS-12] con la cola abierta, el temporizador escribe la hora del Clock (no la de la BD) en la sesión de barra', async () => {
    const { id, cookie } = await entrar('kitchen');
    await conCola(cookie);
    ctx.reloj.avanzar({ min: 5 });
    const t1 = ctx.reloj.now().getTime();
    await expect.poll(() => actividadDe(id), { timeout: 2000, interval: 10 }).toBe(t1);
    ctx.reloj.avanzar({ min: 3 });
    const t2 = ctx.reloj.now().getTime();
    await expect.poll(() => actividadDe(id), { timeout: 2000, interval: 10 }).toBe(t2);
  });

  test('[HU-01/CA-F09][RS-12] no escribe en una sesión de barra revocada aunque su flujo siga abierto', async () => {
    const { id, cookie } = await entrar('kitchen');
    await conCola(cookie);
    const [s] = await sesionesDe(ctx.bd, id);
    await dormir(VARIAS_VUELTAS_MS);
    const antes = await actividadDe(id);
    await fabricarRevocada(ctx.bd, s.id, ctx.reloj.now());
    ctx.reloj.avanzar({ min: 5 });
    await dormir(VARIAS_VUELTAS_MS);
    expect(await actividadDe(id)).toBe(antes);
  });

  test('[HU-01/CA-F09][RS-12][HU-01/CA-N06] no escribe en una sesión de barra caducada (expires_at <= ahora)', async () => {
    const { id, cookie } = await entrar('kitchen');
    await conCola(cookie);
    const [s] = await sesionesDe(ctx.bd, id);
    await dormir(VARIAS_VUELTAS_MS);
    const antes = await actividadDe(id);
    await fabricarCaducidad(ctx.bd, s.id, new Date(ctx.reloj.now().getTime() + 60_000));
    ctx.reloj.avanzar({ min: 2 });
    await dormir(VARIAS_VUELTAS_MS);
    expect(await actividadDe(id)).toBe(antes);
  });

  test('[HU-01/CA-F09][RS-12] no escribe en la sesión de un encargado con la cola abierta', async () => {
    const { id, cookie } = await entrar('manager');
    await conCola(cookie);
    const antes = await actividadDe(id);
    ctx.reloj.avanzar({ min: 5 });
    await dormir(VARIAS_VUELTAS_MS);
    expect(await actividadDe(id)).toBe(antes);
  });

  test('[HU-01/CA-F09][RS-12] no escribe en una sesión de barra cuyo usuario ya no es barra (users.role)', async () => {
    const { id, cookie } = await entrar('kitchen');
    await conCola(cookie);
    await dormir(VARIAS_VUELTAS_MS);
    const antes = await actividadDe(id);
    await fabricarRol(ctx.bd, id, 'waiter');
    ctx.reloj.avanzar({ min: 5 });
    await dormir(VARIAS_VUELTAS_MS);
    expect(await actividadDe(id)).toBe(antes);
  });
});

describe('Cierre de un flujo de barra revocado (2.1i)', () => {
  // Intervalo por defecto (60 s): el temporizador no llega a dispararse y
  // cualquier escritura vendría del cierre del flujo.
  test('[HU-01/CA-F09][HU-01/CA-F13] al revocarse la sesión (bloqueo indefinido) y cerrarse el flujo, el hub no escribe last_activity_at', async () => {
    const { id, cookie, nombre, pin } = await entrar('kitchen');
    const sse = await conCola(cookie);
    const t0 = await actividadDe(id);
    await fabricarBloqueo(ctx.bd, id, { fallos: 19 });
    ctx.reloj.avanzar({ min: 5 });
    // El 20.º fallo, desde otro dispositivo, revoca todas las sesiones y cierra el flujo.
    expect((await iniciarSesion(ctx, nombre, pinIncorrecto(pin), IP_B)).res.status).toBe(401);
    await sse.esperar('session.revoked', 2000);
    await sse.esperarCierre(2000);
    await dormir(300);
    expect(await actividadDe(id)).toBe(t0);
    esperar401(await me(cookie), { reason: 'revoked', revokedReason: 'account_locked_manual' });
  });
});

describe('Motivo del 401 (details.reason)', () => {
  test('[HU-01/CA-F08] sin cookie o con un token desconocido: 401 UNAUTHENTICATED sin details', async () => {
    esperar401(await pedir(ctx, { ruta: '/auth/me' }), null);
    esperar401(await me('__Host-sid=' + 'A'.repeat(43)), null);
  });

  test('[HU-01/CA-F08] tras logout: 401 con reason revoked y revokedReason logout', async () => {
    const { cookie } = await entrar('waiter');
    await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout', cookie });
    esperar401(await me(cookie), { reason: 'revoked', revokedReason: 'logout' });
  });
});

describe('Caducidad absoluta de 12 h', () => {
  test('[HU-01/CA-N06][RS-13] /auth/me expone session.expiresAt = inicio + 12 h', async () => {
    const t0 = ctx.reloj.now().getTime();
    const { id, cookie } = await entrar('waiter');
    const r = await me(cookie);
    expect(r.body.session.expiresAt).toBe(new Date(t0 + 12 * 3600_000).toISOString());
    const [s] = await sesionesDe(ctx.bd, id);
    expect(s.expires_at.getTime()).toBe(t0 + 12 * 3600_000);
  });

  for (const rol of ['waiter', 'manager'] as Rol[]) {
    test(`[HU-01/CA-N06][RS-13] ${rol} con actividad constante: vale hasta las 11:59:59 y a las 12:00:00 exactas → 401 reason absolute`, async () => {
      const { id, cookie } = await entrar(rol);
      for (let i = 0; i < 71; i++) {
        ctx.reloj.avanzar({ min: 10 });
        expect((await me(cookie)).status, `${(i + 1) * 10} min`).toBe(200);
      }
      // 11 h 50 min; +9 min 59 s → 11:59:59
      ctx.reloj.avanzar({ min: 9, s: 59 });
      expect((await me(cookie)).status).toBe(200);
      ctx.reloj.avanzar({ s: 1 });
      esperar401(await me(cookie), { reason: 'absolute' });
      const ev = ctx.logs.eventos('auth.session.expired').filter((e) => e.user_id === id);
      expect(ev.at(-1)?.reason).toBe('absolute');
    });
  }

  test('[HU-01/CA-N06][RS-13] barra con la cola abierta también caduca a las 12 h; reabrir el flujo → 401', async () => {
    const { cookie } = await entrar('kitchen');
    await conCola(cookie);
    ctx.reloj.avanzar({ h: 12 });
    esperar401(await me(cookie), { reason: 'absolute' });
    expect((await abrirSse(base!, cookie)).status).toBe(401);
  });
});

describe('SESSION_MAX_HOURS en buildApp (AppDeps.sessionMaxHours)', () => {
  test('[HU-01/CA-N06][RS-13] con sessionMaxHours = 1: expires_at = inicio + 1 h y a la hora exacta → 401 absolute', async () => {
    await ctx.cerrar();
    ctx = await montarApp({ sessionMaxHours: 1 });
    const t0 = ctx.reloj.now().getTime();
    const { id, cookie } = await entrar('kitchen');
    await conCola(cookie); // tampoco la barra con la cola abierta escapa
    const [s] = await sesionesDe(ctx.bd, id);
    expect(s.expires_at.getTime()).toBe(t0 + 3600_000);
    expect((await me(cookie)).body.session.expiresAt).toBe(new Date(t0 + 3600_000).toISOString());
    ctx.reloj.avanzar({ min: 59, s: 59 });
    expect((await me(cookie)).status).toBe(200);
    ctx.reloj.avanzar({ s: 1 });
    esperar401(await me(cookie), { reason: 'absolute' });
  });

  test.each([[0], [13], [24], [1.5], [-1]])(
    '[HU-01/CA-N06][RS-13] buildApp rechaza sessionMaxHours = %s (defensa en profundidad)',
    async (horas) => {
      // Debe rechazar al validar, antes de abrir el pool. Si por error arranca,
      // se cierra para no dejar conexiones de app_rw (impedirían el DROP).
      let app: { close(): Promise<void> } | undefined;
      let error: unknown;
      try {
        app = (await buildApp(depsApp({ sessionMaxHours: horas }) as never)) as unknown as { close(): Promise<void> };
      } catch (e) {
        error = e;
      }
      await app?.close();
      expect(error, `sessionMaxHours = ${horas} debería impedir el arranque`).toBeInstanceOf(Error);
    },
  );
});

describe('kitchenActivityIntervalMs en buildApp (T-43)', () => {
  async function intentar(extra: Record<string, unknown>): Promise<unknown> {
    let app: { close(): Promise<void> } | undefined;
    let error: unknown;
    try {
      app = (await buildApp(depsApp(extra) as never)) as unknown as { close(): Promise<void> };
    } catch (e) {
      error = e;
    }
    await app?.close();
    return error;
  }

  test.each([[0], [9], [60_001], [10.5], [-1]])(
    '[HU-01/CA-F09] buildApp rechaza kitchenActivityIntervalMs = %s con ConfigError("kitchenActivityIntervalMs")',
    async (ms) => {
      const e = await intentar({ kitchenActivityIntervalMs: ms });
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as ConfigError).variable).toBe('kitchenActivityIntervalMs');
    },
  );

  test.each([[10], [60_000]])('[HU-01/CA-F09] buildApp acepta kitchenActivityIntervalMs = %s (límites del rango)', async (ms) => {
    expect(await intentar({ kitchenActivityIntervalMs: ms })).toBeUndefined();
  });
});
