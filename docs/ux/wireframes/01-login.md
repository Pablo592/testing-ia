# P-01 Inicio de sesión (HU-01)

Dispositivos: tablet de 10" (horizontal y vertical), TPV y pantalla de barra. Wireframe a 1024x768.
Actualizado en la tarea 2.1d (2026-11-24): banners de "Vuelta al inicio de sesión" según `details.reason`/`revokedReason` del `401` y `reason` de `session.revoked` (`docs/arquitectura.md` §5, §6); texto del `423 LOCKED` en el cambio obligatorio del PIN alineado con HU-01/CA-F12 (c) (T-30); regla `digits_only`; título del documento.

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
| Error (`401 INVALID_CREDENTIALS`) | "⚠ Usuario o PIN incorrectos" bajo el campo; el PIN se vacía; el foco vuelve al campo. No se indica cuántos intentos quedan |
| Bloqueo temporal (`423`, 5, 15 o 60 min) [1.2b] | Ver "Mensajes de bloqueo" |
| Bloqueo indefinido (`423 ACCOUNT_LOCKED_MANUAL`) [1.2b] | Ver "Mensajes de bloqueo" |
| Demasiados intentos desde el dispositivo (`429`) [1.2b] | Ver "Mensajes de bloqueo" |
| Desactivado (`403`, solo con el PIN correcto) | "⚠ Usuario desactivado, contacta con el encargado" |
| Sin conexión / `5xx` | "No se ha podido conectar. Reintenta." (no cuenta como intento); el PIN se vacía |
| PIN provisional (HU-07/CA-F04) o promoción a encargado con PIN corto (HU-07/CA-F09) [1.2c] | Pantalla "Cambio obligatorio del PIN" (sección propia, abajo). Mientras no lo cambie, solo puede cambiar el PIN o cerrar sesión |
| Sesión cerrada por el sistema [1.2c, 2.1d] | Banner en el paso 1 con el motivo (tabla "Vuelta al inicio de sesión") |
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
- `currentPin` y `newPin` se envían juntos al pulsar "Guardar PIN" (paso 3), así que los errores del servidor llegan con la pantalla en el paso 3.
- Éxito: toast "PIN cambiado" y paso a P-02 o P-05 según el rol. Las demás sesiones de ese usuario se cierran (lo hace el servidor).

| Respuesta del servidor | Mensaje (en la zona de mensaje, `role="alert"`, bajo los indicadores del PIN) | Qué pasa |
|---|---|---|
| `403 PIN_INVALID` | "⚠ El PIN actual no es correcto." | PIN actual vaciado; vuelve al paso 1; el PIN nuevo escrito se descarta (hay que repetirlo); cuenta para el bloqueo (HU-01/CA-F06) |
| `423 LOCKED` (5, 15 o 60 min) [2.1d, T-30] | "🔒 Cuenta bloqueada. Espera 5 min." + "No se ha cambiado el PIN." (texto de HU-01/CA-F12 (c), el mismo que la reconfirmación del design system §5.10b; minutos redondeados hacia arriba, I-03). El servidor lo rechaza sin comprobar el PIN y no cuenta como fallo. El intento que **activa** el bloqueo muestra el mensaje normal "⚠ El PIN actual no es correcto." (fila anterior, CA-F12 (b)); este aparece en el siguiente | La pantalla se queda en el paso donde estaba (el de "Guardar PIN"); los tres PIN se vacían (RS-29b) y los indicadores quedan vacíos; teclado y "Guardar PIN" deshabilitados con la cuenta atrás; "Cerrar sesión" activo. Al acabar el bloqueo, vuelve al paso 1 con el teclado habilitado (CA-F12 (d)) |
| `423 ACCOUNT_LOCKED_MANUAL` (20 fallos) | — | El servidor revoca todas sus sesiones: vuelve a P-01 con "Cuenta bloqueada. Pide al encargado que la desbloquee." (HU-01/CA-F13) |
| `429 TOO_MANY_ATTEMPTS` (solo por dispositivo/IP: `POST /auth/pin` no tiene límite por sesión, T-20) | "🔒 Demasiados intentos desde este dispositivo. Espera 9 min." | Como en `423 LOCKED`: PIN vaciados, teclado y "Guardar PIN" deshabilitados con la cuenta atrás; "Cerrar sesión" activo; al acabar, paso 1 |
| `400` (el PIN nuevo incumple una regla) | El texto de la regla bajo el campo | Vuelve al paso 2 |
| Sin conexión / `5xx` | "No se ha podido guardar el PIN. Reintenta." | No cuenta como intento |

