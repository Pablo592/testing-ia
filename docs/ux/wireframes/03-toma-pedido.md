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
|  ... hasta N (configurado en Ajustes). Botones de 120x88 px; 16 px de separación  |
|  "Abierta" en texto + borde de 2 px (no solo color).                              |
+-----------------------------------------------------------------------------------+
```

## P-04 Toma de pedido: tablet en horizontal (1280x800)

```
+-----------------------------------------------------------------------------------+
| Pedido · Mesa 7  [Cambiar]                  Lucía · Camarero   [⎋ Cerrar sesión]  |
+-----------------------------------------------------------------------------------+
| ⚠ La mesa 7 ya tiene un pedido abierto (#38). Este se enviará como pedido          |  <- Aviso no
|   independiente.                                                          [ × ]    |     bloqueante
+-----------------------------------------------------+-----------------------------+
| [Cafés] [Infusiones] [Zumos] [Bollería] [Tostadas] >|  Pedido · Mesa 7            |
|  ^activa: fondo primario + subrayado 4 px           |                             |
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

## P-04 en vertical (768x1024) y en móvil (375 px)

```
+-------------------------------------------+
| Pedido · Mostrador        Lucía · Camarero|
+-------------------------------------------+
| [Cafés] [Infusiones] [Zumos] [Bollería] > |
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
| Historia | Criterio UX | Cómo |
|---|---|---|
| HU-02 | <= 6 toques para 3 productos | Nuevo pedido (P-02), Mesa (P-03), 3 productos, Enviar = 6 |
| HU-02 | Categoría en 1 toque | Pestañas siempre visibles |
| HU-02 | Producto >= 44x44 con nombre y precio | 120x88 px, nombre + precio |
| HU-02 | Confirmación >= 3 s con número y pantalla lista | Toast de 5 s no bloqueante en P-02 |
| HU-02 | Total actualizado en <= 200 ms | El total se calcula en el cliente para mostrarlo al momento; el servidor manda en el envío |
| HU-02 (no func.) | Tablet en horizontal y vertical | Dos maquetaciones |
| HU-02 | Aviso de mesa con pedido abierto | "Abierta #38" en P-03 + aviso en P-04 |
| HU-05 | Agotado en <= 2 toques | Modo agotados |
| HU-06 | "AÑADIDO" en texto | Insignia en la línea |
