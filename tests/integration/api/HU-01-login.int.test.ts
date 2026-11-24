// HU-01: inicio de sesión, destino por rol, mensajes, desactivado, cierre de
// sesión, cookie y almacenamiento del PIN. buildApp + FakeClock + BD real.
// Contrato: tests/README.md. Estrategia: docs/testing.md §5.2, §5.7.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import {
  codigo,
  cookieSesion,
  errorSinId,
  iniciarSesion,
  ipUnica,
  pedir,
  sesion,
  setCookies,
  sha256,
  tokenDe,
} from '../../support/http.ts';
import { crearUsuario, nombreUnico, pinIncorrecto, type Rol } from '../../support/fixtures.ts';
import { sesionesDe, textoEnTablas, usuario } from '../../support/bd.ts';
import { PERMISOS_ESPERADOS } from '../../support/oraculo-permisos.ts';

let ctx: Ctx;
beforeEach(async () => {
  ctx = await montarApp();
});
afterEach(async () => {
  await ctx?.cerrar();
});

describe('Inicio de sesión correcto por rol', () => {
  const casos: { rol: Rol; criterio: string; localConfig: Record<string, number> }[] = [
    { rol: 'waiter', criterio: 'HU-01/CA-F01', localConfig: { tableCount: 20 } },
    { rol: 'kitchen', criterio: 'HU-01/CA-F02', localConfig: { delayThresholdMinutes: 10 } },
    { rol: 'manager', criterio: 'HU-01/CA-F03', localConfig: { tableCount: 20, delayThresholdMinutes: 10 } },
  ];

  for (const c of casos) {
    test(`[${c.criterio}][HU-01/CA-N02] ${c.rol}: 200 con el usuario, y /auth/me con exactamente sus permisos`, async () => {
      const u = await crearUsuario(ctx, { rol: c.rol });
      const { res, cookie } = await iniciarSesion(ctx, u.nombre, u.pin);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ user: { id: u.id, name: u.nombre, role: c.rol, mustChangePin: false } });
      expect(cookie).toBeDefined();

      const me = await pedir(ctx, { ruta: '/auth/me', cookie });
      expect(me.status).toBe(200);
      expect(me.body.user).toEqual({ id: u.id, name: u.nombre, role: c.rol, mustChangePin: false });
      expect([...me.body.permissions].sort()).toEqual([...PERMISOS_ESPERADOS[c.rol]].sort());
      // localConfig filtrado por rol, sin otras claves (docs/arquitectura.md §5.1).
      expect(me.body.localConfig).toEqual(c.localConfig);
      expect(me.body.serverTime).toBe(ctx.reloj.now().toISOString());
      expect(me.body.businessDate).toBe('2026-11-24');
    });
  }

  test('[HU-01/CA-F01] el nombre de usuario no distingue mayúsculas', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const { res } = await iniciarSesion(ctx, u.nombre.toUpperCase(), u.pin);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(u.id);
  });

  test('[HU-01/CA-F06] un acceso correcto deja el contador de fallos a 0', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter', fallos: 3 });
    await sesion(ctx, u.nombre, u.pin);
    expect((await usuario(ctx.bd, u.id)).failed_attempts).toBe(0);
  });
});

describe('Credenciales incorrectas', () => {
  test('[HU-01/CA-F05][RS-07] usuario inexistente y PIN incorrecto dan la misma respuesta (código, cuerpo y cabeceras)', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const malPin = await iniciarSesion(ctx, u.nombre, pinIncorrecto(u.pin));
    const sinUsuario = await iniciarSesion(ctx, nombreUnico('noexiste'), u.pin);

    expect(malPin.res.status).toBe(401);
    expect(codigo(malPin.res)).toBe('INVALID_CREDENTIALS');
    expect(sinUsuario.res.status).toBe(401);
    expect(errorSinId(sinUsuario.res)).toEqual(errorSinId(malPin.res));
    // Ni el mensaje ni los detalles nombran el campo que falla.
    expect(malPin.res.raw.toLowerCase()).not.toMatch(/"(name|pin|usuario)"\s*:/);
    // Mismas cabeceras salvo las que cambian por petición.
    const variables = new Set(['x-request-id', 'date', 'content-length']);
    const nombres = (h: Record<string, unknown>) => Object.keys(h).filter((k) => !variables.has(k)).sort();
    expect(nombres(sinUsuario.res.headers)).toEqual(nombres(malPin.res.headers));
    expect(malPin.cookie).toBeUndefined();
    expect(sinUsuario.cookie).toBeUndefined();
  });

  test('[HU-01/CA-F05][RS-07] el usuario inexistente también calcula un hash (tiempo constante)', async () => {
    const antes = ctx.hasher.verificaciones;
    await iniciarSesion(ctx, nombreUnico('noexiste'), '4831');
    expect(ctx.hasher.verificaciones).toBe(antes + 1);
  });

  test('[HU-01/CA-F05][RS-07] diferencia de medianas de tiempo < 50 ms en 100 intentos (inexistente frente a PIN erróneo)', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const tInexistente: number[] = [];
    const tPinMal: number[] = [];
    for (let i = 0; i < 100; i++) {
      // IP distinta en cada intento (límite por dispositivo) y contador a 0 (bloqueo de cuenta),
      // para medir solo el camino del hash.
      await ctx.bd.query('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [u.id]);
      let t = performance.now();
      await iniciarSesion(ctx, u.nombre, pinIncorrecto(u.pin), ipUnica());
      tPinMal.push(performance.now() - t);
      t = performance.now();
      await iniciarSesion(ctx, nombreUnico('noexiste'), u.pin, ipUnica());
      tInexistente.push(performance.now() - t);
    }
    expect(Math.abs(mediana(tInexistente) - mediana(tPinMal))).toBeLessThan(50);
  });

  test('[HU-01/CA-F05] un fallo suma 1 al contador del usuario y no crea sesión', async () => {
    const u = await crearUsuario(ctx, { rol: 'kitchen' });
    await iniciarSesion(ctx, u.nombre, pinIncorrecto(u.pin));
    expect((await usuario(ctx.bd, u.id)).failed_attempts).toBe(1);
    expect(await sesionesDe(ctx.bd, u.id)).toHaveLength(0);
  });
});

