// Regresión automática de SEC-042 (tarea 2.8a, D-2.5-02): un carácter de
// control (C0 o DEL) en el nombre de login se rechaza con 400 VALIDATION_FAILED
// y `rule: 'format'` en `name`, sin 500, sin líneas de nivel `error` en los
// logs (cualquiera sin sesión podía generar `5xx` y ruido en las alertas) y sin
// repetir el valor recibido (RS-31). No se prueban aquí los C1 (U+0080–U+009F)
// ni los espacios Unicode: hoy (HU-01) `apiText` solo rechaza C0 y DEL y esos
// dan 401 normal, pero docs/arquitectura.md §18.2 (D-2.5-03 c, confirmada por
// cybersecurity en docs/seguridad.md §6.14) decide que `apiText` ampliado los
// rechazará: en el login pasarán a `400 VALIDATION_FAILED` con `rule: 'format'`
// en `name`, sin líneas de nivel error. Esos tests (\u0085, \u009f, \u202e,
// \u2066, \u2028 y "\ud800") llegan con HU-05, que implementa `apiText` y `apiName`.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { codigo, incidencias, ipUnica, pedir } from '../../support/http.ts';
import { crearUsuario } from '../../support/fixtures.ts';
import { sesionesDe } from '../../support/bd.ts';

let ctx: Ctx;
beforeEach(async () => {
  ctx = await montarApp();
});
afterEach(async () => {
  await ctx?.cerrar();
});

const CONTROLES: [string, string][] = [
  ['NUL en medio', 'a\u0000b'],
  ['BEL (U+0007)', '\u0007'],
  ['salto de línea al final', 'Lucía\n'],
  ['tabulador al principio', '\tLucía'],
  ['ESC (U+001B)', 'Lu\u001Bcía'],
  ['DEL (U+007F)', '\u007f'],
  ['NUL como único carácter', '\u0000'],
];

describe('SEC-042: caracteres de control en el nombre de login', () => {
  for (const [descripcion, nombre] of CONTROLES) {
    test(`[HU-01/CA-F05][SEC-042] ${descripcion} → 400 VALIDATION_FAILED con rule "format" en name, sin logs de error`, async () => {
      const antesHasher = ctx.hasher.verificaciones;
      const r = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: nombre, pin: '482916' }, ip: ipUnica() });

      expect(r.status, `estado (${r.raw.slice(0, 200)})`).toBe(400);
      expect(codigo(r)).toBe('VALIDATION_FAILED');
      expect(incidencias(r)).toEqual([{ path: ['name'], rule: 'format' }]);
      // RS-31: el error no repite el valor recibido.
      expect(r.raw).not.toContain(JSON.stringify(nombre).slice(1, -1));
      expect(r.raw).not.toContain('482916');

      const graves = ctx.logs.registros.filter((l) => l.level === 'error' || l.level === 'fatal');
      expect(graves.map((l) => `${l.event}: ${String(l.msg)}`), 'líneas de nivel error o fatal').toEqual([]);
      expect(ctx.logs.eventos('http.request.unhandled_error')).toEqual([]);
      expect(ctx.hasher.verificaciones, 'no se calcula ningún hash').toBe(antesHasher);
    });
  }

  test('[HU-01/CA-F05][SEC-042] un nombre con control no cuenta como intento fallido de nadie y no abre sesiones', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const ip = ipUnica();
    for (let i = 0; i < 12; i++) {
      const r = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: `${u.nombre}\u0000`, pin: u.pin }, ip });
      expect(r.status).toBe(400);
    }
    // 12 rechazos de formato desde la misma IP no la bloquean (el límite es de 10 FALLOS de PIN).
    const ok = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: u.nombre, pin: u.pin }, ip });
    expect(ok.status, 'el login correcto desde esa IP sigue funcionando').toBe(200);
    expect((await sesionesDe(ctx.bd, u.id)).length, 'solo la sesión del login correcto').toBe(1);
  });

  test('[HU-01/CA-F05][SEC-042] los caracteres corrientes (acentos, eñes, espacios internos, guiones) siguen aceptándose', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter', nombre: 'José Mª Ñandú-2' });
    const r = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: u.nombre, pin: u.pin }, ip: ipUnica() });
    expect(r.status).toBe(200);
  });
});
