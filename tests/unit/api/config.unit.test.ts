// HU-01/CA-N06 (RS-13, SEC-004, T-36), RS-06 (TRUSTED_PROXIES, SEC-029) y el
// resto de variables de config.ts (docs/arquitectura.md §10.1, forma fijada
// en la 2.1i, T-38). parseSettings(env) es pura: sin red, sin ficheros ni
// secretos. Fuera de rango → lanza ConfigError (la app no arranca) con
// `variable` = nombre de la variable y un mensaje que nunca contiene el valor.
// loadConfig(env) se prueba con ficheros temporales propios (sin red).
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { ajustes, ENV_MINIMO, errorDe, esConfigError, loadConfig, type Env } from '../../support/config.ts';

const con = (extra: Env): Env => ({ ...ENV_MINIMO, ...extra });

/** Fragmentos del valor que no pueden aparecer en el mensaje (los de 3 o más caracteres). */
function fragmentos(valor: string | undefined): string[] {
  if (!valor) return [];
  const partes = [valor, ...valor.split(','), ...valor.split(',').map((p) => p.trim())];
  return [...new Set(partes.filter((p) => p.trim().length >= 3))];
}

function rechaza(variable: string, valor: string | undefined): void {
  const e = errorDe(con({ [variable]: valor }));
  expect(e, `${variable}=${JSON.stringify(valor)} debería impedir el arranque`).toBeInstanceOf(Error);
  esConfigError(e, variable, fragmentos(valor));
}

describe('SESSION_MAX_HOURS (RS-13)', () => {
  test('[HU-01/CA-N06][RS-13] por defecto 12', () => {
    expect(ajustes(ENV_MINIMO).sessionMaxHours).toBe(12);
  });

  test.each([['1', 1], ['6', 6], ['12', 12]])('[HU-01/CA-N06][RS-13] "%s" → %i', (v, n) => {
    expect(ajustes(con({ SESSION_MAX_HOURS: v })).sessionMaxHours).toBe(n);
  });

  test.each([['0'], ['13'], ['24'], ['100'], ['-1'], ['1.5'], ['12.5'], ['abc'], ['12h']])(
    '[HU-01/CA-N06][RS-13] "%s" fuera de rango o no entero → no arranca',
    (v) => rechaza('SESSION_MAX_HOURS', v),
  );

  test('[HU-01/CA-N06][RS-13] el mensaje no repite el valor recibido', () => {
    esConfigError(errorDe(con({ SESSION_MAX_HOURS: '987654' })), 'SESSION_MAX_HOURS', ['987654']);
  });
});

describe('Resto de variables de §10.1 (forma de Settings, T-38)', () => {
  test('[HU-01/CA-N06] valores por defecto: Settings exacto con los nombres de AppDeps y sin contraseña', () => {
    expect(ajustes(ENV_MINIMO)).toEqual({
      host: '0.0.0.0',
      port: 3000,
      metricsPort: 9464,
      logLevel: 'info',
      publicOrigin: 'https://caja.local:8443',
      trustedProxies: [],
      installation: { tableCount: 20, delayThresholdMinutes: 10 },
      sessionMaxHours: 12,
      database: { host: 'db', port: 5432, database: 'cafeteria', user: 'app_rw' },
    });
  });

  test('[HU-01/CA-N06] ignora variables que no son suyas (PATH, BUSINESS_TIMEZONE, TZ…)', () => {
    expect(() => ajustes(con({ PATH: '/usr/bin', BUSINESS_TIMEZONE: 'America/New_York', TZ: 'UTC', OTRA: 'x' }))).not.toThrow();
  });

  test.each([
    ['PORT', '1025', 1025],
    ['PORT', '65535', 65535],
    ['TABLE_COUNT', '1', 1],
    ['TABLE_COUNT', '99', 99],
    ['DELAY_THRESHOLD_MINUTES', '1', 1],
    ['DELAY_THRESHOLD_MINUTES', '60', 60],
  ] as const)('[HU-01/CA-N06] %s="%s" en rango', (v, valor, n) => {
    const a = ajustes(con({ [v]: valor }));
    const campo = { PORT: a.port, TABLE_COUNT: a.installation.tableCount, DELAY_THRESHOLD_MINUTES: a.installation.delayThresholdMinutes }[v];
    expect(campo).toBe(n);
  });

  test.each([
    ['PORT', '1024'],
    ['PORT', '65536'],
    ['PORT', 'http'],
    ['METRICS_PORT', '80'],
    ['TABLE_COUNT', '0'],
    ['TABLE_COUNT', '100'],
    ['TABLE_COUNT', '20.5'],
    ['DELAY_THRESHOLD_MINUTES', '0'],
    ['DELAY_THRESHOLD_MINUTES', '61'],
    ['HOST', 'no-es-una-ip'],
    ['LOG_LEVEL', 'verbose'],
    ['PUBLIC_ORIGIN', 'caja.local:8443'],
    ['PUBLIC_ORIGIN', 'https://caja.local:8443/'],
    ['PUBLIC_ORIGIN', 'https://caja.local:8443/app'],
    ['PUBLIC_ORIGIN', undefined],
    ['DATABASE_HOST', undefined],
    ['DATABASE_PORT', undefined],
    ['DATABASE_NAME', undefined],
    ['DATABASE_USER', undefined],
  ] as const)('[HU-01/CA-N06] %s="%s" → no arranca: ConfigError con esa variable', (v, valor) => rechaza(v, valor));

  test('[HU-01/CA-N06] METRICS_PORT igual que PORT → no arranca', () => {
    esConfigError(errorDe(con({ PORT: '3000', METRICS_PORT: '3000' })), ['METRICS_PORT', 'PORT']);
  });

  test('[HU-01/CA-N06] LOG_LEVEL admite los niveles de pino', () => {
    for (const n of ['fatal', 'error', 'warn', 'info', 'debug', 'trace']) expect(ajustes(con({ LOG_LEVEL: n })).logLevel).toBe(n);
  });
});

