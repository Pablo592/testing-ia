# "Acceso denegado" y pantallas vacías de HU-01 [2.1d]

Tarea 2.1d (2026-11-24). Entradas: `docs/arquitectura.md` §5.2 (rutas de la SPA y guarda `RequirePermission`), §5 (`403 FORBIDDEN`), HU-01/CA-F03, CA-F04, CA-U04; hallazgo T-31 de `docs/testing.md` §14.5. Componente en `../design-system.md` §5.13.

No es una pantalla con ID propio (P-xx): es un **estado de la layout** que sustituye al contenido de una ruta sin permiso. La URL no cambia.

## Cuándo aparece

| Situación | Qué pasa |
|---|---|
| Se abre por URL una ruta de la tabla de §5.2 sin el permiso de su guarda (p. ej. camarero en `/menu`, barra en `/pedidos`) | La guarda no monta la pantalla pedida y muestra "Acceso denegado". No se pide ningún dato de esa función (solo `GET /auth/me`, `GET /events`, `POST /session/activity` y `POST /telemetry`) |
| Una pantalla ya montada recibe `403 FORBIDDEN` (p. ej. el rol cambió en otro dispositivo) | La pantalla se sustituye por "Acceso denegado" y la app recarga `GET /auth/me`. Lo no enviado se pierde, salvo el borrador de pedido de HU-02 (arquitectura) |
| Otros `403` (`PIN_CHANGE_REQUIRED`, `PIN_INVALID`, `MANAGER_APPROVAL_INVALID`…) | **No** muestran este estado: tienen su propio mensaje |
| Ruta desconocida | No muestra este estado: redirige al inicio del rol (§5.2) |

## Wireframe (tablet 1280x800, camarero en `/menu`)

```
+-----------------------------------------------------------------------------------+
| Acceso denegado  (h1)                       Lucía · Camarero   [⎋ Cerrar sesión]  |  barra superior 64 px
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                                  🔒  (48 px, decorativo)                           |
|                                                                                   |
|                    No tienes permiso para ver esta pantalla.        text-lg       |
|                    Si la necesitas, pide al encargado que           text-base,    |
|                    revise tu rol.                                   text-secondary|
|                                                                                   |
|                    +-------------------------------+                              |
|                    |        IR A PEDIDOS           |   <- único primario;         |
|                    +-------------------------------+      enlace (`<a>`) con       |
|                                                           estilo de botón, 64 px   |
|                     bloque centrado, ancho máx. 560 px, 64 px desde la barra      |
+-----------------------------------------------------------------------------------+
```

Encargado: la barra superior tiene además "☰ Gestión", como en el resto de pantallas, con "Pedidos" como primera opción [2.4]; "IR A PEDIDOS" es la vía de 1 toque y el menú la de 2. Barra: la barra superior no lleva el interruptor de sonido ni el indicador de conexión (son de P-05).

## Textos exactos

| Elemento | Texto | Notas |
|---|---|---|
| `h1` (título de la barra superior, el único `h1`) | "Acceso denegado" | Es el **único** elemento visible con ese texto (el E2E lo busca con `getByText(/acceso denegado/i)`); no se repite en el contenido ni en una región `aria-live` |
| Título del documento | "Acceso denegado · Café · Toma de pedidos" | WCAG 2.4.2 |
| Texto 1 | "No tienes permiso para ver esta pantalla." | Propuesta del SE, aceptada |
| Texto 2 | "Si la necesitas, pide al encargado que revise tu rol." | Añadido: dice qué hacer (Nielsen 9, ayudar a recuperarse de errores) |
| Acción (camarero/cajero y encargado) | "Ir a Pedidos" → `/pedidos` | Cambia la propuesta "Ir al inicio": nombra el destino, igual que la barra superior de ese destino (WCAG 2.4.4 y 2.4.6, propósito y etiqueta descriptivos; Nielsen 2) |
| Acción (barra) | "Ir a la cola" → `/cola` | Ídem |

## Comportamiento y accesibilidad (WCAG 2.2 AA)

