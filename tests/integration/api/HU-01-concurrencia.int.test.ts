// RS-05b (SEC-038, 2.3, alta): los límites de RS-03, RS-05 y RS-16b se cumplen
// también con peticiones SIMULTÁNEAS. Todas las peticiones de cada ráfaga se
// lanzan a la vez (Promise.all) sobre la misma instancia, con el hasher espía.
//
// ATENCIÓN (Developer): estos tests FALLAN mientras SEC-038 siga abierto
// (comprobar y luego actuar: el límite por IP y el bloqueo se miran antes del
// hash y el fallo se anota después). Se esperan en verde tras la tarea 2.5.
// No se relajan: si hace falta otra forma de cumplir RS-05b, se avisa a Testing.
// Ver tests/README.md "Tests que fallan a propósito (SEC-038)".
//
// Los valores (50 peticiones, 10 por IP, 5 por cuenta) son los de RS-05b en
// docs/seguridad.md; el desglose 401/429/423 solo comprueba el reparto, no
// el orden en que se atienden.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { codigo, cookieSesion, IP_A, ipUnica, pedir, sesion, type Resp } from '../../support/http.ts';
import { crearUsuario, pinIncorrecto, type UsuarioPrueba } from '../../support/fixtures.ts';
import { sesionesDe, usuario } from '../../support/bd.ts';

const RAFAGA = 50;

let ctx: Ctx;
beforeEach(async () => {
  ctx = await montarApp();
});
afterEach(async () => {
  await ctx?.cerrar();
});

function login(nombre: string, pin: string, ip: string): Promise<Resp> {
  return pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: nombre, pin }, ip });
}

function cambiarPin(cookie: string, currentPin: string, newPin: string, ip: string): Promise<Resp> {
  return pedir(ctx, { metodo: 'POST', ruta: '/auth/pin', cookie, ip, cuerpo: { currentPin, newPin } });
}

function contar(rs: Resp[]): Record<number, number> {
  const c: Record<number, number> = {};
  for (const r of rs) c[r.status] = (c[r.status] ?? 0) + 1;
  return c;
}

/** Sesiones sin revocar de un usuario. */
async function sesionesAbiertas(u: UsuarioPrueba): Promise<number> {
  return (await sesionesDe(ctx.bd, u.id)).filter((s) => s.revoked_at === null).length;
}

