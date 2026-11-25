// HU-01: inicio de sesión, destino por rol, mensajes, desactivado, cierre de
// sesión, cookie y almacenamiento del PIN. buildApp + FakeClock + BD real.
// Contrato: tests/README.md. Estrategia: docs/testing.md §5.2, §5.7.
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import {
  codigo,
  cookieSesion,
  errorSinId,
  esperar401,
  esperarCookieBorrada,
  esperarSinSetCookie,
  incidencias,
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
    expect(out.status).toBe(204);
    // El logout también borra la cookie, con el mismo Set-Cookie que el 401 (2.1i).
    esperarCookieBorrada(out);
    const me = await pedir(ctx, { ruta: '/auth/me', cookie });
    esperar401(me, { reason: 'revoked', revokedReason: 'logout' });
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

  test('[HU-01/CA-F08] sin sesión, /auth/me y /auth/logout responden 401 UNAUTHENTICATED sin details', async () => {
    esperar401(await pedir(ctx, { ruta: '/auth/me' }), null);
    esperar401(await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout' }), null);
    esperar401(await pedir(ctx, { ruta: '/auth/me', cookie: '__Host-sid=' + 'B'.repeat(43) }), null);
  });
});

// docs/arquitectura.md §5 (2.1i, recomendaciones de la 2.1f): todo 401 de una
// petición con __Host-sid la borra con un Set-Cookie idéntico; sin cookie,
// ninguno. Sin cookie, con token desconocido o mal formado: mismo cuerpo salvo
// requestId. esperar401() comprueba el Set-Cookie en cada uso.
describe('Borrado de la cookie y cuerpo del 401 (2.1i)', () => {
  const MAL_FORMADAS = ['__Host-sid=', '__Host-sid=corto', '__Host-sid=%%%%', '__Host-sid=' + 'A'.repeat(600), '__Host-sid=' + 'A'.repeat(42) + '!'];

  test('[HU-01/CA-F08] sin cookie: 401 sin details y sin Set-Cookie (tampoco con otra cookie que no es la de sesión)', async () => {
    const r = await pedir(ctx, { ruta: '/auth/me' });
    esperar401(r, null);
    esperarSinSetCookie(r);
    const otra = await pedir(ctx, { ruta: '/auth/me', cookie: 'preferencia=1' });
    esperar401(otra, null);
    esperarSinSetCookie(otra);
  });

  test('[HU-01/CA-F08] cookie desconocida o mal formada: 401 sin details y Set-Cookie de borrado exacto', async () => {
    for (const cookie of ['__Host-sid=' + 'A'.repeat(43), ...MAL_FORMADAS]) {
      const r = await pedir(ctx, { ruta: '/auth/me', cookie });
      esperar401(r, null);
      expect(setCookies(r), cookie.slice(0, 30)).toEqual(['__Host-sid=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict']);
    }
  });

  test('[HU-01/CA-F08] cookie revocada (logout): 401 revoked/logout con el mismo Set-Cookie de borrado', async () => {
    const u = await crearUsuario(ctx, { rol: 'kitchen' });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout', cookie });
    const r = await pedir(ctx, { ruta: '/auth/me', cookie });
    esperar401(r, { reason: 'revoked', revokedReason: 'logout' });
    esperarCookieBorrada(r);
  });

  test('[HU-01/CA-F08][RS-07] sin cookie, con token desconocido y con cookie mal formada: el mismo cuerpo salvo requestId', async () => {
    const sin = await pedir(ctx, { ruta: '/auth/me' });
    const desconocida = await pedir(ctx, { ruta: '/auth/me', cookie: '__Host-sid=' + 'C'.repeat(43) });
    const cuerpos = [desconocida, ...(await Promise.all(MAL_FORMADAS.map((cookie) => pedir(ctx, { ruta: '/auth/me', cookie }))))];
    for (const r of cuerpos) expect(errorSinId(r)).toEqual(errorSinId(sin));
    // requestId propio de cada respuesta, igual a su cabecera X-Request-Id.
    for (const r of [sin, ...cuerpos]) expect(r.body.error.requestId).toBe(r.headers['x-request-id']);
    // También en una ruta que modifica (con Origin correcto).
    const logoutSin = await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout' });
    const logoutMal = await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout', cookie: MAL_FORMADAS[1] });
    expect(errorSinId(logoutMal)).toEqual(errorSinId(logoutSin));
    esperarSinSetCookie(logoutSin);
    esperarCookieBorrada(logoutMal);
  });
});

