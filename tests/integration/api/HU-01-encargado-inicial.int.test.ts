// HU-01 (dependencia: encargado inicial con PIN provisional de 6 dígitos que
// debe cambiar en su primer inicio de sesión), HU-01/CA-F06 (desbloqueo por el
// operador del sistema con `unlock-user`); RS-09, RS-09b.
// RS-09 necesita una BD sin encargados: BD aislada creada desde la plantilla
// migrada (rol de TESTING con CREATEDB, hallazgo T-28).
// Contrato (docs/arquitectura.md §2.1): createInitialManager → 'created' |
// 'skipped' o rechaza con InvalidPinError { rule } sin el PIN en el mensaje;
// unlockUser → 'unlocked' | 'not_found'. Los envoltorios de la imagen salen
// con 0 (created/skipped/unlocked), 2 (not_found) y 1 (error): hallazgo T-41.
import { afterEach, describe, expect, test } from 'vitest';
import { createInitialManager, InvalidPinError, unlockUser } from '@mi-app/api/commands';
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
    // Auditoría user.created con actor system (actor_id nulo, como en user.unlocked).
    const audit = await ctx.bd.query(`SELECT actor_id, action FROM audit_log WHERE entity_id = $1`, [fila!.id]);
    expect(audit.rows).toEqual([{ actor_id: null, action: 'user.created' }]);

    expect(await createInitialManager(depsComando(ctx), { name: nombreUnico('Otra'), pin: pinAleatorio('manager') })).toBe('skipped');
    expect(await encargados(ctx)).toBe(1);
  });

  test.each([
    ['48317', 'manager_length'],
    ['4831', 'manager_length'],
    ['1234567', 'manager_length'],
    ['123456', 'sequence'],
    ['111111', 'all_same'],
    ['121212', 'repeated_block'],
    ['48a173', 'digits_only'],
  ])(
    '[HU-01/CA-N01][RS-09] PIN provisional "%s" que no cumple las reglas de encargado → InvalidPinError (%s), no crea nada',
    async (pin, regla) => {
      ctx = await montarApp({ bdAislada: true });
      let error: unknown;
      try {
        await createInitialManager(depsComando(ctx), { name: nombreUnico('Marta'), pin });
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(InvalidPinError);
      expect((error as { rule?: string }).rule).toBe(regla);
      expect(String((error as Error).message)).not.toContain(pin);
      expect(await encargados(ctx)).toBe(0);
      expect(ctx.logs.texto()).not.toContain(pin);
    },
  );

  test.each([[''], ['   '], ['M'.repeat(31)]])(
    '[HU-07/CA-F04][RS-09] nombre "%s" fuera de 1–30 caracteres tras recortar → rechazado, no crea nada',
    async (nombre) => {
      ctx = await montarApp({ bdAislada: true });
      await expect(createInitialManager(depsComando(ctx), { name: nombre, pin: pinAleatorio('manager') })).rejects.toThrow();
      expect(await encargados(ctx)).toBe(0);
    },
  );

  test('[HU-07/CA-F04][RS-09] si existe un encargado, aunque esté desactivado → skipped sin tocar nada', async () => {
    ctx = await montarApp({ bdAislada: true });
    const m = await crearUsuario(ctx, { rol: 'manager', activo: false });
    const antes = await usuario(ctx.bd, m.id);
    expect(await createInitialManager(depsComando(ctx), { name: nombreUnico('Otra'), pin: pinAleatorio('manager') })).toBe('skipped');
    expect(await encargados(ctx)).toBe(1);
    expect(await usuario(ctx.bd, m.id)).toEqual(antes);
  });

  test('[HU-07/CA-F04][RS-09] dos ejecuciones simultáneas crean un solo encargado (pg_advisory_xact_lock)', async () => {
    ctx = await montarApp({ bdAislada: true });
    const r = await Promise.all([
      createInitialManager(depsComando(ctx), { name: nombreUnico('Uno'), pin: pinAleatorio('manager') }),
      createInitialManager(depsComando(ctx), { name: nombreUnico('Dos'), pin: pinAleatorio('manager') }),
    ]);
    expect([...r].sort()).toEqual(['created', 'skipped']);
    expect(await encargados(ctx)).toBe(1);
  });

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
    // unlockUser acepta el subconjunto { clock, database, logDestination } (Pick de CommandDeps).
    const { clock, database, logDestination } = depsComando(ctx);
    expect(await unlockUser({ clock, database, logDestination }, u.nombre.toUpperCase())).toBe('unlocked');
    for (let i = 0; i < 4; i++) {
      expect((await iniciarSesion(ctx, u.nombre, pinIncorrecto(u.pin))).res.status).toBe(401);
    }
    expect((await iniciarSesion(ctx, u.nombre, u.pin)).res.status).toBe(200);
  });

  test('[HU-01/CA-F06] unlock-user de un nombre inexistente no cambia nada', async () => {
    ctx = await montarApp();
    const antes = await ctx.bd.query(`SELECT count(*)::text AS n FROM audit_log WHERE action = 'user.unlocked'`);
    expect(await unlockUser(depsComando(ctx), nombreUnico('nadie'))).toBe('not_found');
    const despues = await ctx.bd.query(`SELECT count(*)::text AS n FROM audit_log WHERE action = 'user.unlocked'`);
    expect(despues.rows).toEqual(antes.rows);
  });

  test('[HU-01/CA-F06][RS-09b] unlock-user de un usuario no bloqueado también audita user.unlocked como system', async () => {
    ctx = await montarApp();
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    expect(await unlockUser(depsComando(ctx), u.nombre)).toBe('unlocked');
    const audit = await ctx.bd.query(`SELECT actor_id FROM audit_log WHERE entity_id = $1 AND action = 'user.unlocked'`, [u.id]);
    expect(audit.rows).toEqual([{ actor_id: null }]);
  });
});
