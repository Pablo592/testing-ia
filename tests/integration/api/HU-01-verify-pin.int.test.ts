// HU-01/CA-F12, CA-F13 (I-01, I-12); HU-07/CA-F04 (cambio obligatorio del PIN);
// RS-14, RS-15, RS-16b. Casos P-1..P-8 de docs/testing.md §5.2.1 y la
// revocación de todas las sesiones a los 20 fallos.
//
// En HU-01 la única verificación del PIN propio con sesión abierta es el
// `currentPin` de POST /auth/pin (sesión con PIN provisional). Las variantes
// con `confirmPin` (HU-04/CA-F23, HU-07/CA-N04) y `managerApproval` (HU-06) se
// añaden en los ficheros de esas historias cuando empiecen (tests/support/alcance.ts).
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import {
  codigo,
  esperar401,
  incidencias,
  incidenciasDe,
  IP_A,
  IP_B,
  IP_C,
  IP_D,
  iniciarSesion,
  ipUnica,
  pedir,
  reintentarEn,
  sesion,
  type Resp,
} from '../../support/http.ts';
import { crearUsuario, pinAleatorio, pinIncorrecto, type UsuarioPrueba } from '../../support/fixtures.ts';
import { sesionesDe, usuario } from '../../support/bd.ts';
import { valorMetrica } from '../../support/metricas.ts';
import { abrirSse } from '../../support/sse.ts';

let ctx: Ctx;
beforeEach(async () => {
  ctx = await montarApp();
});
afterEach(async () => {
  await ctx?.cerrar();
});

function cambiarPin(cookie: string, currentPin: string, newPin: string, ip = IP_A): Promise<Resp> {
  return pedir(ctx, { metodo: 'POST', ruta: '/auth/pin', cookie, ip, cuerpo: { currentPin, newPin } });
}

async function provisional(rol: 'waiter' | 'kitchen' | 'manager' = 'manager', extra = {}): Promise<{ u: UsuarioPrueba; cookie: string }> {
  const u = await crearUsuario(ctx, { rol, pinProvisional: true, ...extra });
  const cookie = await sesion(ctx, u.nombre, u.pin, IP_A);
  return { u, cookie };
}

/** Bloqueo de 5 min de la cuenta por 5 logins fallidos desde la IP B (otro dispositivo). */
async function bloquearDesdeOtroDispositivo(u: UsuarioPrueba): Promise<void> {
  for (let i = 0; i < 5; i++) await iniciarSesion(ctx, u.nombre, pinIncorrecto(u.pin), IP_B);
}

describe('Sesión con PIN provisional (HU-01, dependencia del encargado inicial)', () => {
  test('[HU-07/CA-F04][RS-15] login con PIN provisional: mustChangePin y solo /auth/me, /auth/pin y /auth/logout', async () => {
    const u = await crearUsuario(ctx, { rol: 'manager', pinProvisional: true });
    const { res, cookie } = await iniciarSesion(ctx, u.nombre, u.pin);
    expect(res.status).toBe(200);
    expect(res.body.user.mustChangePin).toBe(true);
    const me = await pedir(ctx, { ruta: '/auth/me', cookie });
    expect(me.status).toBe(200);
    expect(me.body.user.mustChangePin).toBe(true);
    const actividad = await pedir(ctx, { metodo: 'POST', ruta: '/session/activity', cookie });
    expect(actividad.status).toBe(403);
    expect(codigo(actividad)).toBe('PIN_CHANGE_REQUIRED');
  });

  test('[HU-07/CA-F04][RS-15] GET /events con PIN provisional → 403 PIN_CHANGE_REQUIRED', async () => {
    const { cookie } = await provisional();
    const base = await ctx.escuchar();
    const sse = await abrirSse(base, cookie);
    expect(sse.status).toBe(403);
  });
});

