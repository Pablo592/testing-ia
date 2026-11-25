// Lógica de los envoltorios de la imagen (docs/arquitectura.md §2.1, T-41).
// runCommand nunca lanza: 0 hecho/omitido, 2 not_found, 1 cualquier error.
// stderr nunca contiene el PIN; el log JSON usa la misma redacción que `app`.
import { systemClock, type Clock } from '../clock.ts';
import { ConfigError, loadConfig } from '../config.ts';
import { createPinHasher } from '../modules/auth/hasher.ts';
import { createInitialManager, InvalidNameError, InvalidPinError, unlockUser } from './index.ts';

export type CommandName = 'create-initial-manager' | 'unlock-user';

export interface CommandIo {
  env: Record<string, string | undefined>;
  stderr: NodeJS.WritableStream;
  clock?: Clock;
  logDestination?: NodeJS.WritableStream;
}

const USAGE: Record<CommandName, string> = {
  'create-initial-manager':
    'Uso: node dist/commands/create-initial-manager.js (sin argumentos; nombre y PIN en INITIAL_MANAGER_NAME_FILE e INITIAL_MANAGER_PIN_FILE)',
  'unlock-user': 'Uso: node dist/commands/unlock-user.js <nombre>',
};

function say(io: CommandIo, text: string): void {
  try {
    io.stderr.write(`${text}\n`);
  } catch {
    /* sin stderr no hay nada más que hacer */
  }
}

/** Mensaje seguro de un error (sin valores de configuración ni el PIN). */
function describe(err: unknown): string {
  if (err instanceof ConfigError) return `Error de configuración: ${err.message}`;
  if (err instanceof InvalidPinError || err instanceof InvalidNameError) return err.message;
  const code = (err as { code?: unknown })?.code;
  return `Error de base de datos o del sistema${typeof code === 'string' && /^[A-Z0-9_]{1,12}$/.test(code) ? ` (código ${code})` : ''}`;
}

export async function runCommand(name: CommandName, argv: readonly string[], io: CommandIo): Promise<0 | 1 | 2> {
  try {
    if (name === 'create-initial-manager') {
      if (argv.length !== 0) {
        say(io, USAGE[name]);
        return 1;
      }
      const config = loadConfig(io.env);
      if (!config.pinPepper) throw new ConfigError('PIN_PEPPER_FILE', 'obligatoria');
      if (!config.initialManager) {
        const missing = io.env.INITIAL_MANAGER_NAME_FILE ? 'INITIAL_MANAGER_PIN_FILE' : 'INITIAL_MANAGER_NAME_FILE';
        throw new ConfigError(missing, 'obligatoria');
      }
      const result = await createInitialManager(
        {
          clock: io.clock ?? systemClock,
          database: { ...config.database, poolMax: 2 },
          pinHasher: createPinHasher({ pepper: config.pinPepper }),
          logDestination: io.logDestination,
        },
        config.initialManager,
      );
      say(io, result === 'created' ? 'Encargado inicial creado (debe cambiar su PIN en el primer inicio de sesión).' : 'Ya existe un encargado: no se ha creado ninguno.');
      return 0;
    }

    if (name === 'unlock-user') {
      if (argv.length !== 1 || !argv[0] || argv[0].trim() === '') {
        say(io, USAGE[name]);
        return 1;
      }
      const config = loadConfig(io.env);
      const result = await unlockUser(
        { clock: io.clock ?? systemClock, database: { ...config.database, poolMax: 2 }, logDestination: io.logDestination },
        argv[0],
      );
      if (result === 'not_found') {
        say(io, 'No existe ningún usuario con ese nombre.');
        return 2;
      }
      say(io, 'Usuario desbloqueado: contador de fallos a 0 y sin bloqueo.');
      return 0;
    }

    say(io, 'Comando desconocido');
    return 1;
  } catch (err) {
    say(io, describe(err));
    return 1;
  }
}
