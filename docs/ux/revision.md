# Revisión UX

Autor: UX/UI Designer. Un apartado por tarea de revisión; los hallazgos usan el prefijo `H-<tarea>-nn`.

## Tarea 2.3: revisión de la entrega de HU-01 (commit 4460e09, tarea 2.2)

Fecha: 2026-11-25. Alcance: P-01 (paso 1 y paso 2), cambio obligatorio del PIN, barra superior, guardas, "Acceso denegado", avisos de inactividad y caducidad, banners de vuelta al inicio de sesión y pantallas vacías (`apps/web`). Seguridad (SEC-038..SEC-046) queda fuera: ya la revisó Cybersecurity (`docs/seguridad.md` §6.8).

### Resultado

**0 hallazgos de severidad alta, 4 medios y 7 bajos.** La puerta de la Etapa 2 no se bloquea por UX (la regla es "sin hallazgos UX de severidad alta"). Los 4 medios conviene corregirlos antes de HU-02, porque HU-02 reutiliza la barra superior y el teclado del PIN.

| ID | Sev. | Pantalla | Resumen | Responsable |
|---|---|---|---|---|
| H-2.3-01 | media | Barra superior (encargado) | Sin forma de volver a "Pedidos" desde Menú, Personal, Resumen o Cola | ux-designer (diseño) y developer |
| H-2.3-02 | media | P-01 paso 2, cambio de PIN | El teclado del sistema se abre sobre el teclado propio | developer |
| H-2.3-03 | media | P-01 paso 2, cambio de PIN, avisos | El foco cae a `body` cuando el control enfocado se deshabilita o desaparece | developer |
| H-2.3-04 | media | Cambio obligatorio del PIN | El cambio de paso no se anuncia y la etiqueta del campo no dice qué PIN se pide | developer |
| H-2.3-05 | baja | Barra superior a 375 px | Menú "Gestión" tapa "Cerrar sesión" (axe `target-size`, serious) y la barra ocupa 3 filas | developer |
| H-2.3-06 | baja | Todas las de sesión | Anillo de foco del `h1` a todo el ancho de la barra: parece un campo | developer |
| H-2.3-07 | baja | P-01 paso 1 | Error de carga sin "Reintentar" ni `role="alert"`; "Cargando" sin esqueleto | developer |
| H-2.3-08 | baja | P-01 paso 2 | Puntos del PIN diminutos, sin los indicadores del wireframe | developer |
| H-2.3-09 | baja | Teclados y botones | Anillo de foco permanente en la última tecla tocada | developer |
| H-2.3-10 | baja | P-01 tras cierre del sistema | El foco queda en `body` y el motivo del cierre solo se anuncia si el lector lo lee de oficio | developer |
| H-2.3-11 | baja | Avisos de sesión, barra, bundle | Alineación de avisos, glifo "⎋" y zod en el bundle del cliente | developer |

### Cómo se ejecutó (arnés equivalente, rootless)

`sh tests/run.sh e2e|a11y|visual` no arranca (D-2.2-01/D-2.2-02, tarea 2.2b), así que no se usó. Arnés propio, sin red y sin root, con la SPA real y una API simulada en memoria:

