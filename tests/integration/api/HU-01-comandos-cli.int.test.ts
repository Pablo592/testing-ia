// HU-01 (dependencia: encargado inicial), HU-01/CA-F06 (desbloqueo por el
// operador del sistema); RS-09, RS-09b. Envoltorios de los comandos de la
// imagen, en proceso: runCommand(name, argv, io) de @mi-app/api/commands/cli
// (docs/arquitectura.md §2.1 y §3.1, 2.1i, T-41). Nunca lanza: devuelve 0
// (created/skipped/unlocked), 2 (not_found) o 1 (cualquier error). Lee la
// configuración con loadConfig(io.env): aquí un env propio que apunta a
// ficheros temporales de la prueba (contraseña de app_rw del ejecutor, un
// pepper propio, nombre y PIN). stderr y el log nunca contienen el PIN.
// El humo con la imagen real está en tests/containers/tx-cmd-01.sh.
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { runCommand } from '@mi-app/api/commands/cli';
import { montarApp, type Ctx } from '../../support/app.ts';
import { crearUsuario, nombreUnico, pinAleatorio } from '../../support/fixtures.ts';
import { usuario, usuarioPorNombre } from '../../support/bd.ts';
import { variable } from '../../support/entorno.ts';

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

let ctx: Ctx;
let dir: string;
let stderr: Captura;
let log: Captura;
beforeEach(async () => {
  // BD sin ningún usuario (RS-09), clonada de la plantilla.
  ctx = await montarApp({ bdAislada: true });
  dir = mkdtempSync(join(tmpdir(), 'cli-'));
  stderr = new Captura();
  log = new Captura();
});
afterEach(async () => {
  rmSync(dir, { recursive: true, force: true });
  await ctx?.cerrar();
});

function fichero(nombre: string, contenido: string | Buffer): string {
  const p = join(dir, nombre);
  writeFileSync(p, contenido, { mode: 0o600 });
  return p;
}

type Env = Record<string, string | undefined>;

/** Variables de §10.1 para la BD aislada de este test, con app_rw. */
function envBase(extra: Env = {}): Env {
  return {
    PUBLIC_ORIGIN: 'https://caja.local:8443',
    DATABASE_HOST: ctx.configBd.host,
    DATABASE_PORT: String(ctx.configBd.port),
    DATABASE_NAME: ctx.configBd.database,
    DATABASE_USER: ctx.configBd.user,
    DATABASE_PASSWORD_FILE: variable('DATABASE_APP_PASSWORD_FILE'),
    ...extra,
  };
}

function envEncargado(nombre: string, pin: string, extra: Env = {}): Env {
  return envBase({
    PIN_PEPPER_FILE: fichero('pepper', randomBytes(32)),
    INITIAL_MANAGER_NAME_FILE: fichero('nombre', `${nombre}\n`),
    INITIAL_MANAGER_PIN_FILE: fichero('pin', `${pin}\n`),
    ...extra,
  });
}

function ejecutar(name: 'create-initial-manager' | 'unlock-user', argv: string[], env: Env): Promise<0 | 1 | 2> {
  return runCommand(name, argv, { env, stderr: stderr.stream, clock: ctx.reloj, logDestination: log.stream });
}

async function encargados(): Promise<number> {
  const r = await ctx.bd.query<{ n: string }>(`SELECT count(*)::text AS n FROM users WHERE role = 'manager'`);
  return Number(r.rows[0].n);
}

function sinPin(pin: string): void {
  expect(stderr.texto(), 'stderr sin el PIN').not.toContain(pin);
  expect(log.texto(), 'log sin el PIN').not.toContain(pin);
}

