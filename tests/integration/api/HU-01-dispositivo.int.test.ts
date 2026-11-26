// HU-01/CA-F11 (I-02, I-03), CA-N05; RS-05, RS-06. Límite por dispositivo
// (= IP de origen que ve el servidor): 10 fallos en 10 min → 429 durante 10 min,
// para cualquier usuario y antes de calcular el hash. Ventana móvil.
// Los fallos se reparten entre usuarios distintos para que no salte el
// bloqueo por usuario (CA-F06).
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { buildApp } from '@mi-app/api/app';
import { ConfigError } from '@mi-app/api/config';
import { depsApp, IP_PROXY, montarApp, type Ctx } from '../../support/app.ts';
import { codigo, IP_A, IP_B, iniciarSesion, pedir, reintentarEn, sesion, type Resp } from '../../support/http.ts';
import { crearUsuario, pinIncorrecto, type UsuarioPrueba } from '../../support/fixtures.ts';
import { usuario } from '../../support/bd.ts';
import { valorMetrica } from '../../support/metricas.ts';

let ctx: Ctx;
let victimas: UsuarioPrueba[];
beforeEach(async () => {
  ctx = await montarApp();
  victimas = [];
  for (let i = 0; i < 4; i++) victimas.push(await crearUsuario(ctx, { rol: 'waiter' }));
});
afterEach(async () => {
  await ctx?.cerrar();
});

/**
 * n fallos de login desde `ip`, repartidos entre las víctimas empezando por la
 * `inicio`-ésima: con 4 víctimas y n <= 10 ninguna llega a 5 fallos (bloqueo,
 * CA-F06). Si se llama de uno en uno hay que pasar `inicio` rotando (D-2.2-04).
 */
async function fallosDesde(ip: string, n: number, cabeceras?: Record<string, string>, inicio = 0): Promise<Resp[]> {
  const out: Resp[] = [];
  for (let i = 0; i < n; i++) {
    const u = victimas[(inicio + i) % victimas.length];
    out.push(
      await pedir(ctx, {
        metodo: 'POST',
        ruta: '/auth/login',
        cuerpo: { name: u.nombre, pin: pinIncorrecto(u.pin) },
        ip,
        cabeceras,
      }),
    );
  }
  return out;
}

