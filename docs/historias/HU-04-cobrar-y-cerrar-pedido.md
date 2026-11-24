# HU-04: Cobrar y cerrar un pedido

Como **camarero/cajero**
quiero **registrar el cobro de un pedido indicando el método de pago**
para **cerrar el pedido, saber cuánto cambio devolver y que la caja del día cuadre**.

> Estados: el pedido tiene dos estados independientes, uno de **preparación**
> (Pendiente → En preparación → Listo → Servido) y otro de **cobro** (Abierto →
> Cobrado / Cancelado). Ver el glosario en el [README](README.md#estados-del-pedido).

> IDs de criterio estables (ver [README](README.md#identificadores-de-los-criterios-cambio-2026-11-21)):
> no siguen necesariamente el orden de lectura, no se renumeran y un ID
> retirado no se reutiliza. Referencia completa: `HU-04/CA-F12`.

## Criterios de aceptación

### Funcionales
- **CA-F01** Dado un pedido con estado de cobro "Abierto" (con cualquier estado de preparación: Pendiente, En preparación, Listo o Servido), cuando el cajero pulsa "Cobrar", entonces ve el detalle de líneas y el total con IVA incluido.
- **CA-F02** Dado un pedido con estado de cobro "Cobrado" o "Cancelado", entonces la acción "Cobrar" no está disponible y el servidor rechaza cualquier intento de cobrarlo.
- **CA-F03** Dado el cobro en "Efectivo", cuando introduce el importe entregado igual o mayor que el total, entonces el sistema muestra el cambio a devolver (entregado - total) con 2 decimales y permite confirmar.
- **CA-F04** Dado el cobro en "Efectivo", cuando el importe entregado es menor que el total, entonces no permite confirmar y muestra "Importe insuficiente: faltan X,XX €".
- **CA-F05** Dado el cobro en "Tarjeta", cuando el cajero confirma que el datáfono externo ha aprobado el pago, entonces el pedido se registra como cobrado con tarjeta. (El sistema no se comunica con el datáfono.)
- **CA-F06** Dado un cobro confirmado, entonces el estado de cobro del pedido pasa a "Cobrado", se guardan fecha/hora, método de pago, importe y usuario que cobra, y el pedido deja de aparecer en la lista de pedidos por cobrar.
- **CA-F07** Dado un pedido cobrado cuya preparación es "Pendiente" o "En preparación" (p. ej. un pedido de mostrador cobrado al momento), entonces el cobro no cambia su estado de preparación: sigue en la cola de barra (HU-03) hasta que barra lo marca "Listo".
- **CA-F18** **[Cambio 2026-11-21]** Dado un pedido cobrado cuya preparación no es "Servido", entonces sigue en la pantalla "Pedidos" con la etiqueta "COBRADO" hasta que se marca "Servido" o termina su día (HU-02, HU-03, supuesto 18). Cobrar no marca el pedido como "Servido".
- **CA-F08** Dado un pedido "Cobrado", entonces no se pueden modificar sus líneas ni su importe ni cancelarlo (HU-06).
- **CA-F09** Dada una mesa con varios pedidos con cobro "Abierto", cuando el cajero elige "Cobrar mesa", entonces se registra un único cobro con un único total que cubre todos esos pedidos, y todos pasan a "Cobrado".
- **CA-F10** Dado un pedido cobrado, cuando el cajero pulsa "Ver ticket", entonces se muestra un resumen en pantalla (número, fecha, líneas, total, IVA incluido, método). La impresión y el ticket fiscal quedan fuera del MVP (ver README).

#### Vista "Cobrados hoy" [Cambio 2026-11-21]
- **CA-F19** Dado un camarero/cajero o el encargado en la pantalla "Pedidos", cuando abre "Cobrados hoy" (1 toque), entonces ve los cobros registrados en el día actual (`Europe/Madrid`, supuesto 15), del más reciente al más antiguo, con: número(s) de pedido, mesa o cliente, hora del cobro, método de pago, importe y la etiqueta "ANULADO" si el cobro se anuló.
- **CA-F20** Dado un cobro de la vista "Cobrados hoy", cuando se pulsa "Ver ticket", entonces se muestra el resumen de CA-F10.
- **CA-F21** Dado el encargado en "Cobrados hoy", entonces tiene la acción "Anular cobro" en cada cobro no anulado; el camarero/cajero no la ve y el servidor la rechaza (403).
- **CA-F22** Dado el rol barra, entonces no tiene acceso a "Cobrados hoy" (403).

#### Anulación de un cobro (solo encargado)
- **CA-F11** Dado un cobro registrado, cuando el encargado pulsa "Anular cobro" e indica un motivo de menos de 5 caracteres, entonces no se permite confirmar y se muestra "El motivo debe tener al menos 5 caracteres".
- **CA-F12** Dado un cobro registrado, cuando el encargado lo anula con un motivo de 5 o más caracteres, entonces la anulación afecta al **cobro completo**: todos los pedidos que cubría (uno, o varios si fue "Cobrar mesa") vuelven al estado de cobro "Abierto" y reaparecen en la lista de pedidos por cobrar.
- **CA-F13** Dado un cobro de "Cobrar mesa" que cubría varios pedidos, cuando el encargado intenta anular solo uno de esos pedidos, entonces el sistema no lo permite: solo se puede anular el cobro entero.
- **CA-F14** Dado un cobro anulado, entonces el estado de preparación de los pedidos que cubría no cambia.
- **CA-F15** Dado un cobro anulado, entonces el cobro no se borra: se conserva con su importe, método, fecha/hora, el encargado que lo anuló, la fecha/hora de la anulación y el motivo, y figura en "cobros anulados" del resumen del día del cobro original (HU-08).
- **CA-F16** Dado un pedido que ha vuelto a "Abierto" por una anulación, entonces se puede modificar o cancelar según las reglas de HU-06 y cobrar de nuevo con un cobro nuevo (que cuenta en el día en que se registra).
- **CA-F17** Dado un cobro ya anulado, entonces no se puede anular otra vez.
- **CA-F23** **[Cambio 2026-11-21, SEC-007]** Dado un encargado que confirma una anulación, entonces debe introducir su PIN, aunque ya tenga la sesión iniciada; si es incorrecto no se anula, se muestra "PIN incorrecto" junto al campo, el motivo escrito no se pierde y el fallo cuenta para su bloqueo (HU-01/CA-F06). **[Cambio 2026-11-23, T-14]** Si su cuenta está en bloqueo temporal, se aplica HU-01/CA-F12 ("Cuenta bloqueada. Espera X min", sin comprobar el PIN); si llega al bloqueo indefinido, HU-01/CA-F13.

### UX (medibles)
- **CA-U01** Cobro en tarjeta en <= 3 toques desde el pedido (Cobrar, Tarjeta, Confirmar).
- **CA-U02** Cobro en efectivo en <= 4 toques más la introducción del importe; botones rápidos de importe (total exacto, 5 €, 10 €, 20 €, 50 €).
- **CA-U03** El cambio a devolver se muestra en un tamaño mínimo de 32 px.
- **CA-U04** **[Cambio 2026-11-21, T-08]** Antes de confirmar, el total y el método elegido se muestran en texto en la misma vista que el botón "Confirmar", sin desplazar; tras confirmar, mensaje "Pedido N cobrado".
- **CA-U05** Antes de confirmar una anulación, se muestra la lista de pedidos que volverán a "Abierto" (número de pedido y mesa o cliente) y el importe del cobro.

### No funcionales
- **CA-N01** Integridad: un mismo pedido no puede tener dos cobros vigentes (no anulados) a la vez, incluido doble toque o reintento por red; el importe cobrado se calcula en el servidor.
- **CA-N02** Auditoría: cada cobro y anulación queda registrado y no se puede borrar.
- **CA-N03** Seguridad: solo los roles camarero/cajero y encargado pueden cobrar; solo encargado puede anular.
- **CA-N04** **[Cambio 2026-11-21, T-02]** Rendimiento: confirmación del cobro en <= 1 s (p95), en las condiciones del supuesto 12 (10 cobros simultáneos de pedidos distintos).
- **CA-N05** Importes monetarios exactos (sin errores de redondeo de coma flotante).
- **CA-N06** Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README).

Prioridad: alta (Must)

Dependencias: HU-01, HU-02.

_Cambios 2026-11-21 (hallazgos del Software Engineer en `docs/estado.md`): se
separan estado de preparación y de cobro; se define el efecto de anular un cobro
(supuestos 14 y 16 del README, a validar por el humano)._

_Cambios 2026-11-21 (hallazgos del UX Designer en `docs/estado.md`): vista
"Cobrados hoy" de la lista de sala; relación entre cobro y el nuevo estado
"Servido" (supuesto 18); accesibilidad en WCAG 2.2 AA._

_Cambios 2026-11-21 (tarea 1.1d: T-01, T-02, T-08, SEC-007): IDs estables
(los criterios "Cobrado no se modifica", "Cobrar mesa" y "Ver ticket" vuelven a
la sección general; habían quedado por error bajo "Cobrados hoy"); PIN del
encargado al anular; "claramente" sustituido por una condición medible;
condiciones de medida (supuesto 12)._

_Cambios 2026-11-23 (tarea 1.1f: T-14): CA-F23 remite a HU-01/CA-F12 y CA-F13
para la reconfirmación con la cuenta bloqueada. Interpretaciones I-05 (vistas
1280x800, 800x1280 y TPV 1024x768 para CA-U04) e I-10 confirmadas (README)._
