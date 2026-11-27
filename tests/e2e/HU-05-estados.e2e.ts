// HU-05 E2E: estados de P-09 (docs/ux/wireframes/06-gestion-menu.md, tabla
// "Estados"): vacío, categoría vacía, cargando, error de carga, guardando y error
// de servidor al guardar. Se provocan interceptando las llamadas (no hay forma
// de dejar vacío el menú de una BD que comparten todos los tests): las
// respuestas son del contrato de tests/README.md §7.1 y las escrituras del
// guardado llegan al servidor real salvo donde se indica.
import { expect, test } from '../support/e2e/base.ts';
import { cerrarSemilla, sembrarUsuario } from '../support/e2e/semilla.ts';
import { entrarComo } from '../support/e2e/pantallas.ts';
import { FormularioProducto, interceptarMenu, menuDelWireframe, PantallaMenu, TEXTOS_MENU as T } from '../support/e2e/menu.ts';

test.afterAll(async () => {
  await cerrarSemilla();
});

async function comoEncargado(page: import('@playwright/test').Page): Promise<PantallaMenu> {
  await entrarComo(page, await sembrarUsuario({ rol: 'manager' }));
  return new PantallaMenu(page);
}

test('[HU-05/CA-F01] vacío: "Todavía no hay categorías…" y "Nueva categoría" como acción principal', { tag: ['@HU-05', '@CA-F01'] }, async ({ page }) => {
  const menu = await comoEncargado(page);
  await interceptarMenu(page, []);
  await menu.abrir();
  await expect(page.getByText(T.vacio, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: T.nuevaCategoria }).first()).toBeVisible();
  // Sin categorías no se puede crear un producto: no hay "Nuevo producto" activo.
  await expect(page.getByRole('button', { name: T.nuevoProducto })).toHaveCount(0);
});

test('[HU-05/CA-F02] categoría vacía: "<nombre> no tiene productos." y "Nuevo producto"', { tag: ['@HU-05', '@CA-F02'] }, async ({ page }) => {
  const menu = await comoEncargado(page);
  const cat = menuDelWireframe()[0]!;
  await interceptarMenu(page, [{ ...cat, products: [] }]);
  await menu.abrir();
  await menu.elegirCategoria(cat.id, cat.name);
  await expect(page.getByText(T.categoriaVacia(cat.name), { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: T.nuevoProducto })).toBeVisible();
});

test('[HU-05/CA-N04] cargando: esqueleto de la lista y, a partir de 1 s, "Cargando menú…" en un role=status; después, el contenido', { tag: ['@HU-05', '@CA-N04'] }, async ({ page }) => {
  const menu = await comoEncargado(page);
  const fijo = menuDelWireframe();
  await interceptarMenu(page, async (route) => {
    await new Promise((ok) => setTimeout(ok, 2000));
    await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ categories: fijo }) });
  });
  const ir = page.goto('/menu');
  await expect(page.getByTestId('esqueleto-menu').first()).toBeVisible({ timeout: 1500 });
  await expect(page.getByRole('status').filter({ hasText: T.cargando })).toBeVisible({ timeout: 1900 });
  await ir;
  await expect(menu.categoria(fijo[0]!.id)).toBeVisible();
  await expect(page.getByTestId('esqueleto-menu')).toHaveCount(0);
});

test('[HU-05/CA-F01] error de carga: bloque de error con "Reintentar"; al reintentar con éxito aparece el menú', { tag: ['@HU-05', '@CA-F01'] }, async ({ page }) => {
  const menu = await comoEncargado(page);
  const fijo = menuDelWireframe();
  let llamadas = 0;
  await interceptarMenu(page, async (route) => {
    llamadas += 1;
    if (llamadas === 1) {
      return route.fulfill({ status: 500, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: { code: 'INTERNAL', message: 'x', requestId: 'r' } }) });
    }
    return route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ categories: fijo }) });
  });
  await page.goto('/menu');
  const reintentar = page.getByRole('button', { name: 'Reintentar' });
  await expect(reintentar).toBeVisible();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await reintentar.click();
  await expect(menu.categoria(fijo[0]!.id)).toBeVisible();
  await expect(reintentar).toHaveCount(0);
});

test('[HU-05/CA-F02] guardando: el botón pasa a "Guardando…" y se deshabilita (contra el doble toque); luego el diálogo se cierra', { tag: ['@HU-05', '@CA-F02'] }, async ({ page }) => {
  const menu = await comoEncargado(page);
  const cat = menuDelWireframe()[0]!;
  await interceptarMenu(page, [{ ...cat, products: [] }]);
  let envios = 0;
  await page.route('**/api/v1/products', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    envios += 1;
    await new Promise((ok) => setTimeout(ok, 1500));
    // Respuesta de éxito fabricada: aquí se prueba el estado del botón, no el servidor.
    return route.fulfill({
      status: 201,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: '00000000-0000-4000-8000-0000000009ff', categoryId: cat.id, name: 'Prueba', priceCents: 150, available: true, active: true }),
    });
  });
  await menu.abrir();
  await menu.elegirCategoria(cat.id, cat.name);
  await page.getByRole('button', { name: T.nuevoProducto }).click();
  const f = new FormularioProducto(menu.dialogo(T.nuevoProducto));
  await f.rellenar({ nombre: 'Prueba', precio: '1,50' });
  await f.enviar();
  const guardando = f.dialogo.getByRole('button', { name: T.guardando });
  await expect(guardando).toBeVisible();
  await expect(guardando).toBeDisabled();
  await guardando.click({ force: true, trial: true }).catch(() => undefined);
  await expect(f.dialogo).toBeHidden({ timeout: 5000 });
  expect(envios, 'un solo envío').toBe(1);
});

test('[HU-05/CA-F02] error de servidor al guardar: bloque de error dentro del formulario y los datos escritos no se pierden', { tag: ['@HU-05', '@CA-F02'] }, async ({ page }) => {
  const menu = await comoEncargado(page);
  const cat = menuDelWireframe()[0]!;
  await interceptarMenu(page, [{ ...cat, products: [] }]);
  await page.route('**/api/v1/products', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 500, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: { code: 'INTERNAL', message: 'x', requestId: 'r' } }) })
      : route.fallback(),
  );
  await menu.abrir();
  await menu.elegirCategoria(cat.id, cat.name);
  await page.getByRole('button', { name: T.nuevoProducto }).click();
  const f = new FormularioProducto(menu.dialogo(T.nuevoProducto));
  await f.rellenar({ nombre: 'Se conserva', precio: '3,10' });
  await f.enviar();
  await expect(f.dialogo.getByRole('alert')).toBeVisible();
  await expect(f.nombre()).toHaveValue('Se conserva');
  await expect(f.precio()).toHaveValue('3,10');
  await expect(f.guardar()).toBeEnabled();
  await expect(f.guardar()).toHaveText(T.guardarProducto);
});
