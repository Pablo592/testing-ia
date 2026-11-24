# HU-01: Iniciar sesión con mi rol

Como **miembro del personal** (camarero/cajero, barra/cocina o encargado)
quiero **identificarme en el dispositivo con mi usuario y PIN**
para **acceder solo a las funciones de mi rol y que los pedidos y cobros queden registrados a mi nombre**.

> IDs de criterio estables (ver [README](README.md#identificadores-de-los-criterios-cambio-2026-11-21)):
> no se renumeran y un ID retirado no se reutiliza. Referencia completa: `HU-01/CA-F06`.

## Criterios de aceptación

### Funcionales
- **CA-F01** Dado un usuario activo con rol "camarero", cuando introduce usuario y PIN correctos, entonces accede a la pantalla "Pedidos" (lista de sala, HU-02), desde la que inicia la toma de pedidos, y no ve las opciones de gestión de menú (HU-05) ni de usuarios (HU-07).
- **CA-F02** Dado un usuario activo con rol "barra", cuando inicia sesión, entonces accede directamente a la cola de pedidos (HU-03) y no puede crear, cobrar ni cancelar pedidos.
- **CA-F03** Dado un usuario activo con rol "encargado", cuando inicia sesión, entonces puede acceder a todas las funciones (pedidos, cola, cobro, menú, usuarios, resumen del día).
- **CA-F04** Dado un usuario sin permiso para una función, cuando intenta acceder a ella por URL o llamada directa a la API, entonces el sistema responde "acceso denegado" (HTTP 403 o equivalente) y no ejecuta la acción.
- **CA-F05** Dado un usuario o PIN incorrecto, cuando intenta iniciar sesión, entonces ve el mensaje "Usuario o PIN incorrectos" sin indicar cuál de los dos falla.
- **CA-F06** **[Cambio 2026-11-21, SEC-001]** Dados 5 intentos fallidos consecutivos para un mismo usuario, cuando intenta un sexto, entonces la cuenta queda bloqueada 5 minutos y se muestra el tiempo restante. Si después vuelve a acumular 5 fallos consecutivos, el bloqueo es de 15 minutos; tras otros 5, de 60 minutos; y al llegar a 20 fallos consecutivos sin ningún acceso correcto, la cuenta queda bloqueada hasta que un encargado la desbloquee, con el mensaje "Cuenta bloqueada. Pide al encargado que la desbloquee". Solo un acceso correcto, el desbloqueo (por un encargado en HU-07/CA-F08, o por el operador del sistema si la cuenta bloqueada es la del único encargado) o el restablecimiento del PIN (HU-07/CA-F04) reinician el contador.
- **CA-F07** Dado un usuario desactivado (HU-07), cuando intenta iniciar sesión con PIN correcto, entonces no accede y ve "Usuario desactivado, contacta con el encargado".
- **CA-F08** Dada una sesión iniciada, cuando el usuario pulsa "Cerrar sesión", entonces vuelve a la pantalla de inicio de sesión y la sesión anterior deja de ser válida.
- **CA-F09** **[Cambio 2026-11-21, SEC-004]** Dada una sesión de camarero/cajero o de encargado sin interacción durante 15 minutos, entonces se cierra automáticamente, también si el encargado tiene abierta la cola de barra. Una sesión con rol barra no caduca por inactividad mientras tiene la cola abierta (sí por la caducidad absoluta de CA-N06).
- **CA-F10** Dado un pedido creado o cobrado, entonces queda registrado el usuario que realizó la acción.
- **CA-F11** **[Cambio 2026-11-21, SEC-001]** Dados 10 intentos fallidos desde un mismo dispositivo en 10 minutos, sea cual sea el usuario, cuando se intenta otro inicio de sesión desde ese dispositivo, entonces se rechaza durante 10 minutos con el mensaje "Demasiados intentos desde este dispositivo. Espera X min". (Las autorizaciones de encargado fallidas de HU-06 también cuentan como intentos fallidos desde ese dispositivo.)

### UX (medibles)
- **CA-U01** Inicio de sesión en <= 2 pasos (elegir/escribir usuario, introducir PIN).
- **CA-U02** Teclado numérico en pantalla con botones de al menos 44x44 px.
- **CA-U03** El mensaje de error se muestra junto al campo, en texto (no solo color), y el campo PIN se vacía para reintentar.
- **CA-U04** El nombre y rol del usuario conectado están visibles en todas las pantallas.

### No funcionales
- **CA-N01** **[Cambio 2026-11-21, SEC-001]** Seguridad: PIN de 6 dígitos para el rol encargado y de 4 a 6 dígitos para camarero/cajero y barra, almacenado con argon2id; nunca en texto plano ni en logs.
- **CA-N02** Seguridad: la autorización por rol se valida en el servidor, no solo ocultando botones.
- **CA-N03** **[Cambio 2026-11-21, T-02]** Rendimiento: respuesta al inicio de sesión en <= 1 s (p95), medida en las condiciones del supuesto 12 del README (10 inicios de sesión simultáneos).
- **CA-N04** Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README), incluido contraste de texto >= 4,5:1; campos con etiqueta accesible.
- **CA-N05** **[Cambio 2026-11-21, SEC-001]** Seguridad: cada bloqueo de cuenta y cada rechazo por dispositivo queda registrado; el bloqueo de un encargado y cualquier bloqueo indefinido generan una alerta.
- **CA-N06** **[Cambio 2026-11-21, SEC-004]** Seguridad: toda sesión, incluida la de la pantalla de barra, caduca como máximo 12 horas después de iniciarla; después hay que volver a introducir usuario y PIN.

Prioridad: alta (Must)

Dependencias: ninguna (base para todas las demás). HU-07 gestiona los usuarios;
hasta que exista, debe haber un encargado inicial creado en la instalación,
con un PIN provisional de 6 dígitos que debe cambiar en su primer inicio de
sesión **[Cambio 2026-11-21, SEC-001]**.

_Cambios 2026-11-21 (hallazgos del UX Designer en `docs/estado.md`): el
camarero entra a la lista "Pedidos" (HU-02); accesibilidad unificada en WCAG 2.2
AA._

_Cambios 2026-11-21 (tarea 1.1d: SEC-001, SEC-004, T-01, T-02): IDs estables;
bloqueo progresivo y límite por dispositivo; PIN de 6 dígitos para encargado;
alertas; caducidad absoluta de 12 h; condiciones de medida del rendimiento._
