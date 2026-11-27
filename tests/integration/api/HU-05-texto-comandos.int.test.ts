// docs/seguridad.md §6.14, condición C10: `create-initial-manager` valida y
// normaliza el nombre con `apiName` (docs/arquitectura.md §5: "encargado
// inicial" figura en la lista de campos de apiName), igual que cualquier otro
// nombre de usuario (HU-07). Hoy (HU-01) solo hace `trim()` y comprueba la
// longitud, así que estos casos FALLAN hasta HU-05:
//   - un nombre con controles, C1, bidireccionales, invisibles (Cf), uso privado,
//     sin asignar, sustitutos sueltos o espacios que no son U+0020 → InvalidNameError
//     (el CLI sale con 1 y stderr explica el error), sin crear nada;
//   - un nombre válido se guarda NFC, sin espacios sobrantes (y el login lo
//     encuentra con la forma compuesta y con la descompuesta, C11);
//   - los límites 1–30 se miden tras normalizar.
// Los casos de longitud y PIN que ya cubre HU-01-encargado-inicial.int.test.ts
// no cambian y siguen en verde.
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createInitialManager, InvalidNameError } from '@mi-app/api/commands';
import { runCommand } from '@mi-app/api/commands/cli';
import { depsComando, montarApp, type Ctx } from '../../support/app.ts';
import { iniciarSesion } from '../../support/http.ts';
import { pinAleatorio } from '../../support/fixtures.ts';
import { variable } from '../../support/entorno.ts';

let ctx: Ctx;
beforeEach(async () => {
  // BD sin ningún usuario (RS-09), clonada de la plantilla.
  ctx = await montarApp({ bdAislada: true });
});
afterEach(async () => {
  await ctx?.cerrar();
});

const INVALIDOS: [string, string][] = [
  ['NUL', 'Mar\u0000ta'],
  ['tabulador en medio', 'Mar\tta'],
  ['C1 NEL (U+0085)', 'Mar\u0085ta'],
  ['C1 último (U+009F)', 'Mar\u009fta'],
  ['override bidireccional (U+202E)', 'Mar\u202eta'],
  ['aislamiento bidireccional (U+2066)', 'Mar\u2066ta'],
  ['separador de línea (U+2028)', 'Mar\u2028ta'],
  ['sustituto UTF-16 suelto', 'Mar\ud800ta'],
  ['espacio de ancho cero (U+200B)', 'Mar\u200bta'],
  ['guion blando (U+00AD)', 'Mar\u00adta'],
  ['uso privado (U+E000)', 'Mar\ue000ta'],
  ['sin asignar (U+0378)', 'Mar\u0378ta'],
  ['NBSP (U+00A0)', 'Mar\u00a0ta'],
  ['espacio ideográfico (U+3000)', 'Mar\u3000ta'],
  ['solo un invisible', '\u200b'],
];

async function encargados(): Promise<{ id: string; name: string }[]> {
  const r = await ctx.bd.query<{ id: string; name: string }>(`SELECT id, name FROM users WHERE role = 'manager'`);
  return r.rows;
}

