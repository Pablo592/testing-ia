# Historias de usuario — MVP de toma de pedidos para cafetería

> **Simulación:** no ha habido entrevista con el cliente. Las historias, roles y
> supuestos de este documento los ha propuesto el Product Owner.
> **[Cambio 2026-11-23, 1.1e]** El humano ha validado los supuestos 1–24 y ha
> cerrado las preguntas 1–14 con el criterio "los supuestos que supongan una
> menor carga" (`docs/estado.md`, "Decisiones del humano"). HU-09 queda fuera
> del MVP. Falta la aprobación de la puerta de la Etapa 1.

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
| — | ~~[HU-09 Configurar los ajustes del local](HU-09-configurar-ajustes-local.md)~~ **FUERA DEL MVP [Cambio 2026-11-23, 1.1e]** | Fuera del MVP (descartada por el humano el 2026-11-23) | — |

**[Cambio 2026-11-23, 1.1e]** HU-09 la ha descartado el humano el 2026-11-23:
no se diseña, implementa ni prueba en el MVP. Se aplica el supuesto 20: 20 mesas
y aviso de retraso a los 10 min, fijados en la instalación. El archivo se
conserva como referencia por si se recupera más adelante.

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

## Identificadores de los criterios [Cambio 2026-11-21]

Cada criterio de aceptación empieza por un ID estable (hallazgo T-01 de
Testing), para poder trazarlo a sus tests:

| Prefijo | Sección | Ejemplo |
|---|---|---|
| `CA-F` | Funcionales | `**CA-F01**` |
| `CA-U` | UX (medibles) | `**CA-U01**` |
| `CA-N` | No funcionales | `**CA-N01**` |

- El ID es único **dentro de cada historia**. Fuera de ella se cita con la
  historia delante: `HU-03/CA-F06`.
- Se numera con dos dígitos, de forma correlativa dentro de cada prefijo: el
  criterio nuevo recibe el número siguiente al más alto que haya existido en
  esa historia y prefijo.
- **Un ID nunca se renumera**, aunque se reordene o se modifique el criterio.
  Por eso el orden de lectura no tiene por qué coincidir con el numérico (p. ej.
  en HU-03 `CA-F23` va detrás de `CA-F01`).
- **Un criterio eliminado retira su ID**: no se reutiliza para otro criterio.
  Se deja la línea `**CA-Fxx** [Retirado AAAA-MM-DD: motivo]` para que los
  tests que lo citaban se puedan localizar.
- Si un criterio cambia de significado, se modifica con una marca
  `[Cambio AAAA-MM-DD, origen]` y conserva su ID; Testing revisa sus tests.

## Interpretaciones de Testing confirmadas por el PO [Cambio 2026-11-23, 1.1f]

Testing aplica estas lecturas en sus tests (`docs/testing.md` §4.5). El PO las
confirma o corrige con el criterio del humano "menor carga" que siga siendo
verificable. Forman parte de los criterios citados: si alguna cambia, se marca
aquí y en el criterio.

