// Barra superior y título de pantalla en 375, 320, 768 y 1280 px.
//
// H-2.6-01 (2.8a): a 375 px la barra del encargado no cambia de altura de una
// pantalla a otra y el `h1` no se parte en dos líneas.
// H-2.8c-01 (2.13b): a <= 767 px "Resumen del día" se ve "Resumen" y "Acceso
// denegado" se ve "Acceso"; el resto del título va en un `span.sr-only` dentro
// del `h1`, de modo que el nombre accesible sigue siendo el título completo.
//
// Contrato de medición: docs/ux/design-system.md §5.11.1 (7 puntos). Se mide el
// DOM renderizado, no detalles internos del componente:
//   1. nombre accesible del `h1` = título completo (y `textContent` igual);
//   2. texto visible = título corto, sin "…";
//   3. `scrollWidth <= clientWidth` (la elipsis no se activa);
//   4. una sola línea;
//   5. barra de 113 px a <= 767 px (igual en todas las pantallas del rol) y de
//      65 px a >= 768 px; sin desplazamiento horizontal del documento;
//   6. el `span.sr-only` NO es `display:none` (1 x 1 px) y a >= 768 px el título
//      completo se ve;
//   7. `<title>` = "<título completo> · Café · Toma de pedidos".
//
// Las pantallas se localizan SIEMPRE por nombre accesible exacto. Buscar el
// texto visible "Resumen del día" o `getByText(/acceso denegado/i)` a 375 px ya
// no es válido (el texto visible es otro).
import { randomBytes } from 'node:crypto';
import { expect, test } from '../support/e2e/base.ts';
import { cerrarSemilla, sembrarUsuario } from '../support/e2e/semilla.ts';
import { AccesoDenegado, entrarComo, RUTAS, SUFIJO_DOCUMENTO, TITULO_CORTO_MOVIL, TITULO_RUTA } from '../support/e2e/pantallas.ts';
import { ROL_TEXTO, type Rol } from '../support/datos.ts';
import type { Locator, Page } from '@playwright/test';

test.afterAll(async () => {
  await cerrarSemilla();
});

/** Una pantalla: ruta, título completo (nombre accesible) y título visible a <= 767 px. */
interface Pantalla {
  ruta: string;
  completo: string;
  corto: string;
  denegada?: boolean;
}

const PEDIDOS: Pantalla = { ruta: RUTAS.pedidos, completo: TITULO_RUTA.pedidos, corto: TITULO_CORTO_MOVIL.pedidos };
const COLA: Pantalla = { ruta: RUTAS.cola, completo: TITULO_RUTA.cola, corto: TITULO_CORTO_MOVIL.cola };
const MENU: Pantalla = { ruta: RUTAS.menu, completo: TITULO_RUTA.menu, corto: TITULO_CORTO_MOVIL.menu };
const PERSONAL: Pantalla = { ruta: RUTAS.personal, completo: TITULO_RUTA.personal, corto: TITULO_CORTO_MOVIL.personal };
const RESUMEN: Pantalla = { ruta: RUTAS.resumen, completo: TITULO_RUTA.resumen, corto: TITULO_CORTO_MOVIL.resumen };
/** "Acceso denegado" en la ruta indicada (el rol no tiene permiso). */
const denegada = (ruta: string): Pantalla => ({ ruta, completo: 'Acceso denegado', corto: TITULO_CORTO_MOVIL.accesoDenegado, denegada: true });

const CASOS: { rol: Rol; nombre: string; pantallas: Pantalla[] }[] = [
  { rol: 'manager', nombre: 'Lía', pantallas: [PEDIDOS, COLA, MENU, PERSONAL, RESUMEN] },
  { rol: 'waiter', nombre: 'Ana', pantallas: [PEDIDOS, denegada(RUTAS.menu), denegada(RUTAS.personal), denegada(RUTAS.resumen), denegada(RUTAS.cola)] },
  { rol: 'kitchen', nombre: 'Eva', pantallas: [COLA, denegada(RUTAS.pedidos), denegada(RUTAS.menu), denegada(RUTAS.personal), denegada(RUTAS.resumen)] },
];

/** [ancho, alto, altura esperada de la barra]: <= 767 px, 2 filas de 56 px + 1 px de borde; >= 768 px, 65 px. */
const VIEWPORTS: [number, number, number][] = [
  [375, 812, 113],
  [320, 568, 113],
  [768, 1024, 65],
  [1280, 800, 65],
];

