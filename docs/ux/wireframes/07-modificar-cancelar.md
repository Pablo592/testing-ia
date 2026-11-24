# P-08 Detalle de pedido: modificar y cancelar (HU-06, Should)

Actualizado en la tarea 1.2b: autorización del encargado según el supuesto 22, estado "Servido" tratado como "Listo", y mensajes de error y bloqueo según la política de Cybersecurity (`docs/seguridad.md` §6.1 y §6.3; componente en design system §5.10b).

```
+-----------------------------------------------------------------------------------+
| Pedido #42 · Mesa 7                         Lucía · Camarero   [⎋ Cerrar sesión]  |
+-----------------------------------------------------------------------------------+
| [< Pedidos]      [◐ EN PREPARACIÓN]   Enviado 10:21                               |
|                                                                                   |
|  2 × Café con leche        3,20 €   [ − ] [ + ]                                   |
|  1 × Cruasán               1,80 €   [ − ] [ + ]                                   |
|  ~~1 × Zumo naranja        2,40 €~~  ELIMINADO   [↶ Recuperar]                     |
|      ⓘ Quitar líneas de un pedido en preparación necesita autorización del        |  <- aviso en el momento
|        encargado al enviar los cambios.                                           |     de pulsar "−"
|  TOTAL                     5,00 €   (antes 7,40 €)                                |
|                                                                                   |
|  [+ Añadir productos]  (secundario)                                               |
|                                                    +-----------------------------+|
|  [✕ Cancelar pedido] (peligro-contorno,            |  ENVIAR CAMBIOS A BARRA     ||  <- primario
|   lado opuesto al primario)                        +-----------------------------+|
+-----------------------------------------------------------------------------------+
```
Sin cambios pendientes, el primario es "Cobrar 7,40 €". Con cambios sin enviar, el primario pasa a "Enviar cambios a barra" y "Cobrar" se deshabilita hasta enviarlos. Las líneas quitadas se ven tachadas y con "ELIMINADO" (con "Recuperar" mientras no se envíen); las nuevas, con "AÑADIDO".

## Cuándo se pide autorización (HU-06)

| Preparación (cobro Abierto) | Añadir productos | Quitar / reducir línea | Cancelar pedido |
|---|---|---|---|
| Pendiente | Sin PIN | Sin PIN | Sin PIN (3 toques) |
| En preparación | Sin PIN | **Autorización** | **Autorización** |
| Listo | Sin PIN (vuelve a Pendiente) | **Autorización** ("puede estar ya preparada") | **Autorización** |
| Servido | Sin PIN (vuelve a Pendiente) | **Autorización** ("puede estar ya servida") | **Autorización** |

- Si la sesión es de un **encargado**, no se pide autorización ni reconfirmación para estas acciones de HU-06: la acción se aplica (con su diálogo de confirmación si lo tiene) y queda registrado ese encargado como quien autoriza (supuesto 22; Cybersecurity lo confirma en `seguridad.md` §6.3). La reconfirmación de SEC-007 solo afecta a anular cobros (P-07) y a Personal (P-10).
- **Una autorización = una acción** (supuesto 22). Decisión de diseño: en "Quitar o reducir", la acción es el **envío** de los cambios ("Enviar cambios a barra"), no cada toque en "−". Así, quitar 2 líneas en el mismo envío pide el PIN una vez. El aviso de que la línea puede estar preparada aparece en el momento de pulsar "−" (criterio de HU-06), y el diálogo de autorización enumera todas las líneas que se quitan.
- Con cobro "Cobrado": sin "−", "Añadir" ni "Cancelar". Texto: "Pedido cobrado: para modificarlo o cancelarlo, el encargado tiene que anular el cobro" + "Ver ticket" (HU-06 UX).

## Cancelar sin autorización (Pendiente): 3 toques desde el detalle

```
+------------------------------------------------+
| ¿Cancelar el pedido 42?                        |
| Mesa 7 · 3 productos · 7,40 €                  |  <- número e importe afectado
|                                                |
| Motivo (obligatorio)                           |
| ( ) Cliente se ha ido                          |  <- radios de 56 px (toque 2)
| ( ) Error al tomar el pedido                   |
| ( ) Otro: [______________________] 0/100       |
|                                                |
| [Volver]                 [ CANCELAR PEDIDO ]   |  <- peligro (toque 3);
+------------------------------------------------+     deshabilitado sin motivo
```

## Diálogo de autorización del encargado (design system §5.10b)

### A. Varios encargados activos (sin preselección)
```
+--------------------------------------------------------+
| Autorizar: quitar líneas del pedido 42                 |  <- la acción concreta
| ⚠ El pedido está en preparación: estas líneas pueden   |
|   estar ya preparadas.                                 |
|   · 1 × Zumo naranja (2,40 €)                          |
|                                                        |
| Encargado que autoriza                                 |
| ( ) Marta          ( ) Jorge                           |  <- opciones de 56 px; 1 toque
|                                                        |
| PIN de Marta (6 dígitos)                               |
|        ● ● ○ ○ ○ ○                                     |  <- teclado de §5.3 (72 px),
|   [1] [2] [3]                                          |     deshabilitado hasta elegir
|   [4] [5] [6]                                          |     encargado
|   [7] [8] [9]                                          |
|   [⌫ Borrar] [0]                                       |
|                                                        |
| (zona de mensaje)                                      |
|                                                        |
| [Volver]                   [ AUTORIZAR Y QUITAR ]      |  <- primario del diálogo
+--------------------------------------------------------+
```