## Vuelta al inicio de sesión [1.2c] (HU-01/CA-F08, CA-F09, CA-F13, CA-N06; HU-07/CA-F03)

Cuando el servidor cierra o revoca una sesión, el dispositivo vuelve a P-01 (en <= 1 s si la pantalla está abierta, también la cola de barra, por el evento `session.revoked`) y el paso 1 muestra un banner con el motivo. Lo que se estaba escribiendo y no se había enviado se pierde (salvo el borrador de pedido de HU-02, que conserva la arquitectura para el mismo usuario).

La app elige el banner por el **motivo** que da el servidor, venga por el evento SSE `session.revoked` (`reason`) o por el `401 UNAUTHENTICATED` de cualquier petición (`details.reason` y, si es `revoked`, `details.revokedReason`), lo que llegue antes (`docs/arquitectura.md` §5, §6) [2.1d]. Los dos usan los mismos valores. No se decide nunca por `error.message`.

| `reason` del `401` | `revokedReason` / `reason` de `session.revoked` | Banner en P-01 (texto exacto) | Icono |
|---|---|---|---|
| `idle` (HU-01/CA-F09) | — | "Sesión cerrada por inactividad." (a los 14 min, aviso "Tu sesión se cerrará en 60 s por inactividad · Seguir conectado") | `info` |
| `absolute` (HU-01/CA-N06) [2.1d] | — | "La sesión ha caducado por duración máxima. Vuelve a entrar con tu PIN." (sin "12 h": la duración es configurable a la baja con `SESSION_MAX_HOURS`, 1–12, y el texto no puede dar un dato falso) | `info` |
| `revoked` | `user_disabled` (HU-07/CA-F03) | "Usuario desactivado, contacta con el encargado." | `user-x` |
| `revoked` | `pin_reset` | "El encargado ha restablecido tu PIN: entra con el PIN provisional." | `info` |
| `revoked` | `pin_changed` | "Has cambiado tu PIN en otro dispositivo: vuelve a entrar." | `info` |
| `revoked` | `account_locked_manual` (HU-01/CA-F13) | "Cuenta bloqueada. Pide al encargado que la desbloquee." | `lock` |
| `revoked` | `logout` (HU-01/CA-F08) | Sin banner | — |
| `401` sin `details` (sin cookie o token desconocido) | — | Sin banner | — |
| Valor desconocido o `revoked` sin `revokedReason` (versiones futuras de la API) | — | "La sesión se ha cerrado. Vuelve a entrar con tu PIN." | `info` |

Reglas del banner [2.1d]:
- Bloque con los tokens de Aviso (design system §1.2: texto `#78350f` sobre `#fef3c7`, 8,15:1) con icono decorativo (`aria-hidden`) y el texto; `role="status"` (informa, no es un error de quien está delante). Va en el paso 1, entre la barra superior y "¿Quién eres?", a todo el ancho del contenido (máx. 720 px).
- Sin botón de cerrar. Desaparece al elegir un usuario o al pulsar "Escribir mi usuario", y no vuelve al pulsar "Cambiar de usuario". Si se recarga la página antes de que alguien entre, el `401` vuelve a traer el motivo y el banner reaparece (es correcto: sigue siendo cierto).
- Nunca está a la vez que el paso 2, así que su texto no se duplica con el bloque del paso 2 (el E2E busca "Cuenta bloqueada. Pide al encargado que la desbloquee." con `getByText`: debe haber un solo elemento visible con ese texto).
- Si también está el aviso de `429` del dispositivo, va primero el de `429` (es el que impide actuar) y debajo el del motivo.
- `account_locked_manual`: al **intentar entrar** con ese usuario, el servidor responde `423 ACCOUNT_LOCKED_MANUAL` y el paso 2 muestra el bloque de bloqueo indefinido de "Mensajes de bloqueo" (CA-F13: "al intentar entrar, ve…"). La rejilla no marca a ese usuario (SEC-005).

