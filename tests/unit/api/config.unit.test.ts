// HU-01/CA-N06 (RS-13, SEC-004, T-36) y variables de config.ts
// (docs/arquitectura.md §10.1). parseSettings(env) es pura: sin red, sin
// ficheros ni secretos. Fuera de rango → lanza (la app no arranca) con el
// NOMBRE de la variable y nunca su valor.
import { describe, expect, test } from 'vitest';
import { ajustes, ENV_MINIMO, errorDe } from '../../support/config.ts';

const con = (extra: Record<string, string | undefined>) => ({ ...ENV_MINIMO, ...extra });

function rechaza(variable: string, valor: string | undefined): void {
  const e = errorDe(con({ [variable]: valor }));
  expect(e, `${variable}=${String(valor)} debería impedir el arranque`).toBeInstanceOf(Error);
  expect(e!.message).toContain(variable);
  // Nunca el valor recibido (valores con letras o largos, para no confundir con números del mensaje).
  if (valor && valor.length >= 3) expect(e!.message).not.toContain(valor);
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
    const e = errorDe(con({ SESSION_MAX_HOURS: '987654' }));
    expect(e).toBeInstanceOf(Error);
    expect(e!.message).toContain('SESSION_MAX_HOURS');
    expect(e!.message).not.toContain('987654');
  });
});

describe('Resto de variables de §10.1', () => {
  test('[HU-01/CA-N06] valores por defecto', () => {
    expect(ajustes(ENV_MINIMO)).toMatchObject({
      host: '0.0.0.0',
      port: 3000,
      metricsPort: 9464,
      tableCount: 20,
      delayThresholdMinutes: 10,
      trustedProxies: [],
      logLevel: 'info',
      publicOrigin: 'https://caja.local:8443',
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
    const campo = { PORT: a.port, TABLE_COUNT: a.tableCount, DELAY_THRESHOLD_MINUTES: a.delayThresholdMinutes }[v];
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
    ['TRUSTED_PROXIES', 'proxy.local'],
    ['TRUSTED_PROXIES', '10.0.0.1,300.1.1.1'],
    ['PUBLIC_ORIGIN', 'caja.local:8443'],
    ['PUBLIC_ORIGIN', 'https://caja.local:8443/'],
    ['PUBLIC_ORIGIN', 'https://caja.local:8443/app'],
    ['PUBLIC_ORIGIN', undefined],
    ['DATABASE_HOST', undefined],
    ['DATABASE_PORT', undefined],
    ['DATABASE_NAME', undefined],
    ['DATABASE_USER', undefined],
  ] as const)('[HU-01/CA-N06] %s="%s" → no arranca, con el nombre de la variable', (v, valor) => rechaza(v, valor));

  test('[HU-01/CA-N06] METRICS_PORT igual que PORT → no arranca', () => {
    const e = errorDe(con({ PORT: '3000', METRICS_PORT: '3000' }));
    expect(e).toBeInstanceOf(Error);
    expect(e!.message).toMatch(/METRICS_PORT|PORT/);
  });

  test('[HU-01/CA-N06] TRUSTED_PROXIES: lista de IP o CIDR separada por comas', () => {
    expect(ajustes(con({ TRUSTED_PROXIES: '10.89.240.2' })).trustedProxies).toEqual(['10.89.240.2']);
    expect(ajustes(con({ TRUSTED_PROXIES: '10.89.240.2,10.89.0.0/24' })).trustedProxies).toEqual(['10.89.240.2', '10.89.0.0/24']);
    expect(ajustes(con({ TRUSTED_PROXIES: '' })).trustedProxies).toEqual([]);
  });

  test('[HU-01/CA-N06] LOG_LEVEL admite los niveles de pino', () => {
    for (const n of ['fatal', 'error', 'warn', 'info', 'debug', 'trace']) expect(ajustes(con({ LOG_LEVEL: n })).logLevel).toBe(n);
  });
});