| ID | Criterio | Resultado | Lectura vigente |
|---|---|---|---|
| I-01 | HU-01/CA-F06 | **Confirmada** | El 5.º fallo consecutivo activa el bloqueo; durante el bloqueo los intentos se rechazan sin verificar el PIN (también con PIN correcto) y no cuentan. Al expirar, el contador no se reinicia: 10 acumulados → 15 min, 15 → 60 min, 20 → indefinido. Igual para la reconfirmación (HU-01/CA-F12) |
| I-02 | HU-01/CA-F11, HU-06/CA-F17 | **Confirmada** | "Dispositivo" = IP de origen que ve el servidor; ventana móvil de 10 min; el rechazo dura 10 min desde el 10.º fallo y se aplica antes de verificar el PIN. En la topología B (VM) equivale a todo el local: lo decide Cybersecurity/Infrastructure (SEC-019), no cambia el criterio |
| I-03 | HU-01/CA-F06, CA-F11, CA-F12; HU-06/CA-F19 | **Confirmada** | "X min" = minutos restantes redondeados hacia arriba (4 min 1 s → "5 min"); nunca "0 min" |
| I-04 | HU-03/CA-F06 | **Confirmada** | Retrasado con espera >= N min (el criterio ya dice "N minutos o más"); a N − 1 s no se resalta; a N + 60 s está resaltado |
| I-05 | HU-04/CA-U04 | **Confirmada** | "Sin desplazar" en 1280x800, 800x1280 (supuesto 23) y en el TPV de mostrador a 1024x768 (persona camarero/cajero y design system) |
| I-06 | HU-05/CA-N03 | **Corregida** | Ya no aplica la lectura amplia: CA-N03 es una **lista cerrada** (HU-02/CA-N01, CA-U05, CA-F23, CA-N05 y HU-05/CA-F04), resuelto en T-17 |
| I-07 | HU-02/CA-U05 y cualquier p95 que no cite el supuesto 12 | **Confirmada** | Al menos 200 muestras por métrica, como en el supuesto 12 |
| I-08 | Supuesto 12 y criterios de dispositivo real | **Confirmada** | Rendimiento del supuesto 12: vinculante en TESTING; DEMO solo observa. Los criterios con hardware real (HU-03/CA-U01, HU-03/CA-N05) y HU-02/CA-U05 (dispositivo de referencia) se verifican en ese hardware y su resultado es vinculante |
| I-09 | HU-03/CA-F14 | **Confirmada e incorporada** | "En cuanto se detecta" pasa a "<= 1 s desde que se abre la cola o desde que falla un aviso" en el propio criterio (T-15) |
| I-10 | HU-04/CA-F23, HU-07/CA-N04 | **Confirmada** | Un PIN de reconfirmación incorrecto cuenta como 1 fallo del encargado de la sesión (HU-01/CA-F06) y 1 fallo del dispositivo (HU-01/CA-F11), igual que una autorización de HU-06. El límite adicional por sesión es una decisión de Cybersecurity (`docs/seguridad.md` §6.1.4) y no añade mensaje propio en las historias |

## Supuestos (validados por el humano el 2026-11-23)

> **[Cambio 2026-11-23, 1.1e]** **Los supuestos 1–24 están validados por el
> humano (2026-11-23)**, con el criterio "los supuestos que supongan una menor
> carga" (`docs/estado.md`, "Decisiones del humano"). Se aceptan tal como
> estaban salvo el **12**, que se modifica (ya no se exige cumplir en DEMO), y
> el **20**, que queda con los valores fijos de instalación porque HU-09 sale
> del MVP. El 18 ("Servido") queda confirmado.
>
> Los marcados con **[Cambio 2026-11-21]** se añadieron o modificaron al
> resolver los hallazgos del Software Engineer, del UX Designer, de Testing
> (T-01..T-09) y de Cybersecurity (SEC-001, SEC-004, SEC-007, SEC-008)
> (`docs/estado.md`).

