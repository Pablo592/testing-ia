// HU-01/CA-F06 (I-01, I-03), CA-N05; RS-03, RS-47. Bloqueo progresivo por usuario
// con FakeClock: 5 → 5 min, 10 → 15 min, 15 → 60 min, 20 → indefinido.
// Cada intento sale de una IP distinta para que el límite por dispositivo
// (CA-F11, otro fichero) no interfiera.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { codigo, iniciarSesion, ipUnica, reintentarEn, type Resp } from '../../support/http.ts';
import { crearUsuario, pinIncorrecto, type UsuarioPrueba } from '../../support/fixtures.ts';
import { usuario } from '../../support/bd.ts';
import { valorMetrica } from '../../support/metricas.ts';

let ctx: Ctx;
beforeEach(async () => {
  ctx = await montarApp();
});
afterEach(async () => {
  await ctx?.cerrar();
});

async function fallar(u: UsuarioPrueba): Promise<Resp> {
  return (await iniciarSesion(ctx, u.nombre, pinIncorrecto(u.pin), ipUnica())).res;
}
async function correcto(u: UsuarioPrueba): Promise<Resp> {
  return (await iniciarSesion(ctx, u.nombre, u.pin, ipUnica())).res;
}

describe('Escala del bloqueo progresivo', () => {
  test('[HU-01/CA-F06][RS-03] 25 intentos: bloqueos de 5, 15 y 60 min a los 5, 10 y 15 fallos e indefinido a los 20', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const t0 = ctx.reloj.now().getTime();

    // Fallos 1-5: 401 normal; el 5.º activa el bloqueo (CA-F06: "cuando intenta un sexto").
    for (let i = 1; i <= 5; i++) {
      const r = await fallar(u);
      expect(r.status, `fallo ${i}`).toBe(401);
      expect(codigo(r)).toBe('INVALID_CREDENTIALS');
    }
    let fila = await usuario(ctx.bd, u.id);
    expect(fila.failed_attempts).toBe(5);
    expect(fila.locked_until?.getTime()).toBe(t0 + 5 * 60_000);

    // 6.º intento, aunque el PIN sea correcto: 423 con el tiempo restante y sin calcular el hash.
    let antes = ctx.hasher.verificaciones;
    let r = await correcto(u);
    expect(r.status).toBe(423);
    expect(codigo(r)).toBe('LOCKED');
    expect(reintentarEn(r)).toBe(300);
    expect(String(r.headers['retry-after'])).toBe('300');
    expect(ctx.hasher.verificaciones).toBe(antes);

    // El tiempo restante baja; a 4 min 59 s queda 1 s.
    ctx.reloj.avanzar({ min: 4, s: 59 });
    r = await correcto(u);
    expect(r.status).toBe(423);
    expect(reintentarEn(r)).toBe(1);

    // Expira: el contador NO se reinicia (I-01). Fallos 6-10 → el 10.º bloquea 15 min.
    ctx.reloj.avanzar({ s: 1 });
    for (let i = 6; i <= 10; i++) expect((await fallar(u)).status, `fallo ${i}`).toBe(401);
    r = await correcto(u);
    expect(r.status).toBe(423);
    expect(reintentarEn(r)).toBe(15 * 60);
    expect((await usuario(ctx.bd, u.id)).failed_attempts).toBe(10);

    // Fallos 11-15 → 60 min.
    ctx.reloj.avanzar({ min: 15 });
    for (let i = 11; i <= 15; i++) expect((await fallar(u)).status, `fallo ${i}`).toBe(401);
    r = await correcto(u);
    expect(r.status).toBe(423);
    expect(reintentarEn(r)).toBe(60 * 60);

    // Fallos 16-20 → indefinido.
    ctx.reloj.avanzar({ min: 60 });
    for (let i = 16; i <= 20; i++) expect((await fallar(u)).status, `fallo ${i}`).toBe(401);
    fila = await usuario(ctx.bd, u.id);
    expect(fila.failed_attempts).toBe(20);
    expect(fila.locked_manual).toBe(true);

    // Intentos 21-25 con el PIN correcto: 423 ACCOUNT_LOCKED_MANUAL, sin hash, también al día siguiente.
    antes = ctx.hasher.verificaciones;
    for (let i = 21; i <= 25; i++) {
      r = await correcto(u);
      expect(r.status, `intento ${i}`).toBe(423);
      expect(codigo(r)).toBe('ACCOUNT_LOCKED_MANUAL');
      expect(reintentarEn(r)).toBeUndefined();
      ctx.reloj.avanzar({ h: 6 });
    }
    expect(ctx.hasher.verificaciones).toBe(antes);
    expect((await usuario(ctx.bd, u.id)).failed_attempts).toBe(20);
  });

  test('[HU-01/CA-F06][RS-03] durante el bloqueo los intentos no se verifican ni cuentan (I-01)', async () => {
    const u = await crearUsuario(ctx, { rol: 'kitchen' });
    for (let i = 0; i < 5; i++) await fallar(u);
    const antes = ctx.hasher.verificaciones;
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? await correcto(u) : await fallar(u);
      expect(r.status).toBe(423);
      ctx.reloj.avanzar({ s: 20 });
    }
    expect(ctx.hasher.verificaciones).toBe(antes);
    expect((await usuario(ctx.bd, u.id)).failed_attempts).toBe(5);
    // Al expirar, un acceso correcto entra (el bloqueo era de 5 min desde el 5.º fallo).
    ctx.reloj.avanzar({ min: 2 });
    expect((await correcto(u)).status).toBe(200);
  });

  test('[HU-01/CA-F06] un acceso correcto reinicia el contador: 4 fallos + acierto + 4 fallos no bloquean', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    for (let i = 0; i < 4; i++) expect((await fallar(u)).status).toBe(401);
    expect((await correcto(u)).status).toBe(200);
    expect((await usuario(ctx.bd, u.id)).failed_attempts).toBe(0);
    for (let i = 0; i < 4; i++) expect((await fallar(u)).status).toBe(401);
    expect((await correcto(u)).status).toBe(200);
  });

  test('[HU-01/CA-F06] tras expirar el bloqueo de 5 min, un acierto reinicia: el siguiente bloqueo vuelve a ser de 5 min', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    for (let i = 0; i < 5; i++) await fallar(u);
    ctx.reloj.avanzar({ min: 5 });
    expect((await correcto(u)).status).toBe(200);
    for (let i = 0; i < 5; i++) await fallar(u);
    const r = await correcto(u);
    expect(r.status).toBe(423);
    expect(reintentarEn(r)).toBe(300);
  });

  test('[HU-01/CA-F06] el contador es por usuario: los fallos de otro usuario no lo bloquean', async () => {
    const a = await crearUsuario(ctx, { rol: 'waiter' });
    const b = await crearUsuario(ctx, { rol: 'waiter' });
    for (let i = 0; i < 5; i++) await fallar(a);
    expect((await correcto(b)).status).toBe(200);
  });

  test('[HU-01/CA-F06][HU-01/CA-N01] el encargado sigue la misma escala', async () => {
    const m = await crearUsuario(ctx, { rol: 'manager' });
    for (let i = 0; i < 5; i++) await fallar(m);
    const r = await correcto(m);
    expect(r.status).toBe(423);
    expect(reintentarEn(r)).toBe(300);
  });
});