### B. Un solo encargado activo (preseleccionado)
La fila "Encargado que autoriza" se sustituye por el texto fijo **"Encargado: Marta"** y el teclado está activo desde el principio. Solo hay que escribir el PIN y pulsar "Autorizar y quitar".

### C. Cancelación con autorización (En preparación, Listo o Servido)
Un único diálogo, de arriba abajo: título "¿Cancelar el pedido 42?", número, mesa e importe, el motivo (radios), el aviso "⚠ El pedido está en preparación" y la sección de autorización (A o B). Botón final: "Autorizar y cancelar pedido" (peligro), deshabilitado hasta tener motivo, encargado y PIN. En 1024x768 el diálogo se desplaza por dentro, y el botón final y "Volver" quedan fijos en su pie (no los tapa nada, WCAG 2.4.11).

### Estados del diálogo
Los mensajes exactos de cada respuesta del servidor están en el design system §5.10b (variante "Autorización"). Resumen:

| Estado | Qué se ve |
|---|---|
| Comprobando | "Comprobando…" en el botón, deshabilitado; teclado deshabilitado |
| PIN incorrecto (o encargado bloqueado, desactivado o con PIN provisional: mismo error genérico, RS-04) | Bajo el PIN, en `danger`: "⚠ PIN de encargado incorrecto". El PIN se vacía y el foco vuelve al teclado. Desde el 2.º fallo seguido, ayuda: "Si estás seguro del PIN, inicia sesión con tu usuario para comprobar si tu cuenta está bloqueada." El cambio pendiente no se pierde |
| Demasiados intentos en esta sesión (`429`, 5 en 10 min) | "🔒 Demasiados intentos. Espera 10 min." (texto de HU-06/CA-F19) Teclado deshabilitado para todos; "Volver" activo; el cambio pendiente se conserva |
| Demasiados intentos en este dispositivo (`429`, 10 en 10 min) | "🔒 Demasiados intentos desde este dispositivo. Espera 9 min." |
| Ningún encargado activo | No debería ocurrir (HU-07 exige al menos uno). Si ocurre: "No hay ningún encargado activo para autorizar" y solo "Volver" |
| Sin conexión / error del servidor | "No se ha podido comprobar el PIN. No se ha hecho ningún cambio. · Reintentar"; el cambio pendiente se conserva |
| Pedido cambiado (409) mientras se autoriza | Se cierra el diálogo y se muestra el aviso de conflicto (abajo); la autorización no se usa |
| Correcto | El diálogo se cierra, se aplica la acción y aparece el toast "Cambios enviados a barra · autorizado por Marta" o "Pedido 42 cancelado · autorizado por Marta"; el PIN se borra del cliente (RS-29b) |

## Estados de la pantalla
| Estado | Qué se ve |
|---|---|
| Conflicto (otro dispositivo cambió el pedido, 409) | Aviso: "El pedido ha cambiado mientras lo editabas. Se muestra la versión actual; revisa y repite tu cambio." Los cambios descartados se listan en el aviso |
| Pedido cobrado | Sin +/- ni cancelar; "Pedido cobrado: para modificarlo o cancelarlo, el encargado tiene que anular el cobro" + "Ver ticket" |
| Pedido cancelado | Solo lectura con la insignia "✕ CANCELADO" y el motivo |
| Enviando | "Enviando cambios…" deshabilitado |
| Éxito | Toast "Cambios enviados a barra" / "Pedido 42 cancelado" |

## Criterios cubiertos
| Criterio | Cómo |
|---|---|
| HU-06/CA-U01, CA-F09, CA-F04 | Cancelar pedido, motivo, Cancelar pedido = 3 toques; motivos de la lista |
| HU-06/CA-U02 | Cabecera del diálogo con número e importe |
| HU-06/CA-U03, CA-F01, CA-F02 | "AÑADIDO" / tachado + "ELIMINADO" (aquí y en barra) |
| HU-06/CA-F03 | Aviso de línea ya preparada o servida al pulsar "−" y en el diálogo |
| HU-06/CA-F05 | Cancelación con autorización (variante C) |
| HU-06/CA-F11 | Diálogo de autorización A: encargado + PIN en el mismo dispositivo |
| HU-06/CA-F12 | Variante B: único encargado preseleccionado |
| HU-06/CA-F13 | "PIN de encargado incorrecto", PIN vaciado, cambio conservado |
| HU-06/CA-F14 | La autorización se consume en el envío o la cancelación |
| HU-06/CA-F15 | Sesión de encargado: sin autorización adicional |
| HU-06/CA-F18 | Mismo error genérico con un encargado bloqueado, desactivado o con PIN provisional |
| HU-06/CA-F19 | `429` por sesión: "Demasiados intentos. Espera X min", cambio conservado |
| HU-06/CA-F06, CA-U04 | Estado "Pedido cobrado": hace falta que el encargado anule el cobro |
| HU-06/CA-F10 | Pedido cancelado en solo lectura |
| HU-06/CA-N03 | Aviso de conflicto (409) con la versión actual |
| HU-01/CA-N01 | PIN de encargado de 6 dígitos: etiqueta "(6 dígitos)" y 6 indicadores |
| HU-04/CA-U01 | Primario "Cobrar" desde el detalle |
