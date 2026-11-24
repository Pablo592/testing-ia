# P-01 Inicio de sesión (HU-01)

Dispositivos: tablet de 10" (horizontal y vertical), TPV y pantalla de barra. Wireframe a 1024x768.

## Paso 1: elegir usuario

```
+----------------------------------------------------------------------------+
| Café · Toma de pedidos                                     [ Sin sesión ]   |  barra superior 64 px
+----------------------------------------------------------------------------+
|                                                                            |
|   ¿Quién eres?                                              (text-2xl)     |
|                                                                            |
|   +----------------+  +----------------+  +----------------+  +----------+ |
|   |  (LU)          |  |  (JA)          |  |  (MA)          |  |  (PE)    | |
|   |  Lucía         |  |  Javi          |  |  Marta         |  |  Pedro   | |
|   |  Camarero      |  |  Barra         |  |  Encargado     |  |  Camarero| |
|   +----------------+  +----------------+  +----------------+  +----------+ |
|     tarjetas de 160x120 px, iniciales + nombre + rol en texto, 16 px de    |
|     separación; orden alfabético; desplazamiento vertical si hay más de 12  |
|                                                                            |
|   ¿No apareces?  [ Escribir mi usuario ]   (botón fantasma)                |
+----------------------------------------------------------------------------+
```

## Paso 2: PIN

```
+----------------------------------------------------------------------------+
| Café · Toma de pedidos                                     [ Sin sesión ]   |
+----------------------------------------------------------------------------+
|  [< Cambiar de usuario]                                                    |
|                                                                            |
|                Hola, Lucía (Camarero)                                       |
|                                                                            |
|                PIN (4 a 6 dígitos)            <- etiqueta visible; "(6     |
|                                                  dígitos)" si el usuario   |
|                                                  elegido es encargado      |
|                +-------------------------+                                 |
|                |   ●  ●  ●  ○  ○  ○      |   <- puntos, nunca dígitos      |
|                +-------------------------+                                 |
|                ⚠ Usuario o PIN incorrectos     <- solo si hay error;       |
|                                                   texto danger + icono,    |
|                +-------+ +-------+ +-------+      role="alert"; el PIN se  |
|                |   1   | |   2   | |   3   |      vacía al mostrarlo       |
|                +-------+ +-------+ +-------+                               |
|                |   4   | |   5   | |   6   |   teclas de 72x72 px          |
|                +-------+ +-------+ +-------+   separación 8 px             |
|                |   7   | |   8   | |   9   |                               |
|                +-------+ +-------+ +-------+                               |
|                |⌫Borrar| |   0   | |ENTRAR | <- primario; deshabilitado    |
|                +-------+ +-------+ +-------+    con menos de 4 dígitos (6   |
|                                                 si es encargado)           |
+----------------------------------------------------------------------------+
```

## Estados

| Estado | Qué se ve |
|---|---|
| Vacío | Rejilla sin usuarios (instalación sin datos): "Todavía no hay usuarios. Pide al encargado que te dé de alta." |
| Cargando | Esqueleto de 4 tarjetas; en el paso 2, "Entrar" muestra "Entrando…" y queda deshabilitado |
| Error (`401`) | "⚠ Usuario o PIN incorrectos" bajo el campo; el PIN se vacía; el foco vuelve al campo. No se indica cuántos intentos quedan |
| Bloqueo temporal (`423`, 5, 15 o 60 min) [1.2b] | Ver "Mensajes de bloqueo" |
| Bloqueo indefinido (`423 ACCOUNT_LOCKED_MANUAL`) [1.2b] | Ver "Mensajes de bloqueo" |
| Demasiados intentos desde el dispositivo (`429`) [1.2b] | Ver "Mensajes de bloqueo" |
| Desactivado (`403`, solo con el PIN correcto) | "⚠ Usuario desactivado, contacta con el encargado" |
| Sin conexión / `5xx` | "No se ha podido conectar. Reintenta." (no cuenta como intento); el PIN se vacía |
| PIN provisional (HU-07/CA-F04) o promoción a encargado con PIN corto (HU-07/CA-F09) [1.2c] | Pantalla "Cambio obligatorio del PIN" (sección propia, abajo). Mientras no lo cambie, solo puede cambiar el PIN o cerrar sesión |
| Sesión cerrada por el sistema [1.2c] | Banner informativo en el paso 1 con el motivo (tabla "Vuelta al inicio de sesión") |
| Éxito | Navega a P-02 (camarero/encargado) o P-05 (barra) |

