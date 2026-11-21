# HU-01: Iniciar sesión con mi rol

Como **miembro del personal** (camarero/cajero, barra/cocina o encargado)
quiero **identificarme en el dispositivo con mi usuario y PIN**
para **acceder solo a las funciones de mi rol y que los pedidos y cobros queden registrados a mi nombre**.

## Criterios de aceptación

### Funcionales
- Dado un usuario activo con rol "camarero", cuando introduce usuario y PIN correctos, entonces accede a la pantalla "Pedidos" (lista de sala, HU-02), desde la que inicia la toma de pedidos, y no ve las opciones de gestión de menú (HU-05) ni de usuarios (HU-07).
- Dado un usuario activo con rol "barra", cuando inicia sesión, entonces accede directamente a la cola de pedidos (HU-03) y no puede crear, cobrar ni cancelar pedidos.
- Dado un usuario activo con rol "encargado", cuando inicia sesión, entonces puede acceder a todas las funciones (pedidos, cola, cobro, menú, usuarios, resumen del día).
- Dado un usuario sin permiso para una función, cuando intenta acceder a ella por URL o llamada directa a la API, entonces el sistema responde "acceso denegado" (HTTP 403 o equivalente) y no ejecuta la acción.
- Dado un usuario o PIN incorrecto, cuando intenta iniciar sesión, entonces ve el mensaje "Usuario o PIN incorrectos" sin indicar cuál de los dos falla.
- Dados 5 intentos fallidos consecutivos para un mismo usuario, cuando intenta un sexto, entonces la cuenta queda bloqueada 5 minutos y se muestra el tiempo restante.
- Dado un usuario desactivado (HU-07), cuando intenta iniciar sesión con PIN correcto, entonces no accede y ve "Usuario desactivado, contacta con el encargado".
- Dada una sesión iniciada, cuando el usuario pulsa "Cerrar sesión", entonces vuelve a la pantalla de inicio de sesión y la sesión anterior deja de ser válida.
- Dada una sesión sin interacción durante 15 minutos (camarero/encargado), entonces se cierra automáticamente. La sesión de la pantalla de barra no caduca por inactividad mientras esté abierta la cola.
- Dado un pedido creado o cobrado, entonces queda registrado el usuario que realizó la acción.

### UX (medibles)
- Inicio de sesión en <= 2 pasos (elegir/escribir usuario, introducir PIN).
- Teclado numérico en pantalla con botones de al menos 44x44 px.
- El mensaje de error se muestra junto al campo, en texto (no solo color), y el campo PIN se vacía para reintentar.
- El nombre y rol del usuario conectado están visibles en todas las pantallas.

### No funcionales
- Seguridad: PIN de 4 a 6 dígitos almacenado con hash (algoritmo concreto: decide Software Engineer / Cybersecurity); nunca en texto plano ni en logs.
- Seguridad: la autorización por rol se valida en el servidor, no solo ocultando botones.
- Rendimiento: respuesta al inicio de sesión en <= 1 s (p95) en la red local.
- Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README), incluido contraste de texto >= 4,5:1; campos con etiqueta accesible.

Prioridad: alta (Must)

Dependencias: ninguna (base para todas las demás). HU-07 gestiona los usuarios; hasta que exista, debe haber un encargado inicial creado en la instalación.

_Cambios 2026-11-21 (hallazgos del UX Designer en `docs/estado.md`): el
camarero entra a la lista "Pedidos" (HU-02); accesibilidad unificada en WCAG 2.2
AA._
