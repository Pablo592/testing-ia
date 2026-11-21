# P-10 Personal (HU-07, Should) — ligero

```
+---------------------------------------------------------------------------------+
| Personal                                      Marta · Encargado  [⎋ Cerrar sesión] |
+---------------------------------------------------------------------------------+
|                                                         [ + NUEVO USUARIO ]     |
| Nombre      Rol          Estado          Acciones                               |
| Lucía       Camarero     Activo          [Editar] [Restablecer PIN] [Desactivar] |
| Javi        Barra        Activo          [Editar] [Restablecer PIN] [Desactivar] |
| Pedro       Camarero     Desactivado     [Editar] [Activar]                      |
| Marta       Encargado    Activo          [Editar] [Restablecer PIN] [Desactivar] |
|                                          ⓘ Debe existir al menos un encargado    |
|                                            activo (Desactivar deshabilitado)      |
+---------------------------------------------------------------------------------+
```
Estado en texto (y la fila desactivada en `text-secondary` + la palabra "Desactivado").

Formulario "Nuevo usuario" (3 campos):
- Nombre visible (obligatorio), 1-30 caracteres, único. Error: "Ya existe un usuario con ese nombre."
- Rol (obligatorio): radios Camarero/cajero · Barra/cocina · Encargado.
- PIN inicial (obligatorio): campo numérico enmascarado con un botón "Mostrar" mientras se escribe. Regla visible: "4 a 6 dígitos, sin repetir el mismo (1111) ni secuencias (1234)". Una vez guardado, no se vuelve a mostrar.
- [Cancelar] [CREAR USUARIO]

Restablecer PIN: diálogo con el PIN provisional + "El usuario tendrá que cambiarlo al entrar". Desactivar: diálogo "¿Desactivar a Pedro? Su sesión se cerrará en menos de 1 minuto." [Volver] [Desactivar usuario].

Estados: vacío (solo el encargado inicial: "Da de alta a tu equipo"), cargando (esqueleto), error en campo, éxito (toast "Usuario creado").

| Historia | Criterio UX | Cómo |
|---|---|---|
| HU-07 | Alta en 1 formulario de 3 campos | Nombre, rol, PIN |
| HU-07 | Lista con nombre, rol y estado en texto | Tabla |