describe('POST /auth/pin: cambio obligatorio del PIN provisional (P-1..P-4)', () => {
  test('[HU-01/CA-F12][RS-16b] P-1 sin PIN provisional → 403 FORBIDDEN, sin verificar ni contar', async () => {
    const m = await crearUsuario(ctx, { rol: 'manager' });
    const cookie = await sesion(ctx, m.nombre, m.pin, IP_A);
    const antes = ctx.hasher.verificaciones;
    const verifAntes = await ctx.app.metricsText();
    for (let i = 0; i < 12; i++) {
      const r = await cambiarPin(cookie, i % 2 ? m.pin : pinIncorrecto(m.pin), pinAleatorio('manager'));
      expect(r.status).toBe(403);
      expect(codigo(r)).toBe('FORBIDDEN');
      expect(r.body.error.details).toBeUndefined();
    }
    expect(ctx.hasher.verificaciones).toBe(antes);
    expect(ctx.hasher.hashes).toBe(0);
    expect((await usuario(ctx.bd, m.id)).failed_attempts).toBe(0);
    // La IP A no ha sumado: admite 9 fallos de login sin 429 y el siguiente acierto entra.
    const otro = await crearUsuario(ctx, { rol: 'waiter' });
    const victimas = [await crearUsuario(ctx, { rol: 'waiter' }), await crearUsuario(ctx, { rol: 'waiter' }), await crearUsuario(ctx, { rol: 'waiter' })];
    for (let i = 0; i < 9; i++) {
      const v = victimas[i % 3];
      expect((await iniciarSesion(ctx, v.nombre, pinIncorrecto(v.pin), IP_A)).res.status).toBe(401);
    }
    expect((await iniciarSesion(ctx, otro.nombre, otro.pin, IP_A)).res.status).toBe(200);
    // Log y métricas (docs/logging.md §3.2, §6.3).
    const ev = ctx.logs.eventos('auth.pin.change_failed').filter((e) => e.user_id === m.id);
    expect(ev.length).toBe(12);
    expect(ev.every((e) => e.reason === 'not_provisional')).toBe(true);
    const metricas = await ctx.app.metricsText();
    expect(valorMetrica(metricas, 'auth_pin_change_rejected_total', { reason: 'not_provisional' })).toBe(12);
    expect(valorMetrica(metricas, 'auth_verifications_total', { purpose: 'change' })).toBe(
      valorMetrica(verifAntes, 'auth_verifications_total', { purpose: 'change' }),
    );
  });

  test('[HU-07/CA-F04][RS-14] P-2 currentPin correcto y newPin válido → 204; revoca las demás sesiones; esta sigue y ya entra', async () => {
    const { u, cookie } = await provisional('manager');
    const otraB = await sesion(ctx, u.nombre, u.pin, IP_B);
    const otraC = await sesion(ctx, u.nombre, u.pin, IP_C);
    const nuevo = pinAleatorio('manager');
    const hashesAntes = ctx.hasher.hashes;
    const r = await cambiarPin(cookie, u.pin, nuevo);
    expect(r.status).toBe(204);
    expect(ctx.hasher.hashes - hashesAntes).toBe(1); // hashNewPin, una vez
    expect((await usuario(ctx.bd, u.id)).must_change_pin).toBe(false);
    esperar401(await pedir(ctx, { ruta: '/auth/me', cookie: otraB }), { reason: 'revoked', revokedReason: 'pin_changed' });
    esperar401(await pedir(ctx, { ruta: '/auth/me', cookie: otraC }), { reason: 'revoked', revokedReason: 'pin_changed' });
    const me = await pedir(ctx, { ruta: '/auth/me', cookie });
    expect(me.status).toBe(200);
    expect(me.body.user.mustChangePin).toBe(false);
    expect((await pedir(ctx, { metodo: 'POST', ruta: '/session/activity', cookie })).status).not.toBe(403);
    // El PIN nuevo entra y el provisional ya no.
    expect((await iniciarSesion(ctx, u.nombre, nuevo)).res.status).toBe(200);
    expect((await iniciarSesion(ctx, u.nombre, u.pin)).res.status).toBe(401);
    expect(ctx.logs.eventos('auth.pin.changed').some((e) => e.user_id === u.id && e.sessions_revoked === 2)).toBe(true);
  });

  test('[HU-01/CA-F12][RS-16b] P-3 currentPin incorrecto → 403 PIN_INVALID; la sesión sigue; cuenta un fallo', async () => {
    const { u, cookie } = await provisional('waiter');
    const r = await cambiarPin(cookie, pinIncorrecto(u.pin), pinAleatorio('waiter'));
    expect(r.status).toBe(403);
    expect(codigo(r)).toBe('PIN_INVALID');
    expect((await pedir(ctx, { ruta: '/auth/me', cookie })).status).toBe(200);
    expect((await usuario(ctx.bd, u.id)).failed_attempts).toBe(1);
    const ev = ctx.logs.eventos('auth.pin.change_failed').filter((e) => e.user_id === u.id);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ reason: 'wrong_current', failed_attempts: 1 });
  });

  test.each([
    ['manager', '48317', 'manager_length'],
    ['manager', '111111', 'all_same'],
    ['manager', '123456', 'sequence'],
    ['manager', '121212', 'repeated_block'],
    ['manager', '147258', 'common'],
    ['waiter', '483', 'length'],
    ['waiter', '9876', 'sequence'],
    ['waiter', '48a1', 'digits_only'],
    ['kitchen', '381234', 'sequence'],
  ] as const)('[HU-01/CA-N01][RS-01][RS-02] P-4 %s con newPin "%s" → 400 (%s); el PIN no cambia', async (rol, newPin, regla) => {
    const { u, cookie } = await provisional(rol);
    const hashAntes = (await usuario(ctx.bd, u.id)).pin_hash;
    const hashesAntes = ctx.hasher.hashes;
    const r = await cambiarPin(cookie, u.pin, newPin);
    expect(r.status).toBe(400);
    expect(codigo(r)).toBe('VALIDATION_FAILED');
    // Una sola incidencia por campo: la primera regla que falla (docs/arquitectura.md §5, §7).
    expect(incidenciasDe(r, ['newPin'])).toEqual([{ path: ['newPin'], rule: regla }]);
    expect(r.raw).not.toContain(newPin);
    // hashNewPin valida antes de calcular el hash.
    expect(ctx.hasher.hashes).toBe(hashesAntes);
    const fila = await usuario(ctx.bd, u.id);
    expect(fila.pin_hash).toBe(hashAntes);
    expect(fila.must_change_pin).toBe(true);
  });
});