describe('Usuario desactivado', () => {
  test('[HU-01/CA-F07] con PIN correcto: 403 USER_DISABLED, sin cookie ni sesión', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter', activo: false });
    const { res, cookie } = await iniciarSesion(ctx, u.nombre, u.pin);
    expect(res.status).toBe(403);
    expect(codigo(res)).toBe('USER_DISABLED');
    expect(cookie).toBeUndefined();
    expect(await sesionesDe(ctx.bd, u.id)).toHaveLength(0);
    expect(ctx.logs.eventos('auth.login.disabled_user').some((e) => e.target_user_id === u.id)).toBe(true);
  });

  test('[HU-01/CA-F07][HU-01/CA-F05] con PIN incorrecto: 401 genérico (no revela que está desactivado)', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter', activo: false });
    const { res } = await iniciarSesion(ctx, u.nombre, pinIncorrecto(u.pin));
    expect(res.status).toBe(401);
    expect(codigo(res)).toBe('INVALID_CREDENTIALS');
  });

  test('[HU-01/CA-F07] GET /auth/login-options no incluye usuarios desactivados', async () => {
    const activo = await crearUsuario(ctx, { rol: 'waiter' });
    const inactivo = await crearUsuario(ctx, { rol: 'waiter', activo: false });
    const r = await pedir(ctx, { ruta: '/auth/login-options', ip: ipUnica() });
    const nombres = (r.body as { name: string }[]).map((x) => x.name);
    expect(nombres).toContain(activo.nombre);
    expect(nombres).not.toContain(inactivo.nombre);
  });
});

describe('Rejilla de inicio de sesión (SEC-005)', () => {
  test('[HU-01/CA-U01] GET /auth/login-options: solo {name, role} de activos, no-store, sin revelar bloqueos', async () => {
    const libre = await crearUsuario(ctx, { rol: 'kitchen' });
    const bloqueado = await crearUsuario(ctx, { rol: 'waiter', fallos: 20, bloqueoIndefinido: true });
    const r = await pedir(ctx, { ruta: '/auth/login-options', ip: ipUnica() });
    expect(r.status).toBe(200);
    expect(String(r.headers['cache-control'])).toContain('no-store');
    const filas = r.body as Record<string, unknown>[];
    for (const f of filas) expect(Object.keys(f).sort()).toEqual(['name', 'role']);
    expect(filas).toContainEqual({ name: libre.nombre, role: 'kitchen' });
    // El bloqueado sigue apareciendo, igual que cualquier otro.
    expect(filas).toContainEqual({ name: bloqueado.nombre, role: 'waiter' });
  });
});

describe('Cierre de sesión', () => {
  test('[HU-01/CA-F08][RS-14] logout revoca la sesión: la misma cookie recibe 401 en la siguiente petición', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    const out = await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout', cookie });
    expect([200, 204]).toContain(out.status);
    const me = await pedir(ctx, { ruta: '/auth/me', cookie });
    expect(me.status).toBe(401);
    const [s] = await sesionesDe(ctx.bd, u.id);
    expect(s.revoked_at).not.toBeNull();
    expect(ctx.logs.eventos('auth.logout').some((e) => e.user_id === u.id)).toBe(true);
  });

  test('[HU-01/CA-F08] cerrar sesión no afecta a otras sesiones del mismo usuario', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const c1 = await sesion(ctx, u.nombre, u.pin);
    const c2 = await sesion(ctx, u.nombre, u.pin);
    await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout', cookie: c1 });
    expect((await pedir(ctx, { ruta: '/auth/me', cookie: c2 })).status).toBe(200);
  });

  test('[HU-01/CA-F08] sin sesión, /auth/me y /auth/logout responden 401', async () => {
    expect((await pedir(ctx, { ruta: '/auth/me' })).status).toBe(401);
    expect((await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout' })).status).toBe(401);
  });
});

