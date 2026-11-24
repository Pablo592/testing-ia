// Playwright (docs/testing.md §5.3-§5.5). Se ejecuta en el contenedor
// runner-e2e contra proxy (Caddy, TLS interno) a través de Toxiproxy.
// retries: 0 (un test inestable cuenta como fallo, §11).
import { defineConfig, devices } from '@playwright/test';

const resultados = process.env.RESULTS_DIR ?? 'results/local';
const baseURL = process.env.BASE_URL ?? 'https://toxiproxy:8443';

// Confianza en la CA de ESTA ejecución sin ignorar errores de certificado:
// global-setup.ts verifica el certificado del proxy contra la CA
// (NODE_EXTRA_CA_CERTS) y fija su clave pública (SPKI) para Chromium.
// WebKit no admite esa opción: hallazgo T-34 (pendiente de Cybersecurity).
const spki = process.env.E2E_SPKI_PIN;
const chromium = {
  ...devices['Desktop Chrome'],
  launchOptions: {
    args: [
      ...(spki ? [`--ignore-certificate-errors-spki-list=${spki}`] : []),
      // Política de audio real, nunca no-user-gesture-required (§8.5).
      '--autoplay-policy=document-user-activation-required',
    ],
  },
};

// *.pin.e2e.ts (PIN erróneo) y *.red.e2e.ts (cortes de Toxiproxy) van en serie aparte.
const NORMALES = /e2e\/.*(?<!\.pin|\.red)\.e2e\.ts$/;
const DISPOSITIVO = /e2e\/.*\.dispositivo\.e2e\.ts$/;

export default defineConfig({
  testDir: '.',
  outputDir: `${resultados}/playwright-artifacts`,
  fullyParallel: true,
  retries: 0,
  forbidOnly: true,
  timeout: 60_000,
  expect: { timeout: 5_000 },
  reporter: [
    ['list'],
    ['junit', { outputFile: `${resultados}/e2e-junit.xml` }],
    ['html', { outputFolder: `${resultados}/playwright-html`, open: 'never' }],
  ],
  globalSetup: './support/e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  },
  projects: [
    // Flujos de HU-01 en tablet horizontal (Chromium y WebKit ≈ Safari de iPad).
    { name: 'tablet-h', testMatch: NORMALES, use: { ...chromium, viewport: { width: 1280, height: 800 }, hasTouch: true } },
    {
      name: 'tablet-h-webkit',
      testMatch: NORMALES,
      testIgnore: DISPOSITIVO,
      use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 }, hasTouch: true },
    },
    // Medidas por dispositivo (teclado, barra superior): *.dispositivo.e2e.ts.
    { name: 'tablet-v', testMatch: DISPOSITIVO, use: { ...chromium, viewport: { width: 800, height: 1280 }, hasTouch: true } },
    { name: 'tpv', testMatch: DISPOSITIVO, use: { ...chromium, viewport: { width: 1024, height: 768 } } },
    { name: 'barra', testMatch: DISPOSITIVO, use: { ...chromium, viewport: { width: 1920, height: 1080 } } },
    { name: 'escritorio', testMatch: DISPOSITIVO, use: { ...chromium, viewport: { width: 1440, height: 900 } } },
    { name: 'movil', testMatch: DISPOSITIVO, use: { ...chromium, viewport: { width: 375, height: 812 }, hasTouch: true } },
    // PIN erróneo: un solo navegador y en serie (presupuesto de fallos por IP, tests/README.md).
    { name: 'serie-pin', testMatch: /e2e\/.*\.pin\.e2e\.ts$/, fullyParallel: false, use: { ...chromium, viewport: { width: 1280, height: 800 }, hasTouch: true } },
    // Cortes de red con Toxiproxy (proxy compartido): un worker y nada más en paralelo.
    { name: 'serie-red', testMatch: /e2e\/.*\.red\.e2e\.ts$/, fullyParallel: false, use: { ...chromium, viewport: { width: 1280, height: 800 }, hasTouch: true } },
    { name: 'a11y', testMatch: /a11y\/.*\.a11y\.ts$/, use: { ...chromium, viewport: { width: 1280, height: 800 } } },
    { name: 'visual', testMatch: /visual\/.*\.visual\.ts$/, use: { ...chromium } },
    // Semilla de datos para k6 (tests/run.sh perf); no abre navegador.
    { name: 'semilla-perf', testMatch: /performance\/.*\.semilla\.ts$/ },
  ],
});
