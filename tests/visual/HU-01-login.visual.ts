// Capturas de HU-01 para el UX Designer (docs/testing.md §5.4):
// tests/screenshots/HU-01/<pantalla>-<estado>-<ancho>.png en 375, 768, 1024,
// 1440 y 1920 px. En Etapa 2 son capturas para revisión (sin comparación);
// la regresión con referencias aprobadas empieza en la Etapa 3.
// Datos fijos de los wireframes (Lucía, Javi, Marta, Pedro); la rejilla se
// limita a ellos interceptando GET /auth/login-options para que los usuarios
// de otros tests no salgan en la captura. Los errores son respuestas
// interceptadas (no gastan intentos).
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { cerrarSemilla, sembrarUsuario, usuarioFijo, type UsuarioE2E } from '../support/e2e/semilla.ts';
import { CambioPin, entrarComo, PantallaLogin } from '../support/e2e/pantallas.ts';

const ANCHOS: [number, number][] = [
  [375, 812],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
];
const DIR = fileURLToPath(new URL('../screenshots/HU-01', import.meta.url));

// Un solo worker y en orden: usuarioFijo restablece el PIN de los usuarios fijos.
test.describe.configure({ mode: 'serial' });

let equipo: UsuarioE2E[] = [];

test.beforeAll(async () => {
  equipo = [
    await usuarioFijo('Lucía', 'waiter'),
    await usuarioFijo('Javi', 'kitchen'),
    await usuarioFijo('Marta', 'manager'),
    await usuarioFijo('Pedro', 'waiter'),
  ];
});
test.afterAll(async () => {
  await cerrarSemilla();
});

async function prepararRejilla(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/login-options', (r) =>
    r.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: JSON.stringify(equipo.map((u) => ({ name: u.nombre, role: u.rol }))),
    }),
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

function errorLogin(page: Page, status: number, code: string, retry?: number) {
  return page.route('**/api/v1/auth/login', (r) =>
    r.fulfill({
      status,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code, message: code, requestId: 'x', ...(retry ? { details: { retryAfterSeconds: retry } } : {}) } }),
    }),
  );
}

async function capturar(page: Page, nombre: string, ancho: number): Promise<void> {
  await page.screenshot({ path: `${DIR}/${nombre}-${ancho}.png`, fullPage: true, animations: 'disabled' });
}

for (const [ancho, alto] of ANCHOS) {
  test.describe(`${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: alto } });

    test(`[HU-01/CA-U01][HU-01/CA-U02] capturas de P-01 (${ancho}px)`, { tag: ['@HU-01', '@visual'] }, async ({ page }) => {
      await prepararRejilla(page);
      const login = new PantallaLogin(page);
      const lucia = equipo[0];
      const marta = equipo[2];

      await login.abrir();
      await capturar(page, 'P-01-paso1', ancho);

      await login.elegir(lucia);
      await login.teclear(lucia.pin.slice(0, 3));
      await capturar(page, 'P-01-paso2', ancho);

      await page.getByRole('button', { name: 'Cambiar de usuario' }).click();
      await login.elegir(marta);
      await capturar(page, 'P-01-paso2-encargado', ancho);

      const estados: [string, number, string, number?][] = [
        ['error', 401, 'INVALID_CREDENTIALS'],
        ['desactivado', 403, 'USER_DISABLED'],
        ['bloqueo-temporal', 423, 'LOCKED', 300],
        ['bloqueo-indefinido', 423, 'ACCOUNT_LOCKED_MANUAL'],
        ['dispositivo', 429, 'TOO_MANY_ATTEMPTS', 540],
      ];
      for (const [estado, status, code, retry] of estados) {
        await page.unroute('**/api/v1/auth/login');
        await errorLogin(page, status, code, retry);
        await login.abrir();
        await login.elegir(lucia);
        await login.enviarPin(lucia.pin);
        await expect(login.alerta()).toBeVisible();
        await capturar(page, `P-01-${estado}`, ancho);
      }
    });

    test(`[HU-01/CA-U04] capturas de la barra superior en P-02 y P-05 (${ancho}px)`, { tag: ['@HU-01', '@visual'] }, async ({ browser }) => {
      for (const [u, pantalla] of [
        [equipo[0], 'P-02-inicio'],
        [equipo[1], 'P-05-inicio'],
      ] as const) {
        const ctx = await browser.newContext({ viewport: { width: ancho, height: alto } });
        const page = await ctx.newPage();
        await entrarComo(page, u);
        await capturar(page, pantalla, ancho);
        await ctx.close();
      }
    });
  });
}

test('[HU-07/CA-F04] captura del cambio obligatorio del PIN (1024px)', { tag: ['@HU-01', '@visual'] }, async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const u = await sembrarUsuario({ rol: 'manager', pinProvisional: true });
  await new PantallaLogin(page).iniciarSesion(u);
  await new CambioPin(page).visible();
  await capturar(page, 'P-01-cambio-pin', 1024);
});
