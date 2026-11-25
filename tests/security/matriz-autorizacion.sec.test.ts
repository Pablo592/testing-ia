// HU-01/CA-F04, CA-N02; RS-15, RS-17, RS-18 (docs/testing.md §5.7).
// Tabla esperada escrita a mano desde docs/permisos.md §3 (revisión 1.4c), no
// desde permissions.ts (principio 2, T-18). Cada fila indica su historia: se
// ejecuta cuando la historia está en tests/support/alcance.ts.
//
// Para cada ruta × {sin sesión, camarero, barra, encargado, PIN provisional}:
//   - sin sesión → 401 UNAUTHENTICATED sin details;
//   - PIN provisional → 403 PIN_CHANGE_REQUIRED (salvo /auth/me, /auth/pin, /auth/logout);
//   - rol sin permiso → 403 FORBIDDEN y la BD no cambia;
//   - rol con permiso → la autorización deja pasar (ni 401 ni esos 403; el
//     cuerpo vacío puede dar 400/404/409, que no se evalúan aquí).
// Orden fijo de las comprobaciones (docs/arquitectura.md §5): Origin → sesión
// → PIN provisional → permiso → 415/400 → handler. Por eso un rol sin permiso
// recibe 403 aunque el cuerpo sea inválido, y sin Origin (métodos que
// modifican) el 403 ORIGIN_NOT_ALLOWED llega antes que el 401.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { enAlcance } from '../support/alcance.ts';
import { montarApp, type Ctx } from '../support/app.ts';
import { codigo, errorSinId, esperar401, esperarSinSetCookie, pedir, sesion, type Peticion, type Resp } from '../support/http.ts';
import { crearUsuario, type Rol } from '../support/fixtures.ts';
import { huella, sesionesDe } from '../support/bd.ts';
import { PERMISOS_ESPERADOS } from '../support/oraculo-permisos.ts';

type Quien = 'anonimo' | Rol | 'provisional';

interface Fila {
  historia: string;
  metodo: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  patron: string; // como lo registra Fastify
  permiso: string;
  roles: Rol[]; // roles con permiso (sin PIN provisional)
  /** Se permite con PIN provisional (RS-15). */
  conProvisional?: boolean;
  /** Flujo SSE: las celdas permitidas se prueban en tests/integration/realtime. */
  sse?: boolean;
  query?: string;
  /**
   * Cuerpo bien formado para las celdas de la tabla. Solo /auth/pin, para que
   * la celda "provisional" llegue al handler; su 403 FORBIDDEN sin PIN
   * provisional va en el hook de permiso, antes del cuerpo (T-39, caso aparte).
   */
  cuerpo?: unknown;
}

const W: Rol = 'waiter';
const K: Rol = 'kitchen';
const M: Rol = 'manager';

