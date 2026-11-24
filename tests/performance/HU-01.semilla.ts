// Semilla de HU-01/CA-N03 para k6: 10 usuarios distintos con PIN aleatorio de
// esta ejecución. Se ejecuta como proyecto "semilla-perf" de Playwright porque
// ese ejecutor es el que tiene acceso a la BD y al *pepper* (hallazgo T-29).
// El fichero lo borra tests/run.sh al terminar (contiene PIN de prueba).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';
import { cerrarSemilla, sembrarUsuario } from '../support/e2e/semilla.ts';
import { variable } from '../support/entorno.ts';

test('[HU-01/CA-N03] semilla: 10 usuarios para el login simultáneo', async () => {
  const usuarios = [];
  for (let i = 0; i < 10; i++) {
    const rol = i < 6 ? 'waiter' : i < 8 ? 'kitchen' : 'manager';
    const u = await sembrarUsuario({ rol });
    usuarios.push({ name: u.nombre, pin: u.pin });
  }
  writeFileSync(join(variable('RESULTS_DIR'), 'k6-usuarios.json'), JSON.stringify(usuarios), { mode: 0o600 });
  await cerrarSemilla();
});
