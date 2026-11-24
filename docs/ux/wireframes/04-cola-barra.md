# P-05 Cola de barra/cocina (HU-03, HU-06)

Pantalla táctil fija de 24" FHD o mayor (supuesto 21), horizontal, 1920x1080, escala del sistema y zoom al 100 %. Rol barra (o encargado). **Sin importes.** Los cambios de la tarea 1.2b van marcados [1.2b] y los de la 1.2c, [1.2c].

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

## Pedido que vuelve a la cola por añadir productos [1.2b] (HU-06, supuesto 17, `docs/arquitectura.md` §4.2)

Caso: un pedido "Listo" o "Servido" al que sala añade productos vuelve a PENDIENTE. Para barra es trabajo nuevo, pero ya ha preparado parte del pedido. La tarjeta tiene que dejar claro **qué hay que preparar ahora** y **qué ya se entregó**, para que no se prepare dos veces.

```
+---------------------------------+
|＋ AÑADIDO 10:47 · YA SERVIDO     |  <- franja de modificador (40 px), estilo Modificado
|#40   MESA 7     Enviado 10:12   |     con otro icono (plus-circle); "YA LISTO" si no se había servido
|[○ PENDIENTE]   ⏱ 1 min (añadido)|  <- la espera dice desde cuándo cuenta
|                                 |
|1  Cruasán            AÑADIDO    |  <- solo las líneas nuevas, a 38 px
|1  Zumo naranja       AÑADIDO    |
|                                 |
|✓✓ Ya entregado: 2 Café con leche,|  <- 1 línea de contexto a 24 px, text-secondary,
|   1 Tostada tomate              |     sin acciones (se parte en 2 líneas si no cabe)
|+-------------------------------+|
||          ▶ EMPEZAR            ||
|+-------------------------------+|
+---------------------------------+
```

- **Franja** [texto 1.2c] "＋ AÑADIDO 10:47 · YA SERVIDO" (o "· YA LISTO"), que contiene el texto literal "AÑADIDO hh:mm" de HU-03/CA-F23: texto + icono `plus-circle` + colores de Modificado (9,23:1) + franja superior. No es "MODIFICADO" (no estaba en la cola) y **no pide "Entendido"**: el botón es directamente "Empezar". Si además está retrasado, las dos franjas se unen en una: "⚠ RETRASADO · 12 min · ＋ AÑADIDO 10:47" (se mantiene) con el borde discontinuo de retrasado.
- **Cabecera:** número y mesa/cliente de siempre, con "Enviado 10:12" (hora original). La hora del añadido está en la franja.
- **Líneas:** a tamaño completo (38 px) solo las líneas del ciclo actual, todas con la etiqueta "AÑADIDO". Lo preparado antes no se muestra como línea normal, porque una línea a 38 px sin etiqueta parece trabajo pendiente. Va resumido en una línea de contexto "✓✓ Ya entregado: …" (o "✓ Ya preparado: …" si estaba Listo) a 24 px en `text-secondary` (7,58:1). Las líneas eliminadas en ciclos anteriores no se muestran (como indica la arquitectura).
- **Llegada:** igual que un pedido nuevo: sonido, borde resaltado 2 s y anuncio `aria-live` "Pedido 40, mesa 7: productos añadidos".
- **Orden y espera [1.2c]:** decidido en HU-03/CA-F02, CA-F23 y el supuesto 24 (la opción A de la tarea 1.2b; la B queda descartada). El pedido entra **al final de la cola**, como uno nuevo, porque su hora de entrada en la cola es la del añadido; los minutos de espera y "RETRASADO" cuentan desde esa hora, y el texto lo dice: "⏱ 1 min (añadido)".
- **Presupuesto de alto:** la línea de contexto ocupa 32 px (como una nota), así que caben 4 líneas añadidas + 1 de contexto en la tarjeta estándar. Con más, la tarjeta crece (nunca se ocultan líneas, HU-03).
- **Añadir a un pedido que sigue en la cola** (Pendiente / En preparación) no es este caso: la tarjeta no se mueve, lleva "✎ MODIFICADO" con "Entendido" y las líneas nuevas con "AÑADIDO" junto a las anteriores, que siguen siendo trabajo pendiente.

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
| Retrasado | Franja superior "⚠ RETRASADO · 12 min" + borde discontinuo de 6 px; los minutos se actualizan cada minuto. Umbral fijo de 10 min desde la entrada en la cola (HU-03/CA-F06, supuesto 20) [1.2c] |
| Sonido bloqueado por el navegador [1.2c] | Ver "Sonido" (abajo) |
| Pantalla sin Wake Lock [1.2c] | Ver "Pantalla encendida" (abajo) |
| Sesión a punto de caducar (12 h) [1.2c] | 15 min antes, aviso en la zona de estado: "La sesión caduca a las 19:30 · [Volver a entrar]" (botón `touch-bar`). Permite elegir un momento tranquilo; al pulsarlo se cierra la sesión y se va a P-01. Si no se pulsa, a las 12 h la cola vuelve a P-01 con "La sesión ha caducado (12 h)" (HU-01/CA-N06) |
| Sesión revocada [1.2c] | Bloqueo indefinido, desactivación o PIN restablecido: la cola vuelve a P-01 en <= 1 s con el motivo (`01-login.md`, "Vuelta al inicio de sesión"; HU-01/CA-F13) |
| Encargado con la cola abierta [1.2c] | Su sesión sí caduca a los 15 min sin tocar (HU-01/CA-F09), con el aviso de los 14 min. Solo la sesión de rol barra no caduca por inactividad |
| Conflicto de versión (409) [1.2b] | Si un toque llega sobre una versión antigua del pedido, la tarjeta se recarga con la versión actual, muestra la franja "✎ MODIFICADO" y el botón "Entendido"; no se aplica el cambio de estado |