describe('createInitialManager valida el nombre con apiName (C10)', () => {
  test.each(INVALIDOS)('[HU-07/CA-F04][HU-05/CA-F01][C10] nombre con %s → InvalidNameError y no crea nada', async (_d, nombre) => {
    const pin = pinAleatorio('manager');
    let error: unknown;
    try {
      await createInitialManager(depsComando(ctx), { name: nombre, pin });
    } catch (e) {
      error = e;
    }
    expect(error, 'debe rechazarse con InvalidNameError').toBeInstanceOf(InvalidNameError);
    expect(String((error as Error).message)).not.toContain(pin);
    expect(await encargados()).toEqual([]);
    expect(ctx.logs.texto()).not.toContain(pin);
  });

  test('[HU-07/CA-F04][HU-05/CA-F01][C10] un nombre válido se guarda normalizado: NFC, sin espacios sobrantes; el login lo encuentra con la forma compuesta y con la descompuesta', async () => {
    const pin = pinAleatorio('manager');
    expect(await createInitialManager(depsComando(ctx), { name: '  Jose\u0301   Ruiz ', pin })).toBe('created');
    const [m] = await encargados();
    expect(m!.name).toBe('José Ruiz');
    const n = await ctx.bd.query<{ n: boolean }>(`SELECT name IS NFC NORMALIZED AS n FROM users WHERE id = $1`, [m!.id]);
    expect(n.rows).toEqual([{ n: true }]);

    for (const forma of ['José Ruiz', 'Jose\u0301 Ruiz']) {
      const { res } = await iniciarSesion(ctx, forma, pin);
      expect(res.status, `${JSON.stringify(forma)}: ${res.raw}`).toBe(200);
      expect(res.body.user).toMatchObject({ id: m!.id, name: 'José Ruiz', role: 'manager', mustChangePin: true });
    }
  });

  test('[HU-07/CA-F04][HU-05/CA-F01][C10] la longitud 1–30 se mide tras normalizar: 30 «é» descompuestas (60 unidades UTF-16) valen', async () => {
    expect(await createInitialManager(depsComando(ctx), { name: 'e\u0301'.repeat(30), pin: pinAleatorio('manager') })).toBe('created');
    expect((await encargados())[0]!.name).toBe('é'.repeat(30));
  });

  test('[HU-07/CA-F04][HU-05/CA-F01][C10] 31 «é» descompuestas (31 tras la NFC) → InvalidNameError', async () => {
    await expect(createInitialManager(depsComando(ctx), { name: 'e\u0301'.repeat(31), pin: pinAleatorio('manager') })).rejects.toBeInstanceOf(InvalidNameError);
    expect(await encargados()).toEqual([]);
  });

  test('[HU-07/CA-F04][HU-05/CA-F01][C10] ningún nombre guardado es no-NFC ni lleva controles (la consulta de C10 da 0 filas)', async () => {
    await createInitialManager(depsComando(ctx), { name: 'Zoe\u0308 Marta', pin: pinAleatorio('manager') });
    const r = await ctx.bd.query(`SELECT id FROM users WHERE name IS NOT NFC NORMALIZED OR name ~ '[[:cntrl:]]'`);
    expect(r.rowCount).toBe(0);
  });
});

describe('create-initial-manager (CLI) con un nombre de apiName', () => {
  class Captura {
    private trozos: string[] = [];
    readonly stream = new Writable({
      write: (chunk, _enc, listo) => {
        this.trozos.push(String(chunk));
        listo();
      },
    });
    texto(): string {
      return this.trozos.join('');
    }
  }

  let dir: string;
  let stderr: Captura;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cli-nombre-'));
    stderr = new Captura();
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function entorno(nombre: string, pin: string): Record<string, string> {
    const fichero = (n: string, contenido: string | Buffer): string => {
      const p = join(dir, n);
      writeFileSync(p, contenido, { mode: 0o600 });
      return p;
    };
    return {
      PUBLIC_ORIGIN: 'https://caja.local:8443',
      DATABASE_HOST: ctx.configBd.host,
      DATABASE_PORT: String(ctx.configBd.port),
      DATABASE_NAME: ctx.configBd.database,
      DATABASE_USER: ctx.configBd.user,
      DATABASE_PASSWORD_FILE: variable('DATABASE_APP_PASSWORD_FILE'),
      PIN_PEPPER_FILE: fichero('pepper', randomBytes(32)),
      INITIAL_MANAGER_NAME_FILE: fichero('nombre', `${nombre}\n`),
      INITIAL_MANAGER_PIN_FILE: fichero('pin', `${pin}\n`),
    };
  }

  test('[HU-07/CA-F04][HU-05/CA-F01][C10] nombre con un C1 → sale con 1, stderr explica el error sin el PIN y no crea nada', async () => {
    const pin = pinAleatorio('manager');
    const codigo = await runCommand('create-initial-manager', [], { env: entorno('Mar\u0085ta', pin), stderr: stderr.stream, clock: ctx.reloj, logDestination: ctx.logs.stream });
    expect(codigo, stderr.texto()).toBe(1);
    expect(stderr.texto().length).toBeGreaterThan(0);
    expect(stderr.texto()).not.toContain(pin);
    expect(await encargados()).toEqual([]);
  });

  test('[HU-07/CA-F04][HU-05/CA-F01][C10] nombre descompuesto → sale con 0 y se guarda NFC', async () => {
    const pin = pinAleatorio('manager');
    const codigo = await runCommand('create-initial-manager', [], { env: entorno('Jose\u0301', pin), stderr: stderr.stream, clock: ctx.reloj, logDestination: ctx.logs.stream });
    expect(codigo, stderr.texto()).toBe(0);
    expect((await encargados()).map((m) => m.name)).toEqual(['José']);
  });
});
