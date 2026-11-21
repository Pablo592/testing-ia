# HU-04: Cobrar y cerrar un pedido

Como **camarero/cajero**
quiero **registrar el cobro de un pedido indicando el método de pago**
para **cerrar el pedido, saber cuánto cambio devolver y que la caja del día cuadre**.

> Estados: el pedido tiene dos estados independientes, uno de **preparación**
> (Pendiente → En preparación → Listo) y otro de **cobro** (Abierto → Cobrado /
> Cancelado). Ver el glosario en el [README](README.md#estados-del-pedido).

## Criterios de aceptación

### Funcionales
- Dado un pedido con estado de cobro "Abierto" (con cualquier estado de preparación: Pendiente, En preparación, Listo o Servido), cuando el cajero pulsa "Cobrar", entonces ve el detalle de líneas y el total con IVA incluido.
- Dado un pedido con estado de cobro "Cobrado" o "Cancelado", entonces la acción "Cobrar" no está disponible y el servidor rechaza cualquier intento de cobrarlo.
- Dado el cobro en "Efectivo", cuando introduce el importe entregado igual o mayor que el total, entonces el sistema muestra el cambio a devolver (entregado - total) con 2 decimales y permite confirmar.
- Dado el cobro en "Efectivo", cuando el importe entregado es menor que el total, entonces no permite confirmar y muestra "Importe insuficiente: faltan X,XX €".
- Dado el cobro en "Tarjeta", cuando el cajero confirma que el datáfono externo ha aprobado el pago, entonces el pedido se registra como cobrado con tarjeta. (El sistema no se comunica con el datáfono.)
- Dado un cobro confirmado, entonces el estado de cobro del pedido pasa a "Cobrado", se guardan fecha/hora, método de pago, importe y usuario que cobra, y el pedido deja de aparecer en la lista de pedidos por cobrar.
- Dado un pedido cobrado cuya preparación es "Pendiente" o "En preparación" (p. ej. un pedido de mostrador cobrado al momento), entonces el cobro no cambia su estado de preparación: sigue en la cola de barra (HU-03) hasta que barra lo marca "Listo".
- **[Cambio 2026-11-21]** Dado un pedido cobrado cuya preparación no es "Servido", entonces sigue en la pantalla "Pedidos" con la etiqueta "COBRADO" hasta que se marca "Servido" o termina su día (HU-02, HU-03, supuesto 18). Cobrar no marca el pedido como "Servido".

#### Vista "Cobrados hoy" [Cambio 2026-11-21]
- Dado un camarero/cajero o el encargado en la pantalla "Pedidos", cuando abre "Cobrados hoy" (1 toque), entonces ve los cobros registrados en el día actual (`Europe/Madrid`, supuesto 15), del más reciente al más antiguo, con: número(s) de pedido, mesa o cliente, hora del cobro, método de pago, importe y la etiqueta "ANULADO" si el cobro se anuló.
- Dado un cobro de la vista "Cobrados hoy", cuando se pulsa "Ver ticket", entonces se muestra el resumen del criterio "Ver ticket".
- Dado el encargado en "Cobrados hoy", entonces tiene la acción "Anular cobro" en cada cobro no anulado; el camarero/cajero no la ve y el servidor la rechaza (403).
- Dado el rol barra, entonces no tiene acceso a "Cobrados hoy" (403).
- Dado un pedido "Cobrado", entonces no se pueden modificar sus líneas ni su importe ni cancelarlo (HU-06).
- Dada una mesa con varios pedidos con cobro "Abierto", cuando el cajero elige "Cobrar mesa", entonces se registra un único cobro con un único total que cubre todos esos pedidos, y todos pasan a "Cobrado".
- Dado un pedido cobrado, cuando el cajero pulsa "Ver ticket", entonces se muestra un resumen en pantalla (número, fecha, líneas, total, IVA incluido, método). La impresión y el ticket fiscal quedan fuera del MVP (ver README).

#### Anulación de un cobro (solo encargado)
- Dado un cobro registrado, cuando el encargado pulsa "Anular cobro" e indica un motivo de menos de 5 caracteres, entonces no se permite confirmar y se muestra "El motivo debe tener al menos 5 caracteres".
- Dado un cobro registrado, cuando el encargado lo anula con un motivo de 5 o más caracteres, entonces la anulación afecta al **cobro completo**: todos los pedidos que cubría (uno, o varios si fue "Cobrar mesa") vuelven al estado de cobro "Abierto" y reaparecen en la lista de pedidos por cobrar.
- Dado un cobro de "Cobrar mesa" que cubría varios pedidos, cuando el encargado intenta anular solo uno de esos pedidos, entonces el sistema no lo permite: solo se puede anular el cobro entero.
- Dado un cobro anulado, entonces el estado de preparación de los pedidos que cubría no cambia.
- Dado un cobro anulado, entonces el cobro no se borra: se conserva con su importe, método, fecha/hora, el encargado que lo anuló, la fecha/hora de la anulación y el motivo, y figura en "cobros anulados" del resumen del día del cobro original (HU-08).
- Dado un pedido que ha vuelto a "Abierto" por una anulación, entonces se puede modificar o cancelar según las reglas de HU-06 y cobrar de nuevo con un cobro nuevo (que cuenta en el día en que se registra).
- Dado un cobro ya anulado, entonces no se puede anular otra vez.

### UX (medibles)
- Cobro en tarjeta en <= 3 toques desde el pedido (Cobrar, Tarjeta, Confirmar).
- Cobro en efectivo en <= 4 toques más la introducción del importe; botones rápidos de importe (total exacto, 5 €, 10 €, 20 €, 50 €).
- El cambio a devolver se muestra en un tamaño mínimo de 32 px.
- Antes de confirmar se ve claramente total y método elegido; tras confirmar, mensaje "Pedido N cobrado".
- Antes de confirmar una anulación, se muestra la lista de pedidos que volverán a "Abierto" (número de pedido y mesa o cliente) y el importe del cobro.

### No funcionales
- Integridad: un mismo pedido no puede tener dos cobros vigentes (no anulados) a la vez, incluido doble toque o reintento por red; el importe cobrado se calcula en el servidor.
- Auditoría: cada cobro y anulación queda registrado y no se puede borrar.
- Seguridad: solo los roles camarero/cajero y encargado pueden cobrar; solo encargado puede anular.
- Rendimiento: confirmación del cobro en <= 1 s (p95).
- Importes monetarios exactos (sin errores de redondeo de coma flotante).
- Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README).

Prioridad: alta (Must)

Dependencias: HU-01, HU-02.

_Cambios 2026-11-21 (hallazgos del Software Engineer en `docs/estado.md`): se
separan estado de preparación y de cobro; se define el efecto de anular un cobro
(supuestos 14 y 16 del README, a validar por el humano)._

_Cambios 2026-11-21 (hallazgos del UX Designer en `docs/estado.md`): vista
"Cobrados hoy" de la lista de sala; relación entre cobro y el nuevo estado
"Servido" (supuesto 18); accesibilidad en WCAG 2.2 AA._
