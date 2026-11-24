# HU-07: Gestionar los usuarios del personal

Como **encargado**
quiero **dar de alta, editar, desactivar y restablecer el PIN de los usuarios del personal**
para **controlar quién puede usar el sistema y con qué permisos, también cuando alguien deja de trabajar en la cafetería**.

> IDs de criterio estables (ver [README](README.md#identificadores-de-los-criterios-cambio-2026-11-21)):
> no se renumeran y un ID retirado no se reutiliza. Referencia completa: `HU-07/CA-F06`.

## Criterios de aceptación

### Funcionales
- **CA-F01** Dado el encargado en "Personal", cuando crea un usuario con nombre visible (1 a 30 caracteres, único), rol (camarero/cajero, barra, encargado) y PIN inicial, entonces el usuario puede iniciar sesión (HU-01).
- **CA-F02** Dado un usuario, cuando el encargado cambia su rol, entonces el cambio aplica en su siguiente acción: si tiene sesión abierta, sus permisos se actualizan sin necesidad de volver a entrar.
- **CA-F03** Dado un usuario, cuando el encargado lo desactiva, entonces su sesión activa se cierra en <= 1 min y no puede volver a iniciar sesión; su nombre se conserva en el histórico de pedidos y cobros.
- **CA-F04** Dado un usuario, cuando el encargado restablece su PIN, entonces el PIN anterior deja de funcionar inmediatamente, su contador de intentos fallidos vuelve a cero (HU-01/CA-F06) **[Cambio 2026-11-21]** y el usuario debe cambiar el PIN provisional en su siguiente inicio de sesión.
- **CA-F05** Dado el único encargado activo, cuando intenta desactivarse o quitarse el rol de encargado, entonces el sistema lo impide con "Debe existir al menos un encargado activo".
- **CA-F06** **[Cambio 2026-11-21, SEC-001]** Dado un PIN que no cumple la regla (camarero/cajero y barra: 4 a 6 dígitos; encargado: 6 dígitos; no todos iguales, p. ej. 1111; sin secuencias ascendentes o descendentes de 4 o más dígitos, p. ej. 1234 o 9876; no formado por un bloque repetido, p. ej. 1212 o 123123; que no esté en la lista de PIN más comunes), cuando se intenta guardar, entonces se rechaza indicando la regla.
- **CA-F07** Los usuarios no se borran, solo se desactivan.
- **CA-F08** **[Cambio 2026-11-21, SEC-001]** Dado un usuario con la cuenta bloqueada hasta desbloqueo (HU-01), cuando el encargado pulsa "Desbloquear" en Personal, entonces el usuario puede volver a iniciar sesión con el contador de intentos a cero y la acción queda registrada.
- **CA-F09** **[Cambio 2026-11-21, SEC-001]** Dado un usuario cuyo PIN tiene menos de 6 dígitos, cuando el encargado le asigna el rol encargado, entonces el usuario debe crear un PIN de 6 dígitos en su siguiente acción antes de poder usar ninguna otra función.
- **CA-F10** **[Cambio 2026-11-21, SEC-001]** Dada la lista de personal, entonces un usuario bloqueado hasta desbloqueo se muestra con el estado "Bloqueado" en texto y la acción "Desbloquear".

### UX (medibles)
- **CA-U01** Alta de un usuario en 1 formulario con 3 campos (nombre, rol, PIN). La confirmación con el PIN del encargado (CA-N04) es un paso aparte y no cuenta como campo del formulario. [Cambio 2026-11-21]
- **CA-U02** La lista de personal muestra nombre, rol y estado (activo/desactivado/bloqueado [Cambio 2026-11-21]) en texto.

### No funcionales
- **CA-N01** Seguridad: solo el encargado accede a esta función (validado en servidor). El PIN nunca se muestra después de guardarlo ni aparece en logs.
- **CA-N02** Auditoría: altas, cambios de rol, desactivaciones, activaciones, restablecimientos de PIN y desbloqueos [Cambio 2026-11-21] quedan registrados con quién y cuándo.
- **CA-N03** Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README) [Cambio 2026-11-21]; formularios con etiquetas asociadas, navegables con teclado.
- **CA-N04** **[Cambio 2026-11-21, SEC-007]** Seguridad: crear un usuario, cambiar su rol, desactivarlo o activarlo, restablecer su PIN o desbloquearlo exige que el encargado introduzca su PIN en ese momento, aunque ya tenga la sesión iniciada. Si el PIN es incorrecto, la acción no se hace, los datos del formulario no se pierden y el fallo cuenta para su bloqueo (HU-01/CA-F06). Cambiar solo el nombre visible no lo exige. **[Cambio 2026-11-23, T-14]** Si su cuenta está en bloqueo temporal, se aplica HU-01/CA-F12 ("Cuenta bloqueada. Espera X min", sin comprobar el PIN); si llega al bloqueo indefinido, HU-01/CA-F13.

Prioridad: media (Should)

Dependencias: HU-01.

_Cambios 2026-11-21 (tarea 1.1d: T-01, SEC-001, SEC-007): IDs estables; regla
de PIN por rol y lista de PIN comunes; desbloqueo y estado "Bloqueado";
promoción a encargado con PIN corto; el restablecimiento pone a cero el
contador; reconfirmación del PIN del encargado en las escrituras de Personal._

_Cambios 2026-11-23 (tarea 1.1f: T-14): CA-N04 remite a HU-01/CA-F12 y CA-F13
para la reconfirmación con la cuenta bloqueada. Interpretación I-10 confirmada
(README)._