const TABLA: Fila[] = [
  // HU-01
  { historia: 'HU-01', metodo: 'GET', patron: '/auth/me', permiso: 'session:self', roles: [W, K, M], conProvisional: true },
  { historia: 'HU-01', metodo: 'POST', patron: '/auth/logout', permiso: 'session:self', roles: [W, K, M], conProvisional: true },
  // POST /auth/pin: solo con PIN provisional; sin él → 403 FORBIDDEN para todos los roles.
  { historia: 'HU-01', metodo: 'POST', patron: '/auth/pin', permiso: 'session:self', roles: [], conProvisional: true, cuerpo: { currentPin: '000000', newPin: '739164' } },
  { historia: 'HU-01', metodo: 'POST', patron: '/session/activity', permiso: 'session:self', roles: [W, K, M] },
  { historia: 'HU-01', metodo: 'GET', patron: '/events', permiso: 'events:subscribe', roles: [W, K, M], sse: true },
  // HU-05
  { historia: 'HU-05', metodo: 'GET', patron: '/menu', permiso: 'menu:read', roles: [W, K, M] },
  { historia: 'HU-05', metodo: 'PATCH', patron: '/products/:id/availability', permiso: 'product:set_availability', roles: [W, M] },
  { historia: 'HU-05', metodo: 'POST', patron: '/categories', permiso: 'menu:manage', roles: [M] },
  { historia: 'HU-05', metodo: 'PATCH', patron: '/categories/:id', permiso: 'menu:manage', roles: [M] },
  { historia: 'HU-05', metodo: 'DELETE', patron: '/categories/:id', permiso: 'menu:manage', roles: [M] },
  { historia: 'HU-05', metodo: 'POST', patron: '/products', permiso: 'menu:manage', roles: [M] },
  { historia: 'HU-05', metodo: 'PATCH', patron: '/products/:id', permiso: 'menu:manage', roles: [M] },
  { historia: 'HU-05', metodo: 'PUT', patron: '/menu/order', permiso: 'menu:manage', roles: [M] },
  // HU-02
  { historia: 'HU-02', metodo: 'GET', patron: '/tables/:n/open-orders', permiso: 'order:read', roles: [W, M] },
  { historia: 'HU-02', metodo: 'POST', patron: '/orders', permiso: 'order:create', roles: [W, M] },
  { historia: 'HU-02', metodo: 'GET', patron: '/orders/floor', permiso: 'order:read', roles: [W, M] },
  { historia: 'HU-02', metodo: 'GET', patron: '/orders/:id', permiso: 'order:read', roles: [W, M] },
  // HU-03
  { historia: 'HU-03', metodo: 'POST', patron: '/orders/:id/serve', permiso: 'order:serve', roles: [W, M] },
  { historia: 'HU-03', metodo: 'POST', patron: '/orders/:id/serve/undo', permiso: 'order:serve', roles: [W, M] },
  { historia: 'HU-03', metodo: 'GET', patron: '/kitchen/queue', permiso: 'kitchen:read', roles: [K, M] },
  { historia: 'HU-03', metodo: 'POST', patron: '/orders/:id/prep', permiso: 'kitchen:transition', roles: [K, M] },
  { historia: 'HU-03', metodo: 'POST', patron: '/orders/:id/kitchen-ack', permiso: 'kitchen:transition', roles: [K, M] },
  // HU-04
  { historia: 'HU-04', metodo: 'POST', patron: '/payments', permiso: 'payment:create', roles: [W, M] },
  { historia: 'HU-04', metodo: 'GET', patron: '/payments/today', permiso: 'payment:read', roles: [W, M] },
  { historia: 'HU-04', metodo: 'GET', patron: '/payments/:id', permiso: 'payment:read', roles: [W, M] },
  { historia: 'HU-04', metodo: 'GET', patron: '/payments/:id/ticket', permiso: 'payment:read', roles: [W, M] },
  { historia: 'HU-04', metodo: 'POST', patron: '/payments/:id/void', permiso: 'payment:void', roles: [M] },
  // HU-06
  { historia: 'HU-06', metodo: 'PATCH', patron: '/orders/:id/lines', permiso: 'order:modify', roles: [W, M] },
  { historia: 'HU-06', metodo: 'POST', patron: '/orders/:id/cancel', permiso: 'order:cancel', roles: [W, M] },
  { historia: 'HU-06', metodo: 'GET', patron: '/staff/managers', permiso: 'approval:request', roles: [W, M] },
  // HU-07
  { historia: 'HU-07', metodo: 'GET', patron: '/staff', permiso: 'staff:read', roles: [M] },
  { historia: 'HU-07', metodo: 'POST', patron: '/staff', permiso: 'staff:manage', roles: [M] },
  { historia: 'HU-07', metodo: 'PATCH', patron: '/staff/:id', permiso: 'staff:manage', roles: [M] },
  { historia: 'HU-07', metodo: 'POST', patron: '/staff/:id/reset-pin', permiso: 'staff:manage', roles: [M] },
  { historia: 'HU-07', metodo: 'POST', patron: '/staff/:id/unlock', permiso: 'staff:unlock', roles: [M] },
  // HU-08
  { historia: 'HU-08', metodo: 'GET', patron: '/reports/daily', permiso: 'reports:read', roles: [M], query: '?date=2026-11-24' },
  { historia: 'HU-08', metodo: 'POST', patron: '/reports/daily/:date/closing', permiso: 'reports:close', roles: [M] },
  // M-03 (telemetría): se añade al alcance cuando se implemente.
  { historia: 'M-03', metodo: 'POST', patron: '/telemetry', permiso: 'telemetry:write', roles: [W, K, M] },
];

function concreta(f: Fila): string {
  return (
    f.patron
      .replace(':id', randomUUID())
      .replace(':n', '1')
      .replace(':date', '2026-11-24') + (f.query ?? '')
  );
}

let ctx: Ctx;
const usuarios: Partial<Record<Quien, { nombre: string; pin: string }>> = {};

