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
| PIN provisional (HU-07) o promoción a encargado con PIN corto [1.2b] | Paso extra "Crea tu PIN" -> "Repite tu PIN", con la regla visible según el rol (ver "Reglas de PIN"). Mientras no lo cambie, solo puede cambiar el PIN o cerrar sesión |
| Sesión caducada | Banner informativo en el paso 1: "Sesión cerrada por inactividad" |
| Éxito | Navega a P-02 (camarero/encargado) o P-05 (barra) |

## Mensajes de bloqueo [1.2b] (`docs/seguridad.md` §6.1; textos de SEC-001 para HU-01)

Todos en el paso 2, en el sitio del mensaje de error, como bloque de Aviso con icono de candado, `role="alert"` al aparecer. Con un bloqueo activo, el teclado y "Entrar" se deshabilitan (no se envían intentos que no cuentan) y "Cambiar de usuario" sigue activo. El tiempo lo da el servidor (`retryAfterSeconds` / `Retry-After`): "m:ss" por debajo de 10 min y "N min" por encima, anunciado al lector de pantalla al aparecer y cada minuto.

```
+---------------------------------------------------+
| 🔒 Demasiados intentos fallidos.                  |   bloqueo temporal
|    Podrás volver a intentarlo en 4:59.            |   (5 / 15 / 60 min)
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
| Bloqueo de 5, 15 o 60 min | "Demasiados intentos fallidos. Podrás volver a intentarlo en 4:59." | Cuenta atrás. Al llegar a 0, el bloque desaparece y el teclado se habilita solo. Con 60 min: "en 58 min". No se dice qué nivel de bloqueo es ni cuántos fallos quedan para el siguiente |
| Bloqueo indefinido | "Cuenta bloqueada. Pide al encargado que la desbloquee." | Sin cuenta atrás; teclado oculto. Si el usuario elegido es encargado (dato que ya muestra la rejilla), segunda línea: "Si no hay otro encargado, contacta con el soporte técnico." (desbloqueo con `unlock-user`, §6.1.6) |
| `429` por dispositivo | "Demasiados intentos desde este dispositivo. Espera 9 min." | Afecta a cualquier usuario: el mismo aviso aparece también como banner en el paso 1 hasta que acabe, para que nadie elija otro usuario y vuelva a fallar |

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
| Historia | Criterio UX | Cómo |
|---|---|---|
| HU-01 | <= 2 pasos | Paso 1 (usuario) + paso 2 (PIN + Entrar) |
| HU-01 | Teclado con botones >= 44x44 | 72x72 px (64 en 375 px) |
| HU-01 | Error junto al campo, en texto, PIN vaciado | Bloque bajo el campo PIN con icono y texto |
| HU-01 | Nombre y rol visibles en todas las pantallas | Paso 2 "Hola, Lucía (Camarero)"; después, en la barra superior |
| HU-01 (no func.) | Campos con etiqueta accesible, contraste >= 4,5 | Etiqueta visible "PIN (4 a 6 dígitos)"; tokens verificados |
| HU-01 [1.2b] | Bloqueo progresivo y por dispositivo con tiempo restante | "Mensajes de bloqueo" |
| HU-01 / HU-07 [1.2b] | Reglas de PIN por rol | "Reglas de PIN" |

Rejilla de usuarios del paso 1: aceptada por Cybersecurity (`docs/seguridad.md` §6.3, SEC-005) con la condición de que el login solo sea accesible desde la red del personal. Muestra solo nombre y rol de usuarios activos, **nunca** su estado de bloqueo. Se mantiene "Escribir mi usuario".