// RS-06, SEC-003, SEC-029; docs/arquitectura.md §10.1 "Reglas de TRUSTED_PROXIES".
// Un elemento inválido nunca se ignora ni cae a trustProxy: true: no arranca.
describe('TRUSTED_PROXIES (SEC-029)', () => {
  const cinco = ['10.89.240.2', '10.89.240.3', '10.89.240.4', '10.89.240.5', '10.89.240.6'].join(',');
  test.each([
    // Prefijos cortos (rango amplio).
    ['10.0.0.0/8'],
    ['10.89.0.0/16'],
    ['10.89.240.0/23'],
    ['fd00::/64'],
    ['fd00::/119'],
    // SEC-045 (b): /119 de IPv6 y el rango IPv4 equivalente de una IPv4 mapeada (/104 = /8).
    ['::/119'],
    ['::ffff:10.0.0.0/104'],
    ['0.0.0.0/0'],
    ['::/0'],
    // Nombres de proxy-addr, booleanos y números de saltos.
    ['uniquelocal'],
    ['loopback'],
    ['linklocal'],
    ['true'],
    ['1'],
    ['2'],
    ['proxy.local'],
    // Elementos vacíos y espacios (se parte por "," sin recortar).
    ['10.89.240.2,'],
    [',10.89.240.2'],
    ['10.89.240.2,,10.89.240.3'],
    [' 10.89.240.2'],
    ['10.89.240.2, 10.89.240.3'],
    // SEC-045 (b): solo espacios y espacio final (nunca se recorta ni se ignora).
    [' '],
    ['10.89.240.2 '],
    // Prefijos mal escritos o fuera de rango.
    ['10.89.240.2/'],
    ['10.89.240.2/33'],
    ['fd00::1/129'],
    ['10.89.240.0/024'],
    // Literales no canónicos.
    ['010.89.240.2'],
    ['10.0.0.1,300.1.1.1'],
    ['fe80::1%eth0'],
    ['[fd00::1]'],
    ['[::1]'],
    // Más de 4 elementos.
    [cinco],
  ])('[HU-01/CA-F11][RS-06] %j → no arranca: ConfigError("TRUSTED_PROXIES") sin el valor', (valor) => {
    rechaza('TRUSTED_PROXIES', valor);
  });

  test.each([
    ['10.89.240.2', ['10.89.240.2']],
    ['10.89.240.2/32', ['10.89.240.2/32']],
    ['10.89.240.0/29', ['10.89.240.0/29']],
    ['10.89.240.0/24', ['10.89.240.0/24']],
    ['fd00::2', ['fd00::2']],
    ['fd00::/120', ['fd00::/120']],
    ['fd00::1/128', ['fd00::1/128']],
    // SEC-045 (b): IPv4 mapeada con el prefijo mínimo equivalente a /24.
    ['::ffff:10.89.240.0/120', ['::ffff:10.89.240.0/120']],
    ['10.89.240.2,10.89.240.3', ['10.89.240.2', '10.89.240.3']],
    ['10.89.240.2,10.89.240.3,fd00::2,10.89.241.0/24', ['10.89.240.2', '10.89.240.3', 'fd00::2', '10.89.241.0/24']],
    ['', []],
    [undefined, []],
  ] as const)('[HU-01/CA-F11][RS-06] %j → %j', (valor, esperado) => {
    expect(ajustes(con({ TRUSTED_PROXIES: valor })).trustedProxies).toEqual(esperado);
  });

  test('[HU-01/CA-F11][RS-06] el mensaje da la posición del elemento, no su valor', () => {
    const e = esConfigError(errorDe(con({ TRUSTED_PROXIES: '10.89.240.2,uniquelocal' })), 'TRUSTED_PROXIES', ['uniquelocal', '10.89.240.2']);
    expect(e.message).toMatch(/2/);
  });
});