beforeAll(async () => {
  ctx = await montarApp();
  for (const r of [W, K, M] as Rol[]) usuarios[r] = await crearUsuario(ctx, { rol: r });
  usuarios.provisional = await crearUsuario(ctx, { rol: W, pinProvisional: true });
});
afterAll(async () => {
  await ctx?.cerrar();
});

async function cookieDe(q: Quien): Promise<string | undefined> {
  if (q === 'anonimo') return undefined;
  const u = usuarios[q]!;
  // Sesión nueva por celda: POST /auth/logout destruye la suya.
  return sesion(ctx, u.nombre, u.pin);
}

const QUIENES: Quien[] = ['anonimo', W, K, M, 'provisional'];

for (const f of TABLA) {
  describe.runIf(enAlcance(f.historia))(`${f.metodo} ${f.patron} (${f.historia})`, () => {
    test(`[HU-01/CA-N02][RS-17] la ruta existe y declara el permiso ${f.permiso}`, () => {
      expect(ctx.app.hasRoute({ method: f.metodo, url: '/api/v1' + f.patron })).toBe(true);
      const r = ctx.rutas.find((x) => x.url === '/api/v1' + f.patron && [x.method].flat().includes(f.metodo));
      expect(r, 'registrada con onRoute').toBeDefined();
      expect((r!.config as { permission?: string } | undefined)?.permission).toBe(f.permiso);
    });

    for (const q of QUIENES) {
      const permitido =
        q === 'anonimo' ? false : q === 'provisional' ? Boolean(f.conProvisional) : f.roles.includes(q as Rol);
      if (permitido && f.sse) continue; // flujo abierto: se prueba con HTTP real en realtime/
      test(`[HU-01/CA-F04][HU-01/CA-N02][RS-18] ${q} → ${permitido ? 'autorizado' : 'denegado'}`, async () => {
        const cookie = await cookieDe(q);
        const antes = await huella(ctx.bd);
        const r = await pedir(ctx, { metodo: f.metodo, ruta: concreta(f), cookie, cuerpo: f.metodo === 'GET' ? undefined : (f.cuerpo ?? {}) });
        if (q === 'anonimo') {
          esperar401(r, null);
        } else if (q === 'provisional' && !f.conProvisional) {
          expect(r.status).toBe(403);
          expect(codigo(r)).toBe('PIN_CHANGE_REQUIRED');
        } else if (!permitido) {
          expect(r.status).toBe(403);
          expect(codigo(r)).toBe('FORBIDDEN');
          expect(r.body.error.details, 'FORBIDDEN sin details').toBeUndefined();
        } else {
          expect(r.status).not.toBe(401);
          expect(['FORBIDDEN', 'PIN_CHANGE_REQUIRED']).not.toContain(codigo(r));
        }
        if (!permitido) expect(await huella(ctx.bd), 'sin efecto en BD').toBe(antes);
      });
    }

    if (f.metodo !== 'GET') {
      test(`[HU-01/CA-F04][RS-24] sin Origin → 403 ORIGIN_NOT_ALLOWED antes que la sesión (anónimo y encargado)`, async () => {
        for (const q of ['anonimo', M] as Quien[]) {
          const cookie = await cookieDe(q);
          const antes = await huella(ctx.bd);
          const r = await pedir(ctx, { metodo: f.metodo, ruta: concreta(f), cookie, cuerpo: f.cuerpo ?? {}, sinOrigen: true });
          expect(r.status, q).toBe(403);
          expect(codigo(r), q).toBe('ORIGIN_NOT_ALLOWED');
          expect(await huella(ctx.bd), 'sin efecto en BD').toBe(antes);
        }
      });

      const sinPermiso = ([W, K, M] as Rol[]).filter((q) => !f.roles.includes(q));
      // /auth/pin tiene su propio caso (T-39, abajo).
      if (f.roles.length > 0 && sinPermiso.length > 0) {
        test(`[HU-01/CA-F04][HU-01/CA-N02] rol sin permiso con cuerpo inválido (no JSON, texto) → 403 FORBIDDEN, no 400/415`, async () => {
          for (const q of sinPermiso) {
            const cookie = await cookieDe(q);
            const noJson = await pedir(ctx, { metodo: f.metodo, ruta: concreta(f), cookie, cuerpo: '{"x": ' });
            expect([noJson.status, codigo(noJson)], `${q} no JSON`).toEqual([403, 'FORBIDDEN']);
            const texto = await pedir(ctx, {
              metodo: f.metodo,
              ruta: concreta(f),
              cookie,
              cuerpo: 'a=1',
              cabeceras: { 'content-type': 'application/x-www-form-urlencoded' },
            });
            expect([texto.status, codigo(texto)], `${q} texto`).toEqual([403, 'FORBIDDEN']);
          }
        });
      }
    }
  });
}

