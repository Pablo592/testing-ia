# P-05 Cola de barra/cocina (HU-03, HU-06)

Pantalla táctil fija, horizontal, 1920x1080, zoom 100 %. Rol barra (o encargado). **Sin importes.**

## Maquetación (rejilla 3x2, 6 tarjetas sin desplazar)

```
+------------------------------------------------------------------------------------------------------------+
| Cola · 7   ● Conectado  [🔊 Sonido: activado] | Pedido 39 listo [↶ DESHACER 27 s] | +1 [▼ Ver siguientes] |  80 px
|                                                                          Javi · Barra   [⎋ Cerrar sesión]  |
+------------------------------------------------------------------------------------------------------------+
|+---------------------------------+  +---------------------------------+  +---------------------------------+|
||⚠ RETRASADO · 12 min (dashed 6px)|  |                                 |  |✎ MODIFICADO                     ||
||#40   MESA 7          10:12      |  |#41   ANA (mostr.)    10:18      |  |#42   MESA 3          10:21      ||  text-bar-title 40
||[◐ EN PREPARACIÓN]   ⏱ 12 min    |  |[○ PENDIENTE]         ⏱ 6 min    |  |[○ PENDIENTE]         ⏱ 3 min    ||  text-bar-meta 24
||                                 |  |                                 |  |                                 ||
||2  Café con leche                |  |1  Capuchino                     |  |1  Tostada tomate                || text-bar-item 36
||   Nota: leche de avena          |  |1  Cruasán                       |  |~~1  Zumo naranja~~  ELIMINADO   || nota 24, cursiva
||1  Tostada tomate                |  |                                 |  |1  Café solo         AÑADIDO     ||
||                                 |  |                                 |  |                                 ||
||+-------------------------------+|  |+-------------------------------+|  |+-------------------------------+||
|||        ✓ MARCAR LISTO         ||  ||          ▶ EMPEZAR            ||  |||        ✓ ENTENDIDO            |||  72 px, ancho total
||+-------------------------------+|  |+-------------------------------+|  |+-------------------------------+||
|+---------------------------------+  +---------------------------------+  +---------------------------------+|
|+---------------------------------+  +---------------------------------+  +---------------------------------+|
||✕ CANCELADO                      |  |#44   MESA 1          10:23      |  |#45   MESA 5          10:24      ||
||#43   MESA 9          10:22      |  |[○ PENDIENTE]         ⏱ 1 min    |  |[○ PENDIENTE]       ⏱ <1 min     ||
||~~1  Té verde~~                  |  |3  Café solo                     |  |1  Americano                     ||
||                                 |  |1  Bocadillo jamón               |  |                                 ||
||+-------------------------------+|  |+-------------------------------+|  |+-------------------------------+||
|||        ✓ ENTENDIDO            ||  |||         ▶ EMPEZAR            |||  |||         ▶ EMPEZAR            |||
||+-------------------------------+|  |+-------------------------------+|  |+-------------------------------+||
|+---------------------------------+  +---------------------------------+  +---------------------------------+|
+------------------------------------------------------------------------------------------------------------+
```

Barra superior de 80 px con tres zonas fijas: estado (conexión, sonido), **Deshacer** (botón de 72 px que solo aparece durante 30 s tras "Marcar listo") y "+N · Ver siguientes" (solo si hay más de 6 pedidos: lleva a la siguiente página de la cola, y no se usa desplazamiento). Así, ni el deshacer ni el contador quitan alto a las tarjetas.

Orden de lectura: de izquierda a derecha y de arriba abajo, el más antiguo primero (HU-03). Las tarjetas no cambian de sitio mientras se tocan: un pedido nuevo siempre entra al final, y una tarjeta que sale deja su hueco con una transición de 200 ms.

## Presupuesto de espacio (verificación de "6 pedidos sin desplazar")

| Elemento | Alto |
|---|---|
| Barra superior (incluye Deshacer y "Ver siguientes") | 80 |
| 3 separaciones de 16 px (arriba, entre filas, abajo) | 48 |
| **Disponible para 2 filas** | 1080 - 128 = 952, es decir, **476 px por tarjeta** |
| En la tarjeta: padding 2x16, franja de modificador 40, cabecera 48, insignia 40, botón 72, separaciones 3x8 | 256 |
| **Queda para líneas** | **220 px = 5 líneas de 44 px** (o 4 líneas + 1 nota de 32 px) |

