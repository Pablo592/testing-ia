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

## Tarea 2.6 (parte UX): verificación de la entrega 2.5 (commit 0d7ca30)

Fecha: 2026-11-26. Imagen construida desde el commit: `APP_IMAGE=localhost/mi-app@sha256:66fcdf09d0b3757c57318e0d370803554937fbedbdb3ba92ff008dcb68ed5b06`. Alcance: P-01, cambio obligatorio del PIN, barra superior y menú "Gestión", avisos, "Acceso denegado" y pantallas vacías, a 375, 768, 1280 y 1440 px (320 px solo reflow).

### Resultado

**0 hallazgos de severidad alta, 0 medios abiertos y 2 bajos nuevos.** De los 11 hallazgos de la 2.3: 9 cerrados (H-2.3-01, 02, 03, 05, 06, 08, 09, 10, 11); H-2.3-04 baja de media a baja (queda la etiqueta por paso, D-2.5-01) y H-2.3-07 queda en baja por el esqueleto. H-2.3-02 se cierra por el código y el DOM; sigue pendiente su confirmación en la tablet real (Etapa 4). La puerta de la Etapa 2 no se bloquea por UX.

| ID | Sev. anterior | Estado | Evidencia |
|---|---|---|---|
| H-2.3-01 | media | **Cerrado** | Menú "Gestión" con 5 opciones y "Pedidos" primero en `/pedidos`, `/cola`, `/menu`, `/personal`, `/resumen` y los 4 anchos; la opción actual lleva `aria-current="page"` y "Estás aquí" (`aria-hidden`, el lector oye "página actual") y no cambia de posición; pulsarla cierra el menú sin navegar y deja el foco en "Gestión". De `/resumen` a `/pedidos`: 2 toques, y el foco llega al `h1` "Pedidos". Camarero y cocina no ven "Gestión". Coincide con `flujos.md` §0, wireframes 02/06/10 y `design-system.md` §5.11. `capturas-2.6/V-menu-pedidos-{m375,t768,t1280}.png`. |
| H-2.3-02 | media | **Cerrado en código** (confirmar en tablet) | `PinField.tsx:37` `inputMode="none"`; el campo sigue siendo `type=password` editable (teclado físico). El teclado virtual no se puede emular en el arnés: confirmar en la tablet real en la demo. |
| H-2.3-03 | media | **Cerrado** | `document.activeElement` ya no es `body` en ningún caso medido (375 y 1280 px): bloqueo temporal, indefinido y por dispositivo en P-01 -> `div#pin-mensaje`; cambio de PIN con `423`/`429` -> `div#pin-cambio-mensaje`; `403` y `503` -> el campo; "Seguir conectado" -> `h1`; Escape y Tab fuera del panel "Gestión" -> botón "Gestión". |
| H-2.3-04 | media | **Baja de media a baja** (ver abajo) | El texto del paso es ahora `role="status"` y el foco va al campo tras "Siguiente", que lo lee con `aria-describedby` (paso 2: "PIN (6 dígitos)" + "Paso 2 de 3 · PIN nuevo"). Falta la etiqueta distinta por paso. |
| H-2.3-05 | baja | **Cerrado** | A 375 px la barra del encargado tiene 2 filas (113 px; antes 3 filas y unos 160 px): `h1` + "Gestión" arriba, nombre y rol + "Cerrar sesión" debajo. El panel ocupa 359 px (todo el ancho menos márgenes) bajo la barra, sin solapar ningún control (medido: 0 solapes), opciones de 56 px. A 768/1280/1440 el panel mide 280 px bajo "Gestión". axe sin violaciones (incluido `target-size`) con el menú abierto. `capturas-2.6/V-menu-resumen-m375.png`. |
| H-2.3-06 | baja | **Cerrado** | `outline` del `h1` en `none` al enfocarlo por código; ya no aparece el recuadro. |
| H-2.3-07 | baja | **Parcial, queda baja** | Hecho: botón "Reintentar" y `role="alert"` en el error de carga (`V-errorcarga-m375.png`), "Cargando usuarios…" con `role="status"`. Falta el esqueleto de 4 tarjetas (`design-system.md` §5.12, "Cargando": forma del contenido); sigue siendo solo texto (`V-cargando-m375.png`). |
| H-2.3-08 | baja | **Cerrado** | 6 indicadores de 16 px (rellenos / vacíos) en P-01 y en el cambio de PIN: "● ● ○ ○ ○ ○" tras 2 dígitos (`V-paso2-2dig-m375.png`). |
| H-2.3-09 | baja | **Cerrado** | Tras tocar una tecla el anillo ya no se queda (`outline: none` en la tecla enfocada por puntero); con Tab sigue visible (test a11y de teclado en verde). |
| H-2.3-10 | baja | **Cerrado** | Al volver a P-01 con motivo, el foco va al banner ("Sesión cerrada por inactividad") en 375 y 1280 px; ya no queda en `body`. |
| H-2.3-11 | baja | **Cerrado** | Avisos alineados con el contenido (mismos márgenes, 32 px / 16 px a <= 767 px); icono `log-out` de Lucide en lugar de "⎋"; el bundle baja de 370 kB a 291 kB (93 kB gzip) y ya no contiene zod (`api-constants.ts`). |

