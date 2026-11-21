# Historias de usuario — MVP de toma de pedidos para cafetería

> **Simulación:** no ha habido entrevista con el cliente. Las historias, roles y
> supuestos de este documento los ha propuesto el Product Owner y **el humano
> tiene que validarlos** antes de cerrar la puerta de la Etapa 1.

## Lista priorizada (MoSCoW)

| Orden | Historia | Prioridad | Depende de |
|---|---|---|---|
| 1 | [HU-01 Iniciar sesión con mi rol](HU-01-iniciar-sesion-por-rol.md) | Must (alta) | — |
| 2 | [HU-05 Gestionar el menú](HU-05-gestionar-menu.md) | Must (alta) | HU-01 |
| 3 | [HU-02 Tomar un pedido en mostrador o en mesa](HU-02-tomar-pedido.md) | Must (alta) | HU-01, HU-05 |
| 4 | [HU-03 Ver y preparar los pedidos en barra/cocina](HU-03-cola-de-barra.md) | Must (alta) | HU-01, HU-02 |
| 5 | [HU-04 Cobrar y cerrar un pedido](HU-04-cobrar-y-cerrar-pedido.md) | Must (alta) | HU-01, HU-02 |
| 6 | [HU-06 Modificar o cancelar un pedido enviado](HU-06-modificar-cancelar-pedido.md) | Should (media) | HU-01, HU-02, HU-03 (HU-04 para la anulación de cobro) |
| 7 | [HU-07 Gestionar los usuarios del personal](HU-07-gestionar-personal.md) | Should (media) | HU-01 |
| 8 | [HU-08 Resumen de ventas del día (cierre de caja)](HU-08-resumen-ventas-del-dia.md) | Could (baja) | HU-01, HU-04, HU-06 |
| — | [HU-09 Configurar los ajustes del local](HU-09-configurar-ajustes-local.md) **(PROPUESTA [Cambio 2026-11-21], no aprobada)** | Should (media) propuesta | HU-01 |

HU-09 es una propuesta para el humano: si la aprueba, se coloca detrás de HU-07.
Si no, se aplica el supuesto 20 (valores fijados en la instalación).

El orden sigue las dependencias: HU-05 va antes que HU-02 porque sin menú no se
puede tomar un pedido. Con las 5 historias Must ya se cubre el ciclo completo
(tomar, preparar, cobrar).

## Roles / personas

| Rol | Persona | Dispositivo supuesto | Puede |
|---|---|---|---|
| Camarero/cajero | Lucía, toma pedidos en mostrador y en mesas y cobra. Lleva prisa en hora punta. | Tablet de 10" o el TPV del mostrador | Tomar, modificar, cancelar (en "Pendiente") y cobrar pedidos; marcar pedidos como "Servido"; marcar productos como agotados |
| Barra/cocina | Javi, prepara cafés y tostadas. Tiene las manos ocupadas y suele estar a 1-2 m de la pantalla. | Pantalla táctil fija de 24" FHD o más (supuesto 21) | Ver la cola y cambiar el estado de los pedidos hasta "Listo". No ve importes |
| Encargado | Marta, dueña o encargada. Configura el menú, gestiona al personal y cierra la caja. | Cualquiera de los anteriores, u ordenador | Todo lo anterior, más menú, personal, anulaciones, autorizaciones y resumen del día |

## Estados del pedido

Un pedido tiene **dos estados independientes** (supuesto 14):

| Dimensión | Estados | Quién lo cambia |
|---|---|---|
| Preparación | Pendiente → En preparación → Listo → Servido **[Cambio 2026-11-21]**. "Deshacer" en 30 s: En preparación → Pendiente y Listo → En preparación (barra), Servido → Listo (sala) | Barra hasta "Listo" (HU-03); sala marca "Servido" (camarero/cajero o encargado, HU-03, supuesto 18); vuelve a Pendiente si se añaden productos a un pedido Listo o Servido (HU-06) |
| Cobro | Abierto → Cobrado, o Abierto → Cancelado; Cobrado → Abierto solo si el encargado anula el cobro | Camarero/cajero y encargado (HU-04, HU-06) |

