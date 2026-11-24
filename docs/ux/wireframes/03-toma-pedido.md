# P-03 / P-04 Toma de pedido (HU-02, HU-05 agotados, HU-06 añadir)

## P-03 Elegir mesa o mostrador (toque 2 del flujo)

Un solo toque elige el tipo y la mesa a la vez: no hay un paso previo "¿Mesa o mostrador?".

```
+-----------------------------------------------------------------------------------+
| Nuevo pedido                                Lucía · Camarero   [⎋ Cerrar sesión]  |
+-----------------------------------------------------------------------------------+
| [< Volver]                                                                         |
|                                                                                   |
|  +-------------------------------------+                                          |
|  |  🛍  MOSTRADOR / PARA LLEVAR         |   <- 88 px de alto, ancho doble           |
|  +-------------------------------------+                                          |
|                                                                                   |
|  Mesas                                                                            |
|  +--------+ +--------+ +--------+ +--------+ +--------+ +--------+ +--------+     |
|  | Mesa 1 | | Mesa 2 | | Mesa 3 | | Mesa 4 | | Mesa 5 | | Mesa 6 | | Mesa 7 |     |
|  |        | |        | |Abierta | |        | |        | |        | |Abierta |     |
|  |        | |        | |  #44   | |        | |        | |        | |#38 #42 |     |
|  +--------+ +--------+ +--------+ +--------+ +--------+ +--------+ +--------+     |
|  ... hasta N = 20 (fijo en la instalación). Botones de 120x88 px; 16 px de sep.   |
|  "Abierta" en texto + borde de 2 px (no solo color).                              |
+-----------------------------------------------------------------------------------+
```

**Tamaño de la rejilla [1.2c]:** en el MVP, N = **20 mesas fijas en la instalación** (supuesto 20; HU-09 fuera del MVP, HU-02/CA-F01). Con 20 mesas, la rejilla de 120x88 px cabe sin desplazar en las dos orientaciones de la tablet de referencia (HU-02/CA-U06, CA-N05):

| Vista | Espacio útil supuesto bajo "Mostrador" | Rejilla de 120x88 px (16 de separación) | 20 mesas |
|---|---|---|---|
| 1280x800 (horizontal, supuesto 23) | 1216x512 px | 8 x 4 = 32 | 8 + 8 + 4, sin desplazar |
| 800x1280 (vertical, supuesto 23) | 736x968 px | 5 x 9 = 45 | 5 x 4, sin desplazar |
| 768x1024 (captura de revisión) | 704x736 px | 5 x 7 = 35 | 5 x 4, sin desplazar |

"Abierta" se muestra en texto con un borde de 2 px. En 375 px se acepta desplazamiento vertical (dispositivo de emergencia, fuera de HU-02/CA-N05).
Si soporte técnico reinstala con otro número de mesas, la tabla de tamaños adaptables de la tarea 1.2b (hasta 99 mesas, con un mínimo de 56x56 px) sigue siendo válida; no forma parte del MVP.

## P-04 Toma de pedido: tablet en horizontal (1280x800)

```
+-----------------------------------------------------------------------------------+
| Pedido · Mesa 7  [Cambiar]                  Lucía · Camarero   [⎋ Cerrar sesión]  |
+-----------------------------------------------------------------------------------+
| ⚠ La mesa 7 ya tiene un pedido abierto (#38). Este se enviará como pedido          |  <- Aviso no
|   independiente.                                                          [ × ]    |     bloqueante
+-----------------------------------------------------+-----------------------------+
| [Cafés] [Infusiones] [Zumos] [Bollería] [Tostadas]  |  Pedido · Mesa 7            |
|  ^activa: fondo primario + subrayado 4 px           |                             |
|  (con más categorías, pasan a otra fila: sin scroll  |                             |
|   horizontal, ver "Categorías en varias filas")      |                             |
|                                 [⊘ Marcar agotados] |  2 × Café con leche         |
| +------------+ +------------+ +------------+        |      1,60 €    3,20 €       |
| | Café solo  | | Café con  | | Cortado    |        |  [ − ] [ + ]  [✎ Añadir nota]|
| |            | | leche  ×2 | |            |        |  Nota: leche de avena       |
| |   1,30 €   | |   1,60 €  | |   1,40 €   |        | --------------------------- |
| +------------+ +------------+ +------------+        |  1 × Cruasán                |
| +------------+ +------------+ +------------+        |      1,80 €    1,80 €       |
| | Capuchino  | | Americano  | | ~~Moca~~   |        |  [ − ] [ + ]  [✎ Añadir nota]|
| |            | |            | | AGOTADO    |        |                             |
| |   2,20 €   | |   1,50 €   | |   2,50 €   |        |                             |
| +------------+ +------------+ +------------+        | --------------------------- |
|  productos de 120x88 px como mínimo, 3-5 columnas    |  Total (IVA incl.)  5,00 €  |  text-2xl
|  según el ancho; "×2" = cantidad ya en el pedido     |                             |
|                                                     | +-------------------------+ |
|                                                     | |   ENVIAR A BARRA        | |  <- único primario
|                                                     | +-------------------------+ |     64 px
|                                                     |  [Descartar]  (peligro-     |
|                                                     |               contorno)     |
+-----------------------------------------------------+-----------------------------+
```