### Valoración de H-2.3-04: media a baja
Lo que falta es solo la etiqueta propia del campo ("PIN actual / PIN nuevo / Repite el PIN nuevo"). Se baja a **baja** porque el propósito del paso ya se comunica de tres formas: texto visible justo encima del campo, `role="status"` que anuncia el cambio, y `aria-describedby` que lo lee al enfocar el campo (el foco va al campo tras cada "Siguiente"). El criterio WCAG 4.1.3 queda cubierto y el 2.4.6 / 3.3.2 queda cubierto en la práctica por la descripción; lo que queda es pulido de la etiqueta. Se mantiene abierto como H-2.3-04 (baja) hasta D-2.5-01 (testing) y se confirma con VoiceOver/TalkBack en la demo; no justifica cerrarlo todavía porque una etiqueta genérica "PIN (6 dígitos)" en los 3 pasos es lo que lee primero un lector de pantalla.

### Hallazgos nuevos

#### H-2.6-01 (baja): la barra del encargado a 375 px cambia de altura según el título
- **Pantalla:** barra superior en `/resumen` a 375 px. **Captura:** `capturas-2.6/V-menu-resumen-m375.png`.
- **Medido:** altura 121 px en `/resumen` frente a 113 px en `/pedidos`, `/cola`, `/menu` y `/personal`: "Resumen del día" ocupa 2 líneas porque "Gestión" le deja unos 150 px.
- **Criterio:** Nielsen 4 (consistencia); `design-system.md` §5.11 define la barra de 2 filas con altura fija. El contenido salta 8 px al cambiar de pantalla y el título parte una palabra clave en 2 líneas.
- **Propuesta:** que el `h1` no se parta (`white-space: nowrap` con `text-overflow: ellipsis`) o acortar el título visible a "Resumen" en <= 767 px (el `<title>` del documento puede mantener "Resumen del día"). Tiene el mismo origen en "Cola de barra" si el título pasa a ese texto.

#### H-2.6-02 (baja): el estado "Cargando usuarios…" sigue sin esqueleto
Es el resto de H-2.3-07 (ver arriba), registrado aquí solo como seguimiento: no es un hallazgo nuevo. Propuesta sin cambios: 4 tarjetas esqueleto o, como mínimo, mantener el texto con `role="status"` (ya hecho) y aceptar la desviación del §5.12 por escrito.

### Sin regresiones
- **axe-core** (`wcag2a/aa`, `wcag21a/aa`, `wcag22aa`, `best-practice`): 0 violaciones en los 46 estados del arnés (P-01 todos los estados, cambio de PIN en 3 pasos, barra con y sin menú abierto a 375/768, avisos, errores y cargando) y `sh tests/run.sh a11y` 7/7 en verde.
- **`sh tests/run.sh visual`**: 11/11 en verde. Al ejecutarlo regenera `tests/screenshots/HU-01/*.png` (7 imágenes difieren por píxeles); se restauraron con `git checkout` para no mezclar cambios en el árbol de trabajo.
- **375 y 320 px:** sin desplazamiento horizontal (`scrollWidth` = `clientWidth`); ningún control menor de 44x44 px; teclas de 109x64 a 375 y 91x64 a 320.
- **Un solo botón principal** por pantalla y etiquetas con verbo; textos de P-01 y banners sin cambios.
- **Estados** vacío, cargando, error y éxito siguen presentes en P-01; "Acceso denegado" y pantallas vacías intactas (`V-denegado-m375.png`).
- **Etiqueta del botón "Gestión":** `aria-label="Menú de gestión"` contiene el texto visible "Gestión" (WCAG 2.5.3 cumplido).
- **CA-N06 en WebKit (fallo intermitente de `HU-01-iniciar-sesion.e2e.ts:396`):** el arnés solo corre Chromium, así que no se pudo reproducir. Desde UX no hay un problema visible: el banner se monta con la página y recibe el foco (H-2.3-10). Si el fallo apareciera por esa corrección (el foco programático sobre un `div` en WebKit), sería una condición de carrera del test (T-46), no del diseño; sigue asignado a testing (2.8).