describe('Bloqueo temporal con la sesión abierta (CA-F12)', () => {
  test('[HU-01/CA-F12][RS-16b] P-5 cuenta bloqueada desde otro dispositivo: la sesión sigue; currentPin correcto → 423 LOCKED sin verificar ni contar', async () => {
    const { u, cookie } = await provisional('manager');
    await bloquearDesdeOtroDispositivo(u);

    // (a) la sesión sigue abierta.
    expect((await pedir(ctx, { ruta: '/auth/me', cookie })).status).toBe(200);

    // (c) se rechaza sin comprobar el PIN, aunque sea correcto, y no cuenta.
    const antes = ctx.hasher.verificaciones;
    const retries: number[] = [];
    for (let i = 0; i < 10; i++) {
      const r = await cambiarPin(cookie, i % 2 ? u.pin : pinIncorrecto(u.pin), pinAleatorio('manager'));
      expect(r.status, `intento ${i}`).toBe(423);
      expect(codigo(r)).toBe('LOCKED');
      retries.push(reintentarEn(r)!);
      ctx.reloj.avanzar({ s: 10 });
    }
    expect(ctx.hasher.verificaciones).toBe(antes);
    expect(retries[0]).toBe(300);
    expect(retries).toEqual([...retries].sort((a, b) => b - a));
    const fila = await usuario(ctx.bd, u.id);
    expect(fila.failed_attempts).toBe(5);
    expect(fila.must_change_pin).toBe(true);

    // Los 423 no contaron para la IP A: admite 9 fallos de login y el siguiente acierto entra.
    const victimas = [await crearUsuario(ctx, { rol: 'waiter' }), await crearUsuario(ctx, { rol: 'waiter' }), await crearUsuario(ctx, { rol: 'waiter' })];
    for (let i = 0; i < 9; i++) {
      const v = victimas[i % 3];
      await iniciarSesion(ctx, v.nombre, pinIncorrecto(v.pin), IP_A);
    }
    const otro = await crearUsuario(ctx, { rol: 'kitchen' });
    expect((await iniciarSesion(ctx, otro.nombre, otro.pin, IP_A)).res.status).toBe(200);

    // Registro: auth.verify.locked con purpose change; métricas locked +10, invalid sin cambio.
    const ev = ctx.logs.eventos('auth.verify.locked').filter((e) => e.target_user_id === u.id && e.purpose === 'change');
    expect(ev).toHaveLength(10);
    expect(ev.every((e) => e.lock_kind === 'temporary')).toBe(true);
    const metricas = await ctx.app.metricsText();
    expect(valorMetrica(metricas, 'auth_verifications_total', { purpose: 'change', result: 'locked' })).toBe(10);
    expect(valorMetrica(metricas, 'auth_verifications_total', { purpose: 'change', result: 'invalid' })).toBe(0);
  });

  test('[HU-01/CA-F12] (d) al terminar el bloqueo se puede volver a intentar: currentPin correcto → 204 y contador a 0', async () => {
    const { u, cookie } = await provisional('manager');
    await bloquearDesdeOtroDispositivo(u);
    ctx.reloj.avanzar({ min: 5 });
    const r = await cambiarPin(cookie, u.pin, pinAleatorio('manager'));
    expect(r.status).toBe(204);
    expect((await usuario(ctx.bd, u.id)).failed_attempts).toBe(0);
  });

  test.each([
    [10, 15],
    [15, 60],
  ])('[HU-01/CA-F12] bloqueo de %i fallos (%i min) fabricado en BD: 423 con su tiempo y, al acabar, se puede reintentar', async (fallos, minutos) => {
    const { u, cookie } = await provisional('waiter');
    await ctx.bd.query('UPDATE users SET failed_attempts = $2, locked_until = $3 WHERE id = $1', [
      u.id,
      fallos,
      new Date(ctx.reloj.now().getTime() + minutos * 60_000),
    ]);
    const r = await cambiarPin(cookie, u.pin, pinAleatorio('waiter'));
    expect(r.status).toBe(423);
    expect(reintentarEn(r)).toBe(minutos * 60);
    ctx.reloj.avanzar({ min: minutos });
    expect((await cambiarPin(cookie, u.pin, pinAleatorio('waiter'))).status).toBe(204);
  });

  test('[HU-01/CA-F12][RS-16b][I-12] P-6 5 currentPin erróneos en la misma sesión: el 5.º da el mensaje normal; el 6.º (correcto) → 423, no 429; a los 5 min → 204', async () => {
    const { u, cookie } = await provisional('manager');
    for (let i = 1; i <= 5; i++) {
      const r = await cambiarPin(cookie, pinIncorrecto(u.pin), pinAleatorio('manager'));
      expect(r.status, `fallo ${i}`).toBe(403);
      expect(codigo(r)).toBe('PIN_INVALID'); // (b): el que activa el bloqueo da el error normal
    }
    const antes = ctx.hasher.verificaciones;
    const sexto = await cambiarPin(cookie, u.pin, pinAleatorio('manager'));
    expect(sexto.status).toBe(423);
    expect(codigo(sexto)).toBe('LOCKED');
    expect(reintentarEn(sexto)).toBe(300);
    expect(ctx.hasher.verificaciones).toBe(antes);
    ctx.reloj.avanzar({ min: 5 });
    expect((await cambiarPin(cookie, u.pin, pinAleatorio('manager'))).status).toBe(204);
  });

  test('[HU-01/CA-F11][RS-16b] P-7 con la IP limitada, currentPin correcto → 429 sin hash; otra sesión provisional desde la IP B → 204', async () => {
    const { u, cookie } = await provisional('waiter');
    const victimas = [await crearUsuario(ctx, { rol: 'waiter' }), await crearUsuario(ctx, { rol: 'waiter' }), await crearUsuario(ctx, { rol: 'waiter' })];
    for (let i = 0; i < 10; i++) {
      const v = victimas[i % 3];
      await iniciarSesion(ctx, v.nombre, pinIncorrecto(v.pin), IP_A);
    }
    const antes = ctx.hasher.verificaciones;
    const r = await cambiarPin(cookie, u.pin, pinAleatorio('waiter'), IP_A);
    expect(r.status).toBe(429);
    expect(codigo(r)).toBe('TOO_MANY_ATTEMPTS');
    expect(reintentarEn(r)).toBe(600);
    expect(ctx.hasher.verificaciones).toBe(antes);
    expect((await usuario(ctx.bd, u.id)).must_change_pin).toBe(true);

    const otro = await crearUsuario(ctx, { rol: 'kitchen', pinProvisional: true });
    const cookieB = await sesion(ctx, otro.nombre, otro.pin, IP_B);
    expect((await cambiarPin(cookieB, otro.pin, pinAleatorio('kitchen'), IP_B)).status).toBe(204);
  });
});

