// Punto único de adaptación a parseSettings(env) de @mi-app/api/config
// (docs/arquitectura.md §10.1). La forma del objeto devuelto no está fijada en
// la arquitectura (hallazgo T-38): esta función la normaliza a los nombres de
// AppDeps (§2.1). Si el Developer elige otros, solo cambia este fichero.
import { parseSettings } from '@mi-app/api/config';

export interface AjustesNormalizados {
  host: string;
  port: number;
  metricsPort: number;
  tableCount: number;
  delayThresholdMinutes: number;
  sessionMaxHours: number;
  publicOrigin: string;
  trustedProxies: string[];
  logLevel: string;
}

type Env = Record<string, string | undefined>;

/** Variables obligatorias de §10.1 con valores válidos. */
export const ENV_MINIMO: Env = {
  PUBLIC_ORIGIN: 'https://caja.local:8443',
  DATABASE_HOST: 'db',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'cafeteria',
  DATABASE_USER: 'app_rw',
};

export function ajustes(env: Env): AjustesNormalizados {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = parseSettings(env) as any;
  return {
    host: s.host,
    port: s.port,
    metricsPort: s.metricsPort,
    tableCount: s.installation?.tableCount ?? s.tableCount,
    delayThresholdMinutes: s.installation?.delayThresholdMinutes ?? s.delayThresholdMinutes,
    sessionMaxHours: s.sessionMaxHours,
    publicOrigin: s.publicOrigin,
    trustedProxies: s.trustedProxies,
    logLevel: s.logLevel,
  };
}

/** Ejecuta parseSettings y devuelve el error (o undefined si no lanza). */
export function errorDe(env: Env): Error | undefined {
  try {
    parseSettings(env);
    return undefined;
  } catch (e) {
    return e as Error;
  }
}
