// HU-01/CA-U02 (teclado ≥ 44x44 px), CA-U04 (nombre y rol visibles) y
// WCAG 2.5.8 (≥ 24 px) en cada dispositivo: tablet-h, tablet-v, tpv, barra,
// escritorio y movil (playwright.config.ts).
import { expect, test } from '@playwright/test';
import { cerrarSemilla, sembrarUsuario } from '../support/e2e/semilla.ts';
import { BarraSuperior, entrarComo, PantallaLogin } from '../support/e2e/pantallas.ts';
import { esperarTamanoMinimo } from '../support/e2e/medidas.ts';

test.afterAll(async () => {
  await cerrarSemilla();
});

test('[HU-01/CA-U02] todas las teclas del teclado numérico miden al menos 44x44 px', { tag: ['@HU-01', '@CA-U02'] }, async ({ page }) => {
  const u = await sembrarUsuario({ rol: 'waiter' });
  const login = new PantallaLogin(page);
  await login.abrir();
  await login.elegir(u);
  for (const t of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Borrar', 'Entrar']) {
    await test.step(`tecla ${t}`, async () => {
      const tecla = login.tecla(t);
      await expect(tecla).toBeVisible();
      await esperarTamanoMinimo(tecla, 44, 44);
    });
  }
});

test('[HU-01/CA-U02][HU-01/CA-N04] las tarjetas de usuario y "Cambiar de usuario" son objetivos ≥ 44 px; sin desplazamiento horizontal', { tag: ['@HU-01', '@CA-U02'] }, async ({ page }) => {
  const u = await sembrarUsuario({ rol: 'kitchen' });
  const login = new PantallaLogin(page);
  await login.abrir();
  await esperarTamanoMinimo(login.tarjeta(u), 44, 44);
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(scroll, 'sin desplazamiento horizontal en P-01').toBe(true);
  await login.elegir(u);
  await esperarTamanoMinimo(page.getByRole('button', { name: 'Cambiar de usuario' }), 44, 44);
});

test('[HU-01/CA-U04] nombre y rol en la barra superior y "Cerrar sesión" ≥ 44 px, en la pantalla de destino', { tag: ['@HU-01', '@CA-U04'] }, async ({ page }) => {
  const u = await sembrarUsuario({ rol: 'manager' });
  await entrarComo(page, u);
  const barra = new BarraSuperior(page);
  await expect(barra.usuario(u)).toBeVisible();
  await expect(barra.usuario(u)).toBeInViewport();
  await esperarTamanoMinimo(barra.cerrarSesion(), 44, 44);
});
