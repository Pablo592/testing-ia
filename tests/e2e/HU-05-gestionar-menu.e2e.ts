// HU-05 E2E (proyectos tablet-h y tablet-h-webkit, 1280x800): el encargado
// gestiona el menú en P-09 (`/menu`). Contra la pila real; los datos de cada test
// son suyos (nombres únicos: la BD de la ejecución la comparten todos los
// tests y workers) y se preparan por la API con un encargado propio.
// Selectores y textos: tests/support/e2e/menu.ts y tests/README.md §7.6;
// textos exactos de docs/ux/wireframes/06-gestion-menu.md.
//
// "Aparece en la toma de pedidos": la toma (HU-02) lee GET /menu; aquí se
// comprueba ese menú con la sesión de un camarero. La pantalla P-04 y el modo
// "Marcar agotados" (CA-U02, CA-F04 en varios dispositivos) se prueban en
// HU-05-modo-agotados.e2e.ts cuando HU-02 esté en alcance.
import { expect, test as base } from '../support/e2e/base.ts';
import { cerrarSemilla, sembrarUsuario } from '../support/e2e/semilla.ts';
import { entrarComo } from '../support/e2e/pantallas.ts';
import { apiComo, FormularioProducto, PantallaMenu, TEXTOS_MENU as T, type ApiMenu } from '../support/e2e/menu.ts';
import { nombreUnico } from '../support/datos.ts';

interface Equipo {
  /** API con la sesión de un encargado (preparar datos). */
  api: ApiMenu;
  /** API con la sesión de un camarero: lo que ve la toma de pedidos. */
  toma: ApiMenu;
  menu: PantallaMenu;
}

const test = base.extend<{ equipo: Equipo }>({
  equipo: async ({ page }, use) => {
    const m = await sembrarUsuario({ rol: 'manager' });
    const w = await sembrarUsuario({ rol: 'waiter' });
    await entrarComo(page, m);
    const api = await apiComo(m);
    const toma = await apiComo(w);
    await use({ api, toma, menu: new PantallaMenu(page) });
    await api.cerrar();
    await toma.cerrar();
  },
});

test.afterAll(async () => {
  await cerrarSemilla();
});

const EUROS = (importe: string) => new RegExp(`${importe}[\\s\\u00a0]€`);

