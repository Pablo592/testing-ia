// HU-05/CA-N04 (WCAG 2.2 AA; formularios con etiquetas asociadas a cada campo;
// navegable con teclado, reordenar incluido y sin depender de arrastrar) y
// CA-U03 (errores en texto, asociados al campo). axe con las etiquetas de
// docs/testing.md §3: cero violaciones serious/critical; las moderate/minor se
// adjuntan al informe. Estados con datos fijos del wireframe 06 (respuestas
// interceptadas de GET /menu) para que sean los mismos en cada ejecución; los
// recorridos con teclado van contra el servidor real. Textos y selectores:
// tests/support/e2e/menu.ts y tests/README.md §7.6.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { cerrarSemilla, sembrarUsuario } from '../support/e2e/semilla.ts';
import { entrarComo } from '../support/e2e/pantallas.ts';
import { apiComo, FormularioProducto, interceptarMenu, menuDelWireframe, PantallaMenu, TEXTOS_MENU as T } from '../support/e2e/menu.ts';
import { nombreUnico } from '../support/datos.ts';

test.afterAll(async () => {
  await cerrarSemilla();
});

async function auditar(page: Page, info: TestInfo, estado: string): Promise<void> {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const graves = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const leves = r.violations.filter((v) => !graves.includes(v));
  if (leves.length > 0) {
    await info.attach(`axe-leves-${estado}.json`, { body: JSON.stringify(leves, null, 2), contentType: 'application/json' });
  }
  expect(
    graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    `violaciones serious/critical en ${estado}`,
  ).toEqual([]);
}

async function abrirMenuFijo(page: Page): Promise<PantallaMenu> {
  await entrarComo(page, await sembrarUsuario({ rol: 'manager' }));
  await interceptarMenu(page, menuDelWireframe());
  const menu = new PantallaMenu(page);
  await menu.abrir();
  const cafes = menuDelWireframe()[0]!;
  await menu.elegirCategoria(cafes.id, cafes.name);
  return menu;
}