interface MedidaH1 {
  textContent: string;
  /** Concatenación del textContent de los hijos del h1 que no llevan la clase `sr-only`. */
  visibleSinSrOnly: string;
  innerText: string;
  scrollWidth: number;
  clientWidth: number;
  altura: number;
  alturaLinea: number;
  /** Filas de texto del texto visible (cajas distintas en vertical de `Range.getClientRects`). */
  filas: number;
  /** `span.sr-only` dentro del h1 (null si no existe). */
  srOnly: null | { display: string; visibility: string; hidden: boolean; ancho: number; alto: number; texto: string };
  /** Cualquier `span` dentro del h1 (a >= 768 px puede haber perdido la clase `sr-only`). */
  span: null | { display: string; visibility: string; hidden: boolean; ancho: number; alto: number; texto: string };
}

/** Medidas del `h1` en el navegador (se mide lo renderizado). */
async function medirH1(h1: Locator): Promise<MedidaH1> {
  return h1.evaluate((nodo): MedidaH1 => {
    const esSrOnly = (n: Node): boolean => n instanceof Element && n.classList.contains('sr-only');
    const medirSpan = (el: Element | null) => {
      if (!el) return null;
      const e = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { display: e.display, visibility: e.visibility, hidden: (el as HTMLElement).hidden, ancho: r.width, alto: r.height, texto: el.textContent ?? '' };
    };
    const visibles = [...nodo.childNodes].filter((n) => !esSrOnly(n));
    const tops = new Set<number>();
    for (const n of visibles) {
      const rango = document.createRange();
      rango.selectNode(n);
      for (const c of rango.getClientRects()) if (c.width > 0 && c.height > 0) tops.add(Math.round(c.top));
    }
    const e = getComputedStyle(nodo);
    const lh = parseFloat(e.lineHeight);
    return {
      textContent: nodo.textContent ?? '',
      visibleSinSrOnly: visibles.map((n) => n.textContent ?? '').join(''),
      innerText: (nodo as HTMLElement).innerText,
      scrollWidth: nodo.scrollWidth,
      clientWidth: nodo.clientWidth,
      altura: nodo.getBoundingClientRect().height,
      alturaLinea: Number.isFinite(lh) ? lh : parseFloat(e.fontSize) * 1.2,
      filas: tops.size,
      srOnly: medirSpan(nodo.querySelector('span.sr-only')),
      span: medirSpan(nodo.querySelector('span')),
    };
  });
}

async function sinDesplazamientoHorizontal(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}

/** Nombre corto y único (la rejilla y la barra usan el nombre real: "Lucía · Camarero" en el contrato). */
function nombreCorto(base: string): string {
  return `${base}${randomBytes(3).toString('hex')}`;
}