1. **Un solo local**, con hasta unas 20 mesas numeradas y venta en mostrador/para llevar.
2. **Hasta 15 empleados** dados de alta y **hasta 10 dispositivos** a la vez.
3. **Volumen:** hasta 500 pedidos al día; menú de hasta 200 productos en 20 categorías.
4. Hay **una sola pantalla de preparación** (barra y cocina comparten la cola). No se separan los pedidos por estación.
5. Interfaz **solo en español**; moneda **euro**; **precios con IVA incluido** y un único tipo de IVA por producto. No se desglosa el IVA en el MVP.
6. Se accede con **usuario + PIN de 4 a 6 dígitos** (lo normal en hostelería), no con contraseña ni con tarjeta. **[Cambio 2026-11-21, SEC-001]** El rol encargado usa siempre un PIN de **6 dígitos**; camarero/cajero y barra, de 4 a 6. Se rechazan los PIN triviales (todos iguales, secuencias, bloques repetidos, lista de PIN comunes) (HU-01/CA-N01, HU-07/CA-F06). Decisión de Cybersecurity (`docs/seguridad.md` §6.1).
7. El **pago con tarjeta se hace en un datáfono externo** y el cajero solo lo registra a mano. No hay integración.
8. **Tickets:** solo se ven en pantalla, no se imprimen (ver pregunta 1).
9. Los pedidos se **cobran al final** (en mesa) o al momento (en mostrador). Las dos formas se permiten sin forzar ningún orden.
10. El camarero puede marcar un producto como **agotado** sin ser encargado, porque es algo que pasa en plena jornada.
11. Umbrales: pedido "retrasado" a los **10 min** (fijado en la instalación, supuesto 20 **[Cambio 2026-11-23, 1.1e]**), cierre de sesión a los **15 min** de inactividad, bloqueo de **5 min tras 5 intentos fallidos**, histórico consultable de **90 días**. **[Cambio 2026-11-21]** Los 90 días son solo la **ventana de consulta** del resumen (HU-08): en el MVP no se borra ningún dato por antigüedad. Cuánto tiempo hay que conservarlos lo decide el humano (pregunta 10). **[Cambio 2026-11-21, SEC-001, SEC-004]** El bloqueo "5 min tras 5 intentos" pasa a ser **progresivo**: 5 min, 15 min, 60 min y, a los 20 fallos consecutivos, bloqueo hasta que lo desbloquee un encargado; además, 10 fallos desde un mismo dispositivo en 10 min bloquean ese dispositivo 10 min (HU-01/CA-F06, CA-F11). Toda sesión, incluida la de barra, caduca como máximo a las **12 h** de iniciarla (HU-01/CA-N06).
12. Los tiempos de respuesta se refieren al uso en la **red local Wi-Fi del local**, que TESTING emula **[Cambio 2026-11-23, 1.1e]**. **[Cambio 2026-11-21, T-02]** Condiciones de medida de todos los criterios de rendimiento que citan este supuesto (HU-01/CA-N03, HU-02/CA-N01 y CA-F23, HU-03/CA-N01 y CA-F15, HU-04/CA-N04, HU-05/CA-F04, HU-06/CA-N02, HU-08/CA-N02; HU-09/CA-F02 ya no aplica porque HU-09 está fuera del MVP **[Cambio 2026-11-23, 1.1e]**):
    - **TESTING (vinculante):** los criterios de rendimiento **se verifican** aquí. Red emulada con RTT +40 ms, jitter 20 ms y 1 % de pérdida de paquetes; **10 dispositivos conectados a la vez** (cuando el criterio lo indica, las 10 acciones son simultáneas, p. ej. 10 inicios de sesión o 10 cobros de pedidos distintos); menú de **200 productos en 20 categorías** (supuesto 3); **al menos 200 muestras** por métrica; el resultado es el percentil 95 (p95) de esas muestras. Un criterio de rendimiento se da por cumplido si se cumple en TESTING.
    - **DEMO (solo observación) [Cambio 2026-11-23, decisión del humano]:** con los dispositivos y la Wi-Fi reales del local los tiempos **solo se observan**. Una desviación respecto al criterio se registra como hallazgo en `docs/estado.md`, pero **no bloquea por sí sola** la validación de la historia ni la puerta de la Etapa 4.
    - ~~Un criterio se da por cumplido solo si se cumple en los dos entornos.~~ [Retirado 2026-11-23 por decisión del humano.]
