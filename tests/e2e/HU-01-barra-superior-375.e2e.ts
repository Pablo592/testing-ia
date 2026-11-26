// H-2.6-01 (2.8a): a 375 px la barra superior del encargado no cambia de altura
// de una pantalla a otra y el `h1` no se parte en dos líneas. Con "Gestión" a su
// lado, "Resumen del día" ocupaba 2 líneas (barra de 121 px frente a los 113 px
// de /pedidos, /cola, /menu y /personal): el contenido saltaba 8 px al navegar.
// docs/ux/design-system.md §5.11 (barra de 2 filas, fija) y docs/ux/revision.md §2.6.
//
// Cualquiera de las dos correcciones propuestas por UX cumple el test (que el
// `h1` no se parta, con `white-space: nowrap` y elipsis, o que el título visible
// sea más corto a <= 767 px): se mide el número de LÍNEAS del `h1` y la altura de
// la barra, no su texto.
import { expect, test } from '../support/e2e/base.ts';
import { cerrarSemilla, sembrarUsuario } from '../support/e2e/semilla.ts';
import { BarraSuperior, entrarComo, RUTAS, TITULO_RUTA } from '../support/e2e/pantallas.ts';
import type { Locator } from '@playwright/test';

test.afterAll(async () => {
  await cerrarSemilla();
});

const PANTALLAS = ['pedidos', 'cola', 'menu', 'personal', 'resumen'] as const;

/** Número de líneas de texto de un elemento (una caja por línea con `Range.getClientRects`). */
async function lineas(el: Locator): Promise<number> {
  return el.evaluate((nodo) => {
    const r = document.createRange();
    r.selectNodeContents(nodo);
    return new Set([...r.getClientRects()].filter((c) => c.width > 0).map((c) => Math.round(c.top))).size;
  });
}

test('[H-2.6-01] encargado a 375 px: la barra mide lo mismo en las 5 pantallas y el h1 no se parte en 2 líneas', { tag: ['@HU-01', '@UX'] }, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const u = await sembrarUsuario({ rol: 'manager' });
  await entrarComo(page, u);

  const alturas: Record<string, number> = {};
  for (const pantalla of PANTALLAS) {
    await test.step(pantalla, async () => {
      await page.goto(RUTAS[pantalla]);
      const barra = page.getByRole('banner');
      const h1 = new BarraSuperior(page).titulo(TITULO_RUTA[pantalla]);
      await expect(h1, `h1 de ${pantalla}`).toBeVisible();
      await expect(new BarraSuperior(page).gestion()).toBeVisible();
      await expect(new BarraSuperior(page).cerrarSesion()).toBeVisible();
      alturas[pantalla] = (await barra.boundingBox())!.height;
      expect.soft(await lineas(h1), `líneas del h1 «${TITULO_RUTA[pantalla]}» a 375 px`).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'sin desplazamiento horizontal').toBe(true);
    });
  }

  const referencia = alturas.pedidos;
  for (const pantalla of PANTALLAS) {
    expect.soft(Math.abs(alturas[pantalla] - referencia), `altura de la barra en /${pantalla} (${alturas[pantalla]} px) frente a /pedidos (${referencia} px)`).toBeLessThanOrEqual(1);
  }
});