describe('create-initial-manager', () => {
  test('[HU-07/CA-F04][RS-09] sin encargados → 0 y lo crea con PIN provisional; otra ejecución → 0 sin crear otro', async () => {
    const nombre = nombreUnico('Marta');
    const pin = pinAleatorio('manager');
    expect(await ejecutar('create-initial-manager', [], envEncargado(nombre, pin))).toBe(0);
    expect(await usuarioPorNombre(ctx.bd, nombre)).toMatchObject({ role: 'manager', must_change_pin: true, active: true, pin_digits: 6 });
    expect(await ejecutar('create-initial-manager', [], envEncargado(nombreUnico('Otra'), pinAleatorio('manager')))).toBe(0);
    expect(await encargados()).toBe(1);
    sinPin(pin);
    // Log JSON con la misma redacción (docs/logging.md).
    expect(log.texto()).toMatch(/"staff\.initial_manager\.created"/);
  });

  test.each([['123456'], ['111111'], ['121212'], ['4831'], ['48a173']])(
    '[HU-01/CA-N01][RS-09] PIN "%s" que no cumple las reglas de encargado → 1, no crea nada, stderr y log sin el PIN',
    async (pin) => {
      expect(await ejecutar('create-initial-manager', [], envEncargado(nombreUnico('Marta'), pin))).toBe(1);
      expect(await encargados()).toBe(0);
      expect(stderr.texto().length, 'stderr explica el error').toBeGreaterThan(0);
      sinPin(pin);
    },
  );

  test('[HU-07/CA-F04][RS-09] un argumento de más → 1 sin crear nada', async () => {
    const pin = pinAleatorio('manager');
    expect(await ejecutar('create-initial-manager', ['sobra'], envEncargado(nombreUnico('Marta'), pin))).toBe(1);
    expect(await encargados()).toBe(0);
    sinPin(pin);
  });

  test('[HU-07/CA-F04][RS-09] falta INITIAL_MANAGER_PIN_FILE o PIN_PEPPER_FILE → 1 sin crear nada', async () => {
    const pin = pinAleatorio('manager');
    const sinFicheroPin = envEncargado(nombreUnico('Marta'), pin, { INITIAL_MANAGER_PIN_FILE: undefined });
    expect(await ejecutar('create-initial-manager', [], sinFicheroPin)).toBe(1);
    expect(stderr.texto()).toContain('INITIAL_MANAGER_PIN_FILE');
    const sinPepper = envEncargado(nombreUnico('Marta'), pin, { PIN_PEPPER_FILE: undefined });
    expect(await ejecutar('create-initial-manager', [], sinPepper)).toBe(1);
    expect(stderr.texto()).toContain('PIN_PEPPER_FILE');
    expect(await encargados()).toBe(0);
    sinPin(pin);
  });

  test('[HU-07/CA-F04][RS-09] configuración inválida (TRUSTED_PROXIES=loopback) → 1 con el nombre de la variable y sin su valor; no lanza', async () => {
    const pin = pinAleatorio('manager');
    const r = ejecutar('create-initial-manager', [], envEncargado(nombreUnico('Marta'), pin, { TRUSTED_PROXIES: 'loopback' }));
    await expect(r).resolves.toBe(1);
    expect(stderr.texto()).toContain('TRUSTED_PROXIES');
    expect(stderr.texto()).not.toContain('loopback');
    expect(await encargados()).toBe(0);
  });

  test('[HU-07/CA-F04][RS-09] BD inalcanzable (contraseña errónea) → 1, sin lanzar y sin el PIN', async () => {
    const pin = pinAleatorio('manager');
    const env = envEncargado(nombreUnico('Marta'), pin, { DATABASE_PASSWORD_FILE: fichero('mala', 'no-es-la-contrasena') });
    await expect(ejecutar('create-initial-manager', [], env)).resolves.toBe(1);
    expect(await encargados()).toBe(0);
    sinPin(pin);
  });
});

describe('unlock-user <nombre>', () => {
  test('[HU-01/CA-F06][RS-09b] usuario bloqueado → 0 y desbloqueado (sin necesitar PIN_PEPPER_FILE)', async () => {
    const u = await crearUsuario(ctx, { rol: 'waiter', fallos: 20, bloqueoIndefinido: true });
    expect(await ejecutar('unlock-user', [u.nombre], envBase())).toBe(0);
    expect(await usuario(ctx.bd, u.id)).toMatchObject({ failed_attempts: 0, locked_until: null, locked_manual: false });
    expect(log.texto()).toMatch(/"staff\.unlocked"/);
    sinPin(u.pin);
  });

  test('[HU-01/CA-F06][RS-09b] nombre que no existe → 2', async () => {
    expect(await ejecutar('unlock-user', [nombreUnico('nadie')], envBase())).toBe(2);
  });

  test.each([[[]], [['']], [['Ana', 'Luis']]])(
    '[HU-01/CA-F06][RS-09b] argumentos %j (no exactamente uno no vacío) → 1 con un mensaje de uso en stderr',
    async (argv) => {
      const u = await crearUsuario(ctx, { rol: 'waiter', fallos: 20, bloqueoIndefinido: true });
      expect(await ejecutar('unlock-user', argv as string[], envBase())).toBe(1);
      expect(stderr.texto().length).toBeGreaterThan(0);
      expect((await usuario(ctx.bd, u.id)).locked_manual).toBe(true);
    },
  );

  test('[HU-01/CA-F06][RS-09b] configuración inválida → 1 sin lanzar', async () => {
    await expect(ejecutar('unlock-user', ['Ana'], envBase({ SESSION_MAX_HOURS: '13' }))).resolves.toBe(1);
    expect(stderr.texto()).toContain('SESSION_MAX_HOURS');
  });
});