## Mensajes de bloqueo [1.2b] (`docs/seguridad.md` §6.1; textos de SEC-001 para HU-01)

Todos en el paso 2, en el sitio del mensaje de error, como bloque de Aviso con icono de candado, `role="alert"` al aparecer. Con un bloqueo activo, el teclado y "Entrar" se deshabilitan (no se envían intentos que no cuentan) y "Cambiar de usuario" sigue activo. El tiempo lo da el servidor (`retryAfterSeconds` / `Retry-After`): "N min", con los minutos restantes redondeados hacia arriba (con 4 min 1 s, "5 min"; nunca "0 min"; interpretación I-03 de `docs/testing.md`) [1.2c], anunciado al lector de pantalla al aparecer y cada minuto.

```
+---------------------------------------------------+
| 🔒 Demasiados intentos fallidos.                  |   bloqueo temporal
|    Podrás volver a intentarlo en 5 min.           |   (5 / 15 / 60 min)
+---------------------------------------------------+
| 🔒 Cuenta bloqueada. Pide al encargado que la      |   bloqueo indefinido
|    desbloquee.                                    |   (20 fallos seguidos)
|    [Cambiar de usuario]                           |
+---------------------------------------------------+
| 🔒 Demasiados intentos desde este dispositivo.     |   429: afecta a todos
|    Espera 9 min.                                  |   los usuarios del
+---------------------------------------------------+   dispositivo
```

| Caso | Texto exacto | Detalle |
|---|---|---|
| Bloqueo de 5, 15 o 60 min | "Demasiados intentos fallidos. Podrás volver a intentarlo en 5 min." | Cuenta atrás. Al llegar a 0, el bloque desaparece y el teclado se habilita solo. Con 60 min: "en 58 min"; con 4 min 1 s: "en 5 min". No se dice qué nivel de bloqueo es ni cuántos fallos quedan para el siguiente |
| Bloqueo indefinido | "Cuenta bloqueada. Pide al encargado que la desbloquee." | Sin cuenta atrás; teclado oculto. Si el usuario elegido es encargado (dato que ya muestra la rejilla), segunda línea: "Si no hay otro encargado, contacta con el soporte técnico." (desbloqueo con `unlock-user`, §6.1.6) |
| `429` por dispositivo | "Demasiados intentos desde este dispositivo. Espera 9 min." | Afecta a cualquier usuario: el mismo aviso aparece también como banner en el paso 1 hasta que acabe, para que nadie elija otro usuario y vuelva a fallar |

## Cambio obligatorio del PIN [1.2c] (HU-07/CA-F04, CA-F09; `docs/arquitectura.md` §5, `POST /auth/pin`)

**En el MVP no existe el cambio voluntario del PIN** (decisión de la ronda 1.1f y de la arquitectura 1.3c): no hay opción "Cambiar mi PIN" en la barra superior ni en ningún menú. Un PIN que se sospecha visto lo restablece el encargado en P-10 ("Restablecer PIN"). Esta pantalla solo aparece cuando la sesión tiene `mustChangePin`:
- tras entrar con un PIN provisional (alta o restablecimiento, HU-07/CA-F01, CA-F04);
- cuando un usuario con PIN de menos de 6 dígitos pasa a ser encargado (HU-07/CA-F09). Si tiene la sesión abierta, aparece **en su siguiente acción**, desde cualquier pantalla (el servidor responde que hace falta el cambio y la app abre esta pantalla). Lo que estuviera escribiendo se pierde, porque el servidor no admite otra acción hasta el cambio.

