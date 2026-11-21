# P-06 Cobro y P-07 Ticket (HU-04)

## P-06 Cobro: tablet en horizontal (1280x800)

### Paso 2a: método Tarjeta elegido (toque 2 de 3)

```
+-----------------------------------------------------------------------------------+
| Cobrar pedido #42 · Mesa 7                  Lucía · Camarero   [⎋ Cerrar sesión]  |
+-----------------------------------------------------------------------------------+
| [< Volver]                                                                         |
+-----------------------------------------+-----------------------------------------+
|  Detalle                                |  Método de pago                         |
|  2 × Café con leche     1,60   3,20 €   |  +-----------------+ +-----------------+|
|      Nota: leche de avena               |  |  💶 EFECTIVO     | |  💳 TARJETA  ✓  ||  <- 88 px; el elegido
|  1 × Cruasán            1,80   1,80 €   |  +-----------------+ +-----------------+|     con borde 4 px +
|  1 × Zumo naranja       2,40   2,40 €   |                                         |     "✓" + aria-pressed
|  -------------------------------------  |  ⓘ Confirma solo cuando el datáfono     |
|  TOTAL (IVA incluido)          7,40 €   |    haya aprobado el pago.               |
|                          (text-3xl)     |                                         |
|                                         |  +-------------------------------------+|
|                                         |  | ✓ CONFIRMAR COBRO CON TARJETA ·     ||  <- único primario (exito)
|                                         |  |   7,40 €                            ||     64 px; total y método
|                                         |  +-------------------------------------+|     en la propia etiqueta
+-----------------------------------------+-----------------------------------------+
```
Antes de elegir un método, el botón está deshabilitado con el texto "Elige un método de pago".

### Paso 2b: Efectivo (toques 2-4)

```
+-----------------------------------------+-----------------------------------------+
|  (detalle igual)                        |  [💶 EFECTIVO ✓]   [💳 TARJETA]          |
|                                         |                                         |
|  TOTAL (IVA incluido)          7,40 €   |  Importe entregado                      |
|                                         |  +-------------------------------------+|
|                                         |  |                          10,00 €    ||  campo con etiqueta
|                                         |  +-------------------------------------+|
|                                         |  [Exacto] [ 5 € ] [10 € ✓] [20 €] [50 €]|  <- 64 px, toque 3
|                                         |  +-----+ +-----+ +-----+                |
|                                         |  |  1  | |  2  | |  3  |  teclado de    |
|                                         |  |  4  | |  5  | |  6  |  importe con   |
|                                         |  |  7  | |  8  | |  9  |  coma decimal  |
|                                         |  |  ,  | |  0  | | ⌫   |  (64x64)       |
|                                         |  +-----+ +-----+ +-----+                |
|                                         |                                         |
|                                         |  CAMBIO A DEVOLVER                      |
|                                         |  2,60 €                (40 px, 800)     |  <- >= 32 px
|                                         |  +-------------------------------------+|
|                                         |  | ✓ CONFIRMAR COBRO EN EFECTIVO ·     ||  <- toque 4
|                                         |  |   7,40 €                            ||
|                                         |  +-------------------------------------+|
+-----------------------------------------+-----------------------------------------+
```
Importe insuficiente: en lugar del cambio, bloque de error "⚠ Importe insuficiente: faltan 2,40 €" y el botón deshabilitado.
Las teclas rápidas menores que el total (p. ej. 5 € con un total de 7,40 €) **se deshabilitan pero no se ocultan**: las teclas no cambian de sitio y se evita el error. "Exacto" siempre está activa.

### Cobrar mesa
Igual, con el título "Cobrar mesa 7 · 2 pedidos", el detalle agrupado por pedido ("Pedido #38", "Pedido #42") y un único TOTAL.

