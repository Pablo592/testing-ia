// setupFiles de la integración: una BD por fichero de test, clonada de
// app_template (docs/testing.md §9.2). Sin estado compartido entre ficheros
// ni con la BD `cafeteria` de la pila. Los ficheros siguen en serie
// (fileParallelism: false) por el límite compartido de 20 conexiones de app_rw
// (docs/infraestructura.md §9.1).
import { afterAll, beforeAll } from 'vitest';
import { borrarBd, crearBdDesdePlantilla, nombreBdPrueba } from './bd-admin.ts';
import { VAR_BD_FICHERO } from './entorno.ts';

let nombre: string | undefined;

beforeAll(async () => {
  nombre = nombreBdPrueba('f');
  await crearBdDesdePlantilla(nombre);
  process.env[VAR_BD_FICHERO] = nombre;
});

afterAll(async () => {
  delete process.env[VAR_BD_FICHERO];
  if (nombre) await borrarBd(nombre);
  nombre = undefined;
});