// docs/seguridad.md §6.6 (2.1k), condición de UnauthenticatedDetails: con
// cookie, siempre SHA-256 y una consulta por token_hash; nada de trabajo extra
// antes de responder para el token que existió.
describe('Tiempo del 401: token revocado frente a inventado', () => {
  test('[HU-01/CA-F08][RS-07] diferencia de medianas < 5 ms en 100 peticiones a /auth/me', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const revocada = await sesion(ctx, u.nombre, u.pin);
    await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout', cookie: revocada });
    const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const tRevocada: number[] = [];
    const tInventada: number[] = [];
    // Calentamiento (JIT, pool): no se mide.
    for (let i = 0; i < 10; i++) {
      await pedir(ctx, { ruta: '/auth/me', cookie: revocada });
      await pedir(ctx, { ruta: '/auth/me', cookie: '__Host-sid=' + randomBytes(32).toString('base64url') });
    }
    for (let i = 0; i < 100; i++) {
      // Un token inventado distinto cada vez, con la misma forma que uno real.
      const inventada = '__Host-sid=' + randomBytes(32).toString('base64url');
      let t = performance.now();
      const a = await pedir(ctx, { ruta: '/auth/me', cookie: revocada });
      tRevocada.push(performance.now() - t);
      t = performance.now();
      const b = await pedir(ctx, { ruta: '/auth/me', cookie: inventada });
      tInventada.push(performance.now() - t);
      expect([a.status, b.status]).toEqual([401, 401]);
    }
    expect(Math.abs(mediana(tRevocada) - mediana(tInventada))).toBeLessThan(5);
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
  test('[HU-01/CA-F05][RS-24] POST /auth/login sin Origin o con Origin ajeno → 403 ORIGIN_NOT_ALLOWED; sin JSON → 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const antes = ctx.hasher.verificaciones;
    const sinOrigen = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: u.nombre, pin: u.pin }, sinOrigen: true });
    expect(sinOrigen.status).toBe(403);
    expect(codigo(sinOrigen)).toBe('ORIGIN_NOT_ALLOWED');
    for (const origin of ['https://evil.test', 'https://cafe.test:8443', 'http://cafe.test', 'null']) {
      const ajeno = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: u.nombre, pin: u.pin }, cabeceras: { origin } });
      expect(ajeno.status, origin).toBe(403);
      expect(codigo(ajeno), origin).toBe('ORIGIN_NOT_ALLOWED');
    }
    const texto = await pedir(ctx, {
      metodo: 'POST',
      ruta: '/auth/login',
      cuerpo: `name=${u.nombre}&pin=${u.pin}`,
      cabeceras: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(texto.status).toBe(415);
    expect(codigo(texto)).toBe('UNSUPPORTED_MEDIA_TYPE');
    // Nada de lo anterior al handler verifica el PIN ni crea sesión.
    expect(ctx.hasher.verificaciones).toBe(antes);
    expect(await sesionesDe(ctx.bd, u.id)).toHaveLength(0);
  });

  test('[HU-01/CA-F05] cuerpo que no es JSON → 400 VALIDATION_FAILED con { path: [], rule: invalid_json }', async () => {
    const r = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: '{"name": ', ip: ipUnica() });
    expect(r.status).toBe(400);
    expect(codigo(r)).toBe('VALIDATION_FAILED');
    expect(incidencias(r)).toEqual([{ path: [], rule: 'invalid_json' }]);
  });

  test('[HU-01/CA-F05] falta el nombre o sobra una clave → 400 VALIDATION_FAILED con path y regla del catálogo', async () => {
    const sinNombre = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { pin: '4831' }, ip: ipUnica() });
    expect(sinNombre.status).toBe(400);
    expect(incidencias(sinNombre)).toContainEqual({ path: ['name'], rule: 'required' });
    const tipo = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: 7, pin: '4831' }, ip: ipUnica() });
    expect(incidencias(tipo)).toContainEqual({ path: ['name'], rule: 'type' });
    const catalogo = ['required', 'type', 'format', 'enum', 'min', 'max', 'min_length', 'max_length', 'not_allowed', 'invalid_json'];
    for (const i of [...incidencias(sinNombre), ...incidencias(tipo)]) {
      expect(catalogo, JSON.stringify(i)).toContain(i.rule);
      for (const parte of i.path) expect(['string', 'number']).toContain(typeof parte);
    }
  });

  test('[HU-01/CA-F08][RS-24] orden de comprobaciones: Origin antes que sesión (POST /auth/logout sin cookie y sin Origin → 403 ORIGIN_NOT_ALLOWED)', async () => {
    const r = await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout', sinOrigen: true });
    expect(r.status).toBe(403);
    expect(codigo(r)).toBe('ORIGIN_NOT_ALLOWED');
    // Con Origin correcto y sin cookie, ya es la sesión la que falla.
    esperar401(await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout' }), null);
    // GET no comprueba Origin.
    esperar401(await pedir(ctx, { ruta: '/auth/me', cabeceras: { origin: 'https://evil.test' } }), null);
  });

  test('[HU-01/CA-F08][RS-24] con sesión válida, un logout con Origin ajeno → 403 y la sesión sigue', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    const r = await pedir(ctx, { metodo: 'POST', ruta: '/auth/logout', cookie, cabeceras: { origin: 'https://evil.test' } });
    expect(codigo(r)).toBe('ORIGIN_NOT_ALLOWED');
    expect((await pedir(ctx, { ruta: '/auth/me', cookie })).status).toBe(200);
  });

  test('[HU-01/CA-N01][RS-31] un PIN con formato inválido da 400 sin repetir el valor recibido', async () => {
    const centinela = '90x8172';
    const r = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: nombreUnico(), pin: centinela }, ip: ipUnica() });
    expect([400, 401]).toContain(r.status);
    expect(r.raw).not.toContain(centinela);
    expect(ctx.logs.texto()).not.toContain(centinela);
  });
});

