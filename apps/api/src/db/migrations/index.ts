// Migraciones versionadas, solo hacia delante (docs/arquitectura.md §12).
// Se importan de forma estática: van dentro del bundle de dist/migrate.js
// (ninguna ruta a src/ ni lectura de disco en la imagen).
import * as m0001 from './0001_hu01_auth.ts';

export interface Migration {
  name: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [m0001];

export const LATEST_MIGRATION = MIGRATIONS[MIGRATIONS.length - 1]?.name ?? '';