13. Productos sin variantes ni modificadores con precio (p. ej. "leche de avena +0,30 €"). Las peticiones especiales van en una nota de texto libre y no cambian el precio.
14. **[Cambio 2026-11-21]** El pedido tiene **dos estados independientes**: preparación (Pendiente → En preparación → Listo) y cobro (Abierto → Cobrado / Cancelado). Cobrar no saca un pedido de la cola de barra: un pedido de mostrador cobrado al momento sigue en la cola hasta que barra lo marca "Listo". Ver [Estados del pedido](#estados-del-pedido).
15. **[Cambio 2026-11-21]** **"Día"** = día natural en hora de España peninsular (`Europe/Madrid`), de 00:00:00 a 23:59:59. El número correlativo de pedido (HU-02) se reinicia a las 00:00 y el resumen de HU-08 usa el mismo criterio (un cobro después de medianoche cuenta en el día nuevo). Supone que el local está en la península o Baleares y **cierra antes de medianoche** (ver pregunta 14).
16. **[Cambio 2026-11-21]** **Anular un cobro** (solo encargado, HU-04) afecta al cobro completo: si fue "Cobrar mesa", todos los pedidos que cubría vuelven a cobro "Abierto"; no se puede anular un solo pedido de ese cobro. El cobro anulado no se borra y cuenta en "cobros anulados" del día del cobro original (HU-08). Los pedidos se pueden volver a cobrar con un cobro nuevo.
17. **[Cambio 2026-11-21]** Si se añaden productos a un pedido ya "Listo" y sin cobrar (HU-06), el pedido vuelve a "Pendiente" y a la cola de barra con las líneas nuevas marcadas "AÑADIDO". Un pedido cancelado no se puede reabrir. **[Cambio 2026-11-21]** Lo mismo se aplica a un pedido "Servido" (supuesto 18).
18. **[Cambio 2026-11-21]** **Estado "Servido"** (propuesta del PO; **confirmado por el humano el 2026-11-23**, cierra la pregunta 13 **[Cambio 2026-11-23, 1.1e]**): la dimensión de preparación gana un cuarto estado, Pendiente → En preparación → Listo → **Servido**. El cobro sigue siendo una dimensión independiente y no cambia. Barra marca "Listo"; el camarero/cajero o el encargado marca "Servido" con 1 toque desde la pantalla "Pedidos" cuando entrega el pedido (en mesa o en mostrador), con "Deshacer" de 30 s. Un pedido "Listo" se ve en "Listos para servir" tanto si está cobrado como si no; al marcarlo "Servido" sale de esa sección. Un pedido cobrado y servido sale de la lista de sala; uno servido sin cobrar sigue en ella hasta cobrarlo. Si nadie marca "Servido" un pedido cobrado, deja de verse al acabar su día. Barra **no** puede marcar "Servido" (no tiene los pedidos listos en su pantalla); si en el local real barra entrega directamente los pedidos de mostrador, el humano debe decirlo. Alternativa descartada: ocultar los listos pasados X minutos, porque un pedido listo y no entregado desaparecería sin que nadie lo haya servido.
19. **[Cambio 2026-11-21]** Todos los camareros/cajeros ven **todos los pedidos del local** en la pantalla "Pedidos", no solo los que han tomado ellos (local pequeño, el personal se reparte las mesas).
20. **[Cambio 2026-11-21]** **Ajustes del local:** número de mesas entre 1 y 99 (por defecto 20) y umbral de retraso entre 1 y 60 min (por defecto 10). ~~Se configuran en HU-09 si el humano la aprueba; si no, se fijan en la instalación con esos valores por defecto.~~ **[Cambio 2026-11-23, 1.1e, decisión del humano]** HU-09 queda fuera del MVP: en el MVP los valores son **fijos en la instalación: 20 mesas y aviso de retraso a los 10 min**. No hay pantalla para cambiarlos; solo cambian reinstalando o mediante soporte técnico. Los rangos 1–99 y 1–60 solo se usarían si HU-09 se recupera más adelante.
21. **[Cambio 2026-11-21]** **Pantalla de barra de 24" FHD (1920x1080) o mayor.** Es lo que permite a la vez texto legible a 1,5 m (mayúsculas >= 7 mm, unos 16 minutos de arco) y 6 pedidos a la vez sin desplazar. Con una pantalla de 15" el texto tendría que medir unos 56 px y no cabrían 6 pedidos de 5 líneas. **Tiene coste para el cliente** (ligado a la pregunta 7): si el cliente ya tiene una pantalla más pequeña, hay que rebajar la distancia de lectura o el número de pedidos visibles.
22. **[Cambio 2026-11-21]** **Autorización del encargado (HU-06):** se elige el encargado y se introduce su PIN, en el mismo dispositivo, para una sola acción. Si quien tiene la sesión abierta ya es encargado, no se le vuelve a pedir. La parte de seguridad (longitud del PIN, intentos, bloqueo, si se exige reautenticación) la decide Cybersecurity. **[Cambio 2026-11-21, SEC-001, SEC-007]** Decidido por Cybersecurity (`docs/seguridad.md` §6.3): los fallos cuentan para el bloqueo del encargado elegido y para el del dispositivo; 5 autorizaciones fallidas en una sesión en 10 min bloquean las autorizaciones 10 min; un encargado bloqueado, desactivado o con PIN provisional no autoriza (HU-06/CA-F17..CA-F19). El encargado con sesión propia no reintroduce el PIN en HU-06, pero **sí** al anular un cobro (HU-04/CA-F23) y en las escrituras de Personal (HU-07/CA-N04).
23. **[Cambio 2026-11-21, T-03, T-07]** **Dispositivo de referencia de sala:** la tablet de 10" que defina el cliente (pregunta 7). Mientras no exista, los criterios que dependen del dispositivo (HU-02/CA-U05) se miden en Chromium con la CPU ralentizada x4. Las vistas de tablet se verifican a **1280x800 CSS px** (horizontal) y **800x1280 CSS px** (vertical) (HU-02/CA-N05). Si la tablet real tiene otra resolución, se sustituyen esos valores por los suyos.
24. **[Cambio 2026-11-21, T-04]** **Hora de entrada en la cola:** es la hora de envío del pedido o, si el pedido vuelve a la cola desde "Listo" o "Servido" porque se le añaden productos, la hora de ese añadido. La cola se ordena por esta hora, y los minutos de espera y el aviso de "retrasado" se cuentan desde ella; pasar de "Pendiente" a "En preparación" no reinicia la cuenta, y añadir o quitar productos a un pedido que sigue en la cola tampoco (HU-03/CA-F01, CA-F02, CA-F06, CA-F23, CA-F24; HU-06/CA-F08). La tarjeta conserva la hora de envío original y muestra "AÑADIDO hh:mm". Origen: propuesta T-04 de Testing y decisión técnica del Software Engineer (`docs/arquitectura.md` §4.2).
25. **[Nuevo 2026-11-24, 2.0, H-1.7g-01, decisión del humano]** **Los "Cobros tras el cierre" no separan efectivo y tarjeta.** En la sección aparte de un día cerrado (HU-08/CA-F05), los "Cobros tras el cierre" (HU-08/CA-F15 (c)) solo muestran número e importe, sin desglose por forma de pago. **Consecuencia:** el efectivo que entra en caja después de guardar el cierre **no se concilia en ninguna pantalla**: no suma al efectivo esperado ni a la diferencia de caja del cierre guardado (HU-08/CA-F04, CA-F15 (b)), y la sección aparte no da una cifra de efectivo con la que comparar la caja. Si el encargado cuenta la caja después de esos cobros, la diferencia con el cierre guardado tendrá que explicarla él fuera de la aplicación. Origen: hallazgo H-1.7g-01 de UX (`docs/ux/wireframes/09-resumen-dia.md`) y decisión del humano del 2026-11-24 (`docs/estado.md`, "Decisiones del humano"). No cambia ningún criterio.

## Fuera del alcance del MVP

- Integración con datáfono o pasarela de pago (pago con tarjeta integrado).
- Impresión de tickets o comandas e impresoras de cocina.
- Ticket o factura fiscal y cumplimiento de VeriFactu/TicketBAI: el local usa otra caja o TPV fiscal (pregunta 1, cerrada 2026-11-23) **[Cambio 2026-11-23, 1.1e]**.
- **[Cambio 2026-11-23, 1.1e]** Configurar desde la aplicación el número de mesas y el umbral de retraso (HU-09, descartada por el humano): valores fijos en la instalación (supuesto 20).
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

**[Cambio 2026-11-23, 1.1e]** No queda ninguna pregunta abierta. Las 14 se han
cerrado por decisión del humano (ver la sección siguiente).

## Preguntas cerradas

**[Cambio 2026-11-23, 1.1e]** Las preguntas 1–14 quedan **cerradas el
2026-11-23 por decisión del humano**, con el criterio "los supuestos que
supongan una menor carga" (`docs/estado.md`, "Decisiones del humano"). Cada una
se cierra con el supuesto vigente del PO, que era ya el de menor alcance. Se
conserva el texto original de cada pregunta debajo de su cierre.

| # | Tema | Cerrada 2026-11-23 por decisión del humano con |
|---|---|---|
| 1 | Obligación fiscal | Sin ticket ni factura fiscal: el local usa otra caja o TPV fiscal. Sigue fuera del alcance ("Fuera del alcance del MVP") |
| 2 | Impresión | Sin impresión de tickets ni comandas (supuesto 8) |
| 3 | Estaciones de preparación | Una sola estación; barra y cocina comparten la cola (supuesto 4) |
| 4 | Variantes con precio | Sin variantes ni modificadores con precio; peticiones en nota de texto (supuesto 13) |
| 5 | Momento del cobro y dividir la cuenta | Cobro antes o después, sin orden forzado (supuesto 9); sin dividir la cuenta ni pagos mixtos (fuera del alcance) |
| 6 | Tamaño real del local | Hasta 20 mesas, 15 empleados, 10 dispositivos y 500 pedidos/día; menú de 200 productos (supuestos 1, 2 y 3) |
| 7 | Dispositivos | Tablet de 10" en sala y pantalla de barra de 24" FHD o más (supuestos 21 y 23); mientras no se defina la tablet real, se mide con Chromium y CPU x4 (supuesto 23) |
| 8 | Método de acceso | Usuario + PIN (supuestos 6 y 11) |
| 9 | Cancelación | Según HU-06: sin autorización si el pedido está en "Pendiente" (HU-06/CA-F09); en "En preparación", "Listo" o "Servido", con autorización del encargado (HU-06/CA-F05, supuesto 22) |
| 10 | Conservación de datos | En el MVP no se borra ningún dato; 90 días es solo la ventana de consulta del resumen (supuesto 11, HU-08/CA-F12) |
| 11 | Caída del Wi-Fi o internet | Sin modo sin conexión: solo aviso "Sin conexión" y conservación del pedido en edición sin duplicados (fuera del alcance; HU-02/CA-N02, HU-03/CA-N02) |
| 12 | Tipos de IVA | Un solo tipo de IVA por producto, precios con IVA incluido y sin desglose (supuesto 5) |
| 13 | Pedido cobrado y "Listo" | Estado "Servido" confirmado (supuesto 18). Quitarlo obligaría a rehacer historias, wireframes y arquitectura |
| 14 | Horario y zona horaria | El local cierra antes de medianoche y está en `Europe/Madrid`; "día" = día natural (supuesto 15) |

Texto original de las preguntas:

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
13. **[Cerrada 2026-11-23 por decisión del humano: supuesto 18, estado "Servido" confirmado]** Cuando un pedido ya cobrado (p. ej. de mostrador) pasa a "Listo", ¿cómo sabe el camarero que tiene que entregarlo y **hasta cuándo debe seguir viéndolo**? ¿Hace falta un estado "Entregado" o basta con que barra lo entregue directamente? Hoy las historias solo exigen que el camarero lo vea marcado "Listo" (HU-03); no definen cuándo deja de mostrarse.
14. **[Nueva 2026-11-21]** ¿A qué hora **cierra el local**? ¿Alguna vez trabaja después de medianoche? Si es así, hace falta una "jornada" con hora de corte configurable en lugar del día natural (supuesto 15). ¿El local está en la península o Baleares (si está en Canarias, la hora es otra)?

## Registro de cambios

- **2026-11-24, tarea 2.1g [Cambio 2026-11-24, 2.1g]** (hallazgo T-33 de
  Testing y hallazgo opcional H-2.1d-02 de UX). Solo redacción, sin cambio de
  alcance:
  - **T-33 aceptado:** HU-01/CA-F13 quita la marca "A confirmar por
    Cybersecurity". Los dos puntos que dejó el PO como provisionales están
    confirmados en `docs/seguridad.md` §6.4: (1) todo bloqueo indefinido, sea
    cual sea el origen de los fallos (incluidos los inicios de sesión desde
    otro dispositivo), revoca todas las sesiones de la cuenta; (2) una pantalla
    sin interacción vuelve al inicio de sesión en <= 1 s (RS-14). La conducta
    verificable es la que ya se testeaba.
  - **H-2.1d-02 aceptado:** HU-01/CA-F12 (c) dice "los datos escritos no se
    pierden (salvo los PIN, que se vacían siempre, CA-U03 y RS-29b)", también en
    la reconfirmación.
  - Mismos IDs; ninguno nuevo, retirado ni renumerado.

- **2026-11-24, tarea 2.0 [Cambio 2026-11-24, 2.0]** (hallazgo H-1.7g-01 de
  UX, `docs/ux/wireframes/09-resumen-dia.md`; decisión del humano del
  2026-11-24 en `docs/estado.md`, "Decisiones del humano"): **supuesto 25
  nuevo.** Los "Cobros tras el cierre" de HU-08/CA-F15 (c) no separan efectivo
  y tarjeta, solo número e importe; por eso el efectivo que entra en caja
  después del cierre no se concilia en ninguna pantalla (HU-08/CA-F04). Solo
  se documenta lo que ya dicen los criterios: ningún criterio cambia y ningún
  ID es nuevo, retirado ni renumerado.

- **2026-11-24, ronda 1.7k [Cambio 2026-11-24, 1.7k]** (hallazgos T-23..T-25 e
  interpretaciones I-13..I-16 de Testing, `docs/testing.md` §4.5 y §14.4;
  petición del Software Engineer de la 1.7h, `docs/arquitectura.md` §4.4;
  criterio del humano "menor carga"). Solo redacción, sin cambio de alcance:
  - **T-23 aceptado, I-13 confirmada:** en HU-08, "antes del cierre" = hora
    anterior a la hora del cierre guardado; "después del cierre" = hora igual o
    posterior (el mismo instante va a la sección aparte). Cada cobro, anulación
    y cancelación está en las cifras guardadas o en la sección, nunca en las dos
    ni en ninguna. Se escribe en HU-08/CA-F05 y se aplica en CA-F07 ("antes de
    la hora del cierre") y CA-F15.
  - **T-24 aceptado, I-16 confirmada:** HU-08/CA-F05 dice "los pedidos
    cancelados ese día después del cierre, sea cual sea el día del pedido"
    (CA-F11); un pedido cancelado en un día posterior cuenta en ese día.
  - **T-25 aceptado, I-15 confirmada:** HU-08/CA-F03 dice que el aviso "Hay N
    pedidos sin cobrar" se calcula al consultar, también en un día cerrado, y no
    es una cifra guardada del cierre (CA-F05 lo repite).
  - **I-14 confirmada:** HU-08/CA-F15 (d) dice que un cobro tras el cierre que
    se anula cuenta por su importe completo en "Cobros anulados" de la sección,
    en la fila del encargado que anuló con "No aplica (encargado)", y en la
    sección del día del cobro original aunque se anule otro día.
  - **Petición del Software Engineer (1.7h):** HU-08/CA-F05 dice que una
    anulación posterior al cierre no resta de los productos vendidos guardados
    del día cerrado (como CA-F15 (b) para los cobros); en un día cerrado,
    CA-F09 se aplica a la sección aparte.
  - Mismos IDs; ninguno nuevo, retirado ni renumerado.

- **2026-11-24, ronda 1.7f [Cambio 2026-11-24, 1.7f]** (hallazgo H-1.7e-01 de
  UX, `docs/ux/wireframes/09-resumen-dia.md`; criterio del humano "menor
  carga"): **HU-08/CA-F15 nuevo.** Un cobro registrado en un día ya cerrado
  después del cierre cuenta en ese día, el de su registro (HU-08/CA-F08,
  HU-04/CA-F16), no cambia el cierre guardado (cifras, desglose ni productos
  vendidos) y aparece en la sección aparte de CA-F05 como "Cobros tras el
  cierre", en la fila del usuario que cobró con "Sin autorización". Si después
  se anula, pasa a "Cobros anulados" de esa sección. Un cobro registrado en un
  día posterior al del pedido cuenta en ese día posterior y no aparece en la
  sección del día del pedido. Se descarta trasladar el cobro al día siguiente
  o bloquear los cobros de un día cerrado: más carga y en contra de CA-F08.
  HU-08/CA-F05 remite a CA-F15 y HU-08/CA-F07 precisa la comprobación en un día
  cerrado (marca de cambio en los dos). ID nuevo: HU-08/CA-F15. Ninguno
  retirado ni renumerado.

- **2026-11-23, ronda 1.7d [Cambio 2026-11-23, 1.7d]** (interpretaciones de UX
  sobre HU-08/CA-F13, `docs/ux/wireframes/09-resumen-dia.md`; criterio "menor
  carga"): confirmadas las dos. HU-08/CA-F13 precisa que en las anulaciones de
  cobro el autorizador es "No aplica (encargado)" y que, en un día cerrado, el
  desglose usa las cifras del cierre guardado y las anulaciones posteriores van
  en la sección aparte de CA-F05. **Decisión del orquestador del 2026-11-23
  con el criterio del humano "menor carga":** HU-08/CA-F05 se amplía para que
  los pedidos cancelados el mismo día después del cierre vayan también en esa
  sección aparte, con quién los canceló y quién autorizó, sin cambiar el cierre
  guardado. Mismos IDs; ninguno nuevo, retirado ni renumerado.

- **2026-11-23, ronda 1.1f [Cambio 2026-11-23, 1.1f]** (hallazgos T-14..T-17 e
  interpretaciones I-01..I-10 de Testing, `docs/testing.md` §4.5 y §14.2;
  criterio del humano "menor carga"):
  - **T-14 aceptado:** HU-01/CA-F12 nuevo (bloqueo temporal: la sesión sigue
    abierta y la reconfirmación del propio PIN se rechaza sin comprobarlo con
    "Cuenta bloqueada. Espera X min", sin perder los datos) y HU-01/CA-F13 nuevo
    (bloqueo indefinido alcanzado desde una sesión propia: se revocan todas sus
    sesiones, según SEC-016). A confirmar por Cybersecurity: aplicar también la
    revocación cuando el bloqueo indefinido llega por inicios de sesión desde
    otro dispositivo, y el plazo de <= 1 s para pantallas sin interacción.
    HU-04/CA-F23 y HU-07/CA-N04 remiten a ellos (sin cambio de significado).
  - **T-15 aceptado:** HU-03/CA-F14 "<= 1 s"; HU-03/CA-F09 conserva la
    preferencia de sonido en el dispositivo (recarga y nuevo inicio de sesión).
  - **T-16 aceptado con cambio:** HU-03/CA-N05 se verifica solo con el apagado
    automático en su valor mínimo distinto de "nunca" (no también con el valor
    del local: el mínimo es el caso más exigente y basta una configuración).
  - **T-17 aceptado (lista cerrada):** HU-05/CA-N03 enumera sus criterios y
    añade HU-02/CA-N05, el único de HU-02 sin rendimiento en el que 20
    categorías pueden fallar (vista de tablet). Se descarta la lectura amplia.
  - **I-01..I-10:** confirmadas I-01..I-05, I-07, I-08, I-10; I-09 confirmada e
    incorporada a HU-03/CA-F14; I-06 corregida por T-17. Tabla en
    [Interpretaciones de Testing](#interpretaciones-de-testing-confirmadas-por-el-po-cambio-2026-11-23-11f).
  - IDs nuevos: HU-01/CA-F12, CA-F13. Ninguno retirado ni renumerado.

- **2026-11-23, ronda 1.1e [Cambio 2026-11-23, 1.1e]** (decisiones del humano
  del 2026-11-23 en `docs/estado.md`, criterio "menor carga"):
  - Preguntas 1–14 cerradas por decisión del humano; nueva sección
    [Preguntas cerradas](#preguntas-cerradas) con el supuesto que cierra cada
    una. No quedan preguntas abiertas.
  - Supuestos 1–24 validados por el humano. Supuesto 12: se retira "un criterio
    se da por cumplido solo si se cumple en los dos entornos"; el rendimiento se
    verifica en TESTING (vinculante) y en DEMO solo se observa (una desviación
    es un hallazgo que no bloquea por sí solo). Supuesto 18 ("Servido")
    confirmado. Supuesto 20: valores fijos en la instalación (20 mesas,
    10 min). Supuesto 11: el umbral de 10 min deja de ser "configurable".
  - HU-09 fuera del MVP (descartada por el humano). Sus IDs no se retiran: la
    historia entera queda sin efecto y se conserva como referencia.
  - HU-02/CA-F01 y HU-03/CA-F06: la referencia a HU-09 pasa a apuntar solo al
    supuesto 20 (valor fijo en la instalación). Mismo ID y misma conducta
    verificable; no se retira ningún ID.
  - "Fuera del alcance del MVP": ticket fiscal cerrado (el local usa otra caja
    fiscal) y configuración de mesas/umbral desde la aplicación.

- **2026-11-21, ronda 1.1d [Cambio 2026-11-21]** (hallazgos SEC-001, SEC-004,
  SEC-007, SEC-008 y T-01..T-09 de `docs/estado.md`):
  - IDs estables `CA-F/CA-U/CA-N` en HU-01..HU-09 (sección
    [Identificadores de los criterios](#identificadores-de-los-criterios-cambio-2026-11-21)).
  - Supuestos modificados: 6 (PIN de 6 dígitos para encargado), 11 (bloqueo
    progresivo, límite por dispositivo, caducidad de 12 h), 12 (condiciones de
    medida) y 22 (decisiones de Cybersecurity sobre la autorización).
  - Supuestos nuevos: 23 (dispositivo de referencia de sala) y 24 (hora de
    entrada en la cola).
  - El detalle de cada historia está en su nota final "Cambios 2026-11-21
    (tarea 1.1d ...)".
