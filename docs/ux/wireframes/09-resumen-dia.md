# P-11 Resumen del día (HU-08, Could)

Solo encargado (HU-08/CA-N01). Uso típico: TPV u ordenador (1440 px), también tablet. Wireframe a 1440x900.
Actualizado en la tarea 1.2c: desglose de cancelaciones y anulaciones por usuario (SEC-008, HU-08/CA-F13 y CA-F14) e IDs de criterio.
Actualizado en la tarea 1.7e: las interpretaciones de UX sobre CA-F13 y CA-F05 están confirmadas por el PO (1.7d). La sección aparte de un día cerrado se llama ahora "Cambios tras el cierre" y recoge las cancelaciones y las anulaciones.
Actualizado en la tarea 1.7g: la sección "Cambios tras el cierre" recoge también los cobros registrados ese día después del cierre (HU-08/CA-F15, resuelve H-1.7e-01).

```
+-----------------------------------------------------------------------------------------------+
| Resumen del día                                          Marta · Encargado  [⎋ Cerrar sesión] |
+-----------------------------------------------------------------------------------------------+
| Fecha: [ Hoy, 21/11/2026 ▼ ]  (de hoy a 90 días atrás; los días anteriores no se pueden elegir)|
| ⚠ Hay 3 pedidos sin cobrar · [Ver pedidos]                                                    |
|                                                                                               |
| +--------------+ +--------------+ +--------------+ +--------------+                           |
| | Pedidos      | | Total        | | Efectivo     | | Tarjeta      |                           |
| | cobrados     | | cobrado      | |              | |              |                           |
| |   142        | |  1.284,50 €  | |   612,30 €   | |   672,20 €   |                           |
| +--------------+ +--------------+ +--------------+ +--------------+                           |
| +---------------------------+ +---------------------------+                                   |
| | Pedidos cancelados        | | Cobros anulados           |                                   |
| |   4 · 18,60 €             | |   1 · 7,40 €              |                                   |
| +---------------------------+ +---------------------------+                                   |
|                                                                                               |
| Cierre de caja                                                                                |
| Efectivo contado (obligatorio)  [ 609,80 € ]                                                  |
| Diferencia: −2,50 € · Falta                <- signo + texto, no solo color                    |
|                                                                     [ GUARDAR CIERRE ]        |  <- único primario
|                                                                                               |
| Cancelaciones y anulaciones por usuario  (SEC-008)                                            |
| +-------------------------------------------------------------------------------------------+ |
| | Hecho por   | Autorizado por        | Pedidos cancelados | Cobros anulados                | |
| |-------------+-----------------------+--------------------+--------------------------------| |
| | Lucía       | Sin autorización      | 2 · 6,40 €         | —                              | |
| | Lucía       | Marta                 | 1 · 7,80 €         | —                              | |
| | Pedro       | Marta                 | 1 · 4,40 €         | —                              | |
| | Marta       | No aplica (encargado) | —                  | 1 · 7,40 €                     | |
| |-------------+-----------------------+--------------------+--------------------------------| |
| | Total       |                       | 4 · 18,60 €        | 1 · 7,40 €                     | |  <- = tarjetas de arriba
| +-------------------------------------------------------------------------------------------+ |
|                                                                                               |
| Productos vendidos (de mayor a menor importe)                                                 |
| Producto           Unidades   Importe                                                         |
| Café con leche        210     336,00 €                                                        |
| ...                                                                                           |
+-----------------------------------------------------------------------------------------------+
```

### Día cerrado [1.7e, 1.7g] (HU-08/CA-F05, CA-F13, CA-F15)

Mismo día consultado después de guardar el cierre. Solo cambia lo que se ve aquí; el resto de la pantalla es igual.