describe('Cookie y token de sesión', () => {
  test('[HU-01/CA-F08][RS-10] Set-Cookie __Host-sid con HttpOnly; Secure; SameSite=Strict; Path=/, sin Domain ni caducidad', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const { res } = await iniciarSesion(ctx, u.nombre, u.pin);
    const sc = setCookies(res).find((c) => c.startsWith('__Host-sid='));
    expect(sc).toBeDefined();
    const atributos = sc!.split(';').slice(1).map((a) => a.trim().toLowerCase());
    expect(atributos).toContain('httponly');
    expect(atributos).toContain('secure');
    expect(atributos).toContain('samesite=strict');
    expect(atributos).toContain('path=/');
    expect(atributos.some((a) => a.startsWith('domain'))).toBe(false);
    expect(atributos.some((a) => a.startsWith('max-age') || a.startsWith('expires'))).toBe(false);
  });

  test('[HU-01/CA-F08][RS-11] token de ≥ 256 bits, nuevo en cada login y en BD solo su SHA-256', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const c1 = await sesion(ctx, u.nombre, u.pin);
    // Un login que envía una cookie previa no la reutiliza.
    const r2 = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: u.nombre, pin: u.pin }, cookie: c1, ip: ipUnica() });
    const c2 = cookieSesion(r2)!;
    const t1 = tokenDe(c1);
    const t2 = tokenDe(c2);
    expect(t1).not.toBe(t2);
    // 256 bits = 32 bytes: al menos 43 caracteres en base64url o 64 en hex.
    expect(t1.length).toBeGreaterThanOrEqual(43);
    const sesiones = await sesionesDe(ctx.bd, u.id);
    expect(sesiones.map((s) => s.token_hash.toString('hex')).sort()).toEqual(
      [sha256(t1).toString('hex'), sha256(t2).toString('hex')].sort(),
    );
    expect(await textoEnTablas(ctx.bd, t1, ['sessions', 'users'])).toEqual([]);
  });
});

describe('Almacenamiento del PIN', () => {
  test('[HU-01/CA-N01][RS-08] el hash es argon2id con m ≥ 19456 KiB, t ≥ 2, p = 1 y no contiene el PIN', async () => {
    const u = await crearUsuario(ctx, { rol: 'manager' });
    const { pin_hash } = await usuario(ctx.bd, u.id);
    const m = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$/.exec(pin_hash);
    expect(m, pin_hash.slice(0, 40)).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(19456);
    expect(Number(m![2])).toBeGreaterThanOrEqual(2);
    expect(Number(m![3])).toBe(1);
    expect(pin_hash).not.toContain(u.pin);
  });

  test('[HU-01/CA-N01] ninguna respuesta de la API devuelve el PIN ni su hash', async () => {
    const u = await crearUsuario(ctx, { rol: 'manager' });
    const { res, cookie } = await iniciarSesion(ctx, u.nombre, u.pin);
    const me = await pedir(ctx, { ruta: '/auth/me', cookie });
    const { pin_hash } = await usuario(ctx.bd, u.id);
    for (const r of [res, me]) {
      expect(r.raw).not.toContain(u.pin);
      expect(r.raw).not.toContain(pin_hash);
      expect(r.raw).not.toMatch(/pinHash|pin_hash|failedAttempts|lockedUntil/);
    }
  });
});

describe('Peticiones del login fuera de contrato', () => {
  test('[HU-01/CA-F05][RS-24] POST /auth/login sin Origin o con Origin ajeno → 403; sin JSON → 415', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const sinOrigen = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: u.nombre, pin: u.pin }, sinOrigen: true });
    expect(sinOrigen.status).toBe(403);
    const ajeno = await pedir(ctx, {
      metodo: 'POST',
      ruta: '/auth/login',
      cuerpo: { name: u.nombre, pin: u.pin },
      cabeceras: { origin: 'https://evil.test' },
    });
    expect(ajeno.status).toBe(403);
    const texto = await pedir(ctx, {
      metodo: 'POST',
      ruta: '/auth/login',
      cuerpo: `name=${u.nombre}&pin=${u.pin}`,
      cabeceras: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(texto.status).toBe(415);
    expect(await sesionesDe(ctx.bd, u.id)).toHaveLength(0);
  });

  test('[HU-01/CA-N01][RS-31] un PIN con formato inválido da 400 sin repetir el valor recibido', async () => {
    const centinela = '90x8172';
    const r = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: nombreUnico(), pin: centinela }, ip: ipUnica() });
    expect([400, 401]).toContain(r.status);
    expect(r.raw).not.toContain(centinela);
    expect(ctx.logs.texto()).not.toContain(centinela);
  });
});
