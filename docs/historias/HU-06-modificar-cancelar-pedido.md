# HU-06: Modificar o cancelar un pedido enviado

Como **camarero/cajero**
quiero **añadir o quitar productos de un pedido ya enviado, o cancelarlo**
para **atender cambios del cliente ("añádeme un cruasán", "al final no quiero el zumo") sin crear pedidos sueltos ni descuadrar la caja**.

> Estados: el pedido tiene dos estados independientes, uno de **preparación**
> (Pendiente → En preparación → Listo → Servido) y otro de **cobro** (Abierto → Cobrado /
> Cancelado). Ver el glosario en el [README](README.md#estados-del-pedido).
> Solo se puede modificar o cancelar un pedido con cobro "Abierto"; las reglas
> de PIN dependen del estado de preparación.

> IDs de criterio estables (ver [README](README.md#identificadores-de-los-criterios-cambio-2026-11-21)):
> no siguen necesariamente el orden de lectura, no se renumeran y un ID
> retirado no se reutiliza. Referencia completa: `HU-06/CA-F03`.

## Criterios de aceptación

### Funcionales
- **CA-F01** Dado un pedido con cobro "Abierto", cuando el camarero añade productos, entonces las nuevas líneas se envían a barra marcadas como "AÑADIDO" y el total se recalcula.
- **CA-F08** Dado un pedido con cobro "Abierto" y preparación "Listo" o "Servido" [Cambio 2026-11-21], cuando el camarero añade productos, entonces la preparación vuelve a "Pendiente" y el pedido reaparece en la cola de barra (HU-03) con las líneas nuevas marcadas "AÑADIDO", ordenado y con la espera contada desde la hora del añadido (HU-03/CA-F02, CA-F23, supuesto 24).
- **CA-F02** Dado un pedido con cobro "Abierto" y preparación "Pendiente", cuando el camarero quita una línea o reduce su cantidad, entonces el cambio se aplica sin PIN, el total se recalcula y barra ve la tarjeta como "MODIFICADO" (HU-03).
- **CA-F03** Dado un pedido con cobro "Abierto" y preparación "En preparación", "Listo" o "Servido" [Cambio 2026-11-21], cuando el camarero intenta quitar una línea o reducir su cantidad, entonces el sistema exige la autorización del encargado e indica que la línea podría estar ya preparada (o servida).
- **CA-F04** Dado un pedido con cobro "Abierto", cuando el camarero pulsa "Cancelar pedido" y elige un motivo (lista: "Cliente se ha ido", "Error al tomar el pedido", "Otro" con texto libre de hasta 100 caracteres), entonces su estado de cobro pasa a "Cancelado", sale de la lista de pedidos por cobrar y barra lo ve como "CANCELADO".
- **CA-F09** Dado un pedido con cobro "Abierto" y preparación "Pendiente", entonces se puede cancelar sin PIN de encargado.
- **CA-F05** Dado un pedido con cobro "Abierto" y preparación "En preparación", "Listo" o "Servido" [Cambio 2026-11-21], cuando se quiere cancelar, entonces se requiere la autorización del encargado.

#### Autorización del encargado [Cambio 2026-11-21, supuesto 22]
- **CA-F11** Dada una acción que requiere autorización del encargado, cuando la pide un camarero/cajero, entonces el encargado la autoriza en ese mismo dispositivo **eligiendo su nombre e introduciendo su PIN** (no basta con el PIN solo). La lista solo muestra usuarios activos con rol encargado.
- **CA-F12** Dado un único encargado activo, entonces aparece ya seleccionado y solo hay que introducir el PIN.
- **CA-F13** Dado un nombre de encargado y un PIN que no se corresponden, entonces no se autoriza la acción, se muestra "PIN de encargado incorrecto" junto al campo, el PIN se vacía y el cambio pendiente no se pierde.
- **CA-F14** Dada una autorización correcta, entonces vale solo para esa acción concreta (una modificación o una cancelación de ese pedido): la siguiente acción que la necesite la vuelve a pedir.
- **CA-F15** **[Cambio 2026-11-21, SEC-007]** Dado un usuario con sesión iniciada como encargado, cuando hace él mismo una de las acciones de esta historia, entonces no se le pide autorización adicional ni su PIN y queda registrado como el encargado que autorizó (decisión de Cybersecurity, `docs/seguridad.md` §6.3; la reconfirmación del PIN solo se exige al anular cobros, HU-04/CA-F23, y en Personal, HU-07/CA-N04).
- **CA-F16** Dada una autorización, cuando la intenta un usuario sin rol encargado, entonces el servidor la rechaza.
- **CA-F17** **[Cambio 2026-11-21, SEC-001]** Dada una autorización fallida, entonces cuenta como intento fallido del encargado elegido para su bloqueo progresivo (HU-01/CA-F06) y como intento fallido desde ese dispositivo (HU-01/CA-F11).
- **CA-F18** **[Cambio 2026-11-21, SEC-001]** Dado un encargado con la cuenta bloqueada, desactivado o con PIN provisional pendiente de cambiar, cuando se introduce su PIN para autorizar (aunque sea correcto), entonces no se autoriza y se muestra el mismo mensaje "PIN de encargado incorrecto" que en CA-F13.
- **CA-F19** **[Cambio 2026-11-21, SEC-001]** Dadas 5 autorizaciones fallidas desde una misma sesión en 10 minutos, cuando se intenta otra desde esa sesión, entonces se rechaza sin comprobar el PIN durante 10 minutos con el mensaje "Demasiados intentos. Espera X min" y el cambio pendiente no se pierde.
- **CA-F06** Dado un pedido con cobro "Cobrado" (con cualquier estado de preparación), entonces no se puede modificar ni cancelar desde esta función; primero el encargado tiene que anular el cobro (HU-04), y entonces el pedido vuelve a "Abierto" y se aplican las reglas anteriores.
- **CA-F10** Dado un pedido con cobro "Cancelado", entonces no se puede modificar, ni cobrar, ni volver a "Abierto".
- **CA-F07** Dado cualquier modificación o cancelación, entonces queda registrado quién, cuándo, qué cambió, el motivo y, si la hubo, el encargado que autorizó.

### UX (medibles)
- **CA-U01** Cancelar un pedido con preparación "Pendiente": <= 3 toques (Cancelar, motivo, Confirmar).
- **CA-U02** Antes de confirmar una cancelación se muestra un diálogo con número de pedido e importe afectado.
- **CA-U03** Las líneas añadidas o eliminadas se distinguen con texto ("AÑADIDO", tachado + "ELIMINADO"), no solo con color.
- **CA-U04** Si el pedido está cobrado, el mensaje que se muestra al intentar modificarlo o cancelarlo indica que hace falta que el encargado anule el cobro.

### No funcionales
- **CA-N01** Seguridad: la autorización por PIN de encargado (6 dígitos, HU-01/CA-N01) se valida en el servidor y queda registrado qué encargado autorizó.
- **CA-N02** **[Cambio 2026-11-21, T-02]** Rendimiento: la modificación llega a barra en <= 2 s (p95, condiciones del supuesto 12).
- **CA-N03** Concurrencia: si dos dispositivos modifican el mismo pedido a la vez, ningún cambio se pierde en silencio; el segundo recibe aviso de que el pedido ha cambiado y ve la versión actualizada.
- **CA-N04** Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README).

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

_Cambios 2026-11-21 (tarea 1.1d: T-01, T-02, SEC-001, SEC-007): IDs estables;
se sustituye el criterio provisional "los límites de intentos los define
Cybersecurity" por CA-F17, CA-F18 y CA-F19 (`docs/seguridad.md` §6.1 y §6.3);
el encargado con sesión propia no reintroduce el PIN en esta historia (CA-F15);
el registro incluye al encargado que autorizó; orden de la cola al volver un
pedido (CA-F08)._
