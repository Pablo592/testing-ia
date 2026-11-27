// HU-05/CA-U02 (marcar un producto como agotado en <= 2 toques desde la toma de
// pedidos) y CA-F04 en la pantalla de toma (el producto aparece deshabilitado en
// todos los dispositivos en <= 5 s). Son de la pantalla P-04, que implementa HU-02
// (docs/ux/wireframes/03-toma-pedido.md, "Modo 'Marcar agotados'"): se ejecutan
// cuando HU-02 entra en tests/support/alcance.ts. Los selectores de P-03/P-04
// (rejilla de mesas, botón de producto) los fija el Testing de HU-02 en
// tests/README.md; aquí solo se nombran los del propio modo agotados.
//
//   Toque 1: botón "Marcar agotados" (barra de categorías) → banner de Aviso
//            "Modo agotados: toca un producto para cambiar su disponibilidad." + "Terminar".
//   Toque 2: el producto → pasa a AGOTADO (o vuelve a Disponible). "Terminar" no cuenta.
import { expect, test } from '../support/e2e/base.ts';
import { enAlcance } from '../support/alcance.ts';
import { cerrarSemilla, sembrarUsuario } from '../support/e2e/semilla.ts';
import { entrarComo } from '../support/e2e/pantallas.ts';
import { apiComo } from '../support/e2e/menu.ts';
import { nombreUnico } from '../support/datos.ts';

test.afterAll(async () => {
  await cerrarSemilla();
});

const BANNER = 'Modo agotados: toca un producto para cambiar su disponibilidad.';

/** Nuevo pedido en mostrador: P-02 → P-03 → P-04 (los 2 primeros toques no cuentan para CA-U02: es llegar a la toma). */
async function irALaToma(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: /nuevo pedido/i }).click();
  await page.getByRole('button', { name: /mostrador/i }).click();
}

test('[HU-05/CA-U02] camarero: marcar un producto como agotado desde la toma de pedidos son 2 toques ("Marcar agotados" + el producto)', { tag: ['@HU-05', '@CA-U02'] }, async ({ page }) => {
  test.skip(!enAlcance('HU-02'), 'P-04 la implementa HU-02 (tests/support/alcance.ts)');
  const m = await sembrarUsuario({ rol: 'manager' });
  const w = await sembrarUsuario({ rol: 'waiter' });
  const api = await apiComo(m);
  const nombreCat = nombreUnico('Cat');
  const idCat = await api.categoria(nombreCat);
  const nombre = 'Moca';
  const id = await api.producto(idCat, nombre, 250);
  try {
    await entrarComo(page, w);
    await irALaToma(page);
    // Precondición, fuera de la cuenta: la categoría del producto está abierta (cada cambio de categoría suma 1 toque, HU-02).
    await page.getByRole('tab', { name: nombreCat }).click();

    let toques = 0;
    await page.getByRole('button', { name: 'Marcar agotados' }).click();
    toques += 1;
    await expect(page.getByText(BANNER)).toBeVisible();
    await page.getByRole('button', { name: new RegExp(nombre) }).click();
    toques += 1;

    expect(toques, 'toques hasta tener el producto agotado').toBeLessThanOrEqual(2);
    await expect(page.getByRole('button', { name: new RegExp(nombre) })).toContainText(/AGOTADO/i);
    await expect.poll(async () => (await api.menu()).find((c) => c.id === idCat)!.products.find((p) => p.id === id)!.available).toBe(false);
    // "Terminar" sale del modo y no cuenta (el cambio ya estaba hecho).
    await page.getByRole('button', { name: 'Terminar' }).click();
    await expect(page.getByText(BANNER)).toHaveCount(0);
  } finally {
    await api.cerrar();
  }
});

test('[HU-05/CA-F04] el producto marcado agotado aparece deshabilitado (aria-disabled) en la toma de otro dispositivo en <= 5 s, y vuelve a poder pedirse al marcarlo Disponible', { tag: ['@HU-05', '@CA-F04'] }, async ({ browser }) => {
  test.skip(!enAlcance('HU-02'), 'P-04 la implementa HU-02 (tests/support/alcance.ts)');
  const m = await sembrarUsuario({ rol: 'manager' });
  const lucia = await sembrarUsuario({ rol: 'waiter' });
  const pedro = await sembrarUsuario({ rol: 'waiter' });
  const api = await apiComo(m);
  const nombreCat = nombreUnico('Cat');
  const idCat = await api.categoria(nombreCat);
  const id = await api.producto(idCat, 'Moca', 250);
  const tablets = await Promise.all([browser.newContext({ viewport: { width: 1280, height: 800 } }), browser.newContext({ viewport: { width: 1280, height: 800 } })]);
  try {
    const [pl, pp] = await Promise.all(tablets.map((c) => c.newPage()));
    await entrarComo(pl!, lucia);
    await entrarComo(pp!, pedro);
    for (const p of [pl!, pp!]) {
      await irALaToma(p);
      await p.getByRole('tab', { name: nombreCat }).click();
      await expect(p.getByRole('button', { name: /Moca/ })).not.toHaveAttribute('aria-disabled', 'true');
    }
    // Lucía lo marca agotado desde su tablet; Pedro lo ve en <= 5 s sin tocar nada.
    await pl!.getByRole('button', { name: 'Marcar agotados' }).click();
    await pl!.getByRole('button', { name: /Moca/ }).click();
    const t0 = Date.now();
    await expect(pp!.getByRole('button', { name: /Moca/ })).toHaveAttribute('aria-disabled', 'true', { timeout: 5000 });
    expect(Date.now() - t0).toBeLessThan(5500);
    await expect(pp!.getByRole('button', { name: /Moca/ })).toContainText(/AGOTADO/i);

    await api.disponibilidad(id, true);
    await expect(pp!.getByRole('button', { name: /Moca/ })).not.toHaveAttribute('aria-disabled', 'true', { timeout: 5000 });
  } finally {
    await Promise.all(tablets.map((c) => c.close()));
    await api.cerrar();
  }
});