Panel del pedido: 400 px fijos a la derecha. En "Mostrador", su cabecera tiene el campo
"Nombre del cliente (opcional)", máx. 30, con contador.

## Categorías en varias filas [1.2c] (HU-02/CA-U02, CA-N05; HU-05/CA-N03)

Con un menú de 20 categorías (HU-05/CA-N03, que incluye HU-02/CA-N05), una barra de pestañas de una sola fila necesitaría desplazamiento horizontal, que HU-02/CA-N05 prohíbe. Por eso las pestañas **pasan a varias filas**:
- Pestañas de 48 px de alto, ancho según el texto (mín. 88 px), 8 px de separación. Siempre se ven todas: cambiar de categoría sigue siendo 1 toque (HU-02/CA-U02) y no hay menú "Más" que añada toques.
- En 1280x800 el área de productos mide 880 px de ancho: unas 6-7 pestañas por fila, así que 20 categorías ocupan 3 filas (unos 160 px). En 800x1280 caben unas 6 por fila: 4 filas (unos 216 px).
- Las pestañas no se desplazan con los productos: los productos tienen su propio desplazamiento vertical (permitido por HU-02/CA-N05). El total y "Enviar a barra" siguen fijos y visibles.
- "Marcar agotados" va a la derecha de la última fila de pestañas.
- Con el menú típico (5-7 categorías) sigue siendo una sola fila, como en el wireframe.
- Nombres de categoría de hasta 30 caracteres (HU-05/CA-F01): si uno no cabe en 240 px, se parte en 2 líneas dentro de la pestaña (no se corta con "…").

## P-04 en vertical (800x1280, supuesto 23; también 768 px) y en móvil (375 px)

```
+-------------------------------------------+
| Pedido · Mostrador        Lucía · Camarero|
+-------------------------------------------+
| [Cafés] [Infusiones] [Zumos] [Bollería]   |
| [Tostadas] ...  (varias filas, sin scroll |
|  horizontal)                              |
|                     [⊘ Marcar agotados]   |
| +---------+ +---------+ +---------+       |
| |Café solo| |Café con | |Cortado  |       |
| | 1,30 €  | |leche ×2 | | 1,40 €  |       |
| +---------+ +---------+ +---------+       |
|  ...                                      |
+-------------------------------------------+
| ▲ Ver pedido (3 productos)   Total 5,00 € |  <- barra inferior fija:
| +---------------------------------------+ |     tocar abre el panel del
| |          ENVIAR A BARRA               | |     pedido como bottom sheet
| +---------------------------------------+ |     (líneas, +/-, notas)
+-------------------------------------------+
```
"Enviar a barra" y el total siempre están visibles sin desplazar, en cualquier orientación.

## Estados y variantes