```
+-----------------------------------------------------------------------------------------------+
| Resumen del día                                          Marta · Encargado  [⎋ Cerrar sesión] |
+-----------------------------------------------------------------------------------------------+
| Fecha: [ 20/11/2026 ▼ ]                                                                       |
|                                                                                               |
| (tarjetas con las cifras del cierre guardado, como arriba)                                    |
|                                                                                               |
| Cierre de caja                                                                                |
| Cerrado por Marta a las 23:10 · Efectivo contado 609,80 € · Diferencia: −2,50 € · Falta       |
|                                                    <- solo lectura, sin "Guardar cierre"      |
|                                                                                               |
| Cancelaciones y anulaciones por usuario  (SEC-008)  <- mismas filas que el cierre guardado    |
| (tabla como arriba, con la fila "Total" igual a las tarjetas del cierre)                      |
|                                                                                               |
| Cambios tras el cierre  (no cambian las cifras del cierre)                                    |
| +-----------------------------------------------------------------------------------+         |
| | Hecho por | Autorizado por        | Cobros tras   | Pedidos       | Cobros        |         |
| |           |                       | el cierre     | cancelados    | anulados      |         |
| |-----------+-----------------------+---------------+---------------+---------------|         |
| | Marta     | No aplica (encargado) | —             | —             | 2 · 19,80 €   |         |
| | Lucía     | Sin autorización      | 2 · 18,40 €   | —             | —             |         |
| | Pedro     | Sin autorización      | 1 · 4,50 €    | 1 · 3,20 €    | —             |         |
| | Lucía     | Marta                 | —             | 1 · 5,60 €    | —             |         |
| |-----------+-----------------------+---------------+---------------+---------------|         |
| | Total     |                       | 3 · 22,90 €   | 2 · 8,80 €    | 2 · 19,80 €   |         |
| +-----------------------------------------------------------------------------------+         |
|                                                                                               |
| Productos vendidos (del cierre guardado)                                                      |
| ...                                                                                           |
+-----------------------------------------------------------------------------------------------+
```

Ejemplo de los datos [1.7g]: tras el cierre de las 23:10, Lucía registró 3 cobros (25,30 €) y Pedro 1 (4,50 €); después, Marta anuló uno de los cobros de Lucía (6,90 €) y otro cobro que ya estaba en el cierre (12,90 €). El cobro anulado de Lucía deja de contar en sus "Cobros tras el cierre" (queda 2 · 18,40 €) y suma en los "Cobros anulados" de la fila de Marta (2 · 19,80 €) (HU-08/CA-F15 d). Ninguna de estas cifras cambia las tarjetas, la diferencia de caja ni el desglose del cierre.

## Cifras y cierre
- Cifras de HU-08/CA-F01 en tarjetas: pedidos cobrados, total, efectivo, tarjeta, y en una segunda fila los pedidos cancelados y los cobros anulados (número e importe). Todos los importes con 2 decimales y "€" en formato es-ES (HU-08/CA-U02).
- Diferencia de caja (HU-08/CA-F04): "Falta 2,50 €" (con "−"), "Sobra 1,00 €" (con "+") o "Cuadra (0,00 €)". El texto lleva el signo y la palabra, así que no depende del color (HU-08/CA-U02).
- "Guardar cierre": diálogo "El cierre no se podrá modificar" [Volver] [Guardar cierre] (HU-08/CA-N03).
- Día cerrado (HU-08/CA-F05): el campo pasa a solo lectura ("Cerrado por Marta a las 23:10"). Los cobros anulados, los pedidos cancelados **y los cobros registrados** después del cierre se muestran aparte, en la sección "Cambios tras el cierre", sin cambiar las cifras guardadas (ver "Cambios tras el cierre" más abajo).
- Selector de fecha (HU-08/CA-F06, CA-F12): calendario con hoy y los 90 días anteriores, ambos incluidos. Los días anteriores salen deshabilitados (`aria-disabled`, texto "Fuera del periodo de consulta"); no se pueden elegir ni escribir.
- Aviso de pedidos sin cobrar (HU-08/CA-F03): "Hay N pedidos sin cobrar · Ver pedidos". El enlace lleva a P-02 "Pedidos activos".

## Desglose por usuario [1.2c] (SEC-008; HU-08/CA-F13, CA-F14)

