# P-02 Pedidos: inicio de sala (HU-02, HU-03, HU-04, HU-06)

Pantalla principal de camarero y encargado. Wireframe: tablet de 10" en horizontal (1280x800).
Actualizado en la tarea 1.2b: estado "Servido", pedidos cobrados sin servir en la lista activa y vista "Cobrados hoy" (supuestos 18 y 19, HU-02, HU-03, HU-04).

## Pestaña "Pedidos activos"

```
+-----------------------------------------------------------------------------------+
| Pedidos                                     Lucía · Camarero   [⎋ Cerrar sesión]  |
|                                   (encargado: [☰ Gestión] antes del nombre)        |
+-----------------------------------------------------------------------------------+
|  [ Pedidos activos (7) ]  [ Cobrados hoy ]   <- pestañas, 56 px; 1 toque           |
|                                                         +-----------------------+ |
|                                                         |  + NUEVO PEDIDO       | |  <- único primario
|                                                         +-----------------------+ |     64 px, siempre
|  Listos para servir (2)                                                           |     visible
|  +-----------------------------------------------------------------------------+  |
|  | #42  Mesa 7     10:21  [✓ LISTO]                  7,40 €  [✓✓ Servido] [Cobrar] |  fila de 72 px
|  | #41  Ana (mostr.) 10:18 [✓ LISTO] [€ COBRADO]     3,20 €  [✓✓ Servido]          |
|  +-----------------------------------------------------------------------------+  |
|  Resto de pedidos                                                                 |
|  +-----------------------------------------------------------------------------+  |
|  | #43  Pedro (mostr.) 10:24 [◐ EN PREPARACIÓN] [€ COBRADO]   2,80 €              |  |  sin acciones
|  | #44  Mesa 3     10:25  [○ PENDIENTE] [⚠ RETRASADO 11 min]  5,90 €  [Cobrar]   |  |
|  +-----------------------------------------------------------------------------+  |
|  Mesa 7 · 2 pedidos sin cobrar (1 en Listos para servir) [ Cobrar mesa 7 · 15,20 € ] <- secundario
|  | #38  Mesa 7     10:05  [(✓✓ SERVIDO)]                 7,80 €  [Cobrar]       |  <- SERVIDO = insignia
|                                                                                   |     de contorno
+-----------------------------------------------------------------------------------+
| (toast 30 s)  Pedido 40 servido · [↶ Deshacer] 27 s                               |
+-----------------------------------------------------------------------------------+
```

### Qué entra en la lista (HU-02, supuesto 18)
| Preparación \ Cobro | Abierto | Cobrado |
|---|---|---|
| Pendiente / En preparación | "Resto de pedidos", con "Cobrar" | "Resto de pedidos" con "€ COBRADO", sin acciones (solo de hoy) |
| Listo | "Listos para servir", con "Servido" y "Cobrar" | "Listos para servir" con "€ COBRADO" y "Servido" (solo de hoy) |
| Servido | "Resto de pedidos" con insignia SERVIDO y "Cobrar" (hasta cobrarlo o cancelarlo) | **No aparece**: solo en "Cobrados hoy" |

Los pedidos cobrados y no servidos dejan de verse a las 00:00 (`Europe/Madrid`) del día siguiente al envío. Los pedidos con cobro "Abierto" se ven sea cual sea su fecha.

### Comportamiento
- **Orden:** primero "Listos para servir" (lo más urgente para sala) y después "Resto de pedidos", cada sección por hora de envío (el más antiguo primero). HU-02 coloca "Listos para servir" delante.
- **Agrupación por mesa:** si una mesa tiene 2 o más pedidos en la lista, en "Resto de pedidos" se agrupan bajo el encabezado "Mesa N · K pedidos sin cobrar" con "Cobrar mesa N · total" (HU-04, cubre todos los pedidos con cobro Abierto de la mesa). Un pedido de esa mesa que está "Listo" sigue en "Listos para servir" (para no perder la señal de recogida) y el encabezado lo indica: "(1 en Listos para servir)". En "Listos para servir" la fila muestra "Mesa 7", así que se relaciona con su grupo.
- **Fila:** número, mesa o cliente, hora de envío, estado de preparación en texto (insignia), "€ COBRADO" si está cobrado, total con IVA y las acciones de la tabla del design system §5.6. Tocar la fila abre P-08 Detalle. Cada acción es un objetivo de 56 px separado 16 px.
- **"Servido" (1 toque):** solo en filas con preparación Listo. Al pulsarlo, el pedido sale de "Listos para servir" y aparece el toast con acción "Pedido 42 servido · Deshacer (30 s)". Si estaba cobrado, desaparece de la lista; si no, pasa a "Resto de pedidos" con la insignia SERVIDO. Su cobro no cambia.
- **Deshacer "Servido":** en el toast, durante 30 s, solo en el dispositivo y la sesión de quien lo marcó. Lo devuelve a LISTO y a "Listos para servir" en su posición por hora. Solo existe un "Deshacer" a la vez: marcar otro pedido como servido sustituye al anterior. Si el pedido cambia mientras tanto en otro dispositivo (p. ej. se le añaden productos), "Deshacer" falla con el aviso "El pedido 42 ha cambiado: ya no se puede deshacer".
- **Pedido que pasa a LISTO:** entra en "Listos para servir" con el borde resaltado 2 s y el toast "Pedido 42 (Mesa 7) está listo" (5 s, `aria-live="polite"`). Si en ese momento hay un toast de Deshacer, el aviso de listo se apila encima (como máximo 2 toasts) para no quitarle tiempo al Deshacer.
- **Actualización en vivo** (<= 2 s, HU-02) sin recargar. Si una fila cambia de sección mientras el usuario va a tocarla, la lista no se reordena en los 600 ms siguientes a un toque sobre ella (no mover objetivos bajo el dedo).
- **Conflicto (409)** al marcar Servido o cobrar: aviso en línea "El pedido 42 ha cambiado. Se muestra su estado actual." y la fila se actualiza (hallazgo del Software Engineer en `docs/estado.md`).

