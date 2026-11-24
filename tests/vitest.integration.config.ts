// Integración: buildApp(deps) en proceso con FakeClock y la BD real de la pila
// efímera (docs/testing.md §5.2). Cada fichero trabaja en su propia BD,
// clonada de app_template con test_admin (support/bd-fichero.ts, §9.2).
// Los ficheros se ejecutan de uno en uno (fileParallelism: false) porque el
// límite de 20 conexiones de app_rw es compartido por `app`, la app en proceso
// (poolMax 4), los constructores (max 2) y los comandos (poolMax 4)
// (docs/infraestructura.md §9.1). Antes de activar ficheros en paralelo hay
// que recalcular ese presupuesto con Infrastructure y Cybersecurity.
// Cada test crea su propia instancia de la app, con contadores en memoria
// limpios, y datos con nombres únicos.
import { defineConfig } from 'vitest/config';

const resultados = process.env.RESULTS_DIR ?? 'results/local';

export default defineConfig({
  cacheDir: '/tmp/vitest-cache-integration',
  test: {
    environment: 'node',
    fileParallelism: false,
    setupFiles: ['./support/bd-fichero.ts'],
    // afterAll en orden inverso: primero el del fichero (cierra la app y sus
    // pools) y después el de bd-fichero.ts (DROP DATABASE).
    sequence: { hooks: 'stack' },
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
