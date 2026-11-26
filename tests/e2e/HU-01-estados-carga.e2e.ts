// H-2.3-07 / H-2.6-02 (2.8a): estado "Cargando" de la rejilla de P-01 con el
// esqueleto que pide docs/ux/design-system.md §5.12 ("Esqueleto con la forma del
// contenido final; si tarda más de 1 s, texto «Cargando …»") y el wireframe
// 01-login.md ("Cargando: esqueleto de 4 tarjetas").
//
// Contrato con el Developer (tests/README.md §5):
//  - mientras `GET /auth/login-options` está pendiente, 4 elementos con
//    `data-testid="esqueleto-usuario"` y `aria-hidden="true"`, en la misma rejilla
//    que las tarjetas reales y del mismo tamaño que una tarjeta (±2 px);
//  - el texto "Cargando usuarios…" sigue en un `role="status"` (lo anuncia el
//    lector de pantalla; el esqueleto, no);
//  - al llegar la respuesta desaparecen el esqueleto y el texto de carga.
import { expect, test } from '../support/e2e/base.ts';
import { cerrarSemilla, sembrarUsuario } from '../support/e2e/semilla.ts';
import { ESQUELETO_USUARIO, PantallaLogin, TEXTOS } from '../support/e2e/pantallas.ts';
import type { Page } from '@playwright/test';

test.afterAll(async () => {
  await cerrarSemilla();
});

const TOLERANCIA_PX = 2;

/** Retiene la respuesta de la rejilla hasta `liberar()`. */
async function retenerRejilla(page: Page): Promise<() => void> {
  let liberar: () => void = () => undefined;
  const puerta = new Promise<void>((ok) => {
    liberar = ok;
  });
  await page.route('**/api/v1/auth/login-options', async (ruta) => {
    await puerta;
    await ruta.continue();
  });
  return liberar;
}

async function comprobarEsqueleto(page: Page): Promise<void> {
  // Nombre corto (cabe en 1 línea de la tarjeta a 375 px): el alto de una tarjeta real depende de
  // cuántas líneas ocupa el nombre y el esqueleto es de la tarjeta de 1 línea. La tarjeta que se
  // compara es la de este usuario (no la primera de la rejilla: otros tests siembran nombres largos).
  const u = await sembrarUsuario({ rol: 'waiter', nombre: `S${Math.random().toString(36).slice(2, 6)}` });
  const liberar = await retenerRejilla(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();

  const esqueletos = page.getByTestId(ESQUELETO_USUARIO);
  await expect(esqueletos, 'una rejilla de 4 tarjetas esqueleto mientras carga').toHaveCount(4);
  for (const i of [0, 1, 2, 3]) {
    await expect(esqueletos.nth(i), `esqueleto ${i + 1} oculto al lector de pantalla`).toHaveAttribute('aria-hidden', 'true');
    await expect(esqueletos.nth(i)).toBeVisible();
  }
  // Más de 1 s de espera: el texto de carga se anuncia y el esqueleto sigue ahí.
  await page.waitForTimeout(1200);
  await expect(page.getByRole('status').filter({ hasText: 'Cargando usuarios…' })).toBeVisible();
  await expect(esqueletos).toHaveCount(4);
  // Sin contenido real ni error mientras tanto.
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Camarero|Barra|Encargado/ })).toHaveCount(0);

  const cajaEsqueleto = await esqueletos.first().boundingBox();
  expect(cajaEsqueleto, 'el esqueleto tiene caja').not.toBeNull();

  liberar();
  const tarjeta = page.getByRole('button', { name: /Camarero|Barra|Encargado/ }).first(); // 1.ª columna
  const tarjetaCorta = new PantallaLogin(page).tarjeta(u); // nombre de 1 línea: su alto es el del esqueleto
  await expect(tarjeta).toBeVisible();
  await expect(tarjetaCorta).toBeVisible();
  await expect(esqueletos, 'el esqueleto desaparece al cargar').toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Cargando usuarios…' })).toHaveCount(0);

  // "Forma del contenido final": mismo ancho y alto que una tarjeta real y misma columna de inicio.
  const real = await tarjeta.boundingBox();
  const realCorta = await tarjetaCorta.boundingBox();
  expect(real, 'la tarjeta real tiene caja').not.toBeNull();
  expect(realCorta, 'la tarjeta real de nombre corto tiene caja').not.toBeNull();
  expect(Math.abs(cajaEsqueleto!.width - real!.width), `ancho: esqueleto ${cajaEsqueleto!.width} vs tarjeta ${real!.width}`).toBeLessThanOrEqual(TOLERANCIA_PX);
  expect(Math.abs(cajaEsqueleto!.height - realCorta!.height), `alto: esqueleto ${cajaEsqueleto!.height} vs tarjeta ${realCorta!.height}`).toBeLessThanOrEqual(TOLERANCIA_PX);
  expect(Math.abs(cajaEsqueleto!.x - real!.x), `columna: esqueleto x=${cajaEsqueleto!.x} vs tarjeta x=${real!.x}`).toBeLessThanOrEqual(TOLERANCIA_PX);
}

test('[H-2.3-07][H-2.6-02] "Cargando usuarios…" con esqueleto de 4 tarjetas del tamaño de una tarjeta real (1280 px)', { tag: ['@HU-01', '@UX'] }, async ({ page }) => {
  await comprobarEsqueleto(page);
});

test('[H-2.3-07][H-2.6-02] "Cargando usuarios…" con esqueleto de 4 tarjetas del tamaño de una tarjeta real (375 px)', { tag: ['@HU-01', '@UX'] }, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await comprobarEsqueleto(page);
});