test.describe('Categorías', () => {
  test('[HU-05/CA-F01] el encargado crea una categoría desde "Nueva categoría" y la ve en la lista y en el menú de la toma de pedidos', { tag: ['@HU-05', '@CA-F01'] }, async ({ page, equipo }) => {
    const nombre = nombreUnico('Cat');
    await equipo.menu.abrir();
    await page.getByRole('button', { name: T.nuevaCategoria }).first().click();
    const d = equipo.menu.dialogo(T.nuevaCategoria);
    await expect(d).toBeVisible();
    await d.getByLabel(T.etiquetaNombre, { exact: true }).fill(nombre);
    await d.getByRole('button', { name: T.guardarCategoria }).click();
    await expect(d).toBeHidden();

    const cat = (await equipo.api.menu(true)).find((c) => c.name === nombre);
    expect(cat, 'la categoría existe en el servidor').toBeDefined();
    await expect(equipo.menu.categoria(cat!.id)).toContainText(nombre);
    expect((await equipo.toma.menu()).map((c) => c.name), 'la ve la toma de pedidos').toContain(nombre);
    // Persiste: tras recargar sigue ahí.
    await page.reload();
    await expect(equipo.menu.categoria(cat!.id)).toContainText(nombre);
  });

  test('[HU-05/CA-F01][HU-05/CA-F06][HU-05/CA-U03] nombre vacío o repetido: error en el campo, sin guardar', { tag: ['@HU-05', '@CA-F01', '@CA-U03'] }, async ({ page, equipo }) => {
    const existente = nombreUnico('Cat');
    await equipo.api.categoria(existente);
    await equipo.menu.abrir();
    await page.getByRole('button', { name: T.nuevaCategoria }).first().click();
    const d = equipo.menu.dialogo(T.nuevaCategoria);
    const campo = d.getByLabel(T.etiquetaNombre, { exact: true });

    await d.getByRole('button', { name: T.guardarCategoria }).click();
    await expect(campo).toHaveAttribute('aria-invalid', 'true');
    await expect(campo).toHaveAccessibleDescription(T.errorNombreCategoria);
    await expect(campo).toBeFocused();

    await campo.fill(existente.toUpperCase());
    await d.getByRole('button', { name: T.guardarCategoria }).click();
    await expect(campo).toHaveAccessibleDescription(T.errorCategoriaRepetida);
    await expect(d).toBeVisible();
    expect((await equipo.api.menu(true)).filter((c) => c.name.toLowerCase() === existente.toLowerCase())).toHaveLength(1);
  });

  test('[HU-05/CA-F08] borrar una categoría con productos activos no se permite y dice cuántos tiene', { tag: ['@HU-05', '@CA-F08'] }, async ({ page, equipo }) => {
    const nombre = nombreUnico('Cat');
    const id = await equipo.api.categoria(nombre);
    for (const p of ['Uno', 'Dos', 'Tres']) await equipo.api.producto(id, `${p} ${nombre}`.slice(0, 40), 150);
    await equipo.menu.abrir();

    await equipo.menu.accion('Borrar', nombre).click();
    const d = equipo.menu.dialogo(new RegExp(escapar(`No se puede borrar ${nombre}`)));
    await expect(d).toBeVisible();
    await expect(d).toContainText(T.borrarBloqueado(nombre, 3));
    await d.getByRole('button', { name: T.entendido }).click();
    await expect(d).toBeHidden();

    await expect(equipo.menu.categoria(id)).toBeVisible();
    expect((await equipo.api.menu(true)).find((c) => c.id === id)?.products).toHaveLength(3);
    // Foco de vuelta al botón que abrió el diálogo (WCAG 2.4.3).
    await expect(equipo.menu.accion('Borrar', nombre)).toBeFocused();
  });
});