describe('Registro de bloqueos (CA-N05)', () => {
  test('[HU-01/CA-N05][RS-30][RS-47] cada bloqueo deja auth.account.locked con nivel, rol y escalón; métrica auth_lockouts_total', async () => {
    const metricasIniciales = await ctx.app.metricsText();
    // RS-47: las series existen a 0 desde el arranque.
    expect(valorMetrica(metricasIniciales, 'auth_lockouts_total', { kind: 'manual', purpose: 'login', target_role: 'manager' })).toBe(0);
    expect(valorMetrica(metricasIniciales, 'auth_lockouts_total', { kind: 'temporary', purpose: 'login', target_role: 'waiter' })).toBe(0);

    const m = await crearUsuario(ctx, { rol: 'manager' });
    for (const escalon of [5, 10, 15, 20]) {
      for (let i = 0; i < 5; i++) await fallar(m);
      ctx.reloj.avanzar({ min: 61 });
      const ev = ctx.logs.eventos('auth.account.locked').filter((e) => e.target_user_id === m.id);
      const ultimo = ev.at(-1)!;
      expect(ultimo, `escalón ${escalon}`).toBeDefined();
      expect(ultimo.failed_attempts).toBe(escalon);
      expect(ultimo.purpose).toBe('login');
      expect(ultimo.target_role).toBe('manager');
      expect(ultimo.category).toBe('security');
      if (escalon < 20) {
        expect(ultimo.lock_kind).toBe('temporary');
        expect(ultimo.level).toBe('warn');
      } else {
        expect(ultimo.lock_kind).toBe('manual');
        expect(ultimo.level).toBe('error');
      }
    }
    expect(ctx.logs.eventos('auth.account.locked').filter((e) => e.target_user_id === m.id)).toHaveLength(4);

    const metricas = await ctx.app.metricsText();
    expect(valorMetrica(metricas, 'auth_lockouts_total', { kind: 'temporary', purpose: 'login', target_role: 'manager' })).toBe(3);
    expect(valorMetrica(metricas, 'auth_lockouts_total', { kind: 'manual', purpose: 'login', target_role: 'manager' })).toBe(1);
  });

  test('[HU-01/CA-N05][RS-30] un intento con la cuenta bloqueada deja auth.verify.locked (no auth.login.failed)', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    for (let i = 0; i < 5; i++) await fallar(u);
    const fallidosAntes = ctx.logs.eventos('auth.login.failed').length;
    await correcto(u);
    const ev = ctx.logs.eventos('auth.verify.locked').filter((e) => e.target_user_id === u.id);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ purpose: 'login', lock_kind: 'temporary', retry_after_s: 300 });
    expect(ctx.logs.eventos('auth.login.failed')).toHaveLength(fallidosAntes);
    const metricas = await ctx.app.metricsText();
    expect(valorMetrica(metricas, 'auth_verifications_total', { purpose: 'login', result: 'locked' })).toBe(1);
  });

});