// T-39 (docs/arquitectura.md §5, 2.1i): el 403 FORBIDDEN de POST /auth/pin
// sin PIN provisional lo da el hook de permiso (`provisionalPinOnly`), antes
// del analizador de cuerpo y de zod, y sin llamar a verifyPin.
describe.runIf(enAlcance('HU-01'))('POST /auth/pin sin PIN provisional con cuerpo inválido o ausente (T-39)', () => {
  test('[HU-01/CA-F12][HU-01/CA-N02][RS-16b] W, K y M: cuerpo ausente, {}, JSON roto, text/plain o con claves de más → 403 FORBIDDEN, sin verificar ningún PIN', async () => {
    const cuerpos: Pick<Peticion, 'cuerpo' | 'cabeceras'>[] = [
      {},
      { cuerpo: {} },
      { cuerpo: '{"currentPin": ' },
      { cuerpo: 'currentPin=1', cabeceras: { 'content-type': 'text/plain' } },
      { cuerpo: { currentPin: 7, newPin: [], otra: true } },
    ];
    for (const q of [W, K, M] as Rol[]) {
      for (const c of cuerpos) {
        const cookie = await cookieDe(q);
        const antes = ctx.hasher.verificaciones;
        const r = await pedir(ctx, { metodo: 'POST', ruta: '/auth/pin', cookie, ...c });
        expect([r.status, codigo(r)], `${q} ${JSON.stringify(c)}`).toEqual([403, 'FORBIDDEN']);
        expect(r.body.error.details).toBeUndefined();
        expect(ctx.hasher.verificaciones, 'sin verifyPin').toBe(antes);
      }
    }
  });
});

