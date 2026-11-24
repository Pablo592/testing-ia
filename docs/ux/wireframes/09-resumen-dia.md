# P-11 Resumen del día (HU-08, Could)

Solo encargado (HU-08/CA-N01). Uso típico: TPV u ordenador (1440 px), también tablet. Wireframe a 1440x900.
Actualizado en la tarea 1.2c: desglose de cancelaciones y anulaciones por usuario (SEC-008, HU-08/CA-F13 y CA-F14) e IDs de criterio.

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

## Cifras y cierre
- Cifras de HU-08/CA-F01 en tarjetas: pedidos cobrados, total, efectivo, tarjeta, y en una segunda fila los pedidos cancelados y los cobros anulados (número e importe). Todos los importes con 2 decimales y "€" en formato es-ES (HU-08/CA-U02).
- Diferencia de caja (HU-08/CA-F04): "Falta 2,50 €" (con "−"), "Sobra 1,00 €" (con "+") o "Cuadra (0,00 €)". El texto lleva el signo y la palabra, así que no depende del color (HU-08/CA-U02).
- "Guardar cierre": diálogo "El cierre no se podrá modificar" [Volver] [Guardar cierre] (HU-08/CA-N03).
- Día cerrado (HU-08/CA-F05): el campo pasa a solo lectura ("Cerrado por Marta a las 23:10"). Los cobros anulados después del cierre se muestran aparte, en la sección "Anulados tras el cierre", sin cambiar las cifras guardadas.
- Selector de fecha (HU-08/CA-F06, CA-F12): calendario con hoy y los 90 días anteriores, ambos incluidos. Los días anteriores salen deshabilitados (`aria-disabled`, texto "Fuera del periodo de consulta"); no se pueden elegir ni escribir.
- Aviso de pedidos sin cobrar (HU-08/CA-F03): "Hay N pedidos sin cobrar · Ver pedidos". El enlace lleva a P-02 "Pedidos activos".

## Desglose por usuario [1.2c] (SEC-008; HU-08/CA-F13, CA-F14)

- **Una fila por combinación** de "Hecho por" (quien canceló el pedido o anuló el cobro) y "Autorizado por" (el encargado que autorizó la cancelación). Los nombres van en texto (HU-08/CA-F13).
- **"Autorizado por"** puede valer:
  - "Sin autorización": cancelación de un pedido "Pendiente", que no la necesita (HU-06/CA-F09). Es el texto literal que pide HU-08/CA-F13.
  - el nombre del encargado que autorizó con su PIN (HU-06/CA-F11);
  - el nombre del propio encargado cuando él mismo canceló desde su sesión (HU-06/CA-F15 lo registra como el que autoriza). Se ve, por ejemplo, "Marta | Marta";
  - "No aplica (encargado)" en las anulaciones de cobro: solo las hace un encargado, que reconfirma su PIN, y nadie más las autoriza (HU-04/CA-N03, CA-F23). **Interpretación pendiente de confirmar por el PO** (ver hallazgos de la tarea 1.2c).
- **Columnas:** "Pedidos cancelados" y "Cobros anulados", cada una con "número · importe". Si la fila no tiene ninguno de los dos, se muestra "—" (con `aria-label="ninguno"`).
- **Fila "Total"** al pie, con los mismos valores que las tarjetas "Pedidos cancelados" y "Cobros anulados" de arriba. Así se comprueba a simple vista lo que pide HU-08/CA-F14 (la suma de las filas coincide con los totales). Si alguna vez no coinciden, es un error del sistema, no un estado de la interfaz: Testing lo verifica.
- **Orden:** de mayor a menor importe (cancelado + anulado), y a igual importe, por nombre. Con 15 empleados como máximo (supuesto 2) la tabla tiene pocas filas: no se pagina.
- **Accesibilidad:** tabla semántica (`<table>`, `<th scope="col">`, `<caption>` "Cancelaciones y anulaciones por usuario del 21/11/2026"). No hay ningún dato que se transmita solo con color.
- **Día cerrado:** la tabla muestra las mismas cifras que las tarjetas del cierre guardado. Las anulaciones posteriores al cierre van en "Anulados tras el cierre", con su "Hecho por". **Pendiente de confirmar por el PO** (ver hallazgos).
- **Sin cancelaciones ni anulaciones:** en lugar de la tabla, "Hoy no hay pedidos cancelados ni cobros anulados." (la sección sigue visible, porque ver que no hay ninguna también es información para el encargado).
- Sin detalle por pedido en el MVP: la fila no se puede tocar (el requisito es el agregado).

## Estados

| Estado | Qué se ve |
|---|---|
| Vacío | "No hubo ventas este día." Las tarjetas muestran 0 y "0,00 €" y el desglose dice que no hubo cancelaciones ni anulaciones |
| Cargando | Esqueleto de las tarjetas y de las dos tablas. Las cifras y el desglose aparecen juntos (HU-08/CA-N02 mide las dos cosas) |
| Error | "No se ha podido cargar el resumen · Reintentar"; si ya había cifras, se mantienen con el banner |
| Guardando cierre | "Guardando…" deshabilitado |
| Éxito | Toast "Cierre guardado" y el campo pasa a solo lectura |
| Sin conexión | Banner "Sin conexión. Reintentando…"; "Guardar cierre" deshabilitado con el texto "Sin conexión"; el efectivo escrito no se pierde |

## Responsive
- 1440 px: como el wireframe (ancho máximo 1200 px, centrado).
- 768 px: tarjetas en 2 columnas; desglose como tabla con desplazamiento horizontal **dentro** de la tabla si no cabe (la página no se desplaza en horizontal).
- 375 px: tarjetas en 1 columna; cada fila del desglose pasa a una tarjeta: "Lucía · autorizado por Marta — Cancelados 1 · 7,80 € — Anulados: ninguno".

## Criterios cubiertos

| Criterio | Cómo |
|---|---|
| HU-08/CA-U01 | "Resumen del día" en el menú de gestión: 1 toque, abre hoy |
| HU-08/CA-U02 | Formato es-ES con 2 decimales y "€"; diferencia con "−" y "Falta" |
| HU-08/CA-F01 | Tarjetas de cifras |
| HU-08/CA-F13 [1.2c] | Tabla "Cancelaciones y anulaciones por usuario", con "Sin autorización" |
| HU-08/CA-F14 [1.2c] | Fila "Total" igual a las tarjetas de cancelados y anulados |
| HU-08/CA-F02 | Tabla de productos vendidos, de mayor a menor importe |
| HU-08/CA-F03 | Aviso "Hay N pedidos sin cobrar · Ver pedidos" |
| HU-08/CA-F04 | Efectivo contado + diferencia + "Guardar cierre" |
| HU-08/CA-F05 | Solo lectura + "Anulados tras el cierre" |
| HU-08/CA-F06, CA-F12 | Selector con hoy y 90 días atrás; los anteriores deshabilitados |
| HU-08/CA-N05 | Tablas semánticas, etiquetas, contraste de tokens (design-system §1.3) |