test.describe('Productos', () => {
  test('[HU-05/CA-F02][HU-05/CA-U01] crear un producto: 1 formulario con 4 campos obligatorios, aparece en su categoría y en la toma de pedidos', { tag: ['@HU-05', '@CA-F02', '@CA-U01'] }, async ({ page, equipo }) => {
    const nombreCat = nombreUnico('Cat');
    const idCat = await equipo.api.categoria(nombreCat);
    await equipo.menu.abrir();
    await equipo.menu.elegirCategoria(idCat, nombreCat);
    await page.getByRole('button', { name: T.nuevoProducto }).click();

    const f = new FormularioProducto(equipo.menu.dialogo(T.nuevoProducto));
    await expect(f.dialogo).toBeVisible();
    // CA-U01: un solo formulario, exactamente 4 campos obligatorios, "(obligatorio)" en texto.
    await expect(f.dialogo.locator('form')).toHaveCount(1);
    await expect(f.dialogo.locator('label, legend').filter({ hasText: '(obligatorio)' })).toHaveCount(4);
    await expect(f.nombre()).toBeVisible();
    await expect(f.categoria()).toBeVisible();
    await expect(f.precio()).toBeVisible();
    await expect(f.disponible()).toBeChecked(); // por defecto "Disponible"
    await expect(f.categoria().locator('option:checked')).toHaveText(nombreCat); // la categoría elegida, preseleccionada

    const nombre = `Café ${nombreUnico('')}`.slice(0, 40);
    await f.rellenar({ nombre, precio: '1,60' });
    await f.enviar();
    await expect(equipo.menu.toast(T.toastProductoGuardado)).toBeVisible();
    await expect(f.dialogo).toBeHidden();

    const p = (await equipo.api.menu(true)).find((c) => c.id === idCat)!.products.find((x) => x.name === nombre);
    expect(p, 'el producto existe en el servidor').toMatchObject({ priceCents: 160, available: true });
    await expect(equipo.menu.producto(p!.id)).toContainText(nombre);
    await expect(equipo.menu.producto(p!.id)).toContainText(EUROS('1,60'));
    await expect(equipo.menu.producto(p!.id)).toContainText(T.disponible);
    // La toma de pedidos lo lee en su categoría y con su precio.
    expect((await equipo.toma.menu()).find((c) => c.id === idCat)!.products).toEqual([expect.objectContaining({ id: p!.id, name: nombre, priceCents: 160, available: true })]);
  });

  test('[HU-05/CA-F02] se puede crear un producto ya agotado ("Agotado" en el formulario)', { tag: ['@HU-05', '@CA-F02'] }, async ({ page, equipo }) => {
    const nombreCat = nombreUnico('Cat');
    const idCat = await equipo.api.categoria(nombreCat);
    await equipo.menu.abrir();
    await equipo.menu.elegirCategoria(idCat, nombreCat);
    await page.getByRole('button', { name: T.nuevoProducto }).click();
    const f = new FormularioProducto(equipo.menu.dialogo(T.nuevoProducto));
    await f.rellenar({ nombre: 'Moca', precio: '2,50', agotado: true });
    await f.enviar();
    await expect(f.dialogo).toBeHidden();
    const p = (await equipo.toma.menu()).find((c) => c.id === idCat)!.products[0]!;
    expect(p).toMatchObject({ name: 'Moca', priceCents: 250, available: false });
    await expect(equipo.menu.producto(p.id)).toContainText(T.agotado);
  });

  test('[HU-05/CA-F06][HU-05/CA-U03] datos inválidos: no se guarda y cada error dice el campo y el rango válido, con el foco en el primer campo erróneo', { tag: ['@HU-05', '@CA-F06', '@CA-U03'] }, async ({ page, equipo }) => {
    const nombreCat = nombreUnico('Cat');
    const idCat = await equipo.api.categoria(nombreCat);
    await equipo.menu.abrir();
    await equipo.menu.elegirCategoria(idCat, nombreCat);
    await page.getByRole('button', { name: T.nuevoProducto }).click();
    const f = new FormularioProducto(equipo.menu.dialogo(T.nuevoProducto));

    // Nombre vacío y precio 0 a la vez: los dos errores y el foco en el nombre.
    await f.rellenar({ precio: '0' });
    await f.enviar();
    await f.errorDe(f.nombre(), T.errorNombreProducto);
    await f.errorDe(f.precio(), T.errorPrecio);
    await expect(f.nombre()).toBeFocused();
    await expect(f.dialogo).toBeVisible();

    // Con el nombre bien y el precio mal, el foco va al precio y el nombre escrito no se pierde.
    await f.rellenar({ nombre: 'Prueba de precio' });
    for (const malo of ['0', '0,00', '-1', '-0,50', '2,505', '1,999', 'abc', '1000', '1.000,00', '999,991', '1e2', '']) {
      await f.rellenar({ precio: malo });
      await f.enviar();
      await f.errorDe(f.precio(), T.errorPrecio);
      await expect(f.precio(), `foco con precio «${malo}»`).toBeFocused();
      await expect(f.nombre()).toHaveValue('Prueba de precio');
    }
    // Nombre de 41 caracteres: se indica el rango del nombre.
    await f.rellenar({ nombre: 'N'.repeat(41), precio: '1,50' });
    await f.enviar();
    await f.errorDe(f.nombre(), T.errorNombreProducto);

    expect((await equipo.api.menu(true)).find((c) => c.id === idCat)!.products, 'no se ha guardado nada').toEqual([]);
  });

  test('[HU-05/CA-F02][HU-05/CA-F06] los límites se aceptan: 0,01 €, 999,99 € y los dos separadores decimales (coma y punto)', { tag: ['@HU-05', '@CA-F02', '@CA-F06'] }, async ({ page, equipo }) => {
    const nombreCat = nombreUnico('Cat');
    const idCat = await equipo.api.categoria(nombreCat);
    await equipo.menu.abrir();
    await equipo.menu.elegirCategoria(idCat, nombreCat);
    const casos: [string, string, number][] = [['Mínimo', '0,01', 1], ['Máximo', '999,99', 99_999], ['Con punto', '2.5', 250], ['Entero', '3', 300], ['Trampa float', '4,35', 435]];
    for (const [nombre, precio, centimos] of casos) {
      await page.getByRole('button', { name: T.nuevoProducto }).click();
      const f = new FormularioProducto(equipo.menu.dialogo(T.nuevoProducto));
      await f.rellenar({ nombre, precio });
      await f.enviar();
      await expect(f.dialogo, `${nombre}: el diálogo se cierra`).toBeHidden();
      const guardado = (await equipo.api.menu(true)).find((c) => c.id === idCat)!.products.find((p) => p.name === nombre);
      expect(guardado?.priceCents, `${nombre} (${precio})`).toBe(centimos);
    }
  });

  test('[HU-05/CA-F07] un nombre ya existente en la misma categoría muestra "Ya existe un producto con ese nombre en esta categoría." y no se guarda', { tag: ['@HU-05', '@CA-F07'] }, async ({ page, equipo }) => {
    const nombreCat = nombreUnico('Cat');
    const idCat = await equipo.api.categoria(nombreCat);
    await equipo.api.producto(idCat, 'Moca', 250);
    await equipo.menu.abrir();
    await equipo.menu.elegirCategoria(idCat, nombreCat);
    await page.getByRole('button', { name: T.nuevoProducto }).click();
    const f = new FormularioProducto(equipo.menu.dialogo(T.nuevoProducto));

    await f.rellenar({ nombre: 'moca', precio: '2,50' });
    await f.enviar();
    await f.errorDe(f.nombre(), T.errorProductoRepetido);
    await expect(f.dialogo).toBeVisible();
    await expect(f.precio()).toHaveValue('2,50');
    expect((await equipo.api.menu(true)).find((c) => c.id === idCat)!.products).toHaveLength(1);

    // En otra categoría el mismo nombre es válido.
    const otraNombre = nombreUnico('Cat');
    const otraId = await equipo.api.categoria(otraNombre);
    await page.reload();
    await equipo.menu.elegirCategoria(otraId, otraNombre);
    await page.getByRole('button', { name: T.nuevoProducto }).click();
    const g = new FormularioProducto(equipo.menu.dialogo(T.nuevoProducto));
    await g.rellenar({ nombre: 'Moca', precio: '2,50' });
    await g.enviar();
    await expect(g.dialogo).toBeHidden();
    expect((await equipo.api.menu(true)).find((c) => c.id === otraId)!.products.map((p) => p.name)).toEqual(['Moca']);
  });

  test('[HU-05/CA-F03] editar el precio: ayuda "El nuevo precio se aplicará…", el nuevo precio se ve en la lista y en la toma de pedidos', { tag: ['@HU-05', '@CA-F03'] }, async ({ page, equipo }) => {
    const nombreCat = nombreUnico('Cat');
    const idCat = await equipo.api.categoria(nombreCat);
    const id = await equipo.api.producto(idCat, 'Capuchino', 220);
    await equipo.menu.abrir();
    await equipo.menu.elegirCategoria(idCat, nombreCat);
    await equipo.menu.accion('Editar', 'Capuchino').click();

    const f = new FormularioProducto(equipo.menu.dialogo('Editar producto'));
    await expect(f.dialogo).toBeVisible();
    await expect(f.nombre()).toHaveValue('Capuchino');
    await expect(f.precio()).toHaveValue(/^2,20$/);
    await expect(f.dialogo).toContainText(T.ayudaPrecioEdicion);
    await f.rellenar({ precio: '2,40' });
    await f.enviar();
    await expect(equipo.menu.toast(T.toastProductoGuardado)).toBeVisible();

    await expect(equipo.menu.producto(id)).toContainText(EUROS('2,40'));
    expect((await equipo.toma.menu()).find((c) => c.id === idCat)!.products[0]).toMatchObject({ id, priceCents: 240 });
  });

  test('[HU-05/CA-F05] desactivar: diálogo con el aviso, "Volver" no cambia nada y "Desactivar producto" lo quita de la toma de pedidos; el encargado lo sigue viendo como DESACTIVADO y puede activarlo', { tag: ['@HU-05', '@CA-F05'] }, async ({ page, equipo }) => {
    const nombreCat = nombreUnico('Cat');
    const idCat = await equipo.api.categoria(nombreCat);
    const id = await equipo.api.producto(idCat, 'Moca', 250);
    await equipo.menu.abrir();
    await equipo.menu.elegirCategoria(idCat, nombreCat);

    await equipo.menu.elegirAccionDeProducto('Moca', 'Desactivar');
    const d = equipo.menu.dialogo(T.desactivarTitulo('Moca'));
    await expect(d).toBeVisible();
    await expect(d).toContainText(T.desactivarCuerpo);
    await d.getByRole('button', { name: T.volver }).click();
    await expect(d).toBeHidden();
    expect((await equipo.toma.menu()).find((c) => c.id === idCat)!.products.map((p) => p.id), 'Volver no cambia nada').toEqual([id]);

    await equipo.menu.elegirAccionDeProducto('Moca', 'Desactivar');
    await equipo.menu.dialogo(T.desactivarTitulo('Moca')).getByRole('button', { name: T.desactivarProducto }).click();
    await expect(equipo.menu.producto(id)).toContainText(T.desactivado);
    expect((await equipo.toma.menu()).find((c) => c.id === idCat)!.products, 'ya no sale en la toma de pedidos').toEqual([]);
    // Se conserva (histórico): el encargado lo ve con includeInactive.
    expect((await equipo.api.menu(true)).find((c) => c.id === idCat)!.products[0]).toMatchObject({ id, active: false });

    await equipo.menu.elegirAccionDeProducto('Moca', 'Activar');
    await expect(equipo.menu.producto(id)).not.toContainText(T.desactivado);
    expect((await equipo.toma.menu()).find((c) => c.id === idCat)!.products.map((p) => p.id)).toEqual([id]);
  });

  test('[HU-05/CA-F04][HU-05/CA-N01] el encargado marca Agotado desde la lista (⋯) y vuelve a Disponible; la toma de pedidos lo ve', { tag: ['@HU-05', '@CA-F04'] }, async ({ page, equipo }) => {
    const nombreCat = nombreUnico('Cat');
    const idCat = await equipo.api.categoria(nombreCat);
    const id = await equipo.api.producto(idCat, 'Moca', 250);
    await equipo.menu.abrir();
    await equipo.menu.elegirCategoria(idCat, nombreCat);

    await equipo.menu.elegirAccionDeProducto('Moca', 'Marcar agotado');
    await expect(equipo.menu.producto(id)).toContainText(T.agotado);
    await expect.poll(async () => (await equipo.toma.menu()).find((c) => c.id === idCat)!.products[0]!.available).toBe(false);

    await equipo.menu.elegirAccionDeProducto('Moca', 'Marcar disponible');
    await expect(equipo.menu.producto(id)).not.toContainText(T.agotado);
    await expect.poll(async () => (await equipo.toma.menu()).find((c) => c.id === idCat)!.products[0]!.available).toBe(true);
  });

  test('[HU-05/CA-F04] un cambio de disponibilidad hecho en otro dispositivo (camarero) llega a la pantalla del encargado sin recargar, en <= 5 s', { tag: ['@HU-05', '@CA-F04'] }, async ({ page, equipo }) => {
    const nombreCat = nombreUnico('Cat');
    const idCat = await equipo.api.categoria(nombreCat);
    const id = await equipo.api.producto(idCat, 'Cortado', 140);
    await equipo.menu.abrir();
    await equipo.menu.elegirCategoria(idCat, nombreCat);
    await expect(equipo.menu.producto(id)).not.toContainText(T.agotado);

    const t0 = Date.now();
    await equipo.toma.disponibilidad(id, false);
    await expect(equipo.menu.producto(id)).toContainText(T.agotado, { timeout: 5000 });
    expect(Date.now() - t0, 'ms hasta verlo').toBeLessThan(5500);
  });

  test('[HU-05/CA-F02][RS-25] un nombre con HTML se ve como texto: no se inserta ningún elemento ni se ejecuta nada', { tag: ['@HU-05', '@CA-F02'] }, async ({ page, equipo }) => {
    const nombreCat = nombreUnico('Cat');
    const idCat = await equipo.api.categoria(nombreCat);
    const peligroso = '<img src=x onerror=alert(1)>';
    const id = await equipo.api.producto(idCat, peligroso, 100);
    const dialogos: string[] = [];
    page.on('dialog', (d) => {
      dialogos.push(d.message());
      void d.dismiss();
    });
    await equipo.menu.abrir();
    await equipo.menu.elegirCategoria(idCat, nombreCat);
    await expect(equipo.menu.producto(id)).toContainText(peligroso);
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    await page.waitForTimeout(300);
    expect(dialogos).toEqual([]);
  });
});

