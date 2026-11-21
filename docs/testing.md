# Estrategia de pruebas — Toma de pedidos para cafetería (MVP)

> Responsable: Testing Engineer · Etapa 1, tarea 1.6 · Fecha: 2026-11-21
> Estado: **propuesta, pendiente de la puerta de la Etapa 1**.
>
> Entradas: `docs/reglas-equipo.md`, `docs/historias/` (HU-01..HU-08 y README),
> `docs/arquitectura.md`, ADR-001..ADR-008, `docs/ux/` (flujos, wireframes,
> design system). **Aún no existían** al redactar esto: `docs/seguridad.md`,
> `docs/permisos.md`, `docs/infraestructura.md`, `compose.dev.yaml`,
> `compose.test.yaml`. Las secciones que dependen de ellos (§5.7 seguridad,
> §7 compose de TESTING) son requisitos de Testing que se ajustarán cuando
> existan.
>
> El PO está corrigiendo HU-03/HU-04/HU-06/HU-08 (preparación vs. cobro,
> anulación de cobro, definición de "día"). La estrategia se basa en la
> **intención** de esos criterios. La matriz (§10) usa la HU-04 ya revisada; las
> demás se renumerarán cuando el PO cierre los cambios.

---

## 1. Principios

1. **Se prueba comportamiento, no implementación.** Los tests usan la API
   pública (HTTP/SSE) y la UI tal como la ve el usuario (roles y textos
   accesibles, no clases CSS). Los unitarios prueban funciones de dominio por su
   contrato (entrada → salida), no por cómo están hechas por dentro.
2. **El oráculo sale de las historias, no del código.** Por ejemplo, la matriz de
   permisos esperada se escribe en los tests a partir de HU-01/HU-03/HU-04/HU-05/
   HU-07 y `docs/permisos.md`; **no se importa** `packages/shared/permissions.ts`.
   Si no, un error en la matriz se daría por bueno.
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
| Bloqueo tras 5 fallos, inactividad 15 min, Deshacer 30 s | Unitario (Clock falso) + integración (tiempos retrasados en BD) | El reloj se controla sin esperar minutos |
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
| Integración API | **Vitest** + cliente HTTP real (`undici`) contra la app en marcha, o `fastify.inject()` con BD real | `inject` para rapidez; HTTP real para cookies, cabeceras y SSE |
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
| Trazabilidad | Script `tests/tools/trazabilidad.ts` | Cruza los IDs de los tests con los criterios (§4.3) |

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

Las historias no numeran sus criterios. Hasta que el PO añada IDs estables (ver
hallazgo en `docs/estado.md`), Testing usa esta numeración **provisional**, por
orden de aparición en cada sección de la historia:

- `CA-Fnn`: criterio funcional · `CA-Unn`: UX (medible) · `CA-Nnn`: no funcional.
- Referencia completa: `HU-02/CA-F07`.
- Un ID retirado no se reutiliza.

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
- Tests transversales (sin historia): `[TX-CONT-01]` contenedores, `[TX-SEC-nn]`
  seguridad de Cybersecurity, `[TX-SMK-nn]` smoke.
- `tests/tools/trazabilidad.ts` extrae los IDs de todos los títulos y los cruza
  con la matriz (§10). **Falla** si un criterio de la historia en curso no tiene
  test, o si un test referencia un criterio inexistente.

### 4.4 Estilo

- Arrange–Act–Assert, un comportamiento por test, nombres en español.
- Selectores de UI: `getByRole`, `getByLabel`, `getByText`. `data-testid` solo
  donde no haya alternativa accesible (p. ej. tarjeta de pedido concreta:
  `data-testid="pedido-42"`). El Developer debe exponer ese atributo en
  tarjetas y filas de pedido.
- Nada de `waitForTimeout`: `expect(...).toBeVisible({ timeout })` o
  `expect.poll`.

## 5. Tipos de prueba

### 5.1 Unitarios

