# HU-06: Modificar o cancelar un pedido enviado

Como **camarero/cajero**
quiero **añadir o quitar productos de un pedido ya enviado, o cancelarlo**
para **atender cambios del cliente ("añádeme un cruasán", "al final no quiero el zumo") sin crear pedidos sueltos ni descuadrar la caja**.

> Estados: el pedido tiene dos estados independientes, uno de **preparación**
> (Pendiente → En preparación → Listo → Servido) y otro de **cobro** (Abierto → Cobrado /
> Cancelado). Ver el glosario en el [README](README.md#estados-del-pedido).
> Solo se puede modificar o cancelar un pedido con cobro "Abierto"; las reglas
> de PIN dependen del estado de preparación.

## Criterios de aceptación

### Funcionales
- Dado un pedido con cobro "Abierto", cuando el camarero añade productos, entonces las nuevas líneas se envían a barra marcadas como "AÑADIDO" y el total se recalcula.
- Dado un pedido con cobro "Abierto" y preparación "Listo" o "Servido" [Cambio 2026-11-21], cuando el camarero añade productos, entonces la preparación vuelve a "Pendiente" y el pedido reaparece en la cola de barra (HU-03) con las líneas nuevas marcadas "AÑADIDO".
- Dado un pedido con cobro "Abierto" y preparación "Pendiente", cuando el camarero quita una línea o reduce su cantidad, entonces el cambio se aplica sin PIN, el total se recalcula y barra ve la tarjeta como "MODIFICADO" (HU-03).
- Dado un pedido con cobro "Abierto" y preparación "En preparación", "Listo" o "Servido" [Cambio 2026-11-21], cuando el camarero intenta quitar una línea o reducir su cantidad, entonces el sistema exige la autorización del encargado e indica que la línea podría estar ya preparada (o servida).
- Dado un pedido con cobro "Abierto", cuando el camarero pulsa "Cancelar pedido" y elige un motivo (lista: "Cliente se ha ido", "Error al tomar el pedido", "Otro" con texto libre de hasta 100 caracteres), entonces su estado de cobro pasa a "Cancelado", sale de la lista de pedidos por cobrar y barra lo ve como "CANCELADO".
- Dado un pedido con cobro "Abierto" y preparación "Pendiente", entonces se puede cancelar sin PIN de encargado.
- Dado un pedido con cobro "Abierto" y preparación "En preparación", "Listo" o "Servido" [Cambio 2026-11-21], cuando se quiere cancelar, entonces se requiere la autorización del encargado.

#### Autorización del encargado [Cambio 2026-11-21, supuesto 22]
- Dada una acción que requiere autorización del encargado, cuando la pide un camarero/cajero, entonces el encargado la autoriza en ese mismo dispositivo **eligiendo su nombre e introduciendo su PIN** (no basta con el PIN solo). La lista solo muestra usuarios activos con rol encargado.
- Dado un único encargado activo, entonces aparece ya seleccionado y solo hay que introducir el PIN.
- Dado un nombre de encargado y un PIN que no se corresponden, entonces no se autoriza la acción, se muestra "PIN de encargado incorrecto" junto al campo, el PIN se vacía y el cambio pendiente no se pierde.
- Dada una autorización correcta, entonces vale solo para esa acción concreta (una modificación o una cancelación de ese pedido): la siguiente acción que la necesite la vuelve a pedir.
- Dado un usuario con sesión iniciada como encargado, cuando hace él mismo una de estas acciones, entonces no se le pide autorización adicional y queda registrado como el encargado que autorizó. (Si Cybersecurity exige reautenticación, prevalece su decisión.)
- Dada una autorización, cuando la intenta un usuario sin rol encargado (o desactivado), entonces el servidor la rechaza.
- Los límites de intentos fallidos, el bloqueo y la longitud del PIN de encargado los define Cybersecurity (`docs/seguridad.md`); esta historia se actualizará con su decisión (tarea 1.1d).
- Dado un pedido con cobro "Cobrado" (con cualquier estado de preparación), entonces no se puede modificar ni cancelar desde esta función; primero el encargado tiene que anular el cobro (HU-04), y entonces el pedido vuelve a "Abierto" y se aplican las reglas anteriores.
- Dado un pedido con cobro "Cancelado", entonces no se puede modificar, ni cobrar, ni volver a "Abierto".
- Dado cualquier modificación o cancelación, entonces queda registrado quién, cuándo, qué cambió y el motivo.

### UX (medibles)
- Cancelar un pedido con preparación "Pendiente": <= 3 toques (Cancelar, motivo, Confirmar).
- Antes de confirmar una cancelación se muestra un diálogo con número de pedido e importe afectado.
- Las líneas añadidas o eliminadas se distinguen con texto ("AÑADIDO", tachado + "ELIMINADO"), no solo con color.
- Si el pedido está cobrado, el mensaje que se muestra al intentar modificarlo o cancelarlo indica que hace falta que el encargado anule el cobro.

### No funcionales
- Seguridad: la autorización por PIN de encargado se valida en el servidor y queda registrado qué encargado autorizó.
- Rendimiento: la modificación llega a barra en <= 2 s (p95).
- Concurrencia: si dos dispositivos modifican el mismo pedido a la vez, ningún cambio se pierde en silencio; el segundo recibe aviso de que el pedido ha cambiado y ve la versión actualizada.
- Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README).

Prioridad: media (Should)

Dependencias: HU-01, HU-02, HU-03 (y HU-04 para la anulación de cobro).

_Cambios 2026-11-21 (hallazgos del Software Engineer en `docs/estado.md`): las
condiciones se expresan con los dos estados (preparación y cobro); se añade el
caso de añadir productos a un pedido "Listo" y que un pedido cancelado es
definitivo (supuestos 14 y 17 del README, a validar)._

_Cambios 2026-11-21 (hallazgos del UX Designer en `docs/estado.md`): la
autorización del encargado se hace eligiendo encargado + PIN (supuesto 22; la
parte de seguridad la decide Cybersecurity); el estado "Servido" se trata igual
que "Listo" (supuesto 18); accesibilidad en WCAG 2.2 AA._