describe('Bloqueo indefinido: se revocan todas las sesiones de la cuenta (CA-F13)', () => {
  test('[HU-01/CA-F13][RS-14][RS-16b] P-8 20.º fallo desde la propia sesión (currentPin) → 423 ACCOUNT_LOCKED_MANUAL y todas sus sesiones 401', async () => {
    const { u, cookie } = await provisional('manager');
    const otraB = await sesion(ctx, u.nombre, u.pin, IP_B);
    const otraC = await sesion(ctx, u.nombre, u.pin, IP_C);
    // Los aciertos de login ponen el contador a 0: el 19 se fabrica después.
    await ctx.bd.query('UPDATE users SET failed_attempts = 19 WHERE id = $1', [u.id]);

    const r = await cambiarPin(cookie, pinIncorrecto(u.pin), pinAleatorio('manager'));
    expect(r.status).toBe(423);
    expect(codigo(r)).toBe('ACCOUNT_LOCKED_MANUAL');
    // Sin espera que termine sola: ni retryAfterSeconds ni Retry-After.
    expect(reintentarEn(r)).toBeUndefined();
    expect(r.headers['retry-after']).toBeUndefined();

    const fila = await usuario(ctx.bd, u.id);
    expect(fila.locked_manual).toBe(true);
    expect(fila.failed_attempts).toBe(20);
    const sesiones = await sesionesDe(ctx.bd, u.id);
    expect(sesiones).toHaveLength(3);
    expect(sesiones.every((s) => s.revoked_at !== null)).toBe(true);
    // Las tres en la misma transacción.
    expect(new Set(sesiones.map((s) => s.revoked_at!.getTime())).size).toBe(1);
    for (const c of [cookie, otraB, otraC]) {
      esperar401(await pedir(ctx, { ruta: '/auth/me', cookie: c }), { reason: 'revoked', revokedReason: 'account_locked_manual' });
    }

    const ev = ctx.logs.eventos('auth.sessions.revoked').filter((e) => e.target_user_id === u.id);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ reason: 'account_locked_manual', purpose: 'change', sessions_revoked: 3, from_own_session: true });
    // Al intentar entrar: cuenta bloqueada (mensaje "Pide al encargado…" en la UI).
    const login = (await iniciarSesion(ctx, u.nombre, u.pin)).res;
    expect(login.status).toBe(423);
    expect(codigo(login)).toBe('ACCOUNT_LOCKED_MANUAL');
  });

  test('[HU-01/CA-F13][RS-14] 20.º fallo por login desde otro dispositivo: 401 al que falla; todas las sesiones revocadas y su SSE cerrado en ≤ 1 s', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const cA = await sesion(ctx, u.nombre, u.pin, IP_A);
    const cB = await sesion(ctx, u.nombre, u.pin, IP_B);
    const cC = await sesion(ctx, u.nombre, u.pin, IP_C);
    // Los aciertos de login ponen el contador a 0: el 19 se fabrica después.
    await ctx.bd.query('UPDATE users SET failed_attempts = 19 WHERE id = $1', [u.id]);

    const base = await ctx.escuchar();
    const sse = await abrirSse(base, cA);
    expect(sse.status).toBe(200);
    await sse.esperar('hello', 2000);

    const metricasAntes = await ctx.app.metricsText();
    const t0 = performance.now();
    const r = (await iniciarSesion(ctx, u.nombre, pinIncorrecto(u.pin), IP_D)).res;
    expect(r.status).toBe(401);
    expect(codigo(r)).toBe('INVALID_CREDENTIALS');

    const revocado = await sse.esperar('session.revoked', 1000);
    const cierre = await sse.esperarCierre(1000);
    expect(revocado.llegada - t0).toBeLessThanOrEqual(1000);
    expect(cierre - t0).toBeLessThanOrEqual(1000);
    // El evento lleva el motivo para el banner de P-01 (docs/arquitectura.md §6).
    expect(revocado.data).toMatchObject({ reason: 'account_locked_manual' });

    for (const c of [cA, cB, cC]) {
      esperar401(await pedir(ctx, { ruta: '/auth/me', cookie: c }), { reason: 'revoked', revokedReason: 'account_locked_manual' });
    }
    expect((await usuario(ctx.bd, u.id)).locked_manual).toBe(true);
    const ev = ctx.logs.eventos('auth.sessions.revoked').filter((e) => e.target_user_id === u.id);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ reason: 'account_locked_manual', purpose: 'login', sessions_revoked: 3, sse_closed: 1, from_own_session: false });
    const despues = await ctx.app.metricsText();
    expect(
      (valorMetrica(despues, 'auth_sessions_revoked_on_lock_total') ?? 0) - (valorMetrica(metricasAntes, 'auth_sessions_revoked_on_lock_total') ?? 0),
    ).toBe(3);

    // Una reconexión del flujo recibe 401.
    expect((await abrirSse(base, cA)).status).toBe(401);
    // Y al entrar, con el PIN correcto: bloqueo indefinido.
    const login = (await iniciarSesion(ctx, u.nombre, u.pin, ipUnica())).res;
    expect(login.status).toBe(423);
    expect(codigo(login)).toBe('ACCOUNT_LOCKED_MANUAL');
  });

  test('[HU-01/CA-F13] el 20.º fallo de un usuario no toca las sesiones de otros usuarios', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter', fallos: 19 });
    const otro = await crearUsuario(ctx, { rol: 'waiter' });
    const cOtro = await sesion(ctx, otro.nombre, otro.pin);
    await iniciarSesion(ctx, u.nombre, pinIncorrecto(u.pin), IP_D);
    expect((await pedir(ctx, { ruta: '/auth/me', cookie: cOtro })).status).toBe(200);
  });
});
