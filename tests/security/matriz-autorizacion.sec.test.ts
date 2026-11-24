// HU-01/CA-F04, CA-N02; RS-15, RS-17, RS-18 (docs/testing.md §5.7).
// Tabla esperada escrita a mano desde docs/permisos.md §3 (revisión 1.4c), no
// desde permissions.ts (principio 2, T-18). Cada fila indica su historia: se
// ejecuta cuando la historia está en tests/support/alcance.ts.
//
// Para cada ruta × {sin sesión, camarero, barra, encargado, PIN provisional}:
//   - sin sesión → 401;
//   - PIN provisional → 403 PIN_CHANGE_REQUIRED (salvo /auth/me, /auth/pin, /auth/logout);
//   - rol sin permiso → 403 FORBIDDEN y la BD no cambia;
//   - rol con permiso → la autorización deja pasar (ni 401 ni esos 403; el
//     cuerpo vacío puede dar 400/404/409, que no se evalúan aquí).
// El middleware de permisos va antes de la validación (docs/arquitectura.md §5, §7).
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { enAlcance } from '../support/alcance.ts';
import { montarApp, type Ctx } from '../support/app.ts';
import { codigo, pedir, sesion } from '../support/http.ts';
import { crearUsuario, type Rol } from '../support/fixtures.ts';
import { huella } from '../support/bd.ts';
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
}

const W: Rol = 'waiter';
const K: Rol = 'kitchen';
const M: Rol = 'manager';

const TABLA: Fila[] = [
  // HU-01
  { historia: 'HU-01', metodo: 'GET', patron: '/auth/me', permiso: 'session:self', roles: [W, K, M], conProvisional: true },
  { historia: 'HU-01', metodo: 'POST', patron: '/auth/logout', permiso: 'session:self', roles: [W, K, M], conProvisional: true },
  // POST /auth/pin: solo con PIN provisional; sin él → 403 FORBIDDEN para todos los roles.
  { historia: 'HU-01', metodo: 'POST', patron: '/auth/pin', permiso: 'session:self', roles: [], conProvisional: true },
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
        const r = await pedir(ctx, { metodo: f.metodo, ruta: concreta(f), cookie, cuerpo: f.metodo === 'GET' ? undefined : {} });
        if (q === 'anonimo') {
          expect(r.status).toBe(401);
        } else if (q === 'provisional' && !f.conProvisional) {
          expect(r.status).toBe(403);
          expect(codigo(r)).toBe('PIN_CHANGE_REQUIRED');
        } else if (!permitido) {
          expect(r.status).toBe(403);
          expect(codigo(r)).toBe('FORBIDDEN');
        } else {
          expect(r.status).not.toBe(401);
          expect(['FORBIDDEN', 'PIN_CHANGE_REQUIRED']).not.toContain(codigo(r));
        }
        if (!permitido) expect(await huella(ctx.bd), 'sin efecto en BD').toBe(antes);
      });
    }
  });
}

describe('Rutas que no existen en el MVP (HU-09 fuera)', () => {
  for (const metodo of ['GET', 'PATCH'] as const) {
    test(`[HU-01/CA-F04][RS-18] ${metodo} /settings → 404 para todos`, async () => {
      for (const q of QUIENES) {
        const r = await pedir(ctx, { metodo, ruta: '/settings', cookie: await cookieDe(q), cuerpo: metodo === 'GET' ? undefined : {} });
        expect(r.status, q).toBe(404);
      }
    });
  }
});

describe('Denegación por defecto (RS-17)', () => {
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