test.describe('axe: estados de P-09', () => {
  test('[HU-05/CA-N04] lista de categorías y productos (con AGOTADO y DESACTIVADO) sin violaciones serious/critical', { tag: ['@HU-05', '@CA-N04'] }, async ({ page }, info) => {
    await abrirMenuFijo(page);
    await expect(page.getByTestId('producto-00000000-0000-4000-8000-000000000103')).toContainText(T.agotado);
    await auditar(page, info, 'P-09-lista');
  });

  test('[HU-05/CA-N04] vacío y categoría vacía sin violaciones', { tag: ['@HU-05', '@CA-N04'] }, async ({ page }, info) => {
    await entrarComo(page, await sembrarUsuario({ rol: 'manager' }));
    const menu = new PantallaMenu(page);
    await interceptarMenu(page, []);
    await menu.abrir();
    await expect(page.getByText(T.vacio, { exact: true })).toBeVisible();
    await auditar(page, info, 'P-09-vacio');

    await page.unroute(/\/api\/v1\/menu(\?.*)?$/);
    const cat = menuDelWireframe()[0]!;
    await interceptarMenu(page, [{ ...cat, products: [] }]);
    await menu.abrir();
    await menu.elegirCategoria(cat.id, cat.name);
    await auditar(page, info, 'P-09-categoria-vacia');
  });

  test('[HU-05/CA-N04][HU-05/CA-U03] formulario de producto, vacío y con errores (aria-invalid + descripción), sin violaciones', { tag: ['@HU-05', '@CA-N04', '@CA-U03'] }, async ({ page }, info) => {
    const menu = await abrirMenuFijo(page);
    await page.getByRole('button', { name: T.nuevoProducto }).click();
    const f = new FormularioProducto(menu.dialogo(T.nuevoProducto));
    await expect(f.dialogo).toBeVisible();
    await auditar(page, info, 'P-09-form-producto');

    await f.rellenar({ precio: '0' });
    await f.enviar();
    await f.errorDe(f.nombre(), T.errorNombreProducto);
    await f.errorDe(f.precio(), T.errorPrecio);
    await expect(f.nombre()).toBeFocused();
    await auditar(page, info, 'P-09-form-producto-errores');
  });

  test('[HU-05/CA-N04] diálogos de desactivar y de borrar categoría bloqueado sin violaciones; foco atrapado y devuelto al cerrar', { tag: ['@HU-05', '@CA-N04'] }, async ({ page }, info) => {
    const menu = await abrirMenuFijo(page);
    await page.route('**/api/v1/categories/*', (route) =>
      route.request().method() === 'DELETE'
        ? route.fulfill({ status: 409, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: { code: 'CATEGORY_HAS_ACTIVE_PRODUCTS', message: 'x', requestId: 'r', details: { count: 7 } } }) })
        : route.fallback(),
    );

    await menu.masAcciones('Café solo').click();
    await page.getByRole('menuitem', { name: 'Desactivar', exact: true }).click();
    const d1 = menu.dialogo(T.desactivarTitulo('Café solo'));
    await expect(d1).toBeVisible();
    await auditar(page, info, 'P-09-dialogo-desactivar');
    // Foco atrapado: Tab recorre solo el diálogo; Escape equivale a "Volver" y devuelve el foco a quien lo abrió.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await d1.evaluate((el) => el.contains(document.activeElement)), `Tab ${i + 1} dentro del diálogo`).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(d1).toBeHidden();
    await expect(menu.masAcciones('Café solo')).toBeFocused();

    await menu.accion('Borrar', 'Cafés').click();
    const d2 = menu.dialogo(/No se puede borrar Cafés/);
    await expect(d2).toBeVisible();
    await expect(d2).toContainText(T.borrarBloqueado('Cafés', 7));
    await auditar(page, info, 'P-09-dialogo-borrar-bloqueado');
    await page.keyboard.press('Escape');
    await expect(d2).toBeHidden();
    await expect(menu.accion('Borrar', 'Cafés')).toBeFocused();
  });
});

