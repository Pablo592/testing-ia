# HU-07: Gestionar los usuarios del personal

Como **encargado**
quiero **dar de alta, editar, desactivar y restablecer el PIN de los usuarios del personal**
para **controlar quién puede usar el sistema y con qué permisos, también cuando alguien deja de trabajar en la cafetería**.

## Criterios de aceptación

### Funcionales
- Dado el encargado en "Personal", cuando crea un usuario con nombre visible (1 a 30 caracteres, único), rol (camarero/cajero, barra, encargado) y PIN inicial, entonces el usuario puede iniciar sesión (HU-01).
- Dado un usuario, cuando el encargado cambia su rol, entonces el cambio aplica en su siguiente acción: si tiene sesión abierta, sus permisos se actualizan sin necesidad de volver a entrar.
- Dado un usuario, cuando el encargado lo desactiva, entonces su sesión activa se cierra en <= 1 min y no puede volver a iniciar sesión; su nombre se conserva en el histórico de pedidos y cobros.
- Dado un usuario, cuando el encargado restablece su PIN, entonces el PIN anterior deja de funcionar inmediatamente y el usuario debe cambiar el PIN provisional en su siguiente inicio de sesión.
- Dado el único encargado activo, cuando intenta desactivarse o quitarse el rol de encargado, entonces el sistema lo impide con "Debe existir al menos un encargado activo".
- Dado un PIN que no cumple la regla (4 a 6 dígitos; no todos iguales, p. ej. 1111; no secuencias de 4 o más dígitos como 1234), cuando se intenta guardar, entonces se rechaza indicando la regla.
- Los usuarios no se borran, solo se desactivan.

### UX (medibles)
- Alta de un usuario en 1 formulario con 3 campos (nombre, rol, PIN).
- La lista de personal muestra nombre, rol y estado (activo/desactivado) en texto.

### No funcionales
- Seguridad: solo el encargado accede a esta función (validado en servidor). El PIN nunca se muestra después de guardarlo ni aparece en logs.
- Auditoría: altas, cambios de rol, desactivaciones y restablecimientos de PIN quedan registrados con quién y cuándo.
- Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README) [Cambio 2026-11-21]; formularios con etiquetas asociadas, navegables con teclado.

Prioridad: media (Should)

Dependencias: HU-01.