### Limitaciones
(a) API simulada, igual que en la 2.3. (b) Lighthouse no se ejecutó (sin red); carga local sin red: FCP 60 ms, 3 recursos estáticos más 2 llamadas a la API. (c) Teclado virtual del sistema y lector de pantalla reales: pendientes de la tablet y de la demo (Etapa 4). (d) Arnés: `docs/ux/arnes-2.3/harness.mjs` con una sección nueva de verificación 2.6 (menú, foco, etiquetas) que quedó en el scratchpad; capturas en `docs/ux/capturas-2.6/`.

---

## 2.8c Revisión UX de la entrega 2.8b (commit fe5c5d5, con los tests de la 2.8d)

**Alcance:** etiquetas por paso del cambio de PIN, esqueleto de carga de P-01, `h1` a 375 px, T-48 y regresiones de HU-01. **Imagen:** `localhost/mi-app@sha256:f1e3f15e…` (la SPA se extrajo de la imagen y se sirvió con el arnés de la 2.3 y una API simulada; Chromium, 375/768/1280 px, y 320 px para el `h1`). Capturas en `docs/ux/capturas-2.8c/`. **Resultado: 0 altos, 0 medios abiertos, 1 bajo nuevo (H-2.8c-01).**

### Estado de los hallazgos anteriores
| ID | Severidad | Estado | Evidencia |
|---|---|---|---|
| H-2.3-04 | baja | **Cerrado** (queda la confirmación con VoiceOver/TalkBack reales en la demo) | Textos medidos en el DOM, en camarero y encargado, a 375 y 1280 px: paso 1 "PIN actual (provisional)"; paso 2 "PIN nuevo (4 a 6 dígitos)" (camarero) / "PIN nuevo (6 dígitos)" (encargado); paso 3 "Repite el PIN nuevo". La etiqueta es visible (`label[for]`), `getByLabel(..., exact)` da 1 elemento y se conservan `role="status"` ("Paso 2 de 3 · PIN nuevo") y `aria-describedby` (regla del PIN). `a11y` 9/9. Capturas: `E-paso1-manager-m375.png`, `E-paso2-manager-m375.png`, `E-paso3-waiter-m375.png`. |
| H-2.3-07 | baja | **Cerrado** | 4 tarjetas esqueleto (`data-testid="esqueleto-usuario"`), `aria-hidden`, sin animación (0 elementos con `animation-name`), borde `--color-border` (#cbd5e1; las reales usan #64748b), mismo alto que una tarjeta real (134 px) y misma rejilla a 375, 768 y 1280 px. Al llegar los datos no hay salto vertical (la línea de texto reserva 24 px). Capturas: `B-esq-0300ms-m375.png`, `B-esq-0300ms-t1280.png`, `B-real-m375.png`. |
| H-2.6-02 | baja | **Cerrado** | Es el mismo punto que H-2.3-07. A los 300 ms el texto está vacío; a los 1,4 s dice "Cargando usuarios…" en `role="status"` (`B-esq-1400ms-m375.png`), como pide §5.12. |
| H-2.6-01 | baja | **Parcial: la barra ya no cambia de altura, pero el título se corta mal. Pasa a H-2.8c-01** | La barra mide 113 px en las 5 pantallas del encargado a 375 px (antes 121 px en `/resumen`) y 65 px a 768 y 1280 px; sin desplazamiento horizontal. Pero el `h1` de `/resumen` muestra "Resumen del …" (ver abajo). |

Notas del esqueleto: el contraste del borde del esqueleto (#cbd5e1 sobre blanco, aprox. 1,5:1) no incumple WCAG 1.4.11 porque no es un control ni transmite información (es decorativo y está oculto al lector de pantalla); precisamente por eso es más claro que el de las tarjetas reales, y no se confunde con ellas. El anuncio "Cargando usuarios…" queda en `role="status"`.

### Hallazgo nuevo

#### H-2.8c-01 (baja): el `h1` de "Resumen del día" a <= 375 px se corta justo antes de la palabra clave
- **Pantalla:** `/resumen` del encargado a 375 px y a 320 px. **Capturas:** `capturas-2.8c/C-resumen-m375.png`, `C-resumen-320.png` (a 1280 px, `C-resumen-t1280.png`, se ve completo).
- **Medido:** a 375 px el `h1` ocupa 175 px y necesita 176: la elipsis se come "día" y se ve **"Resumen del …"**; a 320 px, 120 px de 176, se ve "Resumen…". El texto completo sigue en el DOM y en el `<title>` ("Resumen del día · Café · Toma de pedidos").
- **Criterio:** Nielsen 1 y 2 (visibilidad y lenguaje del usuario): el título de la pantalla es la señal principal de dónde está el usuario y se queda en una frase incompleta; `design-system.md` §5.11 fija el título "Resumen del día". Los demás títulos ("Pedidos", "Cola", "Menú", "Personal") caben. Es solo estético y no afecta a la función ni al lector de pantalla, por eso es baja. Lo que se ve, "Resumen del …", no cabe como solución definitiva.
- **Decisión de UX:** la elipsis vale como red de seguridad (evita el salto de altura), pero no como solución para el título normal. Prefiero un título visible corto a <= 767 px: **"Resumen"**, y mantener el nombre completo "Resumen del día" para el lector de pantalla y el `<title>`.
- **Corrección propuesta (developer):** en `h1` de `/resumen`, `Resumen<span className="topbar-title-extra"> del día</span>`, con `.topbar-title-extra` visualmente oculto (técnica `sr-only`: clip, no `display:none`, para que el nombre accesible siga siendo "Resumen del día") solo a <= 767 px. Conservar el `nowrap` y la elipsis como respaldo. Verificar: a 375 y 320 px el `h1` se ve "Resumen", `getByRole('heading', { name: 'Resumen del día' })` sigue encontrándolo y la altura de la barra sigue siendo la misma. Hay que cuidar que el test de la 2.8a (`h1` en 1 línea, altura igual) siga pasando; `design-system.md` §5.11 se actualizará con esta excepción cuando se acepte.
- **Nota para testing:** si se aplica, el test que busca el texto visible "Resumen del día" a 375 px debe usar el nombre accesible, no el texto visible.

### T-48 (banner "caducada por duración máxima" en una carrera)
Sin problema de UX. El banner `absolute` solo sale si el reloj del servidor dice que `expiresAt` ya pasó, así que el motivo mostrado es verdadero; con la sesión vigente un `401` sin `details` no muestra ningún banner (no se inventa un motivo). La espera previa a reabrir el flujo SSE no tiene ningún efecto visible. Residual aceptable: si coincidieran una caducidad absoluta y un cierre por inactividad o revocación, se mostraría el de duración máxima; es un caso muy poco probable y el mensaje sigue siendo cierto.

### Regresiones de HU-01
- **axe-core** (`wcag2a/aa`, `wcag21a/aa`, `wcag22aa`, `best-practice`): 0 violaciones en los estados revisados: cambio de PIN en los 3 pasos (camarero y encargado, 375 px), esqueleto de carga (375 y 1280 px) y `/resumen` (375 y 1280 px). `sh tests/run.sh a11y`: 9/9.
- **`sh tests/run.sh visual`:** 11/11. Regeneró 3 capturas de `tests/screenshots/HU-01/` (`P-01-cambio-pin-1024.png`, `P-01-paso2-1440.png`, `P-01-paso2-768.png`) y se restauraron con `git restore`.
- **Sin desplazamiento horizontal** en `/pedidos`, `/cola`, `/menu`, `/personal` y `/resumen` a 375, 768 y 1280 px (y `/resumen` a 320 px).
- **Un solo botón principal** por pantalla y etiquetas con verbo, sin cambios. El foco tras "Siguiente" se mide en el siguiente cuadro de animación (`requestAnimationFrame`): al medirlo de inmediato queda en el botón, igual que en la 2.3; no es una regresión y lo cubre el test a11y de teclado.
- **Estados** vacío, cargando, error y éxito de P-01 siguen presentes; el de cargando ahora tiene la forma del contenido.

### Pendiente para la demo (Etapa 4)
Confirmar con VoiceOver y TalkBack reales que cada paso del cambio de PIN lee su etiqueta propia ("PIN actual (provisional)", etc.) y que el esqueleto no se anuncia (`aria-hidden`); H-2.3-02 en la tablet real sigue pendiente (ya registrado).

### Limitaciones
API simulada (la contrato real es de testing); solo Chromium; Lighthouse no se ejecutó (sin red, como en la 2.3). Arnés en el scratchpad de la sesión (no en el repositorio).
