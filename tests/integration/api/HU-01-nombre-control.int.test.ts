// Regresión automática de SEC-042 (tarea 2.8a, D-2.5-02) y regla general de texto
// de docs/arquitectura.md §18.2 (D-2.5-03 c; confirmada por Cybersecurity en
// docs/seguridad.md §6.14, condiciones C10 y C11), actualizada en la tarea 2.20
// (HU-05): un carácter de control en el nombre de login se rechaza con
// 400 VALIDATION_FAILED y `rule: 'format'` en `name`, sin 500, sin líneas de nivel
// `error` en los logs (cualquiera sin sesión podía generar `5xx` y ruido en las
// alertas) y sin repetir el valor recibido (RS-31).
//
// CAMBIO A PROPÓSITO (tarea 2.20, para el Developer de HU-05): con HU-01 `apiText`
// solo rechazaba C0 y DEL y no normalizaba, así que un C1 (U+0080–U+009F), U+2028,
// U+2029, un control bidireccional o un sustituto UTF-16 suelto daban `401`
// normal y este fichero no los fijaba. Desde que `apiText` pasa a la regla
// general (NFC; \p{Cc} incluido C1, U+2028/2029, U+202A–U+202E, U+2066–U+2069 y
// `!isWellFormed()`), el `name` del login los rechaza con `400 format`: el `400`
// solo depende de la cadena recibida, antes de cualquier consulta o hash, así
// que no distingue cuentas ni cuesta hash (docs/seguridad.md §6.14 punto 3). Los
// casos nuevos (C1, U+202E, U+2066, U+2028/2029 y un sustituto suelto) FALLAN con el código de
// HU-01 (devuelve 401) y deben pasar con HU-05. Las marcas direccionales
// U+200E/U+200F/U+061C no se rechazan en texto libre (último test): siguen dando 401.
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
  // Nuevos en la 2.20 (regla general de texto, §18.2): fallan hasta HU-05.
  ['C1: NEL (U+0085)', '\u0085'],
  ['C1: último (U+009F)', '\u009f'],
  ['C1 en medio de un nombre real', 'Lu\u0085cía'],
  ['C1 primero (U+0080)', '\u0080'],
  ['override bidireccional RLO (U+202E)', '\u202e'],
  ['aislamiento bidireccional LRI (U+2066)', '\u2066'],
  ['control bidireccional RLE (U+202B) en medio', 'Lu\u202bcía'],
  ['aislamiento PDI (U+2069) al final', 'Lucía\u2069'],
  ['separador de línea (U+2028)', '\u2028'],
  ['separador de párrafo (U+2029)', '\u2029'],
  ['sustituto alto suelto', '\ud800'],
  ['sustituto bajo suelto en medio', 'Lu\udc00cía'],
  ['sustituto alto suelto al final', 'Lucía\ud83d'],
];

describe('SEC-042 y §18.2: caracteres de control en el nombre de login', () => {
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

  test('[HU-01/CA-F05][SEC-042] las marcas direccionales U+200E, U+200F y U+061C no se rechazan en el login (texto libre, docs/seguridad.md §6.14): login normal, 401', async () => {
    for (const marca of ['\u200e', '\u200f', '\u061c']) {
      const r = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: `Lucía${marca}`, pin: '482916' }, ip: ipUnica() });
      expect([r.status, codigo(r)], JSON.stringify(marca)).toEqual([401, 'INVALID_CREDENTIALS']);
    }
  });

  test('[HU-01/CA-F05][SEC-042] los caracteres corrientes (acentos, eñes, espacios internos, guiones) siguen aceptándose', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter', nombre: 'José Mª Ñandú-2' });
    const r = await pedir(ctx, { metodo: 'POST', ruta: '/auth/login', cuerpo: { name: u.nombre, pin: u.pin }, ip: ipUnica() });
    expect(r.status).toBe(200);
  });
});