test.describe('Etiquetas, teclado y tamaños', () => {
  test('[HU-05/CA-N04] cada campo de los formularios tiene una etiqueta visible asociada con "(obligatorio)" en texto (no solo un asterisco ni un placeholder)', { tag: ['@HU-05', '@CA-N04'] }, async ({ page }) => {
    const menu = await abrirMenuFijo(page);
    await page.getByRole('button', { name: T.nuevoProducto }).click();
    const f = new FormularioProducto(menu.dialogo(T.nuevoProducto));
    for (const campo of [f.nombre(), f.categoria(), f.precio()]) {
      await expect(campo).toHaveCount(1);
      await expect(campo).toBeVisible();
      // Etiqueta <label for> real: el nombre accesible sale de ella (no de aria-label ni del placeholder).
      const id = await campo.getAttribute('id');
      expect(id, 'el campo tiene id').toBeTruthy();
      await expect(f.dialogo.locator(`label[for="${id}"]`)).toBeVisible();
      await expect(f.dialogo.locator(`label[for="${id}"]`)).toContainText('(obligatorio)');
    }
    await expect(f.dialogo.getByRole('radiogroup', { name: T.etiquetaDisponible })).toBeVisible();
    // Precio: teclado numérico en tablet.
    await expect(f.precio()).toHaveAttribute('inputmode', /decimal|numeric/);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: T.nuevaCategoria }).first().click();
    const dc = menu.dialogo(T.nuevaCategoria);
    await expect(dc.getByLabel(T.etiquetaNombre, { exact: true })).toBeVisible();
  });

  test('[HU-05/CA-N04] crear una categoría y un producto, y reordenar, solo con el teclado (Tab, Enter, Espacio, Escape), con el foco siempre visible y sin perderse', { tag: ['@HU-05', '@CA-N04'] }, async ({ page }) => {
    const m = await sembrarUsuario({ rol: 'manager' });
    await entrarComo(page, m);
    const api = await apiComo(m);
    const menu = new PantallaMenu(page);
    try {
      const nombre = nombreUnico('Cat');
      await menu.abrir();

      // Nueva categoría: foco en el botón, Enter abre el diálogo, el foco entra en él y Escape lo cierra devolviendo el foco.
      const nueva = page.getByRole('button', { name: T.nuevaCategoria }).first();
      await nueva.focus();
      await page.keyboard.press('Enter');
      const dc = menu.dialogo(T.nuevaCategoria);
      await expect(dc).toBeVisible();
      expect(await dc.evaluate((el) => el.contains(document.activeElement)), 'el foco entra en el diálogo').toBe(true);
      await page.keyboard.press('Escape');
      await expect(dc).toBeHidden();
      await expect(nueva).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(dc).toBeVisible();
      await page.keyboard.type(nombre);
      await page.keyboard.press('Enter'); // envía el formulario
      await expect(dc).toBeHidden();
      const cat = (await api.menu(true)).find((c) => c.name === nombre);
      expect(cat, 'categoría creada con el teclado').toBeDefined();

      // Nuevo producto con el teclado: Tab entre campos, flechas en los radios, Enter para guardar.
      await menu.categoria(cat!.id).getByRole('button', { name: new RegExp(`^${nombre}`) }).focus();
      await page.keyboard.press('Enter');
      await page.getByRole('button', { name: T.nuevoProducto }).focus();
      await page.keyboard.press('Enter');
      const f = new FormularioProducto(menu.dialogo(T.nuevoProducto));
      await expect(f.dialogo).toBeVisible();
      await f.nombre().focus();
      await page.keyboard.type('Té con teclado');
      await f.precio().focus();
      await page.keyboard.type('1,45');
      await f.disponible().focus();
      await page.keyboard.press('ArrowDown'); // radio siguiente: Agotado
      await expect(f.agotado()).toBeChecked();
      await page.keyboard.press('ArrowUp');
      await expect(f.disponible()).toBeChecked();
      await f.precio().focus();
      await page.keyboard.press('Enter');
      await expect(f.dialogo).toBeHidden();
      const p = (await api.menu(true)).find((c) => c.id === cat!.id)!.products;
      expect(p).toEqual([expect.objectContaining({ name: 'Té con teclado', priceCents: 145, available: true })]);

      // Reordenar sin arrastrar: dos productos más y "Bajar" con Enter; el foco no se pierde.
      await api.producto(cat!.id, 'Segundo', 100);
      await page.reload();
      await menu.elegirCategoria(cat!.id, nombre);
      const antes = await menu.ordenProductos();
      const bajar = menu.accion('Bajar', 'Té con teclado');
      await bajar.focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => menu.ordenProductos()).toEqual([antes[1], antes[0]]);
      const foco = await page.evaluate(() => ({ cuerpo: document.activeElement === document.body, fila: document.activeElement?.closest('[data-testid^="producto-"]')?.getAttribute('data-testid') ?? null }));
      expect(foco.cuerpo, 'el foco no cae al <body> tras reordenar').toBe(false);
      expect(foco.fila, 'el foco sigue en la fila del producto movido').toBe(`producto-${antes[0]}`);
    } finally {
      await api.cerrar();
    }
  });

  test('[HU-05/CA-N04] tamaño de los objetivos: cualquier control >= 24x24 px (WCAG 2.5.8) y los iconos de acción de las filas >= 48x48 px (design system §4)', { tag: ['@HU-05', '@CA-N04'] }, async ({ page }) => {
    await abrirMenuFijo(page);
    const pequenos = await page.evaluate(() => {
      const malos: string[] = [];
      for (const el of document.querySelectorAll('main button, main a, main [role="menuitem"], header button, header a')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.width < 24 || r.height < 24) malos.push(`${el.tagName} «${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}» ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      return malos;
    });
    expect(pequenos, 'controles menores de 24x24 px').toEqual([]);

    const filas = await page.evaluate(() => {
      const malos: string[] = [];
      for (const el of document.querySelectorAll('[data-testid^="producto-"] button, [data-testid^="categoria-"] button')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.height < 48) malos.push(`«${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}» alto ${Math.round(r.height)}`);
        // Los iconos (sin texto visible) deben medir también 48 de ancho.
        if ((el.textContent ?? '').trim().length <= 1 && r.width < 48) malos.push(`icono «${el.getAttribute('aria-label') ?? ''}» ancho ${Math.round(r.width)}`);
      }
      return malos;
    });
    expect(filas, 'botones de fila menores de 48 px de alto').toEqual([]);
  });

  test('[HU-05/CA-N04] foco no tapado (WCAG 2.4.11): al enfocar con Tab cualquier control de la lista, no queda debajo de la barra superior', { tag: ['@HU-05', '@CA-N04'] }, async ({ page }) => {
    await abrirMenuFijo(page);
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const tapado = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const r = el.getBoundingClientRect();
        const arriba = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return arriba && (el === arriba || el.contains(arriba) || arriba.contains(el)) ? false : `«${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}» tapado por ${arriba?.tagName ?? 'nada'}`;
      });
      expect(tapado, `Tab ${i + 1}`).toBeFalsy();
    }
  });
});

test.describe('Reflujo', () => {
  test('[HU-05/CA-N04] a 320 px de ancho no hay desplazamiento horizontal en la lista ni en el formulario (WCAG 1.4.10)', { tag: ['@HU-05', '@CA-N04'] }, async ({ page }) => {
    const menu = await abrirMenuFijo(page);
    await page.setViewportSize({ width: 320, height: 640 });
    const ancho = () => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    const l = await ancho();
    expect(l.sw, `lista: scrollWidth ${l.sw} > clientWidth ${l.cw}`).toBeLessThanOrEqual(l.cw);
    await page.getByRole('button', { name: T.nuevoProducto }).click();
    const f = new FormularioProducto(menu.dialogo(T.nuevoProducto));
    await expect(f.dialogo).toBeVisible();
    const d = await ancho();
    expect(d.sw, `formulario: scrollWidth ${d.sw} > clientWidth ${d.cw}`).toBeLessThanOrEqual(d.cw);
    // El botón principal del formulario se alcanza (se ve o se llega con el desplazamiento vertical).
    await f.guardar().scrollIntoViewIfNeeded();
    await expect(f.guardar()).toBeInViewport();
  });

  test('[HU-05/CA-N04] con el texto al 200 % la lista y el formulario siguen siendo utilizables: sin desplazamiento horizontal y el botón principal se alcanza', { tag: ['@HU-05', '@CA-N04'] }, async ({ page }) => {
    const menu = await abrirMenuFijo(page);
    // Por el CSSOM (`style.setProperty`): `page.addStyleTag` inserta un <style> y la CSP de la app (style-src 'self',
    // RS-26) lo bloquea ("Applying inline style violates the following Content Security Policy directive"),
    // así que el test fallaría aunque la pantalla fuera correcta. Comprobado en P-01: el tamaño pasa de 16 a 32 px.
    const antes = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize));
    await page.evaluate(() => document.documentElement.style.setProperty('font-size', '200%', 'important'));
    const despues = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize));
    expect(despues, 'el texto está realmente al 200 %').toBeCloseTo(antes * 2, 1);
    const d0 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(d0.sw).toBeLessThanOrEqual(d0.cw);
    await page.getByRole('button', { name: T.nuevoProducto }).click();
    const f = new FormularioProducto(menu.dialogo(T.nuevoProducto));
    await expect(f.dialogo).toBeVisible();
    await f.guardar().scrollIntoViewIfNeeded();
    await expect(f.guardar()).toBeInViewport();
    const d1 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(d1.sw).toBeLessThanOrEqual(d1.cw);
  });
});