1. **Build de la SPA** con la imagen de `compose.dev.yaml` (`localhost/mi-app-dev-tools:node26.13.1-pnpm12.21.0`): `--userns=keep-id --user 1000:1000 --cap-drop=ALL --security-opt=no-new-privileges --read-only --tmpfs /tmp --network=none`, repositorio montado `:ro`, salida a un directorio aparte. `vite build` necesita `--configLoader runner` (mismo origen que D-2.2-01: con el repositorio en `ro` no puede escribir `node_modules/.vite-temp`).
2. **Ejecución** en `mcr.microsoft.com/playwright:v1.65.1-noble` (la del lockfile), con las mismas restricciones (`--cap-drop=ALL`, `no-new-privileges`, `--read-only`, tmpfs, `--network=none`, 3 GB, 3 CPU, UID 1000), `tests/node_modules` del repositorio en `ro` y `chromiumSandbox: false` solo en este contenedor efímero (condición aprobada en `docs/seguridad.md` §6.3). Un servidor Node del propio script sirve el `dist` y simula `/api/v1` (`login-options`, `login`, `me`, `pin`, `logout`, `session/activity`, `events`) con los códigos y `details` de `docs/arquitectura.md` §5; así se provocan todos los estados (bloqueos, motivos del `401`, caducidad) sin gastar intentos reales. El reloj del navegador se adelanta con `page.clock` para los avisos de 14 min y de caducidad.
3. **Tamaños:** 375x812 (móvil), 768x1024 (tablet vertical), 1280x800 (tablet horizontal) y 1440x900; 320x568 solo para reflow. axe-core (`wcag2a/aa`, `wcag21a/aa`, `wcag22aa` y `best-practice`) en 34 estados.
4. **Capturas** referenciadas abajo: `docs/ux/capturas-2.3/` (copia de las generadas; las 147 completas y el JSON de axe y mediciones se pueden regenerar). Script: `docs/ux/arnes-2.3/harness.mjs`; resultados: `docs/ux/arnes-2.3/resultados-axe-y-notas.json`.

**Limitaciones.** (a) La API es una simulación: la comprobación de contrato real de HU-01 es de Testing. (b) **Lighthouse no se ejecutó**: no está en las imágenes permitidas y instalarlo exige red; se midió en su lugar la carga local sin red (FCP 52 ms, 3 recursos estáticos + `GET /auth/me` + `GET /auth/login-options`) y el tamaño del bundle (H-2.3-11). Falta medir con red emulada en TESTING. (c) El teclado virtual del sistema y el lector de pantalla real no se pueden emular: H-2.3-02 y H-2.3-04 se razonan sobre el DOM y el código y deben confirmarse en la tablet y con VoiceOver/TalkBack en la demo (guion de la Etapa 4). (d) La cuenta atrás de los bloqueos (cada minuto) y el redondeo no se volvieron a probar: los cubren los tests e2e/unitarios de Testing.

### Lo que cumple (sin hallazgo)

- **Textos y estados** de P-01 coinciden con `wireframes/01-login.md`: "Usuario o PIN incorrectos", bloqueo temporal, indefinido (con la línea de soporte solo para encargado), `429` (también en el paso 1), desactivado, sin conexión, y los 7 banners por motivo con los textos exactos (comprobados en el código; 5 de ellos capturados). Estados vacío ("Todavía no hay usuarios…"), cargando y error presentes.
- **Objetivos táctiles:** ningún control interactivo del paso 2 de P-01 mide menos de 44x44 px en 320, 375, 768 y 1280 (teclas 72x72, 64x64 a 375 y 91x64 a 320); sin desplazamiento horizontal ni a 320 px (WCAG 1.4.10).
- **Contraste:** axe sin violaciones de color en los 34 estados (tokens sin valores fuera de `tokens.css`; las únicas medidas fuera de tokens son el círculo de iniciales de 40 px y los `120`/`160`/`240`/`360`/`560` px de los wireframes).
- **Foco y teclado:** orden de tabulación lógico (en el paso 2: título, campo, teclas, acción); teclado físico solo acepta `0`-`9` (`12a3` da `123`); el `h1` recibe el foco en cada cambio de pantalla (Pedidos, Cola, Resumen, Acceso denegado, Cambia tu PIN), con título de documento correcto; tras un PIN erróneo, el foco vuelve al campo.
- **"Acceso denegado"** (waiter en `/menu`, barra en `/pedidos`): un solo `h1` con el texto, los dos textos del wireframe, un único botón primario "Ir a Pedidos" / "Ir a la cola" (enlace de 64 px), icono decorativo, 375/768/1280 correctos. Captura: `capturas-2.3/S-denegado-waiter-t1280.png`, `S-denegado-waiter-m375.png`.
- **Pantallas vacías** de Menú, Personal, Resumen y Cola: `h1` correcto, un párrafo "Esta pantalla todavía no está disponible." con contraste 7,24:1 y sin botón principal.
- **Un solo botón principal por pantalla** y etiquetas con verbo ("Entrar", "Siguiente", "Guardar PIN", "Continuar", "Seguir conectado", "Volver a entrar").
- **Avisos de caducidad e inactividad** salen a los 14 min y a los 15 min antes de las 12 h; el banner de P-01 aparece con el motivo correcto. `capturas-2.3/A-idle-aviso-m375.png`, `A-caducidad-aviso-t1280.png`, `P01-banner-idle-m375.png`.
- **Reconexión:** el cliente reconecta en silencio (vigilante de 5 s) y no muestra ningún banner "Sin conexión"; eso es correcto para HU-01 (sin datos en vivo). El banner y el indicador de conexión (`design-system.md` §5.10 y §5.11) pertenecen a HU-02/HU-03 (HU-03/CA-N02); **no es un hallazgo de esta entrega**, pero HU-02 y HU-03 deben incluirlos.
- Nada que reportar sobre la telemetría del cliente (`flujos.md` §10): `apps/web` aún no la envía y ningún criterio de HU-01 la exige.