- **Cola de barra:** pedidos con preparación Pendiente o En preparación y cobro
  Abierto o Cobrado, más los cancelados hasta que barra confirma la etiqueta
  "CANCELADO".
- **Pantalla "Pedidos" (lista de sala, HU-02) [Cambio 2026-11-21]:** pedidos con
  cobro Abierto (cualquier preparación y fecha) y pedidos con cobro Cobrado que
  aún no están "Servido", solo durante el día en que se enviaron. Su sección
  **"Listos para servir"** (HU-03) contiene los pedidos con preparación Listo.
- **Pedidos por cobrar:** pedidos con cobro Abierto.
- **"Cobrados hoy"** (HU-04): cobros registrados en el día actual.
- Cancelado es definitivo.

| Preparación \ Cobro | Abierto | Cobrado |
|---|---|---|
| Pendiente / En preparación | Cola de barra + "Pedidos" | Cola de barra + "Pedidos" (COBRADO) |
| Listo | "Listos para servir" | "Listos para servir" (COBRADO), hasta fin del día |
| Servido | "Pedidos" (por cobrar) | Solo "Cobrados hoy" |

## Criterios comunes a todas las historias [Cambio 2026-11-21]

- **Accesibilidad:** todas las pantallas cumplen **WCAG 2.2 nivel AA** (incluye
  contraste 1.4.3 y 1.4.11, tamaño de objetivo 2.5.8, foco no tapado 2.4.11 y
  alternativa a arrastrar 2.5.7). Sustituye a las menciones anteriores a
  WCAG 2.1 AA. Se verifica con herramienta automática más revisión manual.

## Supuestos inventados (a validar por el humano)

> Los marcados con **[Cambio 2026-11-21]** se han añadido o modificado al
> resolver los hallazgos del Software Engineer y del UX Designer
> (`docs/estado.md`) y el humano tiene que validarlos igual que los demás.

