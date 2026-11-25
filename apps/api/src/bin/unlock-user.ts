// Envoltorio de la imagen: node dist/commands/unlock-user.js <nombre>
// (docs/arquitectura.md §2.1, T-41). Toda la lógica está en runCommand.
import { runCommand } from '../commands/cli.ts';

process.exitCode = await runCommand('unlock-user', process.argv.slice(2), { env: process.env, stderr: process.stderr });