Un **bloqueo temporal** con la sesión abierta no la cierra (HU-01/CA-F12): ver "Reconfirmación con la cuenta bloqueada" en el design system §5.10b.

## Reglas de PIN [1.2b] (`docs/seguridad.md` §6.1.1-2; mismos textos en P-10)
Texto de ayuda bajo el campo al crear o cambiar un PIN:
- Camarero/cajero y barra: "De 4 a 6 dígitos. No vale: el mismo dígito repetido (1111), secuencias de 4 o más (1234, 9876), bloques repetidos (1212) ni los PIN más comunes."
- Encargado: "Exactamente 6 dígitos. No vale: …" (mismo resto).

Errores (uno a la vez, bajo el campo, indicando la regla). Correspondencia con `PinRule` de `validatePin` (`docs/arquitectura.md` §7; mismo orden) [2.1d]:

| `PinRule` / caso | Texto exacto |
|---|---|
| `digits_only` [2.1d] | "El PIN solo puede tener números del 0 al 9" |
| `length` | "El PIN debe tener de 4 a 6 dígitos" |
| `manager_length` | "El PIN de un encargado debe tener 6 dígitos" |
| `all_same` | "No uses el mismo dígito repetido" |
| `sequence` | "No uses secuencias como 1234 o 9876" |
| `repeated_block` | "No uses bloques repetidos como 1212" |
| `common` | "Ese PIN es demasiado común: elige otro" |
| Paso 3 distinto del paso 2 (solo cliente) | "Los dos PIN no coinciden" |
| `rule` desconocida (versión futura de la API) | "Ese PIN no es válido: elige otro" |

**`digits_only` [2.1d]:** el teclado en pantalla no puede producirlo y el campo **descarta** cualquier tecla física que no sea `0`–`9` (no la escribe ni la cuenta), así que en uso normal no aparece y no necesita E2E. Aun así lleva texto propio: la tabla de traducción `rule` → texto debe ser total (sin casos que caigan en un error genérico o en blanco si el campo deja pasar un carácter por un fallo, un pegado o un teclado virtual del sistema), cuesta una línea y se prueba con un unitario de esa tabla. No se añade a la ayuda bajo el campo ("De 4 a 6 dígitos…" ya lo dice).

Título del documento [2.1d]: "Inicio de sesión · Café · Toma de pedidos"; en el cambio obligatorio, "Cambia tu PIN · Café · Toma de pedidos" (WCAG 2.4.2).

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
| HU-01/CA-F09, CA-N06, CA-F13 | Tabla "Vuelta al inicio de sesión" por `reason`/`revokedReason` [1.2c, 2.1d] |
| HU-01/CA-F12 (b), (c), (d) | Cambio obligatorio del PIN, fila `423 LOCKED`: "Cuenta bloqueada. Espera X min" [2.1d, T-30] |
| HU-07/CA-F03 | Banner "Usuario desactivado, contacta con el encargado." (`user_disabled`) |
| HU-01/CA-F11 | Mensaje de `429` por dispositivo, también en el paso 1 |
| HU-01/CA-N01 | "PIN (6 dígitos)" para encargado; "(4 a 6 dígitos)" para el resto |
| HU-01/CA-N04 | Etiqueta visible "PIN (…)"; tokens con contraste verificado |
| HU-07/CA-F04, CA-F09 | "Cambio obligatorio del PIN" [1.2c] |
| HU-07/CA-F06 | "Reglas de PIN" |

Rejilla de usuarios del paso 1: aceptada por Cybersecurity (`docs/seguridad.md` §6.3, SEC-005) con la condición de que el login solo sea accesible desde la red del personal. Muestra solo nombre y rol de usuarios activos, **nunca** su estado de bloqueo. Se mantiene "Escribir mi usuario".