// RS-18 (docs/seguridad.md §7, ampliada en la 2.1k; T-40 opción (a), SEC-031):
// toda ruta o método no declarado bajo /api/ → 404 NOT_FOUND idéntico salvo
// requestId para todos (sin sesión, cookie válida/revocada/inventada, PIN
// provisional, W/K/M, sin Origin o con Origin ajeno) y con cualquier cuerpo;
// sin details, sin Set-Cookie, sin consultar la BD y sin renovar la
// actividad. Fuera de /api/, un método que no es GET/HEAD → 404, no index.html.
describe('Rutas que no existen (RS-18, T-40, SEC-031)', () => {
  let c: Ctx;
  type Estado = 'anonimo' | Rol | 'provisional' | 'revocada' | 'inventada';
  const cookies: Partial<Record<Estado, string | undefined>> = {};
  beforeAll(async () => {
    c = await montarApp();
    for (const r of [W, K, M] as Rol[]) {
      const u = await crearUsuario(c, { rol: r });
      cookies[r] = await sesion(c, u.nombre, u.pin);
    }
    const p = await crearUsuario(c, { rol: W, pinProvisional: true });
    cookies.provisional = await sesion(c, p.nombre, p.pin);
    const v = await crearUsuario(c, { rol: K });
    cookies.revocada = await sesion(c, v.nombre, v.pin);
    await pedir(c, { metodo: 'POST', ruta: '/auth/logout', cookie: cookies.revocada });
    cookies.inventada = '__Host-sid=' + 'Z'.repeat(43);
    cookies.anonimo = undefined;
  });
  afterAll(async () => {
    await c?.cerrar();
  });

  const ESTADOS: Estado[] = ['anonimo', W, K, M, 'provisional', 'revocada', 'inventada'];
  const ORIGENES: { nombre: string; p: Partial<Peticion> }[] = [
    { nombre: 'Origin correcto', p: {} },
    { nombre: 'sin Origin', p: { sinOrigen: true } },
    { nombre: 'Origin ajeno', p: { cabeceras: { origin: 'https://evil.test' } } },
  ];
  const GRANDE = '{"a":"' + 'x'.repeat(65 * 1024) + '"}';
  /** Peticiones a rutas o métodos no declarados bajo /api/ (cuerpo incluido). */
  const INEXISTENTES: { nombre: string; p: Peticion }[] = [
    { nombre: 'GET /settings', p: { ruta: '/settings' } },
    { nombre: 'PATCH /settings {}', p: { metodo: 'PATCH', ruta: '/settings', cuerpo: {} } },
    { nombre: 'PATCH /settings JSON inválido', p: { metodo: 'PATCH', ruta: '/settings', cuerpo: '{bad' } },
    { nombre: 'PATCH /settings text/plain', p: { metodo: 'PATCH', ruta: '/settings', cuerpo: 'a=1', cabeceras: { 'content-type': 'text/plain' } } },
    { nombre: 'PATCH /settings 65 KiB', p: { metodo: 'PATCH', ruta: '/settings', cuerpo: GRANDE } },
    { nombre: 'DELETE /auth/me (método no declarado)', p: { metodo: 'DELETE', ruta: '/auth/me' } },
    { nombre: 'PUT /session/activity (método no declarado)', p: { metodo: 'PUT', ruta: '/session/activity', cuerpo: '{bad' } },
    { nombre: 'GET /auth/me/ (barra final)', p: { ruta: '/auth/me/' } },
    { nombre: 'OPTIONS /auth/me', p: { metodo: 'OPTIONS', ruta: '/auth/me' } },
    { nombre: 'OPTIONS /settings', p: { metodo: 'OPTIONS', ruta: '/settings' } },
  ];

  function es404(r: Resp, que: string): void {
    expect([r.status, codigo(r)], que).toEqual([404, 'NOT_FOUND']);
    expect('details' in r.body.error, `${que}: sin details`).toBe(false);
    expect(r.body.error.requestId, que).toBe(r.headers['x-request-id']);
    esperarSinSetCookie(r);
  }

  async function conLimite<T>(p: Promise<T>, ms: number, que: string): Promise<T> {
    let t: ReturnType<typeof setTimeout> | undefined;
    const limite = new Promise<never>((_, mal) => {
      t = setTimeout(() => mal(new Error(`${que}: sin respuesta en ${ms} ms con sessions/users bloqueadas (¿consulta a la BD?)`)), ms);
    });
    try {
      return await Promise.race([p, limite]);
    } finally {
      clearTimeout(t);
    }
  }

  for (const metodo of ['GET', 'PATCH'] as const) {
    test(`[HU-01/CA-F04][HU-01/CA-N02][RS-18] ${metodo} /settings → 404 NOT_FOUND idéntico para cada estado de sesión y Origin`, async () => {
      const respuestas: Resp[] = [];
      for (const q of ESTADOS) {
        for (const o of ORIGENES) {
          const r = await pedir(c, { metodo, ruta: '/settings', cookie: cookies[q], cuerpo: metodo === 'GET' ? undefined : {}, ...o.p });
          es404(r, `${q}, ${o.nombre}`);
          respuestas.push(r);
        }
      }
      for (const r of respuestas) expect(errorSinId(r)).toEqual(errorSinId(respuestas[0]));
    });
  }

  test('[HU-01/CA-F04][HU-01/CA-N02][RS-18] cuerpo inválido o grande, método no declarado, barra final y OPTIONS → el mismo 404, con y sin sesión', async () => {
    const respuestas: Resp[] = [];
    for (const q of ['anonimo', W, 'provisional', 'inventada'] as Estado[]) {
      for (const x of INEXISTENTES) {
        const r = await pedir(c, { ...x.p, cookie: cookies[q] });
        es404(r, `${x.nombre}, ${q}`);
        respuestas.push(r);
      }
    }
    for (const r of respuestas) expect(errorSinId(r)).toEqual(errorSinId(respuestas[0]));
  });

  test('[HU-01/CA-F04][RS-18] sin consultar la BD: con sessions y users bloqueadas, los 404 responden; GET /auth/me (control) espera', async () => {
    const bloqueo = await c.bd.connect();
    let control: Promise<Resp> | undefined;
    try {
      await bloqueo.query('BEGIN');
      await bloqueo.query('LOCK TABLE sessions, users IN ACCESS EXCLUSIVE MODE');
      // Control: una ruta declarada con sesión sí consulta y queda esperando.
      control = pedir(c, { ruta: '/auth/me', cookie: cookies[M] });
      const pronto = await Promise.race([control.then(() => 'respondió'), new Promise((ok) => setTimeout(() => ok('espera'), 500))]);
      expect(pronto, 'el bloqueo de prueba no es efectivo').toBe('espera');
      for (const q of ['anonimo', M, 'inventada'] as Estado[]) {
        for (const x of INEXISTENTES) {
          es404(await conLimite(pedir(c, { ...x.p, cookie: cookies[q] }), 3000, `${x.nombre}, ${q}`), `${x.nombre}, ${q}`);
        }
      }
    } finally {
      await bloqueo.query('ROLLBACK').catch(() => undefined);
      bloqueo.release();
    }
    expect((await control!).status).toBe(200);
  });

  test('[HU-01/CA-F09][RS-18] un 404 con cookie no renueva la actividad: 14 min, 404, y a los 15 min GET /auth/me → 401 idle', async () => {
    const u = await crearUsuario(c, { rol: W });
    const cookie = await sesion(c, u.nombre, u.pin);
    const [antes] = await sesionesDe(c.bd, u.id);
    c.reloj.avanzar({ min: 14 });
    for (const x of INEXISTENTES) es404(await pedir(c, { ...x.p, cookie }), x.nombre);
    const [despues] = await sesionesDe(c.bd, u.id);
    expect(despues.last_activity_at.getTime()).toBe(antes.last_activity_at.getTime());
    c.reloj.avanzar({ min: 1 });
    esperar401(await pedir(c, { ruta: '/auth/me', cookie }), { reason: 'idle' });
  });

  test('[HU-01/CA-F04][RS-18] fuera de /api/, POST/PATCH/PUT/DELETE a una ruta de la SPA o inexistente → 404, nunca index.html', async () => {
    for (const metodo of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      for (const ruta of ['/pedidos', '/cola', '/', '/no-existe']) {
        const r = await pedir(c, { metodo, ruta, sinPrefijo: true, cookie: cookies[W], cuerpo: '{bad' });
        expect(r.status, `${metodo} ${ruta}`).toBe(404);
        expect(String(r.headers['content-type'] ?? ''), `${metodo} ${ruta}`).not.toMatch(/text\/html/);
        expect(r.raw, `${metodo} ${ruta}`).not.toMatch(/<html|<!doctype/i);
        esperarSinSetCookie(r);
      }
    }
  });
});