- **Foco:** al mostrarse, el foco va al `h1` (`tabindex="-1"`), igual que en cualquier cambio de pantalla de la SPA, para que el lector de pantalla lo anuncie (2.4.3, 4.1.3). Orden de tabulación: barra superior ("Gestión" si es encargado, "Cerrar sesión") → "Ir a …".
- **Rol del control:** es una navegación, así que es un **enlace** (`role="link"`) con el estilo `primario` de §5.1, no un `button`. Se activa con Enter.
- **Contraste** (tokens existentes, sin colores nuevos): `text` sobre `bg` 17,06:1; `text-secondary` sobre `bg` 7,24:1; texto blanco sobre `primary` 6,7:1. El icono es decorativo (`aria-hidden`).
- **Objetivo táctil:** 64 px de alto (`touch-lg`), ancho mínimo 240 px.
- **Un solo primario** (criterio del design system §0.2): "Ir a …".
- **Telemetría:** no hay valor `screen` nuevo (`../flujos.md` §10.2). En este estado solo se envía `client_js_errors_total`, con el `screen` de la ruta pedida.

## Responsive

| Ancho | Cambios |
|---|---|
| 375 px | Bloque a todo el ancho con 16 px de margen; texto alineado a la izquierda; enlace a todo el ancho. En la barra superior, el `h1` va en 1 línea y se ve "Acceso" (" denegado" en `sr-only`; nombre accesible "Acceso denegado"), design-system §5.11.1 [2.13a]. El único elemento visible con el texto completo es el `h1` a >= 768 px; a 375 px la prueba E2E debe usar el nombre accesible |
| 768 px | Bloque centrado, ancho máx. 560 px; enlace de 240 px como mínimo |
| 1440 px | Igual que 768 px |

## Pantallas vacías de HU-01 (P-09, P-10, P-11)

En HU-01 se crean las rutas `/menu`, `/personal` y `/resumen` con su guarda (§5.2) y solo la barra superior. Su contenido llega con HU-05, HU-07 y HU-08.

| Ruta | `h1` (barra superior) | Título del documento | Opción de "Gestión" que lleva a ella ("Pedidos" y "Cola de barra" también están en el menú) |
|---|---|---|---|
| `/menu` | "Menú" | "Menú · Café · Toma de pedidos" | "Menú" |
| `/personal` | "Personal" | "Personal · Café · Toma de pedidos" | "Personal" |
| `/resumen` | "Resumen del día" | "Resumen del día · Café · Toma de pedidos" | "Resumen del día" |

Son los mismos títulos que ya tienen los wireframes `06-gestion-menu.md`, `08-personal.md` y `09-resumen-dia.md` y las opciones del menú de gestión, así que no cambian cuando llegue cada historia.

Contenido mientras estén vacías: dentro de `main`, un solo párrafo en `text-base`, `text-secondary`: **"Esta pantalla todavía no está disponible."** (evita que una zona en blanco parezca un error o una carga sin fin; Nielsen 1). Se quita al implementar la historia. Sin botón principal. La revisión UX de la 2.3 no las evalúa por los estados vacío/cargando/error de §5.12, porque no cargan datos.

Las rutas `/pedidos` y `/cola` de HU-01 usan los `h1` "Pedidos" y "Cola" de sus wireframes (`02-pedidos.md`, `04-cola-barra.md`); el número de la cola ("· 7") va fuera del `h1`.

## Criterios cubiertos

| Criterio | Cómo |
|---|---|
| HU-01/CA-F04 | "Acceso denegado" por URL sin montar la pantalla ni pedir sus datos; el servidor responde además `403 FORBIDDEN` |
| HU-01/CA-F03 | El encargado llega a `/pedidos`, `/menu`, `/personal`, `/resumen` y `/cola` desde "Gestión" sin ver "Acceso denegado" [2.4] |
| HU-01/CA-U04 | La barra superior, con nombre y rol, se mantiene en "Acceso denegado" y en las pantallas vacías |
| Criterio común WCAG 2.2 AA | Foco al `h1`, enlace con propósito descriptivo, título del documento, contrastes de tokens verificados |
