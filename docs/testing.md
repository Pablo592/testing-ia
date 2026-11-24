# Estrategia de pruebas — Toma de pedidos para cafetería (MVP)

> Responsable: Testing Engineer · Etapa 1, tareas 1.6 (2026-11-21) y 1.6b
> (2026-11-23) · Estado: **propuesta, pendiente de la puerta de la Etapa 1**.
>
> Entradas: `docs/reglas-equipo.md`, `docs/historias/` (HU-01..HU-08 y README,
> rondas 1.1d con IDs estables y 1.1e con las decisiones del humano; HU-09
> fuera del MVP), `docs/arquitectura.md`, ADR-001..ADR-008,
> `docs/ux/` (flujos, wireframes, design system), `docs/seguridad.md` (§6.1,
> §6.3, §7: RS-01..RS-43), `docs/permisos.md`, `docs/infraestructura.md` (§9
> TESTING, §12.5 IP de origen) y `docs/logging.md`.
>
> **1.6b:** la matriz (§10) usa los **IDs estables** del PO (`HU-xx/CA-xnn`);
> la numeración provisional de la versión 1.6 queda retirada. El cierre de
> T-01..T-09 y los hallazgos nuevos (T-14..T-18) están en §14.
>
> **Ronda 1.1e (decisiones del humano, 2026-11-23):** HU-09 queda **fuera del
> MVP** (no se planifican tests para ella); el número de mesas y el umbral de
> retraso son **fijos en la instalación: 20 mesas y 10 min** (supuesto 20) y se
> prueban con esos valores; los criterios de rendimiento se **verifican en
> TESTING** (vinculante) y en DEMO **solo se observan** (supuesto 12: una
> desviación es un hallazgo que no bloquea por sí sola).

---

## 1. Principios

1. **Se prueba comportamiento, no implementación.** Los tests usan la API
   pública (HTTP/SSE) y la UI tal como la ve el usuario (roles y textos
   accesibles, no clases CSS). Los unitarios prueban funciones de dominio por su
   contrato (entrada → salida), no por cómo están hechas por dentro.
2. **El oráculo sale de las historias, no del código.** Por ejemplo, la matriz de
   permisos esperada se escribe en los tests a partir de HU-01/HU-03/HU-04/HU-05/
   HU-07 y `docs/permisos.md` §3; **no se importa**
   `packages/shared/permissions.ts`. Si no, un error en la matriz se daría por
   bueno (ver T-18 sobre RS-18).
3. **Cada criterio de aceptación tiene al menos un test automatizado**, o una
   verificación manual documentada con su motivo (p. ej. sonido audible en el
   dispositivo real).
4. **BD real, nunca simulada, en integración.** PostgreSQL efímero en contenedor;
   las restricciones de BD (índice único de cobro, inmutabilidad de auditoría)
   son parte de lo que se prueba.
5. **Todo en contenedores rootless y nada como root**, también los ejecutores de
   tests (§7).
6. **Un test que falla no se debilita, ni se pone en cuarentena, ni se le añaden
   reintentos para que pase** sin aprobación del Product Owner. No se toca código
   de producción para que un test pase.
7. **Deterministas.** Reloj controlado, datos propios de cada test, sin esperas
   fijas (`sleep`): se espera a condiciones observables con un tiempo máximo.

## 2. Pirámide y reparto

```
                 ▲  Manual/exploratorio (dispositivos reales, sonido, Wake Lock, usabilidad)
                ▲▲▲  Smoke post-despliegue (DEMO, PROD)
              ▲▲▲▲▲▲  E2E Playwright (+ visuales, accesibilidad)       ~60-90 tests
          ▲▲▲▲▲▲▲▲▲▲▲  Integración API + PostgreSQL + SSE              ~200-300 tests
   ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲  Unitarios (shared, servicios con Clock falso, componentes)  ~400+
   ──────────────────────────────────────────────────────────────────
   Transversales: seguridad, rendimiento, contenedores (no forman capa, se ejecutan por etapa)
```

Regla de reparto: cada regla se prueba **en la capa más baja que pueda
demostrarla**, y solo se sube a E2E lo que necesita navegador (tiempo real
visible, toques, textos, foco, multidispositivo). Ejemplos:

| Regla | Capa principal | Por qué |
|---|---|---|
| Total = Σ precio × cantidad en céntimos, formato "1.234,50 €" | Unitario (`packages/shared`) | Función pura; muchos casos |
| Reglas de PIN (4–6 dígitos, no repetidos, no secuencias) | Unitario | Función pura, tabla de casos |
| Máquina de estados de preparación y cobro | Unitario | Todas las transiciones válidas e inválidas |
| Bloqueo progresivo 5/15/60 min/indefinido, límite por dispositivo y por sesión, inactividad 15 min, caducidad 12 h, Deshacer 30 s | Unitario (Clock falso) + integración (`buildApp` con `FakeClock`, §8.1) | El reloj se controla sin esperar minutos ni horas |
| Doble cobro imposible, reintento idempotente, 409 de versión | Integración (peticiones concurrentes reales) | Depende de transacciones y del índice único de BD |
| Barra no recibe importes | Integración (REST y SSE) | Es un contrato de servidor, no de la UI |
| Camarero crea pedido → aparece en barra en ≤ 2 s | E2E multidispositivo + rendimiento | Necesita dos navegadores y SSE real |
| Toques, tamaños táctiles, textos de error | E2E + script de medición | Necesita el DOM renderizado |

## 3. Herramientas

Todas coherentes con el stack (TypeScript, pnpm, Node LTS) y con versión fijada
en el lockfile; las imágenes de contenedor, por digest.