describe('RS-05b: ráfagas simultáneas respetan los límites', () => {
  test('[HU-01/CA-F11][RS-05b] 50 logins simultáneos desde una IP con PIN erróneo → como mucho 10 verificaciones y el resto 429', async () => {
    // 50 usuarios distintos, uno por intento: ninguna cuenta llega a su bloqueo
    // (CA-F06) y el único límite que puede actuar es el del dispositivo (CA-F11).
    const usuarios: UsuarioPrueba[] = [];
    for (let i = 0; i < RAFAGA; i++) usuarios.push(await crearUsuario(ctx, { rol: 'waiter' }));
    const antes = ctx.hasher.verificaciones;

    const respuestas = await Promise.all(usuarios.map((u) => login(u.nombre, pinIncorrecto(u.pin), IP_A)));

    const c = contar(respuestas);
    const verificaciones = ctx.hasher.verificaciones - antes;
    expect(Object.keys(c).map(Number).sort(), `reparto de estados ${JSON.stringify(c)}`).toEqual([401, 429]);
    expect(verificaciones, 'llamadas al hasher').toBeLessThanOrEqual(10);
    expect(c[401], 'respuestas 401 (verificaciones que sí se hicieron)').toBeLessThanOrEqual(10);
    expect(c[429], 'respuestas 429').toBeGreaterThanOrEqual(RAFAGA - 10);
    // El 429 de una ráfaga lleva el contrato de espera (Retry-After = retryAfterSeconds).
    const limitadas = respuestas.filter((r) => r.status === 429);
    expect(limitadas.every((r) => codigo(r) === 'TOO_MANY_ATTEMPTS')).toBe(true);
  });

  test('[HU-01/CA-F06][RS-05b] 50 logins simultáneos contra una cuenta desde IP distintas → como mucho 5 verificaciones y el resto 423', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const antes = ctx.hasher.verificaciones;

    const respuestas = await Promise.all(
      Array.from({ length: RAFAGA }, () => login(u.nombre, pinIncorrecto(u.pin), ipUnica())),
    );

    const c = contar(respuestas);
    const verificaciones = ctx.hasher.verificaciones - antes;
    expect(Object.keys(c).map(Number).sort(), `reparto de estados ${JSON.stringify(c)}`).toEqual([401, 423]);
    expect(verificaciones, 'llamadas al hasher').toBeLessThanOrEqual(5);
    expect(c[401], 'respuestas 401').toBeLessThanOrEqual(5);
    expect(c[423], 'respuestas 423').toBeGreaterThanOrEqual(RAFAGA - 5);
    const fila = await usuario(ctx.bd, u.id);
    expect(fila.failed_attempts, 'contador de fallos (el bloqueo siguiente es a los 10)').toBeLessThanOrEqual(5);
    expect(fila.locked_until, 'bloqueo de 5 min activo').not.toBeNull();
    expect(fila.locked_manual).toBe(false);
  });

  test('[HU-01/CA-F13][RS-05b] ráfaga que lleva la cuenta a locked_manual con el PIN correcto al final → ese intento 423 y 0 sesiones abiertas', async () => {
    // Un fallo antes del bloqueo indefinido (CA-F06: 20 fallos). Los aciertos de
    // login ponen el contador a 0, así que se fabrica antes de la ráfaga.
    const u = await crearUsuario(ctx, { rol: 'waiter', fallos: 19 });
    const incorrectos = Array.from({ length: 10 }, () => login(u.nombre, pinIncorrecto(u.pin), ipUnica()));
    const correcto = login(u.nombre, u.pin, ipUnica());

    const [rCorrecto] = await Promise.all([correcto, ...incorrectos]);

    const fila = await usuario(ctx.bd, u.id);
    expect(fila.locked_manual, 'la ráfaga llevó la cuenta al bloqueo indefinido').toBe(true);
    expect(rCorrecto.status, `intento correcto en una cuenta bloqueada: ${rCorrecto.raw.slice(0, 200)}`).toBe(423);
    expect(cookieSesion(rCorrecto), 'sin Set-Cookie de sesión').toBeUndefined();
    expect(await sesionesAbiertas(u), 'sesiones abiertas de la cuenta bloqueada (CA-F13)').toBe(0);
  });

  test('[HU-01/CA-F13][RS-05b] misma ráfaga con currentPin en POST /auth/pin → el PIN provisional no se cambia', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter', pinProvisional: true });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    // Tras el login (que pone el contador a 0), un fallo antes del indefinido.
    await ctx.bd.query('UPDATE users SET failed_attempts = 19 WHERE id = $1', [u.id]);
    const hashAntes = (await usuario(ctx.bd, u.id)).pin_hash;
    const nuevo = '482916';

    const incorrectos = Array.from({ length: 10 }, () => cambiarPin(cookie, pinIncorrecto(u.pin), nuevo, ipUnica()));
    const correcto = cambiarPin(cookie, u.pin, nuevo, ipUnica());
    const [rCorrecto] = await Promise.all([correcto, ...incorrectos]);

    const fila = await usuario(ctx.bd, u.id);
    expect(fila.locked_manual, 'la ráfaga llevó la cuenta al bloqueo indefinido').toBe(true);
    // 423 si pasó la guarda antes de la revocación; 401 (revocada) si llegó después: nunca 204.
    expect([401, 423], `currentPin correcto con la cuenta bloqueada: ${rCorrecto.status} ${rCorrecto.raw.slice(0, 200)}`).toContain(rCorrecto.status);
    expect(fila.pin_hash, 'el PIN provisional no cambia').toBe(hashAntes);
    expect(fila.must_change_pin, 'sigue con cambio obligatorio').toBe(true);
    expect(await sesionesAbiertas(u)).toBe(0);
  });
});
