// SEC-047 (2.6, baja) y RS-05b ampliado: las variantes de un mismo nombre que
// PostgreSQL considera iguales (`lower()` de la BD) deben compartir el mismo
// cerrojo por cuenta de `verifyPin`. JavaScript y PostgreSQL no pasan a
// minúsculas igual (`'İ'.toLowerCase()` es `i` + U+0307; `lower('İ')` de
// PostgreSQL es `i`; la sigma final `Σ` da `ς` en JS y `σ` en PostgreSQL), así
// que una clave de cerrojo calculada con `toLowerCase()` reparte las variantes
// en carriles distintos y sus verificaciones argon2 corren en paralelo.
//
// ATENCIÓN (Developer): estos tests FALLAN mientras `accountKey` use
// `name.toLowerCase()` (apps/api/src/http/routes/auth.ts). Se esperan en verde
// tras la tarea 2.8b: la clave sale del `id` de la cuenta resuelto con la misma
// condición que la búsqueda (`lower(name) = lower($1)`), y `POST /auth/pin`
// usa el mismo carril (`user:<id>`). No se relajan: si hace falta otra forma de
// cumplir RS-05b, se avisa a Testing. Ver tests/README.md.
//
// Límites (RS-05b, docs/seguridad.md): una ráfaga contra una cuenta, desde IP
// distintas, hace como mucho 5 verificaciones y el resto recibe 423; el
// contador no pasa de 5 (el bloqueo siguiente es a los 10).
import { randomInt } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { codigo, ipUnica, pedir, sesion, type Resp } from '../../support/http.ts';
import { crearUsuario, pinIncorrecto } from '../../support/fixtures.ts';
import { sesionesDe, usuario } from '../../support/bd.ts';

let ctx: Ctx;
beforeEach(async () => {
  ctx = await montarApp();
});
afterEach(async () => {
  await ctx?.cerrar();
});

/** Todas las combinaciones de sustituir cada `i` de `base` por `İ` (2^k variantes; la primera es `base`). */
function variantesConI(base: string): string[] {
  const posiciones = [...base].flatMap((c, i) => (c === 'i' ? [i] : []));
  const out: string[] = [];
  for (let mascara = 0; mascara < 2 ** posiciones.length; mascara++) {
    const letras = [...base];
    posiciones.forEach((p, k) => {
      if (mascara & (1 << k)) letras[p] = 'İ';
    });
    out.push(letras.join(''));
  }
  return out;
}

/** Variantes con `i`/`İ` y con la sigma final `σ`/`Σ`. */
function variantesConISigma(base: string): string[] {
  const conI = variantesConI(base.slice(0, -1));
  const ultima = base.slice(-1);
  return conI.flatMap((v) => [v + ultima, v + ultima.toUpperCase()]);
}

function sufijo(): string {
  return String(randomInt(100_000, 999_999));
}

function contar(rs: Resp[]): Record<number, number> {
  const c: Record<number, number> = {};
  for (const r of rs) c[r.status] = (c[r.status] ?? 0) + 1;
  return c;
}

function login(nombre: string, pin: string, ip: string = ipUnica()): Promise<Resp> {
  return pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: nombre, pin }, ip });
}

/** Precondición: PostgreSQL de la pila trata todas las variantes como el mismo usuario. */
async function exigirMismaCuenta(variantes: string[], id: string): Promise<void> {
  const r = await ctx.bd.query<{ nombre: string; id: string | null }>(
    `SELECT v AS nombre, (SELECT id FROM users WHERE lower(name) = lower(v)) AS id FROM unnest($1::text[]) AS v`,
    [variantes],
  );
  const distintas = r.rows.filter((f) => f.id !== id).map((f) => f.nombre);
  expect(distintas, 'precondición: variantes que PostgreSQL NO resuelve a la misma cuenta').toEqual([]);
}