## Pestaña "Cobrados hoy" (HU-04)

```
+-----------------------------------------------------------------------------------+
| Pedidos                                     Marta · Encargado  [⎋ Cerrar sesión]  |
+-----------------------------------------------------------------------------------+
|  [ Pedidos activos (7) ]  [ Cobrados hoy ]                                        |
|                                                         +-----------------------+ |
|                                                         |  + NUEVO PEDIDO       | |  <- el primario no cambia
|                                                         +-----------------------+ |
|  Cobros de hoy, del más reciente al más antiguo                                   |
|  +-----------------------------------------------------------------------------+  |
|  | 10:41  #33, #35 · Mesa 4    Efectivo   12,60 €  [Ver ticket] [Anular cobro]  |  |  <- "Anular cobro" solo
|  | 10:31  #41 · Ana            Tarjeta     3,20 €  [Ver ticket] [Anular cobro]  |  |     encargado (peligro-
|  | 10:12  #36 · Mesa 2   [⊘ ANULADO]  Tarjeta  ~~6,10 €~~  [Ver ticket]         |  |     contorno)
|  |        Motivo: cobrado en la mesa equivocada · Marta 10:15                   |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```
- Cada fila es un **cobro** (no un pedido): "Cobrar mesa" muestra todos sus números de pedido. Campos: hora del cobro, número(s) de pedido, mesa o cliente, método, importe y "⊘ ANULADO" si se anuló (con el importe tachado y la línea de motivo, quién y cuándo).
- "Ver ticket" abre P-07. "Anular cobro" (solo encargado, en cobros no anulados) abre el diálogo de anulación de `05-cobro.md`. El camarero/cajero no ve el botón (y el servidor responde 403).
- Un pedido cobrado y aún no servido aparece **en las dos pestañas**: aquí como cobro y en "Pedidos activos" con "€ COBRADO", hasta que se marca "Servido".

## Estados
| Estado | Qué se ve |
|---|---|
| Vacío (activos) | "No hay pedidos activos." + el primario "Nuevo pedido" sigue arriba |
| Vacío ("Listos para servir") | La sección no se muestra (no ocupa alto) |
| Vacío (cobrados hoy) | "Todavía no hay cobros hoy." |
| Cargando | Esqueleto de 4 filas |
| Error | "No se han podido cargar los pedidos · Reintentar"; si ya había lista, se mantiene con el banner |
| Sin conexión | Banner "Sin conexión. Reintentando…"; "Nuevo pedido" sigue disponible (el pedido en edición no se pierde, HU-02); "Servido" y "Cobrar" se deshabilitan con el texto "Sin conexión" |
| Marcando servido | Botón "Guardando…" deshabilitado |
| Éxito | Toasts: "Pedido 42 enviado a barra", "Pedido 42 cobrado", "Pedido 42 servido · Deshacer" |

## Responsive
- 375 px: filas en 2 líneas (arriba número, mesa e insignias; abajo total y acciones, "Servido" a la izquierda de "Cobrar"); "Nuevo pedido" como botón fijo inferior a todo el ancho; el toast de Deshacer va encima de ese botón, sin taparlo.
- 768 px vertical: como el wireframe, con "Nuevo pedido" fijo abajo a la derecha. Si las insignias no caben en una línea, bajan a una segunda línea de la fila (la fila crece, no se cortan).
- 1440 px: lista de ancho máximo 1200 px, centrada.

## Criterios cubiertos
| Criterio | Cómo |
|---|---|
| HU-01/CA-U04 | Barra superior con nombre y rol |
| HU-01/CA-F01 | El botón "Gestión" solo existe para el encargado (y el servidor lo valida) |
| HU-02/CA-F16 | Esta pantalla al entrar; "Nuevo pedido" = toque 1 |
| HU-02/CA-F17, CA-F18 | Tabla "Qué entra en la lista" |
| HU-02/CA-F19 | Fila: número, mesa/cliente, hora, estado en texto, "€ COBRADO", total |
| HU-02/CA-F20, CA-F21 | Orden por hora; agrupación por mesa |
| HU-02/CA-F22 | Tocar la fila abre P-08 |
| HU-02/CA-F23 | Actualización en vivo sin recargar |
| HU-03/CA-F15 | "Listos para servir" delante + toast `aria-live` |
| HU-03/CA-U05, CA-F16 | Botón "Servido" en filas LISTO, 1 toque |
| HU-03/CA-F19 | Toast "Deshacer" de 30 s |
| HU-03/CA-F17, CA-F18 | Servido + Abierto sigue; Servido + Cobrado sale |
| HU-03/CA-F20 | "Servido" solo en filas LISTO |
| HU-03/CA-F21 | Cobrado y Listo sin servir: hasta las 00:00 |
| HU-04/CA-U01, CA-F09 | "Cobrar" en la fila (toque 1); "Cobrar mesa N" |
| HU-04/CA-F18 | Insignia "€ COBRADO" en cobrados sin servir |
| HU-04/CA-F19 | Pestaña "Cobrados hoy", del más reciente, con "ANULADO" |
| HU-04/CA-F20 | "Ver ticket" |
| HU-04/CA-F21 | "Anular cobro" solo para el encargado |
| HU-06/CA-N03 | Aviso de conflicto (409) |