- **Una fila por combinación** de "Hecho por" (quien canceló el pedido o anuló el cobro) y "Autorizado por" (el encargado que autorizó la cancelación). Los nombres van en texto (HU-08/CA-F13).
- **"Autorizado por"** puede valer:
  - "Sin autorización": cancelación de un pedido "Pendiente", que no la necesita (HU-06/CA-F09). Es el texto literal que pide HU-08/CA-F13.
  - el nombre del encargado que autorizó con su PIN (HU-06/CA-F11);
  - el nombre del propio encargado cuando él mismo canceló desde su sesión (HU-06/CA-F15 lo registra como el que autoriza). Se ve, por ejemplo, "Marta | Marta";
  - "No aplica (encargado)" en las anulaciones de cobro: solo las hace un encargado, que reconfirma su PIN, y nadie más las autoriza (HU-04/CA-N03, CA-F23). Confirmado por el PO en HU-08/CA-F13 (tarea 1.7d).
- **Columnas:** "Pedidos cancelados" y "Cobros anulados", cada una con "número · importe". Si la fila no tiene ninguno de los dos, se muestra "—" (con `aria-label="ninguno"`).
- **Fila "Total"** al pie, con los mismos valores que las tarjetas "Pedidos cancelados" y "Cobros anulados" de arriba. Así se comprueba a simple vista lo que pide HU-08/CA-F14 (la suma de las filas coincide con los totales). Si alguna vez no coinciden, es un error del sistema, no un estado de la interfaz: Testing lo verifica.
- **Orden:** de mayor a menor importe (cancelado + anulado), y a igual importe, por nombre. Con 15 empleados como máximo (supuesto 2) la tabla tiene pocas filas: no se pagina.
- **Accesibilidad:** tabla semántica (`<table>`, `<th scope="col">`, `<caption>` "Cancelaciones y anulaciones por usuario del 21/11/2026"). No hay ningún dato que se transmita solo con color.
- **Día cerrado:** la tabla incluye las mismas cancelaciones y anulaciones que las cifras del cierre guardado, y su fila "Total" sigue igual a las tarjetas del cierre (HU-08/CA-F13, CA-F14). Lo cancelado o anulado después del cierre no suma aquí: va en "Cambios tras el cierre". Confirmado por el PO en HU-08/CA-F13 y CA-F05 (tarea 1.7d).
- **Sin cancelaciones ni anulaciones:** en lugar de la tabla, "Hoy no hay pedidos cancelados ni cobros anulados." (la sección sigue visible, porque ver que no hay ninguna también es información para el encargado).
- Sin detalle por pedido en el MVP: la fila no se puede tocar (el requisito es el agregado).

## Cambios tras el cierre [1.7e, 1.7g] (HU-08/CA-F05, CA-F13, CA-F15)

- **Cuándo se ve:** solo en un día cerrado. Va debajo del desglose por usuario y antes de "Productos vendidos". En un día sin cerrar no existe.
- **Qué recoge:** los pedidos de ese día cancelados después de guardar el cierre, los cobros de ese día anulados después del cierre (HU-08/CA-F05) y los cobros registrados ese día después del cierre, sean de un pedido de ese día o de un día anterior (HU-08/CA-F15 a, c). Ninguno cambia las tarjetas, el efectivo esperado, la diferencia de caja, el desglose ni "Productos vendidos", que siguen siendo los del cierre guardado (HU-08/CA-F15 b).
- **Qué no recoge:** un cobro de un pedido de ese día registrado en un día posterior. Cuenta en el resumen del día en que se registra (HU-08/CA-F08) y no aparece en esta sección (HU-08/CA-F15).
- **Columnas:** las mismas que el desglose por usuario, para usar un solo componente de tabla y que se lea igual:
  - "Hecho por": el usuario que registró el cobro, canceló el pedido o anuló el cobro.
  - "Autorizado por": en las cancelaciones, el encargado que autorizó, el propio encargado si canceló desde su sesión, o "Sin autorización" si no la necesitó (HU-06/CA-F09, CA-F11, CA-F15). En las anulaciones, "No aplica (encargado)" (HU-08/CA-F13). En los cobros, "Sin autorización", porque cobrar no la necesita (HU-08/CA-F15 c).
  - "Cobros tras el cierre" [1.7g], "Pedidos cancelados" y "Cobros anulados": "número · importe", o "—" (con `aria-label="ninguno"`). "Cobros tras el cierre" va la primera de las tres porque es lo que entra en caja; las otras dos mantienen el orden del desglose.
  - Como un cobro y una cancelación sin autorización comparten la combinación de "Hecho por" y "Autorizado por", pueden ir en la misma fila (Pedro en el wireframe).