describe('RS-05b / SEC-047: variantes del nombre comparten el cerrojo de la cuenta', () => {
  test('[HU-01/CA-F06][RS-05b][SEC-047] 16 variantes i/İ de un nombre con 4 «i», en paralelo y desde IP distintas → como mucho 5 verificaciones argon2 y el resto 423', async () => {
    const base = `iiii${sufijo()}`;
    const u = await crearUsuario(ctx, { rol: 'waiter', nombre: base });
    const variantes = variantesConI(base);
    expect(variantes).toHaveLength(16);
    await exigirMismaCuenta(variantes, u.id);
    const antes = ctx.hasher.verificaciones;

    const respuestas = await Promise.all(variantes.map((n) => login(n, pinIncorrecto(u.pin))));

    const c = contar(respuestas);
    const verificaciones = ctx.hasher.verificaciones - antes;
    expect(verificaciones, `llamadas al hasher (reparto de estados ${JSON.stringify(c)})`).toBeLessThanOrEqual(5);
    expect(Object.keys(c).map(Number).sort(), `reparto de estados ${JSON.stringify(c)}`).toEqual([401, 423]);
    expect(c[401], 'respuestas 401 (verificaciones que sí se hicieron)').toBeLessThanOrEqual(5);
    expect(c[423], 'respuestas 423').toBeGreaterThanOrEqual(16 - 5);
    const fila = await usuario(ctx.bd, u.id);
    expect(fila.failed_attempts, 'contador de fallos de la cuenta').toBeLessThanOrEqual(5);
    expect(fila.locked_until, 'bloqueo de 5 min activo').not.toBeNull();
    expect(fila.locked_manual).toBe(false);
  });

  test('[HU-01/CA-F06][RS-05b][SEC-047] 16 variantes con i/İ y sigma final σ/Σ (donde toLowerCase() de JS ≠ lower() de PostgreSQL) → como mucho 5 verificaciones', async () => {
    const base = `iii${sufijo()}ασ`;
    const u = await crearUsuario(ctx, { rol: 'waiter', nombre: base });
    const variantes = variantesConISigma(base);
    expect(variantes).toHaveLength(16);
    // JS reparte las 16 variantes en más de un carril: la prueba solo discrimina si es así.
    expect(new Set(variantes.map((v) => v.toLowerCase())).size, 'carriles distintos con toLowerCase()').toBeGreaterThan(5);
    await exigirMismaCuenta(variantes, u.id);
    const antes = ctx.hasher.verificaciones;

    const respuestas = await Promise.all(variantes.map((n) => login(n, pinIncorrecto(u.pin))));

    const c = contar(respuestas);
    expect(ctx.hasher.verificaciones - antes, `llamadas al hasher (reparto de estados ${JSON.stringify(c)})`).toBeLessThanOrEqual(5);
    expect(Object.keys(c).map(Number).sort(), `reparto de estados ${JSON.stringify(c)}`).toEqual([401, 423]);
    expect((await usuario(ctx.bd, u.id)).failed_attempts, 'contador de fallos').toBeLessThanOrEqual(5);
  });

  test('[HU-01/CA-F13][RS-05b][SEC-047] con 19 fallos, 15 variantes erróneas y el PIN correcto (otra variante, el último en llegar) → bloqueo indefinido con contador ≤ 20, el correcto da 423 y 0 sesiones', async () => {
    const base = `iiii${sufijo()}`;
    const u = await crearUsuario(ctx, { rol: 'waiter', nombre: base, fallos: 19 });
    const variantes = variantesConI(base);
    await exigirMismaCuenta(variantes, u.id);
    const [correcta, ...erroneas] = variantes.slice().reverse();

    // Las erróneas se lanzan antes que la correcta (la cola del cerrojo es FIFO).
    const rErroneas = erroneas.map((n) => login(n, pinIncorrecto(u.pin)));
    const rCorrecto = login(correcta, u.pin);
    const respuestas = await Promise.all([rCorrecto, ...rErroneas]);

    const fila = await usuario(ctx.bd, u.id);
    expect(fila.locked_manual, 'la ráfaga llevó la cuenta al bloqueo indefinido').toBe(true);
    expect(fila.failed_attempts, 'el contador no sobrepasa el umbral del bloqueo indefinido (20)').toBeLessThanOrEqual(20);
    expect(respuestas[0].status, `acierto con la cuenta bloqueada: ${respuestas[0].raw.slice(0, 200)}`).toBe(423);
    expect((await sesionesDe(ctx.bd, u.id)).filter((s) => s.revoked_at === null).length, 'sesiones abiertas de una cuenta bloqueada').toBe(0);
  });

  test('[HU-01/CA-F06][RS-05b][SEC-047] un login y un cambio de PIN (POST /auth/pin) de la misma cuenta nunca verifican a la vez', async () => {
    const base = `iiii${sufijo()}`;
    const u = await crearUsuario(ctx, { rol: 'waiter', nombre: base, pinProvisional: true });
    const cookie = await sesion(ctx, base, u.pin);
    const variantes = variantesConI(base).filter((v) => v !== base);
    await exigirMismaCuenta([base, ...variantes], u.id);
    ctx.hasher.reiniciarSimultaneas();
    const antes = ctx.hasher.verificaciones;

    // 4 logins con variantes del nombre y 4 cambios de PIN con currentPin erróneo, todos a la vez.
    const respuestas = await Promise.all([
      ...variantes.slice(0, 4).map((n) => login(n, pinIncorrecto(u.pin))),
      ...Array.from({ length: 4 }, () =>
        pedir(ctx, { metodo: 'POST', ruta: '/auth/pin', cookie, ip: ipUnica(), cuerpo: { currentPin: pinIncorrecto(u.pin), newPin: '482916' } }),
      ),
    ]);

    expect(ctx.hasher.verificaciones - antes, 'al menos una verificación real').toBeGreaterThan(0);
    expect(ctx.hasher.maxSimultaneas, 'verificaciones simultáneas de la misma cuenta (login y cambio de PIN comparten carril)').toBe(1);
    // Todo son rechazos: nadie cambió el PIN ni abrió sesión con un PIN erróneo.
    expect(respuestas.map((r) => r.status).every((s) => [401, 403, 423].includes(s)), `estados ${JSON.stringify(respuestas.map((r) => `${r.status}/${codigo(r)}`))}`).toBe(true);
  });
});