Tres pasos en la misma pantalla, con el teclado de 72 px y la regla visible según el rol:

```
+----------------------------------------------------------------+
| Cambia tu PIN                       Ana · Encargado [⎋ Cerrar sesión] |
+----------------------------------------------------------------+
|  Antes de seguir tienes que crear un PIN nuevo.                |
|  Paso 1 de 3 · PIN actual (el provisional que te dio el        |
|  encargado)               ● ● ● ● ○ ○                          |
|  (Paso 2: PIN nuevo · Paso 3: Repite el PIN nuevo)             |
|  Exactamente 6 dígitos. No vale: el mismo dígito repetido...   |  <- regla (pasos 2 y 3)
|  (zona de mensaje, role="alert")                               |
|  [teclado numérico 72 px]                                      |
|  [< Atrás]                               [ SIGUIENTE ] / [ GUARDAR PIN ] |
+----------------------------------------------------------------+
```
- Se pide el PIN actual porque el cliente no lo guarda tras el login (RS-29b) y el servidor lo exige (`currentPin`).
- Las reglas del PIN nuevo se comprueban al terminar el paso 2 (errores de "Reglas de PIN", abajo); "Los dos PIN no coinciden" en el paso 3 vuelve al paso 2.
- Éxito: toast "PIN cambiado" y paso a P-02 o P-05 según el rol. Las demás sesiones de ese usuario se cierran (lo hace el servidor).

| Respuesta del servidor | Mensaje (junto al campo, en el paso 1) | Qué pasa |
|---|---|---|
| `403 PIN_INVALID` | "⚠ El PIN actual no es correcto." | PIN actual vaciado; vuelve al paso 1; el PIN nuevo escrito se descarta (hay que repetirlo); cuenta para el bloqueo (HU-01/CA-F06) |
| `423 LOCKED` (5, 15 o 60 min) | "🔒 Demasiados intentos fallidos. Podrás volver a intentarlo en 5 min." | Teclado y "Guardar PIN" deshabilitados con la cuenta atrás; "Cerrar sesión" activo. Al acabar, se habilitan solos |
| `423 ACCOUNT_LOCKED_MANUAL` (20 fallos) | — | El servidor revoca todas sus sesiones: vuelve a P-01 con "Cuenta bloqueada. Pide al encargado que la desbloquee." (HU-01/CA-F13) |
| `429 TOO_MANY_ATTEMPTS` (por dispositivo o por sesión) | "🔒 Demasiados intentos desde este dispositivo. Espera 9 min." | Teclado deshabilitado con la cuenta atrás; "Cerrar sesión" activo |
| `400` (el PIN nuevo incumple una regla) | El texto de la regla bajo el campo | Vuelve al paso 2 |
| Sin conexión / `5xx` | "No se ha podido guardar el PIN. Reintenta." | No cuenta como intento |

## Vuelta al inicio de sesión [1.2c] (HU-01/CA-F08, CA-F09, CA-F13, CA-N06; HU-07/CA-F03)

Cuando el servidor cierra o revoca una sesión, el dispositivo vuelve a P-01 (en <= 1 s si la pantalla está abierta, también la cola de barra, por el evento `session.revoked`) y el paso 1 muestra un banner con el motivo. Lo que se estaba escribiendo y no se había enviado se pierde (salvo el borrador de pedido de HU-02, que conserva la arquitectura para el mismo usuario).