## Estados
| Estado | Qué se ve |
|---|---|
| Cargando detalle | Esqueleto de líneas; métodos deshabilitados |
| Cobrando | Botón "Cobrando…" deshabilitado, con indicador; no admite un segundo toque (HU-04 integridad) |
| Error | "⚠ No se ha podido registrar el cobro. No se ha cobrado nada. · Reintentar" (el reintento no duplica) |
| Pedido ya cobrado (en otro dispositivo) | Bloque de Aviso: "Este pedido ya se cobró a las 10:31 (Pedro)" + "Ver ticket"; no se puede confirmar |
| Éxito | Vuelta a P-02 con el toast "Pedido 42 cobrado · Ver ticket". [1.2b] Si el pedido aún no está "Servido", sigue en "Pedidos activos" con "€ COBRADO" (sin "Cobrar"); si ya estaba servido, sale de la lista. En los dos casos aparece en "Cobrados hoy" |
| Responsive 375/768 vertical | Una columna: total arriba (fijo), métodos, importe y botón fijo abajo; el detalle se pliega ("Ver 3 líneas") |

## P-07 Ticket en pantalla

```
+--------------------------------------------+
| Ticket · Pedido #42                [Cerrar]|
|--------------------------------------------|
| 21/11/2026 10:31 · Mesa 7                  |
| Atendido por: Lucía                        |
| 2 × Café con leche              3,20 €     |
| 1 × Cruasán                     1,80 €     |
| 1 × Zumo naranja                2,40 €     |
| ------------------------------------------ |
| TOTAL (IVA incluido)            7,40 €     |
| Pagado con: Efectivo · entregado 10,00 €   |
|             cambio 2,60 €                  |
| [€ COBRADO]  (o [⊘ ANULADO] + motivo)      |
|                                            |
| Solo encargado:  [Anular cobro] (peligro-  |
|                  contorno)                 |
+--------------------------------------------+
```
"Ticket no fiscal" en texto pequeño mientras la pregunta 1 del README siga abierta.

**Anular cobro (encargado)** [actualizado 1.2b], desde P-07 o desde "Cobrados hoy" (P-02):

```
+--------------------------------------------------+
| ¿Anular el cobro de las 10:41?                   |
| Efectivo · 12,60 €                               |  <- importe del cobro
|                                                  |
| Estos pedidos volverán a "sin cobrar":           |  <- HU-04: lista antes de confirmar
|  · Pedido #33 · Mesa 4                           |
|  · Pedido #35 · Mesa 4                           |
| Se anula el cobro entero: no se puede anular     |
| solo un pedido.                                  |
|                                                  |
| Motivo (obligatorio, mínimo 5 caracteres)        |
| [ cobrado en la mesa equivocada        ] 31/100  |
|                                                  |
| [Volver]                     [ ANULAR COBRO ]    |  <- peligro; deshabilitado
+--------------------------------------------------+     hasta 5 caracteres
```
Con menos de 5 caracteres y al intentar confirmar (Enter): "⚠ El motivo debe tener al menos 5 caracteres" bajo el campo. Tras anular: toast "Cobro anulado: 2 pedidos vuelven a sin cobrar"; la fila de "Cobrados hoy" y el ticket muestran "⊘ ANULADO" con el importe tachado y el motivo, y los pedidos reaparecen en "Pedidos activos" con "Cobrar". Un cobro ya anulado no muestra "Anular cobro".

## Criterios cubiertos
| Historia | Criterio UX | Cómo |
|---|---|---|
| HU-04 | Tarjeta en <= 3 toques | Cobrar (P-02/P-08), Tarjeta, Confirmar |
| HU-04 | Efectivo en <= 4 toques + importe; botones rápidos | Cobrar, Efectivo, tecla rápida, Confirmar; Exacto/5/10/20/50 |
| HU-04 | Cambio >= 32 px | 40 px |
| HU-04 | Total y método visibles antes de confirmar | En la etiqueta del botón + selección marcada |
| HU-04 | Mensaje "Pedido N cobrado" | Toast |
| HU-04 | Importe insuficiente | Mensaje con lo que falta |
| HU-04 | Ver ticket / anular con motivo | P-07 y "Cobrados hoy" |
| HU-04 | Antes de anular: pedidos que vuelven a "Abierto" e importe | Diálogo de anulación [1.2b] |
| HU-04 | Cobrado sin servir sigue en "Pedidos" con COBRADO | Estado "Éxito" [1.2b] |
