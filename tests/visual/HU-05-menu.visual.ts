// Capturas de HU-05 para el UX Designer (docs/testing.md §5.4):
// tests/screenshots/HU-05/<pantalla>-<estado>-<ancho>.png en 375, 768, 1024 y
// 1440 px (P-09 es del encargado: TPV, ordenador o tablet; la barra de 1920 no
// aplica). En Etapa 2 son capturas para revisión (sin comparación); la
// regresión con referencias aprobadas empieza en la Etapa 3.
// Datos fijos del wireframe 06 (Cafés con Moca agotado y Descafeinado
// desactivado, Infusiones, Zumos, Bollería) servidos por respuestas
// interceptadas de GET /menu; las escrituras que se enseñan (errores, diálogos)
// no llegan a hacerse. Un solo worker (usuarioFijo restablece el PIN). Los tests NO van en
// modo `serial`: si uno falla, los demás se ejecutan igualmente (con `serial` un solo fallo
// dejaba 11 de 12 sin ejecutar y ocultaba el resto del informe).
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { cerrarSemilla, usuarioFijo, type UsuarioE2E } from '../support/e2e/semilla.ts';
import { BarraSuperior, entrarComo } from '../support/e2e/pantallas.ts';
import { FormularioProducto, interceptarMenu, menuDelWireframe, PantallaMenu, TEXTOS_MENU as T } from '../support/e2e/menu.ts';

const ANCHOS: [number, number][] = [
  [375, 812],
  [768, 1024],
  [1024, 768],
  [1440, 900],
];
const DIR = fileURLToPath(new URL('../screenshots/HU-05', import.meta.url));

let marta: UsuarioE2E;
test.beforeAll(async () => {
  marta = await usuarioFijo('Marta', 'manager');
});
test.afterAll(async () => {
  await cerrarSemilla();
});

async function capturar(page: Page, nombre: string, ancho: number): Promise<void> {
  await page.screenshot({ path: `${DIR}/${nombre}-${ancho}.png`, fullPage: true, animations: 'disabled' });
}

async function abrir(page: Page, categoriaElegida = true): Promise<PantallaMenu> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await entrarComo(page, marta);
  await interceptarMenu(page, menuDelWireframe());
  const menu = new PantallaMenu(page);
  await menu.abrir();
  if (categoriaElegida) {
    const cafes = menuDelWireframe()[0]!;
    await menu.elegirCategoria(cafes.id, cafes.name);
  }
  return menu;
}

for (const [ancho, alto] of ANCHOS) {
  test.describe(`${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: alto } });

    test(`[HU-05/CA-F09][HU-05/CA-F04] capturas de P-09: lista, vacío, categoría vacía, cargando y error de carga (${ancho}px)`, { tag: ['@HU-05', '@visual'] }, async ({ page }) => {
      const menu = await abrir(page);
      await expect(menu.producto('00000000-0000-4000-8000-000000000103')).toContainText(T.agotado);
      await capturar(page, 'P-09-lista', ancho);

      // Menú de gestión abierto con "Menú" como pantalla actual (wireframe 06, "Estás aquí").
      await new BarraSuperior(page).gestion().click();
      await capturar(page, 'P-09-gestion-abierto', ancho);
      await page.keyboard.press('Escape');

      await page.unroute(/\/api\/v1\/menu(\?.*)?$/);
      await interceptarMenu(page, []);
      await menu.abrir();
      await expect(page.getByText(T.vacio, { exact: true })).toBeVisible();
      await capturar(page, 'P-09-vacio', ancho);

      await page.unroute(/\/api\/v1\/menu(\?.*)?$/);
      const cat = menuDelWireframe()[0]!;
      await interceptarMenu(page, [{ ...cat, products: [] }]);
      await menu.abrir();
      await menu.elegirCategoria(cat.id, cat.name);
      await capturar(page, 'P-09-categoria-vacia', ancho);

      await page.unroute(/\/api\/v1\/menu(\?.*)?$/);
      await interceptarMenu(page, async (route) => {
        await new Promise((ok) => setTimeout(ok, 2500));
        await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ categories: menuDelWireframe() }) });
      });
      const ir = page.goto('/menu');
      await expect(page.getByTestId('esqueleto-menu').first()).toBeVisible({ timeout: 2000 });
      await capturar(page, 'P-09-cargando', ancho);
      await ir;

      await page.unroute(/\/api\/v1\/menu(\?.*)?$/);
      await interceptarMenu(page, (route) =>
        route.fulfill({ status: 500, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: { code: 'INTERNAL', message: 'x', requestId: 'r' } }) }),
      );
      await page.goto('/menu');
      await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
      await capturar(page, 'P-09-error-carga', ancho);
    });

    test(`[HU-05/CA-U01][HU-05/CA-U03][HU-05/CA-F06] capturas del formulario de producto: nuevo, con errores y edición con la ayuda del precio (${ancho}px)`, { tag: ['@HU-05', '@visual'] }, async ({ page }) => {
      const menu = await abrir(page);
      await page.getByRole('button', { name: T.nuevoProducto }).click();
      const f = new FormularioProducto(menu.dialogo(T.nuevoProducto));
      await expect(f.dialogo).toBeVisible();
      await capturar(page, 'P-09-form-nuevo', ancho);

      await f.rellenar({ precio: '0' });
      await f.enviar();
      await f.errorDe(f.precio(), T.errorPrecio);
      await capturar(page, 'P-09-form-errores', ancho);
      await page.keyboard.press('Escape');

      await menu.accion('Editar', 'Café con leche').click();
      await expect(menu.dialogo('Editar producto')).toBeVisible();
      await capturar(page, 'P-09-form-editar', ancho);
    });

    test(`[HU-05/CA-F05][HU-05/CA-F08] capturas de los diálogos: desactivar un producto y borrar una categoría con productos activos (${ancho}px)`, { tag: ['@HU-05', '@visual'] }, async ({ page }) => {
      const menu = await abrir(page);
      await page.route('**/api/v1/categories/*', (route) =>
        route.request().method() === 'DELETE'
          ? route.fulfill({ status: 409, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: { code: 'CATEGORY_HAS_ACTIVE_PRODUCTS', message: 'x', requestId: 'r', details: { count: 7 } } }) })
          : route.fallback(),
      );
      await menu.masAcciones('Moca').click();
      await capturar(page, 'P-09-acciones-producto', ancho);
      await page.getByRole('menuitem', { name: 'Desactivar', exact: true }).click();
      await expect(menu.dialogo(T.desactivarTitulo('Moca'))).toBeVisible();
      await capturar(page, 'P-09-dialogo-desactivar', ancho);
      await page.keyboard.press('Escape');

      await menu.accion('Borrar', 'Cafés').click();
      await expect(menu.dialogo(/No se puede borrar Cafés/)).toBeVisible();
      await capturar(page, 'P-09-dialogo-borrar-bloqueado', ancho);
    });
  });
}