describe('Límite de 10 fallos en 10 min por dispositivo', () => {
  test('[HU-01/CA-F11][RS-05] tras 10 fallos, el 11.º intento (con PIN correcto de otro usuario) → 429 sin hash, 10 min', async () => {
    const otro = await crearUsuario(ctx, { rol: 'kitchen' });
    const respuestas = await fallosDesde(IP_A, 10);
    expect(respuestas.map((r) => r.status)).toEqual(Array(10).fill(401));

    const antes = ctx.hasher.verificaciones;
    const r = (await iniciarSesion(ctx, otro.nombre, otro.pin, IP_A)).res;
    expect(r.status).toBe(429);
    expect(codigo(r)).toBe('TOO_MANY_ATTEMPTS');
    expect(reintentarEn(r)).toBe(600);
    expect(ctx.hasher.verificaciones).toBe(antes);
    // El rechazo no cuenta para el usuario.
    expect((await usuario(ctx.bd, otro.id)).failed_attempts).toBe(0);
  });

  test('[HU-01/CA-F11][RS-05] el límite es del dispositivo: desde otra IP se entra con normalidad', async () => {
    const otro = await crearUsuario(ctx, { rol: 'kitchen' });
    await fallosDesde(IP_A, 10);
    expect((await iniciarSesion(ctx, otro.nombre, otro.pin, IP_B)).res.status).toBe(200);
  });

  test('[HU-01/CA-F11][RS-05] el rechazo dura 10 min desde el 10.º fallo: a 9 min 59 s sigue, a 10 min ya no', async () => {
    const otro = await crearUsuario(ctx, { rol: 'kitchen' });
    await fallosDesde(IP_A, 10);
    ctx.reloj.avanzar({ min: 9, s: 59 });
    const r = (await iniciarSesion(ctx, otro.nombre, otro.pin, IP_A)).res;
    expect(r.status).toBe(429);
    expect(reintentarEn(r)).toBe(1);
    ctx.reloj.avanzar({ s: 1 });
    expect((await iniciarSesion(ctx, otro.nombre, otro.pin, IP_A)).res.status).toBe(200);
  });

  test('[HU-01/CA-F11][RS-05] los intentos rechazados con 429 no alargan el bloqueo del dispositivo', async () => {
    const otro = await crearUsuario(ctx, { rol: 'kitchen' });
    await fallosDesde(IP_A, 10);
    for (let i = 0; i < 5; i++) {
      ctx.reloj.avanzar({ min: 1 });
      expect((await fallosDesde(IP_A, 1))[0].status).toBe(429);
    }
    ctx.reloj.avanzar({ min: 5 });
    expect((await iniciarSesion(ctx, otro.nombre, otro.pin, IP_A)).res.status).toBe(200);
  });

  test('[HU-01/CA-F11][RS-05] ventana móvil: 9 fallos + 1 a los 9 min 59 s cuentan juntos', async () => {
    const otro = await crearUsuario(ctx, { rol: 'kitchen' });
    await fallosDesde(IP_A, 9);
    ctx.reloj.avanzar({ min: 9, s: 59 });
    await fallosDesde(IP_A, 1);
    expect((await iniciarSesion(ctx, otro.nombre, otro.pin, IP_A)).res.status).toBe(429);
  });

  test('[HU-01/CA-F11][RS-05] ventana móvil: fallos de hace más de 10 min ya no cuentan', async () => {
    const otro = await crearUsuario(ctx, { rol: 'kitchen' });
    await fallosDesde(IP_A, 9);
    ctx.reloj.avanzar({ min: 10, s: 1 });
    await fallosDesde(IP_A, 1);
    expect((await iniciarSesion(ctx, otro.nombre, otro.pin, IP_A)).res.status).toBe(200);
  });

  test('[HU-01/CA-F11][RS-05] los aciertos no restan: 9 fallos, un acierto y 1 fallo más → 429', async () => {
    const otro = await crearUsuario(ctx, { rol: 'kitchen' });
    await fallosDesde(IP_A, 9);
    expect((await iniciarSesion(ctx, otro.nombre, otro.pin, IP_A)).res.status).toBe(200);
    await fallosDesde(IP_A, 1);
    expect((await iniciarSesion(ctx, otro.nombre, otro.pin, IP_A)).res.status).toBe(429);
  });

  test('[HU-01/CA-F11][RS-05] mientras dura, GET /auth/login-options también responde 429', async () => {
    await fallosDesde(IP_A, 10);
    expect((await pedir(ctx, { ruta: '/auth/login-options', ip: IP_A })).status).toBe(429);
    expect((await pedir(ctx, { ruta: '/auth/login-options', ip: IP_B })).status).toBe(200);
  });

  test('[HU-01/CA-F11][I-02] el PIN actual erróneo del cambio de PIN suma al mismo límite del dispositivo', async () => {
    const prov = await crearUsuario(ctx, { rol: 'waiter', pinProvisional: true });
    const cookie = await sesion(ctx, prov.nombre, prov.pin, IP_A);
    await fallosDesde(IP_A, 6);
    for (let i = 0; i < 4; i++) {
      const r = await pedir(ctx, {
        metodo: 'POST',
        ruta: '/auth/pin',
        cookie,
        ip: IP_A,
        cuerpo: { currentPin: pinIncorrecto(prov.pin), newPin: '739164' },
      });
      expect(r.status).toBe(403);
    }
    const otro = await crearUsuario(ctx, { rol: 'kitchen' });
    expect((await iniciarSesion(ctx, otro.nombre, otro.pin, IP_A)).res.status).toBe(429);
  });
});