### Hallazgos

#### H-2.3-01 (media): el encargado no puede volver a "Pedidos"
- **Pantalla:** barra superior del encargado en `/menu`, `/personal`, `/resumen` y `/cola`.
- **Dónde:** `apps/web/src/app/Layout.tsx:304-309` (la lista `GESTION` solo tiene Cola de barra, Menú, Personal y Resumen del día; no hay enlace a Pedidos en ningún sitio de la barra). Captura: `capturas-2.3/S-manager-menu-abierto-t1280.png`, `S-manager-resumen-t768.png`.
- **Criterio:** Nielsen 3 (control y libertad del usuario); HU-01/CA-F03 ("puede acceder a todas las funciones (pedidos, …)"): hoy solo llega a Pedidos al iniciar sesión.
- **Causa:** es un hueco del diseño, no un error del developer. `flujos.md:51` y `wireframes/02-pedidos.md` definen "Gestión" con 4 opciones y no la vuelta a P-02. En una tablet sin botón Atrás, la única salida es cerrar sesión y volver a entrar.
- **Estado [2.4, 2026-11-25]: diseño corregido, falta implementar (developer, 2.5).** Cambio respecto a la propuesta: la opción de la pantalla actual **no se oculta** en `/pedidos`; se marca "Estás aquí" con `aria-current="page"` para que la lista no cambie de posición. Definido en `flujos.md` §0, `wireframes/06-gestion-menu.md`, `02-pedidos.md`, `10-acceso-denegado.md` y `design-system.md` §5.11.
- **Propuesta:** ux-designer añade "Pedidos" como primera opción de "Gestión" (y la corrige en `flujos.md:51`, `02-pedidos.md` y `design-system.md` §5.11); el developer la implementa y la oculta en la propia pantalla `/pedidos`. Test para Testing: un encargado llega a `/pedidos` desde `/resumen` en 2 toques.

#### H-2.3-02 (media): el teclado del sistema tapa el teclado propio
- **Pantalla:** P-01 paso 2 y cambio obligatorio del PIN, en tablet y móvil.
- **Dónde:** `apps/web/src/features/login/PinField.tsx:342-360` (`<input type="password" inputMode="numeric">` enfocable y editable); fuerzan el foco `LoginScreen.tsx:159` y `ChangePinScreen.tsx:91` (`requestAnimationFrame(() => …focus())`) tras cada error o cambio de paso. Captura: `capturas-2.3/P01-error-t768.png` (campo enfocado con anillo).
- **Criterio:** HU-01/CA-U02 (teclado numérico propio de 72x72 px); Nielsen 7 (eficiencia) y 5 (prevención de errores). `design-system.md` §5.3 dice "también acepta el teclado físico", no "abre el del sistema".
- **Causa (razonada, no emulable en el arnés):** en Android/Chrome, tocar el campo o enfocarlo por código abre el teclado numérico del sistema, que ocupa la mitad inferior y tapa las teclas de 72 px y "Entrar"; en una tablet de 10" vertical (800x1280) deja unos 500 px de pantalla.
- **Propuesta:** `inputMode="none"` en `PinField` (el teclado físico sigue funcionando y se suprime el virtual). Mantener el foco por código solo con puntero fino. Confirmar en la tablet real en la demo.

