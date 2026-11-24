// Lectura de configuración del ejecutor. Los secretos llegan como ficheros en
// /run/secrets (nunca por variables de entorno ni en el repositorio).
import { readFileSync } from 'node:fs';

export function variable(nombre: string): string {
  const v = process.env[nombre];
  if (v === undefined || v === '') {
    throw new Error(
      `Falta la variable ${nombre} en el ejecutor de tests (ver tests/README.md §6 y hallazgos T-28/T-29).`,
    );
  }
  return v;
}

export function secreto(nombreVariableFichero: string): string {
  const ruta = variable(nombreVariableFichero);
  return readFileSync(ruta, 'utf8').replace(/\r?\n$/, '');
}

export interface ConfigBd {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  poolMax?: number;
}

/** Conexión con el rol de la aplicación (app_rw). */
export function bdApp(database?: string): ConfigBd {
  return {
    host: variable('DATABASE_HOST'),
    port: Number(process.env.DATABASE_PORT ?? '5432'),
    database: database ?? variable('DATABASE_NAME'),
    user: variable('DATABASE_APP_USER'),
    password: secreto('DATABASE_APP_PASSWORD_FILE'),
    poolMax: 4,
  };
}

/** Rol solo de TESTING con CREATEDB (para BD aisladas, hallazgo T-28). */
export function bdAdmin(): ConfigBd {
  return {
    host: variable('DATABASE_HOST'),
    port: Number(process.env.DATABASE_PORT ?? '5432'),
    database: 'postgres',
    user: variable('DATABASE_ADMIN_USER'),
    password: secreto('DATABASE_ADMIN_PASSWORD_FILE'),
  };
}

export const RESULTADOS = process.env.RESULTS_DIR ?? 'results/local';
