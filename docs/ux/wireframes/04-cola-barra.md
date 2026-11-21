# P-05 Cola de barra/cocina (HU-03, HU-06)

Pantalla táctil fija de 24" FHD o mayor (supuesto 21), horizontal, 1920x1080, escala del sistema y zoom al 100 %. Rol barra (o encargado). **Sin importes.** Los cambios de la tarea 1.2b van marcados [1.2b].

## Maquetación (rejilla 3x2, 6 tarjetas sin desplazar)

```
+------------------------------------------------------------------------------------------------------------+
| Cola · 7   ● Conectado  [🔊 Sonido: activado] | Pedido 41 empezado [↶ DESHACER · 27 s] | +1 [▼ Ver siguientes] |  80 px
|                                                                          Javi · Barra   [⎋ Cerrar sesión]  |
+------------------------------------------------------------------------------------------------------------+
|+---------------------------------+  +---------------------------------+  +---------------------------------+|
||⚠ RETRASADO · 12 min (dashed 6px)|  |                                 |  |✎ MODIFICADO                     ||
||#40   MESA 7          10:12      |  |#41   ANA (mostr.)    10:18      |  |#42   MESA 3          10:21      ||  text-bar-title 40
||[◐ EN PREPARACIÓN]   ⏱ 12 min    |  |[◐ EN PREPARACIÓN]    ⏱ 6 min    |  |[○ PENDIENTE]         ⏱ 3 min    ||  text-bar-meta 24
||                                 |  |                                 |  |                                 ||
||2  Café con leche                |  |1  Capuchino                     |  |1  Tostada tomate                || text-bar-item 38 [1.2b]
||   Nota: leche de avena          |  |1  Cruasán                       |  |~~1  Zumo naranja~~  ELIMINADO   || nota 24, cursiva
||1  Tostada tomate                |  |                                 |  |1  Café solo         AÑADIDO     ||
||                                 |  |                                 |  |                                 ||
||+-------------------------------+|  |+-------------------------------+|  |+-------------------------------+||
|||        ✓ MARCAR LISTO         ||  ||        ✓ MARCAR LISTO         ||  |||        ✓ ENTENDIDO            |||  72 px, ancho total
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

Barra superior de 80 px con tres zonas fijas: estado (conexión, sonido), **Deshacer** (botón de 72 px que aparece durante 30 s tras "Empezar" o "Marcar listo") y "+N · Ver siguientes" (solo si hay más de 6 pedidos: lleva a la siguiente página de la cola, y no se usa desplazamiento). Así, ni el deshacer ni el contador quitan alto a las tarjetas. En el ejemplo, el pedido 41 se acaba de empezar.

### Deshacer [1.2b] (HU-03)

| Última acción en esta pantalla | Zona Deshacer muestra | Al pulsar "Deshacer" (<= 30 s) |
|---|---|---|
| Empezar el pedido 41 | "Pedido 41 empezado [↶ DESHACER · 27 s]" | La tarjeta 41 vuelve a PENDIENTE en su sitio (botón "Empezar"); la tarjeta no se mueve |
| Marcar listo el pedido 39 | "Pedido 39 listo [↶ DESHACER · 27 s]" | El 39 vuelve a EN PREPARACIÓN y a la cola en su posición por hora de envío, con el borde resaltado 2 s. Si la página está llena, el último pedido visible pasa a "Ver siguientes" |
| Sala marca "Servido" el 39 antes de 30 s | El botón desaparece y la zona muestra 5 s: "Pedido 39 ya servido: no se puede deshacer" | — |
| Pasan 30 s | El botón desaparece sin mensaje | — |
| Nueva acción (Empezar/Listo de otro pedido) | Se sustituye por la nueva; la anterior ya no se puede deshacer | — |

- Solo existe **un** "Deshacer" (la última acción de esta pantalla), con la cuenta atrás en texto. El lector de pantalla anuncia el inicio ("Pedido 41 empezado. Deshacer disponible 30 segundos") y no cada segundo.
- "Deshacer" no se aplica a "Entendido" (confirmar MODIFICADO/CANCELADO), porque no cambia el estado del pedido.
- Mientras el servidor confirma, el botón pasa a "Deshaciendo…" y se deshabilita.

Orden de lectura: de izquierda a derecha y de arriba abajo, el más antiguo primero (HU-03). Las tarjetas no cambian de sitio mientras se tocan: un pedido nuevo siempre entra al final, y una tarjeta que sale deja su hueco con una transición de 200 ms.

## Presupuesto de espacio (verificación de "6 pedidos sin desplazar")

| Elemento | Alto |
|---|---|
| Barra superior (incluye Deshacer y "Ver siguientes") | 80 |
| 3 separaciones de 16 px (arriba, entre filas, abajo) | 48 |
| **Disponible para 2 filas** | 1080 - 128 = 952, es decir, **476 px por tarjeta** |
| En la tarjeta: padding 2x16, franja de modificador 40, cabecera 48, insignia 40, botón 72, separaciones 3x8 | 256 |
| **Queda para líneas** | **220 px = 5 líneas de 44 px** (o 4 líneas + 1 nota de 32 px) |

[1.2b] Al subir `text-bar-item` de 36 a 38 px se mantiene la altura de línea de 44 px, así que el presupuesto no cambia. Si el PO decide que las notas también deben medir >= 7 mm (ver `docs/estado.md`), una nota a 38/44 px sigue cabiendo en "4 líneas + 1 nota" (4x44 + 44 = 220 px).

Con el banner "Sin conexión" (56 px) caben 4 líneas por tarjeta; en ese estado no se puede cambiar el estado, así que es aceptable.

Ancho de tarjeta: (1920 - 4x16) / 3 = 618 px; con padding, 586 px útiles, unos 28 caracteres de 38 px en negrita por línea [1.2b]. Un nombre más largo pasa a 2 líneas (no se corta).

**Límite (ya recogido en HU-03):** la rejilla muestra 6 pedidos sin desplazar **si cada pedido tiene hasta 5 líneas** (o 4 líneas + 1 nota), con la pantalla conectada. Un pedido con más líneas ocupa 2 filas de alto (la tarjeta crece y nunca oculta productos ni notas, como pide HU-03), y entonces se ven 5. Con el banner "Sin conexión" caben 4 líneas por tarjeta, y HU-03 solo exige los 6 pedidos con la pantalla conectada.

## Acciones por estado (1 toque, 72 px de alto)

| Estado de la tarjeta | Botón | Resultado |
|---|---|---|
| PENDIENTE | ▶ EMPEZAR | EN PREPARACIÓN; aparece "Deshacer · 30 s" en la barra superior [1.2b] |
| EN PREPARACIÓN | ✓ MARCAR LISTO | Sale de la cola; aparece "Deshacer · 30 s" en la barra superior |
| MODIFICADO | ✓ ENTENDIDO | Quita la franja; después vuelve el botón del estado |
| CANCELADO | ✓ ENTENDIDO | Quita la tarjeta |
| Sin conexión | (deshabilitado) "Sin conexión" | — |

Texto de los botones en `text-bar-action` (28 px). Mientras el servidor confirma, el botón muestra "Guardando…" y no admite un segundo toque. Barra no tiene ninguna acción "Servido" (HU-03: 403 para el rol barra).

## Estados de pantalla

| Estado | Qué se ve |
|---|---|
| Vacío | Centro: "✓ No hay pedidos en cola. Los nuevos aparecerán aquí solos." (32 px) |
| Cargando | 6 tarjetas esqueleto |
| Sin conexión | Banner rojo fijo bajo la barra superior: "⚠ SIN CONEXIÓN · Reintentando… Los pedidos nuevos no se están recibiendo" (32 px, texto blanco sobre `offline`), en <= 5 s; "● Conectado" pasa a "○ Sin conexión" |
| Reconectado | El banner cambia 3 s a "✓ Conexión recuperada" y la cola se resincroniza |
| Pedido nuevo | Sonido (si está activado), borde resaltado 2 s, anuncio `aria-live`: "Nuevo pedido 45, mesa 5" |
| Retrasado | Franja superior "⚠ RETRASADO · 12 min" + borde discontinuo de 6 px; los minutos se actualizan cada minuto. El umbral sale de Ajustes (HU-09, propuesta) o de la instalación (supuesto 20) |
| Sonido bloqueado por el navegador [1.2b] | Tras recargar sin interacción, el interruptor de sonido se sustituye por el botón "🔇 Activar sonido" (72 px, fondo de Aviso) en la barra superior; al pulsarlo vuelve "🔊 Sonido: activado" |
| Pantalla sin Wake Lock [1.2b] | Aviso fijo en la barra superior: "La pantalla puede apagarse sola: revisa el ahorro de energía" (requiere HTTPS, ver arquitectura) |
| Conflicto de versión (409) [1.2b] | Si un toque llega sobre una versión antigua del pedido, la tarjeta se recarga con la versión actual, muestra la franja "✎ MODIFICADO" y el botón "Entendido"; no se aplica el cambio de estado |

## Responsive
Pensada para 1920x1080. A 1440 px: 3 columnas con el mismo tamaño de texto (se ven 4 o 5 pedidos). A 768 px: 2 columnas. A 375 px: 1 columna (solo para emergencias; no es el dispositivo objetivo).

## Criterios cubiertos
| Historia | Criterio UX | Cómo |
|---|---|---|
| HU-03 | Mayúsculas >= 7 mm (16 arcmin a 1,5 m) en producto, cantidad, número y mesa/cliente, en 24" FHD | 38 px en producto y cantidad (7,26 mm con la fuente más desfavorable) y 40 px en número y mesa/cliente (7,64 mm). Cálculo y método de verificación en design-system §2.1 [1.2b] |
| HU-03 | 1 toque, botones >= 60x60 | Un botón por tarjeta, 72 px x 586 px |
| HU-03 | >= 6 pedidos sin desplazar a 1920x1080 | Rejilla 3x2 (con el límite de líneas indicado arriba) |
| HU-03 | Estados por texto y color | Insignia con texto + icono + color + patrón de borde |
| HU-03 | Retrasado con icono y texto | "⚠ RETRASADO · N min" |
| HU-03 | Deshacer "Empezar" y "Listo" en 30 s, solo la última acción; no disponible si ya está "Servido" | Zona Deshacer de 72 px en la barra superior con cuenta atrás visible (tabla "Deshacer") [1.2b] |
| HU-03 | Barra no puede marcar "Servido" | No existe la acción en P-05 |
| HU-03 | MODIFICADO / CANCELADO hasta confirmar | Franja + botón "Entendido" |
| HU-03 | Sonido desactivable | Interruptor con el estado en texto |
| HU-03 (no func.) | "Sin conexión" en <= 5 s | Banner |
| HU-03 (no func.) | Barra no ve importes | No hay importes en la tarjeta |
| HU-06 | AÑADIDO / ELIMINADO en texto | Etiquetas + tachado |
| HU-01 | Nombre y rol visibles | "Javi · Barra" |
