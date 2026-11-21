# P-08 Detalle de pedido: modificar y cancelar (HU-06, Should)

```
+-----------------------------------------------------------------------------------+
| Pedido #42 · Mesa 7                         Lucía · Camarero   [⎋ Cerrar sesión]  |
+-----------------------------------------------------------------------------------+
| [< Pedidos]      [○ PENDIENTE]   Enviado 10:21                                    |
|                                                                                   |
|  2 × Café con leche        3,20 €   [ − ] [ + ]                                   |
|  1 × Cruasán               1,80 €   [ − ] [ + ]                                   |
|  1 × Zumo naranja          2,40 €   [ − ] [ + ]                                   |
|  TOTAL                     7,40 €                                                 |
|                                                                                   |
|  [+ Añadir productos]  (secundario)                                               |
|                                                    +-----------------------------+|
|  [✕ Cancelar pedido] (peligro-contorno,            |      COBRAR 7,40 €          ||  <- primario
|   lado opuesto al primario)                        +-----------------------------+|
+-----------------------------------------------------------------------------------+
```
Con cambios sin enviar, el primario pasa a "Enviar cambios a barra" y "Cobrar" se deshabilita hasta enviarlos. Las líneas quitadas se ven tachadas y con "ELIMINADO"; las nuevas, con "AÑADIDO".

## Cancelar (3 toques desde el detalle)

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

## Autorización del encargado (En preparación / Listo)

```
+------------------------------------------------+
| Se necesita autorización del encargado         |
| ⚠ Esta línea puede estar ya preparada.         |
| Encargado: [ Marta ▼ ]                         |
| PIN: ● ● ● ○  + teclado numérico (72 px)       |
| [Volver]                    [ AUTORIZAR ]      |
+------------------------------------------------+
```
Error: "PIN de encargado incorrecto", junto al campo; el PIN se vacía.

## Estados
| Estado | Qué se ve |
|---|---|
| Conflicto (otro dispositivo cambió el pedido) | Aviso: "Este pedido ha cambiado mientras lo editabas. Se muestra la versión actual; revisa y repite tu cambio." Los cambios descartados se listan en el aviso |
| Pedido cobrado | Sin +/- ni cancelar; texto "Pedido cobrado: no se puede modificar" + "Ver ticket" |
| Enviando | "Enviando cambios…" deshabilitado |
| Éxito | Toast "Cambios enviados a barra" / "Pedido 42 cancelado" |

## Criterios cubiertos
| Historia | Criterio UX | Cómo |
|---|---|---|
| HU-06 | Cancelar Pendiente en <= 3 toques | Cancelar pedido, motivo, Cancelar pedido |
| HU-06 | Diálogo con número e importe | Cabecera del diálogo |
| HU-06 | AÑADIDO / ELIMINADO en texto | Etiquetas + tachado (aquí y en barra) |
| HU-04 | Cobro desde el pedido | Primario "Cobrar" |