Alcance mínimo:
- `packages/shared`: `parseCents("2,50")`, `formatCents`, totales (incluye la
  trampa de coma flotante: 3 × 0,10 € = 0,30 €; 1,10 + 2,20 = 3,30 €), reglas de
  PIN (tabla: 1111, 1234, 4321, 0123, 9876, 12345, 1357, longitudes 3/4/6/7, no
  dígitos), matriz de permisos **contra la tabla esperada escrita en el test**,
  máquina de estados (todas las parejas estado × acción, válidas e inválidas),
  cálculo de fecha de negocio `Europe/Madrid` (23:59:59 / 00:00:00, cambio de
  hora de marzo y octubre).
- Servicios de `apps/api` con Clock falso: bloqueo (5.º fallo bloquea, 6.º → 423,
  tiempo restante, reinicio con éxito), inactividad 15 min (y excepción de
  barra), Deshacer ≤ 30 s (29,9 s sí / 30,1 s no), retrasado (> umbral, no ≥),
  desfase del reloj del cliente con `serverTime`.
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
  HU-07/CA-N01).

### 5.3 End-to-end (Playwright)

- Contra la pila completa (`proxy` → `app` → `db`) por HTTPS, igual que en DEMO.
- Proyectos de Playwright por dispositivo:

| Proyecto | Viewport | Navegador | Uso |
|---|---|---|---|
| `tablet-h` | 1280x800 | Chromium y WebKit | Camarero (tablet 10" horizontal) |
| `tablet-v` | 800x1280 | Chromium | Camarero vertical (HU-02/CA-N04) |
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
  el criterio (HU-02/CA-U01, HU-04/CA-U01/U02, HU-05/CA-U02, HU-06/CA-U01).
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
- Los tamaños mínimos (44/48/60/72 px, 18/36 px, 32 px del cambio) **no** se
  comprueban por captura sino con medidas del DOM (§5.3, `medidas.ts`).

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

Objetivos tomados de los criterios no funcionales. Condiciones de referencia
propuestas (pendientes de confirmar por el PO, ver `docs/estado.md`): perfil de
red Wi-Fi emulado con Toxiproxy (RTT +40 ms, jitter 20 ms, 1 % de pérdida),
**10 dispositivos simultáneos** (supuesto 2), menú de 200 productos/20
categorías, ≥ 200 muestras por métrica. En DEMO (Etapa 4) se repite con
tablets y Wi-Fi reales.

| Criterio | Objetivo | Herramienta | Escenario |
|---|---|---|---|
| HU-01/CA-N03 | Login ≤ 1 s p95 | k6 | 10 VU con logins mezclados (válidos e inválidos; argon2id es lo caro) |
| HU-02/CA-N01 | Pedido en barra ≤ 2 s p95 con 10 dispositivos | Arnés realtime + E2E | 9 camareros simulados enviando + 1 barra SSE; t(evento en barra) − t(petición) |
| HU-02/CA-U05 | Total en pantalla ≤ 200 ms | Playwright (CPU ×4 throttling, perfil tablet) | Marca de tiempo del toque → texto del total actualizado (`requestAnimationFrame`) |
| HU-03/CA-N01 | Cambio de estado en camareros ≤ 2 s p95 | Arnés realtime | Barra transiciona; 9 camareros SSE |
| HU-03/CA-N02 | "Sin conexión" en ≤ 5 s | E2E + Toxiproxy | Corte total; se mide hasta el banner |
| HU-04/CA-N04 | Confirmación del cobro ≤ 1 s p95 | k6 | Cobros concurrentes de pedidos distintos |
| HU-05/CA-F04 | Agotado en todos los dispositivos ≤ 5 s | Arnés realtime | 10 clientes SSE |
| HU-05/CA-N03 | 200 productos/20 categorías sin degradar HU-02 | k6 + arnés + Playwright | Se repiten las métricas de HU-02 con el menú grande |
| HU-06/CA-N02 | Modificación en barra ≤ 2 s p95 | Arnés realtime | Como HU-02 |
| HU-07/CA-F03 | Sesión de usuario desactivado cerrada en ≤ 1 min | Integración + E2E | Desactivar → sesión rechazada, flujo SSE cerrado |
| HU-08/CA-N02 | Resumen de 500 pedidos ≤ 2 s | k6 + Playwright | Semilla `dia-500`; se mide API y pantalla completa |

- Además (informativo, sin criterio de historia): Lighthouse en P-01, P-04 y P-05
  con perfil tablet; presupuesto propuesto LCP ≤ 2,5 s y JS inicial ≤ 300 kB
  gzip. Si el PO lo acepta, pasa a criterio.
- Prueba de resistencia (Etapa 3): pantalla de barra abierta 4 h con flujo de
  pedidos simulado; sin fugas de memoria apreciables (heap del navegador estable)
  ni caducidad de sesión (HU-01/CA-F09).

### 5.7 Seguridad

Base inicial derivada de HU-01/03/04/05/07 y ADR-005/007/008. Se ampliará con
los requisitos de `docs/seguridad.md` y `docs/permisos.md` cuando Cybersecurity
los publique (IDs `TX-SEC-nn`).

- **Matriz de autorización completa:** cada endpoint de §5.1 de arquitectura ×
  {sin sesión, camarero, barra, encargado, sesión con PIN provisional} → código
  esperado (`401`/`403`/`2xx`) y **comprobación de que no hubo efecto** (la BD no
  cambia) en los `403`. Tabla esperada escrita a mano en el test.
- **Sesión:** cookie `HttpOnly; Secure; SameSite=Strict`; logout, reset de PIN y
  desactivación invalidan el token al instante; token reutilizado tras logout →
  `401`; caducidad por inactividad y absoluta; PIN provisional solo permite
  `/auth/pin`, `/auth/me`, `/auth/logout`.
- **Fuerza bruta:** bloqueo por usuario; límite por IP en `/auth/login` (`429`);
  la aprobación de encargado (HU-06) cuenta para el bloqueo; respuesta de login
  con usuario inexistente sin diferencia de tiempo significativa (comparación de
  medianas, umbral a fijar con Cybersecurity).
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
| **3 Testing** | Verificación completa sin asumir nada: todas las suites, rendimiento con las condiciones de referencia, ZAP, regresión visual, mutación (`shared`), exploratorio con guiones (red, multidispositivo, sonido, Wake Lock, reloj), revisión manual de lectores de pantalla. Entrega al PO la matriz con resultados por criterio | todas |
| **4 Demo** | Smoke en DEMO; repetición de rendimiento de tiempo real con dispositivos y Wi-Fi reales; verificación manual de sonido, Wake Lock y legibilidad en la pantalla real de barra; apoyo a la prueba de usabilidad (UX) | `smoke`, `performance/realtime`, manual |
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
  (ya previsto en arquitectura §12). En integración/E2E, los tiempos pasados se
  fabrican **retrasando marcas en la BD de pruebas** (`sent_at`, `ready_at`,
  `last_activity_at`, `locked_until`) en lugar de esperar; el umbral de
  "retrasado" se ajusta con `PATCH /settings` (mín. 1 min). En el navegador,
  `page.clock` simula desfase del reloj de la tablet (± 10 min) para comprobar
  que los minutos de espera usan `serverTime`.
- **Limitación detectada:** la fecha de negocio se calcula en SQL con `now()`
  (arquitectura §4), que no se puede controlar desde los tests de integración.
  Se ha propuesto al Software Engineer que se calcule con el `Clock` inyectado y
  se pase como parámetro (hallazgo en `docs/estado.md`). Sin ese cambio, el paso
  de medianoche y los cambios de hora solo se pueden probar en unitarios.

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
- **Mitigación:** script de inicio que espía `HTMLMediaElement.prototype.play` y
  `AudioContext` para comprobar que se intenta reproducir con cada pedido nuevo y
  no cuando el sonido está desactivado. Se prueba **con la política por
  defecto** (no se usa `--autoplay-policy=no-user-gesture-required`, que
  ocultaría el problema): tras login suena; tras recargar sin gesto, la UI debe
  avisar y ofrecer "Activar sonido" (pendiente de criterio, ver
  `docs/estado.md`). Que el sonido **se oiga** se verifica a mano en la pantalla
  real (Etapa 3 con hardware de referencia y Etapa 4).

### 8.6 Wake Lock en barra
- **Riesgo:** solo funciona en contexto seguro y se libera al ocultar la
  pestaña; headless no tiene pantalla que apagar; no hay criterio en HU-03.
- **Mitigación:** espía de `navigator.wakeLock.request` (se pide al abrir la
  cola y otra vez tras `visibilitychange`); verificación manual en el
  dispositivo real (la pantalla no se apaga en 30 min con la cola abierta).
  Propuesta de criterio al PO en `docs/estado.md`.

### 8.7 Otros
- **Datos compartidos entre tests E2E** (número del día, aviso de mesa ocupada):
  §9.3.
- **Diferencias Chromium/WebKit** (iPad): los flujos críticos se ejecutan en
  ambos.
- **Criterios ambiguos o en revisión:** hasta que el PO los cierre, los tests
  se escriben con la interpretación anotada en la matriz y se ajustan en la
  Etapa 2, al empezar cada historia.

## 9. Datos de prueba y aislamiento

### 9.1 Conjuntos
| Conjunto | Contenido | Uso |
|---|---|---|
| `base` | 1 encargado, 2 camareros, 1 barra, 1 desactivado; 3 categorías, ~12 productos con precios que exponen errores de coma flotante (0,10 · 1,10 · 2,20 · 999,99), 1 agotado, 1 desactivado; 20 mesas | Integración, E2E |
| `menu-200` | 200 productos en 20 categorías | HU-05/CA-N03, rendimiento |
| `dia-500` | 500 pedidos de un día con cobros en efectivo y tarjeta, cancelaciones, anulaciones (incluida una posterior al cierre) y pedidos abiertos; totales esperados precalculados de forma independiente | HU-08 (exactitud al céntimo y rendimiento) |
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
- Mesas por worker: el `fixture` asigna a cada worker un rango propio (con
  `table_count` = 99 en la semilla) para que el aviso "mesa ocupada" no
  interfiera.
- Los tests que observan la cola completa (orden, 6 tarjetas, vacío) o el
  resumen del día van en un proyecto de Playwright **en serie** con su propia
  pila.

## 10. Matriz de trazabilidad inicial

Leyenda: **U** unitario · **I** integración (API + BD) · **R** tiempo real
(SSE, integración) · **E** E2E · **V** visual · **A** accesibilidad · **P**
rendimiento · **S** seguridad · **M** manual (con motivo). Estado de todos los
criterios: *pendiente* (los tests se escriben al empezar cada historia en la
Etapa 2). ⚠ = criterio con hallazgo de verificabilidad o en revisión por el PO.

### HU-01 Iniciar sesión con mi rol
| ID | Criterio (resumen) | Tipos |
|---|---|---|
| CA-F01 | Camarero entra a P-02 y no ve menú ni usuarios | E, S |
| CA-F02 | Barra entra a la cola y no puede crear, cobrar ni cancelar | E, S |
| CA-F03 | Encargado accede a todo | E, S |
| CA-F04 | Sin permiso por URL/API → 403 y sin efecto | I, S, E |
| CA-F05 | "Usuario o PIN incorrectos" sin decir cuál | I, E, S |
| CA-F06 | 5 fallos → bloqueo 5 min con tiempo restante | U, I, E |
| CA-F07 | Desactivado con PIN correcto → mensaje propio | I, E |
| CA-F08 | Cerrar sesión invalida la sesión | I, E, S |
| CA-F09 | Inactividad 15 min; barra no caduca con la cola abierta | U, I, E |
| CA-F10 | Pedido/cobro registra el usuario | I |
| CA-U01 | ≤ 2 pasos | E |
| CA-U02 | Teclado ≥ 44x44 | E (medidas), V |
| CA-U03 | Error junto al campo, en texto; PIN vaciado | E, A |
| CA-U04 | Nombre y rol visibles en todas las pantallas | E, V |
| CA-N01 | PIN con hash; nunca en claro ni en logs | I, S |
| CA-N02 | Autorización en servidor | S |
| CA-N03 | Login ≤ 1 s p95 ⚠ | P |
| CA-N04 | Contraste ≥ 4,5:1; etiquetas accesibles | A |

### HU-02 Tomar un pedido
| ID | Criterio (resumen) | Tipos |
|---|---|---|
| CA-F01 | Tipo Mesa (1..N) o Mostrador (ref. ≤ 30) | U, I, E |
| CA-F02 | Tocar producto suma cantidad | U, E |
| CA-F03 | +/-; a 0 se elimina la línea | U, E |
| CA-F04 | Nota ≤ 100 guardada y visible en barra | I, R, E |
| CA-F05 | Total IVA incl., 2 decimales y € | U, E |
| CA-F06 | No disponible: deshabilitado y no se puede añadir (también por API) | I, E, S |
| CA-F07 | Enviar → Pendiente, número del día, en la cola ⚠ (día) | U, I, R, E |
| CA-F08 | Sin líneas: "Enviar" deshabilitado (y API → 400) | I, E |
| CA-F09 | Mesa con pedido abierto: aviso y pedido independiente | I, E |
| CA-F10 | Precio fijado al enviar | I |
| CA-F11 | Descartar: no se guarda ni llega a barra | E |
| CA-U01 | ≤ 6 toques ⚠ | E |
| CA-U02 | Categorías; cambio en 1 toque | E |
| CA-U03 | Producto ≥ 44x44 con nombre y precio | E (medidas), V |
| CA-U04 | Confirmación con número ≥ 3 s; pantalla lista | E (`page.clock`) |
| CA-U05 | Total en ≤ 200 ms ⚠ | P (Playwright) |
| CA-N01 | En barra ≤ 2 s p95 con 10 dispositivos ⚠ | P, E |
| CA-N02 | Sin conexión: mensaje, borrador conservado, sin duplicados | U, I, E |
| CA-N03 | Precios y totales del servidor | I, S |
| CA-N04 | Contraste; tablet 10" horizontal y vertical ⚠ | A, E, V |

### HU-03 Cola de barra (en revisión por el PO)
| ID | Criterio (resumen) | Tipos |
|---|---|---|
| CA-F01 | Tarjeta: número, mesa/cliente, hora, minutos, productos, notas | I, R, E, V |
| CA-F02 | Orden por hora de envío, el más antiguo primero | I, E |
| CA-F03 | Empezar → En preparación | U, I, E |
| CA-F04 | Listo → sale de la cola; camarero ve "Listo" | U, I, R, E |
| CA-F05 | Deshacer en 30 s | U, I, E |
| CA-F06 | Retrasado > umbral (10 min configurable), icono y texto ⚠ | U, I, E, A |
| CA-F07 | MODIFICADO/CANCELADO hasta confirmar con un toque | I, R, E |
| CA-F08 | Pedidos nuevos sin recargar | R, E |
| CA-F09 | Aviso sonoro desactivable ⚠ | E (espía), M (audible) |
| CA-U01 | Texto ≥ 18 px a 1,5 m en 15" ⚠ (hallazgo UX) | E (medidas), M |
| CA-U02 | 1 toque; botones ≥ 60x60 | E (medidas) |
| CA-U03 | ≥ 6 pedidos sin desplazar a 1920x1080 ⚠ (hallazgo UX) | E, V |
| CA-U04 | Estados por texto y color | A, V |
| CA-N01 | Cambio de estado en camareros ≤ 2 s p95 | P |
| CA-N02 | "Sin conexión" ≤ 5 s y resincronización sin pérdidas | U, R, E |
| CA-N03 | Barra no ve importes ni cobra | I, R, S, E |
| CA-N04 | Contraste | A |

### HU-04 Cobrar y cerrar (versión revisada 2026-11-21)
| ID | Criterio (resumen) | Tipos |
|---|---|---|
| CA-F01 | Cobrar con cualquier estado de preparación: detalle y total | I, E |
| CA-F02 | Cobrado/Cancelado: sin "Cobrar"; servidor rechaza | I, E, S |
| CA-F03 | Efectivo: cambio = entregado − total | U, I, E |
| CA-F04 | Efectivo insuficiente: "faltan X,XX €", no confirma | U, I, E |
| CA-F05 | Tarjeta registrada a mano | I, E |
| CA-F06 | Cobrado: guarda fecha, método, importe, usuario; sale de por cobrar | I, E |
| CA-F07 | El cobro no cambia la preparación; sigue en cola | I, R, E |
| CA-F08 | Cobrado: no se modifica ni cancela | I, S |
| CA-F09 | Cobrar mesa: un cobro con un total para todos | I, E |
| CA-F10 | Ver ticket | I, E, V |
| CA-F11 | Anulación con motivo < 5 → no permite y mensaje | U, I, E |
| CA-F12 | Anulación afecta al cobro completo; pedidos vuelven a Abierto | I, E |
| CA-F13 | No se puede anular un solo pedido de "Cobrar mesa" | I |
| CA-F14 | Anular no cambia la preparación | I |
| CA-F15 | Cobro anulado se conserva y cuenta en el día original (HU-08) | I |
| CA-F16 | Pedido reabierto: modificable y cobrable; el nuevo cobro cuenta en su día ⚠ (día) | I, E |
| CA-F17 | No se anula dos veces | I |
| CA-U01 | Tarjeta ≤ 3 toques | E |
| CA-U02 | Efectivo ≤ 4 toques + importe; botones rápidos | E |
| CA-U03 | Cambio ≥ 32 px | E (medidas) |
| CA-U04 | Total y método visibles antes; "Pedido N cobrado" después ⚠ ("claramente") | E |
| CA-U05 | Antes de anular: pedidos que se reabren e importe | E |
| CA-N01 | Sin dos cobros vigentes (doble toque, reintento) | I (concurrencia), E |
| CA-N02 | Cobros y anulaciones auditados y no borrables | I (BD) |
| CA-N03 | Cobran camarero y encargado; anula solo encargado | S |
| CA-N04 | Confirmación ≤ 1 s p95 | P |
| CA-N05 | Importes exactos | U, I |

### HU-05 Gestionar el menú
| ID | Criterio (resumen) | Tipos |
|---|---|---|
| CA-F01 | Crear categoría (1–30, única) y aparece en la toma | I, E |
| CA-F02 | Crear producto (1–40, categoría, 0,01–999,99, 2 decimales) | U, I, E |
| CA-F03 | Cambio de precio solo para pedidos nuevos | I |
| CA-F04 | Agotado/Disponible en todos los dispositivos ≤ 5 s | I, R, E, P |
| CA-F05 | Desactivar: desaparece de la toma, se conserva en histórico | I, E |
| CA-F06 | Datos inválidos: no guarda, indica campo y rango | U, I, E |
| CA-F07 | Nombre duplicado en la categoría: mensaje | I, E |
| CA-F08 | Borrar categoría con activos: no permite, muestra cuántos | I, E |
| CA-F09 | Reordenar se refleja en la toma | I, E |
| CA-U01 | 1 formulario, ≤ 4 campos obligatorios | E |
| CA-U02 | Agotado en ≤ 2 toques desde la toma | E |
| CA-U03 | Errores con campo y cómo corregir | E, A |
| CA-N01 | Permisos (agotado también camarero) | S |
| CA-N02 | Auditoría de cambios de precio | I |
| CA-N03 | 200 productos / 20 categorías sin degradar HU-02 ⚠ | P |
| CA-N04 | Etiquetas; navegable con teclado | A |

### HU-06 Modificar o cancelar (en revisión por el PO)
| ID | Criterio (resumen) | Tipos |
|---|---|---|
| CA-F01 | Añadir → "AÑADIDO" en barra; total recalculado | I, R, E |
| CA-F02 | Pendiente: quitar/reducir → "MODIFICADO" en barra | I, R, E |
| CA-F03 | En preparación/Listo: quitar exige PIN de encargado | I, E, S |
| CA-F04 | Cancelar con motivo → Cancelado; barra ve "CANCELADO" | I, R, E |
| CA-F05 | Cancelar en preparación/listo exige PIN de encargado | I, E, S |
| CA-F06 | Cobrado: no se modifica ni cancela | I, S |
| CA-F07 | Registro de quién, cuándo, qué y motivo | I |
| CA-U01 | Cancelar Pendiente ≤ 3 toques | E |
| CA-U02 | Diálogo con número e importe | E |
| CA-U03 | AÑADIDO / ELIMINADO (tachado) en texto | E, A, V |
| CA-N01 | PIN de encargado validado en servidor y registrado | I, S |
| CA-N02 | Modificación en barra ≤ 2 s p95 | P |
| CA-N03 | Concurrencia: nada se pierde; el segundo recibe aviso y versión nueva | I (concurrencia), E |

### HU-07 Gestionar personal
| ID | Criterio (resumen) | Tipos |
|---|---|---|
| CA-F01 | Alta (nombre 1–30 único, rol, PIN) y puede entrar | I, E |
| CA-F02 | Cambio de rol efectivo en la siguiente acción, sin volver a entrar | I, R, E |
| CA-F03 | Desactivar: sesión cerrada ≤ 1 min; no entra; nombre en histórico | I, R, E |
| CA-F04 | Restablecer PIN: el anterior deja de valer; cambio obligatorio | I, E |
| CA-F05 | Último encargado no se desactiva ni pierde el rol | I, E |
| CA-F06 | Reglas de PIN | U, I, E |
| CA-F07 | No se borran usuarios | I, S |
| CA-U01 | Alta en 1 formulario de 3 campos | E |
| CA-U02 | Lista con nombre, rol y estado en texto | E, A |
| CA-N01 | Solo encargado; PIN nunca mostrado ni en logs | S, I |
| CA-N02 | Auditoría de altas, roles, desactivaciones y PIN | I |
| CA-N03 | Etiquetas; teclado | A |

### HU-08 Resumen del día (en revisión por el PO)
| ID | Criterio (resumen) | Tipos |
|---|---|---|
| CA-F01 | Cifras del día seleccionado (por defecto hoy) ⚠ (día) | I, E |
| CA-F02 | Productos vendidos por importe descendente | I, E |
| CA-F03 | Aviso "Hay N pedidos sin cobrar" con acceso | I, E |
| CA-F04 | Efectivo contado → diferencia; guardar cierre | U, I, E |
| CA-F05 | Día cerrado: cifras del cierre; anulados posteriores aparte | I, E |
| CA-F06 | Cualquier día de los últimos 90 | I, E |
| CA-F07 | Cuadra al céntimo con los cobros | I (`dia-500`) |
| CA-U01 | 1 toque desde el menú del encargado | E |
| CA-U02 | 2 decimales y €; negativo con "-" y "Falta" | U, E, A |
| CA-N01 | Solo encargado | S |
| CA-N02 | 500 pedidos ≤ 2 s ⚠ | P |
| CA-N03 | Cierre inmutable con usuario, fecha y efectivo | I (BD) |

### Transversales
| ID | Comprobación | Tipos |
|---|---|---|
| TX-CONT-01 | Política rootless de todos los contenedores | Contenedores |
| TX-SEC-nn | Requisitos de `docs/seguridad.md` (pendiente) | S |
| TX-SMK-01..07 | Smoke post-despliegue | Smoke |
| TX-RT-01 | Proxy no almacena SSE en búfer | R |
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
   sin carga); el cumplimiento formal se verifica en Etapa 3.
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

## 14. Hallazgos de verificabilidad enviados (Etapa 1)

Detalle y propuestas de redacción en `docs/estado.md` (fila "testing"):
T-01 IDs estables de criterios · T-02 condiciones de referencia de rendimiento ·
T-03 total en ≤ 200 ms · T-04 inicio del cómputo de "retrasado" · T-05 sonido
bloqueado por el navegador y pantalla encendida · T-06 "sin degradar" (HU-05) ·
T-07 tablet 10" horizontal y vertical · T-08 "claramente" (HU-04) · T-09
resumen ≤ 2 s (HU-08) · T-10 fecha de negocio calculada con `now()` de SQL
(software-engineer) · T-11 ubicación de los tests (software-engineer) · T-12
requisitos de `compose.test.yaml` y sandbox de Chromium (infrastructure,
cybersecurity). No repito los ya reportados por UX (18 px, 6 pedidos, 6 toques,
WCAG 2.2) ni los del SE (estados, anulación, día), que también afectan a los
tests.