Con el banner "Sin conexión" (56 px) caben 4 líneas por tarjeta; en ese estado no se puede cambiar el estado, así que es aceptable.

Ancho de tarjeta: (1920 - 4x16) / 3 = 618 px, unos 30 caracteres de 36 px por línea.

**Límite:** la rejilla muestra 6 pedidos sin desplazar **si cada pedido tiene hasta 5 líneas** (o 4 líneas + 1 nota). Un pedido con más líneas ocupa 2 filas de alto (la tarjeta crece y no oculta productos, porque ocultar productos en barra provoca errores de preparación), y entonces se ven 5. Reportado al PO para que concrete el criterio (ver `docs/estado.md`).

## Acciones por estado (1 toque, 72 px de alto)

| Estado de la tarjeta | Botón | Resultado |
|---|---|---|
| PENDIENTE | ▶ EMPEZAR | EN PREPARACIÓN |
| EN PREPARACIÓN | ✓ MARCAR LISTO | Sale de la cola; aparece "Deshacer (30 s)" en la barra superior |
| MODIFICADO | ✓ ENTENDIDO | Quita la franja; después vuelve el botón del estado |
| CANCELADO | ✓ ENTENDIDO | Quita la tarjeta |
| Sin conexión | (deshabilitado) "Sin conexión" | — |

Mientras el servidor confirma, el botón muestra "Guardando…" y no admite un segundo toque.

## Estados de pantalla

| Estado | Qué se ve |
|---|---|
| Vacío | Centro: "✓ No hay pedidos en cola. Los nuevos aparecerán aquí solos." (32 px) |
| Cargando | 6 tarjetas esqueleto |
| Sin conexión | Banner rojo fijo bajo la barra superior: "⚠ SIN CONEXIÓN · Reintentando… Los pedidos nuevos no se están recibiendo" (32 px, texto blanco sobre `offline`), en <= 5 s; "● Conectado" pasa a "○ Sin conexión" |
| Reconectado | El banner cambia 3 s a "✓ Conexión recuperada" y la cola se resincroniza |
| Pedido nuevo | Sonido (si está activado), borde resaltado 2 s, anuncio `aria-live`: "Nuevo pedido 45, mesa 5" |
| Retrasado | Franja superior "⚠ RETRASADO · 12 min" + borde discontinuo de 6 px; los minutos se actualizan cada minuto |

## Responsive
Pensada para 1920x1080. A 1440 px: 3 columnas con el mismo tamaño de texto (se ven 4 o 5 pedidos). A 768 px: 2 columnas. A 375 px: 1 columna (solo para emergencias; no es el dispositivo objetivo).

## Criterios cubiertos
| Historia | Criterio UX | Cómo |
|---|---|---|
| HU-03 | Texto >= 18 px a 1,5 m en 15" o más | 36 px en productos y 40 px en número/mesa. Ver el cálculo de legibilidad en design-system §2.1 |
| HU-03 | 1 toque, botones >= 60x60 | Un botón por tarjeta, 72 px x 586 px |
| HU-03 | >= 6 pedidos sin desplazar a 1920x1080 | Rejilla 3x2 (con el límite de líneas indicado arriba) |
| HU-03 | Estados por texto y color | Insignia con texto + icono + color + patrón de borde |
| HU-03 | Retrasado con icono y texto | "⚠ RETRASADO · N min" |
| HU-03 | Deshacer en 30 s | Botón de 72 px en la barra superior con cuenta atrás visible |
| HU-03 | MODIFICADO / CANCELADO hasta confirmar | Franja + botón "Entendido" |
| HU-03 | Sonido desactivable | Interruptor con el estado en texto |
| HU-03 (no func.) | "Sin conexión" en <= 5 s | Banner |
| HU-03 (no func.) | Barra no ve importes | No hay importes en la tarjeta |
| HU-06 | AÑADIDO / ELIMINADO en texto | Etiquetas + tachado |
| HU-01 | Nombre y rol visibles | "Javi · Barra" |