#### H-2.3-03 (media): el foco cae a `body` cuando el control enfocado desaparece
- **Pantallas:** P-01 paso 2 con bloqueo temporal, indefinido o por dispositivo; cambio de PIN con `423` o `429`; aviso "Seguir conectado".
- **Dónde:** `LoginScreen.tsx:143-155` (los `return` de `429`, `423 ACCOUNT_LOCKED_MANUAL` y `423` salen antes de `requestAnimationFrame(... focus())` del final, y con `blocked` el campo y las teclas quedan `disabled`, `:292-307`); `ChangePinScreen.tsx:77-82` y `:131` (`423`/`429` deshabilitan todo); `Layout.tsx:375` ("Seguir conectado" se desmonta al pulsarlo). Mediciones del arnés: `document.activeElement` = `body` en los 4 anchos tras `423`, `423 MANUAL` y `429` en P-01, y en 375 y 1280 px tras `423`/`429` en el cambio de PIN y tras "Seguir conectado". Capturas: `capturas-2.3/P01-temporal-m375.png`, `P01-indefinido-t768.png`, `C-p423-m375.png`.
- **Criterio:** WCAG 2.4.3 (orden del foco) y 2.1.1 (teclado): quien usa teclado externo o conmutador vuelve al inicio del documento y tiene que tabular de nuevo (varias teclas deshabilitadas se saltan) para llegar a "Cambiar de usuario" o a "Cerrar sesión".
- **Propuesta:** al entrar en un estado de bloqueo, enfocar el bloque del mensaje (`tabindex="-1"`) o, si no, "Cambiar de usuario"; en el cambio de PIN, "Cerrar sesión" o el bloque del mensaje; tras "Seguir conectado", el `h1` de la pantalla. Regla general: un control no se deshabilita ni se desmonta mientras tiene el foco sin mover antes el foco.

#### H-2.3-04 (media): cambio de PIN, pasos sin anunciar y etiqueta ambigua
- **Pantalla:** "Cambia tu PIN", pasos 1 a 3.
- **Dónde:** `ChangePinScreen.tsx:137-147`: el campo usa siempre `label={pinLabel(isManager)}` ("PIN (6 dígitos)") y el texto del paso (`#paso-pin`, "Paso 2 de 3 · PIN nuevo") es un `<p>` sin región viva que solo se asocia con `aria-describedby`. Tras pulsar "Siguiente" el foco permanece en el botón, y el contenido cambia sin anuncio (medido: foco en `button[Siguiente]` tras pasar del paso 1 al 2 en todos los anchos). Capturas: `capturas-2.3/C-paso1-manager-t768.png`, `C-paso3-manager-m375.png`.
- **Criterio:** WCAG 4.1.3 (mensajes de estado), 2.4.6 y 3.3.2 (la etiqueta describe el propósito: "PIN actual", "PIN nuevo", "Repite el PIN nuevo"); Nielsen 1 (visibilidad del estado).
- **Propuesta:** etiqueta distinta por paso ("PIN actual (provisional)", "PIN nuevo (6 dígitos)", "Repite el PIN nuevo") y mover el texto del paso a una región `role="status"` o enfocar un título de paso (`h2` con `tabindex="-1"`) al avanzar; el `aria-describedby` sigue con la regla. Verificar con VoiceOver/TalkBack en la demo.

