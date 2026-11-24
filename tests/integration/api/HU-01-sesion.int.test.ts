// HU-01/CA-F09 (inactividad 15 min) y CA-N06 (caducidad absoluta 12 h); RS-12, RS-13.
// Con FakeClock. Cuenta como actividad cualquier petición REST (salvo
// /telemetry) y POST /session/activity; no el flujo SSE ni sus ping. Rol barra:
// sin caducidad por inactividad mientras su flujo SSE está abierto.
// last_activity_at se actualiza como mucho cada 30 s (docs/arquitectura.md §7):
// los tests espacian las peticiones más de 30 s para no depender de eso.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { pedir, sesion } from '../../support/http.ts';
import { crearUsuario, type Rol } from '../../support/fixtures.ts';
import { sesionesDe } from '../../support/bd.ts';
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

async function entrar(rol: Rol): Promise<{ id: string; cookie: string }> {
  const u = await crearUsuario(ctx, { rol });
  return { id: u.id, cookie: await sesion(ctx, u.nombre, u.pin) };
}
const me = (cookie: string) => pedir(ctx, { ruta: '/auth/me', cookie });

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
    test(`[HU-01/CA-F09][RS-12] ${rol}: a 14 min 59 s sin actividad sigue; 15 min 1 s después de la última → 401`, async () => {
      const { id, cookie } = await entrar(rol);
      ctx.reloj.avanzar({ min: 14, s: 59 });
      expect((await me(cookie)).status).toBe(200); // esta petición es actividad
      ctx.reloj.avanzar({ min: 15, s: 1 });
      expect((await me(cookie)).status).toBe(401);
      const ev = ctx.logs.eventos('auth.session.expired').filter((e) => e.user_id === id);
      expect(ev).toHaveLength(1);
      expect(ev[0].reason).toBe('idle');
    });
  }

  test('[HU-01/CA-F09][RS-12] POST /session/activity cuenta como actividad', async () => {
    const { cookie } = await entrar('waiter');
    ctx.reloj.avanzar({ min: 10 });
    const r = await pedir(ctx, { metodo: 'POST', ruta: '/session/activity', cookie });
    expect([200, 204]).toContain(r.status);
    ctx.reloj.avanzar({ min: 10 }); // 20 min desde el login, 10 desde la actividad
    expect((await me(cookie)).status).toBe(200);
  });

  test('[HU-01/CA-F09][RS-12] encargado con la cola abierta (SSE) también caduca: el flujo y sus ping no son actividad', async () => {
    const { cookie } = await entrar('manager');
    await conCola(cookie);
    ctx.reloj.avanzar({ min: 15, s: 1 });
    expect((await me(cookie)).status).toBe(401);
  });

  test('[HU-01/CA-F09][RS-12] camarero con el flujo SSE abierto también caduca', async () => {
    const { cookie } = await entrar('waiter');
    await conCola(cookie);
    ctx.reloj.avanzar({ min: 15, s: 1 });
    expect((await me(cookie)).status).toBe(401);
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
    ctx.reloj.avanzar({ min: 15, s: 1 });
    expect((await me(cookie)).status).toBe(401);
  });

  test('[HU-01/CA-F09][RS-12] barra que cierra la cola: desde entonces vuelve a contar la inactividad', async () => {
    const { cookie } = await entrar('kitchen');
    const sse = await conCola(cookie);
    ctx.reloj.avanzar({ min: 40 });
    sse.cerrar();
    await new Promise((r) => setTimeout(r, 200)); // que el servidor registre el cierre del flujo
    ctx.reloj.avanzar({ min: 15, s: 1 });
    expect((await me(cookie)).status).toBe(401);
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
    test(`[HU-01/CA-N06][RS-13] ${rol} con actividad constante: vale hasta las 11:59:59 y a las 12:00:01 → 401`, async () => {
      const { id, cookie } = await entrar(rol);
      for (let i = 0; i < 71; i++) {
        ctx.reloj.avanzar({ min: 10 });
        expect((await me(cookie)).status, `${(i + 1) * 10} min`).toBe(200);
      }
      // 11 h 50 min; +9 min 59 s → 11:59:59
      ctx.reloj.avanzar({ min: 9, s: 59 });
      expect((await me(cookie)).status).toBe(200);
      ctx.reloj.avanzar({ s: 2 });
      expect((await me(cookie)).status).toBe(401);
      const ev = ctx.logs.eventos('auth.session.expired').filter((e) => e.user_id === id);
      expect(ev.at(-1)?.reason).toBe('absolute');
    });
  }

  test('[HU-01/CA-N06][RS-13] barra con la cola abierta también caduca a las 12 h; reabrir el flujo → 401', async () => {
    const { cookie } = await entrar('kitchen');
    await conCola(cookie);
    ctx.reloj.avanzar({ h: 12, s: 1 });
    expect((await me(cookie)).status).toBe(401);
    expect((await abrirSse(base!, cookie)).status).toBe(401);
  });
});