| Motivo | Banner en P-01 |
|---|---|
| Inactividad de 15 min (HU-01/CA-F09) | "Sesión cerrada por inactividad." (a los 14 min, aviso "Tu sesión se cerrará en 60 s por inactividad · Seguir conectado") |
| Caducidad de 12 h (HU-01/CA-N06) | "La sesión ha caducado (12 h). Vuelve a entrar con tu PIN." |
| Usuario desactivado (HU-07/CA-F03) | "Usuario desactivado, contacta con el encargado." |
| PIN restablecido por el encargado | "El encargado ha restablecido tu PIN: entra con el PIN provisional." |
| PIN cambiado en otro dispositivo | "Has cambiado tu PIN en otro dispositivo: vuelve a entrar." |
| Bloqueo indefinido de la cuenta (HU-01/CA-F13) | "Cuenta bloqueada. Pide al encargado que la desbloquee." Al elegir ese usuario, el paso 2 muestra el mismo bloque de bloqueo indefinido |
| Cerrar sesión (HU-01/CA-F08) | Sin banner |

Un **bloqueo temporal** con la sesión abierta no la cierra (HU-01/CA-F12): ver "Reconfirmación con la cuenta bloqueada" en el design system §5.10b.

## Reglas de PIN [1.2b] (`docs/seguridad.md` §6.1.1-2; mismos textos en P-10)
Texto de ayuda bajo el campo al crear o cambiar un PIN:
- Camarero/cajero y barra: "De 4 a 6 dígitos. No vale: el mismo dígito repetido (1111), secuencias de 4 o más (1234, 9876), bloques repetidos (1212) ni los PIN más comunes."
- Encargado: "Exactamente 6 dígitos. No vale: …" (mismo resto).

Errores (uno a la vez, bajo el campo, indicando la regla): "El PIN debe tener de 4 a 6 dígitos" / "El PIN de un encargado debe tener 6 dígitos" / "No uses el mismo dígito repetido" / "No uses secuencias como 1234 o 9876" / "No uses bloques repetidos como 1212" / "Ese PIN es demasiado común: elige otro" / "Los dos PIN no coinciden".

## Responsive
- 375 px: tarjetas de usuario en 2 columnas; teclado de 64x64 a todo el ancho.
- 768 px vertical: 3 columnas de tarjetas; teclado centrado.
- 1440/1920 px: 4-6 columnas; teclado centrado de ancho máximo 360 px.

## Criterios cubiertos
| Criterio | Cómo |
|---|---|
| HU-01/CA-U01 | Paso 1 (usuario) + paso 2 (PIN + Entrar) |
| HU-01/CA-U02 | Teclas de 72x72 px (64 en 375 px) |
| HU-01/CA-U03, CA-F05 | "Usuario o PIN incorrectos" bajo el campo, con icono y texto; PIN vaciado |
| HU-01/CA-U04 | Paso 2 "Hola, Lucía (Camarero)"; después, en la barra superior |
| HU-01/CA-F01, CA-F02, CA-F03 | Éxito: P-02 (camarero y encargado) o P-05 (barra) |
| HU-01/CA-F06 | "Mensajes de bloqueo": 5/15/60 min con cuenta atrás e indefinido |
| HU-01/CA-F07 | "Usuario desactivado, contacta con el encargado" |
| HU-01/CA-F09, CA-N06, CA-F13 | Tabla "Vuelta al inicio de sesión" [1.2c] |
| HU-01/CA-F11 | Mensaje de `429` por dispositivo, también en el paso 1 |
| HU-01/CA-N01 | "PIN (6 dígitos)" para encargado; "(4 a 6 dígitos)" para el resto |
| HU-01/CA-N04 | Etiqueta visible "PIN (…)"; tokens con contraste verificado |
| HU-07/CA-F04, CA-F09 | "Cambio obligatorio del PIN" [1.2c] |
| HU-07/CA-F06 | "Reglas de PIN" |

Rejilla de usuarios del paso 1: aceptada por Cybersecurity (`docs/seguridad.md` §6.3, SEC-005) con la condición de que el login solo sea accesible desde la red del personal. Muestra solo nombre y rol de usuarios activos, **nunca** su estado de bloqueo. Se mantiene "Escribir mi usuario".
