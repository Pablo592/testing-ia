// HU-01 (dependencia: encargado inicial con PIN provisional de 6 dígitos que
// debe cambiar en su primer inicio de sesión), HU-01/CA-F06 (desbloqueo por el
// operador del sistema con `unlock-user`); RS-09, RS-09b.
// RS-09 necesita una BD sin encargados: BD aislada creada desde la plantilla
// migrada (rol de TESTING con CREATEDB, hallazgo T-28).
import { afterEach, describe, expect, test } from 'vitest';
import { createInitialManager, unlockUser } from '@mi-app/api/commands';
import { depsComando, montarApp, type Ctx } from '../../support/app.ts';
import { codigo, iniciarSesion, pedir, sesion } from '../../support/http.ts';
import { crearUsuario, nombreUnico, pinAleatorio, pinIncorrecto } from '../../support/fixtures.ts';
import { usuario, usuarioPorNombre } from '../../support/bd.ts';

let ctx: Ctx | undefined;
afterEach(async () => {
  await ctx?.cerrar();
  ctx = undefined;
});

async function encargados(c: Ctx): Promise<number> {
  const r = await c.bd.query<{ n: string }>(`SELECT count(*)::text AS n FROM users WHERE role = 'manager'`);
  return Number(r.rows[0].n);
}

describe('Encargado inicial (create-initial-manager)', () => {
  test('[HU-07/CA-F04][RS-09] sin encargados: crea uno con must_change_pin; una segunda ejecución no hace nada', async () => {
    ctx = await montarApp({ bdAislada: true });
    expect(await encargados(ctx)).toBe(0);
    const nombre = nombreUnico('Marta');
    const pin = pinAleatorio('manager');
    expect(await createInitialManager(depsComando(ctx), { name: nombre, pin })).toBe('created');
    const fila = await usuarioPorNombre(ctx.bd, nombre);
    expect(fila).toMatchObject({ role: 'manager', must_change_pin: true, active: true, failed_attempts: 0, pin_digits: 6 });
    expect(fila!.pin_hash.startsWith('$argon2id$')).toBe(true);
    expect(ctx.logs.eventos('staff.initial_manager.created')).toHaveLength(1);

    expect(await createInitialManager(depsComando(ctx), { name: nombreUnico('Otra'), pin: pinAleatorio('manager') })).toBe('skipped');
    expect(await encargados(ctx)).toBe(1);
  });

  test.each([['48317'], ['4831'], ['1234567'], ['123456'], ['111111']])(
    '[HU-01/CA-N01][RS-09] PIN provisional "%s" que no cumple las reglas de encargado → rechazado, no crea nada',
    async (pin) => {
      ctx = await montarApp({ bdAislada: true });
      await expect(createInitialManager(depsComando(ctx), { name: nombreUnico('Marta'), pin })).rejects.toThrow();
      expect(await encargados(ctx)).toBe(0);
    },
  );

  test('[HU-07/CA-F04][HU-01/CA-F03] primer inicio de sesión del encargado inicial: obligado a cambiar el PIN y después accede a todo', async () => {
    ctx = await montarApp({ bdAislada: true });
    const nombre = nombreUnico('Marta');
    const pin = pinAleatorio('manager');
    await createInitialManager(depsComando(ctx), { name: nombre, pin });
    const { res, cookie } = await iniciarSesion(ctx, nombre, pin);
    expect(res.status).toBe(200);
    expect(res.body.user.mustChangePin).toBe(true);
    const bloqueada = await pedir(ctx, { metodo: 'POST', ruta: '/session/activity', cookie });
    expect(codigo(bloqueada)).toBe('PIN_CHANGE_REQUIRED');

    const nuevo = pinAleatorio('manager');
    expect((await pedir(ctx, { metodo: 'POST', ruta: '/auth/pin', cookie, cuerpo: { currentPin: pin, newPin: nuevo } })).status).toBe(204);
    const me = await pedir(ctx, { ruta: '/auth/me', cookie });
    expect(me.body.user).toMatchObject({ role: 'manager', mustChangePin: false });
    expect(me.body.permissions).toEqual(expect.arrayContaining(['staff:manage', 'menu:manage', 'reports:read', 'kitchen:read', 'payment:void']));
  });
});

describe('Desbloqueo por el operador del sistema (unlock-user)', () => {
  test('[HU-01/CA-F06][RS-09b] unlock-user quita el bloqueo indefinido, pone el contador a 0 y queda en auditoría como system', async () => {
    ctx = await montarApp();
    const m = await crearUsuario(ctx, { rol: 'manager', fallos: 20, bloqueoIndefinido: true });
    expect((await iniciarSesion(ctx, m.nombre, m.pin)).res.status).toBe(423);

    expect(await unlockUser(depsComando(ctx), m.nombre)).toBe('unlocked');
    const fila = await usuario(ctx.bd, m.id);
    expect(fila).toMatchObject({ failed_attempts: 0, locked_until: null, locked_manual: false });
    const audit = await ctx.bd.query(
      `SELECT actor_id, action FROM audit_log WHERE entity_id = $1 AND action = 'user.unlocked'`,
      [m.id],
    );
    expect(audit.rows).toEqual([{ actor_id: null, action: 'user.unlocked' }]);
    const ev = ctx.logs.eventos('staff.unlocked').filter((e) => e.target_user_id === m.id);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ was_lock_kind: 'manual', by_user_id: 'system' });

    await sesion(ctx, m.nombre, m.pin);
  });

  test('[HU-01/CA-F06][RS-09b] tras unlock-user el contador empieza de cero: 4 fallos no bloquean', async () => {
    ctx = await montarApp();
    const u = await crearUsuario(ctx, { rol: 'waiter', fallos: 7, bloqueadoHasta: new Date('2026-11-24T09:10:00Z') });
    await unlockUser(depsComando(ctx), u.nombre);
    for (let i = 0; i < 4; i++) {
      expect((await iniciarSesion(ctx, u.nombre, pinIncorrecto(u.pin))).res.status).toBe(401);
    }
    expect((await iniciarSesion(ctx, u.nombre, u.pin)).res.status).toBe(200);
  });

  test('[HU-01/CA-F06] unlock-user de un nombre inexistente no cambia nada', async () => {
    ctx = await montarApp();
    expect(await unlockUser(depsComando(ctx), nombreUnico('nadie'))).toBe('not_found');
  });
});