#### H-2.3-05 (baja): barra superior a 375 px y menú "Gestión"
- **Dónde:** `apps/web/src/ui/app.css:3-12` (`.topbar` con `flex-wrap`) y `:41-55` (`.menu-list` `position: absolute; right: 0` dentro de `.menu`, sin cierre al salir con Tab). Captura: `capturas-2.3/S-manager-menu-abierto-m375.png`.
- **Criterio:** axe `target-size` (serious, WCAG 2.5.8): con el menú abierto en el encargado a 375 px, la lista se solapa con "Cerrar sesión", que queda en la 3.ª fila. Además, la barra del encargado ocupa 3 filas (unos 160 px de 812) frente a los 64 px del design system §5.11.
- **Gravedad:** baja porque 375 px es "solo uso de emergencia" y el menú es transitorio (se cierra al tocar fuera o con Escape). A 768 y 1280 px no ocurre y axe da 0 violaciones.
- **Diseño [2.4]:** definido a <= 767 px en `flujos.md` §0 y `design-system.md` §5.11 (barra en 2 filas: `h1` + "Gestión" / nombre y rol + "Cerrar sesión"; menú como panel a ancho completo bajo la barra). Falta implementarlo (developer, 2.5); se corrige junto con H-2.3-01.
- **Propuesta:** a <= 767 px, nombre y rol en una fila propia y los dos botones juntos; abrir el menú a ancho completo bajo la barra o cerrarlo al perder el foco.

#### H-2.3-06 (baja): el anillo de foco del `h1` parece un campo
- **Dónde:** `apps/web/src/ui/tokens.css:84-89` (`h1:focus-visible` con el mismo anillo) y `app.css:14-20` (`.topbar-title` con `flex: 1 1 auto`, así que el recuadro ocupa toda la barra). Capturas: `capturas-2.3/S-manager-pedidos-m375.png`, `S-denegado-waiter-t1280.png` (recuadro azul de 1010 px alrededor de "Acceso denegado").
- **Criterio:** Nielsen 4 (consistencia: un recuadro azul con borde igual al de los campos sugiere algo editable) y 8 (diseño minimalista). Aparece con la primera carga o con teclado, no al tocar.
- **Propuesta:** `h1[tabindex="-1"]:focus { outline: none }` (el foco por código sirve al lector de pantalla y no es un control interactivo; WCAG 2.4.7 no lo exige para elementos no interactivos), o `flex: 0 1 auto` para que el anillo rodee solo el texto.

#### H-2.3-07 (baja): error de carga de la rejilla sin "Reintentar" ni alerta
- **Dónde:** `LoginScreen.tsx:217-221` ("Cargando usuarios…" y `ErrorText` "No se ha podido conectar. Reintenta."); el reintento automático cada 3 s está en `:85`. Capturas: `capturas-2.3/P01-errorcarga-t1280.png`, `P01-cargando-m375.png`.
- **Criterio:** `design-system.md` §5.12 (Error: causa y botón "Reintentar"; Cargando: esqueleto de la forma del contenido); WCAG 4.1.3 (ni el aviso de error ni "Cargando" están en una región `role="alert"`/`status`, así que el lector no los anuncia); Nielsen 9.
- **Propuesta:** botón "Reintentar" (secundario) junto al mensaje que llame a `load()`, el mensaje con `role="alert"` y el texto "Cargando usuarios…" con `role="status"` (o el esqueleto de 4 tarjetas del wireframe).

#### H-2.3-08 (baja): el PIN no muestra indicadores de dígitos
- **Dónde:** `PinField.tsx:342-360` y `app.css` (`.pin-input` con `letter-spacing: 0.5em`). El wireframe y `design-system.md` §5.3 piden puntos "●" por dígito y huecos vacíos ("● ● ● ○ ○ ○"). Captura: `capturas-2.3/P01-paso2-2digitos-t768.png` (dos puntos de unos 5 px).
- **Criterio:** Nielsen 1 (visibilidad del estado): con los puntos nativos del `password` y tan pequeños, no se ve cuántos dígitos hay ni cuántos faltan. Con 4 a 6 dígitos válidos no hay un número fijo, así que sirven 6 huecos, rellenando los tecleados.
- **Propuesta:** 6 indicadores visuales (el `input` queda para teclado físico, lector y gestor de contraseñas) con el contador "3 de 6" solo para lector.

