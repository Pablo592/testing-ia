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

### Paso 2b: Efectivo (toques 2-4) [reorganizado en 1.2c]

[1.2c] HU-04/CA-U04 (ronda 1.1d, T-08) exige que el total, el método y "Confirmar" se vean **sin desplazar**, también en el TPV de 1024x768 (I-05 de Testing). La versión 1.2b apilaba en vertical el campo, las teclas rápidas, el teclado, el cambio y el botón (unos 900 px de alto) y no cabía ni en 1280x800. Ahora las teclas rápidas van en columna junto al teclado, y el importe y el cambio comparten fila. "Volver" pasa a la barra superior (flecha junto al título).

```
+-----------------------------------------------------------------------------------+
| [<] Cobrar pedido #42 · Mesa 7              Lucía · Camarero   [⎋ Cerrar sesión]  |  64
+-----------------------------------------+-----------------------------------------+
|  (detalle igual)                        |  [💶 EFECTIVO ✓]   [💳 TARJETA]          |  88
|                                         |                                         |
|  TOTAL (IVA incluido)          7,40 €   |  Importe entregado   | CAMBIO A DEVOLVER |  80
|                                         |  [        10,00 € ]  | 2,60 €  (40 px)   |
|                                         |                                         |
|                                         |  +-----+-----+-----+  [ Exacto ]        |
|                                         |  |  1  |  2  |  3  |  [  5 €   ]        |  280: teclado 4 x 64
|                                         |  |  4  |  5  |  6  |  [ 10 € ✓ ]        |  y 5 teclas rápidas
|                                         |  |  7  |  8  |  9  |  [  20 €  ]        |  de 48 px (toque 3)
|                                         |  |  ,  |  0  |  ⌫  |  [  50 €  ]        |
|                                         |  +-----+-----+-----+                    |
|                                         |  +-------------------------------------+|
|                                         |  | ✓ CONFIRMAR COBRO EN EFECTIVO ·     ||  64, toque 4
|                                         |  |   7,40 €                            ||
|                                         |  +-------------------------------------+|
+-----------------------------------------+-----------------------------------------+
```
Presupuesto de alto: barra 64 + márgenes 32 + métodos 88 + importe/cambio 80 + teclado 280 + botón 64 + 3 separaciones de 16 = **656 px** (cabe en 768 y en 800). Ancho de la columna derecha en 1024 px: unos 480 px útiles (teclado 208 + 16 + teclas rápidas 160).

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
| Responsive 800x1280 / 768 vertical y 375 px | Una columna: total arriba (fijo), métodos, importe y cambio, teclado y teclas rápidas, y botón fijo abajo; el detalle se pliega ("Ver 3 líneas"). El botón fijo lleva método y total en su etiqueta, así que HU-04/CA-U04 se cumple sin desplazar [1.2c] |

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
"Ticket no fiscal" en texto pequeño, siempre [1.2c]: la pregunta 1 se cerró sin ticket fiscal (el local usa otra caja o TPV fiscal).

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
| Confirma con tu PIN (SEC-007)                    |  <- reconfirmación aunque la
| PIN de Marta (6 dígitos)   ● ● ● ○ ○ ○           |     sesión sea de encargado
| [teclado numérico de 72 px]                      |
| (zona de mensaje)                                |
|                                                  |
| [Volver]           [ CONFIRMAR Y ANULAR COBRO ]  |  <- peligro; deshabilitado
+--------------------------------------------------+     hasta 5 caracteres y 6 dígitos
```
Con menos de 5 caracteres y al intentar confirmar (Enter): "⚠ El motivo debe tener al menos 5 caracteres" bajo el campo.

**Reconfirmación del PIN [1.2b] (SEC-007, `docs/seguridad.md` §6.3):** anular un cobro exige el PIN del encargado que actúa, aunque la sesión ya sea suya, con la variante "Reconfirmación" del design system §5.10b (nombre fijo, sin selector). Va en el mismo diálogo, debajo del motivo, para no añadir un segundo diálogo. Un PIN incorrecto no anula nada, cuenta para el bloqueo del encargado y conserva el motivo escrito. Mensajes de error y bloqueo (PIN incorrecto, bloqueo de 5/15/60 min, bloqueo indefinido, demasiados intentos desde este dispositivo, sin conexión): tabla de §5.10b. [1.2c] Si la cuenta de Marta está en **bloqueo temporal** (por fallos aquí o al iniciar sesión en otro dispositivo), el diálogo muestra junto al PIN "🔒 Cuenta bloqueada. Espera 5 min.", no anula nada y **conserva el motivo** (HU-01/CA-F12, HU-04/CA-F23). Si llega al **bloqueo indefinido**, se pierde el motivo y el dispositivo vuelve a P-01 con "Cuenta bloqueada. Pide al encargado que la desbloquee." (HU-01/CA-F13). En 1024x768 el diálogo se desplaza por dentro y el pie con los botones queda fijo. Tras anular: toast "Cobro anulado: 2 pedidos vuelven a sin cobrar"; la fila de "Cobrados hoy" y el ticket muestran "⊘ ANULADO" con el importe tachado y el motivo, y los pedidos reaparecen en "Pedidos activos" con "Cobrar". Un cobro ya anulado no muestra "Anular cobro".

## Criterios cubiertos
| Criterio | Cómo |
|---|---|
| HU-04/CA-U01 | Cobrar (P-02/P-08), Tarjeta, Confirmar = 3 toques |
| HU-04/CA-U02 | Cobrar, Efectivo, tecla rápida, Confirmar = 4 toques; Exacto/5/10/20/50 |
| HU-04/CA-U03 | Cambio a 40 px |
| HU-04/CA-U04 | Total y método en la etiqueta del botón y en la selección marcada, sin desplazar en 1024x768, 1280x800 y 800x1280 [1.2c]; toast "Pedido N cobrado" |
| HU-04/CA-F03, CA-F04 | Cambio calculado; "Importe insuficiente: faltan X,XX €" con el botón deshabilitado |
| HU-04/CA-F05 | Aviso "Confirma solo cuando el datáfono haya aprobado el pago" |
| HU-04/CA-F09 | "Cobrar mesa N · K pedidos" con un único total |
| HU-04/CA-F10, CA-F20 | P-07 Ticket ("Ticket no fiscal") |
| HU-04/CA-F02 | "Pedido ya cobrado" sin confirmar |
| HU-04/CA-N01 | "Cobrando…" deshabilitado; reintento sin duplicar |
| HU-04/CA-F18 | Estado "Éxito": cobrado sin servir sigue con "€ COBRADO" |
| HU-04/CA-F11 | "El motivo debe tener al menos 5 caracteres" |
| HU-04/CA-F12, CA-F13, CA-U05 | Diálogo de anulación con los pedidos que vuelven a "Abierto" e importe; solo el cobro entero |
| HU-04/CA-F17 | Un cobro anulado no muestra "Anular cobro" |
| HU-04/CA-F23 | Reconfirmación del PIN en el diálogo; con cuenta bloqueada, HU-01/CA-F12 y CA-F13 [1.2c] |