- **Cobro tras el cierre que luego se anula** [1.7g] (HU-08/CA-F15 d, CA-F09): deja de contar en "Cobros tras el cierre" de la fila de quien lo registró y pasa a "Cobros anulados" de la fila del encargado que lo anuló ("No aplica (encargado)"). No cuenta dos veces: la fila "Total" lo incluye solo en "Cobros anulados". En pantalla no se distingue si el cobro anulado estaba en el cierre o se registró después: el agregado es lo que pide el criterio.
- **Fila "Total"** al pie, con la suma de las filas de esta sección en cada una de las tres columnas, incluida "Cobros tras el cierre" [1.7g]. No hay tarjetas con las que compararla: el total es solo de lo ocurrido tras el cierre.
- **Orden y agrupación:** como en el desglose (una fila por combinación de "Hecho por" y "Autorizado por", de mayor a menor importe sumando las tres columnas, y a igual importe, por nombre).
- **Título y aviso:** "Cambios tras el cierre" con el subtítulo "No cambian las cifras del cierre". El aviso va en texto, no solo con color ni con un icono (WCAG 1.4.1). El subtítulo usa el estilo Aviso del design system (§1, fg `#78350f` sobre bg `#fef3c7`, contraste 8,15:1; §5.10), no el de error: no hay token nuevo.
- **Sin cambios tras el cierre:** la sección se mantiene con el texto "No ha habido cobros, cancelaciones ni anulaciones tras el cierre." [1.7g] Así el encargado sabe que lo ha comprobado y que no falta nada.
- **Accesibilidad:** `<table>` con `<caption>` "Cambios tras el cierre del 20/11/2026" y `<th scope="col">`, igual que el desglose. Encabezado de sección `<h2>` para poder saltar a ella con el lector de pantalla.
- **Responsive:** el mismo que el desglose; a 375 px, ver el wireframe "Cambios tras el cierre a 375 px" en "Responsive". A 768 px la tabla tiene 5 columnas y se desplaza en horizontal dentro de la tabla si no cabe, con la columna "Hecho por" fija (`position: sticky`) para no perder de quién es cada cifra.

## Estados

| Estado | Qué se ve |
|---|---|
| Vacío | "No hubo ventas este día." Las tarjetas muestran 0 y "0,00 €" y el desglose dice que no hubo cancelaciones ni anulaciones |
| Cargando | Esqueleto de las tarjetas y de las tablas (en un día cerrado, también la de "Cambios tras el cierre"). Las cifras y el desglose aparecen juntos (HU-08/CA-N02 mide las dos cosas) |
| Error | "No se ha podido cargar el resumen · Reintentar"; si ya había cifras, se mantienen con el banner |
| Guardando cierre | "Guardando…" deshabilitado |
| Éxito | Toast "Cierre guardado" y el campo pasa a solo lectura; aparece "Cambios tras el cierre" con el texto "No ha habido cobros, cancelaciones ni anulaciones tras el cierre." |
| Sin conexión | Banner "Sin conexión. Reintentando…"; "Guardar cierre" deshabilitado con el texto "Sin conexión"; el efectivo escrito no se pierde |

## Responsive
- 1440 px: como el wireframe (ancho máximo 1200 px, centrado).
- 768 px: tarjetas en 2 columnas; desglose como tabla con desplazamiento horizontal **dentro** de la tabla si no cabe (la página no se desplaza en horizontal).
- 375 px: tarjetas en 1 columna; cada fila del desglose pasa a una tarjeta: "Lucía · autorizado por Marta — Cancelados 1 · 7,80 € — Anulados: ninguno". Las filas de "Cambios tras el cierre" siguen el mismo formato, con tres cifras (ver el wireframe siguiente).

### Cambios tras el cierre a 375 px [1.7g] (HU-08/CA-F05, CA-F15)

Cada fila es una tarjeta (`<li>` de una lista con `aria-labelledby` al `<h2>`; ya no es una `<table>`). Las tres cifras van siempre, en el mismo orden, con "ninguno" en texto cuando no hay; así no hace falta desplazarse en horizontal (WCAG 1.4.10) ni adivinar qué falta. Objetivos sin interacción: las tarjetas no se tocan.