#### H-2.3-09 (baja): el anillo de foco se queda en la última tecla tocada
- **Dónde:** `tokens.css:77-82` (el selector `button:focus, a:focus, input:focus` pinta el anillo también con puntero). Captura: `capturas-2.3/P01-paso2-2digitos-t768.png` (tecla "2" con anillo azul tras el toque) y `P01-paso2-2digitos-m375.png`.
- **Criterio:** Nielsen 8 y 4 (el anillo se confunde con una selección). `design-system.md` §5 pide foco visible "también en tablet con teclado externo", que `:focus-visible` ya cumple.
- **Propuesta:** dejar solo `:focus-visible` (quitar `button:focus, a:focus, input:focus`). Sigue visible con Tab y con teclado externo.

#### H-2.3-10 (baja): vuelta a P-01 tras un cierre del sistema, sin foco ni anuncio
- **Dónde:** `LoginScreen.tsx:162-215` (el banner `role="status"` se monta junto con la página) y `session/store.ts:119-123` (`end()`), `Layout.tsx`/`App.tsx:238` (navegación sin mover el foco). Medido: `document.activeElement` = `body` tras el cierre por inactividad en 375 y 1280 px. Captura: `capturas-2.3/P01-banner-idle-m375.png`.
- **Criterio:** WCAG 4.1.3 y 2.4.3: una región `role="status"` que existe desde el montaje no suele anunciarse; quien usa lector de pantalla no oye por qué se cerró su sesión.
- **Propuesta:** al llegar a P-01 con banner, enfocar el banner (`tabindex="-1"`) o el `h1` "¿Quién eres?" (el banner va justo antes, en el orden de lectura).

#### H-2.3-11 (baja): detalles de consistencia y de peso
- **Avisos desalineados:** `app.css:70-75` (`.session-notices` con 16 px) frente a `main.content` (32 px, `:77`): el aviso y el texto de debajo no comparten margen izquierdo (`capturas-2.3/A-caducidad-aviso-t1280.png`). Nielsen 4.
- **Glifo "⎋":** `Layout.tsx:366` usa un carácter de texto que en Linux/Chromium se dibuja como una flecha circular, no como "salir"; `design-system.md` §5.11 pide icono `log-out` de Lucide. Nielsen 2 (coincidencia con el mundo real).
- **Bundle:** `dist/assets/index-*.js` 370 kB (116 kB gzip) incluye zod porque `store.ts`, `events.ts` y `client.ts` importan valores de `@mi-app/shared/api` (`REVOKED_REASONS`, `API_PREFIX`), que importa `zod`. Rendimiento percibido en la Wi-Fi del local: sin efecto notable (FCP 52 ms local), pero crece con cada historia. Propuesta: mover las constantes a un módulo sin `zod` (p. ej. `@mi-app/shared/api-constants`) o importar solo tipos.

### Capturas incluidas (`docs/ux/capturas-2.3/`)
`P01-paso1-{m375,t768}`, `P01-paso2-t768`, `P01-paso2-2digitos-{m375,t768}`, `P01-error-t768`, `P01-temporal-m375`, `P01-indefinido-t768`, `P01-dispositivo-paso1-m375`, `P01-vacio-t1280`, `P01-cargando-m375`, `P01-errorcarga-t1280`, `P01-banner-idle-m375`, `C-paso1-manager-t768`, `C-regla-manager-t768`, `C-paso3-manager-m375`, `C-p423-m375`, `S-denegado-waiter-{t1280,m375}`, `S-manager-pedidos-m375`, `S-manager-menu-abierto-{t1280,m375}`, `S-manager-resumen-t768`, `A-idle-aviso-m375`, `A-caducidad-aviso-t1280`, `M-paso2-m320`. Sufijos: `m375` 375x812, `t768` 768x1024, `t1280` 1280x800.

### Verificación posterior
Cuando el developer corrija, repetir el arnés (`docs/ux/arnes-2.3/harness.mjs`) y comprobar: H-2.3-01 con un e2e de navegación del encargado; H-2.3-02, H-2.3-03 y H-2.3-04 en la tablet real y con lector de pantalla (Etapa 4); H-2.3-03 con `document.activeElement` distinto de `body` en cada estado de bloqueo.
