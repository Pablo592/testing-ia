// Integración: buildApp(deps) en proceso con FakeClock y la BD real de la pila
// efímera (docs/testing.md §5.2). Los ficheros se ejecutan de uno en uno
// (fileParallelism: false) porque comparten la BD `cafeteria` y los roles de BD
// tienen límite de conexiones (hallazgo T-28); cada test crea su propia
// instancia de la app, con contadores en memoria limpios, y datos con nombres
// únicos.
import { defineConfig } from 'vitest/config';

const resultados = process.env.RESULTS_DIR ?? 'results/local';

export default defineConfig({
  cacheDir: '/tmp/vitest-cache-integration',
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 60_000,
    reporters: ['default', 'junit'],
    outputFile: { junit: `${resultados}/integration-junit.xml` },
    projects: [
      {
        extends: true,
        test: { name: 'integration', include: ['integration/**/*.int.test.ts'] },
      },
      {
        extends: true,
        test: { name: 'security', include: ['security/**/*.sec.test.ts'] },
      },
    ],
    coverage: {
      provider: 'v8',
      allowExternal: true,
      reportsDirectory: `${resultados}/coverage-integration`,
      include: ['../apps/api/src/**', '../packages/shared/src/**'],
    },
  },
});
