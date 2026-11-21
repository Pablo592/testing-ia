# P-02 Pedidos: inicio de sala (HU-02, HU-03, HU-04, HU-06)

Pantalla principal de camarero y encargado. Wireframe: tablet de 10" en horizontal (1280x800).

```
+-----------------------------------------------------------------------------------+
| Pedidos                                     Lucía · Camarero   [⎋ Cerrar sesión]  |
|                                   (encargado: [☰ Gestión] antes del nombre)        |
+-----------------------------------------------------------------------------------+
|  [ Abiertos (6) ]  [ Cobrados hoy ]          <- pestañas, 56 px                    |
|                                                         +-----------------------+ |
|                                                         |  + NUEVO PEDIDO       | |  <- único primario
|                                                         +-----------------------+ |     64 px, siempre
|  Listos para servir                                                               |     visible
|  +-----------------------------------------------------------------------------+  |
|  | #42  Mesa 7     10:21   [✓ LISTO]                      7,40 €  [ Cobrar ]   |  |  fila de 72 px
|  +-----------------------------------------------------------------------------+  |
|  En curso                                                                         |
|  +-----------------------------------------------------------------------------+  |
|  | #43  Ana (mostrador) 10:24 [◐ EN PREPARACIÓN]          3,20 €  [ Cobrar ]   |  |
|  | #44  Mesa 3     10:25   [○ PENDIENTE] [⚠ RETRASADO 11 min]   5,90 € [Cobrar] |  |
|  +-----------------------------------------------------------------------------+  |
|  Mesa 7: 2 pedidos abiertos                       [ Cobrar mesa 7 · 15,20 € ]     |  <- secundario
|  | #38  Mesa 7     10:05   [✓ LISTO]  (ya servido, sin cobrar)*  7,80 € [Cobrar] |
|                                                                                   |
+-----------------------------------------------------------------------------------+
| (toast)  Pedido 42 (Mesa 7) está listo                                            |
+-----------------------------------------------------------------------------------+
```
`*` Ver la ambigüedad sobre pedidos listos ya servidos en el apartado "Notas".

Comportamiento:
- Orden: primero "Listos para servir" (lo más urgente para sala) y después "En curso", por hora de envío (el más antiguo primero).
- Los pedidos de una misma mesa se agrupan con un encabezado; si hay 2 o más, aparece "Cobrar mesa N · total" (HU-04).
- Tocar la fila abre P-08 Detalle. "Cobrar" es un objetivo independiente de 56 px separado 16 px del resto de la fila.
- "Cobrados hoy": misma lista con la insignia "€ COBRADO", el método y "Ver ticket". Desde aquí el encargado puede llegar a "Anular cobro" (HU-04).
- Actualización en vivo (<= 2 s) sin recargar; al pasar un pedido a LISTO, toast con `aria-live="polite"`.

## Estados
| Estado | Qué se ve |
|---|---|
| Vacío | "No hay pedidos abiertos." + el primario "Nuevo pedido" sigue arriba |
| Cargando | Esqueleto de 4 filas |
| Error | "No se han podido cargar los pedidos · Reintentar"; si ya había lista, se mantiene con el banner |
| Sin conexión | Banner "Sin conexión. Reintentando…"; "Nuevo pedido" sigue disponible (el pedido en edición no se pierde, HU-02) |
| Éxito | Toasts: "Pedido 42 enviado a barra", "Pedido 42 cobrado" |

## Responsive
- 375 px: filas en 2 líneas (arriba número, mesa y estado; abajo total y "Cobrar"); "Nuevo pedido" como botón fijo inferior a todo el ancho.
- 768 px vertical: como el wireframe, con "Nuevo pedido" fijo abajo a la derecha.
- 1440 px: lista de ancho máximo 1200 px, centrada.

## Criterios cubiertos
| Historia | Criterio | Cómo |
|---|---|---|
| HU-01 | Nombre y rol visibles | Barra superior |
| HU-01 | El camarero no ve gestión | El botón "Gestión" solo existe para el encargado (y el servidor lo valida) |
| HU-02 | "Desde la pantalla principal" | Esta pantalla; "Nuevo pedido" = toque 1 |
| HU-03 | El camarero ve el pedido como "Listo" en su lista | Sección "Listos para servir" + toast |
| HU-04 | Cobro desde el pedido / Cobrar mesa | "Cobrar" en la fila (toque 1); "Cobrar mesa N" |
| HU-04 | Deja de aparecer en abiertos tras cobrar | Pasa a "Cobrados hoy" |

## Notas
- Ninguna historia define qué pasa con un pedido LISTO **ya servido** pero no cobrado (típico en mesa: se sirve y se cobra al final). Sin un estado "Entregado", la sección "Listos para servir" acumula pedidos ya servidos. Reportado al PO. Propuesta: estado opcional "Servido" (1 toque desde la fila) o que "Listos para servir" solo muestre los listos de los últimos X min.