describe('Denegación por defecto (RS-17)', () => {
  test('[HU-01/CA-N02][RS-17] una ruta sin permission/public/internal en config responde 403 FORBIDDEN, sin ejecutar el handler', async () => {
    let ejecutado = 0;
    const c = await montarApp({
      antesDeReady: (app) => {
        // Solo en proceso: la imagen no tiene esta ruta. Se registra sin config.
        app.route({ method: 'GET', url: '/api/v1/prueba-sin-declaracion', handler: () => ((ejecutado += 1), { ok: true }) });
        app.route({ method: 'POST', url: '/api/v1/prueba-sin-declaracion', handler: () => ((ejecutado += 1), { ok: true }) });
      },
    });
    try {
      const m = await crearUsuario(c, { rol: M });
      const cookie = await sesion(c, m.nombre, m.pin);
      for (const metodo of ['GET', 'POST']) {
        const r = await pedir(c, { metodo, ruta: '/prueba-sin-declaracion', cookie, cuerpo: metodo === 'GET' ? undefined : {} });
        expect([r.status, codigo(r)], metodo).toEqual([403, 'FORBIDDEN']);
      }
      // Sin sesión, antes la sesión (401).
      esperar401(await pedir(c, { ruta: '/prueba-sin-declaracion' }), null);
      expect(ejecutado).toBe(0);
    } finally {
      await c.cerrar();
    }
  });

  test('[HU-01/CA-N02][RS-17] toda ruta registrada declara un permiso conocido, o es pública/interna de la lista cerrada', () => {
    expect(ctx.rutas.length).toBeGreaterThan(0);
    const conocidos = new Set(Object.values(PERMISOS_ESPERADOS).flat());
    const publicas = ['POST /api/v1/auth/login', 'GET /api/v1/auth/login-options'];
    const internas = ['GET /healthz', 'GET /readyz'];
    const sinPermiso: string[] = [];
    for (const r of ctx.rutas) {
      for (const m of [r.method].flat()) {
        if (m === 'HEAD' || m === 'OPTIONS') continue;
        const clave = `${m} ${r.url}`;
        const c = (r.config ?? {}) as { permission?: string; public?: boolean; internal?: boolean };
        if (c.public) expect(publicas, clave).toContain(clave);
        else if (c.internal) expect(internas, clave).toContain(clave);
        else if (!c.permission || !conocidos.has(c.permission)) sinPermiso.push(clave);
      }
    }
    expect(sinPermiso).toEqual([]);
    expect(ctx.rutas.some((r) => /settings/.test(r.url))).toBe(false);
  });
});