1. **Un solo local**, con hasta unas 20 mesas numeradas y venta en mostrador/para llevar.
2. **Hasta 15 empleados** dados de alta y **hasta 10 dispositivos** a la vez.
3. **Volumen:** hasta 500 pedidos al día; menú de hasta 200 productos en 20 categorías.
4. Hay **una sola pantalla de preparación** (barra y cocina comparten la cola). No se separan los pedidos por estación.
5. Interfaz **solo en español**; moneda **euro**; **precios con IVA incluido** y un único tipo de IVA por producto. No se desglosa el IVA en el MVP.
6. Se accede con **usuario + PIN de 4 a 6 dígitos** (lo normal en hostelería), no con contraseña ni con tarjeta.
7. El **pago con tarjeta se hace en un datáfono externo** y el cajero solo lo registra a mano. No hay integración.
8. **Tickets:** solo se ven en pantalla, no se imprimen (ver pregunta 1).
9. Los pedidos se **cobran al final** (en mesa) o al momento (en mostrador). Las dos formas se permiten sin forzar ningún orden.
10. El camarero puede marcar un producto como **agotado** sin ser encargado, porque es algo que pasa en plena jornada.
11. Umbrales: pedido "retrasado" a los **10 min** (configurable), cierre de sesión a los **15 min** de inactividad, bloqueo de **5 min tras 5 intentos fallidos**, histórico consultable de **90 días**. **[Cambio 2026-11-21]** Los 90 días son solo la **ventana de consulta** del resumen (HU-08): en el MVP no se borra ningún dato por antigüedad. Cuánto tiempo hay que conservarlos lo decide el humano (pregunta 10).
12. Los tiempos de respuesta se miden en la **red local Wi-Fi del local**.
13. Productos sin variantes ni modificadores con precio (p. ej. "leche de avena +0,30 €"). Las peticiones especiales van en una nota de texto libre y no cambian el precio.
14. **[Cambio 2026-11-21]** El pedido tiene **dos estados independientes**: preparación (Pendiente → En preparación → Listo) y cobro (Abierto → Cobrado / Cancelado). Cobrar no saca un pedido de la cola de barra: un pedido de mostrador cobrado al momento sigue en la cola hasta que barra lo marca "Listo". Ver [Estados del pedido](#estados-del-pedido).
15. **[Cambio 2026-11-21]** **"Día"** = día natural en hora de España peninsular (`Europe/Madrid`), de 00:00:00 a 23:59:59. El número correlativo de pedido (HU-02) se reinicia a las 00:00 y el resumen de HU-08 usa el mismo criterio (un cobro después de medianoche cuenta en el día nuevo). Supone que el local está en la península o Baleares y **cierra antes de medianoche** (ver pregunta 14).
16. **[Cambio 2026-11-21]** **Anular un cobro** (solo encargado, HU-04) afecta al cobro completo: si fue "Cobrar mesa", todos los pedidos que cubría vuelven a cobro "Abierto"; no se puede anular un solo pedido de ese cobro. El cobro anulado no se borra y cuenta en "cobros anulados" del día del cobro original (HU-08). Los pedidos se pueden volver a cobrar con un cobro nuevo.
17. **[Cambio 2026-11-21]** Si se añaden productos a un pedido ya "Listo" y sin cobrar (HU-06), el pedido vuelve a "Pendiente" y a la cola de barra con las líneas nuevas marcadas "AÑADIDO". Un pedido cancelado no se puede reabrir. **[Cambio 2026-11-21]** Lo mismo se aplica a un pedido "Servido" (supuesto 18).
18. **[Cambio 2026-11-21]** **Estado "Servido"** (propuesta del PO que cierra de forma provisional la pregunta 13): la dimensión de preparación gana un cuarto estado, Pendiente → En preparación → Listo → **Servido**. El cobro sigue siendo una dimensión independiente y no cambia. Barra marca "Listo"; el camarero/cajero o el encargado marca "Servido" con 1 toque desde la pantalla "Pedidos" cuando entrega el pedido (en mesa o en mostrador), con "Deshacer" de 30 s. Un pedido "Listo" se ve en "Listos para servir" tanto si está cobrado como si no; al marcarlo "Servido" sale de esa sección. Un pedido cobrado y servido sale de la lista de sala; uno servido sin cobrar sigue en ella hasta cobrarlo. Si nadie marca "Servido" un pedido cobrado, deja de verse al acabar su día. Barra **no** puede marcar "Servido" (no tiene los pedidos listos en su pantalla); si en el local real barra entrega directamente los pedidos de mostrador, el humano debe decirlo. Alternativa descartada: ocultar los listos pasados X minutos, porque un pedido listo y no entregado desaparecería sin que nadie lo haya servido.
19. **[Cambio 2026-11-21]** Todos los camareros/cajeros ven **todos los pedidos del local** en la pantalla "Pedidos", no solo los que han tomado ellos (local pequeño, el personal se reparte las mesas).
20. **[Cambio 2026-11-21]** **Ajustes del local:** número de mesas entre 1 y 99 (por defecto 20) y umbral de retraso entre 1 y 60 min (por defecto 10). Se configuran en HU-09 si el humano la aprueba; si no, se fijan en la instalación con esos valores por defecto.
21. **[Cambio 2026-11-21]** **Pantalla de barra de 24" FHD (1920x1080) o mayor.** Es lo que permite a la vez texto legible a 1,5 m (mayúsculas >= 7 mm, unos 16 minutos de arco) y 6 pedidos a la vez sin desplazar. Con una pantalla de 15" el texto tendría que medir unos 56 px y no cabrían 6 pedidos de 5 líneas. **Tiene coste para el cliente** (ligado a la pregunta 7): si el cliente ya tiene una pantalla más pequeña, hay que rebajar la distancia de lectura o el número de pedidos visibles.
22. **[Cambio 2026-11-21]** **Autorización del encargado (HU-06):** se elige el encargado y se introduce su PIN, en el mismo dispositivo, para una sola acción. Si quien tiene la sesión abierta ya es encargado, no se le vuelve a pedir. La parte de seguridad (longitud del PIN, intentos, bloqueo, si se exige reautenticación) la decide Cybersecurity.

## Fuera del alcance del MVP

- Integración con datáfono o pasarela de pago (pago con tarjeta integrado).
- Impresión de tickets o comandas e impresoras de cocina.
- Ticket o factura fiscal y cumplimiento de VeriFactu/TicketBAI (pendiente de confirmar, ver pregunta 1).
- Pedidos a domicilio (delivery) y plataformas externas (Glovo, Uber Eats, Just Eat).
- Pedidos hechos por el propio cliente (QR en mesa, web, app, quiosco).
- Programa de fidelización, cupones, descuentos y promociones.
- Dividir la cuenta entre varios comensales y pagos mixtos (parte en efectivo y parte con tarjeta).
- Propinas.
- Reservas y plano gráfico de mesas.
- Inventario, stock automático, escandallos y proveedores.
- Modificadores o variantes de producto con precio propio.
- Varios locales o franquicias.
- Funcionamiento sin conexión (offline). Solo se exige no perder el pedido en edición y no duplicarlo (HU-02).
- Informes avanzados (más allá del resumen diario de HU-08) y exportación contable.
- Varios idiomas.

## Preguntas abiertas para el cliente

1. **Obligación fiscal:** ¿el software tiene que emitir tickets o facturas que cumplan la normativa (VeriFactu, o TicketBAI si el local está en el País Vasco)? ¿O ya usan otra caja registradora o TPV fiscal? Esto puede pasar de "fuera de alcance" a **Must** y es lo que más afecta al alcance.
2. ¿Necesitan **imprimir** tickets para el cliente o comandas para barra?
3. ¿Barra y cocina son **una sola estación** o necesitan pantallas separadas (bebidas en barra, comida en cocina)?
4. ¿Se ofrecen **variantes con precio** (tamaño, tipo de leche, extras)? ¿Bastaría con notas de texto sin precio?
5. ¿Se cobra **antes** (en mostrador) o **después** (en mesa), o las dos cosas? ¿Hace falta **dividir la cuenta**?
6. ¿Cuántas **mesas, empleados y dispositivos** hay de verdad, y cuántos pedidos sirven en un día punta?
7. ¿Qué **dispositivos** tienen ya (tablets, TPV, pantalla en barra) o están dispuestos a comprar?
8. ¿Les vale el acceso con **PIN** o prefieren otro método?
9. ¿Un camarero puede **cancelar** un pedido sin autorización o siempre debe autorizarlo el encargado?
10. ¿Cuánto tiempo deben **guardarse** los datos de ventas? (90 días de consulta es un supuesto. La conservación legal puede ser mayor y la decidirá el área correspondiente.)
11. ¿Cómo esperan que funcione el sistema si **se cae el Wi-Fi o internet**?
12. ¿Necesitan **varios tipos de IVA** (p. ej. consumo en local frente a para llevar) o desglosar el IVA en el ticket?
13. **[Cerrada de forma provisional 2026-11-21 con el supuesto 18: estado "Servido"; el humano tiene que confirmarlo]** Cuando un pedido ya cobrado (p. ej. de mostrador) pasa a "Listo", ¿cómo sabe el camarero que tiene que entregarlo y **hasta cuándo debe seguir viéndolo**? ¿Hace falta un estado "Entregado" o basta con que barra lo entregue directamente? Hoy las historias solo exigen que el camarero lo vea marcado "Listo" (HU-03); no definen cuándo deja de mostrarse.
14. **[Nueva 2026-11-21]** ¿A qué hora **cierra el local**? ¿Alguna vez trabaja después de medianoche? Si es así, hace falta una "jornada" con hora de corte configurable en lugar del día natural (supuesto 15). ¿El local está en la península o Baleares (si está en Canarias, la hora es otra)?
