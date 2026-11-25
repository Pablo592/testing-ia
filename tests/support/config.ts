// Ayudas del unitario de @mi-app/api/config (docs/arquitectura.md §10.1).
// La forma del resultado está fijada desde la 2.1i (T-38): `Settings` con los
// nombres de AppDeps, `loadConfig(env?)` y `ConfigError` con `variable`. Ya no
// hay adaptación: los tests leen el objeto tal cual.
import { ConfigError, parseSettings, type Settings } from '@mi-app/api/config';

export { ConfigError, loadConfig, parseSettings, type Config, type Settings } from '@mi-app/api/config';

export type Env = Record<string, string | undefined>;

/** Variables obligatorias de §10.1 con valores válidos. */
export const ENV_MINIMO: Env = {
  PUBLIC_ORIGIN: 'https://caja.local:8443',
  DATABASE_HOST: 'db',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'cafeteria',
  DATABASE_USER: 'app_rw',
};

export function ajustes(env: Env): Settings {
  return parseSettings(env);
}

/** Ejecuta `fn` y devuelve lo que lance (o undefined si no lanza). */
export function errorDe(env: Env, fn: (env: Env) => unknown = parseSettings): Error | undefined {
  try {
    fn(env);
    return undefined;
  } catch (e) {
    return e as Error;
  }
}

/**
 * Comprueba el contrato de ConfigError: instancia de ConfigError, `variable`
 * exacta y mensaje con el nombre de la variable y sin ninguno de los
 * `secretos` (fragmentos del valor recibido).
 */
export function esConfigError(e: Error | undefined, variable: string | string[], secretos: string[] = []): ConfigError {
  if (!(e instanceof ConfigError)) {
    throw new Error(`se esperaba ConfigError, llegó ${e === undefined ? 'nada (arranca)' : `${e.name}: ${e.message}`}`);
  }
  const variables = [variable].flat();
  if (!variables.includes(e.variable)) {
    throw new Error(`ConfigError.variable = ${JSON.stringify(e.variable)}, esperado ${variables.join(' o ')}`);
  }
  if (!e.message.includes(e.variable)) throw new Error(`el mensaje no nombra la variable ${e.variable}: ${e.message}`);
  for (const s of secretos) {
    if (s.length > 0 && e.message.includes(s)) throw new Error(`el mensaje repite el valor recibido (${JSON.stringify(s)})`);
  }
  return e;
}