| Uso | Herramienta | Notas |
|---|---|---|
| Unitarios (shared, api, web) | **Vitest** + `@vitest/coverage-v8` | ADR-002 ya propone Vitest. Mismo runner para todo. |
| Componentes React | **@testing-library/react** + `@testing-library/user-event` + `happy-dom` | Consultas por rol/etiqueta accesible |
| Integración API | **Vitest** + cliente HTTP real (`undici`) contra la app en marcha, o `buildApp(deps)` en proceso con `FakeClock` y BD real (`fastify.inject()`, con `remoteAddress` para simular dispositivos) | En proceso: reloj y IP de origen controlados; HTTP real para cookies, cabeceras y SSE |
| Cliente SSE de prueba | `tests/support/sse-client.ts` (sobre `undici`, parsea `text/event-stream`) | Mide latencia de eventos y comprueba contenido por rol |
| Contrato de API | Esquemas zod de `packages/shared` aplicados a las **respuestas** | Comprueba que la API responde lo que declara |
| E2E, multidispositivo, visual | **Playwright** (`@playwright/test`), Chromium + WebKit | WebKit aproxima Safari de iPad (tablets) |
| Accesibilidad | **@axe-core/playwright** con etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` | Objetivo WCAG 2.2 AA (ver hallazgo UX en `docs/estado.md`) |
| Tamaños táctiles y tipografía | Helper propio `tests/support/medidas.ts` (bounding box y `getComputedStyle`) | Cubre ≥ 44, ≥ 60, 18 px, 32 px de las historias y 2.5.8 de WCAG |
| Contraste del design system | El script de `docs/ux/design-system.md` §8, ejecutado en CI | Además de axe |
| Rendimiento API | **k6** (imagen oficial `grafana/k6`, usuario no root) | p95 de login, envío, cobro, resumen |
| Latencia de tiempo real | Arnés propio Node `tests/performance/realtime/` (10 dispositivos simulados con SSE) | k6 no gestiona SSE de forma nativa |
| Carga de la SPA | **Lighthouse CI** (perfil tablet) | Presupuesto informativo; las historias no fijan tiempos de carga |
| Fallos de red | **Toxiproxy** en `compose.test.yaml` entre ejecutor y `proxy` | Cortes, latencia y pérdida controlados por API |
| Seguridad dinámica | **OWASP ZAP** baseline (imagen oficial, usuario `zap`) | Etapa 3; reglas que defina Cybersecurity |
| Mutación (recomendado) | **Stryker** sobre `packages/shared` | Etapa 3; mide si los tests detectan errores reales |
| Latencia en dispositivos reales (DEMO) | Métrica `order_propagation_seconds` de `docs/logging.md` (telemetría del cliente, `emittedAt`) | Única forma de muestrear la latencia en tablets que Playwright no controla (§5.6.2) |
| Trazabilidad | Script `tests/tools/trazabilidad.ts` | Cruza los IDs de los tests con los criterios de las historias (§4.3) |

Descartado: **Testcontainers**, porque necesita el socket de Docker/Podman y la
política lo prohíbe (§3.4 de reglas). La BD efímera la levanta `podman-compose`.

## 4. Estructura y convenciones

### 4.1 Carpetas

Todos los tests viven en `tests/` (no en `apps/*/test`, como sugiere
`docs/arquitectura.md` §3; ver hallazgo en `docs/estado.md`). Así se pueden
ejecutar como imagen de pruebas independiente sin tocar las imágenes de
producción.

```
tests/
├── unit/
│   ├── shared/              # dinero, PIN, permisos, máquina de estados, fecha de negocio
│   ├── api/                 # servicios de dominio con repositorios en memoria y Clock falso
│   └── web/                 # componentes y hooks (total en vivo, vigilante SSE, borrador)
├── integration/
│   ├── api/                 # por módulo: auth, menu, orders, kitchen, payments, staff, reports
│   ├── realtime/            # SSE: entrega, filtrado por rol, revocación, resincronización
│   ├── db/                  # restricciones: índice único de cobro, auditoría inmutable, roles BD
│   └── concurrency/         # 409, doble cobro, contador diario bajo carga
├── e2e/                     # flujos por historia + flujos transversales multidispositivo
├── visual/                  # capturas por pantalla y ancho (y regresión)
├── a11y/                    # axe por pantalla y estado + teclado/foco
├── security/                # matriz de autorización, sesión, CSRF, cabeceras, logs sin PIN
├── performance/
│   ├── k6/                  # escenarios de API
│   ├── realtime/            # latencia pedido→barra, estado→sala, agotado→todos
│   └── lighthouse/
├── containers/              # política rootless (se ejecuta en el host, ver §7.4)
├── smoke/                   # DEMO y PROD
├── fixtures/                # constructores de datos y conjuntos de semilla
├── support/                 # helpers: login por rol, cliente SSE, Clock, medidas, toxiproxy
├── tools/                   # trazabilidad, generación de informes
├── screenshots/             # SALIDA para UX: <HU>/<pantalla>-<estado>-<ancho>.png
└── run.sh                   # punto de entrada único (§7.3)
```

### 4.2 Identificadores de criterio

Los IDs los asigna el **Product Owner** en las historias (esquema en
`docs/historias/README.md`, "Identificadores de los criterios"; resuelve T-01).
Testing no numera criterios: solo los cita.

- `**CA-Fnn**` funcional · `**CA-Unn**` UX (medible) · `**CA-Nnn**` no funcional,
  únicos dentro de cada historia. Fuera de ella: `HU-03/CA-F06`.
- **El orden de lectura no coincide con el numérico** (p. ej. en HU-03
  `CA-F23` va detrás de `CA-F01`). La matriz (§10) sigue el **orden de lectura**
  de la historia para facilitar la revisión con el PO.
- Un ID nunca se renumera. Un criterio eliminado queda como
  `**CA-Fxx** [Retirado AAAA-MM-DD: motivo]`: sus tests se borran o se
  reasignan, y `trazabilidad.ts` falla si algún test sigue citándolo.
- Un criterio con la marca `[Cambio AAAA-MM-DD, origen]` conserva su ID; Testing
  revisa sus tests y anota la fecha de revisión en la matriz (§10, columna
  "Rev."). `trazabilidad.ts` avisa si la marca de cambio de un criterio es
  posterior a la fecha de revisión anotada.
- La numeración provisional de la versión 1.6 de este documento queda
  **retirada**: no coincidía con los IDs estables (p. ej. la orientación de
  tablet era `HU-02/CA-N04` provisional y ahora es `HU-02/CA-N05`; la
  accesibilidad queda sola en `CA-N04`). No hay tests escritos con ella.
- Recuento a 2026-11-23: HU-01 21 · HU-02 35 · HU-03 34 · HU-04 34 · HU-05 16 ·
  HU-06 27 · HU-07 16 · HU-08 21 = **204 criterios** en el MVP (HU-09, con 14,
  queda fuera; sus IDs no se retiran por si se recupera),
  sin huecos ni duplicados, y todas las referencias cruzadas `HU-xx/CA-xnn` de
  las historias apuntan a criterios que existen (comprobado con script).

### 4.3 Nombres de archivos y tests

- Archivo: `<tipo>/<área>/HU-02-tomar-pedido.<tipo>.ts`, p. ej.
  `tests/e2e/HU-02-tomar-pedido.e2e.ts`,
  `tests/integration/api/HU-04-cobro.int.test.ts`,
  `tests/unit/shared/dinero.unit.test.ts` (los unitarios de utilidades
  compartidas pueden cubrir varias historias).
- Título de cada test: **`[HU-02/CA-F07] Enviar a barra deja el pedido Pendiente con número del día`**.
  Varios criterios: `[HU-04/CA-F09][HU-04/CA-N01] …`.
- Playwright, además, con etiquetas: `{ tag: ['@HU-02', '@CA-F07', '@smoke'] }`
  para filtrar (`--grep @HU-02`).
- Requisitos de seguridad de `docs/seguridad.md` §7: se citan por su ID,
  `[RS-03]`, junto al criterio de historia si lo hay:
  `[HU-01/CA-F06][RS-03] Bloqueo progresivo 5/15/60 min e indefinido a los 20`.
- Tests transversales (sin historia): `[TX-CONT-01]` contenedores, `[TX-SMK-nn]`
  smoke, `[TX-RT-nn]` tiempo real, `[TX-TZ-nn]` zona horaria.
- `tests/tools/trazabilidad.ts` lee los IDs **de las propias historias**
  (`docs/historias/HU-*.md`, patrón `^- \*\*CA-[FUN]\d\d\*\*`, incluidas las
  líneas "Retirado") y de `docs/seguridad.md` §7 (`RS-nn`), y los cruza con los
  títulos de los tests y con la matriz (§10). **Falla** si un criterio de una
  historia en curso o terminada no tiene test (o verificación manual registrada
  en §12), si un test cita un ID inexistente o retirado, o si la matriz no
  coincide con las historias. HU-09 (fuera del MVP) se excluye del cruce.

### 4.4 Estilo

- Arrange–Act–Assert, un comportamiento por test, nombres en español.
- Selectores de UI: `getByRole`, `getByLabel`, `getByText`. `data-testid` solo
  donde no haya alternativa accesible (p. ej. tarjeta de pedido concreta:
  `data-testid="pedido-42"`). El Developer debe exponer ese atributo en
  tarjetas y filas de pedido.
- Nada de `waitForTimeout`: `expect(...).toBeVisible({ timeout })` o
  `expect.poll`.

### 4.5 Interpretaciones que aplican los tests (a confirmar por el PO)

Donde un criterio admite más de una lectura, el test aplica la de esta tabla.
Si el PO no está de acuerdo, cambia el criterio y Testing ajusta el test; un
test no se relaja por su cuenta.

| ID | Criterio | Interpretación aplicada |
|---|---|---|
| I-01 | HU-01/CA-F06 | El 5.º fallo consecutivo activa el bloqueo; el 6.º intento y los siguientes durante el bloqueo se rechazan **sin verificar el PIN** y **no cuentan** como fallos (con PIN correcto también se rechazan). Al expirar un bloqueo el contador no se reinicia: 5 fallos más → 15 min (10 acumulados), 5 más → 60 min (15), 5 más → indefinido (20). Coincide con `docs/seguridad.md` §6.1.3 |
| I-02 | HU-01/CA-F11, HU-06/CA-F17 | "Dispositivo" = IP de origen que ve el servidor (`docs/seguridad.md` §6.1.5, SEC-003). Ventana móvil de 10 min; el rechazo dura 10 min desde el 10.º fallo y se aplica antes de verificar el PIN (RS-05) |
| I-03 | HU-01/CA-F06, CA-F11; HU-06/CA-F19 | "X min" / tiempo restante = minutos restantes **redondeados hacia arriba** (con 4 min 1 s → "5 min"; nunca "0 min") |
| I-04 | HU-03/CA-F06 | Retrasado cuando la espera es **≥ N min** (no > N): con espera N − 1 s no se resalta; entre N y N + 60 s debe aparecer; a N + 60 s está resaltado seguro |
| I-05 | HU-04/CA-U04 | "Sin desplazar" en los viewports de sala: 1280x800 y 800x1280 (supuesto 23) y TPV 1024x768 (design system) |
| I-06 | HU-05/CA-N03 | Lectura amplia: con `menu-200` se repiten **todos** los criterios UX y de rendimiento de HU-02 (CA-U01..U06, CA-N01, CA-N05, CA-F23) y HU-05/CA-F04, no solo los tres citados (pendiente de T-17) |
| I-07 | Criterios con p95 que no citan el supuesto 12 (HU-02/CA-U05) | Mismo número mínimo de muestras: ≥ 200 |
| I-08 | Supuesto 12 (ronda 1.1e) y criterios de dispositivo real | Los criterios de rendimiento que citan el supuesto 12 se dan por cumplidos con el resultado de TESTING; la observación en DEMO no cambia su estado y una desviación se registra como hallazgo. Esto **no** aplica a los criterios que piden verificación en el dispositivo instalado y no son de rendimiento del supuesto 12 (HU-03/CA-U01, HU-03/CA-N05) ni a HU-02/CA-U05 (dispositivo de referencia, supuesto 23): esos se verifican en el hardware (marca **H**) y su resultado es vinculante |
| I-09 | HU-03/CA-F14 | "En cuanto se detecta el bloqueo" = en ≤ 1 s desde que se abre la cola o desde que falla un aviso (pendiente de T-15) |
| I-10 | HU-04/CA-F23, HU-07/CA-N04 | Un `confirmPin` incorrecto cuenta como 1 fallo del encargado de la sesión (HU-01/CA-F06) y 1 fallo del dispositivo (HU-01/CA-F11), igual que `managerApproval` (`docs/arquitectura.md` §5) |

## 5. Tipos de prueba

### 5.1 Unitarios

Alcance mínimo:
- `packages/shared`: `parseCents("2,50")`, `formatCents`, totales (incluye la
  trampa de coma flotante: 3 × 0,10 € = 0,30 €; 1,10 + 2,20 = 3,30 €), reglas de
  PIN **por rol** (HU-07/CA-F06, HU-01/CA-N01, RS-01, RS-02), con tabla de casos
  × rol {camarero, barra, encargado}: longitudes 3/4/5/6/7 (encargado solo 6),
  no dígitos, todos iguales (1111, 000000), secuencias de ≥ 4 en cualquier
  posición (1234, 4321, 0123, 9876, 381234), bloque repetido (1212, 123123,
  121212), lista de PIN prohibidos (2580, 112233, 147258…) y aceptados (4831,
  739164; 1357 y 12345 solo si no están en la lista), matriz de permisos
  **contra la tabla esperada escrita en el test**, máquina de estados (todas las
  parejas estado × acción, válidas e inválidas, incluido Servido y `requeue`),
  cálculo de fecha de negocio `Europe/Madrid` (23:59:59 / 00:00:00, cambio de
  hora de marzo y octubre).
- Servicios de `apps/api` con Clock falso:
  - Bloqueo progresivo (HU-01/CA-F06, I-01): tabla de 25 intentos → bloqueos de
    5, 15 y 60 min a los 5, 10 y 15 fallos e indefinido a los 20; el contador no
    se reinicia al expirar; reinicio con acceso correcto, desbloqueo y
    restablecimiento.
  - Límite por dispositivo (HU-01/CA-F11) y por sesión de autorización
    (HU-06/CA-F19): ventana de 10 min en los dos bordes (9 min 59 s / 10 min).
  - Inactividad 15 min (HU-01/CA-F09): camarero y encargado (también con la cola
    abierta) sí; barra con la cola abierta no; `ping`/SSE/telemetría no cuentan
    como actividad. Caducidad absoluta 12 h para todos (HU-01/CA-N06).
  - Deshacer ≤ 30 s (29,9 s sí / 30,1 s no) de barra y de "Servido".
  - Retrasado (HU-03/CA-F06, I-04): espera ≥ N desde `queued_at`; el paso a "En
    preparación" no la reinicia; `requeue` sí (supuesto 24).
  - Desfase del reloj del cliente con `serverTime`.
- `apps/web`: total en vivo, contador de caracteres (30/100), vigilante "Sin
  conexión" a los 5 s (temporizadores falsos), conservación del borrador en
  `localStorage` y reutilización del UUID en el reintento.

### 5.2 Integración (API + BD real + SSE)

- Se ejecutan contra la imagen de `app` construida y una BD PostgreSQL efímera
  (§7). Cada archivo de test recibe su propia base de datos (§9.2).
- Por cada endpoint de `docs/arquitectura.md` §5.1: casos válidos, validación
  (`400` con campo y regla), permisos (`401`/`403`), conflictos (`409`/`422`/`423`).
- Respuestas validadas con los esquemas zod de `packages/shared`.
- **SSE:** entrega de `order.created/updated`, `product.updated`, `session.revoked`
  (y cierre del flujo), `session.updated`; `ping` cada 2 s; serialización por
  rol (barra sin `*Cents`, `price`, `total` ni datos de cobro: se recorre el JSON
  entero buscando esas claves).
- **Resincronización:** cliente conectado, se corta, se crean pedidos mientras
  está desconectado, reconecta → tras `hello` + snapshot, el estado del cliente
  es igual al de la BD (ningún pedido perdido ni duplicado).
- **BD:** `DELETE`/`UPDATE` en `audit_log`, `payments`, `payment_orders` y
  `cash_closings` con el rol `app_rw` fallan; insertar un segundo
  `payment_orders` vigente para el mismo pedido falla aunque se salte la lógica.
- **Logs:** se capturan los logs de `app` durante la suite; ningún PIN de prueba
  (valor centinela generado por ejecución) aparece en ellos (HU-01/CA-N01,
  HU-07/CA-N01, RS-29). Los eventos de seguridad (`auth.locked` con nivel,
  `auth.locked_manual`, `auth.ip_throttled`…, RS-30) se comprueban en el log
  para HU-01/CA-N05; que la **alerta** salte se verifica en Etapa 3 con la
  pila de Monitoring (§6).
- **Tiempo con `FakeClock` (T-10 resuelto).** Los tests de integración componen
  la app en proceso con `buildApp(deps)`, `FakeClock` y la BD real del archivo
  (§9.2). Así se prueban sin esperar: bloqueo progresivo completo
  (HU-01/CA-F06, RS-03: 25 intentos, avanzando el reloj 5, 15 y 60 min, y
  comprobando que con el PIN correcto sigue `423 ACCOUNT_LOCKED_MANUAL` hasta
  el desbloqueo), límite por dispositivo (HU-01/CA-F11, RS-05: `remoteAddress`
  distinto por "dispositivo" en `inject()`; que no se llama al *hasher* se
  comprueba con un *hasher* espía inyectado), límite por sesión
  (HU-06/CA-F19), inactividad, caducidad de 12 h (HU-01/CA-N06), paso de
  medianoche (HU-02/CA-F13, HU-03/CA-F21, HU-08/CA-F08), ventana de 90 días
  (HU-08/CA-F06, CA-F12) y retrasado. La pila HTTP real (con `SystemClock`) se
  usa para cookies, cabeceras, SSE a través de Caddy y E2E; ahí los tiempos
  pasados se fabrican en la BD de pruebas (§8.1).
- **Reconfirmación del PIN (SEC-007; HU-04/CA-F23, HU-07/CA-N04, RS-16).** Por
  cada acción que la exige (anular cobro; crear usuario, cambiar rol,
  activar/desactivar, restablecer PIN, desbloquear): sin `confirmPin` →
  `403 PIN_CONFIRMATION_REQUIRED` y sin efecto en BD; incorrecto →
  `403 PIN_CONFIRMATION_INVALID`, sin efecto, +1 en el contador del encargado
  (I-10) y en el del dispositivo; correcto → efecto y auditoría; el 5.º fallo
  bloquea al encargado (`423` en el siguiente intento, aunque el PIN sea
  correcto). Cambiar **solo** el nombre no lo exige. El PIN de otro encargado
  no vale como `confirmPin`. En E2E: el motivo de la anulación y los datos del
  formulario de Personal siguen escritos tras el fallo. Lo que pasa con la
  sesión abierta del encargado al bloquearse está pendiente de T-14.

### 5.3 End-to-end (Playwright)

- Contra la pila completa (`proxy` → `app` → `db`) por HTTPS, igual que en DEMO.
- Proyectos de Playwright por dispositivo:

| Proyecto | Viewport | Navegador | Uso |
|---|---|---|---|
| `tablet-h` | 1280x800 | Chromium y WebKit | Camarero (tablet 10" horizontal) |
| `tablet-v` | 800x1280 | Chromium | Camarero vertical (HU-02/CA-N05) |
| `tpv` | 1024x768 | Chromium | Mostrador |
| `barra` | 1920x1080 | Chromium | Pantalla de barra |
| `escritorio` | 1440x900 | Chromium | Encargado |
| `movil` | 375x812 | Chromium | Solo comprobación de emergencia (design system) |

- **Flujo multidispositivo (el principal de la suite):** en un mismo test se
  abren dos o tres `BrowserContext` independientes (cookies y almacenamiento
  propios), uno por dispositivo:
  1. Barra (1920x1080) inicia sesión y abre la cola.
  2. Camarero (tablet) crea un pedido de mesa con 3 productos y una nota y pulsa
     "Enviar a barra". Se toma `t0` justo antes del toque.
  3. Se espera la tarjeta `pedido-N` en barra; `t1` cuando es visible.
     Se comprueban datos (HU-03/CA-F01), orden, sonido (espía, §8.5) y que no
     hay importes en el DOM de barra.
  4. Barra: Empezar → Marcar listo. El camarero ve "LISTO" sin recargar.
  5. Camarero cobra en efectivo; el resumen del encargado (tercer contexto)
     refleja el cobro.
  La latencia `t1 - t0` se registra en el informe (no sustituye a la prueba de
  rendimiento de §5.6, que tiene más muestras y carga).
- Otros flujos transversales: cobro antes de preparar (mostrador) sin salir de la
  cola; anulación de "Cobrar mesa"; modificación concurrente desde dos tablets
  (409 y "El pedido ha cambiado"); producto agotado propagado a todas las
  tablets; desactivación de un usuario con sesión abierta (cierre en ≤ 1 min).
- Recuento de toques: un helper cuenta los `click/tap` del test y se compara con
  el criterio (HU-02/CA-U01 y CA-U06, HU-03/CA-U02 y CA-U05, HU-04/CA-U01/U02,
  HU-04/CA-F19, HU-05/CA-U02, HU-06/CA-U01, HU-08/CA-U01). El
  desplazamiento no cuenta como toque (HU-02/CA-U01).
- Orientación de tablet (HU-02/CA-N05): en `tablet-h` y `tablet-v` se recorre
  el flujo completo de HU-02 (lista "Pedidos" → nuevo pedido → enviar) y en
  cada pantalla se comprueba `scrollWidth <= clientWidth` (sin desplazamiento
  horizontal), que el total y "Enviar a barra" están dentro del viewport sin
  desplazar, que el resto de controles se alcanza con desplazamiento vertical y
  los ≥ 44x44 px de CA-U03.
- **Dispositivo = IP (I-02).** En TESTING todos los navegadores de Playwright
  salen del mismo contenedor (y pasan por Toxiproxy), así que el servidor los ve
  como **un solo dispositivo**: más de 9 fallos de autenticación en 10 min en
  toda la suite activarían HU-01/CA-F11 y romperían tests ajenos. Por eso los
  E2E con PIN erróneo (HU-01/CA-F05, CA-F06, CA-F11, CA-U03; HU-04/CA-F23;
  HU-06/CA-F13, CA-F17..F19; HU-07/CA-N04) van en un proyecto de Playwright
  **en serie con pila propia**, y los bloqueos largos se fabrican en BD
  (`locked_until`, `failed_attempts`) en vez de provocarlos. El resto de
  combinaciones se cubre en integración con `remoteAddress` (§5.2).
- Fallos de red: `page.route` para perder la respuesta tras procesarse
  (`route.fetch()` + `route.abort()`) → mensaje "No se ha podido enviar,
  reintenta", reintento, **un único pedido** en BD. Cortes del flujo SSE con
  Toxiproxy (§8.4).

### 5.4 Visuales

- Capturas con Playwright en **375, 768 y 1440 px** (lo pide Testing) y además
  **1024 y 1920 px** (puntos de corte del design system; 1920 solo para barra).
- Salida para el UX Designer: `tests/screenshots/<HU>/<pantalla>-<estado>-<ancho>.png`,
  p. ej. `tests/screenshots/HU-03/P-05-retrasado-1920.png`. Estados de cada
  pantalla según las tablas "Estados" de los wireframes (vacío, cargando, error,
  éxito, sin conexión, retrasado, MODIFICADO/CANCELADO, agotado…).
- Regresión visual (`toHaveScreenshot`) a partir de la Etapa 3, con referencias
  aprobadas por UX. Determinismo: datos de semilla fijos, reloj del navegador
  congelado (`page.clock`), animaciones desactivadas, fuentes incluidas en la
  imagen, y **máscara** sobre horas y minutos de espera. Las capturas se generan
  siempre dentro del contenedor de Playwright (mismo renderizado en todas las
  máquinas).
- Los tamaños mínimos (44/48/60/72 px; texto de barra ≥ 36 px, HU-03/CA-U01;
  32 px del cambio, HU-04/CA-U03) **no** se comprueban por captura sino con
  medidas del DOM (§5.3, `medidas.ts`). Para HU-03/CA-U01 se mide además la
  **altura de mayúscula** (métrica `capHeight` de la fuente × tamaño) y se
  convierte a mm con el tamaño de píxel de una pantalla de 24" FHD
  (0,2767 mm/px): ≥ 7 mm. La medición física en la pantalla instalada es manual
  (Etapa 3 con hardware de referencia y Etapa 4).

### 5.5 Accesibilidad (WCAG 2.2 AA)

- axe en cada pantalla P-01..P-12 y en cada estado relevante (diálogos abiertos,
  errores de formulario, banner sin conexión, toasts). **Cero violaciones
  `serious`/`critical`**; las `moderate`/`minor` se reportan a UX/Developer.
- Comprobaciones que axe no cubre, automatizadas con Playwright:
  - Navegación completa con teclado de formularios de gestión (HU-05/CA-N04,
    HU-07/CA-N03), foco visible y no tapado (2.4.11), foco al primer campo
    erróneo.
  - Tamaño de objetivo ≥ 24 px (2.5.8) y los mínimos más altos de las historias.
  - Estados y "retrasado"/"Falta" distinguibles sin color: el texto existe en el
    árbol de accesibilidad (`getByText('RETRASADO')`, `getByText('Falta')`).
  - Regiones `aria-live` de la cola y avisos de sala anuncian el texto esperado.
  - Reflujo a 320 CSS px en pantallas de gestión (1.4.10) y zoom de texto 200 %.
- Revisión manual en Etapa 3: VoiceOver (iPad) y TalkBack/NVDA en P-01, P-04,
  P-06 y P-05 con un guion corto; resultados en §12.

### 5.6 Rendimiento

#### 5.6.1 TESTING (Etapa 3, vinculante; control rápido en Etapa 2)

Condiciones del **supuesto 12** del README (resuelve T-02): red emulada con
Toxiproxy (RTT +40 ms, jitter 20 ms, 1 % de pérdida), **10 dispositivos
conectados a la vez** (y 10 acciones simultáneas cuando el criterio lo dice),
menú `menu-200` (200 productos en 20 categorías), **≥ 200 muestras** por
métrica, resultado = p95. Cada métrica se calcula sobre las muestras de una
ejecución sobre pila nueva (§7.4); se informa también p50, p99 y máximo.

| Criterio | Objetivo | Herramienta | Escenario |
|---|---|---|---|
| HU-01/CA-N03 | Login ≤ 1 s p95, 10 simultáneos | k6 | 10 VU que inician sesión **a la vez** (barrera) con usuarios distintos y PIN **correcto**, ≥ 20 rondas. No se mezclan logins inválidos: todos salen de la misma IP y a los 10 fallos el límite por dispositivo (HU-01/CA-F11) devolvería `429` sin calcular el hash, falseando la medida (los inválidos se miden aparte, RS-07) |
| HU-02/CA-N01 | Pedido en barra ≤ 2 s p95 | Arnés realtime + E2E | 9 camareros simulados enviando + 1 barra SSE; t(evento visible en barra) − t(petición) |
| HU-02/CA-F23 | Lista "Pedidos" actualizada ≤ 2 s p95 | Arnés realtime + E2E | Envío, modificación, cobro y cancelación desde un dispositivo; 9 listas SSE |
| HU-02/CA-U05 | Total en pantalla ≤ 200 ms p95 | Playwright, Chromium con CPU ×4 (supuesto 23) | ≥ 200 toques (añadir, +, −) con `menu-200`; marca del toque → total nuevo pintado (`requestAnimationFrame` tras la mutación del texto) |
| HU-03/CA-N01 | Cambio de estado en camareros ≤ 2 s p95 | Arnés realtime | Barra transiciona; 9 camareros SSE |
| HU-03/CA-F15 | "Listos para servir" y aviso en sala ≤ 2 s p95 | Arnés realtime + E2E | Barra marca "Listo"; 9 dispositivos de sala |
| HU-03/CA-F06 | Resaltado ≤ 60 s tras cumplirse N | E2E (`page.clock`) + unitario | Bordes de I-04 |
| HU-03/CA-N02 | "Sin conexión" en ≤ 5 s | E2E + Toxiproxy | Corte total; se mide hasta el banner |
| HU-04/CA-N04 | Confirmación del cobro ≤ 1 s p95, 10 simultáneos | k6 | 10 cobros simultáneos de pedidos distintos (barrera), ≥ 20 rondas |
| HU-05/CA-F04 | Agotado en todos los dispositivos ≤ 5 s p95 | Arnés realtime | 10 clientes SSE; la muestra es el **último** dispositivo en verlo |
| HU-05/CA-N03 | Con `menu-200` se cumplen los criterios de HU-02 | k6 + arnés + Playwright | Todas las filas de HU-02 de esta tabla, más las de UX de I-06 |
| HU-06/CA-N02 | Modificación en barra ≤ 2 s p95 | Arnés realtime | Como HU-02/CA-N01 con modificaciones |
| HU-07/CA-F03 | Sesión de usuario desactivado cerrada en ≤ 1 min | Integración + E2E | Desactivar → sesión rechazada, flujo SSE cerrado |
| HU-08/CA-N02 | Pantalla del resumen con todas las cifras ≤ 2 s p95 | Playwright (pantalla) + k6 (API, informativo) | Semilla `dia-500`; del toque que abre el resumen o cambia la fecha hasta que todas las cifras (incluido el desglose de CA-F13) están pintadas; ≥ 200 muestras alternando fechas |

#### 5.6.2 DEMO (Etapa 4, solo observación)

Por decisión del humano (supuesto 12, ronda 1.1e), en DEMO los tiempos **solo
se observan**: el estado de cada criterio lo fija TESTING, y una desviación en
DEMO se registra como hallazgo en `docs/estado.md` (con el agente responsable)
sin bloquear por sí sola la validación de la historia ni la puerta de la
Etapa 4. Procedimiento de observación:

- Mismas métricas de §5.6.1 sobre el uso real de la prueba de usabilidad y de
  una ronda guiada, **sin** red emulada y sin carga simulada adicional (no se
  exigen 200 muestras; se informa del número de muestras junto al p95).
- Fuente: la métrica `order_propagation_seconds` (`docs/logging.md`,
  telemetría del cliente con `emittedAt`) en los dispositivos reales, porque
  Playwright no controla una tablet real; y el log de `app` para login, cobro
  y resumen.
- Se registra como hallazgo cualquier p95 por encima del objetivo, con
  dispositivo, red y número de muestras.

#### 5.6.3 Otros

- Además (informativo, sin criterio de historia): Lighthouse en P-01, P-04 y P-05
  con perfil tablet; presupuesto propuesto LCP ≤ 2,5 s y JS inicial ≤ 300 kB
  gzip. Si el PO lo acepta, pasa a criterio.
- Prueba de resistencia (Etapa 3): pantalla de barra abierta 4 h con flujo de
  pedidos simulado; sin fugas de memoria apreciables (heap del navegador estable)
  ni cierre por inactividad (HU-01/CA-F09). La caducidad absoluta de 12 h
  (HU-01/CA-N06) se prueba con `FakeClock` (§5.2), no esperando 12 h; en E2E
  se fabrica con la marca de creación de la sesión en BD y se comprueba que la
  cola vuelve al inicio de sesión.
- HU-02/CA-U05 en la tablet de referencia (Etapa 3, si existe; supuesto 23):
  si es Android con Chrome, Playwright conectado por depuración remota; si es
  iPad, marcas `performance.measure` de la app leídas desde el inspector web
  o, si no existen, grabación a ≥ 120 fps; ≥ 200 toques en cualquier caso.
  Mientras no exista la tablet, el resultado vinculante es el de Chromium con
  CPU ×4 (§5.6.1).

### 5.7 Seguridad

Derivada de HU-01/03/04/05/06/07/09, ADR-005/007/008 y de los requisitos
verificables **RS-01..RS-43** de `docs/seguridad.md` §7, que se citan por su ID
en los tests (§4.3) y sustituyen a los `TX-SEC-nn` previstos. Cada RS tiene al
menos un test; la columna "Verificación" de §7 fija la capa. Excepción: RS-18
dice "I generado desde `permissions.ts`", que contradice el principio 2; Testing
escribe la tabla esperada a mano desde `docs/permisos.md` §3 (T-18).

- **Matriz de autorización completa:** cada endpoint de §5.1 de arquitectura ×
  {sin sesión, camarero, barra, encargado, sesión con PIN provisional} → código
  esperado (`401`/`403`/`2xx`) y **comprobación de que no hubo efecto** (la BD no
  cambia) en los `403`. Tabla esperada escrita a mano en el test.
- **Sesión:** cookie `HttpOnly; Secure; SameSite=Strict`; logout, reset de PIN y
  desactivación invalidan el token al instante; token reutilizado tras logout →
  `401`; caducidad por inactividad y absoluta; PIN provisional solo permite
  `/auth/pin`, `/auth/me`, `/auth/logout`.
- **Fuerza bruta (SEC-001):** bloqueo progresivo por usuario (HU-01/CA-F06,
  RS-03); límite por dispositivo antes del hash (HU-01/CA-F11, RS-05) y por
  sesión de autorización (HU-06/CA-F19); la aprobación de encargado y la
  reconfirmación cuentan para los dos (HU-06/CA-F17, I-10); encargado
  bloqueado, desactivado o con PIN provisional no autoriza y recibe el mismo
  mensaje (HU-06/CA-F18, RS-04); `X-Forwarded-For` enviado por el cliente no
  evita el límite (RS-06); usuario inexistente con el mismo código, cuerpo y
  tiempo (diferencia de medianas < 50 ms en 100 intentos, RS-07).
  Combinaciones que se prueban explícitamente: 5 autorizaciones fallidas sobre el
  mismo encargado → la 6.ª muestra "Demasiados intentos" (límite de sesión, no
  "PIN de encargado incorrecto") **y** ese encargado queda bloqueado para el
  login; 5 fallos de login + 5 de autorización desde el mismo dispositivo → el
  siguiente login desde ese dispositivo se rechaza (HU-01/CA-F11).
- **CSRF:** peticiones que modifican datos con `Origin` ajeno → rechazadas.
- **Entrada:** valores límite y hostiles en todos los campos de texto (30/40/100
  caracteres, Unicode, `<script>`, `' OR 1=1`); se muestran escapados y no
  rompen nada. Precios/cantidades/importes no enteros, negativos o enormes → `400`.
- **Precio impuesto por el cliente** (HU-02/CA-N03): enviar `unitPriceCents`,
  `totalCents` o `amountCents` en el cuerpo no tiene efecto.
- **Datos sensibles:** barra sin importes (REST y SSE); PIN nunca en respuestas
  (incluida la lista de personal) ni en logs; mensajes de error sin trazas.
- **Cabeceras** en `proxy` (HSTS, CSP, `X-Content-Type-Options`…) según la lista
  de Cybersecurity; HTTP 8080 → redirige a HTTPS.
- **Escaneo dinámico** con ZAP baseline en Etapa 3; el escaneo de imágenes
  (Trivy/Grype) lo hacen Infrastructure/Cybersecurity, y Testing comprueba que el
  informe existe y está aprobado antes de dar por buena la puerta.

### 5.8 Contenedores (política rootless)

Test `[TX-CONT-01]` en `tests/containers/`, ejecutado **en el host por el
usuario sin privilegios** (necesita `podman`, que nunca se monta dentro de un
contenedor):

1. `podman info --format '{{.Host.Security.Rootless}}'` → `true`.
2. El script se niega a ejecutarse si `id -u` es 0.
3. Para cada contenedor del proyecto (`app`, `db`, `proxy`, `migrate` y los
   ejecutores de tests):
   - UID dentro del contenedor distinto de 0. Las imágenes distroless no tienen
     `id` ni shell, así que se usa `podman top <ctr> user huser` (columna `USER`
     ≠ `root`) y, si la imagen tiene shell, además `podman exec <ctr> id -u` ≠ 0
     **sin** `-u root`.
   - `podman inspect`: `Config.User` no vacío ni `0`/`root`; `HostConfig.CapDrop`
     incluye `ALL` y `CapAdd` vacío; `SecurityOpt` contiene `no-new-privileges`;
     `ReadonlyRootfs` = `true` (salvo excepción documentada por Infrastructure);
     `Privileged` = `false`; `NetworkMode` ≠ `host`; límites de memoria y CPU
     definidos; ningún montaje de `/var/run/*.sock`, `/`, `/etc`, `/var`, `/proc`.
   - Puertos publicados solo en `proxy` y > 1024; `db` y `app` sin puertos en el host.
   - `HEALTHCHECK` definido y estado `healthy`.
4. Se ejecuta en TESTING, DEMO y PROD (en PROD, sobre las unidades Quadlet).

### 5.9 Smoke post-despliegue

| ID | Comprobación | DEMO | PROD |
|---|---|---|---|
| TX-SMK-01 | Las imágenes desplegadas tienen el **mismo digest** que las aprobadas en la etapa anterior | sí | sí |
| TX-SMK-02 | `TX-CONT-01` (rootless, sin root, capacidades) | sí | sí |
| TX-SMK-03 | HTTPS responde con certificado válido para el host; 8080/80 redirige; cabeceras de seguridad | sí | sí |
| TX-SMK-04 | La SPA carga y P-01 muestra el inicio de sesión; `GET /api/v1/auth/me` sin sesión → `401` | sí | sí |
| TX-SMK-05 | Contenedores `healthy`; `migrate` terminó con código 0 | sí | sí |
| TX-SMK-06 | Flujo crítico con datos de demo: login camarero → pedido → aparece en barra → listo → cobro → resumen | sí | **no** (modifica datos) |
| TX-SMK-07 | Login de un usuario técnico de rol barra, abrir la cola y recibir `ping` SSE (solo lectura, sin importes) | — | solo si el humano aprueba crear ese usuario |

Duración objetivo: < 3 min. Si falla un smoke en PROD, se informa al Orquestador
para decidir la vuelta atrás (decisión humana).

## 6. Qué se ejecuta en cada etapa

| Etapa | Qué hace Testing | Suites |
|---|---|---|
| **1 Planificación** | Esta estrategia; revisión de verificabilidad de criterios (hallazgos en `docs/estado.md`); cuando exista `compose.dev.yaml`, primera ejecución de `TX-CONT-01` sobre DEV | `containers` |
| **2 Desarrollo** (por historia) | **Antes** de que el Developer empiece: tests de la historia (unitarios de reglas, integración, E2E, a11y, capturas) en rojo, revisados contra los criterios. Después, en cada entrega: | `unit` + `integration` + `e2e` de la historia **+ regresión completa de las historias anteriores** + `security` (matriz de autorización) + `containers` + `a11y` de las pantallas tocadas + capturas para UX |
| **3 Testing** | Verificación completa sin asumir nada: todas las suites, rendimiento en las condiciones del supuesto 12 (§5.6.1), ZAP, regresión visual, mutación (`shared`), exploratorio con guiones (red, multidispositivo, sonido, reloj), revisión manual de lectores de pantalla, alertas de HU-01/CA-N05 con la pila de Monitoring. **Con el hardware de referencia** (si el cliente lo ha entregado, pregunta 7): HU-03/CA-U01 (medición física), CA-F09 y CA-F14 (sonido audible) y CA-N05 (pantalla encendida, §8.6), HU-02/CA-U05 en la tablet de referencia (§5.6.3). Entrega al PO la matriz con el resultado por criterio; el de los criterios de rendimiento es el de TESTING y es definitivo (I-08) | todas |
| **4 Demo** | Smoke en DEMO; **observación** de los tiempos con dispositivos y Wi-Fi reales (§5.6.2: una desviación es un hallazgo, no bloquea por sí sola); verificación manual de sonido, pantalla encendida y legibilidad en la pantalla real de barra (HU-03/CA-U01, CA-F09, CA-F14, CA-N05: estos sí son vinculantes, I-08); RS-06 con dos dispositivos reales; apoyo a la prueba de usabilidad (UX) | `smoke`, `performance/realtime`, manual |
| **5 Producción** | Tras `terraform apply` aprobado y despliegue: smoke de PROD (no destructivo) y `TX-CONT-01` | `smoke`, `containers` |

## 7. Ejecución en el entorno TESTING efímero

### 7.1 Requisitos para `compose.test.yaml` (lo crea Infrastructure)

- Las **mismas imágenes** que irán a DEMO (`app`, `proxy`, `db`) más imágenes de
  ejecución de tests construidas desde `tests/` (`tests-node` para Vitest y el
  arnés, la oficial de Playwright y la de k6), todas con versión por digest.
- Todos los servicios, también los ejecutores: `user` ≥ 1000 (Playwright: su
  usuario `pwuser`; k6: su usuario no root; ZAP: `zap`), `cap_drop: [ALL]`,
  `security_opt: [no-new-privileges]`, `read_only: true` con `tmpfs` en `/tmp`
  (y en el `HOME` del ejecutor de Playwright), límites `mem_limit`/`cpus`, red
  interna propia, sin `network_mode: host`, sin sockets montados.
- `db` con datos en **tmpfs** (nada persiste entre ejecuciones).
- `proxy` con `tls internal`; el ejecutor de Playwright confía en la CA raíz
  generada en esa ejecución (montada en solo lectura) en vez de ignorar errores
  de certificado.
- Servicio `toxiproxy` entre ejecutores y `proxy` (perfiles `e2e` y `perf`).
- Perfiles: `unit`, `integration`, `e2e`, `perf`, `security`, para no levantar
  lo que no hace falta.
- Secretos de la ejecución (contraseñas de BD, *pepper*, PIN de los usuarios de
  prueba) **generados aleatoriamente por ejecución** con `podman secret` y
  borrados al terminar; nunca en el repositorio.
- Resultados: un único volumen o bind mount de salida (`tests/results/`,
  `tests/screenshots/`) escribible por el UID del ejecutor (`:U` o
  `userns_mode: keep-id`), sin montar el resto del repositorio en escritura.
- `TZ=UTC` en `app` y `db` (la fecha de negocio no debe depender de la zona del
  contenedor); una ejecución adicional con `TZ=America/New_York` lo comprueba.
- Sin ganchos de test en la imagen de producción (nada de endpoints "reset" o
  "fijar reloj"): el control de datos y de tiempo se hace por API y por la BD de
  pruebas (§8.1, §9).

### 7.2 Chromium sin root

Playwright en contenedor sin capacidades puede no poder usar el *sandbox* de
Chromium. Orden de preferencia: (1) *sandbox* con espacios de nombres de usuario
dentro del contenedor rootless; (2) si no funciona, `chromiumSandbox: false` **con
aprobación de Cybersecurity** (el contenedor efímero hace de aislamiento y el
navegador solo visita la app bajo prueba). En ningún caso `--privileged` ni
`--ipc=host`; se usa `shm_size` para la memoria compartida.

### 7.3 Punto de entrada

`tests/run.sh <suite>` (suites: `unit`, `integration`, `e2e`, `visual`, `a11y`,
`security`, `perf`, `containers`, `smoke-demo`, `smoke-prod`, `all`):

1. Aborta si `id -u` = 0 o si `podman info` no dice `rootless: true`.
2. Nombre de proyecto único por ejecución: `-p mi-app-test-<fecha>-<aleatorio>`.
3. `podman-compose -f compose.test.yaml -p <proyecto> --profile <suite> up --build --abort-on-container-exit --exit-code-from <ejecutor>`
   (podman-compose 1.5.0 instalado lo admite).
4. `trap` que siempre ejecuta `podman-compose -f compose.test.yaml -p <proyecto> down -v`
   y borra los secretos de la ejecución, también si falla.
5. Para `containers`, ejecuta `TX-CONT-01` en el host mientras la pila está en marcha.
6. Deja informes en `tests/results/<proyecto>/` (JUnit, HTML de Playwright,
   cobertura, k6) y el resumen en §12.

Siempre `podman-compose`; nunca `podman compose`, `docker compose` ni `sudo`.

### 7.4 Orden dentro de una ejecución completa

`containers` (falla rápido si la pila incumple la política) → `unit` →
`integration` → `security` → `e2e` + `a11y` + `visual` → `perf` (pila nueva,
para que los datos de las suites anteriores no influyan).

## 8. Riesgos de prueba y mitigación

### 8.1 Tiempo y relojes
- **Riesgo:** umbrales de 30 s, 5, 10, 14 y 15 min; minutos de espera; cambio de
  día a las 00:00 `Europe/Madrid` y cambios de hora; tablets con reloj desfasado.
- **Mitigación:** la lógica de tiempo se prueba en unitarios con `Clock` falso
  y en integración con `buildApp(deps)` + `FakeClock` (T-10 resuelto: la fecha de
  negocio y las marcas de tiempo se calculan con el `Clock` y se pasan como
  parámetros SQL, `docs/arquitectura.md` §2, §4, §12). Con `FakeClock` se
  prueban el bloqueo progresivo, los límites de 10 min, la inactividad, la
  caducidad de 12 h, el paso de medianoche y los cambios de hora (§5.2).
- En E2E (pila real con `SystemClock`), los tiempos pasados se fabrican
  **retrasando marcas en la BD de pruebas** (`sent_at`, `queued_at`, `ready_at`,
  `served_at`, `last_activity_at`, `created_at` de la sesión, `locked_until`,
  `failed_attempts`) en lugar de esperar. El umbral de "retrasado" es **fijo: 10 min**
  (supuesto 20, ronda 1.1e; HU-09 fuera del MVP): HU-03/CA-F06 se prueba con
  N = 10 fabricando `queued_at` en el pasado (9 min 59 s, 10 min, 11 min), sin
  esperar ni cambiar el umbral. En el navegador,
  `page.clock` simula desfase del reloj de la tablet (± 10 min) para comprobar
  que los minutos de espera usan `serverTime`.
- **Riesgo residual:** al retrasar marcas en BD, el test depende de nombres de
  columna (`docs/arquitectura.md` §4). Se concentran en un único helper
  (`tests/support/pasado.ts`) para que un cambio de esquema se corrija en un
  sitio.

### 8.2 Tiempo real (SSE)
- **Riesgo:** pruebas inestables por esperar eventos; eventos perdidos durante
  reconexión; búfer del proxy.
- **Mitigación:** esperar condiciones (`expect.poll`) con tiempo máximo igual al
  criterio (2 s/5 s), no esperas fijas; tests de reconexión deterministas con
  Toxiproxy; un test explícito de que el `proxy` no almacena en búfer
  `text/event-stream` (el `ping` llega cada ~2 s a través de Caddy).

### 8.3 Concurrencia y 409
- **Riesgo:** condiciones de carrera que solo aparecen a veces.
- **Mitigación:** tests de integración con N peticiones simultáneas reales
  (`Promise.all`, N = 20–50): doble toque de cobro, reintento con el mismo UUID,
  "Cobrar mesa" a la vez que un cobro individual, dos modificaciones con la misma
  `expectedVersion` (exactamente una `200` y una `409` con la versión actual),
  50 pedidos simultáneos → números del día únicos y sin huecos, anular un cobro a
  la vez que se cobra de nuevo. Cada test de concurrencia se ejecuta con
  repetición (`--repeat-each=20`) en Etapa 3. E2E: dos tablets editan el mismo
  pedido → la segunda ve "El pedido ha cambiado" y la versión nueva, y ningún
  cambio se pierde.

### 8.4 Red
- **Riesgo:** `context.setOffline()` de Playwright no corta de forma fiable un
  flujo SSE ya abierto.
- **Mitigación:** Toxiproxy (corte, latencia, respuesta perdida tras procesar) y
  `page.route` para la pérdida de la respuesta del envío.

### 8.5 Audio en barra
- **Riesgo:** la política de reproducción automática de los navegadores bloquea
  el sonido sin gesto previo (p. ej. tras recargar); en contenedor no hay salida
  de audio.
- **Criterios:** HU-03/CA-F09 (aviso desactivable) y HU-03/CA-F14 (sonido
  bloqueado, T-05 resuelto).
- **Mitigación:** script de inicio que espía `HTMLMediaElement.prototype.play` y
  `AudioContext` (`resume`, `state`, `start` de los nodos) para comprobar que se
  intenta reproducir con cada pedido nuevo y no cuando el sonido está
  desactivado. Dos variantes:
  1. **Política real del navegador:** Chromium se lanza con
     `--autoplay-policy=document-user-activation-required` de forma explícita
     (nunca `no-user-gesture-required`, que ocultaría el problema), para no
     depender de los valores por defecto del modo *headless*. Tras login (hay
     gesto) suena; tras `page.reload()` sin tocar la página, debe aparecer
     "Sonido bloqueado" con "Activar sonido".
  2. **Bloqueo simulado** (determinista, también en WebKit): el script de
     inicio hace que `play()` rechace con `DOMException('NotAllowedError')` y
     que `AudioContext.resume()` deje el estado en `suspended` hasta el primer
     gesto. Así se cubren los dos momentos de detección de CA-F14: al abrir la
     cola y al fallar un aviso con la cola ya abierta.
- **Casos de HU-03/CA-F14:** el aviso aparece en ≤ 1 s (I-09) en texto; el
  botón mide ≥ 60x60 px; su caja no se solapa con ninguna tarjeta de pedido
  (intersección de *bounding boxes* = 0, también con 6 pedidos en pantalla); el
  aviso sigue visible hasta el toque (se comprueba tras llegar 2 pedidos más);
  un toque lo quita y el **siguiente** pedido llama a `play()` con éxito; con el
  sonido desactivado a propósito no aparece ni al abrir la cola ni al llegar
  pedidos. Si el sonido desactivado debe sobrevivir a una recarga está
  pendiente de T-15.
- Que el sonido **se oiga** a 1,5 m se verifica a mano en la pantalla real
  (Etapa 3 con hardware de referencia y Etapa 4).

### 8.6 Wake Lock en barra
- **Criterio:** HU-03/CA-N05 (T-05 resuelto): con la cola abierta y visible,
  la pantalla no se apaga ni se bloquea en ≥ 30 min sin tocarla, verificado en
  el dispositivo de barra instalado.
- **Riesgo:** el Wake Lock solo funciona en contexto seguro (HTTPS con la CA
  interna de Caddy instalada en el dispositivo, ADR-007) y se libera al ocultar
  la pestaña; *headless* no tiene pantalla que apagar; un dispositivo con
  "apagar pantalla: nunca" cumpliría el criterio sin que la app haga nada, y
  uno con un ahorro de energía agresivo podría incumplirlo aunque la app lo pida.
- **Verificación de aceptación (manual, M):** protocolo en el dispositivo de
  barra instalado, en Etapa 3 (hardware de referencia) y Etapa 4:
  1. Anotar modelo, sistema, navegador y el **tiempo de apagado de pantalla del
     sistema**; para la prueba se pone en su valor mínimo (o ≤ 2 min) y, si es
     distinto, se repite con el valor que quedará configurado en el local
     (pendiente de T-16).
  2. Iniciar sesión como barra, abrir la cola, no tocar nada 30 min con
     pedidos llegando cada ~5 min (arnés) y otros 30 min sin pedidos.
  3. Cumple si la pantalla no se apaga, no se atenúa hasta ser ilegible ni se
     bloquea en ninguno de los dos tramos. Evidencia: vídeo o fotos con hora
     cada 5 min, en §12.
  4. Repetir tras ocultar y volver a mostrar la pestaña (cambio de pestaña o
     de aplicación): el comportamiento debe recuperarse sin tocar la cola.
- **Indicio automático (no de aceptación):** en E2E, espía de
  `navigator.wakeLock.request('screen')` al abrir la cola y otra vez tras
  `visibilitychange`, y comprobación de que la CSP/`Permissions-Policy`
  (`screen-wake-lock=(self)`, RS-26) no lo rechazan. Solo sirve para detectar
  regresiones pronto; el criterio se da por cumplido con el protocolo manual.

### 8.7 Otros
- **Datos compartidos entre tests E2E** (número del día, aviso de mesa ocupada):
  §9.3.
- **Diferencias Chromium/WebKit** (iPad): los flujos críticos se ejecutan en
  ambos.
- **Criterios ambiguos o en revisión:** hasta que el PO los cierre, los tests
  se escriben con la interpretación de §4.5 (marcados ⚠ en la matriz) y se
  ajustan en la Etapa 2, al empezar cada historia.
- **Valores fijos de instalación (supuesto 20, ronda 1.1e):** HU-09 queda fuera
  del MVP, así que la pila de pruebas se instala con los **mismos valores que
  PROD: 20 mesas y umbral de retraso de 10 min**, sin cambiarlos. HU-02/CA-F01
  se prueba con exactamente las mesas 1..20 (la 0 y la 21 no se ofrecen y la API
  las rechaza con `400`); HU-03/CA-F06 con N = 10 (§8.1). No hay endpoint para
  cambiarlos y Testing no pide ninguno.

## 9. Datos de prueba y aislamiento

### 9.1 Conjuntos
| Conjunto | Contenido | Uso |
|---|---|---|
| `base` | 2 encargados (PIN de 6 dígitos), 2 camareros, 1 barra, 1 desactivado, 1 encargado con PIN provisional, 1 usuario con bloqueo indefinido; 3 categorías, ~12 productos con precios que exponen errores de coma flotante (0,10 · 1,10 · 2,20 · 999,99), 1 agotado, 1 desactivado; 20 mesas | Integración, E2E |
| `un-encargado` | Como `base` con un solo encargado activo | HU-06/CA-F12, HU-07/CA-F05 |
| `menu-200` | 200 productos en 20 categorías | HU-05/CA-N03, rendimiento |
| `dia-500` | 500 pedidos de un día con cobros en efectivo y tarjeta, cancelaciones con y sin autorización de 3 usuarios y 2 encargados, anulaciones (incluida una posterior al cierre) y pedidos abiertos; totales y desglose por usuario esperados precalculados de forma independiente | HU-08 (CA-F07, CA-F13, CA-F14, rendimiento) |
| `visual` | Datos fijos que reproducen los wireframes (pedidos #39–#45, mesa 7, "ANA", nota "leche de avena") | Capturas y regresión visual |

- Se crean con **constructores** (`tests/fixtures/`) que usan la API pública
  siempre que se pueda; solo se escribe directamente en la BD para fabricar el
  pasado (§8.1) o grandes volúmenes.
- PIN de los usuarios de prueba: aleatorios por ejecución, válidos según la
  regla de HU-07, entregados al ejecutor como secreto. Ningún PIN fijo en el
  repositorio.
- El encargado inicial se crea con el comando `create-initial-manager` (el mismo
  mecanismo que en PROD), así también se prueba.

### 9.2 Integración
- Una BD plantilla migrada por ejecución (`migrate` sobre `app_template`); cada
  archivo de test obtiene `CREATE DATABASE t_<archivo> TEMPLATE app_template`
  y la app de ese worker apunta a ella. Sin estado compartido entre archivos; los
  workers de Vitest pueden ir en paralelo.
- Dentro de un archivo, cada test crea sus propios datos con nombres únicos
  (prefijo aleatorio) y no depende del orden.

### 9.3 E2E
- Pila nueva por ejecución (BD en tmpfs). Cada test crea sus datos por API desde
  un *fixture* autenticado como encargado.
- Las aserciones usan el número de pedido devuelto, nunca un número absoluto.
- Mesas por worker: con solo **20 mesas fijas** (supuesto 20), el `fixture`
  reparte rangos disjuntos entre como máximo 4 workers (5 mesas cada uno) para
  que el aviso "mesa ocupada" (HU-02/CA-F09) no interfiera; los tests que
  necesitan ver todas las mesas libres u ocupadas (CA-F01, CA-F09, CA-F21) van
  en el proyecto en serie. Los pedidos de mostrador no consumen mesas.
- Tests con PIN erróneo: proyecto en serie con pila propia (§5.3, I-02).
- Los tests que observan la cola completa (orden, 6 tarjetas, vacío) o el
  resumen del día van en un proyecto de Playwright **en serie** con su propia
  pila.

## 10. Matriz de trazabilidad (IDs estables, 2026-11-23)

Leyenda: **U** unitario · **I** integración (API + BD; con `FakeClock` cuando
hay tiempo) · **R** tiempo real (SSE, integración) · **E** E2E · **V** visual ·
**A** accesibilidad · **P** rendimiento · **S** seguridad · **M** manual (con
motivo) · **D** se observa también en DEMO (supuesto 12: no vinculante; el
resultado vinculante es el de TESTING, I-08) · **H** requiere el hardware real
(Etapa 3 con hardware de referencia y Etapa 4; vinculante).
`RS-nn` = requisito de `docs/seguridad.md` §7 que cubre el mismo test.
⚠ = interpretación de §4.5 o hallazgo abierto de §14.

Las filas siguen el **orden de lectura** de cada historia (no el numérico).
Estado de todos los criterios: *pendiente* (los tests se escriben al empezar
cada historia en la Etapa 2). Columna "Rev.": fecha en la que Testing revisó el
criterio con su redacción actual (§4.2).

Los criterios de accesibilidad (`WCAG 2.2 AA`, criterio común del README) se
verifican con axe en cada pantalla y estado de la historia más las
comprobaciones de §5.5 (**A**) y la revisión manual de Etapa 3 (**M**: lector de
pantalla, teclado y zoom; axe no cubre todo WCAG).

### HU-01 Iniciar sesión con mi rol
| ID | Criterio (resumen) | Tipos | Rev. |
|---|---|---|---|
| CA-F01 | Camarero entra a "Pedidos"; no ve menú ni usuarios | E, S | 2026-11-23 |
| CA-F02 | Barra entra a la cola; no puede crear, cobrar ni cancelar | E, S | 2026-11-23 |
| CA-F03 | Encargado accede a todas las funciones | E, S | 2026-11-23 |
| CA-F04 | Sin permiso por URL o API → 403 y sin efecto | I, S, E (RS-17, RS-18) | 2026-11-23 |
| CA-F05 | "Usuario o PIN incorrectos" sin decir cuál falla | I, E, S (RS-07) | 2026-11-23 |
| CA-F06 | Bloqueo progresivo 5/15/60 min e indefinido a los 20 fallos; tiempo restante; mensaje de desbloqueo; reinicio solo por acceso correcto, desbloqueo o restablecimiento ⚠ I-01, I-03 | U, I, E (RS-03, RS-09b) | 2026-11-23 |
| CA-F07 | Desactivado con PIN correcto → "Usuario desactivado…" | I, E | 2026-11-23 |
| CA-F08 | Cerrar sesión: vuelve al inicio y la sesión deja de valer | I, E, S (RS-14) | 2026-11-23 |
| CA-F09 | Inactividad 15 min para camarero y encargado (también con la cola abierta); barra con la cola no caduca por inactividad | U, I, E (RS-12) | 2026-11-23 |
| CA-F10 | Pedido creado o cobrado registra el usuario | I | 2026-11-23 |
| CA-F11 | 10 fallos en 10 min desde un dispositivo → rechazo 10 min con "Espera X min"; las autorizaciones fallidas cuentan ⚠ I-02, I-03 | U, I, E (RS-05, RS-06) | 2026-11-23 |
| CA-U01 | Inicio de sesión en ≤ 2 pasos | E | 2026-11-23 |
| CA-U02 | Teclado numérico ≥ 44x44 px | E (medidas), V | 2026-11-23 |
| CA-U03 | Error junto al campo, en texto; PIN vaciado | E, A | 2026-11-23 |
| CA-U04 | Nombre y rol visibles en todas las pantallas | E, V | 2026-11-23 |
| CA-N01 | PIN de 6 dígitos (encargado) / 4–6 (resto); argon2id; nunca en claro ni en logs | U, I, S (RS-01, RS-08, RS-29) | 2026-11-23 |
| CA-N02 | Autorización por rol validada en el servidor | S (RS-17, RS-18) | 2026-11-23 |
| CA-N03 | Login ≤ 1 s p95 con 10 inicios simultáneos | P, D | 2026-11-23 |
| CA-N04 | WCAG 2.2 AA; contraste ≥ 4,5:1; etiquetas accesibles | A, M | 2026-11-23 |
| CA-N05 | Cada bloqueo y rechazo por dispositivo registrado; alerta si es encargado o indefinido | I (eventos, RS-30), M (alerta con Monitoring, Etapa 3) | 2026-11-23 |
| CA-N06 | Toda sesión, también la de barra, caduca a las 12 h | U, I, E (RS-13) | 2026-11-23 |

### HU-02 Tomar un pedido
| ID | Criterio (resumen) | Tipos | Rev. |
|---|---|---|---|
| CA-F01 | Tipo Mesa (1..20, fijo en la instalación, supuesto 20) o Mostrador (referencia ≤ 30); mesas 0 y 21 rechazadas | U, I, E | 2026-11-23 |
| CA-F02 | Tocar producto añade 1; tocar otra vez suma | U, E | 2026-11-23 |
| CA-F03 | "+"/"−"; a 0 la línea se elimina | U, E | 2026-11-23 |
| CA-F04 | Nota ≤ 100 en la línea y visible en barra | I, R, E | 2026-11-23 |
| CA-F05 | Total con IVA, 2 decimales y € | U, E | 2026-11-23 |
| CA-F06 | No disponible: deshabilitado y no se añade (tampoco por API) | I, E, S | 2026-11-23 |
| CA-F07 | Enviar → Pendiente + Abierto, número del día, en la cola | U, I, R, E | 2026-11-23 |
| CA-F12 | Números 1, 2, 3… sin huecos ni repeticiones con envíos simultáneos; cancelados conservan número | I (concurrencia, 50 envíos) | 2026-11-23 |
| CA-F13 | Día `Europe/Madrid`: 23:59:59 sigue el día; 00:00:00 reinicia a 1 | U, I (FakeClock), TX-TZ-01 | 2026-11-23 |
| CA-F14 | Conserva número y fecha si se modifica o cobra al día siguiente | I (FakeClock) | 2026-11-23 |
| CA-F08 | Sin líneas: "Enviar a barra" deshabilitado (API → 400) | I, E | 2026-11-23 |
| CA-F09 | Mesa con pedido abierto: aviso y pedido independiente | I, E | 2026-11-23 |
| CA-F10 | Precio de cada línea fijado al enviar | I | 2026-11-23 |
| CA-F11 | Descartar y confirmar: no se guarda ni llega a barra | E | 2026-11-23 |
| CA-F15 | Al abrir la toma, primera categoría seleccionada | E | 2026-11-23 |
| CA-F16 | Camarero/encargado llega a "Pedidos" con "Nuevo pedido" | E | 2026-11-23 |
| CA-F17 | Lista: (a) cobro Abierto de cualquier fecha; (b) Cobrado no Servido del día | I, E (FakeClock en I) | 2026-11-23 |
| CA-F18 | Cancelado y Cobrado+Servido no aparecen | I, E | 2026-11-23 |
| CA-F19 | Fila: número, mesa/cliente, hora, estado en texto, "COBRADO", total | E, V | 2026-11-23 |
| CA-F20 | Orden por hora de envío, el más antiguo primero; "Listos para servir" delante | I, E | 2026-11-23 |
| CA-F21 | Mesa con ≥ 2 pedidos: agrupados | E, V | 2026-11-23 |
| CA-F22 | Tocar fila abre el detalle | E | 2026-11-23 |
| CA-F23 | Cambios de otro dispositivo en la lista sin recargar ≤ 2 s p95 | R, E, P, D | 2026-11-23 |
| CA-F24 | Barra sin acceso a "Pedidos" (403) | S, E | 2026-11-23 |
| CA-U01 | 3 productos de la categoría inicial en ≤ 6 toques (+1 por cambio de categoría), en horizontal y vertical | E (contador, `tablet-h` y `tablet-v`) | 2026-11-23 |
| CA-U06 | Tipo y mesa en un único toque | E | 2026-11-23 |
| CA-U02 | Productos por categoría; cambiar de categoría en 1 toque | E | 2026-11-23 |
| CA-U03 | Botón de producto ≥ 44x44 con nombre y precio | E (medidas), V | 2026-11-23 |
| CA-U04 | Confirmación con número ≥ 3 s; pantalla lista para otro pedido | E (`page.clock`) | 2026-11-23 |
| CA-U05 | Total en ≤ 200 ms p95 en el dispositivo de referencia (Chromium CPU ×4 mientras no exista) ⚠ I-07 | P (Playwright), H | 2026-11-23 |
| CA-N01 | En la cola de barra ≤ 2 s p95 desde "Enviar" | P, E, D | 2026-11-23 |
| CA-N02 | Sin conexión al enviar: mensaje, borrador conservado, reintento sin duplicado | U, I, E | 2026-11-23 |
| CA-N03 | Precios y totales en el servidor | I, S (RS-20) | 2026-11-23 |
| CA-N04 | WCAG 2.2 AA | A, M | 2026-11-23 |
| CA-N05 | 1280x800 y 800x1280: sin desplazamiento horizontal; total y "Enviar a barra" sin desplazar; resto con desplazamiento vertical; ≥ 44x44 | E (`tablet-h`, `tablet-v`), V | 2026-11-23 |

### HU-03 Cola de barra
| ID | Criterio (resumen) | Tipos | Rev. |
|---|---|---|---|
| CA-F01 | Tarjeta: número, mesa/cliente, hora de envío, minutos desde la entrada en la cola, productos, notas | I, R, E, V | 2026-11-23 |
| CA-F23 | Vuelve desde Listo/Servido: conserva número y hora de envío, muestra "AÑADIDO hh:mm"; entrada en la cola = hora del añadido | I, E, V | 2026-11-23 |
| CA-F24 | Añadir o quitar en un pedido que sigue en la cola no cambia su entrada ni su espera | I, E | 2026-11-23 |
| CA-F10 | Pendiente/En preparación en la cola con cobro Abierto o Cobrado | I, E | 2026-11-23 |
| CA-F02 | Orden por hora de entrada en la cola (ejemplo 10:00→10:25 detrás de 10:20) | I (FakeClock), E | 2026-11-23 |
| CA-F03 | "Empezar" → En preparación | U, I, E | 2026-11-23 |
| CA-F04 | "Listo" → Listo y sale de la cola | U, I, R, E | 2026-11-23 |
| CA-F05 | "Deshacer" 30 s de la última acción de esa pantalla, sin tocar el cobro | U, I, E (`page.clock`) | 2026-11-23 |
| CA-F11 | Ya Servido: sin "Deshacer" de barra | I, E | 2026-11-23 |
| CA-F12 | Ningún cambio de preparación cambia el cobro | U, I | 2026-11-23 |
| CA-F06 | Retrasado a los 10 min (fijo, supuesto 20) desde la entrada en la cola, ≤ 60 s después, icono y texto; En preparación no reinicia ⚠ I-04 | U, I, E (`page.clock`), A | 2026-11-23 |
| CA-F07 | "MODIFICADO"/"CANCELADO" hasta confirmar con un toque; cancelado sale al confirmar | I, R, E | 2026-11-23 |
| CA-F13 | Listo/Servido + añadir → Pendiente con líneas "AÑADIDO" | I, R, E | 2026-11-23 |
| CA-F08 | Pedidos nuevos sin recargar | R, E | 2026-11-23 |
| CA-F09 | Aviso sonoro con cada pedido nuevo, desactivable | E (espía, §8.5), M (audible, H) | 2026-11-23 |
| CA-F14 | Sonido bloqueado: aviso en texto sin tapar pedidos, botón ≥ 60x60, visible hasta reactivar; el siguiente suena; no aparece si se desactivó ⚠ I-09, T-15 | E (política real + bloqueo simulado, §8.5), M (H) | 2026-11-23 |
| CA-F15 | Listo → "Listos para servir" delante y aviso en sala ≤ 2 s p95 | R, E, P, D | 2026-11-23 |
| CA-F16 | "Servido" desde la fila: sale de "Listos para servir", cobro igual | I, E | 2026-11-23 |
| CA-F17 | Servido + Abierto: sigue en "Pedidos" hasta cobrar o cancelar | I, E | 2026-11-23 |
| CA-F18 | Servido + Cobrado: sale de "Pedidos"; solo en "Cobrados hoy" | I, E | 2026-11-23 |
| CA-F19 | "Deshacer" de "Servido" en 30 s por quien lo marcó | U, I, E | 2026-11-23 |
| CA-F20 | "Servido" solo desde Listo; el servidor rechaza el resto | U, I, S | 2026-11-23 |
| CA-F21 | Cobrado y Listo sin servir: visible hasta las 00:00 de su día | I (FakeClock), E | 2026-11-23 |
| CA-F22 | Barra no puede marcar "Servido" (403) | S | 2026-11-23 |
| CA-U01 | Mayúsculas ≥ 7 mm en la pantalla instalada (≥ 36 px en 24" FHD) | E (medidas, §5.4), M (H, medición física) | 2026-11-23 |
| CA-U02 | Cambio de estado en 1 toque; botones ≥ 60x60 | E (medidas, contador) | 2026-11-23 |
| CA-U03 | ≥ 6 pedidos de hasta 5 líneas sin desplazar a 1920x1080; nunca se ocultan líneas ni notas | E, V | 2026-11-23 |
| CA-U04 | Estados por texto y color | A, V | 2026-11-23 |
| CA-U05 | "Servido" en 1 toque desde la fila | E (contador) | 2026-11-23 |
| CA-N01 | Cambio de estado en los dispositivos de sala ≤ 2 s p95 | P, D | 2026-11-23 |
| CA-N02 | "Sin conexión" ≤ 5 s; resincroniza sin intervención ni pérdidas | U, R, E | 2026-11-23 |
| CA-N03 | Barra no ve importes ni cobra (REST y SSE) | I, R, S, E (RS-19) | 2026-11-23 |
| CA-N04 | WCAG 2.2 AA; contraste ≥ 4,5:1 | A, M | 2026-11-23 |
| CA-N05 | La pantalla no se apaga ni bloquea en ≥ 30 min sin tocarla ⚠ T-16 | M (H, protocolo §8.6); E (espía, solo indicio) | 2026-11-23 |

### HU-04 Cobrar y cerrar un pedido
| ID | Criterio (resumen) | Tipos | Rev. |
|---|---|---|---|
| CA-F01 | "Cobrar" con cobro Abierto y cualquier preparación: detalle y total | I, E | 2026-11-23 |
| CA-F02 | Cobrado/Cancelado: sin "Cobrar"; el servidor rechaza | I, E, S | 2026-11-23 |
| CA-F03 | Efectivo ≥ total: cambio = entregado − total, 2 decimales | U, I, E | 2026-11-23 |
| CA-F04 | Efectivo < total: no confirma; "Importe insuficiente: faltan X,XX €" | U, I, E | 2026-11-23 |
| CA-F05 | Tarjeta registrada a mano | I, E | 2026-11-23 |
| CA-F06 | Cobrado: guarda fecha, método, importe y usuario; sale de por cobrar | I, E | 2026-11-23 |
| CA-F07 | Cobrar no cambia la preparación; sigue en la cola | I, R, E | 2026-11-23 |
| CA-F18 | Cobrado no Servido: sigue en "Pedidos" con "COBRADO" hasta Servido o fin del día; cobrar no marca Servido | I (FakeClock), E | 2026-11-23 |
| CA-F08 | Cobrado: no se modifican líneas ni importe ni se cancela | I, S | 2026-11-23 |
| CA-F09 | "Cobrar mesa": un cobro con un total para todos los abiertos | I, E | 2026-11-23 |
| CA-F10 | "Ver ticket" en pantalla | I, E, V | 2026-11-23 |
| CA-F19 | "Cobrados hoy" en 1 toque: cobros del día, más reciente primero, campos y "ANULADO" | I (FakeClock), E | 2026-11-23 |
| CA-F20 | "Ver ticket" desde "Cobrados hoy" | E | 2026-11-23 |
| CA-F21 | "Anular cobro" solo para el encargado; camarero no lo ve y 403 | E, S | 2026-11-23 |
| CA-F22 | Barra sin acceso a "Cobrados hoy" (403) | S | 2026-11-23 |
| CA-F11 | Motivo < 5 caracteres: no confirma y mensaje | U, I, E | 2026-11-23 |
| CA-F12 | Anular afecta al cobro completo; los pedidos vuelven a Abierto | I, E | 2026-11-23 |
| CA-F13 | No se anula un solo pedido de "Cobrar mesa" | I | 2026-11-23 |
| CA-F14 | Anular no cambia la preparación | I | 2026-11-23 |
| CA-F15 | Cobro anulado se conserva con sus datos y cuenta en el día original | I | 2026-11-23 |
| CA-F16 | Pedido reabierto: modificable, cancelable y cobrable; el nuevo cobro cuenta en su día | I (FakeClock), E | 2026-11-23 |
| CA-F17 | Un cobro anulado no se anula otra vez | I | 2026-11-23 |
| CA-F23 | Anular exige el PIN del encargado; incorrecto: no anula, "PIN incorrecto", motivo conservado, cuenta para su bloqueo ⚠ I-10, T-14 | I, E, S (RS-16) | 2026-11-23 |
| CA-U01 | Tarjeta en ≤ 3 toques | E (contador) | 2026-11-23 |
| CA-U02 | Efectivo en ≤ 4 toques + importe; botones rápidos | E (contador) | 2026-11-23 |
| CA-U03 | Cambio ≥ 32 px | E (medidas) | 2026-11-23 |
| CA-U04 | Total y método en texto en la misma vista que "Confirmar", sin desplazar; "Pedido N cobrado" ⚠ I-05 | E (`tablet-h`, `tablet-v`, `tpv`) | 2026-11-23 |
| CA-U05 | Antes de anular: pedidos que se reabren e importe | E | 2026-11-23 |
| CA-N01 | Nunca dos cobros vigentes (doble toque, reintento) | I (concurrencia), E | 2026-11-23 |
| CA-N02 | Cobros y anulaciones auditados y no borrables | I (BD, RS-32, RS-33) | 2026-11-23 |
| CA-N03 | Cobran camarero y encargado; anula solo el encargado | S | 2026-11-23 |
| CA-N04 | Confirmación del cobro ≤ 1 s p95 con 10 simultáneos | P, D | 2026-11-23 |
| CA-N05 | Importes exactos | U, I | 2026-11-23 |
| CA-N06 | WCAG 2.2 AA | A, M | 2026-11-23 |

### HU-05 Gestionar el menú
| ID | Criterio (resumen) | Tipos | Rev. |
|---|---|---|---|
| CA-F01 | Crear categoría (1–30, única) y aparece en la toma | I, E | 2026-11-23 |
| CA-F02 | Crear producto (1–40, categoría, 0,01–999,99, 2 decimales) | U, I, E | 2026-11-23 |
| CA-F03 | Cambio de precio solo para pedidos nuevos | I | 2026-11-23 |
| CA-F04 | Agotado/Disponible en todos los dispositivos ≤ 5 s p95 | I, R, E, P, D | 2026-11-23 |
| CA-F05 | Desactivar: desaparece de la toma, se conserva en el histórico | I, E | 2026-11-23 |
| CA-F06 | Datos inválidos: no guarda, indica campo y rango | U, I, E | 2026-11-23 |
| CA-F07 | Nombre duplicado en la categoría: mensaje | I, E | 2026-11-23 |
| CA-F08 | Borrar categoría con activos: no permite, dice cuántos | I, E | 2026-11-23 |
| CA-F09 | Reordenar se refleja en la toma | I, E | 2026-11-23 |
| CA-U01 | 1 formulario, ≤ 4 campos obligatorios | E | 2026-11-23 |
| CA-U02 | Agotado en ≤ 2 toques desde la toma | E (contador) | 2026-11-23 |
| CA-U03 | Errores con campo y cómo corregir | E, A | 2026-11-23 |
| CA-N01 | Solo el encargado gestiona; agotado también el camarero; en el servidor | S | 2026-11-23 |
| CA-N02 | Auditoría de cambios de precio | I | 2026-11-23 |
| CA-N03 | Con 200 productos / 20 categorías se cumplen HU-02/CA-N01, CA-U05, CA-F23 y HU-05/CA-F04 ⚠ I-06, T-17 | P, D | 2026-11-23 |
| CA-N04 | WCAG 2.2 AA; etiquetas; teclado sin arrastrar (reordenar incluido) | A, M | 2026-11-23 |

### HU-06 Modificar o cancelar un pedido enviado
| ID | Criterio (resumen) | Tipos | Rev. |
|---|---|---|---|
| CA-F01 | Añadir → líneas "AÑADIDO" en barra; total recalculado | I, R, E | 2026-11-23 |
| CA-F08 | Listo/Servido + añadir → Pendiente, vuelve a la cola, orden y espera desde el añadido | I, R, E | 2026-11-23 |
| CA-F02 | Pendiente: quitar/reducir sin PIN → "MODIFICADO" en barra | I, R, E | 2026-11-23 |
| CA-F03 | En preparación/Listo/Servido: quitar exige autorización y avisa | I, E, S | 2026-11-23 |
| CA-F04 | Cancelar con motivo (lista, "Otro" ≤ 100) → Cancelado; barra ve "CANCELADO" | I, R, E | 2026-11-23 |
| CA-F09 | Pendiente: cancelar sin PIN | I, E | 2026-11-23 |
| CA-F05 | En preparación/Listo/Servido: cancelar exige autorización | I, E, S | 2026-11-23 |
| CA-F11 | Autoriza eligiendo nombre + PIN; lista solo de encargados activos | I, E | 2026-11-23 |
| CA-F12 | Un único encargado activo: preseleccionado | E (`un-encargado`) | 2026-11-23 |
| CA-F13 | Nombre y PIN no casan: "PIN de encargado incorrecto", PIN vaciado, cambio conservado | I, E | 2026-11-23 |
| CA-F14 | La autorización vale para una sola acción | I, S | 2026-11-23 |
| CA-F15 | Encargado con sesión: sin PIN; queda como autorizador | I, E | 2026-11-23 |
| CA-F16 | Autorización de un usuario sin rol encargado: rechazada | I, S | 2026-11-23 |
| CA-F17 | Fallo cuenta para el bloqueo del encargado y del dispositivo | I (FakeClock, `remoteAddress`) (RS-04, RS-05) | 2026-11-23 |
| CA-F18 | Encargado bloqueado, desactivado o con PIN provisional no autoriza; mismo mensaje | I, E (RS-04) | 2026-11-23 |
| CA-F19 | 5 fallos por sesión en 10 min → rechazo sin comprobar PIN 10 min, "Demasiados intentos. Espera X min", cambio conservado ⚠ I-03 | I (FakeClock), E (RS-05) | 2026-11-23 |
| CA-F06 | Cobrado: no se modifica ni cancela | I, S | 2026-11-23 |
| CA-F10 | Cancelado: no se modifica, cobra ni reabre | I, S | 2026-11-23 |
| CA-F07 | Registro de quién, cuándo, qué, motivo y autorizador | I | 2026-11-23 |
| CA-U01 | Cancelar Pendiente en ≤ 3 toques | E (contador) | 2026-11-23 |
| CA-U02 | Diálogo con número e importe | E | 2026-11-23 |
| CA-U03 | "AÑADIDO" / tachado + "ELIMINADO" en texto | E, A, V | 2026-11-23 |
| CA-U04 | Cobrado: el mensaje dice que el encargado anule el cobro | E | 2026-11-23 |
| CA-N01 | Autorización validada en el servidor y registrada | I, S | 2026-11-23 |
| CA-N02 | Modificación en barra ≤ 2 s p95 | P, D | 2026-11-23 |
| CA-N03 | Concurrencia: nada se pierde; el segundo recibe aviso y la versión nueva | I (concurrencia), E | 2026-11-23 |
| CA-N04 | WCAG 2.2 AA | A, M | 2026-11-23 |

### HU-07 Gestionar los usuarios del personal
| ID | Criterio (resumen) | Tipos | Rev. |
|---|---|---|---|
| CA-F01 | Alta (nombre 1–30 único, rol, PIN) y puede iniciar sesión | I, E | 2026-11-23 |
| CA-F02 | Cambio de rol aplicado en la siguiente acción, sin volver a entrar | I, R, E (RS-14) | 2026-11-23 |
| CA-F03 | Desactivar: sesión cerrada ≤ 1 min; no entra; nombre en el histórico | I, R, E (RS-14) | 2026-11-23 |
| CA-F04 | Restablecer PIN: el anterior deja de valer, contador a 0, cambio obligatorio | I, E (RS-09b, RS-15) | 2026-11-23 |
| CA-F05 | El único encargado activo no se desactiva ni pierde el rol | I, E (RS-22) | 2026-11-23 |
| CA-F06 | Regla de PIN por rol, composición y lista de comunes | U, I, E (RS-01, RS-02) | 2026-11-23 |
| CA-F07 | Los usuarios no se borran | I, S | 2026-11-23 |
| CA-F08 | "Desbloquear": puede entrar, contador a 0, acción registrada | I, E (RS-09b) | 2026-11-23 |
| CA-F09 | Promoción a encargado con PIN < 6: crea PIN de 6 antes de cualquier otra función | I, E (RS-15) | 2026-11-23 |
| CA-F10 | Lista: "Bloqueado" en texto y acción "Desbloquear" | E, A | 2026-11-23 |
| CA-U01 | Alta en 1 formulario de 3 campos; la confirmación del PIN es un paso aparte | E | 2026-11-23 |
| CA-U02 | Lista con nombre, rol y estado (activo/desactivado/bloqueado) en texto | E, A | 2026-11-23 |
| CA-N01 | Solo el encargado; el PIN no se muestra ni aparece en logs | S, I (RS-29, RS-31) | 2026-11-23 |
| CA-N02 | Auditoría de altas, roles, (des)activaciones, restablecimientos y desbloqueos | I (RS-30) | 2026-11-23 |
| CA-N03 | WCAG 2.2 AA; etiquetas; teclado | A, M | 2026-11-23 |
| CA-N04 | Reconfirmación del PIN en las escrituras (salvo cambiar solo el nombre); fallo: sin efecto, datos conservados, cuenta para su bloqueo ⚠ I-10, T-14 | I, E, S (RS-16) | 2026-11-23 |

### HU-08 Resumen de ventas del día
| ID | Criterio (resumen) | Tipos | Rev. |
|---|---|---|---|
| CA-F01 | Cifras de la fecha seleccionada (por defecto hoy) | I, E | 2026-11-23 |
| CA-F08 | El cobro cuenta en el día del cobro (23:50 → 00:05) | U, I (FakeClock) | 2026-11-23 |
| CA-F09 | Cobro anulado: no suma; cuenta en "cobros anulados" del día original | I | 2026-11-23 |
| CA-F10 | Recobrado: solo el cobro vigente suma, en su día | I (FakeClock) | 2026-11-23 |
| CA-F11 | Cancelado: cuenta en el día en que se canceló | I (FakeClock) | 2026-11-23 |
| CA-F13 | Cancelaciones y anulaciones por usuario y autorizador, nombres en texto | I (`dia-500`), E | 2026-11-23 |
| CA-F14 | La suma del desglose coincide con los totales | I (`dia-500`) | 2026-11-23 |
| CA-F02 | Productos vendidos por importe descendente | I, E | 2026-11-23 |
| CA-F03 | "Hay N pedidos sin cobrar" con acceso a la lista | I, E | 2026-11-23 |
| CA-F04 | Efectivo contado → diferencia; guardar el cierre | U, I, E | 2026-11-23 |
| CA-F05 | Día cerrado: cifras del cierre; anulados posteriores aparte | I, E | 2026-11-23 |
| CA-F06 | Consultable cualquier día entre hoy y 90 días atrás | I (FakeClock), E | 2026-11-23 |
| CA-F12 | Más de 90 días: no seleccionable (los datos siguen en BD) | I (FakeClock), E | 2026-11-23 |
| CA-F07 | Totales al céntimo con los cobros vigentes | I (`dia-500`) | 2026-11-23 |
| CA-U01 | Resumen de hoy en 1 toque | E (contador) | 2026-11-23 |
| CA-U02 | 2 decimales y €; negativo con "-" y "Falta" | U, E, A | 2026-11-23 |
| CA-N01 | Solo el encargado ve el resumen y guarda el cierre | S | 2026-11-23 |
| CA-N02 | Pantalla con todas las cifras ≤ 2 s p95 con 500 pedidos | P (Playwright), D | 2026-11-23 |
| CA-N03 | Cierre registrado e inmodificable | I (BD, RS-32) | 2026-11-23 |
| CA-N04 | No se borra nada por antigüedad | I (FakeClock a +400 días: los datos siguen), S (RS-32: `app_rw` sin `DELETE`) | 2026-11-23 |
| CA-N05 | WCAG 2.2 AA | A, M | 2026-11-23 |

### HU-09 Configurar los ajustes del local — FUERA DEL MVP

Descartada por el humano el 2026-11-23 (ronda 1.1e). **No se planifican ni se
escriben tests** para HU-09/CA-F01..F08, CA-U01..U03 y CA-N01..N03; sus IDs no
se retiran, por si se recupera más adelante (entonces se añade aquí su matriz).
Su efecto en el MVP: valores fijos de instalación, 20 mesas y 10 min
(supuesto 20), probados en HU-02/CA-F01 y HU-03/CA-F06. La matriz de
autorización (§5.7) comprueba que no existe ninguna ruta de ajustes expuesta
(`GET /settings` y `PATCH /settings` → `404` para todos los roles,
`docs/permisos.md` §3), que `GET /auth/me` entrega a cada rol solo el valor que
usa (`localConfig`: camarero `tableCount` = 20, barra
`delayThresholdMinutes` = 10) y que la opción "Ajustes" no aparece en el menú
del encargado.

### Transversales
| ID | Comprobación | Tipos |
|---|---|---|
| TX-CONT-01 | Política rootless de todos los contenedores (RS-36, RS-37, RS-38) | Contenedores |
| RS-01..RS-43 | Requisitos de `docs/seguridad.md` §7 no ligados a un criterio de historia (cabeceras, TLS, CSRF, BD, imágenes…) | S, D, C según §7 |
| TX-SMK-01..07 | Smoke post-despliegue | Smoke |
| TX-RT-01 | El proxy no almacena SSE en búfer | R |
| TX-TZ-01 | Fecha de negocio independiente de la zona del contenedor y de la tablet | U, I, E |

## 11. Criterios de "terminado" (puerta de la Etapa 2, por historia)

Una historia está terminada para Testing cuando:

1. **Todos** sus criterios tienen al menos un test (o verificación manual
   justificada) y `trazabilidad.ts` no informa huecos.
2. **Todos los tests pasan**: los de la historia y la regresión completa de las
   historias ya terminadas, en el entorno TESTING efímero, con Playwright con
   `retries: 0`. Un test inestable cuenta como fallo hasta que se explique.
3. Matriz de autorización y `TX-CONT-01` en verde.
4. axe sin violaciones `serious`/`critical` en las pantallas de la historia.
5. Capturas en `tests/screenshots/<HU>/` entregadas al UX Designer.
6. **Cobertura mínima** (V8, líneas / ramas), medida sobre el código de la
   historia y global:

| Ámbito | Líneas | Ramas | Motivo |
|---|---|---|---|
| `packages/shared` (dinero, PIN, permisos, estados) | 95 % | 90 % | Reglas críticas y puras |
| `apps/api` (servicios y rutas) | 85 % | 80 % | Lógica de negocio y autorización |
| `apps/web` | 70 % | 60 % | El resto lo cubren E2E |
| Global | 80 % | 75 % | |

   La cobertura es un mínimo, no el objetivo: una línea cubierta sin aserción no
   cuenta como probada. En Etapa 3 se añade mutación sobre `packages/shared`
   (objetivo ≥ 80 %).
7. Rendimiento: en Etapa 2 solo un control rápido (p95 en una muestra corta,
   sin carga); el cumplimiento formal se verifica en Etapa 3 (TESTING) y se
   observa en Etapa 4 (DEMO) para los criterios marcados **D**, sin cambiar su
   estado (I-08). Los
   criterios **H** quedan como "pendiente de hardware" hasta la Etapa 3.
8. Sin fallos abiertos reportados por Testing contra la historia.

Formato de reporte de un fallo (en §13 y en `docs/estado.md`):
**test** (ID y archivo), **esperado**, **obtenido** (con evidencia: log,
captura o traza de Playwright), **agente responsable**.

## 12. Resultados de ejecución

| Fecha | Etapa | Suite | Imágenes (digest) / commit | Resultado | Cobertura | Notas |
|---|---|---|---|---|---|---|
| — | 1 | — | — | Sin ejecuciones: aún no hay código ni `compose.test.yaml` | — | — |

## 13. Fallos abiertos

| Test | Esperado | Obtenido | Responsable | Estado |
|---|---|---|---|---|
| — | — | — | — | — |

## 14. Hallazgos de verificabilidad (Etapa 1)

Detalle original y propuestas de redacción en `docs/estado.md` (filas
"testing"). No repito los ya reportados por UX (18 px, 6 pedidos, 6 toques,
WCAG 2.2) ni los del SE (estados, anulación, día), que también afectan a los
tests.

### 14.1 Verificación del cierre de T-01..T-09 (tarea 1.6b, 2026-11-23)

Comprobado criterio por criterio contra `docs/historias/` tras las rondas 1.1d
y 1.1e.

| Hallazgo | Dónde se resolvió | Resultado |
|---|---|---|
| T-01 IDs estables | Todas las HU; README "Identificadores de los criterios" | **Verificado.** 204 criterios en el MVP (+14 de HU-09, fuera) con ID; sin huecos ni duplicados; todas las referencias cruzadas `HU-xx/CA-xnn` existen; regla de retirada y de cambios definida. Matriz (§10) migrada |
| T-02 Condiciones de medida | Supuesto 12 y los 8 criterios que lo citan | **Verificado.** Red emulada, 10 dispositivos (simultáneos donde se indica), `menu-200`, ≥ 200 muestras y p95, como se propuso; los 8 criterios del MVP citan el supuesto. La regla añadida en 1.1d ("cumplido solo si se cumple en TESTING y en DEMO") **no era verificable tal cual**: no fijaba carga ni muestras en DEMO, dejaba la puerta de la Etapa 3 sin poder cerrarse (el resultado de DEMO llega en la Etapa 4) y dependía de que DEMO estuviera en el local con su Wi-Fi. La ronda 1.1e la **retira** por decisión del humano (TESTING vinculante, DEMO solo observación), que es verificable y coincide con la alternativa que iba a proponer; aplicada en §5.6 e I-08 |
| T-03 Total ≤ 200 ms | HU-02/CA-U05 y supuesto 23 | **Verificado.** Dispositivo de referencia con Chromium CPU ×4 mientras no exista; punto de medida definido (del toque al total visible). Muestras: I-07 |
| T-04 Inicio del "retrasado" | HU-03/CA-F06, CA-F01, CA-F02, CA-F23, CA-F24 y supuesto 24 | **Verificado.** Cuenta desde la hora de entrada en la cola, el paso a "En preparación" no la reinicia (con el ejemplo 9 + 2 min), tolerancia de 60 s y caso de vuelta a la cola. Mejora sobre la propuesta: incluye la decisión del SE (`queued_at`). Límite ≥ N: I-04 |
| T-05 Sonido y pantalla | HU-03/CA-F14 y CA-N05 | **Verificado**, con dos detalles menores abiertos: T-15 (CA-F14) y T-16 (CA-N05). Estrategia en §8.5 y §8.6 |
| T-06 "Sin degradar" | HU-05/CA-N03 | **Verificado.** Ahora es medible; queda la duda de si la lista de criterios es cerrada (T-17, baja) |
| T-07 Tablet 10" | HU-02/CA-N05, CA-U01 y supuesto 23 | **Verificado.** Más preciso que la propuesta (total y "Enviar a barra" sin desplazar) |
| T-08 "Claramente" | HU-04/CA-U04 | **Verificado.** Viewports aplicados: I-05 |
| T-09 Resumen ≤ 2 s | HU-08/CA-N02 | **Verificado.** p95, pantalla completa con el desglose de CA-F13, desde el toque o el cambio de fecha, condiciones del supuesto 12 |
| T-10 Fecha de negocio con `now()` | `docs/arquitectura.md` §2, §4, §12 (SE) | Resuelto por el SE; aplicado en §5.2 y §8.1 (`buildApp` + `FakeClock`) |
| T-11 Ubicación de los tests | `docs/arquitectura.md` §3, §12 (SE) | Resuelto por el SE |
| T-12 `compose.test.yaml` y sandbox | `docs/infraestructura.md` §9, `docs/seguridad.md` §6.3 | Resuelto (sin validar con imágenes reales); notas 1–5 de Infrastructure pendientes de aplicar en `tests/run.sh` al crearlo |

### 14.2 Hallazgos nuevos (tarea 1.6b)

T-13 no se emite: era la objeción a la regla "TESTING y DEMO" del supuesto 12,
que el humano ha retirado en la ronda 1.1e.

| ID | Responsable | Criterio / archivo | Problema | Propuesta | Severidad |
|---|---|---|---|---|---|
| T-14 | product-owner, cybersecurity | HU-01/CA-F06, HU-04/CA-F23, HU-07/CA-N04 | No se dice qué pasa con la **sesión abierta** de un usuario cuando su cuenta se bloquea mientras la usa (p. ej. el encargado falla 5 veces la reconfirmación al anular un cobro, o alguien falla 5 logins con su nombre desde otra tablet), ni qué mensaje ve al reconfirmar estando bloqueado ("PIN incorrecto" o "Cuenta bloqueada…"). Sin eso, el test no tiene resultado esperado | Añadir a HU-01: "**CA-F12** Dado un usuario con sesión abierta cuya cuenta se bloquea (CA-F06), entonces su sesión sigue abierta, pero mientras dure el bloqueo toda acción que pida reconfirmar su PIN (HU-04/CA-F23, HU-07/CA-N04) se rechaza sin comprobar el PIN con 'Cuenta bloqueada. Espera X min' (o 'Pide al encargado que la desbloquee' si es indefinido)"; las autorizaciones de HU-06 ya están cubiertas por HU-06/CA-F18. Si Cybersecurity prefiere cerrar la sesión, cambiar el criterio en ese sentido | media |
| T-15 | product-owner | HU-03/CA-F14, CA-F09 | (a) "Se muestra en cuanto se detecta el bloqueo" no tiene límite de tiempo. (b) No se dice si "sonido desactivado" se conserva al recargar la página; de ello depende si tras recargar debe aparecer "Sonido bloqueado" o nada | (a) "…se muestra en ≤ 1 s desde que se abre la cola o falla un aviso". (b) Añadir a CA-F09: "La preferencia de sonido (activado o desactivado) se conserva en ese dispositivo al recargar la página y al volver a iniciar sesión". Mientras tanto se aplica I-09 | baja |
| T-16 | product-owner | HU-03/CA-N05 | El resultado depende del ajuste de apagado de pantalla del sistema: con "nunca" se cumple sin que la app haga nada, y no se dice con qué ajuste se verifica | Añadir: "…verificado con el apagado automático de pantalla del dispositivo en el valor que quede configurado en el local y en su valor mínimo". Protocolo en §8.6 | baja |
| T-17 | product-owner | HU-05/CA-N03 | "Se siguen cumpliendo los criterios de rendimiento y UX de HU-02 (…)": no queda claro si la lista entre paréntesis es cerrada o son ejemplos (p. ej. HU-02/CA-U01 con 20 categorías) | Decir "todos los criterios UX y de rendimiento de HU-02, entre ellos…" o "los criterios HU-02/CA-N01, CA-U05 y CA-F23" (lista cerrada). Mientras tanto se aplica la lectura amplia (I-06) | baja |
| T-18 | cybersecurity | `docs/seguridad.md` §7, RS-18 | "I generado desde `permissions.ts`" toma como oráculo el mismo código que se prueba: un error en la matriz pasaría el test (principio 2 de §1) | "I con la tabla esperada escrita a mano en el test a partir de `docs/permisos.md` §3; un test aparte compara `permissions.ts` con esa tabla" | baja |

Además, §4.5 recoge las **interpretaciones** I-01..I-10 que aplican los tests;
el PO debe confirmarlas o corregir los criterios.
