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
|                PIN (4 a 6 dígitos)            <- etiqueta visible          |
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
|                +-------+ +-------+ +-------+    con menos de 4 dígitos      |
+----------------------------------------------------------------------------+
```

## Estados

| Estado | Qué se ve |
|---|---|
| Vacío | Rejilla sin usuarios (instalación sin datos): "Todavía no hay usuarios. Pide al encargado que te dé de alta." |
| Cargando | Esqueleto de 4 tarjetas; en el paso 2, "Entrar" muestra "Entrando…" y queda deshabilitado |
| Error | "⚠ Usuario o PIN incorrectos" bajo el campo; el PIN se vacía; el foco vuelve al campo |
| Bloqueado | Bloque de Aviso: "Demasiados intentos. Podrás volver a intentarlo en 4:59" con cuenta atrás; el teclado se deshabilita |
| Desactivado | "⚠ Usuario desactivado, contacta con el encargado" |
| PIN provisional (HU-07) | Paso extra: "Crea tu PIN" -> "Repite tu PIN" con la regla visible: "4 a 6 dígitos, sin repetir el mismo (1111) ni secuencias (1234)" |
| Sesión caducada | Banner informativo en el paso 1: "Sesión cerrada por inactividad" |
| Éxito | Navega a P-02 (camarero/encargado) o P-05 (barra) |

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

Nota para Cybersecurity: el paso 1 muestra la lista de nombres de usuario a quien tenga el dispositivo (es habitual en hostelería y ahorra un paso). Si se considera un riesgo, la alternativa "Escribir mi usuario" ya existe y se podría dejar como única vía (el flujo sigue teniendo 2 pasos).
