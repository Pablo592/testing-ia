# P-10 Personal (HU-07, Should)

Actualizado en la tarea 1.2b: estado de bloqueo y acción "Desbloquear" (`docs/seguridad.md` §6.1.6), reconfirmación del PIN del encargado en toda escritura (SEC-007) y reglas de PIN por rol (§6.1.1-2).

```
+------------------------------------------------------------------------------------------+
| Personal                                        Marta · Encargado  [⎋ Cerrar sesión]     |
+------------------------------------------------------------------------------------------+
|                                                                  [ + NUEVO USUARIO ]     |
| Nombre    Rol          Estado                              Acciones                      |
| Lucía     Camarero     [🔒 Bloqueado hasta desbloquear]     [Desbloquear] [Editar] [⋯]     |
| Javi      Barra        [🔒 Bloqueado · 12 min]              [Desbloquear] [Editar] [⋯]     |
| Ana       Camarero     Activo · PIN provisional            [Editar] [⋯]                  |
| Pedro     Camarero     Desactivado                         [Editar] [Activar]            |
| Marta     Encargado    Activo                              [Editar] [⋯]                  |
|                        ⓘ Debe existir al menos un encargado activo (en [⋯], Desactivar  |
|                          está deshabilitado con este texto)                              |
+------------------------------------------------------------------------------------------+
  [⋯] = Restablecer PIN · Desactivar (menú con texto, objetivos de 48 px)
```
- **Orden:** primero los usuarios bloqueados (lo que requiere acción), después por nombre.
- **Estado en texto** (nunca solo color): "Activo", "Activo · PIN provisional", "Desactivado" (fila en `text-secondary`), "🔒 Bloqueado · N min" (bloqueo temporal, con los minutos que quedan, actualizado cada minuto) y "🔒 Bloqueado hasta desbloquear" (indefinido). Las insignias de bloqueo usan el estilo Aviso del design system (8,15:1).
- Si hay usuarios bloqueados, encima de la tabla aparece un bloque de Aviso: "2 usuarios bloqueados por demasiados intentos de PIN" (relacionado con las alertas de §6.1.7).

## Escrituras: todas piden el PIN del encargado (SEC-007)

Crear usuario, cambiar el rol, activar, desactivar, restablecer PIN y desbloquear. Cambiar **solo el nombre** no pide PIN (`docs/arquitectura.md` §5). Cada una abre su diálogo de confirmación con la variante "Reconfirmación" del design system §5.10b integrada (nombre fijo "PIN de Marta (6 dígitos)" + teclado), y el botón final lleva el verbo: "Confirmar y crear usuario", "Confirmar y desbloquear"… Un PIN incorrecto no aplica nada, conserva lo escrito en el formulario y cuenta para el bloqueo de quien lo escribe. Los mensajes de error y bloqueo son los de la tabla de §5.10b.

### Desbloquear

```
+--------------------------------------------------+
| ¿Desbloquear a Lucía?                            |
| Su cuenta está bloqueada por demasiados intentos |
| de PIN fallidos.                                 |
| Podrá volver a entrar con su PIN actual y el     |
| contador de intentos vuelve a cero.              |
|                                                  |
| ⓘ Si Lucía no recuerda su PIN, usa              |
|   "Restablecer PIN" en lugar de desbloquear.     |
|                                                  |
| Confirma con tu PIN                              |
| PIN de Marta (6 dígitos)   ● ● ○ ○ ○ ○           |
| [teclado numérico de 72 px]                      |
| (zona de mensaje)                                |
|                                                  |
| [Volver]             [ CONFIRMAR Y DESBLOQUEAR ] |  <- primario del diálogo
+--------------------------------------------------+
```
- Disponible para usuarios con bloqueo **temporal o indefinido**. (Decisión de diseño: §6.1.6 no limita el desbloqueo al indefinido y así el encargado presente evita esperas de 15 o 60 min. Si Cybersecurity lo quiere solo para el indefinido, el botón se oculta en los temporales.)
- Éxito: toast "Lucía desbloqueada: ya puede iniciar sesión" y el estado pasa a "Activo".
- Un encargado no puede desbloquearse a sí mismo (no puede estar en sesión si está bloqueado). Si el único encargado está bloqueado, el desbloqueo lo hace soporte técnico con `unlock-user` (ver P-01).

### Nuevo usuario (1 formulario de 3 campos, HU-07)
- Nombre visible (obligatorio), 1-30 caracteres, único. Error: "Ya existe un usuario con ese nombre."
- Rol (obligatorio): botones de opción Camarero/cajero · Barra/cocina · Encargado.
- PIN inicial (obligatorio): campo numérico enmascarado con "Mostrar" mientras se escribe. La regla visible cambia con el rol elegido ("De 4 a 6 dígitos…" o "Exactamente 6 dígitos…"; textos y errores en `01-login.md`, "Reglas de PIN"). Una vez guardado no se vuelve a mostrar.
- Debajo del formulario, la reconfirmación con el PIN del encargado. Botones: [Cancelar] [CONFIRMAR Y CREAR USUARIO].
- Hay que distinguir los dos PIN: el del usuario nuevo va en el campo "PIN inicial de Ana" y el del encargado en la sección "Confirma con tu PIN · PIN de Marta", con sus etiquetas, en bloques separados.

### Editar (cambiar rol)
Si se cambia el rol a Encargado y el PIN actual del usuario tiene menos de 6 dígitos, el diálogo avisa antes de confirmar: "Ana tendrá que crear un PIN de 6 dígitos al entrar antes de poder usar la aplicación" (`seguridad.md` §6.1.1).

### Restablecer PIN y Desactivar
- Restablecer PIN: diálogo "¿Restablecer el PIN de Lucía?" + reconfirmación -> pantalla con el PIN provisional y "Lucía tendrá que cambiarlo al entrar". También pone a cero su contador de intentos.
- Desactivar: diálogo "¿Desactivar a Pedro? Su sesión se cerrará en menos de 1 minuto." + reconfirmación -> [Volver] [Confirmar y desactivar] (peligro).

## Estados
| Estado | Qué se ve |
|---|---|
| Vacío | Solo el encargado inicial: "Da de alta a tu equipo" + "Nuevo usuario" |
| Cargando | Esqueleto de la tabla |
| Error en campo | Bajo el campo, con la regla |
| Error de PIN del encargado / bloqueo | Tabla de §5.10b (variante Reconfirmación); el formulario conserva los datos |
| Éxito | Toasts "Usuario creado", "Lucía desbloqueada: ya puede iniciar sesión", "PIN restablecido", "Pedro desactivado" |

## Criterios cubiertos
| Historia | Criterio | Cómo |
|---|---|---|
| HU-07 | Alta en 1 formulario de 3 campos | Nombre, rol, PIN (la reconfirmación es del encargado, no un campo del alta) |
| HU-07 | Lista con nombre, rol y estado en texto | Tabla, con los estados de bloqueo [1.2b] |
| HU-07 / SEC-001 | Desbloquear a un usuario bloqueado | Acción "Desbloquear" [1.2b] |
| HU-07 / SEC-007 | PIN del encargado en cada escritura | Reconfirmación en cada diálogo [1.2b] |
| HU-07 / SEC-001 | Reglas de PIN por rol; promoción a encargado con PIN corto | Regla según el rol; aviso al cambiar el rol [1.2b] |