## Sonido [1.2c] (HU-03/CA-F09, CA-F14)

| Situación | Zona de estado de la barra superior | Al llegar un pedido |
|---|---|---|
| Primera vez en este dispositivo | "🔊 Sonido: activado" (valor inicial, HU-03/CA-F09) | Suena |
| Barra lo desactiva | "🔈 Sonido: desactivado" (1 toque en el interruptor) | No suena y **no** aparece "Sonido bloqueado" |
| Activado y el navegador bloquea el audio | Texto "🔇 Sonido bloqueado" + botón **"Activar sonido"** (`touch-bar`: 72 px de alto, >= 160 px de ancho; >= 60x60, HU-03/CA-F14), fondo de Aviso | No suena; el aviso sigue visible aunque lleguen más pedidos |
| Toque en "Activar sonido" | Vuelve "🔊 Sonido: activado" | El siguiente suena |

- **Preferencia guardada en el dispositivo** (HU-03/CA-F09, ronda 1.1f): activado/desactivado se conserva al recargar y al volver a entrar con cualquier usuario. Solo se guarda ese valor, sin datos personales.
- **Cuándo se detecta el bloqueo** (HU-03/CA-F14): al abrir la cola (se comprueba si el audio puede sonar) y cada vez que un aviso falla. El aviso aparece en <= 1 s.
- **Sin tapar pedidos:** va en la barra superior de 80 px, en el sitio del interruptor, así que no quita alto a las tarjetas (HU-03/CA-U03). Anuncio `role="status"`: "Sonido bloqueado. Pulsa Activar sonido."
- Si a la vez falta el Wake Lock, la zona de estado muestra primero "Sonido bloqueado" (pide una acción de barra) y el aviso de pantalla queda como un icono "⚠ Pantalla" con texto accesible, que se amplía al tocarlo.

## Pantalla encendida [1.2c] (HU-03/CA-N05)

- Al abrir la cola, la app pide mantener la pantalla encendida (Wake Lock, solo con HTTPS) y lo vuelve a pedir cada vez que la pestaña vuelve a estar visible y al reconectar, porque el navegador lo libera al ocultar la pestaña.
- Si se rechaza o no está disponible: aviso fijo en la zona de estado "⚠ La pantalla puede apagarse" (al tocarlo: "Revisa el ahorro de energía del dispositivo o avisa al encargado"). No tapa tarjetas.
- Requisitos de instalación (no son de interfaz; para Infrastructure y el manual de instalación): certificado de la CA interna instalado en el dispositivo de barra (HTTPS) y navegador a pantalla completa. La verificación es con el apagado automático en su valor mínimo distinto de "nunca" (HU-03/CA-N05, ronda 1.1f).

## Responsive
Pensada para 1920x1080. A 1440 px: 3 columnas con el mismo tamaño de texto (se ven 4 o 5 pedidos). A 768 px: 2 columnas. A 375 px: 1 columna (solo para emergencias; no es el dispositivo objetivo).

## Criterios cubiertos
| Criterio | Cómo |
|---|---|
| HU-03/CA-U01 | 38 px en producto y cantidad (7,26 mm con la fuente más desfavorable) y 40 px en número y mesa/cliente (7,64 mm), en 24" FHD (design-system §2.1) |
| HU-03/CA-U02 | Un botón por tarjeta, 72 x 586 px, 1 toque |
| HU-03/CA-U03 | Rejilla 3x2 con hasta 5 líneas (o 4 + 1 nota); los pedidos largos crecen y no ocultan nada |
| HU-03/CA-U04 | Insignia con texto + icono + color + patrón de borde |
| HU-03/CA-F01 | Tarjeta: número, mesa/cliente, hora de envío, espera, productos con cantidad y notas |
| HU-03/CA-F02, CA-F24 | Orden por entrada en la cola; un añadido a un pedido que sigue en la cola no lo mueve |
| HU-03/CA-F23, CA-F13 | Franja "＋ AÑADIDO hh:mm · YA SERVIDO/LISTO" y líneas "AÑADIDO" [1.2c] |
| HU-03/CA-F03, CA-F04 | "Empezar" y "Marcar listo" |
| HU-03/CA-F05, CA-F11 | Zona Deshacer (solo la última acción, 30 s; no disponible si ya está "Servido") |
| HU-03/CA-F06 | "⚠ RETRASADO · N min" a los 10 min fijos [1.2c] |
| HU-03/CA-F07 | Franja MODIFICADO / CANCELADO + "Entendido" |
| HU-03/CA-F08 | Pedido nuevo sin recargar, con resaltado y `aria-live` |
| HU-03/CA-F09 | Interruptor de sonido; preferencia guardada en el dispositivo, activada la primera vez [1.2c] |
| HU-03/CA-F14 | "Sonido bloqueado" + "Activar sonido" en la barra superior [1.2c] |
| HU-03/CA-F22 | No existe la acción "Servido" en P-05 |
| HU-03/CA-N02 | Banner "Sin conexión" en <= 5 s; resincronización sola |
| HU-03/CA-N03 | Sin importes en la tarjeta |
| HU-03/CA-N05 | Wake Lock con reintento y aviso "La pantalla puede apagarse" [1.2c] |
| HU-06/CA-U03 | AÑADIDO / ELIMINADO en texto + tachado |
| HU-01/CA-U04 | "Javi · Barra" |
| HU-01/CA-N06, CA-F09, CA-F13 | Aviso de caducidad de 12 h, inactividad del encargado y sesión revocada [1.2c] |