```
+-------------------------------------+
| Cambios tras el cierre              |
| [No cambian las cifras del cierre]  |  <- estilo Aviso (§5.10)
|                                     |
| +---------------------------------+ |
| | Marta · No aplica (encargado)   | |
| | Cobros tras el cierre: ninguno  | |
| | Cancelados: ninguno             | |
| | Anulados: 2 · 19,80 €           | |
| +---------------------------------+ |
| +---------------------------------+ |
| | Lucía · Sin autorización        | |
| | Cobros tras el cierre:          | |
| |   2 · 18,40 €                   | |
| | Cancelados: ninguno             | |
| | Anulados: ninguno               | |
| +---------------------------------+ |
| +---------------------------------+ |
| | Pedro · Sin autorización        | |
| | Cobros tras el cierre:          | |
| |   1 · 4,50 €                    | |
| | Cancelados: 1 · 3,20 €          | |
| | Anulados: ninguno               | |
| +---------------------------------+ |
| +---------------------------------+ |
| | Lucía · autorizado por Marta    | |
| | Cobros tras el cierre: ninguno  | |
| | Cancelados: 1 · 5,60 €          | |
| | Anulados: ninguno               | |
| +---------------------------------+ |
|                                     |
| Total                               |  <- separador `--color-border`, negrita
| Cobros tras el cierre: 3 · 22,90 €  |
| Cancelados: 2 · 8,80 €              |
| Anulados: 2 · 19,80 €               |
+-------------------------------------+
```

- El texto de cada etiqueta es completo ("Cobros tras el cierre", no una abreviatura), para que se lea igual que en la tabla de 1440 px. Si no cabe en una línea, la cifra baja a la siguiente (como en Lucía y Pedro) en vez de cortarse.
- Sin cambios tras el cierre: solo el título, el aviso y "No ha habido cobros, cancelaciones ni anulaciones tras el cierre.".
- Tipografía y espaciado con los tokens del desglose (cuerpo 16 px, separación entre tarjetas `--space-1` de 8 px, relleno `--space-2` de 16 px): no hay tokens nuevos. El "Total" se separa con `--color-border` y va en negrita, sin color propio.

## Criterios cubiertos

| Criterio | Cómo |
|---|---|
| HU-08/CA-U01 | "Resumen del día" en el menú de gestión: 1 toque, abre hoy |
| HU-08/CA-U02 | Formato es-ES con 2 decimales y "€"; diferencia con "−" y "Falta" |
| HU-08/CA-F01 | Tarjetas de cifras |
| HU-08/CA-F13 [1.2c, 1.7e] | Tabla "Cancelaciones y anulaciones por usuario", con "Sin autorización" y "No aplica (encargado)"; en un día cerrado, las del cierre guardado |
| HU-08/CA-F14 [1.2c] | Fila "Total" igual a las tarjetas de cancelados y anulados |
| HU-08/CA-F02 | Tabla de productos vendidos, de mayor a menor importe |
| HU-08/CA-F03 | Aviso "Hay N pedidos sin cobrar · Ver pedidos" |
| HU-08/CA-F04 | Efectivo contado + diferencia + "Guardar cierre" |
| HU-08/CA-F05 [1.7e, 1.7g] | Solo lectura + sección "Cambios tras el cierre" con cobros, cancelaciones y anulaciones posteriores |
| HU-08/CA-F07 [1.7g] | Las tarjetas son las del cierre guardado (cobros hasta la hora del cierre y vigentes al guardarlo); lo posterior se ve solo en "Cambios tras el cierre" |
| HU-08/CA-F15 [1.7g] | Columna "Cobros tras el cierre" (número · importe o "—") con "Sin autorización" e incluida en la fila "Total"; si se anula, pasa a "Cobros anulados" de la sección; no cambia tarjetas, caja, desglose ni productos; texto vacío con los cobros; versión de 375 px |
| HU-08/CA-F06, CA-F12 | Selector con hoy y 90 días atrás; los anteriores deshabilitados |
| HU-08/CA-N05 | Tablas semánticas, etiquetas, contraste de tokens (design-system §1.3) |