for (const { rol, nombre, pantallas } of CASOS) {
  for (const [ancho, alto, alturaBarra] of VIEWPORTS) {
    const movil = ancho <= 767;
    test(
      `[H-2.6-01][H-2.8c-01] ${ROL_TEXTO[rol]} a ${ancho} px: título por nombre accesible${movil ? ', título corto visible en 1 línea' : ' completo'}, barra de ${alturaBarra} px igual en todas sus pantallas`,
      { tag: ['@HU-01', '@UX'] },
      async ({ page }) => {
        await page.setViewportSize({ width: ancho, height: alto });
        const u = await sembrarUsuario({ rol, nombre: nombreCorto(nombre) });
        await entrarComo(page, u);

        const alturas: Record<string, number> = {};
        for (const pantalla of pantallas) {
          const etiqueta = `${pantalla.denegada ? 'Acceso denegado en ' : ''}${pantalla.ruta}`;
          await test.step(`${etiqueta} a ${ancho} px`, async () => {
            await page.goto(pantalla.ruta);

            // 1. Nombre accesible = título completo; exactamente 1 `h1`.
            const h1 = page.getByRole('heading', { level: 1, name: pantalla.completo, exact: true });
            await expect(h1, `h1 con nombre accesible «${pantalla.completo}» en ${etiqueta}`).toHaveCount(1);
            await expect(h1).toBeVisible();
            await expect(page.locator('h1'), 'único h1 de la página').toHaveCount(1);
            if (pantalla.denegada) {
              // Incluye el foco en el h1 (2.4.3), el enlace de vuelta y el único texto «Acceso denegado».
              await new AccesoDenegado(page).comprobar(rol);
            }
            // 7. <title> (en todas las resoluciones).
            await expect(page, `<title> de ${etiqueta}`).toHaveTitle(`${pantalla.completo}${SUFIJO_DOCUMENTO}`);

            const m = await medirH1(h1);
            expect.soft(m.textContent, '1. textContent del h1 = título completo (con el espacio inicial del span)').toBe(pantalla.completo);

            if (movil) {
              // 2. Texto visible = título corto, sin elipsis.
              expect.soft(m.visibleSinSrOnly.trim(), '2. texto visible (hijos sin la clase sr-only) = título corto').toBe(pantalla.corto);
              expect.soft(m.innerText, '2. el texto renderizado no contiene «…»').not.toContain('…');
              // El título corto es un prefijo del completo (WCAG 2.5.3) y sin signos colgantes.
              expect.soft(pantalla.completo.startsWith(m.visibleSinSrOnly.trim()), 'el título visible es un prefijo del nombre accesible (2.5.3)').toBe(true);
              // 6. `span.sr-only` real, no display:none, de 1 x 1 px (solo si se acorta el título).
              if (pantalla.corto !== pantalla.completo) {
                expect.soft(m.srOnly, '6. existe `span.sr-only` dentro del h1').not.toBeNull();
                if (m.srOnly) {
                  expect.soft(m.srOnly.display, '6. el span sr-only no es display:none').not.toBe('none');
                  expect.soft(m.srOnly.visibility, '6. el span sr-only no es visibility:hidden').toBe('visible');
                  expect.soft(m.srOnly.hidden, '6. el span sr-only no lleva el atributo hidden').toBe(false);
                  expect.soft([Math.round(m.srOnly.ancho), Math.round(m.srOnly.alto)], '6. el span sr-only mide 1 x 1 px').toEqual([1, 1]);
                  expect.soft(m.srOnly.texto, 'el span sr-only lleva el resto del título').toBe(pantalla.completo.slice(pantalla.corto.length));
                }
              }
            } else {
              // 6. A >= 768 px el título completo se ve (el span ya no es sr-only).
              expect.soft(m.innerText.trim(), '6. a >= 768 px el h1 muestra el título completo').toBe(pantalla.completo);
              if (m.span) {
                expect.soft(m.span.display, '6. a >= 768 px el span se muestra').not.toBe('none');
                expect.soft(m.span.visibility).toBe('visible');
                expect.soft(m.span.ancho > 1 && m.span.alto > 1, `6. a >= 768 px el span no mide 1 x 1 px (mide ${m.span.ancho} x ${m.span.alto})`).toBe(true);
              }
            }

            // 3. Sin recorte (la elipsis no se activa).
            expect.soft(m.scrollWidth, `3. h1.scrollWidth (${m.scrollWidth}) <= clientWidth (${m.clientWidth})`).toBeLessThanOrEqual(m.clientWidth);
            // 4. Una sola línea.
            expect.soft(m.altura, `4. altura del h1 (${m.altura} px) <= 1,5 x line-height (${m.alturaLinea} px)`).toBeLessThanOrEqual(1.5 * m.alturaLinea);
            expect.soft(m.filas, '4. el texto visible ocupa 1 sola fila (Range.getClientRects)').toBe(1);

            // 5. Barra y desplazamiento horizontal del documento.
            const barra = (await page.getByRole('banner').boundingBox())!;
            alturas[pantalla.ruta] = barra.height;
            expect.soft(barra.height, `5. barra de ${alturaBarra} px a ${ancho} px en ${etiqueta} (mide ${barra.height} px)`).toBeCloseTo(alturaBarra, 0);
            expect.soft(await sinDesplazamientoHorizontal(page), '5. sin desplazamiento horizontal del documento').toBe(true);
          });
        }

        // 5. Idéntica en todas las pantallas del rol (cambiar de pantalla no mueve el contenido).
        const referencia = alturas[pantallas[0].ruta];
        for (const pantalla of pantallas) {
          expect.soft(Math.abs(alturas[pantalla.ruta] - referencia), `altura de la barra en ${pantalla.ruta} (${alturas[pantalla.ruta]} px) frente a ${pantallas[0].ruta} (${referencia} px)`).toBeLessThanOrEqual(1);
        }
      },
    );
  }
}
