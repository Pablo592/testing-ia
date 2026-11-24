// HU-01/CA-N01 ("nunca en texto plano ni en logs"); RS-29, RS-30; parte de
// TX-LOG-02 (docs/testing.md §5.10). PIN centinela aleatorio por ejecución,
// usado en todas las rutas de HU-01 que reciben un PIN, y búsqueda en todo lo
// que la app ha escrito en el log.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { iniciarSesion, ipUnica, pedir, sesion, tokenDe } from '../../support/http.ts';
import { crearUsuario, nombreUnico, pinAleatorio, pinIncorrecto } from '../../support/fixtures.ts';

let ctx: Ctx;
beforeEach(async () => {
  ctx = await montarApp();
});
afterEach(async () => {
  await ctx?.cerrar();
});

describe('Ningún PIN, token ni nombre tecleado en los logs', () => {
  test('[HU-01/CA-N01][RS-29][TX-LOG-02] PIN centinela en login, fallo, inexistente, cambio de PIN y petición inválida → 0 apariciones', async () => {
    const centinela = pinAleatorio('manager');
    const centinelaNuevo = pinAleatorio('manager');
    const conCentinela = await crearUsuario(ctx, { rol: 'manager', pin: centinela });
    const otro = await crearUsuario(ctx, { rol: 'waiter' });
    const provisional = await crearUsuario(ctx, { rol: 'manager', pin: centinela, pinProvisional: true });
    const nombreInexistente = nombreUnico('Fantasma');

    const cookies: string[] = [];
    // login correcto con el centinela
    cookies.push(await sesion(ctx, conCentinela.nombre, centinela));
    // login fallido: el centinela como PIN erróneo de otro usuario
    await iniciarSesion(ctx, otro.nombre, centinela);
    // usuario inexistente
    await iniciarSesion(ctx, nombreInexistente, centinela);
    // cambio del PIN provisional: currentPin y newPin centinela, uno erróneo y uno correcto
    const cProv = await sesion(ctx, provisional.nombre, centinela);
    cookies.push(cProv);
    await pedir(ctx, { metodo: 'POST', ruta: '/auth/pin', cookie: cProv, cuerpo: { currentPin: centinelaNuevo, newPin: centinela } });
    await pedir(ctx, { metodo: 'POST', ruta: '/auth/pin', cookie: cProv, cuerpo: { currentPin: centinela, newPin: centinelaNuevo } });
    // petición inválida con el centinela en campos con "pin"
    await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: otro.nombre, pin: centinela + 'x', extra: centinela }, ip: ipUnica() });
    // cambio de PIN sin provisional (403) con el centinela
    await pedir(ctx, { metodo: 'POST', ruta: '/auth/pin', cookie: cookies[0], cuerpo: { currentPin: centinela, newPin: centinelaNuevo } });

    const texto = ctx.logs.texto();
    expect(ctx.logs.lineas.length).toBeGreaterThan(0);
    expect(ctx.logs.invalidas).toEqual([]); // todas las líneas son JSON
    for (const secreto of [centinela, centinelaNuevo]) expect(texto).not.toContain(secreto);
    for (const c of cookies) expect(texto).not.toContain(tokenDe(c));
    // Nunca el nombre tecleado en un login fallido (docs/logging.md §4.1, auth.login.failed).
    expect(texto).not.toContain(nombreInexistente);
    expect(ctx.logs.clavesPinSinRedactar()).toEqual([]);
  });

  test('[HU-01/CA-N01][RS-30] auth.login.succeeded registra provisional_credential (no must_change_pin) y auth.login.failed el motivo', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter', pinProvisional: true });
    await sesion(ctx, u.nombre, u.pin);
    await iniciarSesion(ctx, u.nombre, pinIncorrecto(u.pin));
    await iniciarSesion(ctx, nombreUnico('nadie'), '4831');

    const ok = ctx.logs.eventos('auth.login.succeeded').filter((e) => e.user_id === u.id);
    expect(ok).toHaveLength(1);
    expect(ok[0]).toMatchObject({ role: 'waiter', provisional_credential: true, category: 'security' });
    expect(ok[0]).not.toHaveProperty('must_change_pin');

    const fallos = ctx.logs.eventos('auth.login.failed');
    expect(fallos.find((e) => e.target_user_id === u.id)).toMatchObject({ reason: 'bad_pin', failed_attempts: 1 });
    const desconocido = fallos.find((e) => e.reason === 'unknown_user');
    expect(desconocido).toBeDefined();
    expect(desconocido).not.toHaveProperty('target_user_id');
    for (const e of fallos) expect(e.client_ip).toBeDefined();
  });
});