describe('La IP que cuenta es la del dispositivo (RS-06)', () => {
  test('[HU-01/CA-F11][RS-06] X-Forwarded-For enviado por el cliente se ignora: el límite salta igual', async () => {
    let n = 0;
    const respuestas: Resp[] = [];
    for (let i = 0; i < 10; i++) {
      n += 1;
      // D-2.2-04: se rota la víctima en cada llamada; con la misma, el 6.º fallo
      // sería 423 (CA-F06), no 401, y el test no probaría X-Forwarded-For.
      respuestas.push(...(await fallosDesde(IP_A, 1, { 'x-forwarded-for': `203.0.113.${n}` }, i)));
    }
    expect(respuestas.every((r) => r.status === 401)).toBe(true);
    const otro = await crearUsuario(ctx, { rol: 'kitchen' });
    const r = await pedir(ctx, {
      metodo: 'POST',
      ruta: '/auth/login',
      cuerpo: { name: otro.nombre, pin: otro.pin },
      ip: IP_A,
      cabeceras: { 'x-forwarded-for': '203.0.113.250' },
    });
    expect(r.status).toBe(429);
  });

  test('[HU-01/CA-F11][RS-06] a través del proxy de confianza, cada dispositivo (X-Forwarded-For) tiene su propio límite', async () => {
    await fallosDesde(IP_PROXY, 10, { 'x-forwarded-for': '192.168.10.21' });
    const otro = await crearUsuario(ctx, { rol: 'kitchen' });
    const desde = (ipDispositivo: string) =>
      pedir(ctx, {
        metodo: 'POST',
        ruta: '/auth/login',
        cuerpo: { name: otro.nombre, pin: otro.pin },
        ip: IP_PROXY,
        cabeceras: { 'x-forwarded-for': ipDispositivo },
      });
    expect((await desde('192.168.10.21')).status).toBe(429);
    expect((await desde('192.168.10.22')).status).toBe(200);
  });
});

describe('Registro del rechazo por dispositivo (CA-N05)', () => {
  test('[HU-01/CA-N05][RS-30] cada 429 deja auth.verify.rate_limited (scope ip) y la métrica rate_limited_ip', async () => {
    const otro = await crearUsuario(ctx, { rol: 'kitchen' });
    const antes = valorMetrica(await ctx.app.metricsText(), 'auth_verifications_total', { purpose: 'login', result: 'rate_limited_ip' });
    expect(antes).toBe(0);
    await fallosDesde(IP_A, 10);
    await iniciarSesion(ctx, otro.nombre, otro.pin, IP_A);
    const ev = ctx.logs.eventos('auth.verify.rate_limited');
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ purpose: 'login', scope: 'ip', retry_after_s: 600, client_ip: IP_A, category: 'security' });
    expect(valorMetrica(await ctx.app.metricsText(), 'auth_verifications_total', { purpose: 'login', result: 'rate_limited_ip' })).toBe(1);
    expect(valorMetrica(await ctx.app.metricsText(), 'auth_login_attempts_total', { result: 'ip_rate_limited' })).toBe(1);
  });
});

// SEC-029 / SEC-045 (b): buildApp valida trustedProxies como parseSettings y pasa a
// Fastify el array validado o false, nunca `true`, un nombre de proxy-addr
// ('uniquelocal', 'loopback', 'linklocal') ni un número de saltos. Si no, un
// cliente podría saltarse el límite por IP con X-Forwarded-For (CA-F11, RS-06).
describe('trustedProxies en buildApp (SEC-029)', () => {
  async function intentar(trustedProxies: unknown): Promise<unknown> {
    let app: { close(): Promise<void> } | undefined;
    let error: unknown;
    try {
      app = (await buildApp(depsApp({ trustedProxies }) as never)) as unknown as { close(): Promise<void> };
    } catch (e) {
      error = e;
    }
    await app?.close();
    return error;
  }

  test.each([
    [['uniquelocal']],
    ['uniquelocal'],
    [['loopback']],
    [['linklocal']],
    [true],
    [1],
    [['10.0.0.0/8']],
    [['0.0.0.0/0']],
    [['::/0']],
    [[' 10.89.240.2']],
    [['10.89.240.2 ']],
    [['10.89.240.2', '']],
    [['10.89.240.2', '10.89.240.3', '10.89.240.4', '10.89.240.5', '10.89.240.6']],
  ])('[HU-01/CA-F11][RS-06] buildApp rechaza trustedProxies = %j con ConfigError("trustedProxies")', async (valor) => {
    const e = await intentar(valor);
    expect(e, `trustedProxies = ${JSON.stringify(valor)} debería rechazarse`).toBeInstanceOf(ConfigError);
    expect((e as ConfigError).variable).toBe('trustedProxies');
    // El mensaje no repite el valor recibido (RS-31).
    for (const f of [valor].flat().filter((x): x is string => typeof x === 'string' && x.trim().length >= 3)) {
      expect((e as ConfigError).message).not.toContain(f);
    }
  });

  test.each([[[]], [['10.89.240.2']], [['10.89.240.0/24']], [['fd00::2', '10.89.240.2']]])(
    '[HU-01/CA-F11][RS-06] buildApp acepta trustedProxies = %j',
    async (valor) => {
      expect(await intentar(valor)).toBeUndefined();
    },
  );
});
