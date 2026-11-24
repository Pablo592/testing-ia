// Unitarios: sin red (runner-unit tiene network_mode: none), sin BD.
import { defineConfig } from 'vitest/config';

const resultados = process.env.RESULTS_DIR ?? 'results/local';

export default defineConfig({
  // La raíz del contenedor y el repositorio son de solo lectura: la caché va a /tmp.
  cacheDir: '/tmp/vitest-cache-unit',
  test: {
    include: ['unit/**/*.unit.test.ts'],
    environment: 'node',
    reporters: ['default', 'junit'],
    outputFile: { junit: `${resultados}/unit-junit.xml` },
    coverage: {
      provider: 'v8',
      allowExternal: true,
      reportsDirectory: `${resultados}/coverage-unit`,
      include: ['../packages/shared/src/**', '../apps/api/src/**', '../apps/web/src/**'],
    },
  },
});