| Estado | Qué se ve |
|---|---|
| Vacío (sin líneas) | Panel: "Toca un producto para añadirlo"; "Enviar a barra" deshabilitado con la ayuda "Añade al menos un producto" |
| Categoría vacía | "No hay productos disponibles en Bollería" |
| Menú vacío (sin categorías) | "Todavía no hay menú. El encargado debe crearlo en Gestión > Menú" |
| Cargando menú | Esqueleto de pestañas y 9 botones |
| Enviando | Botón "Enviando…" deshabilitado; productos y +/- bloqueados para no cambiar lo que se envía |
| Error de envío | Bloque de error encima del botón: "⚠ No se ha podido enviar, reintenta"; el botón pasa a "Reintentar envío"; el pedido se conserva (y se reintenta con la misma clave, sin duplicar) |
| Éxito | Vuelta a P-02 con un toast de 5 s: "Pedido **42** enviado a barra" (número en 40 px) |
| Producto agotado | Fondo `surface-muted`, nombre tachado, insignia "AGOTADO", no responde al toque (`aria-disabled`) |
| Cambio de agotado remoto | Si un producto que ya está en el pedido se marca agotado: aviso en la línea "Cruasán se ha agotado" + "Quitar" |
| Descartar | Diálogo "¿Descartar este pedido? Se perderán 3 productos." [Volver] [Descartar pedido] |
| Nota | Bottom sheet: campo "Nota para barra" (máx. 100, contador "12/100"), chips "Sin azúcar", "Leche de avena", "Descafeinado", "Para llevar"; [Guardar nota] |
| Línea a 0 | La línea desaparece; toast "Cruasán quitado · Deshacer" (5 s) |

## Modo "Marcar agotados" (HU-05)

```
+-----------------------------------------------------+
| ⚠ Modo agotados: toca un producto para cambiar su   |
|   disponibilidad.                     [ Terminar ]  |  <- banner de Aviso fijo
+-----------------------------------------------------+
| +------------+ +------------+ +------------+        |
| | Café solo  | | Cruasán    | | Moca       |        |
| | ● Disponible| | ● Disponible| | ○ AGOTADO |        |  <- texto del estado en
| +------------+ +------------+ +------------+        |     cada botón
```
Toque 1: "Marcar agotados". Toque 2: el producto. Toast "Moca marcada como agotada". Mientras dura el modo, el panel del pedido se bloquea para no añadir productos por error.

## Modo modificar (HU-06)
Igual que P-04 con el título "Modificar pedido #42 · Mesa 7". Las líneas nuevas llevan la insignia "AÑADIDO" y el primario es "Enviar cambios a barra".

## Criterios cubiertos
| Criterio | Cómo |
|---|---|
| HU-02/CA-U01 | Nuevo pedido (P-02), Mesa (P-03), 3 productos, Enviar = 6 toques (flujos §3) |
| HU-02/CA-U06 | Mesas y "Mostrador" en una sola rejilla: 1 toque, sin desplazar con 20 mesas |
| HU-02/CA-U02 | Pestañas siempre visibles, en varias filas si hace falta [1.2c] |
| HU-02/CA-F15 | La primera pestaña (primera categoría del menú) abre activa |
| HU-02/CA-U03 | 120x88 px, nombre + precio |
| HU-02/CA-U04 | Toast de 5 s no bloqueante en P-02 con el número |
| HU-02/CA-U05 | El total se calcula en el cliente para mostrarlo al momento; el servidor manda en el envío (HU-02/CA-N03) |
| HU-02/CA-N05 | Maquetación horizontal y vertical; total y "Enviar a barra" fijos; sin desplazamiento horizontal, también con 20 categorías [1.2c] |
| HU-02/CA-F01 | Mesas 1..20 (supuesto 20) o "Mostrador" con nombre opcional de máx. 30 |
| HU-02/CA-F03 | "+" y "−" de 48 px; a 0 la línea desaparece con "Deshacer" |
| HU-02/CA-F04 | Nota de línea, máx. 100, con contador |
| HU-02/CA-F06 | Producto agotado deshabilitado (`aria-disabled`) |
| HU-02/CA-F08 | "Enviar a barra" deshabilitado sin líneas, con ayuda |
| HU-02/CA-F09 | "Abierta #38" en P-03 + aviso no bloqueante en P-04 |
| HU-02/CA-F11 | "Descartar" con diálogo |
| HU-02/CA-N02 | Error de envío en línea, pedido conservado, reintento con la misma clave |
| HU-05/CA-U02 | Modo agotados: 2 toques |
| HU-05/CA-N03 | Con 20 categorías se mantiene HU-02/CA-N05 (pestañas en varias filas) [1.2c] |
| HU-06/CA-U03, CA-F01 | Modo modificar: líneas nuevas con "AÑADIDO" en texto |