// docs/arquitectura.md §2.1 (2.1i, recomendación de la 2.1f; docs/seguridad.md
// §6.6): todo pool creado desde DatabaseDeps fija search_path=public en la
// conexión, que prevalece sobre ALTER DATABASE … SET search_path.
describe('search_path fijado en el pool de la app', () => {
  test('[HU-01/CA-F01][HU-01/CA-F05] con ALTER DATABASE … SET search_path = trampa en el clon, el login y /auth/me siguen funcionando', async () => {
    await ctx.cerrar();
    ctx = await montarApp({ bdAislada: true, searchPathDeBd: 'trampa' });
    // Comprobación de la prueba: una conexión sin la opción hereda la trampa.
    const sinOpcion = new pg.Client({ ...ctx.configBd });
    await sinOpcion.connect();
    try {
      expect((await sinOpcion.query<{ search_path: string }>('SHOW search_path')).rows[0].search_path).toBe('trampa');
    } finally {
      await sinOpcion.end();
    }
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const { res, cookie } = await iniciarSesion(ctx, u.nombre, u.pin);
    expect(res.status).toBe(200);
    expect((await pedir(ctx, { ruta: '/auth/me', cookie })).status).toBe(200);
    // Un fallo también se registra (escritura en users con la ruta fijada).
    expect((await iniciarSesion(ctx, u.nombre, pinIncorrecto(u.pin))).res.status).toBe(401);
    expect((await usuario(ctx.bd, u.id)).failed_attempts).toBe(1);
  });
});
