// HU-01/CA-F08; RS-14. Flujo SSE: sin sesión → 401; `hello` al conectar; al
// cerrar sesión el servidor envía session.revoked y cierra el flujo en ≤ 1 s.
// (El bloqueo indefinido, CA-F13, está en tests/integration/api/HU-01-verify-pin.int.test.ts.)
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { pedir, sesion } from '../../support/http.ts';
import { crearUsuario } from '../../support/fixtures.ts';
import { abrirSse } from '../../support/sse.ts';

let ctx: Ctx;
let base: string;
beforeEach(async () => {
  ctx = await montarApp();
  base = await ctx.escuchar();
});
afterEach(async () => {
  await ctx?.cerrar();
});

describe('Flujo SSE y sesión', () => {
  test('[HU-01/CA-F08][RS-14] sin sesión o con cookie inventada → 401', async () => {
    expect((await abrirSse(base, undefined)).status).toBe(401);
    expect((await abrirSse(base, '__Host-sid=' + 'A'.repeat(43))).status).toBe(401);
  });

  test('[HU-01/CA-F08] al conectar llega hello con serverTime y businessDate', async () => {
    const u = await crearUsuario(ctx, { rol: 'kitchen' });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    const sse = await abrirSse(base, cookie);
    try {
      const hello = await sse.esperar('hello', 2000);
      expect(hello.data).toMatchObject({ serverTime: ctx.reloj.now().toISOString(), businessDate: '2026-11-24' });
    } finally {
      sse.cerrar();
    }
  });

  test('[HU-01/CA-F08][RS-14] cerrar sesión cierra el flujo de esa sesión en ≤ 1 s, con session.revoked', async () => {
    const u = await crearUsuario(ctx, { rol: 'kitchen' });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    const sse = await abrirSse(base, cookie);
    await sse.esperar('hello', 2000);
    const t0 = performance.now();
    await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout', cookie });
    const ev = await sse.esperar('session.revoked', 1000);
    const cierre = await sse.esperarCierre(1000);
    expect(ev.llegada - t0).toBeLessThanOrEqual(1000);
    expect(cierre - t0).toBeLessThanOrEqual(1000);
    // Mismo valor que details.revokedReason del 401 (docs/arquitectura.md §5, §6).
    expect(ev.data).toMatchObject({ reason: 'logout' });
    expect((await abrirSse(base, cookie)).status).toBe(401);
  });

  test('[HU-01/CA-F08][RS-14] cerrar una sesión no cierra el flujo de otra sesión del mismo usuario', async () => {
    const u = await crearUsuario(ctx, { rol: 'kitchen' });
    const c1 = await sesion(ctx, u.nombre, u.pin);
    const c2 = await sesion(ctx, u.nombre, u.pin);
    const sse2 = await abrirSse(base, c2);
    try {
      await sse2.esperar('hello', 2000);
      await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout', cookie: c1 });
      // Sigue vivo: llega al menos un ping después (cada 2 s).
      const n = sse2.eventos.length;
      await sse2.esperar('ping', 3000);
      await expect.poll(() => sse2.eventos.length, { timeout: 3000 }).toBeGreaterThan(n);
      expect(sse2.eventos.some((e) => e.event === 'session.revoked')).toBe(false);
    } finally {
      sse2.cerrar();
    }
  });
});