test.describe('Orden (sin arrastrar: Subir y Bajar)', () => {
  test('[HU-05/CA-F09] el encargado sube una categoría con "Subir" y el nuevo orden se ve en la pantalla, en la toma de pedidos y tras recargar', { tag: ['@HU-05', '@CA-F09'] }, async ({ page, equipo }) => {
    const [a, b, c] = [nombreUnico('Cat'), nombreUnico('Cat'), nombreUnico('Cat')];
    const [ia, ib, ic] = [await equipo.api.categoria(a), await equipo.api.categoria(b), await equipo.api.categoria(c)];
    await equipo.menu.abrir();

    // Otras pruebas pueden crear categorías a la vez: se sube hasta pasar por delante de la A, no un número fijo de veces.
    for (let i = 0; i < 60; i++) {
      const orden = await equipo.menu.ordenCategorias();
      if (orden.indexOf(ic) < orden.indexOf(ia)) break;
      await equipo.menu.accion('Subir', c).click();
      await expect(equipo.menu.toast(T.toastOrdenActualizado)).toBeVisible();
    }
    const propios = (ids: string[]) => ids.filter((id) => [ia, ib, ic].includes(id));
    expect(propios(await equipo.menu.ordenCategorias())).toEqual([ic, ia, ib]);
    expect(propios((await equipo.toma.menu()).map((x) => x.id)), 'orden en la toma de pedidos').toEqual([ic, ia, ib]);
    await page.reload();
    expect(propios(await equipo.menu.ordenCategorias()), 'tras recargar').toEqual([ic, ia, ib]);
  });

  test('[HU-05/CA-F09] "Bajar" un producto de la categoría cambia su orden en la pantalla y en la toma de pedidos', { tag: ['@HU-05', '@CA-F09'] }, async ({ page, equipo }) => {
    const nombreCat = nombreUnico('Cat');
    const idCat = await equipo.api.categoria(nombreCat);
    const ids = [await equipo.api.producto(idCat, 'Uno', 100), await equipo.api.producto(idCat, 'Dos', 100), await equipo.api.producto(idCat, 'Tres', 100)];
    await equipo.menu.abrir();
    await equipo.menu.elegirCategoria(idCat, nombreCat);
    expect(await equipo.menu.ordenProductos()).toEqual(ids);

    await equipo.menu.accion('Bajar', 'Uno').click();
    await expect(equipo.menu.toast(T.toastOrdenActualizado)).toBeVisible();
    await equipo.menu.accion('Bajar', 'Uno').click();
    const esperado = [ids[1]!, ids[2]!, ids[0]!];
    await expect.poll(() => equipo.menu.ordenProductos()).toEqual(esperado);
    expect((await equipo.toma.menu()).find((c) => c.id === idCat)!.products.map((p) => p.id)).toEqual(esperado);
    // El primero no puede subir y el último no puede bajar.
    await expect(equipo.menu.accion('Subir', 'Dos')).toBeDisabled();
    await expect(equipo.menu.accion('Bajar', 'Uno')).toBeDisabled();
  });
});

function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