// loadConfig(env?) (T-38): Settings + database con contraseña, pinPepper e
// initialManager leídos de los ficheros *_FILE (recortando el salto de línea final).
describe('loadConfig(env) con ficheros de secreto', () => {
  const dir = mkdtempSync(join(tmpdir(), 'config-unit-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const fichero = (nombre: string, contenido: string): string => {
    const p = join(dir, nombre);
    writeFileSync(p, contenido, { mode: 0o600 });
    return p;
  };
  const contrasena = 'contrasena-de-prueba-unitaria-0001';
  const pepper = 'p'.repeat(40);

  test('[HU-01/CA-N06] devuelve Settings con database.password y, si están, pinPepper e initialManager', () => {
    const env = con({
      DATABASE_PASSWORD_FILE: fichero('db', `${contrasena}\n`),
      PIN_PEPPER_FILE: fichero('pepper', pepper),
      INITIAL_MANAGER_NAME_FILE: fichero('nombre', 'Marta\n'),
      INITIAL_MANAGER_PIN_FILE: fichero('pin', '739164\n'),
    });
    const c = loadConfig(env);
    expect(c.database).toMatchObject({ host: 'db', port: 5432, database: 'cafeteria', user: 'app_rw', password: contrasena });
    expect(c.sessionMaxHours).toBe(12);
    expect(c.installation).toEqual({ tableCount: 20, delayThresholdMinutes: 10 });
    expect(Buffer.isBuffer(c.pinPepper)).toBe(true);
    expect(c.pinPepper!.equals(Buffer.from(pepper))).toBe(true);
    expect(c.initialManager).toEqual({ name: 'Marta', pin: '739164' });
  });

  test('[HU-01/CA-N06] sin PIN_PEPPER_FILE ni INITIAL_MANAGER_*: esos campos no están', () => {
    const c = loadConfig(con({ DATABASE_PASSWORD_FILE: fichero('db2', contrasena) }));
    expect(c.pinPepper).toBeUndefined();
    expect(c.initialManager).toBeUndefined();
  });

  test('[HU-01/CA-N06] sin DATABASE_PASSWORD_FILE, o con un fichero que no existe → ConfigError("DATABASE_PASSWORD_FILE")', () => {
    esConfigError(errorDe(con({}), loadConfig), 'DATABASE_PASSWORD_FILE');
    const ruta = join(dir, 'no-existe-xyz');
    esConfigError(errorDe(con({ DATABASE_PASSWORD_FILE: ruta }), loadConfig), 'DATABASE_PASSWORD_FILE', [contrasena]);
  });

  test('[HU-01/CA-N06] PIN_PEPPER_FILE con menos de 32 bytes → ConfigError("PIN_PEPPER_FILE") sin el contenido', () => {
    const corto = 'pepper-corto-0123456789';
    const e = errorDe(con({ DATABASE_PASSWORD_FILE: fichero('db3', contrasena), PIN_PEPPER_FILE: fichero('corto', corto) }), loadConfig);
    esConfigError(e, 'PIN_PEPPER_FILE', [corto]);
  });

  test('[HU-01/CA-N06] un error de parseSettings también lo da loadConfig (no arranca)', () => {
    esConfigError(errorDe(con({ DATABASE_PASSWORD_FILE: fichero('db4', contrasena), TRUSTED_PROXIES: 'loopback' }), loadConfig), 'TRUSTED_PROXIES', ['loopback']);
  });
});
