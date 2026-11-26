# Estrategia de pruebas — Toma de pedidos para cafetería (MVP)

> Responsable: Testing Engineer · Etapa 1, tareas 1.6 (2026-11-21), 1.6b y
> 1.6d (2026-11-23) · Estado: **aprobada en la puerta de la Etapa 1 (2026-11-24)**;
> Etapa 2 en curso.
>
> **2.1 (2026-11-24, Etapa 2, HU-01):** tests de HU-01 escritos antes de la
> implementación (ficheros y cobertura por criterio en §10, "Ficheros de
> HU-01"), `tests/run.sh` con los requisitos 1–5 de `docs/infraestructura.md`
> §7.1 y el contrato con el Developer en `tests/README.md`. Corregidos restos
> de T-19/T-20 ya resueltos en la arquitectura 1.7a (I-11, I-12, §5.2, P-6) y
> un ejemplo erróneo de §5.1 (12345 es una secuencia). Hallazgos nuevos
> T-28..T-37 (§14.5).
>
> **2.1e (2026-11-24, Etapa 2, HU-01):** tests ajustados al contrato aceptado
> por el SE en la 2.1c (`docs/arquitectura.md` §2.1, §3.1, §5, §5.2, §7,
> §10.1, §17), a la BD de test de Infrastructure (2.1b/2.1b2, `docs/infraestructura.md`
> §6, §9.1) y a los textos de UX de la 2.1d. BD por fichero clonada de
> `app_template` con `test_admin` (§9.2); `tests/run.sh` genera
> `db_test_admin_password` y ejecuta `migrate-template`; unitario de RS-13
> contra `parseSettings`; casos nuevos (motivo del `401`, orden de
> comprobaciones, denegación por defecto, reconexión de la barra, "Acceso
> denegado" por `403` de la API). T-28..T-32, T-36, T-37 cerrados; hallazgos
> nuevos T-38..T-43 (§14.6). Trazabilidad: 23/23.
>
> Entradas: `docs/reglas-equipo.md`, `docs/historias/` (HU-01..HU-08 y README,
> rondas 1.1d con IDs estables, 1.1e con las decisiones del humano y 1.1f con
> T-14..T-17 e I-01..I-10; HU-09 fuera del MVP), `docs/arquitectura.md`
> (revisión 1.3c: `verifyPin`, SEC-016, SEC-022, configuración de instalación),
> ADR-001..ADR-008 (ADR-005 revisión (c)), `docs/ux/` (flujos, wireframes,
> design system), `docs/seguridad.md` (§6.1, §6.3, §7: RS-01..RS-46),
> `docs/permisos.md`, `docs/infraestructura.md` (§9 TESTING, §12.5 IP de
> origen) y `docs/logging.md` (rondas 1.6c y 1.6e: §4.3 (b), §4.5, §6.3, §6.6).
>
> **1.7p (2026-11-24):** verificada la 1.7o del SE (`docs/arquitectura.md`
> §4.4 "Aislamiento y orden de las transacciones del cerrojo", "Dos cierres en
> paralelo", "Lectura del resumen", §9 y §16): T-26 cerrado (§14.4) y marca ⚠
> quitada de HU-08/CA-F07. C-09 (b) precisado al orden de sentencias de §4.4
> (reloj fijo, `paid_at` exacto, cerrojo compartido concedido) y ampliado con
> la comprobación de `READ COMMITTED` y una variante de sensibilidad con
> `REPEATABLE READ`; C-19 sin logs `23505` ni `500` y unitario del traductor
> de `23505` en `cash_closings_pkey`. Hallazgo nuevo T-27 (§14.4).
>
> **1.7m (2026-11-24):** tras la 1.7h del SE (`docs/arquitectura.md` §4.4,
> §5.1, §16) y la 1.7k del PO (HU-08/CA-F03, CA-F05, CA-F07, CA-F15):
> I-13..I-16 confirmadas (§4.5); §5.2.3 con el oráculo de C-13 en `< cierre`,
> C-09 ajustado al cerrojo `CASH_CLOSING_LOCK` (reloj que avanza, anulaciones y
> cancelaciones, caso determinista de transacción en vuelo), C-10 ampliado a los
> productos guardados y casos nuevos C-16..C-19 (`422 DATE_OUT_OF_RANGE`,
> `201` y forma de la respuesta con `afterClosing`, `409 DAY_ALREADY_CLOSED`);
> marcas ⚠ resueltas quitadas de la matriz de HU-08; T-23..T-25 cerrados y
> T-26 nuevo (§14.4).
>
> **1.7i (2026-11-24):** HU-08/CA-F15 nuevo y CA-F05, CA-F07 precisados (PO
> 1.7f): casos de día cerrado con `FakeClock` en §5.2.3, interpretaciones
> I-13..I-16 (§4.5), matriz y recuento (207 criterios) actualizados;
> `TX-MON-01` ajustado a la decisión de Infrastructure sobre T-22
> (`docs/infraestructura.md` §11.3). Hallazgos T-23..T-25 en §14.4.
>
> **1.6d:** interpretaciones confirmadas por el PO (§4.5); casos nuevos de
> HU-01/CA-F12, CA-F13, HU-03/CA-F09, CA-N05 y HU-05/CA-N03 (lista cerrada);
> verificación de PIN única (`verifyPin`, SEC-016, §5.2.1); RS-46;
> configuración de instalación (§5.2.2); redacción recursiva de logs y
> retención de Loki (§5.10). Códigos de error alineados con
> `docs/arquitectura.md` §5/§5.1 (§8.7, §10). Cierre de T-14..T-17 y hallazgos
> T-19..T-22 en §14.3.
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
- Recuento a 2026-11-24 (tras la ronda 1.7f): HU-01 23 · HU-02 35 · HU-03 34 ·
  HU-04 34 · HU-05 16 · HU-06 27 · HU-07 16 · HU-08 22 = **207 criterios** en
  el MVP (+2 de la 1.1f: HU-01/CA-F12 y CA-F13; +1 de la 1.7f: HU-08/CA-F15;
  ningún retirado; HU-09, con 14, queda fuera; sus IDs no se retiran por si
  se recupera),
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

### 4.5 Interpretaciones que aplican los tests (confirmadas por el PO, ronda 1.1f)

Donde un criterio admitía más de una lectura, el test aplica la de esta tabla.
I-01..I-10 las ha **confirmado o corregido el PO** en la ronda 1.1f
(`docs/historias/README.md`, "Interpretaciones de Testing confirmadas por el
PO") y forman parte de los criterios citados: si alguna cambia, el PO la marca
allí y Testing ajusta el test; un test no se relaja por su cuenta. Verificado
por Testing en la 1.6d (columna "Resultado PO"): la lectura vigente coincide
con la que aplican los tests, salvo I-06, que se sustituye por la lista
cerrada. I-11 e I-12 son nuevas (1.6d) y están pendientes de los hallazgos
T-19 y T-20 (§14.3). I-13..I-16 (1.7i, HU-08 día cerrado) las ha
**confirmado el PO** en la ronda 1.7k (`docs/historias/README.md`, entrada
1.7k) y ya están escritas en HU-08/CA-F03, CA-F05, CA-F07 y CA-F15; coinciden
con `docs/arquitectura.md` §4.4 y §5.1 (1.7h). Verificado por Testing en la
1.7m (T-23..T-25 cerrados, §14.4).

| ID | Criterio | Resultado PO | Interpretación aplicada |
|---|---|---|---|
| I-01 | HU-01/CA-F06, CA-F12 | Confirmada | El 5.º fallo consecutivo activa el bloqueo; durante el bloqueo los intentos se rechazan **sin verificar el PIN** (también con PIN correcto) y **no cuentan**. Al expirar un bloqueo el contador no se reinicia: 10 acumulados → 15 min, 15 → 60 min, 20 → indefinido. Igual para la reconfirmación (`confirmPin`) y el `currentPin` de `POST /auth/pin` (HU-01/CA-F12, `verifyPin` paso 3). Coincide con `docs/seguridad.md` §6.1.3 |
| I-02 | HU-01/CA-F11, HU-06/CA-F17 | Confirmada | "Dispositivo" = IP de origen que ve el servidor (`docs/seguridad.md` §6.1.5, SEC-003). Ventana móvil de 10 min; el rechazo dura 10 min desde el 10.º fallo y se aplica antes de verificar el PIN (RS-05). Suman login, aprobación, reconfirmación y cambio de PIN (`verifyPin` paso 1). La topología B (SEC-019) no cambia el criterio |
| I-03 | HU-01/CA-F06, CA-F11, CA-F12; HU-06/CA-F19 | Confirmada | "X min" = minutos restantes **redondeados hacia arriba** (4 min 1 s → "5 min"); nunca "0 min". Se calcula desde `retryAfterSeconds` |
| I-04 | HU-03/CA-F06 | Confirmada | Retrasado con espera **≥ N min**: a N − 1 s no se resalta; entre N y N + 60 s debe aparecer; a N + 60 s está resaltado seguro |
| I-05 | HU-04/CA-U04 | Confirmada | "Sin desplazar" en 1280x800, 800x1280 (supuesto 23) y TPV 1024x768 |
| I-06 | HU-05/CA-N03 | **Corregida** (T-17) | Ya no se aplica la lectura amplia. **Lista cerrada**: con `menu-200` se verifican solo HU-02/CA-N01, CA-U05, CA-F23, CA-N05 y HU-05/CA-F04 (§5.6.1). Los demás criterios de HU-02 se prueban con `base` |
| I-07 | HU-02/CA-U05 y cualquier p95 que no cite el supuesto 12 | Confirmada | ≥ 200 muestras por métrica |
| I-08 | Supuesto 12 y criterios de dispositivo real | Confirmada | Rendimiento del supuesto 12: vinculante en TESTING, DEMO solo observa (una desviación es un hallazgo). HU-03/CA-U01, HU-03/CA-N05 y HU-02/CA-U05 (dispositivo de referencia) se verifican en el hardware (marca **H**) y su resultado es vinculante |
| I-09 | HU-03/CA-F14 | Confirmada **e incorporada** al criterio (T-15) | Aviso "Sonido bloqueado" en ≤ 1 s desde que se abre la cola o desde que falla un aviso. Ya no es interpretación: es el texto del criterio |
| I-10 | HU-04/CA-F23, HU-07/CA-N04 | Confirmada | Un `confirmPin` incorrecto cuenta como 1 fallo del encargado de la sesión (HU-01/CA-F06) y 1 del dispositivo (HU-01/CA-F11), igual que una autorización de HU-06. El límite adicional por sesión (5 fallos/10 min, `docs/seguridad.md` §6.1.4) es de Cybersecurity y **no** añade mensaje propio en las historias (ver T-20) |
| I-11 | HU-02/CA-F01 | Resuelta por T-19 (`docs/arquitectura.md` §5.1, 1.7a): coincide | Mesa entera en 1..99 pero > `TABLE_COUNT` (21..99 con 20 mesas) → `422 TABLE_OUT_OF_RANGE` (`docs/arquitectura.md` §4.1, §5.1). Mesa fuera del dominio del campo (0, −1, 100, 1,5, `"7"`) → `400` de validación con `path: ["tableNumber"]`, por la regla general de §5 ("`400` validación con campo y regla") y el `CHECK BETWEEN 1 AND 99`. Si el SE decide `422` también para 0, se cambia el test |
| I-12 | HU-01/CA-F12 (c) y (d), HU-04/CA-F23, HU-07/CA-N04, HU-07/CA-F04 | Resuelta por T-20 opción A (`docs/arquitectura.md` §7, 1.7a): sin límite de sesión para `confirm`/`change`; historia y arquitectura coinciden | Mientras la cuenta del titular de la sesión está en bloqueo temporal, toda reconfirmación (`confirmPin`) o `currentPin` de esa sesión recibe `423 LOCKED` ("Cuenta bloqueada. Espera X min"), **también** cuando la misma sesión acumula 5 fallos (lo que la arquitectura respondería con `429` por el límite de sesión, paso 2 de `verifyPin`); y al terminar el bloqueo se puede volver a intentar (CA-F12 (d)). Los tests siguen la historia; si la arquitectura no cambia, fallarán y se reportan |
| I-13 | HU-08/CA-F05, CA-F07, CA-F15 | Confirmada (PO 1.7k, T-23; escrita en CA-F05 y aplicada en CA-F07 y CA-F15) | Reparto por la hora del cierre guardado, como en `docs/arquitectura.md` §4.4 (1.7h): lo registrado **antes** de `closed_at` (`<`) está en las cifras del cierre; lo registrado **en o después** de `closed_at` (`>=`), en "Cambios tras el cierre". Sea cual sea el mecanismo, cada cobro, anulación y cancelación del día está **exactamente en uno** de los dos sitios: nunca en los dos ni en ninguno, tampoco si el cobro y el cierre son simultáneos (§5.2.3, C-08 y C-09) |
| I-14 | HU-08/CA-F15 (d), CA-F09, CA-F13 | Confirmada (PO 1.7k; escrita en CA-F15 (d)); coincide con `docs/ux/wireframes/09-resumen-dia.md` y con `docs/arquitectura.md` §4.4 (anulados por `voided_by`, `not_applicable`) | Cuando se anula un cobro registrado tras el cierre, sale de "Cobros tras el cierre" de la fila de quien cobró y cuenta en "Cobros anulados" de la sección en la fila del **encargado que anuló**, con "No aplica (encargado)" (como en el desglose, CA-F13), por el importe del cobro completo. Si se anula en un día posterior, cuenta en la sección del día del cobro original (CA-F09), no en la del día de la anulación |
| I-15 | HU-08/CA-F03 en un día cerrado | Confirmada (PO 1.7k, T-25; escrita en CA-F03 y CA-F05); coincide con `docs/arquitectura.md` §5.1 (`openOrders` siempre actual) | El aviso "Hay N pedidos sin cobrar" **no** es una cifra del cierre guardado: se calcula al consultar (CA-F03 "al consultar el resumen"). Un cobro tras el cierre lo reduce en 1 y anular ese cobro lo vuelve a subir (el pedido se reabre, HU-04/CA-F16) |
| I-16 | HU-08/CA-F05 (cancelaciones), CA-F11 | Confirmada (PO 1.7k, T-24; escrita en CA-F05); coincide con `docs/arquitectura.md` §4.4 (`cancelled_at` en `[closed_at, dayEnd)`) | "Pedidos de ese día cancelados después del cierre" = pedidos **cancelados** ese día después del cierre, sea cual sea el día del pedido (CA-F11 cuenta por día de cancelación), igual que CA-F15 hace con los cobros. Un pedido del día D cancelado en D+1 cuenta en D+1 y no aparece en la sección de D |

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
  739164; 1357 solo si no está en la lista; 12345 se rechaza por secuencia), matriz de permisos
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
  - **`verifyPin` (SEC-016, `docs/arquitectura.md` §7)**, con *hasher* espía,
    almacenes de contadores en memoria y `FakeClock`: tabla de casos por
    `purpose` ∈ {`login`, `approval`, `confirm`, `change`} que comprueba el
    **orden** de los pasos 1–6 (IP → sesión → bloqueo → hash → fallo/acierto)
    por su efecto observable: qué `reason` devuelve, si se llamó al *hasher* y
    qué contadores cambiaron. Incluye: (a) **5 fallos por sesión sumando los
    tres usos** con el mismo `sessionId` (p. ej. 2 `approval` + 2 `confirm` +
    1 `change`) → el 6.º, de cualquier uso, es `rate_limited` sin llamar al
    *hasher*; a 9 min 59 s sigue limitado, a 10 min no (ventana móvil). Es la
    única capa donde se pueden mezclar: por la API, una sesión de camarero solo
    hace aprobaciones, una de encargado solo reconfirmaciones y una con PIN
    provisional solo cambio de PIN (§5.2.1, T-21). (b) `locked` /
    `locked_manual` sin hash y **sin sumar** al usuario, a la IP ni a la
    sesión. (c) Escala 5/10/15/20 sobre el usuario cuyo PIN se verifica (el
    encargado elegido en `approval`; el de la sesión en `confirm`/`change`).
    (d) Al 20.º fallo, petición de revocación de **todas** las sesiones de esa
    cuenta, cualquiera que sea `purpose`. (e) `target = null` → hash ficticio
    (el *hasher* se llama igual) y resultado `invalid`.
  - **Configuración de instalación (`config.ts`, `docs/arquitectura.md`
    §4.1):** `TABLE_COUNT` acepta 1, 20 y 99 y rechaza 0, 100, −1, `20.5`,
    `20a`, `" "` y `0x14`; `DELAY_THRESHOLD_MINUTES` acepta 1, 10 y 60 y
    rechaza 0, 61, −1, `10.5` y `diez`; sin la variable → valor por defecto
    (20 / 10). El rechazo es un error de arranque (no un aviso) cuyo mensaje
    nombra la variable y el rango, sin volcar el entorno ni secretos. Junto a
    la caducidad de 12 h (RS-13, mismo `config.ts`).
  - **Redacción recursiva de logs (`docs/logging.md` §4.3 (b) y §4.5,
    SEC-017):** ver §5.10.
- `apps/web`: total en vivo, contador de caracteres (30/100), vigilante "Sin
  conexión" a los 5 s (temporizadores falsos), conservación del borrador en
  `localStorage` y reutilización del UUID en el reintento. Preferencia de
  sonido de barra (HU-03/CA-F09): se lee y escribe en el almacenamiento del
  dispositivo, no depende del usuario y por defecto es "activado".
  "X min" desde `retryAfterSeconds` (I-03: 241 s → "5 min", 1 s → "1 min",
  300 s → "5 min").

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
  HU-07/CA-N01, RS-29). Detalle de los casos de `docs/logging.md` §4.5 en
  §5.10. Los eventos de seguridad (`auth.locked` con nivel,
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
  formulario de Personal siguen escritos tras el fallo. **[1.6d, resuelto en la 1.7a]**
  Con 5 fallos en la misma sesión la arquitectura respondía `429`; tras T-20
  (opción A) `confirm` y `change` no tienen límite por sesión y el 6.º intento
  recibe `423`, como pide HU-01/CA-F12. Sesión abierta con la
  cuenta bloqueada (T-14 resuelto): §5.2.1.

#### 5.2.1 Verificación de PIN única (`verifyPin`, SEC-016; HU-01/CA-F12, CA-F13)

Archivo `tests/integration/api/HU-01-verify-pin.int.test.ts` (más casos en
los archivos de HU-04, HU-06 y HU-07), con `buildApp` + `FakeClock` + *hasher*
espía y `remoteAddress` por dispositivo (§5.2). En cada caso se comprueban la
respuesta (código, `error.code` y `retryAfterSeconds`), `failed_attempts`,
`locked_until` y `locked_manual` en BD, si se llamó al *hasher*, que la acción
no tuvo efecto (BD sin cambios) y el log (§5.10). Los contadores por IP y por
sesión están en memoria y no se leen: se comprueban por su efecto (cuántos
fallos más admite esa IP o esa sesión antes del `429`).

**`POST /auth/pin` (cambio obligatorio del PIN provisional).**

| # | Caso | Esperado |
|---|---|---|
| P-1 | Sesión **sin** PIN provisional (`mustChangePin = false`), con `currentPin` correcto y con incorrecto | `403 FORBIDDEN`; el PIN no cambia; *hasher* no llamado; `failed_attempts` igual. **No suma a ningún contador:** tras 12 peticiones así desde la IP A con la misma sesión de encargado, esa sesión todavía admite 4 `confirmPin` incorrectos con `403 PIN_CONFIRMATION_INVALID` sin `429`, y la IP A admite 9 logins fallidos antes del `429` del 10.º siguiente. Evento `auth.pin.change_failed` con `reason: "not_provisional"`; `auth_pin_change_rejected_total{reason="not_provisional"}` +1; `auth_verifications_total` **sin** muestra nueva (no se llamó a `verifyPin`) |
| P-2 | PIN provisional, `currentPin` correcto, `newPin` válido | `204`; `mustChangePin = false`; las **demás** sesiones del usuario → `401` y SSE cerrado en ≤ 1 s (RS-14); esta sigue válida y ya accede a su pantalla |
| P-3 | PIN provisional, `currentPin` incorrecto | `403 PIN_INVALID` (no `401`): la sesión sigue válida (`GET /auth/me` → `200`); `failed_attempts` +1; cuenta para la IP y para la sesión |
| P-4 | PIN provisional, `newPin` que incumple la regla (encargado con 5 dígitos, `111111`, `123456`, de la lista) y `currentPin` correcto | `400` con la regla incumplida; el PIN no cambia |
| P-5 | Cuenta en bloqueo temporal (5 fallos de login desde la IP B) y `currentPin` **correcto** desde la sesión provisional en la IP A | `423 LOCKED {retryAfterSeconds}`; *hasher* no llamado; nada cambia; no cuenta (I-01, HU-01/CA-F12 (c)) |
| P-6 | 5 `currentPin` incorrectos en la misma sesión; 6.º con el PIN correcto | Fallos 1–5: `403 PIN_INVALID` (el 5.º activa el bloqueo de 5 min con el mensaje normal, CA-F12 (b)). 6.º: **`423 LOCKED`** sin hash; a los 5 min, `204` (I-12; T-20 resuelto en la 1.7a) |
| P-7 | Límite por IP: 10 fallos de cualquier ruta de PIN desde la IP A en 10 min; después `currentPin` correcto desde esa IP | `429 TOO_MANY_ATTEMPTS {retryAfterSeconds}`, *hasher* no llamado, nada cambia. Control: otra sesión provisional desde la IP B con `currentPin` correcto → `204` (el límite es de la IP) |
| P-8 | `failed_attempts = 19` (fabricado en BD) y `currentPin` incorrecto | `423 ACCOUNT_LOCKED_MANUAL`; `locked_manual = true`; **todas** las sesiones del usuario, incluida esta, revocadas (siguiente petición `401`) (HU-01/CA-F13) |

**Límite de 5 fallos por sesión (sumando aprobación, reconfirmación y cambio).**
Por la API cada tipo de sesión solo alcanza un uso (T-21), así que la suma de
los tres se prueba en unitario (§5.1, `verifyPin` (a)) y aquí, por ruta:
- **Aprobaciones (HU-06/CA-F19, RS-05):** sesión de camarero en la IP A; 5
  `managerApproval` incorrectos repartidos entre **dos** encargados (3 sobre
  E1, 2 sobre E2, ninguno llega a su bloqueo) → la 6.ª, aunque el PIN sea
  correcto, `429` sin hash; los dos encargados siguen pudiendo iniciar sesión
  (prueba de que el límite es de la sesión, no del encargado). Otra sesión de
  camarero en la IP B sí puede pedir autorización. A los 10 min la primera
  sesión vuelve a poder. Evento `auth.verify.rate_limited` con
  `scope: "session"`, `purpose: "approval"` y `session_id`;
  `auth_verifications_total{result="rate_limited_session"}` +1.
- **Reconfirmaciones:** P-6 aplicado a `POST /payments/:id/void`,
  `POST /staff`, `PATCH /staff/:id` (rol y activo), `reset-pin` y `unlock`; en
  todos se espera `423` (I-12). Para separar el límite de sesión del bloqueo
  se usa además: 4 `confirmPin` incorrectos, avanzar 10 min y 1 más → el 5.º
  de la cuenta activa el bloqueo (es el 1.º de la ventana de la sesión), y el
  siguiente da `423` en cualquier lectura.
- **Cambio de PIN:** P-6.
- **Encargado con sesión propia que envía `managerApproval`** (la UI lo
  omite): sin efecto en contadores ni respuesta distinta. Resultado esperado
  pendiente de T-21.

**`423` sin contar durante un bloqueo temporal (HU-01/CA-F12).** Cuenta del
encargado E1 bloqueada 5 min por 5 logins fallidos desde la IP B; E1 tiene
sesión en la IP A:
1. E1 sigue usando la sesión (`GET /orders/floor`, `GET /reports/daily`,
   crear pedido → `2xx`; CA-F12 (a)).
2. 10 `confirmPin` (5 correctos y 5 incorrectos, mezclados) a anular cobro y a
   Personal → todos `423 LOCKED` con `retryAfterSeconds` decreciente; nada
   anulado ni creado; `failed_attempts` sigue en 5; *hasher* no llamado. La IP
   A admite después 9 logins fallidos de otro usuario sin `429` y la sesión
   admite 4 `confirmPin` incorrectos tras el bloqueo sin `429` (los `423` no
   contaron en IP ni en sesión).
3. Log: 10 eventos `auth.verify.locked` (`purpose: "confirm"`,
   `lock_kind: "temporary"`, `retry_after_s`);
   `auth_verifications_total{purpose="confirm",result="locked"}` +10 y
   `auth_verifications_total{result="invalid"}` **sin cambio** (se lee
   `/metrics` antes y después, puerto 9464 interno).
4. `FakeClock` +5 min: `confirmPin` correcto → `200`, acción hecha,
   `failed_attempts = 0` (CA-F12 (d)).
5. Mismo escenario con bloqueos de 15 y 60 min (fabricados con
   `failed_attempts` 10 y 15) y con `currentPin` de una sesión provisional.
6. `managerApproval` eligiendo a E1 bloqueado desde un camarero →
   `403 MANAGER_APPROVAL_INVALID` (HU-06/CA-F18), no `423`; tampoco cuenta.
7. E2E (proyecto en serie): en P-06 (anular cobro) y en Personal aparece
   "Cuenta bloqueada. Espera X min" junto al campo de PIN; el motivo y los
   datos del formulario siguen escritos. El 5.º fallo que activa el bloqueo
   muestra "PIN incorrecto" (CA-F12 (b)).

**Revocación de todas las sesiones a los 20 fallos, venga de donde venga
(HU-01/CA-F13, `docs/arquitectura.md` §7 paso 5).** Usuario U con
`failed_attempts = 19` fabricado en BD y **tres** sesiones abiertas (IP A, B y
C; una de ellas con SSE abierto y otra con la cola de barra si U es encargado).
El 20.º fallo llega por cada vía, en un test por vía:

| Vía del 20.º fallo | Respuesta a esa petición | Esperado común |
|---|---|---|
| Login fallido de U desde la IP D | `401 INVALID_CREDENTIALS`; el siguiente login, con PIN correcto, `423 ACCOUNT_LOCKED_MANUAL` | `locked_manual = true`; las 3 sesiones con `revoked_at` en la misma transacción; siguiente petición en cada una → `401`; evento SSE `session.revoked` y flujo cerrado en ≤ 1 s (RS-14); evento `auth.sessions.revoked` (`reason: "account_locked_manual"`, `purpose`, `sessions_revoked: 3`, `sse_closed`, `from_own_session`); `auth_sessions_revoked_on_lock_total` +3 (cuenta sesiones, `docs/logging.md` §6.3); alerta `AccountLockedManual` en Etapa 3 |
| `managerApproval` incorrecto sobre U (encargado) desde una sesión de camarero W | `403 MANAGER_APPROVAL_INVALID`; **la sesión de W sigue válida** (no es de U) | Igual |
| `confirmPin` incorrecto desde una sesión de U | `423 ACCOUNT_LOCKED_MANUAL`; siguiente petición de esa sesión `401` | Igual (`from_own_session: true`) |
| `currentPin` incorrecto desde la sesión provisional de U | `423 ACCOUNT_LOCKED_MANUAL` | Igual |

Las vías de login y aprobación cubren la parte (1) "a confirmar por
Cybersecurity" de CA-F13, que la arquitectura ya aplica (1.3c); si
Cybersecurity no la confirma, el PO cambia el criterio y se ajusta el test.
La parte (2) (pantalla sin interacción vuelve al inicio de sesión en ≤ 1 s) se
prueba en E2E con la cola de barra abierta sin tocarla: tras el 20.º fallo
desde otro contexto, P-01 visible en ≤ 1 s; al entrar, "Cuenta bloqueada. Pide
al encargado que la desbloquee". En E2E también: lo escrito (motivo,
formulario de Personal) se pierde y la siguiente acción lleva a P-01. Después,
`POST /staff/:id/unlock` o `unlock-user` → U puede entrar y `failed_attempts =
0`.

**SEC-022 / RS-46: el camarero solo lee cobros del día.** Con `FakeClock`:
- Cobro de ayer: camarero → `GET /payments/:id` y `GET /payments/:id/ticket`
  → `404 NOT_FOUND`, con el **mismo** cuerpo (salvo `requestId`) y cabeceras
  que un id inexistente; encargado → `200` en los dos.
- Cobro de hoy: camarero → `200`.
- Bordes en `Europe/Madrid`: cobro a las 23:59:59 leído a las 23:59:59 →
  `200`; leído a las 00:00:00 del día siguiente → `404`; con `TZ=UTC` y
  `TZ=America/New_York` en el contenedor (TX-TZ-01).
- Cobro de ayer anulado hoy (`voidedAt` de hoy): el camarero sigue con `404`
  (cuenta `business_date` del cobro); no aparece en su "Cobrados hoy".
- Barra → `403` en todos los casos (HU-04/CA-F22).

#### 5.2.2 Configuración de instalación (supuesto 20; `docs/arquitectura.md` §4.1, §5.1)

- **Valores fuera de rango impiden arrancar (`[TX-CFG-01]`).** Además del
  unitario de `config.ts` (§5.1), con la **imagen real de `app`** en
  `compose.test.yaml` (servicio de un solo uso, perfil `integration`):
  `TABLE_COUNT` = 0 y 100, `DELAY_THRESHOLD_MINUTES` = 0 y 61 y un valor no
  numérico → el proceso termina con código ≠ 0 antes de escuchar, `/readyz`
  nunca responde, `migrate` no se ve afectado y la línea de error del log
  nombra la variable y el rango (JSON válido, sin secretos). Bordes 1/99 y
  1/60 → arranca y `GET /auth/me` devuelve ese valor en `localConfig`. Lo
  ejecuta `tests/run.sh`, que lanza la imagen con el entorno alterado; no hace
  falta ningún gancho en la imagen.
- **Sin rutas de ajustes:** `GET /settings` y `PATCH /settings` → `404` para
  sin sesión, camarero, barra, encargado y sesión con PIN provisional, sin
  efecto en BD; la lista de rutas de Fastify (RS-17) no contiene `settings`;
  ningún evento SSE `settings.updated`; ningún permiso `settings:*` en la
  matriz esperada (§5.7).
- **`localConfig` por rol** en `GET /auth/me`: camarero `{tableCount: 20}`,
  barra `{delayThresholdMinutes: 10}`, encargado ambos, sin otras claves;
  `GET /kitchen/queue` incluye `delayThresholdMinutes: 10`.
- **Mesas (HU-02/CA-F01, I-11):** 1 y 20 → `201`; 21 y 99 →
  `422 TABLE_OUT_OF_RANGE`; 0, −1, 100, 1,5 y `"7"` → `400` con
  `path: ["tableNumber"]` (pendiente de T-19). Ninguno crea pedido ni consume
  número del día. La rejilla de la UI ofrece exactamente 1..20.

#### 5.2.3 Día cerrado y cambios tras el cierre (HU-08/CA-F03, CA-F04, CA-F05, CA-F06, CA-F07, CA-F12, CA-F13, CA-F14, CA-F15, CA-N03) [1.7i, 1.7m]

`tests/integration/api/HU-08-dia-cerrado.int.test.ts`, con `buildApp(deps)`,
`FakeClock` (T-10) y la BD real del archivo. El reloj fija la **hora del
cierre** y la de **cada cobro, anulación y cancelación**; no se fabrica nada en
la BD salvo los pedidos de días anteriores (§8.1). Día de referencia
D = 2026-11-20 en `Europe/Madrid`; cierre guardado a las 23:10:00 por Marta
(encargado). Antes del cierre se crean cobros en efectivo y tarjeta, una
cancelación con autorización, una sin ella y una anulación, y al menos dos
pedidos de D sin cobrar.

**Oráculo independiente.** Tras el cierre se guarda la respuesta completa de
`GET /reports/daily?date=D` como **S0**: tarjetas de CA-F01, efectivo
esperado, efectivo contado y diferencia (CA-F04), desglose de CA-F13 y
productos vendidos (CA-F02). "No cambia el cierre" se comprueba como igualdad
profunda con S0 de esos bloques (no solo de los totales) y con la fila de
`cash_closings` leída antes y después (CA-N03). La sección aparte se compara
con filas esperadas escritas a mano en el test (usuario, autorizador, número e
importe por columna), no con lo que devuelva la propia API.

**Frontera del cierre [1.7m].** HU-08/CA-F05 (1.7k) y `docs/arquitectura.md`
§4.4 (1.7h) coinciden: "antes del cierre" = hora **anterior** a `closed_at`
(`<`, cifras guardadas); "después del cierre" = hora **igual o posterior**
(`>=`, sección "Cambios tras el cierre"). Los oráculos de esta sección usan esa
regla para cobros (`paid_at`), anulaciones (`voided_at`) y cancelaciones
(`cancelled_at`).

**Forma de la respuesta [1.7m]** (`docs/arquitectura.md` §5.1, "Forma de
`GET /reports/daily`"). Cada respuesta de `GET /reports/daily` y del `201` de
`POST /reports/daily/:date/closing` se valida, además de con el esquema zod de
`packages/shared` (contrato), con aserciones escritas en el test sobre los
valores: en la sección, `afterClosing.rows[]` con `doneBy {id, name}`,
`authorizedBy` (`{type: "user", user}` para el encargado que autorizó una
cancelación, `{type: "none"}` = "Sin autorización", `{type: "not_applicable"}`
= "No aplica (encargado)") y `cancelled`, `voided`, `paid` como
`{count, amountCents}`; `afterClosing.totals` = suma de las filas. "Cobros tras
el cierre" = `paid`. La UI y el E2E comprueban los textos; la integración, los
valores.

| Caso | Reloj (`FakeClock`) y acción | Resultado esperado | Criterios |
|---|---|---|---|
| C-01 | Cierre a D 23:10:00 | Respuesta = S0; `status = "closed"`; sección presente y vacía: `afterClosing = {rows: [], totals: {cancelled: {0, 0}, voided: {0, 0}, paid: {0, 0}}}` (no `null`); en la UI, el texto de día sin cambios del wireframe vigente (P-11) | CA-F05, CA-F04 |
| C-02 | D 23:20:00: la camarera Lucía cobra en efectivo un pedido de D (9,20 €); D 23:25:00: Pedro cobra con tarjeta otro pedido de D (4,50 €) | Bloques de S0 **iguales** (total, efectivo, tarjeta, efectivo esperado, diferencia, desglose CA-F13 y productos vendidos). Sección: "Cobros tras el cierre" Lucía · "Sin autorización" · 1 · 9,20 € y Pedro · "Sin autorización" · 1 · 4,50 €; fila "Total" 2 · 13,70 €. `GET /payments/:id` → `businessDate` = D. El aviso de CA-F03 baja en 2 (I-15) | CA-F15 (a)(b)(c), CA-F08 |
| C-03 | D+1 00:10:00: se consulta D+1 (sin cierre) | Los cobros de C-02 **no** cuentan en D+1 (no se trasladan) | CA-F15 (a) |
| C-04 | D 23:30:00: Marta anula el cobro de Lucía de C-02 | S0 igual. Sección: la fila de Lucía ya no tiene "Cobros tras el cierre" ("—" o desaparece si no le queda nada); Marta · "No aplica (encargado)" · "Cobros anulados" 1 · 9,20 € (I-14); "Total" de "Cobros tras el cierre" 1 · 4,50 €. El pedido se reabre: aviso de CA-F03 +1 | CA-F15 (d), CA-F09, CA-F13 |
| C-05 | D 23:40:00: Pedro vuelve a cobrar el pedido reabierto en C-04 | S0 igual. Sección: Pedro · "Sin autorización" · "Cobros tras el cierre" 2 · 13,70 €; Marta sigue con 1 · 9,20 € en anulados. Solo el cobro vigente aparece como cobro (CA-F10) | CA-F15, CA-F10 |
| C-06 | Pedido de D enviado a las 22:00 y sin cobrar al cerrar; D+1 00:05:00: se cobra | Cuenta en D+1 (CA-F01, CA-F02 de D+1; y en las cifras del cierre de D+1 si D+1 se cierra después); **no** aparece en la sección de D; S0 igual | CA-F15 (último párrafo), CA-F08 |
| C-07 | Pedido de D−1 con cobro "Abierto" (fabricado en la BD de pruebas); D 23:20:00: se cobra | Aparece en "Cobros tras el cierre" de D en la fila de quien cobró; S0 igual; el resumen de D−1 (cerrado o no) no cambia y su sección no lo lista | CA-F15 (a)(c), CA-F08 |
| C-08 | Bordes de la hora del cierre: cobros a D 23:09:59.999 y a D 23:10:00.001 (`FakeClock` en ms) y cierre a D 23:10:00.000; repetido con el cobro **y** el cierre en el mismo instante (reloj sin avanzar, cobro después del cierre en la secuencia) | 23:09:59.999 → en S0 (cifras y productos); 23:10:00.001 → en la sección. Mismo instante (cobro con `paid_at` = `closed_at`): en la sección (I-13, `>=`); en cualquier caso, **exactamente en uno** de los dos sitios | CA-F07, CA-F15, I-13 |
| C-09 | **(a) Carga [1.7m].** 20 `POST /payments`, 5 `POST /payments/:id/void` (de cobros de D anteriores a la carga) y 5 `POST /orders/:id/cancel` (pedidos de D, con y sin autorización) en paralelo con un `POST /reports/daily/D/closing` (pool real de la BD, 50 repeticiones, el cierre se lanza en una posición aleatoria de la ráfaga). `FakeClock` con **avance automático de 1 ms por lectura** desde D 23:09:59.980 (con un reloj fijo todo caería en el mismo instante y, por `>=`, en la sección: el corte no se ejercitaría). **(b) Transacción en vuelo (determinista) [1.7m, 1.7p].** `FakeClock` **fijo** (sin el avance automático de (a)). La conexión del test bloquea la fila del pedido P con `SELECT … FOR UPDATE`; reloj a D 23:09:59.000; se lanza `POST /payments` de P (en efectivo) y se espera a verlo bloqueado en la fila (`pg_stat_activity`: `wait_event_type = 'Lock'` y `wait_event` en `transactionid`/`tuple`, no `advisory`) y a que tenga concedido el cerrojo compartido (`pg_locks`: `locktype = 'advisory'`, `mode = 'ShareLock'`, `granted`); reloj a D 23:10:00.000; se lanza el cierre y se espera a verlo en espera del cerrojo (`wait_event_type = 'Lock'`, `wait_event = 'advisory'`, `ExclusiveLock` no concedido); se libera la fila (`ROLLBACK` de la conexión del test). Con el orden de §4.4 (1.7o) el cobro lee la hora **después** del cerrojo y **antes** del `FOR UPDATE`, y el cierre **después** del cerrojo, así que el resultado no depende de tiempos: `paid_at` = 23:09:59.000 y `closed_at` = 23:10:00.000 siempre. **(b-iso) Aislamiento [1.7p].** Con la misma BD, una prueba de integración del helper de transacción que usan cierre, cobro, anulación y cancelación ejecuta `SHOW transaction_isolation` dentro de la transacción, después del cerrojo. **(b-RR) Sensibilidad [1.7p].** Se repite (b) con el rol de la aplicación en la BD efímera configurado con `ALTER ROLE … SET default_transaction_isolation = 'repeatable read'` (y conexiones nuevas del pool) | **(a)** En cada repetición, con el oráculo leído por SQL del test (`paid_at`, `voided_at`, `cancelled_at` y `closed_at` de las tablas): `figures` del cierre = cobros con `paid_at < closed_at` vigentes al cierre; `afterClosing.totals.paid` = cobros con `paid_at >= closed_at` no anulados; cada cobro, anulación y cancelación de la ráfaga **exactamente en uno** de los dos sitios; efectivo esperado = suma en efectivo de los cobros que incluye; las 31 peticiones responden `2xx` (ningún `500` ni `40P01` interbloqueo en los logs). El test **falla por no concluyente** si en ninguna de las 50 repeticiones hay elementos a los dos lados del corte. **(b)** Ambas peticiones terminan (`201`); `paid_at` del cobro = D 23:09:59.000 y `closed_at` = D 23:10:00.000 (otro valor es una desviación del orden obligatorio de §4.4: responsable developer); el cobro de P está en las cifras del cierre, el efectivo esperado y los productos de S0, y **no** en `afterClosing`. Si no está en ninguno de los dos sitios, falla (pérdida silenciosa, T-26). **(b-iso)** `read committed` en las cuatro operaciones. **(b-RR)** Depende de T-27: si el helper fija `READ COMMITTED` de forma explícita, mismo resultado que (b); si se confía en el valor por defecto de PostgreSQL, el test **espera** que el cobro falte de los dos sitios (demuestra que (b) detecta T-26) y la comprobación de entorno de T-27 (`SHOW default_transaction_isolation` = `read committed` en TESTING, DEMO y PROD) pasa a ser obligatoria | CA-F07, CA-F15 (b), CA-F05 |
| C-10 | Cobro de D registrado **antes** del cierre (D 22:30; 2 cafés con leche y 1 tostada) y anulado después (D 23:30) por Marta | Sigue sumando en S0 como vigente (lo era al guardar): total, método, efectivo esperado y diferencia iguales; **los productos vendidos de S0 no cambian** (los 2 cafés con leche y la tostada siguen en `products` con las mismas unidades e importe y el mismo orden; CA-F05 [1.7k]: una anulación posterior al cierre no resta de los productos guardados); el desglose de CA-F13 tampoco la incluye. Sección: "Cobros anulados" de Marta · "No aplica (encargado)" · 1 · importe del cobro completo; ninguna otra columna cambia. El pedido se reabre: aviso de CA-F03 +1 (I-15) | CA-F05, CA-F07, CA-F09, CA-F13, CA-F03 |
| C-11 | Cobro tras el cierre de D (D 23:20) anulado en D+1 09:00 | Cuenta en "Cobros anulados" de la sección de D (día del cobro original); no en los anulados de D+1 (I-14) | CA-F15 (d), CA-F09 |
| C-12 | Cancelaciones tras el cierre: pedido de D cancelado a D 23:30 "Pendiente" (sin autorización) y otro "En preparación" autorizado por Marta; pedido de D−1 cancelado a D 23:35; pedido de D cancelado a D+1 00:15 | S0 igual. Sección de D: "Pedidos cancelados" en las filas de quien canceló con "Sin autorización" / "Marta", incluido el de D−1 (I-16); el cancelado en D+1 cuenta en D+1 y no en la sección de D | CA-F05, CA-F11, CA-F13 |
| C-13 | CA-F07 en día cerrado con `dia-500` (§9.1), cierre a mitad de la tarde y cambios posteriores | Cifras guardadas = oráculo precalculado sobre los cobros con hora **anterior** a la del cierre (`paid_at < closed_at`, CA-F05/CA-F07 [1.7k]) y vigentes al cierre (no anulados, o anulados con `voided_at >= closed_at`); sección = oráculo de los cobros, anulaciones y cancelaciones con hora **igual o posterior** a la del cierre (`>=`); al céntimo. El conjunto incluye al menos un cobro, una anulación y una cancelación con hora exactamente igual a `closed_at`, que deben salir en la sección | CA-F07, CA-F15, CA-F05 |
| C-14 | Después de C-02..C-12 y C-16 | Suma de las filas del desglose = tarjetas de pedidos cancelados y cobros anulados **del cierre guardado** (CA-F14 en día cerrado); la fila "Total" de la sección = suma de sus filas | CA-F14, CA-F13 |
| C-15 | Cualquier día cerrado: `POST /reports/daily/D/closing` otra vez (con otro `countedCashCents`) | `409` con código `DAY_ALREADY_CLOSED`; `cash_closings` igual byte a byte (CA-N03); `GET /reports/daily?date=D` igual que antes | CA-F05, CA-N03 |
| C-16 [1.7m] | Cobro de D antes del cierre (D 22:30, 2 cafés con leche) anulado tras el cierre (D 23:30); el pedido reabierto se modifica (`PATCH /orders/:id/lines`: 1 café con leche y 1 zumo) y se vuelve a cobrar (D 23:40) | `products` de S0 **iguales** (siguen los 2 cafés con leche; el zumo no aparece; CA-F05, CA-F15 (b)); cifras y desglose iguales. Sección: Marta · "No aplica (encargado)" · "Cobros anulados" 1 · importe original; quien cobró · "Sin autorización" · "Cobros tras el cierre" 1 · importe nuevo. Los productos de lo ocurrido tras el cierre no salen en ninguna parte (`docs/arquitectura.md` §4.4) | CA-F05, CA-F15 (b)(c), CA-F10 |
| C-17 [1.7m] | Ventana de fechas (`422 DATE_OUT_OF_RANGE`). Reloj a D 12:00. `GET /reports/daily?date=…` con D, D−90, D−91, D+1; `POST /reports/daily/:date/closing` con D−91 y D+1. Repetido a D+1 00:00:00.000 (`Europe/Madrid`) con D−90 (ahora a 91 días) y en un día de cambio de hora. Formato no válido (`2026-02-30`, `20261120`, sin `date`) | D y D−90 → `200`; D−91 y D+1 → `422` con código `DATE_OUT_OF_RANGE`, en lectura y en cierre; el cierre rechazado **no** crea fila en `cash_closings`. A D+1 00:00, D−90 → `422` (la ventana usa `businessDate(clock.now())`). Formato no válido → `400` con `path: ["date"]` (regla general de `docs/arquitectura.md` §5); ninguno crea fila. Los datos de D−91 siguen en la BD (CA-F12, CA-N04) | CA-F06, CA-F12, CA-N04 |
| C-18 [1.7m] | `201` del cierre y forma de la respuesta. Antes de cerrar: `GET /reports/daily?date=D` (D abierto, con cobros, una cancelación autorizada por Marta, una sin autorización y una anulación). Reloj a D 23:10:00.000: Marta envía `POST /reports/daily/D/closing {countedCashCents}` con el efectivo esperado − 150 y, en una segunda ejecución con la BD limpia, + 200. Después: `GET` de D; Pedro cambia de nombre (`PATCH /staff/:id`, HU-07) y se vuelve a leer D. Repetido cerrando D−1 desde D 09:00 | **Abierto:** `status = "open"`, `closing = null`, `afterClosing = null`, `openOrders.count` = pedidos abiertos al consultar. **`201`:** `status = "closed"`, `date` = D, `businessDate` = D; `figures`, `byUser` y `products` = los del `GET` anterior (mismo instante, sin cambios); `closing = {closedAt: instante de D 23:10:00.000 Europe/Madrid, closedBy: {id, name} de Marta, expectedCashCents = figures.cashCents = oráculo, countedCashCents = el enviado, differenceCents = contado − esperado}` (−150 y +200; CA-F04, CA-U02 en la UI: "-1,50 €" con "Falta"); `afterClosing` = `{rows: [], totals: ceros}`; `byUser[].authorizedBy` = `{type: "user", user: Marta}` / `{type: "none"}` / `{type: "not_applicable"}` según la fila. `GET` posterior = cuerpo del `201` salvo `serverTime`; fila de `cash_closings` con los mismos `expected/counted/difference`, `closed_by` y `closed_at` (CA-N03). Tras el cambio de nombre, `byUser`, `closing.closedBy` y `afterClosing.rows` muestran el nombre actual y el resto no cambia. **D−1 cerrado desde D:** `201`; cifras = las del día abierto D−1 (el corte no cambia nada); `closedAt` en D | CA-F04, CA-F05, CA-F13, CA-F14, CA-F03, CA-N03 |
| C-19 [1.7m] | Dos `POST /reports/daily/D/closing` **en paralelo** (Marta con 100,00 € y otro encargado con 90,00 €), 50 repeticiones | Exactamente un `201` y un `409 DAY_ALREADY_CLOSED` (nunca dos `201` ni un `500` por la violación de la PK); la fila de `cash_closings` y el `GET` posterior tienen el `countedCashCents` y el `closedBy` de la petición que recibió el `201`. **[1.7p]** En los logs de `app` capturados durante las 50 repeticiones: ningún `db.query.failed` con `err.code = 23505` (con el cerrojo, el segundo cierre sale en el paso 3 de §4.4 y el `ON CONFLICT DO NOTHING` nunca llega a violar la PK), ningún `http.request.unhandled_error` y ningún `http.request` con `status` ≥ 500 en `/reports/daily/:date/closing`; las dos líneas `http.request` tienen `status` 201 y 409. Complemento unitario (§5.1): el traductor de errores de BD del repositorio de cierres convierte un error con `code = 23505` y `constraint = cash_closings_pkey` en `DayAlreadyClosedError` (→ `409 DAY_ALREADY_CLOSED`) y deja pasar sin traducir un `23505` de otra restricción | CA-F04, CA-N03, CA-F05 |

Además: **E2E** (proyecto en serie, §9.3) del flujo cerrar D → cobrar un pedido
abierto → ver la fila con el nombre, "Sin autorización" y "1 · 9,20 €" en
"Cobros tras el cierre" y las tarjetas sin cambiar → anularlo → verlo en
"Cobros anulados" de la sección. Como en la pila HTTP real el reloj es el del
sistema (§8.1), el E2E usa "hoy" con el cierre guardado al principio del test.
**Visual** (§5.4): día cerrado con las tres columnas de la sección en
375/768/1440 px. **Accesibilidad**: axe sobre la sección (tabla con
`<caption>` y `<th scope="col">`). **Rendimiento** (CA-N02): `dia-500`
cerrado con la sección llena se mide igual que un día abierto (§5.6.1).

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
  E2E con PIN erróneo (HU-01/CA-F05, CA-F06, CA-F11, CA-F12, CA-F13, CA-U03; HU-04/CA-F23;
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
| HU-05/CA-N03 | Con `menu-200` se cumplen **solo** HU-02/CA-N01, CA-U05, CA-F23, CA-N05 y HU-05/CA-F04 (lista cerrada, T-17, I-06) | Arnés + Playwright | Las filas HU-02/CA-N01, CA-F23, CA-U05 y HU-05/CA-F04 de esta tabla con `menu-200`, y HU-02/CA-N05 (no es de rendimiento) en `tablet-h` y `tablet-v` con las 20 categorías y nombres de 30 caracteres: `scrollWidth <= clientWidth` en el documento **y** en todo contenedor, todas las pestañas de categoría dentro del viewport sin desplazamiento horizontal (varias filas, wireframe 03), total y "Enviar a barra" visibles sin desplazar, ≥ 44x44 px |
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

Derivada de HU-01/03/04/05/06/07, ADR-005/007/008 y de los requisitos
verificables **RS-01..RS-46** de `docs/seguridad.md` §7 (RS-44 y RS-45 son de
contenedores, §5.8; RS-46 en §5.2.1), que se citan por su ID
en los tests (§4.3) y sustituyen a los `TX-SEC-nn` previstos. Cada RS tiene al
menos un test; la columna "Verificación" de §7 fija la capa. Excepción: RS-18
dice "I generado desde `permissions.ts`", que contradice el principio 2; Testing
escribe la tabla esperada a mano desde `docs/permisos.md` §3 (T-18).

- **Matriz de autorización completa:** cada endpoint de §5.1 de arquitectura ×
  {sin sesión, camarero, barra, encargado, sesión con PIN provisional} → código
  esperado (`401`/`403`/`2xx`) y **comprobación de que no hubo efecto** (la BD no
  cambia) en los `403`. Tabla esperada escrita a mano en el test. Incluye
  `POST /auth/pin` (solo sesión con PIN provisional; el resto `403 FORBIDDEN`,
  §5.2.1 P-1), `GET /payments/:id` y `/ticket` con la regla del día para el
  camarero (RS-46) y las rutas de ajustes inexistentes (`404`, §5.2.2). Con
  PIN provisional, el resto de rutas → `403 PIN_CHANGE_REQUIRED` (RS-15).
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
  rompen nada. Precios/cantidades/importes no enteros, negativos o fuera del
  rango del campo → `400` con `path` y regla (`quantity` fuera de 1–99,
  `priceCents` fuera de 1–99 999, `tenderedCents` > 10 000 000). Reglas de
  negocio sobre datos válidos → `422` con su código: más de 100 líneas
  `ORDER_TOO_MANY_LINES`, mesa > 20 `TABLE_OUT_OF_RANGE` (I-11), efectivo
  insuficiente `INSUFFICIENT_CASH {missingCents}`, total por encima del máximo
  `PAYMENT_AMOUNT_TOO_HIGH` (ADR-006).
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

### 5.10 Logs: redacción y retención (`docs/logging.md` §4.3, §4.5, §6.6)

**`[TX-LOG-01]` Test unitario de la redacción recursiva (regla (b) de §4.3,
SEC-017).** `tests/unit/api/redaccion-logs.unit.test.ts`. Se construye el
logger de `app` **con su configuración real** (la misma función que usa
`buildApp`), con un destino en memoria, y se registran a propósito objetos con
valores centinela aleatorios. La salida se parsea línea a línea y se busca
cada centinela en el texto **y** en los valores del JSON:

| Caso | Esperado |
|---|---|
| `{confirmPin, a: {b: {c: {userPin}}}, list: [{pin}]}` (caso literal de §4.5) | los tres valores → `"[REDACTED]"` |
| Variantes de nombre: `PIN`, `Pin`, `newPin`, `currentPin`, `pinHash`, `pin_hash`, `provisionalPin`, `managerApproval: {managerId, pin}` | todos redactados; `managerApproval.managerId` puede quedar redactado por la regla (a) (ruta `managerApproval` entera): se acepta |
| Valor no cadena bajo clave `pin`: número `123456`, objeto `{x: 1}`, *array* `[1, 2]`, `null` | la clave queda con `"[REDACTED]"` en todos los casos |
| Profundidad: clave `pin` a 3, 9 y 10 niveles; objeto de 12 niveles | redactada a 3, 9 y 10; lo que pasa de 10 → `"[TRUNCATED]"` y el centinela no aparece |
| Ciclo (`o.self = o`, con `pin` dentro) | no se cuelga ni lanza; `pin` redactado |
| `logger.child({pin})` y nieto `child({x: {pin}})` | redactado en los *bindings* de todas las líneas |
| Error con propiedad `pin` (`Object.assign(new Error('x'), {pin})`), también anidado en `cause` | redactado en el `err` serializado |
| Falsos positivos aceptados: `spinner`, `mapping`, `shipping` | redactados (prueba de que la regla es por nombre, no por lista) |
| Valores con "pin" bajo claves sin "pin": `reason: "bad_pin"`, `reason: "pin_reset"`, `event: "auth.pin.changed"` | **no** se redactan |
| Cookie `__Host-sid`: cabecera `Cookie: __Host-sid=<centinela>`, `Set-Cookie` de la respuesta de login y objeto `{"__Host-sid": centinela}` en primer y segundo nivel, y `req.cookies["__Host-sid"]` | el valor no aparece; queda `"[REDACTED]"` (regla (a), §4.3; SEC-021, encargo de Monitoring 1.6e) |
| Rutas fijas de (a): `customerRef`, `customer_ref`, `note`, `reasonText`, `reason_text`, `body`, `token`, `password`, `pepper` en primer y segundo nivel, y las anidadas reales que añada el Developer (p. ej. `*.lines[*].note`) | redactadas |
| Todas las líneas | JSON válido con los campos obligatorios de §2.1; ningún nombre de clave casa con `/pin/i` con un valor distinto de `"[REDACTED]"` |

El test **falla el build** si algún centinela aparece. Además se ejecuta un
test de mutación dirigido: si se desactiva la función de redacción (b) en una
copia de la configuración, el test debe fallar (prueba de que detecta el
problema y no pasa por casualidad).

**`[TX-LOG-02]` Integración (§4.5 de `docs/logging.md`).** Captura del stdout
de `app` durante una suite que ejecuta: login correcto y fallido, cambio y
restablecimiento de PIN, aprobación de encargado, pedido con nota y
`customerRef`, cancelación con texto, anulación con motivo y el PIN centinela
también como `confirmPin` (anular cobro, alta, restablecimiento, desbloqueo).
Casos de SEC-016 incluidos, con su evento (encargo de Monitoring 1.6e):

| Caso (§5.2.1) | Evento esperado en el log | Métrica |
|---|---|---|
| `confirmPin` con la cuenta en bloqueo temporal → `423` | `auth.verify.locked` (`purpose: "confirm"`, `lock_kind: "temporary"`, `retry_after_s`, `target_user_id`) | `auth_verifications_total{purpose="confirm",result="locked"}` +1 y `{result="invalid"}` **sin cambio** |
| 6.º fallo de aprobación en la misma sesión → `429` | `auth.verify.rate_limited` con `scope: "session"`, `purpose: "approval"`, `session_id`, `retry_after_s` | `{result="rate_limited_session"}` +1 |
| `POST /auth/pin` sin PIN provisional → `403` | `auth.pin.change_failed` con `reason: "not_provisional"` | `auth_pin_change_rejected_total{reason="not_provisional"}` +1; sin muestra en `auth_verifications_total` |
| 20.º fallo → bloqueo indefinido | `auth.sessions.revoked` (`reason: "account_locked_manual"`, `sessions_revoked`, `sse_closed`, `from_own_session`) | `auth_sessions_revoked_on_lock_total` + número de sesiones |

En todas las líneas: ni el PIN centinela, ni el *pepper* de prueba, ni el
valor de `__Host-sid`, ni nombres de usuario, ni textos de notas o motivos.
Mismo barrido sobre los logs de `proxy` y `db` en TESTING. Las métricas se
leen de `/metrics` (puerto 9464, red interna del ejecutor) antes y después de
cada caso, comparando el incremento.

**`[TX-MON-01]` Retención de Loki en DEMO (`docs/logging.md` §6.6;
`docs/infraestructura.md` §11.3; T-22) [1.7i].** Antes de la puerta de la
Etapa 4 se comprueba que el compactor **borra** de verdad, no solo que la
consulta sale vacía. DEMO dura de 3 a 5 días laborables y no se alarga para
esta prueba: Loki de DEMO usa `retention_period: 24h` (misma imagen y mismo
`compactor` que PROD).
0. **T0** = despliegue de DEMO (smoke de Testing, con tráfico real desde el
   principio). En T0 Testing anota la hora y el recuento inicial de *chunks*
   del volumen de Loki, sin root:
   `podman unshare find "$(podman volume inspect <volumen de loki> --format '{{.Mountpoint}}')/chunks" -type f | wc -l`
   (o el tamaño con `du -s`). **TX-MON-01 no se ejecuta antes de T0 + 30 h**
   (24 h de retención + hasta 2 h de `max_chunk_age` + 2 h de
   `retention_delete_delay` + ciclos de compactación y margen); si se
   ejecutara antes, el resultado no vale y se repite.
1. **Configuración desplegada** (se lee del contenedor de Loki en marcha, no
   del repositorio): `compactor.retention_enabled: true`,
   `retention_delete_delay: 2h`, `limits_config.retention_period: 24h`,
   **sin** `retention_stream` y **sin** `max_query_lookback` ni otro límite de
   consulta que oculte datos antiguos (si lo hubiera, una consulta vacía no
   demostraría nada).
2. **Evidencia 1, métrica del compactor:** la de última ejecución correcta de
   la retención (`loki_compactor_apply_retention_last_successful_run_timestamp_seconds`
   o la equivalente de la versión desplegada) es posterior a T0 + 24 h + 2 h
   (`max_chunk_age`) + 2 h (`retention_delete_delay`).
3. **Evidencia 2, *chunks* eliminados del volumen:** el recuento (o tamaño)
   de *chunks* tomado con el mismo comando antes y después de esa ejecución
   del compactor baja, y una consulta LogQL `{service="app"}` sobre las
   primeras horas tras T0 (ya vencidas) devuelve 0 líneas.
4. **Evidencia 3, consulta de control con datos:** la misma consulta sobre
   las últimas 2 h devuelve líneas (prueba de que Loki recibe y responde, y de
   que el 0 del punto 3 no es por falta de datos).
Pasa solo si se cumplen las tres evidencias y el punto 1. **PROD:** no se
espera al vencimiento; en el smoke de la Etapa 5 solo se comprueba la
configuración desplegada (`retention_period: 720h`, `retention_stream` de
`2160h` para `category="security"`, compactor con `retention_enabled: true`
y sin `max_query_lookback`) y la retención de Prometheus.

## 6. Qué se ejecuta en cada etapa

| Etapa | Qué hace Testing | Suites |
|---|---|---|
| **1 Planificación** | Esta estrategia; revisión de verificabilidad de criterios (hallazgos en `docs/estado.md`); cuando exista `compose.dev.yaml`, primera ejecución de `TX-CONT-01` sobre DEV | `containers` |
| **2 Desarrollo** (por historia) | **Antes** de que el Developer empiece: tests de la historia (unitarios de reglas, integración, E2E, a11y, capturas) en rojo, revisados contra los criterios. Después, en cada entrega: | `unit` + `integration` + `e2e` de la historia **+ regresión completa de las historias anteriores** + `security` (matriz de autorización) + `containers` + `a11y` de las pantallas tocadas + capturas para UX |
| **3 Testing** | Verificación completa sin asumir nada: todas las suites, rendimiento en las condiciones del supuesto 12 (§5.6.1), ZAP, regresión visual, mutación (`shared`), exploratorio con guiones (red, multidispositivo, sonido, reloj), revisión manual de lectores de pantalla, alertas de HU-01/CA-N05 con la pila de Monitoring. **Con el hardware de referencia** (si el cliente lo ha entregado, pregunta 7): HU-03/CA-U01 (medición física), CA-F09 y CA-F14 (sonido audible) y CA-N05 (pantalla encendida, §8.6), HU-02/CA-U05 en la tablet de referencia (§5.6.3). Entrega al PO la matriz con el resultado por criterio; el de los criterios de rendimiento es el de TESTING y es definitivo (I-08) | todas |
| **4 Demo** | Smoke en DEMO; **observación** de los tiempos con dispositivos y Wi-Fi reales (§5.6.2: una desviación es un hallazgo, no bloquea por sí sola); verificación manual de sonido, pantalla encendida y legibilidad en la pantalla real de barra (HU-03/CA-U01, CA-F09, CA-F14, CA-N05: estos sí son vinculantes, I-08); RS-06 con dos dispositivos reales; retención de Loki (`TX-MON-01`, §5.10, no antes de T0 + 30 h); apoyo a la prueba de usabilidad (UX) | `smoke`, `performance/realtime`, `TX-MON-01`, manual |
| **5 Producción** | Tras `terraform apply` aprobado y despliegue: smoke de PROD (no destructivo), `TX-CONT-01` y configuración de retención de Loki/Prometheus desplegada (§5.10, punto 1 de `TX-MON-01`) | `smoke`, `containers` |

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

**Ajustes de la 2.2b (D-2.2-01..03, SEC-044).** Vitest **4.1.12** exacto con
`--configLoader runner` (sigue haciendo falta: sin él escribe en
`tests/node_modules/.vite-temp`, montado `ro`); Playwright se lanza con
`node tests/node_modules/@playwright/test/cli.js` (sin `npx`, el ejecutor no
tiene red) y 3 *workers* por defecto (`E2E_WORKERS`); `PLAYWRIGHT_IMAGE` y
`TOXIPROXY_IMAGE` tienen un digest verificado por defecto en `run.sh`; las
suites `unit`, `integration`, `security`, `e2e`, `a11y` y `visual` aceptan un
filtro (`sh tests/run.sh integration integration/api/HU-01-login`) y cada parte
de e2e (normales, `serie-pin`, `serie-red`) escribe en sus propios
artefactos, JUnit e informe HTML.

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
  pedidos.
- **Casos de la preferencia de sonido (HU-03/CA-F09, T-15 resuelto):** en un
  mismo `BrowserContext` (= dispositivo; su `localStorage` persiste entre
  páginas): (1) primera apertura de la cola en un contexto nuevo → sonido
  **activado** (espía: `play()` llamado con el primer pedido); (2) desactivar
  → recargar (`page.reload()`) → sigue desactivado, ningún `play()` al llegar
  2 pedidos y **no** aparece "Sonido bloqueado" (combinación con CA-F14);
  (3) desactivar → cerrar sesión → entrar con el **mismo** usuario →
  desactivado; (4) igual entrando con **otro** usuario de barra → desactivado;
  (5) volver a activar → recargar → activado (y, con la política real, aparece
  "Sonido bloqueado" porque no hubo gesto, CA-F14); (6) otro contexto
  (otro dispositivo) → activado, independiente del primero; (7) la caducidad
  de la sesión (12 h, HU-01/CA-N06) y la revocación no borran la preferencia.
  La preferencia no viaja al servidor: se comprueba que ninguna petición la
  envía (es del dispositivo, no del usuario).
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
  1. Anotar modelo, sistema, navegador y el **tiempo de apagado y de bloqueo
     de pantalla del sistema**. Para la prueba se ponen en su **valor mínimo
     distinto de "nunca"** (T-16 resuelto, HU-03/CA-N05). Si el dispositivo
     no tiene ese ajuste, se usa el de fábrica y se anota en el resultado. No
     se repite con el valor que quede configurado en el local (lo decide el
     PO: el mínimo es el caso más exigente). Antes de empezar se comprueba,
     sin la app abierta (pantalla con una página estática), que con ese valor
     la pantalla **sí** se apaga: si no se apaga, el ajuste no está aplicado y
     la prueba no vale.
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
  se prueba con exactamente las mesas 1..20: la 0 y la 21 no se ofrecen en la
  rejilla; la API rechaza la 21 (y hasta la 99) con `422 TABLE_OUT_OF_RANGE` y
  la 0 con `400` de validación (I-11, pendiente de T-19; corregido en la 1.6d:
  antes decía `400` para las dos). HU-03/CA-F06 con N = 10 (§8.1). No hay
  endpoint para cambiarlos y Testing no pide ninguno; los rangos de arranque
  se prueban en §5.2.2.

## 9. Datos de prueba y aislamiento

### 9.1 Conjuntos
| Conjunto | Contenido | Uso |
|---|---|---|
| `base` | 2 encargados (PIN de 6 dígitos), 2 camareros, 1 barra, 1 desactivado, 1 encargado con PIN provisional, 1 usuario con bloqueo indefinido; 3 categorías, ~12 productos con precios que exponen errores de coma flotante (0,10 · 1,10 · 2,20 · 999,99), 1 agotado, 1 desactivado; 20 mesas | Integración, E2E |
| `un-encargado` | Como `base` con un solo encargado activo | HU-06/CA-F12, HU-07/CA-F05 |
| `menu-200` | 200 productos en 20 categorías | HU-05/CA-N03, rendimiento |
| `dia-500` | 500 pedidos de un día con cobros en efectivo y tarjeta, cancelaciones con y sin autorización de 3 usuarios y 2 encargados, anulaciones y pedidos abiertos; **[1.7i]** variante cerrada: cierre guardado a media tarde y, después, cobros tras el cierre (de pedidos del día y del día anterior, alguno anulado y recobrado), anulaciones de cobros previos y cancelaciones; totales, desglose por usuario, cifras del cierre y sección "Cambios tras el cierre" esperados precalculados de forma independiente | HU-08 (CA-F05, CA-F07, CA-F13, CA-F14, CA-F15, rendimiento) |
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
- Una BD plantilla migrada por ejecución (`migrate-template` sobre
  `app_template`, después de `migrate` y con su código de salida comprobado en
  `tests/run.sh`); cada archivo de test obtiene `CREATE DATABASE t_f_<x>
  TEMPLATE app_template` con el rol `test_admin` (`tests/support/bd-fichero.ts`,
  `setupFiles`) y la app en proceso y los constructores de datos se conectan a
  ella con `app_rw`. Los casos que necesitan una BD sin usuarios (RS-09) crean
  además la suya por test (`montarApp({ bdAislada: true })`). Sin estado
  compartido entre archivos ni con `cafeteria`.
- Cierre: pools de `app_rw` → `app.close()` → `DROP DATABASE … WITH (FORCE)`.
  `test_admin` no puede terminar conexiones de `app_rw` (sin
  `pg_signal_backend`, a propósito): un `DROP` que falla señala una conexión
  sin cerrar.
- **Los ficheros van en serie** (`fileParallelism: false`): el límite de 20
  conexiones de `app_rw` es compartido por `app`, la app en proceso (`poolMax`
  4), los constructores (`max` 2) y los comandos (`poolMax` 4); `test_admin`
  tiene 4. Activar paralelo exige recalcularlo con Infrastructure (no se sube
  el límite sin Cybersecurity, `docs/infraestructura.md` §9.1).
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

## 10. Matriz de trazabilidad (IDs estables, 2026-11-24)

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
| CA-F06 | Bloqueo progresivo 5/15/60 min e indefinido a los 20 fallos; tiempo restante; mensaje de desbloqueo; reinicio solo por acceso correcto, desbloqueo o restablecimiento (I-01, I-03 confirmadas) | U, I, E (RS-03, RS-09b) | 2026-11-23 |
| CA-F07 | Desactivado con PIN correcto → "Usuario desactivado…" | I, E | 2026-11-23 |
| CA-F08 | Cerrar sesión: vuelve al inicio y la sesión deja de valer | I, E, S (RS-14) | 2026-11-23 |
| CA-F09 | Inactividad 15 min para camarero y encargado (también con la cola abierta); barra con la cola no caduca por inactividad | U, I, E (RS-12) | 2026-11-23 |
| CA-F10 | Pedido creado o cobrado registra el usuario | I | 2026-11-23 |
| CA-F11 | 10 fallos en 10 min desde un dispositivo → `429` 10 min con "Espera X min"; cuentan login, autorizaciones, reconfirmaciones y cambio de PIN (I-02, I-03, I-10 confirmadas) | U, I, E (RS-05, RS-06) | 2026-11-23 |
| CA-F12 | Bloqueo temporal con sesión abierta: la sesión sigue; el fallo que bloquea da el mensaje normal; reconfirmación y `currentPin` → `423` "Cuenta bloqueada. Espera X min" sin comprobar ni contar, datos conservados; al expirar se puede reintentar (§5.2.1) ⚠ I-12, T-20 | U, I (FakeClock, métricas), E | 2026-11-23 |
| CA-F13 | Bloqueo indefinido: todas las sesiones de la cuenta revocadas (`401`, SSE cerrado ≤ 1 s), lo escrito se pierde, al entrar "Pide al encargado…"; por login, aprobación, reconfirmación o cambio de PIN (§5.2.1) ⚠ partes (1) y (2) a confirmar por Cybersecurity | U, I (FakeClock), R, E (RS-14) | 2026-11-23 |
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

#### Ficheros de HU-01 (tarea 2.1, 2026-11-24)

Escritos antes de la implementación contra el contrato de `tests/README.md`
(fallan hasta que exista el código), ajustados en la 2.1e al contrato de la
arquitectura (§2.1, §5, §7, §10.1). `sh tests/run.sh trazabilidad`: 23/23.

| Fichero (`tests/…`) | Capa | Criterios |
|---|---|---|
| `unit/shared/pin-reglas.unit.test.ts` | U | CA-N01 (RS-01, RS-02) |
| `unit/shared/permisos.unit.test.ts` | U | CA-F01, CA-F02, CA-F03, CA-N02 (RS-18, T-18) |
| `unit/shared/bloqueo.unit.test.ts` | U | CA-F06 (RS-03, I-01) |
| `unit/shared/minutos-restantes.unit.test.ts` | U | CA-F06, CA-F11, CA-F12 (I-03) |
| `unit/api/config.unit.test.ts` (2.1e, 2.2b) | U | CA-N06 (RS-13: `SESSION_MAX_HOURS` 1–12, por defecto 12; resto de variables de §10.1); `TRUSTED_PROXIES` (SEC-029) con los casos de SEC-045: `" "`, espacio final, `[::1]`, `::/119`, `::ffff:10.0.0.0/104` y `::ffff:10.89.240.0/120` aceptado |
| `unit/web/pin-mensajes.unit.test.ts` (2.1e) | U | CA-N01 (tabla `PinRule` → texto total, con `digits_only` y regla desconocida; import pendiente de T-42) |
| `integration/api/HU-01-login.int.test.ts` | I | CA-F01..F03 (`/auth/me`, permisos y `localConfig`), CA-F05 (RS-07), CA-F07, CA-F08 (RS-10, RS-11, RS-14), CA-N01 (RS-08, RS-31), CA-U01 (rejilla), RS-24 |
| `integration/api/HU-01-bloqueo.int.test.ts` | I (FakeClock) | CA-F06 (25 intentos, RS-03), CA-N05 (eventos y métricas, RS-30, RS-47) |
| `integration/api/HU-01-dispositivo.int.test.ts` | I (FakeClock, `remoteAddress`) | CA-F11 (RS-05, RS-06, I-02), CA-N05 |
| `integration/api/HU-01-verify-pin.int.test.ts` | I (FakeClock, SSE) | CA-F12 y CA-F13 por `currentPin` y por login (P-1..P-8 de §5.2.1), RS-14, RS-15, RS-16b; HU-07/CA-F04 |
| `integration/api/HU-01-sesion.int.test.ts` | I (FakeClock, SSE) | CA-F09 (RS-12; límite exacto 15 min 0 s sin tolerancia, escritura de `last_activity_at` en cada petición, cierre y reconexión de la barra), CA-N06 (RS-13; 12 h 0 min exactas, `sessionMaxHours`), CA-F08 (motivo del `401`) |
| `integration/realtime/HU-01-revocacion.int.test.ts` | R | CA-F08 (RS-14) |
| `integration/api/HU-01-encargado-inicial.int.test.ts` | I (BD aislada) | Encargado inicial (RS-09), CA-F06 con `unlock-user` (RS-09b) |
| `integration/api/HU-01-logs.int.test.ts` | I | CA-N01 (RS-29, TX-LOG-02 parcial), RS-30 |
| `integration/api/HU-01-concurrencia.int.test.ts` (2.2b) | I (BD por fichero, ráfagas con `Promise.all`, hasher espía) | CA-F11, CA-F06, CA-F13 (RS-05b, SEC-038). **4 tests que fallan a propósito hasta la tarea 2.5** (`tests/README.md`) |
| `integration/api/HU-01-dispositivo.int.test.ts` (2.2b, SEC-029) | I | + `buildApp` con `trustedProxies` inválido (`['uniquelocal']`, `loopback`, `true`, CIDR cortos, espacios, 5 elementos) → `ConfigError('trustedProxies')`; válidos arrancan |
| `security/estatico.sec.test.ts` + `support/estatico.ts` (2.2b) | S (estático, sin BD) | CA-F06 (RS-16c), CA-F01 (RS-25), CA-F05 (RS-35); con fragmentos sintéticos que demuestran que cada detector detecta el defecto |
| `e2e/HU-01-csp.e2e.ts` + `support/e2e/base.ts` (2.2b) | E | CA-F01 (RS-26 E): la CSP llega; sin violaciones en el recorrido; el vigilante detecta una violación provocada. Todos los `*.e2e.ts` usan el `test` de `base.ts` (falla con cualquier violación) |
| `e2e/HU-01-sec032-retraso.e2e.ts` (2.2b) | E | CA-F09, CA-F08 (SEC-032: respuesta del latido y reconexión SSE retrasadas 3 s con login nuevo en medio) |
| `integration/api/HU-01-autoria.int.test.ts` | I | CA-F10 (se ejecuta al entrar HU-02 y HU-04 en el alcance) |
| `security/matriz-autorizacion.sec.test.ts` | S | CA-F04, CA-N02 (RS-15, RS-17, RS-18; filas de HU-02..HU-08 según alcance) |
| `e2e/HU-01-iniciar-sesion.e2e.ts` | E | CA-F01..F04 ("Acceso denegado" con textos, foco, título y enlace; pantallas vacías; `403 FORBIDDEN` de la API, activo con HU-02), CA-F06, CA-F07, CA-F08 (sin banner tras logout), CA-F09 (banner por `reason: idle` al recargar), CA-F11 (presentación del `429`), CA-N01, CA-N06, CA-U01, CA-U04 |
| `e2e/HU-01-errores.pin.e2e.ts` | E (serie, 4 fallos reales) | CA-F05, CA-U03, CA-F12 (T-30: "No se ha cambiado el PIN.", teclado deshabilitado), CA-F13 (cola de barra → login en ≤ 1 s, banner) |
| `e2e/HU-01-reconexion.red.e2e.ts` (2.1e) | E (serie `serie-red`, Toxiproxy) | CA-F09 (barra que se reconecta tras un corte de 3 s sigue dentro) |
| `e2e/HU-01-teclado.dispositivo.e2e.ts` | E (6 dispositivos) | CA-U02, CA-U04, CA-N04 (objetivos) |
| `a11y/HU-01-login.a11y.ts` | A | CA-N04, CA-U03, CA-U04 |
| `visual/HU-01-login.visual.ts` | V | Capturas `tests/screenshots/HU-01/` (375/768/1024/1440/1920) |
| `performance/k6/HU-01-login.js` + `performance/HU-01.semilla.ts` | P | CA-N03 (control rápido en Etapa 2; vinculante en Etapa 3) |
| `integration/realtime/HU-01-sse-limites.int.test.ts` (2.8a) | R (FakeClock, SSE real) | CA-F09 (RS-12; **SEC-039**: el flujo del camarero/encargado inactivo ≥ 15 min se cierra en el siguiente `ping` sin petición REST, con actividad a los 10 min sigue abierto, la pasiva no cuenta, `401 idle` lo cierra en ≤ 1 s, la barra queda exenta), RS-23 (**SEC-040**: 50 flujos, el 51.º de otra sesión `503` con `Retry-After: 5` y `no-store`, el 3.º de la misma sesión sustituye al más antiguo, el hueco se libera). Regresión: pasa |
| `integration/api/HU-01-no-store.int.test.ts` (2.8a) | I | RS-27 (**SEC-041**): `Cache-Control: no-store` exacto en 200, 204, 400, 401, 403, 404, 423, 429 y en los 401/404 de rutas inexistentes; el SSE conserva `no-cache, no-transform`. Regresión: pasa |
| `integration/api/HU-01-nombre-control.int.test.ts` (2.8a) | I | CA-F05 (**SEC-042**): `\u0000`, `\u0007`, `\n`, tabulador, ESC, `\u007f` en `name` → `400` con `[{ path: ['name'], rule: 'format' }]`, sin repetir el valor, sin hash, sin logs `error`; no cuenta como fallo de IP; los nombres normales siguen valiendo. Regresión: pasa |
| `integration/api/HU-01-concurrencia-nombres.int.test.ts` (2.8a) | I (BD por fichero, ráfagas, hasher espía con `maxSimultaneas`) | CA-F06, CA-F13 (RS-05b, **SEC-047**): 16 variantes `i`/`İ` (y con sigma final `σ`/`Σ`) en paralelo ≤ 5 verificaciones; contador ≤ 20 con 19 fallos; login y `POST /auth/pin` de la misma cuenta nunca verifican a la vez. **4 tests que fallan a propósito hasta la 2.8b** (`tests/README.md`) |
| `a11y/HU-01-login.a11y.ts` (2.8a) | A | + CA-N04 / H-2.3-04 (**D-2.5-01**): etiqueta accesible distinta en cada paso del cambio de PIN, para encargado y camarero. **2 tests que fallan a propósito hasta la 2.8b** |
| `e2e/HU-01-estados-carga.e2e.ts` (2.8a) | E (Chromium + WebKit, 1280 y 375 px) | H-2.3-07, H-2.6-02: esqueleto de 4 tarjetas del tamaño de una tarjeta real mientras carga la rejilla (`design-system.md` §5.12). **4 ejecuciones (2 tests × 2 navegadores) fallan a propósito hasta la 2.8b** |
| `e2e/HU-01-barra-superior-375.e2e.ts` (2.8a) | E (Chromium + WebKit, 375 px) | H-2.6-01: barra del encargado de la misma altura en las 5 pantallas y `h1` en 1 línea. **Falla a propósito hasta la 2.8b** (×2 navegadores) |
| `e2e/HU-01-barra-superior-375.e2e.ts` (2.13b, sustituye al de la 2.8a) | E (Chromium + WebKit; 375, 320, 768 y 1280 px; encargado, camarero y barra; 12 tests × 2 navegadores) | H-2.6-01 y **H-2.8c-01**: contrato de `design-system.md` §5.11.1 en 7 puntos (nombre accesible = título completo, texto visible = título corto sin «…», `scrollWidth <= clientWidth`, 1 línea, barra de 113 px a ≤ 767 px y 65 px a ≥ 768 px igual en todas las pantallas del rol, `span.sr-only` real de 1 × 1 px y título completo visible a ≥ 768 px, `<title>`), para «Resumen del día» (visible «Resumen») y «Acceso denegado» (visible «Acceso»). `BarraSuperior.titulo()` y `AccesoDenegado.titulo()` localizan por nombre accesible exacto. **Fallan a propósito hasta la 2.13c los 6 tests de 375 y 320 px (×2 navegadores = 12 ejecuciones)**; los 6 de 768 y 1280 px pasan |
| `e2e/HU-01-caducidad-carrera.e2e.ts` (2.8a) | E (Chromium + WebKit) | CA-N06 (**T-46**): el banner de caducidad no se pierde si el `401` del flujo SSE llega antes que `GET /auth/me`. Reproduce de forma determinista el fallo intermitente de `HU-01-iniciar-sesion.e2e.ts` › CA-N06. **Falla a propósito hasta la 2.8b** (WebKit 10 de 10, Chromium 1 de 10) |

Pendiente por dependencia (no se puede verificar solo con HU-01):
- **CA-F10**: necesita `POST /orders` (HU-02) y `POST /payments` (HU-04).
- **CA-F12 (c)** con `confirmPin` (anular cobro, Personal) y **CA-F13** con
  `confirmPin` y `managerApproval`: se añaden en los ficheros de HU-04, HU-06 y
  HU-07. En HU-01 se cubren con `currentPin` y con el login.
- **CA-F04 por API**: ninguna ruta de HU-01 está restringida por rol (salvo
  `POST /auth/pin` sin PIN provisional); las filas de la matriz de las demás
  historias se activan al entrar en el alcance. En HU-01 se verifica por URL
  (E2E) y con RS-17.
- **CA-N05 (alerta)** y **CA-N04 (lector de pantalla)**: manuales registrados
  en `tests/tools/manuales.json` (Etapa 3).

### HU-02 Tomar un pedido
| ID | Criterio (resumen) | Tipos | Rev. |
|---|---|---|---|
| CA-F01 | Tipo Mesa (1..20, fijo en la instalación, supuesto 20) o Mostrador (referencia ≤ 30); mesa 21 → `422 TABLE_OUT_OF_RANGE`, mesa 0 → `400` (§5.2.2) ⚠ I-11, T-19 | U, I, E | 2026-11-23 |
| CA-F02 | Tocar producto añade 1; tocar otra vez suma | U, E | 2026-11-23 |
| CA-F03 | "+"/"−"; a 0 la línea se elimina | U, E | 2026-11-23 |
| CA-F04 | Nota ≤ 100 en la línea y visible en barra | I, R, E | 2026-11-23 |
| CA-F05 | Total con IVA, 2 decimales y € | U, E | 2026-11-23 |
| CA-F06 | No disponible: deshabilitado y no se añade (tampoco por API) | I, E, S | 2026-11-23 |
| CA-F07 | Enviar → Pendiente + Abierto, número del día, en la cola | U, I, R, E | 2026-11-23 |
| CA-F12 | Números 1, 2, 3… sin huecos ni repeticiones con envíos simultáneos; cancelados conservan número | I (concurrencia, 50 envíos) | 2026-11-23 |
| CA-F13 | Día `Europe/Madrid`: 23:59:59 sigue el día; 00:00:00 reinicia a 1 | U, I (FakeClock), TX-TZ-01 | 2026-11-23 |
| CA-F14 | Conserva número y fecha si se modifica o cobra al día siguiente | I (FakeClock) | 2026-11-23 |
| CA-F08 | Sin líneas: "Enviar a barra" deshabilitado (API → `400` de validación con `path: ["lines"]`); más de 100 líneas → `422 ORDER_TOO_MANY_LINES` | I, E | 2026-11-23 |
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
| CA-F09 | Aviso sonoro con cada pedido nuevo, desactivable; la preferencia se guarda en el dispositivo (recarga, nuevo inicio de sesión del mismo u otro usuario); activado la primera vez (§8.5) | U, E (espía, §8.5), M (audible, H) | 2026-11-23 |
| CA-F14 | Sonido bloqueado: aviso en texto en ≤ 1 s, sin tapar pedidos, botón ≥ 60x60, visible hasta reactivar; el siguiente suena; no aparece si se desactivó | E (política real + bloqueo simulado, §8.5), M (H) | 2026-11-23 |
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
| CA-N05 | La pantalla no se apaga ni bloquea en ≥ 30 min sin tocarla, con el apagado automático en su valor mínimo distinto de "nunca" (o el de fábrica, anotado) | M (H, protocolo §8.6); E (espía, solo indicio) | 2026-11-23 |

### HU-04 Cobrar y cerrar un pedido
| ID | Criterio (resumen) | Tipos | Rev. |
|---|---|---|---|
| CA-F01 | "Cobrar" con cobro Abierto y cualquier preparación: detalle y total | I, E | 2026-11-23 |
| CA-F02 | Cobrado/Cancelado: sin "Cobrar"; el servidor rechaza (`409 ALREADY_PAID` / `409 ORDER_CANCELLED`) | I, E, S | 2026-11-23 |
| CA-F03 | Efectivo ≥ total: cambio = entregado − total, 2 decimales | U, I, E | 2026-11-23 |
| CA-F04 | Efectivo < total: no confirma; "Importe insuficiente: faltan X,XX €" (API `422 INSUFFICIENT_CASH {missingCents}`) | U, I, E | 2026-11-23 |
| CA-F05 | Tarjeta registrada a mano | I, E | 2026-11-23 |
| CA-F06 | Cobrado: guarda fecha, método, importe y usuario; sale de por cobrar | I, E | 2026-11-23 |
| CA-F07 | Cobrar no cambia la preparación; sigue en la cola | I, R, E | 2026-11-23 |
| CA-F18 | Cobrado no Servido: sigue en "Pedidos" con "COBRADO" hasta Servido o fin del día; cobrar no marca Servido | I (FakeClock), E | 2026-11-23 |
| CA-F08 | Cobrado: no se modifican líneas ni importe ni se cancela | I, S | 2026-11-23 |
| CA-F09 | "Cobrar mesa": un cobro con un total para todos los abiertos | I, E | 2026-11-23 |
| CA-F10 | "Ver ticket" en pantalla | I, E, V | 2026-11-23 |
| CA-F19 | "Cobrados hoy" en 1 toque: cobros del día, más reciente primero, campos y "ANULADO"; el camarero no lee cobros de otro día por id (`404`, RS-46, §5.2.1) | I (FakeClock), E, S (RS-46) | 2026-11-23 |
| CA-F20 | "Ver ticket" desde "Cobrados hoy" | E | 2026-11-23 |
| CA-F21 | "Anular cobro" solo para el encargado; camarero no lo ve y 403 | E, S | 2026-11-23 |
| CA-F22 | Barra sin acceso a "Cobrados hoy" (403) | S | 2026-11-23 |
| CA-F11 | Motivo < 5 caracteres: no confirma y mensaje | U, I, E | 2026-11-23 |
| CA-F12 | Anular afecta al cobro completo; los pedidos vuelven a Abierto | I, E | 2026-11-23 |
| CA-F13 | No se anula un solo pedido de "Cobrar mesa" | I | 2026-11-23 |
| CA-F14 | Anular no cambia la preparación | I | 2026-11-23 |
| CA-F15 | Cobro anulado se conserva con sus datos y cuenta en el día original | I | 2026-11-23 |
| CA-F16 | Pedido reabierto: modificable, cancelable y cobrable; el nuevo cobro cuenta en su día | I (FakeClock), E | 2026-11-23 |
| CA-F17 | Un cobro anulado no se anula otra vez (`409 PAYMENT_ALREADY_VOIDED`) | I | 2026-11-23 |
| CA-F23 | Anular exige el PIN del encargado; incorrecto: `403 PIN_CONFIRMATION_INVALID`, no anula, "PIN incorrecto", motivo conservado, cuenta para su bloqueo (I-10); bloqueo temporal → HU-01/CA-F12, indefinido → HU-01/CA-F13 ⚠ I-12, T-20 | I, E, S (RS-16) | 2026-11-23 |
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
| CA-F08 | Borrar categoría con activos: no permite, dice cuántos (`409 CATEGORY_HAS_ACTIVE_PRODUCTS {count}`) | I, E | 2026-11-23 |
| CA-F09 | Reordenar se refleja en la toma | I, E | 2026-11-23 |
| CA-U01 | 1 formulario, ≤ 4 campos obligatorios | E | 2026-11-23 |
| CA-U02 | Agotado en ≤ 2 toques desde la toma | E (contador) | 2026-11-23 |
| CA-U03 | Errores con campo y cómo corregir | E, A | 2026-11-23 |
| CA-N01 | Solo el encargado gestiona; agotado también el camarero; en el servidor | S | 2026-11-23 |
| CA-N02 | Auditoría de cambios de precio | I | 2026-11-23 |
| CA-N03 | Con 200 productos / 20 categorías se cumplen, y solo se exigen (lista cerrada), HU-02/CA-N01, CA-U05, CA-F23, CA-N05 y HU-05/CA-F04 (I-06 corregida) | P, E (HU-02/CA-N05 con `tablet-h`/`tablet-v`), D | 2026-11-23 |
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
| CA-F04 | Restablecer PIN: el anterior deja de valer, contador a 0, cambio obligatorio (`POST /auth/pin`: P-1..P-8 de §5.2.1) | I, E (RS-09b, RS-15) | 2026-11-23 |
| CA-F05 | El único encargado activo no se desactiva ni pierde el rol (`409 LAST_MANAGER`) | I, E (RS-22) | 2026-11-23 |
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
| CA-N04 | Reconfirmación del PIN en las escrituras (salvo cambiar solo el nombre); fallo: sin efecto, datos conservados, cuenta para su bloqueo (I-10); bloqueo temporal → HU-01/CA-F12, indefinido → HU-01/CA-F13 ⚠ I-12, T-20 | I, E, S (RS-16) | 2026-11-23 |

### HU-08 Resumen de ventas del día
| ID | Criterio (resumen) | Tipos | Rev. |
|---|---|---|---|
| CA-F01 | Cifras de la fecha seleccionada (por defecto hoy) | I, E | 2026-11-23 |
| CA-F08 | El cobro cuenta en el día del cobro (23:50 → 00:05), también con el día del pedido ya cerrado (§5.2.3, C-06, C-07) | U, I (FakeClock) | 2026-11-24 |
| CA-F09 | Cobro anulado: no suma; cuenta en "cobros anulados" del día original | I | 2026-11-23 |
| CA-F10 | Recobrado: solo el cobro vigente suma, en su día | I (FakeClock) | 2026-11-23 |
| CA-F11 | Cancelado: cuenta en el día en que se canceló | I (FakeClock) | 2026-11-23 |
| CA-F13 | Cancelaciones y anulaciones por usuario y autorizador, nombres en texto; anulaciones con "No aplica (encargado)"; en día cerrado, las del cierre guardado y lo posterior en la sección aparte (§5.2.3, C-04, C-10, C-12, C-14) | I (`dia-500`, FakeClock), E | 2026-11-24 |
| CA-F14 | La suma del desglose coincide con los totales; en día cerrado, con los del cierre guardado aunque haya cambios posteriores (§5.2.3, C-14) | I (`dia-500`, FakeClock) | 2026-11-24 |
| CA-F02 | Productos vendidos por importe descendente | I, E | 2026-11-23 |
| CA-F03 | "Hay N pedidos sin cobrar" con acceso a la lista; también en día cerrado se calcula al consultar y no es cifra guardada: baja con un cobro tras el cierre y sube si se anula (§5.2.3, C-02, C-04, C-10, C-18; I-15) | I, E | 2026-11-24 |
| CA-F04 | Efectivo contado → diferencia; guardar el cierre (`201` con `closing` y diferencia positiva y negativa; un solo cierre con dos en paralelo; §5.2.3, C-18, C-19) | U, I, E | 2026-11-24 |
| CA-F05 | Día cerrado: cifras del cierre (S0), incluidos los productos, que una anulación posterior no resta; anulados y cancelados posteriores (cancelados ese día, sea cual sea el día del pedido) en "Cambios tras el cierre" con usuario y autorizador; frontera: antes = hora anterior al cierre, después = igual o posterior; cada cosa en un solo sitio; remite a CA-F15 para los cobros (§5.2.3, C-01, C-08..C-10, C-12, C-13, C-15, C-16, C-18; I-13, I-16) | I (FakeClock), E, V, A | 2026-11-24 |
| CA-F15 | Cobro tras el cierre del mismo día: cuenta en ese día, no cambia cifras, efectivo esperado, diferencia, desglose ni productos; "Cobros tras el cierre" con el usuario y "Sin autorización"; anulado → "Cobros anulados" de la sección; pedido de D cobrado en D+1 cuenta en D+1 y no en la sección de D; pedido de D−1 cobrado en D tras el cierre sí aparece en la de D; "después" incluye el mismo instante del cierre; anulado → fila del encargado que anuló con "No aplica (encargado)", en la sección del día del cobro original (§5.2.3, C-02..C-09, C-11, C-16; I-13, I-14, I-15) | I (FakeClock), E, V, A, P (`dia-500`) | 2026-11-24 |
| CA-F06 | Consultable cualquier día entre hoy y 90 días atrás (API: hoy y hoy − 90 → `200`; §5.2.3, C-17) | I (FakeClock), E | 2026-11-24 |
| CA-F12 | Más de 90 días: no seleccionable (los datos siguen en BD); la API lo respalda con `422 DATE_OUT_OF_RANGE` en lectura y cierre, también para fechas futuras (§5.2.3, C-17) | I (FakeClock), E | 2026-11-24 |
| CA-F07 | Totales al céntimo con los cobros vigentes; en día cerrado, cifras guardadas = cobros con hora anterior a la del cierre vigentes al guardarlo, y los de la hora del cierre o posteriores se comprueban en la sección (§5.2.3, C-08, C-09, C-13; I-13) | I (`dia-500`, FakeClock) | 2026-11-24 |
| CA-U01 | Resumen de hoy en 1 toque | E (contador) | 2026-11-23 |
| CA-U02 | 2 decimales y €; negativo con "-" y "Falta" | U, E, A | 2026-11-23 |
| CA-N01 | Solo el encargado ve el resumen y guarda el cierre | S | 2026-11-23 |
| CA-N02 | Pantalla con todas las cifras ≤ 2 s p95 con 500 pedidos; también `dia-500` cerrado con la sección "Cambios tras el cierre" llena | P (Playwright), D | 2026-11-24 |
| CA-N03 | Cierre registrado e inmodificable (segundo cierre → `409 DAY_ALREADY_CLOSED` sin cambios; §5.2.3, C-15, C-18, C-19) | I (BD, RS-32) | 2026-11-24 |
| CA-N04 | No se borra nada por antigüedad | I (FakeClock a +400 días: los datos siguen), S (RS-32: `app_rw` sin `DELETE`) | 2026-11-23 |
| CA-N05 | WCAG 2.2 AA | A, M | 2026-11-23 |

### HU-09 Configurar los ajustes del local — FUERA DEL MVP

Descartada por el humano el 2026-11-23 (ronda 1.1e). **No se planifican ni se
escriben tests** para HU-09/CA-F01..F08, CA-U01..U03 y CA-N01..N03; sus IDs no
se retiran, por si se recupera más adelante (entonces se añade aquí su matriz).
Su efecto en el MVP: valores fijos de instalación, 20 mesas y 10 min
(supuesto 20), probados en HU-02/CA-F01 y HU-03/CA-F06. La matriz de
autorización (§5.7) comprueba que no existe ninguna ruta de ajustes expuesta
(`GET /settings` y `PATCH /settings` → `404` para todos los roles y sin
sesión, `docs/arquitectura.md` §5.1), que `GET /auth/me` entrega a cada rol
solo el valor que usa (`localConfig`: camarero `tableCount` = 20, barra
`delayThresholdMinutes` = 10, encargado ambos), que `TABLE_COUNT` y
`DELAY_THRESHOLD_MINUTES` fuera de rango impiden arrancar (`TX-CFG-01`) y que
la opción "Ajustes" no aparece en el menú del encargado (§5.2.2).

### Transversales
| ID | Comprobación | Tipos |
|---|---|---|
| TX-CONT-01 | Política rootless de todos los contenedores (RS-36, RS-37, RS-38) | Contenedores |
| RS-01..RS-46 | Requisitos de `docs/seguridad.md` §7 no ligados a un criterio de historia (cabeceras, TLS, CSRF, BD, imágenes…) | S, D, C según §7 |
| TX-SMK-01..07 | Smoke post-despliegue | Smoke |
| TX-RT-01 | El proxy no almacena SSE en búfer | R |
| TX-TZ-01 | Fecha de negocio independiente de la zona del contenedor y de la tablet | U, I, E |
| TX-CFG-01 | `TABLE_COUNT` (1–99) y `DELAY_THRESHOLD_MINUTES` (1–60) fuera de rango impiden arrancar `app` (§5.2.2) | U, I (imagen real) |
| TX-LOG-01 | Redacción recursiva de claves `/pin/i` y de `__Host-sid` (`docs/logging.md` §4.3, §4.5; RS-29, RS-31) | U |
| TX-LOG-02 | Logs de `app`, `proxy` y `db` sin PIN, *pepper*, cookie ni datos personales; eventos y métricas de SEC-016 (§5.10) | I |
| TX-MON-01 | El compactor de Loki borra los logs vencidos en DEMO (`retention_period: 24h`, no antes de T0 + 30 h): métrica del compactor, *chunks* eliminados y consulta de control con datos; en PROD solo configuración (720 h / 2160 h `security`) (§5.10) | C (DEMO), smoke (PROD) |

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
| 2026-11-24 | 2 (tarea 2.1e) | `trazabilidad` (`tests/run.sh`, `runner-unit` sin red) | `TESTS_NODE_IMAGE` = `localhost/mi-app-dev-tools@sha256:91651731…` / commit `4fafff8` + cambios sin commit de la 2.1e | **Pasa**: HU-01 23/23; sin IDs inexistentes ni retirados | — | Además, análisis de sintaxis de los 50 ficheros `.ts`/`.js` de `tests/` con `node --experimental-strip-types --check` en un contenedor sin red, UID 1000, `--read-only`, `cap-drop ALL` (sin cargar dependencias): sin errores (un falso positivo de `--check` en `support/e2e/red.ts`, que no tiene `import`; cargado como módulo ESM, correcto). Integración, seguridad y E2E siguen sin poder ejecutarse: no hay código ni `APP_IMAGE` (tarea 2.2) |
| 2026-11-24 | 2 (tarea 2.1) | `trazabilidad` (`tests/run.sh`, `runner-unit` sin red) | `TESTS_NODE_IMAGE` = `localhost/mi-app-dev-tools@sha256:91651731…` / commit `9f87021` | **Pasa**: HU-01 23/23 criterios con test o verificación manual; sin IDs inexistentes ni retirados | — | `run.sh` probado de extremo a extremo (secretos en `$XDG_RUNTIME_DIR`, `trap` con `down -v`, `comprobar_enlaces` antes y después). El resto de suites no se puede ejecutar: no existe la imagen de la app (`APP_IMAGE`) ni el código (tarea 2.2); fallarán por diseño hasta entonces |
| 2026-11-25 | 2 (tarea 2.2b) | `unit` (`tests/run.sh`) | `APP_IMAGE` = `localhost/mi-app@sha256:c87636f1…` (commit `3bbdeff`, imagen limpia) / `TESTS_NODE_IMAGE` = `localhost/mi-app-dev-tools@sha256:91651731…` / Vitest 4.1.12 | **Pasa**: 6 ficheros, 177/177 | — | Antes 171; +6 casos de SEC-029 (SEC-045 b). `--configLoader runner` sigue haciendo falta con Vitest 4.1.12. |
| 2026-11-25 | 2 (tarea 2.2b) | `security` (`tests/run.sh`) | `APP_IMAGE` = `localhost/mi-app@sha256:c87636f1…` (commit `3bbdeff`, imagen limpia) / `TESTS_NODE_IMAGE` = `localhost/mi-app-dev-tools@sha256:91651731…` / Vitest 4.1.12 | **Pasa**: 73 pasan (39 de la matriz + 34 del estático RS-16c/RS-25/RS-35), 241 omitidos por alcance (filas de HU-02..HU-08) | — | El código actual no tiene ningún hallazgo estático. |
| 2026-11-25 | 2 (tarea 2.2b) | `integration` (incluye el proyecto `security`) | `APP_IMAGE` = `localhost/mi-app@sha256:c87636f1…` (commit `3bbdeff`, imagen limpia) / `TESTS_NODE_IMAGE` = `localhost/mi-app-dev-tools@sha256:91651731…` / Vitest 4.1.12 | **Falla a propósito**: 250 pasan, **4 fallan** (RS-05b / SEC-038, `HU-01-concurrencia.int.test.ts`), 244 omitidos (241 de la matriz por alcance, 2 de `autoria`, 1 de `sesion`) | — | D-2.2-04 y D-2.2-05 corregidos (errores del test). Intermitencia T-44 (BD de fichero / comando) vista en 2 de 2 ejecuciones completas antes del reintento de `borrarBd`; 0 de 1 después. |
| 2026-11-25 | 2 (tarea 2.2b) | `e2e` (estricto, con CSP) | `APP_IMAGE` = `localhost/mi-app@sha256:c87636f1…` (commit `3bbdeff`, imagen limpia) / `TESTS_NODE_IMAGE` = `localhost/mi-app-dev-tools@sha256:91651731…` / Vitest 4.1.12 / Playwright v1.65.1-noble por digest, 3 *workers* | **Falla**: 4 pasan, 72 fallan (70 normales, `serie-pin` 1 + 4 sin ejecutar, `serie-red` 1), 2 omitidos hasta HU-02. **Todos por una sola causa**: violación de CSP `script-src` bloqueó `eval` en cada carga (T-45) | — | Diagnóstico (el vigilante de CSP solo anota; no es el modo por defecto): 70 pasan y 2 omitidos en las partes normales, `serie-pin` 5/5 y `serie-red` 1/1; el único resto son los 2 tests de CSP y el de "por URL" con su propio vigilante (CSP, ×2 navegadores). SEC-032 con respuesta retrasada: pasa en Chromium y WebKit. |
| 2026-11-25 | 2 (tarea 2.2b) | `a11y` | `APP_IMAGE` = `localhost/mi-app@sha256:c87636f1…` (commit `3bbdeff`, imagen limpia) / `TESTS_NODE_IMAGE` = `localhost/mi-app-dev-tools@sha256:91651731…` / Vitest 4.1.12 | **Intermitente**: 7/7 en 2 de 4 ejecuciones; en las otras 2 falla 1 o 2 tests por página en blanco (T-46) | — | Sin violaciones de axe en ninguna. |
| 2026-11-25 | 2 (tarea 2.2b) | `visual` | `APP_IMAGE` = `localhost/mi-app@sha256:c87636f1…` (commit `3bbdeff`, imagen limpia) / `TESTS_NODE_IMAGE` = `localhost/mi-app-dev-tools@sha256:91651731…` / Vitest 4.1.12 | **Pasa**: 11/11 | — | Capturas regeneradas en `tests/screenshots/HU-01/`. |
| 2026-11-25 | 2 (tarea 2.2b) | `containers` | `APP_IMAGE` = `localhost/mi-app@sha256:c87636f1…` (commit `3bbdeff`, imagen limpia) / `TESTS_NODE_IMAGE` = `localhost/mi-app-dev-tools@sha256:91651731…` / Vitest 4.1.12 | **Pasa**: TX-CONT-01 y TX-CMD-01 | — | — |
| 2026-11-25 | 2 (tarea 2.2b) | `trazabilidad` | `APP_IMAGE` = `localhost/mi-app@sha256:c87636f1…` (commit `3bbdeff`, imagen limpia) / `TESTS_NODE_IMAGE` = `localhost/mi-app-dev-tools@sha256:91651731…` / Vitest 4.1.12 | **Pasa**: HU-01 23/23 | — | — |
| 2026-11-25 | 2 (tarea 2.2b) | `perf` (control rápido, 3 rondas) | `APP_IMAGE` = `localhost/mi-app@sha256:c87636f1…` (commit `3bbdeff`, imagen limpia) / `TESTS_NODE_IMAGE` = `localhost/mi-app-dev-tools@sha256:91651731…` / Vitest 4.1.12 / k6 `docker.io/grafana/k6@sha256:70949fac…` (v2.4.0) | **Pasa**: 30/30 comprobaciones; login p95 = 175 ms (límite 1000 ms, HU-01/CA-N03) | — | Dos errores del propio test corregidos: `URL` no existe en k6 y la CA de la ejecución se pasaba con `k6 run -e` (solo `__ENV`) en vez de `SSL_CERT_FILE` del proceso. |
| 2026-11-26 | 2 (tarea 2.8a) | `integration` (incluye `security`) | `APP_IMAGE` = `localhost/mi-app@sha256:9be1188a…` (commit `fb427fa`, imagen limpia; el código de `apps/` y `packages/` no cambia desde `0d7ca30`) / `TESTS_NODE_IMAGE` = `localhost/mi-app-dev-tools@sha256:4ccbdb7e…` / commit `d6975e3` + tests nuevos sin commit | **Falla a propósito**: 278 pasan (254 anteriores + 24 nuevos: SEC-039/040 9, SEC-041 6, SEC-042 9), **4 fallan** (SEC-047, `HU-01-concurrencia-nombres.int.test.ts`), 244 omitidos por alcance | — | Fallos: 16 variantes → 16 verificaciones y `{"401":16}` (esperado ≤ 5 y el resto `423`); 19 fallos + 15 variantes + acierto → contador 34 (esperado ≤ 20); login + `POST /auth/pin` → 4 verificaciones simultáneas de la misma cuenta (esperado 1). Las precondiciones (PostgreSQL resuelve las 16 variantes a la misma cuenta) se cumplen. RS-05b original 4/4 en verde. |
| 2026-11-26 | 2 (tarea 2.8a) | mutación de las regresiones SEC-039..042 (copia del árbol fuera del repositorio, imagen y pila efímera propias) | misma imagen; `apps/` y `packages/` con 5 defectos inyectados a mano en la copia (quitar el cierre por inactividad del `ping` y `hub.expire` de la guarda; quitar el tope `canAccept`; quitar el `onSend` de `no-store`; admitir cualquier carácter en `apiText`) | **Detectados**: 19 de los 24 tests fallan (SEC-039: 4; SEC-040: 1 (el 51.º); SEC-041: 6; SEC-042: 8); los 5 que pasan son los de comportamiento que no depende del defecto | — | Comprueba que las regresiones no son vacías. La copia se borró; el repositorio no se tocó. |
| 2026-11-26 | 2 (tarea 2.8a) | `e2e` | misma imagen / Playwright v1.65.1-noble por digest, 3 *workers* | **Falla a propósito**: normales 74 pasan, **8 fallan** (los 4 tests nuevos × Chromium y WebKit: esqueleto 1280 y 375 px, barra a 375 px, caducidad con carrera), 2 omitidos hasta HU-02; `serie-pin` 5/5; `serie-red` 1/1. Sin violaciones de CSP en los que pasan | — | Los 74 anteriores (incluido CA-N06 en WebKit) pasan: T-46 es intermitente. Fallos: esqueleto → `getByTestId('esqueleto-usuario')` 0 de 4; barra a 375 px → el `h1` «Resumen del día» tiene 2 líneas; caducidad → sin banner «La sesión ha caducado…» |
| 2026-11-26 | 2 (tarea 2.8a) | `a11y` | misma imagen | **Falla a propósito**: 7 pasan, **2 fallan** (etiqueta por paso del cambio de PIN, encargado y camarero) | — | `getByLabel('PIN actual (provisional)')` no existe: el campo se llama «PIN (6 dígitos)» / «PIN (4 a 6 dígitos)» en los 3 pasos. axe: sin violaciones en los 7 anteriores. |
| 2026-11-26 | 2 (tarea 2.8a) | `visual` | misma imagen | **Pasa**: 11/11 | — | Las capturas regeneradas se restauraron con `git restore tests/screenshots` (los usuarios de prueba son aleatorios). |
| 2026-11-26 | 2 (tarea 2.8a) | `unit` y `trazabilidad` | misma imagen / `TESTS_NODE_IMAGE` = `localhost/mi-app-dev-tools@sha256:4ccbdb7e…` | **Pasan**: `unit` 6 ficheros, 177/177; `trazabilidad` HU-01 23/23, sin errores | — | Los tests nuevos citan `[HU-01/CA-…]` solo de criterios vigentes; los demás usan `[RS-…]`, `[SEC-…]`, `[H-…]` y `[T-…]`, que la herramienta no valida. |

## 13. Fallos abiertos

Estado tras la tarea 2.2b (2026-11-25). Cada fila: test, resultado esperado,
resultado obtenido y agente responsable.

| Test | Esperado | Obtenido | Responsable | Estado |
|---|---|---|---|---|
| `integration/api/HU-01-concurrencia.int.test.ts` › 50 logins simultáneos desde una IP con PIN erróneo (RS-05b, CA-F11) | ≤ 10 llamadas al hasher; el resto `429` | 50 verificaciones, 50 × `401`, ningún `429` | developer (SEC-038, tarea 2.5) | **Falla a propósito** (SEC-038 abierto, alta) |
| ídem › 50 logins simultáneos contra una cuenta desde IP distintas (CA-F06) | ≤ 5 llamadas al hasher; el resto `423`; `failed_attempts` ≤ 5 | 50 × `401` | developer (SEC-038) | **Falla a propósito** |
| ídem › ráfaga a `locked_manual` con el PIN correcto al final (CA-F13) | ese intento `423`, 0 sesiones sin revocar | `200` con cookie de sesión en una cuenta bloqueada de forma indefinida | developer (SEC-038) | **Falla a propósito** |
| ídem › misma ráfaga con `currentPin` en `POST /auth/pin` (CA-F13) | `423`/`401`, `pin_hash` sin cambios | `204`: el PIN provisional se cambia en una cuenta bloqueada | developer (SEC-038) | **Falla a propósito** |
| Todos los `e2e/*.e2e.ts` (72 de 80 ejecutados, en los dos navegadores) y `HU-01-csp.e2e.ts` › recorrido sin violaciones (RS-26 E) | 0 violaciones de CSP | `securitypolicyviolation`: `script-src` bloqueó `eval` en `assets/index-*.js:11:28087` en **cada carga de página** (T-45) | developer | Abierto (media: la SPA funciona, pero la consola registra un error de CSP en cada carga y RS-26 E no se cumple) |
| `a11y` (1–2 tests por ejecución, en 2 de 4) y `serie-pin` (1 vez) | P-01 visible en 5 s | página en blanco 5 s: ninguna petición a `/auth/me`; CSS `-1` (sin terminar) en la traza (T-46) | testing + infrastructure (investigar) | Abierto (intermitente) |
| `integration/api/HU-01-concurrencia-nombres.int.test.ts` › 16 variantes `i`/`İ` de un nombre con 4 «i» en paralelo (RS-05b, SEC-047; CA-F06) | ≤ 5 llamadas al hasher; el resto `423`; contador ≤ 5 | 16 verificaciones, 16 × `401`, contador 16 | developer (tarea 2.8b: clave del cerrojo por `id`) | **Falla a propósito** (2.8a) |
| ídem › 16 variantes con `i`/`İ` y sigma final `σ`/`Σ` | ídem | ídem (16 carriles distintos con `toLowerCase()`) | developer (SEC-047) | **Falla a propósito** |
| ídem › 19 fallos + 15 variantes erróneas + acierto con otra variante (CA-F13) | `locked_manual`, contador ≤ 20, el acierto `423` y 0 sesiones | contador 34 (el acierto sí da `423` y 0 sesiones: la condición del `UPDATE` de SEC-038 protege) | developer (SEC-047) | **Falla a propósito** |
| ídem › un login (variante del nombre) y un `POST /auth/pin` de la misma cuenta a la vez | nunca más de 1 verificación simultánea de la cuenta | 4 simultáneas (el semáforo de 4 es el único límite) | developer (SEC-047: `POST /auth/pin` debe usar `user:<id>`) | **Falla a propósito** |
| `a11y/HU-01-login.a11y.ts` › etiqueta accesible distinta en cada paso del cambio de PIN (encargado y camarero; H-2.3-04, D-2.5-01) | `getByLabel('PIN actual (provisional)')`, `'PIN nuevo (6 dígitos)'` o `'PIN nuevo (4 a 6 dígitos)'`, `'Repite el PIN nuevo'` | el campo se llama «PIN (6 dígitos)» / «PIN (4 a 6 dígitos)» en los 3 pasos | developer (2.8b) | **Falla a propósito** |
| `e2e/HU-01-estados-carga.e2e.ts` › esqueleto de 4 tarjetas con la rejilla pendiente (H-2.3-07, H-2.6-02; 1280 y 375 px, Chromium y WebKit) | 4 × `data-testid="esqueleto-usuario"`, `aria-hidden`, del tamaño de una tarjeta | 0 elementos (solo el texto «Cargando usuarios…») | developer (2.8b) | **Falla a propósito** |
| `e2e/HU-01-barra-superior-375.e2e.ts` › barra del encargado a 375 px (H-2.6-01; Chromium y WebKit) | barra de igual altura (±1 px) en las 5 pantallas y `h1` en 1 línea | `h1` «Resumen del día» en 2 líneas; barra de 121 px frente a 113 px (medido por UX en la 2.6) | developer (2.8b) | **Falla a propósito** |
| `e2e/HU-01-caducidad-carrera.e2e.ts` › el banner de caducidad no se pierde si el `401` del flujo SSE llega antes que `GET /auth/me` (CA-N06; T-46/T-48) | banner «La sesión ha caducado por duración máxima. Vuelve a entrar con tu PIN.» | P-01 sin banner (WebKit 10 de 10, Chromium 1 de 10). Causa en §14.8 | developer (2.8b); software-engineer y cybersecurity si la solución toca el `Set-Cookie` del `401` de `/events` | **Falla a propósito** |
| `e2e/HU-01-iniciar-sesion.e2e.ts:396` › CA-N06 (el test original) | banner «La sesión ha caducado…» | Intermitente en WebKit con carga (1 vez en la ejecución completa de la 2.6; con latencias aleatorias de 0–300 ms inyectadas en la API, falló en decenas de ejecuciones de un test instrumentado y en todas se vio la misma causa). El test es correcto; es la misma causa que la fila anterior | developer (2.8b) | Abierto (se cierra con el anterior) |

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
| T-05 Sonido y pantalla | HU-03/CA-F14 y CA-N05 | **Verificado**; los dos detalles menores que quedaban, T-15 (CA-F14) y T-16 (CA-N05), se cerraron en la ronda 1.1f (verificado en la 1.6d, §14.2). Estrategia en §8.5 y §8.6 |
| T-06 "Sin degradar" | HU-05/CA-N03 | **Verificado.** Ahora es medible; la duda de si la lista era cerrada (T-17) quedó resuelta en la 1.1f: lista cerrada (§14.2) |
| T-07 Tablet 10" | HU-02/CA-N05, CA-U01 y supuesto 23 | **Verificado.** Más preciso que la propuesta (total y "Enviar a barra" sin desplazar) |
| T-08 "Claramente" | HU-04/CA-U04 | **Verificado.** Viewports aplicados: I-05 |
| T-09 Resumen ≤ 2 s | HU-08/CA-N02 | **Verificado.** p95, pantalla completa con el desglose de CA-F13, desde el toque o el cambio de fecha, condiciones del supuesto 12 |
| T-10 Fecha de negocio con `now()` | `docs/arquitectura.md` §2, §4, §12 (SE) | Resuelto por el SE; aplicado en §5.2 y §8.1 (`buildApp` + `FakeClock`) |
| T-11 Ubicación de los tests | `docs/arquitectura.md` §3, §12 (SE) | Resuelto por el SE |
| T-12 `compose.test.yaml` y sandbox | `docs/infraestructura.md` §9, `docs/seguridad.md` §6.3 | Resuelto (sin validar con imágenes reales); notas 1–5 de Infrastructure pendientes de aplicar en `tests/run.sh` al crearlo |

### 14.2 Hallazgos de la tarea 1.6b y su cierre (verificado en la 1.6d)

T-13 no se emite: era la objeción a la regla "TESTING y DEMO" del supuesto 12,
que el humano ha retirado en la ronda 1.1e. Texto original de cada hallazgo en
`docs/estado.md`. Verificación hecha el 2026-11-23 contra las historias tras la
ronda 1.1f y contra `docs/arquitectura.md` tras la 1.3c.

| ID | Responsable | Criterio / archivo | Problema (resumen) | Dónde se resolvió | Resultado de la verificación (1.6d) |
|---|---|---|---|---|---|
| T-14 | product-owner, cybersecurity | HU-01/CA-F06, HU-04/CA-F23, HU-07/CA-N04 | Qué pasa con la sesión abierta de una cuenta que se bloquea y qué mensaje ve al reconfirmar | HU-01/CA-F12 y CA-F13 nuevos; HU-04/CA-F23 y HU-07/CA-N04 remiten a ellos; arquitectura §5, §7 (1.3c) | **Verificado (PO), con dos restos.** CA-F12 y CA-F13 tienen resultado esperado comprobable (§5.2.1) y la arquitectura los implementa (`423 LOCKED` sin hash ni conteo; revocación de todas las sesiones a los 20). Restos: (1) las partes (1) y (2) de CA-F13 siguen "a confirmar por Cybersecurity" (fila abierta en `docs/estado.md`); los tests se escriben ya con la lectura del PO, que es también la de la arquitectura. (2) **Conflicto nuevo T-20**: con 5 fallos de reconfirmación en la misma sesión, la arquitectura responde `429` y no el `423` que pide CA-F12 (c) y (d) |
| T-15 | product-owner | HU-03/CA-F14, CA-F09 | Plazo del aviso y persistencia de la preferencia de sonido | HU-03/CA-F14 ("<= 1 s") y CA-F09 (preferencia en el dispositivo) | **Verificado.** Los dos puntos, tal como se propusieron, más dos precisiones útiles: vale también al entrar con otro usuario y la primera vez está activado. Casos en §8.5. I-09 pasa a ser texto del criterio |
| T-16 | product-owner | HU-03/CA-N05 | Con qué ajuste de apagado de pantalla se verifica | HU-03/CA-N05 | **Verificado, aceptado con cambio.** Solo el valor mínimo distinto de "nunca" (o el de fábrica, anotado); no se repite con el valor del local. Verificable y suficiente (el mínimo es el caso más exigente). Protocolo de §8.6 ajustado, con una comprobación previa de que el ajuste está aplicado |
| T-17 | product-owner | HU-05/CA-N03 | Lista cerrada o ejemplos | HU-05/CA-N03 | **Verificado.** Lista cerrada, que añade HU-02/CA-N05 (20 categorías en tablet). I-06 corregida; §5.6.1 y matriz ajustadas |
| I-01..I-10 | product-owner | §4.5 | Confirmar o corregir las interpretaciones | README de historias, "Interpretaciones de Testing confirmadas por el PO" | **Verificado.** I-01..I-05, I-07, I-08 e I-10 confirmadas tal cual; I-09 confirmada e incorporada a HU-03/CA-F14; I-06 corregida (lista cerrada, T-17). Las ampliaciones del PO (I-01 y I-03 también para CA-F12; I-02 con la nota de SEC-019; I-10 aclarando que el límite por sesión no tiene mensaje propio) están en §4.5. Recuento: 206 criterios, sin huecos ni duplicados, referencias cruzadas válidas (script) |
| T-18 | cybersecurity | `docs/seguridad.md` §7, RS-18 | "I generado desde `permissions.ts`" toma como oráculo el código que se prueba | — | **Abierto.** Sin cambios en `docs/seguridad.md` §7 (RS-18 sigue igual). Mientras tanto se aplica el principio 2 (§1) |

### 14.3 Hallazgos nuevos (tarea 1.6d)

| ID | Responsable | Criterio / archivo | Problema | Propuesta | Severidad |
|---|---|---|---|---|---|
| T-19 | software-engineer | HU-02/CA-F01; `docs/arquitectura.md` §4.1 (tabla de configuración) y §5.1 (`POST /orders`) | Solo se define el código para la mesa "> N" (`422 TABLE_OUT_OF_RANGE`). No se dice qué responde la API a `tableNumber` 0, negativo, > 99, no entero o de un tipo que no es número, ni a un `tableNumber` en un pedido de mostrador. Sin eso, el test de la mesa 0 no tiene resultado esperado (la §8.7 anterior decía `400` para la 0 y la 21, y la 21 era un error) | Escribir en §5.1: "`tableNumber` fuera de 1–99, no entero o con `type = counter` → `400` de validación (`path: ["tableNumber"]`); 1–99 pero > `TABLE_COUNT` → `422 TABLE_OUT_OF_RANGE`". Mientras tanto se aplica I-11 | baja |
| T-20 | software-engineer, cybersecurity (product-owner si se cambia el criterio) | HU-01/CA-F12 (c) y (d), HU-04/CA-F23, HU-07/CA-N04, HU-07/CA-F04; `docs/arquitectura.md` §7 (`verifyPin`, pasos 2 y 3); ADR-005 revisión (c) | El límite por sesión (paso 2) se comprueba **antes** que el bloqueo de la cuenta (paso 3). En el caso más probable (el encargado falla 5 veces seguidas la reconfirmación en su propia sesión, o el usuario con PIN provisional falla 5 veces el PIN actual) el 5.º fallo bloquea la cuenta 5 min **y** agota el límite de la sesión 10 min. Resultado: (1) durante el bloqueo recibe `429 TOO_MANY_ATTEMPTS` ("Demasiados intentos"), no el `423 LOCKED` / "Cuenta bloqueada. Espera X min" que exige CA-F12 (c); (2) cuando acaba el bloqueo (5 min) sigue rechazado otros ~5 min, contra CA-F12 (d) "cuando termina el bloqueo, puede volver a intentarlo"; (3) I-10 dice que el límite de sesión no tiene mensaje propio en las historias, así que no hay texto para ese `429`. Los tests (P-6 de §5.2.1) no pueden pasar con la historia y la arquitectura a la vez | Opción A (recomendada, sin cambiar la historia): en `verifyPin`, para `confirm` y `change` (el PIN es del propio titular de la sesión) comprobar el bloqueo de la cuenta antes que el límite de sesión, y que el límite de sesión **no** se aplique cuando el usuario verificado es el de la sesión: ya lo cubre su bloqueo de cuenta, y el límite de sesión sigue protegiendo las aprobaciones, que es para lo que lo pidió Cybersecurity (`docs/seguridad.md` §6.3, "evita usar una tablet de camarero para bloquear al encargado"). Opción B: el PO cambia CA-F12 para admitir "Demasiados intentos. Espera X min" con el tiempo mayor de los dos y lo incorpora a I-10. Mientras tanto los tests siguen la historia (I-12) | media |
| T-21 | software-engineer | `docs/arquitectura.md` §5 ("Autorización del encargado") y §7 paso 2 | (a) "Sumando los tres usos" del límite por sesión no es alcanzable por la API: una sesión de camarero solo hace aprobaciones, una de encargado solo reconfirmaciones (sus acciones de HU-06 omiten `managerApproval`) y una con PIN provisional solo `POST /auth/pin`. No es un error, pero la suma solo se puede probar en unitario. (b) No se dice qué pasa si una sesión de encargado **envía** `managerApproval` (la UI lo omite, pero un cliente manipulado puede mandarlo): ¿se ignora sin verificar ni contar, o se verifica? Si se verificara sin contar, permitiría probar PIN de otros encargados sin límite | (a) Anotar en §7 que la suma por sesión solo se da en la práctica con un uso por sesión, o confirmar que es intencionado (defensa en profundidad). (b) Escribir: "con sesión de encargado, `managerApproval` se ignora: no se verifica ni cuenta, y `authorized_by = actor`" (o rechazarlo con `400`). Testing prueba la opción que se elija | baja |
| T-22 | monitoring (infrastructure para la configuración de DEMO) | `docs/logging.md` §6.6 ("Testing comprueba en DEMO que el compactor borra") | La comprobación propuesta ("consulta de un intervalo ya vencido sin resultados") no bastaba: una consulta vacía también sale si hay `max_query_lookback` o si nunca hubo datos, y con la retención inicial de DEMO (7 días) habría hecho falta que DEMO durase más que la Etapa 4 prevista, sin poder fabricar logs antiguos (`reject_old_samples_max_age`) | (a) evidencia por métrica del compactor, *chunks* eliminados y consulta de control; (b) Loki de DEMO con `retention_period: 24h`. **Estado (1.7i):** Infrastructure eligió (b) (`docs/infraestructura.md` §11.3: DEMO 3–5 días laborables, 24 h sin `retention_stream` ni `max_query_lookback`, mismo compactor que PROD, TX-MON-01 no antes de T0 + 30 h, PROD solo configuración 720 h / 2160 h `security`) y Testing lo aplica en `TX-MON-01` (§5.10). **Resuelto por Testing e Infrastructure.** Queda la parte de Monitoring: `docs/logging.md` §6.6 sigue diciendo 168 h en DEMO y "consulta de un intervalo vencido" (tarea 1.7b) | baja |

### 14.4 Hallazgos nuevos (tareas 1.7i, 1.7m y 1.7p, HU-08 día cerrado)

| ID | Responsable | Criterio / archivo | Problema | Propuesta | Severidad |
|---|---|---|---|---|---|
| T-23 | software-engineer (tarea 1.7h); product-owner para la redacción de CA-F07 | HU-08/CA-F05, CA-F07, CA-F15; `docs/arquitectura.md` §4 (`cash_closings`) y §5.1 (`GET /reports/daily`, `POST /reports/daily/:date/closing`) | (1) Hasta la 1.3c la arquitectura solo describía las **anulaciones** posteriores al cierre (`voided_at > closed_at`), no las cancelaciones (1.7d) ni los cobros posteriores (CA-F15). (2) Riesgo de carrera: un cobro cuya transacción empieza antes del cierre y confirma después (o con la misma marca de tiempo) podía quedar fuera de la instantánea **y** de la sección (desaparece del día cerrado y la caja no cuadra, contra CA-F07 y CA-F15 (b)). (3) Regla del instante igual sin definir; CA-F07 dice "hasta la hora del cierre", que se lee como inclusiva, mientras el borrador 1.7h usa `< closed_at` para la instantánea | **Cubierto en el borrador de la 1.7h** (`docs/arquitectura.md` §4.4, en curso): instantánea en `summary`, sección calculada con `>= closed_at` para cancelaciones, anulaciones y cobros, y cerrojo `CASH_CLOSING_LOCK` (exclusivo en el cierre, compartido en cobro, anulación y cancelación, con la hora leída después de tomarlo), que elimina la carrera. Testing lo verifica al cerrarse la 1.7h y lo prueba con C-08, C-09 y C-13 (§5.2.3); I-13 ya sigue el borrador. Resto para el PO: que CA-F07 diga "registrados **antes de** la hora del cierre" (o que acepte que el mismo instante va a la sección), para que historia y arquitectura no se lean distinto | media hasta que se cierre la 1.7h; después, baja (solo la redacción). **Cerrado (1.7m).** Verificado: `docs/arquitectura.md` §4.4 (instantánea `summary`, `computeDailySummary` con `paid_at < $cutoff`, anulados `voided_at < $cutoff` y cancelados `[dayStart, min(dayEnd, cutoff))`; sección con `>= $closedAt` en las tres columnas; regla del instante igual = posterior; cerrojo `CASH_CLOSING_LOCK` exclusivo en el cierre y compartido en cobro, anulación y cancelación con la hora leída después de tomarlo), §5.1 y §16 (1.7h); HU-08/CA-F05 define la frontera ("antes" = hora anterior, "después" = igual o posterior, cada cosa en un solo sitio), CA-F07 dice "antes de la hora del cierre" y CA-F15 "a la hora del cierre o más tarde" (1.7k). Historia, arquitectura e I-13 se leen igual. Oráculo de C-13 corregido a `<` y C-09 ajustado al cerrojo (§5.2.3). Queda un resto de la misma familia en T-26 |
| T-24 | product-owner | HU-08/CA-F05 (cancelaciones, 1.7d), CA-F11 | "Los pedidos **de ese día** cancelados después del cierre" admite dos lecturas: pedidos con fecha de ese día, o cancelaciones registradas ese día. Con CA-F11 (cuenta por día de cancelación) y la regla de CA-F15 para los cobros, un pedido de D−1 cancelado en D tras el cierre debería ir en la sección de D, y uno de D cancelado en D+1, en D+1; con la otra lectura, iría a la sección de D−1 o de D y contaría dos veces | Precisar CA-F05: "los pedidos cancelados ese día después del cierre (CA-F11), sea cual sea el día del pedido". Mientras tanto los tests aplican I-16 | baja. **Cerrado (1.7m).** Verificado: HU-08/CA-F05 (1.7k) dice "pedidos cancelados ese día después del cierre, sea cual sea el día del pedido (CA-F11)" y "un pedido de ese día cancelado en un día posterior cuenta en el día de la cancelación y no aparece en esta sección"; `docs/arquitectura.md` §4.4 usa `cancelled_at` en `[$closedAt, $dayEnd)` sin filtrar por el día del pedido. I-16 confirmada; C-12 sin cambios |
| T-25 | product-owner (ux-designer para el texto) | HU-08/CA-F03 en un día cerrado; CA-F05 | CA-F05 dice que un día cerrado muestra "las cifras del cierre guardado", pero no si el aviso "Hay N pedidos sin cobrar" es una de ellas. Con CA-F15 importa: tras un cobro posterior al cierre, el aviso congelado seguiría contando un pedido que ya está cobrado | Confirmar I-15 (el aviso se calcula al consultar; no es cifra del cierre) o decir lo contrario en CA-F03 | baja. **Cerrado (1.7m).** Verificado: HU-08/CA-F03 (1.7k) dice que en un día cerrado el aviso se calcula al consultar, baja con un cobro tras el cierre y vuelve a contar el pedido si ese cobro se anula; CA-F05 repite que no es cifra guardada; `docs/arquitectura.md` §4.4 (pedidos sin cobrar fuera de la instantánea) y §5.1 (`openOrders` siempre actual). El wireframe `09-resumen-dia.md` no lo contradice (el aviso no está dentro de las cifras del cierre), así que no hace falta texto nuevo de UX. I-15 confirmada; C-02, C-04, C-10 y C-18 lo comprueban |
| T-26 [1.7m] | software-engineer | HU-08/CA-F07, CA-F15 (b), CA-F05 ("nunca en las dos ni en ninguna"); `docs/arquitectura.md` §4.4 ("Cerrojo del cierre") y §9 | El cerrojo garantiza que ningún cobro, anulación o cancelación con hora anterior al cierre se confirme **después** de que el cierre calcule la instantánea, pero la arquitectura no dice con qué **nivel de aislamiento** corre la transacción del cierre; solo fija `REPEATABLE READ` para la lectura de `GET /reports/daily` (§4.4, "Rendimiento"). En PostgreSQL, con `REPEATABLE READ` la foto de la transacción se toma al empezar su **primera sentencia**, que es el propio `SELECT pg_advisory_xact_lock(CASH_CLOSING_LOCK)`, antes de esperar al cerrojo. Un cobro que tomó el cerrojo compartido y leyó la hora antes de que el cierre empezara a esperar, y que confirma mientras el cierre espera, tiene `paid_at < closed_at` pero sería **invisible** para la instantánea, y la sección no lo lista (`paid_at >= closed_at`): desaparecería del día cerrado y la caja no cuadraría. Si el cierre reutiliza la transacción de solo lectura `REPEATABLE READ` de la lectura del día (misma función `computeDailySummary`), el fallo aparece. Con `READ COMMITTED` (cada sentencia toma una foto nueva, después del cerrojo) no ocurre. Afecta también a C-19: con `REPEATABLE READ`, el segundo cierre en paralelo vería "no existe" y el `INSERT` daría violación de PK, que debe salir como `409 DAY_ALREADY_CLOSED`, no `500` | Que §4.4 diga que `POST /reports/daily/:date/closing` corre en `READ COMMITTED` (o que la foto se toma en una sentencia posterior al cerrojo, p. ej. tomándolo antes de abrir la transacción `REPEATABLE READ`), y que la violación de la PK de `cash_closings` se traduce a `409 DAY_ALREADY_CLOSED`. Testing lo prueba con C-09 (b) (transacción en vuelo, determinista) y C-19 | media (pérdida silenciosa de un cobro en el cierre de caja; sin consecuencia mientras no haya código, pero debe estar escrito antes de la Etapa 2 de HU-08). **Cerrado (1.7p).** Verificado en `docs/arquitectura.md` §4.4 (1.7o): (1) las cuatro transacciones del cerrojo corren en `READ COMMITTED` y el cerrojo es su primera sentencia, así que cada lectura posterior ve lo confirmado por quien lo tenía; el caso del cobro confirmado mientras el cierre espera queda en la instantánea; (2) en el cierre, `clock.now()` va después del cerrojo y de comprobar la fila; en los escritores, después del cerrojo y antes del `FOR UPDATE`: el reparto `<` / `>=` es exacto en los dos sentidos; (3) coherencia entre sentencias de `computeDailySummary` en `READ COMMITTED`: correcta, porque con el cerrojo exclusivo no se confirma ningún cobro, anulación ni cancelación, las líneas solo cambian en pedidos `open` (que no entran en las cifras) y nombre y precio son instantánea en `order_lines`; (4) dos cierres: paso 3 → `409`, `ON CONFLICT DO NOTHING` como segunda barrera y `23505` en `cash_closings_pkey` → `409`, nunca `500` (§9, §16); (5) `GET /reports/daily` en `REPEATABLE READ` de solo lectura es correcto porque no usa la hora como corte. Riesgo aceptado por el SE y no cubierto por tests: reloj del sistema que retrocede durante un cierre (el `FakeClock` de C-09 es monótono). Pruebas: C-09 (b), (b-iso), (b-RR) y C-19 (§5.2.3). Queda un resto de robustez en T-27 |
| T-27 [1.7p] | software-engineer (decisión); infrastructure si se elige la comprobación de entorno | HU-08/CA-F07, CA-F15 (b); `docs/arquitectura.md` §4.4 ("el helper de transacción no lo cambia") | El `READ COMMITTED` del que depende el reparto exacto es el **valor por defecto** de PostgreSQL, no algo que la aplicación fije. Un `default_transaction_isolation = 'repeatable read'` en `postgresql.conf`, en la base o en el rol (p. ej. al ajustar la BD de PROD o al migrar de imagen) reabriría T-26 sin cambiar código ni hacer fallar ningún test que corra con la configuración por defecto: el cobro confirmado mientras el cierre espera desaparecería del día cerrado | Preferida: que el helper abra estas cuatro transacciones con `BEGIN ISOLATION LEVEL READ COMMITTED` explícito (una línea, sin coste). Alternativa: comprobación al arrancar `app` (o en `readyz`/smoke) de `SHOW default_transaction_isolation` = `read committed`, con `config.invalid` si no. Testing lo prueba con C-09 (b-RR), cuyo resultado esperado depende de la opción elegida | baja (requiere un cambio de configuración de la BD; consecuencia, pérdida silenciosa de un cobro en el cierre) |

### 14.5 Hallazgos nuevos (tarea 2.1, HU-01)

| ID | Responsable | Criterio / archivo | Problema | Propuesta | Severidad |
|---|---|---|---|---|---|
| T-28 | infrastructure (cybersecurity revisa el rol nuevo) | §9.2; `compose.test.yaml` (`runner-integration`); `deploy/db/initdb/10-roles.sh` | (a) `runner-integration` solo recibe `app_owner` (límite de 2 conexiones): no alcanza para la app en proceso (`buildApp`) y los constructores de datos, y la app debe probarse con su rol real `app_rw`. (b) La BD por fichero de §9.2 (`CREATE DATABASE … TEMPLATE app_template`) exige un rol con `CREATEDB` y una plantilla migrada que no existen; sin ellos no se puede probar RS-09 (encargado inicial: necesita una BD sin encargados) | (a) Añadir a `runner-integration` `DATABASE_APP_USER=app_rw`, `DATABASE_APP_PASSWORD_FILE` y el secreto `db_app_password`. (b) Solo en TESTING: rol `test_admin` con `CREATEDB` (secreto propio), BD `app_template` migrada por `migrate` y `DATABASE_ADMIN_USER`, `DATABASE_ADMIN_PASSWORD_FILE`, `DATABASE_TEMPLATE` en el ejecutor (`tests/README.md` §6). Mientras tanto los ficheros de integración van en serie sobre `cafeteria` con datos únicos | media (bloquea la ejecución de la suite de integración de HU-01) |
| T-29 | infrastructure, cybersecurity | §8.1, §9.3; `compose.test.yaml` (`runner-e2e`, `runner-perf`) | `runner-e2e` solo está en la red `edge`: no puede fabricar el pasado en la BD (§8.1: bloqueos, caducidad de 12 h) ni sembrar usuarios antes de HU-07 (no hay `POST /staff`), y k6 no tiene usuarios con PIN conocido | Solo en TESTING: `runner-e2e` también en `backend`, con `DATABASE_*`, `db_app_password` y `pin_pepper` de la ejecución (aleatorio, nunca fuera de TESTING). Cybersecurity aprueba que el ejecutor reciba el *pepper* de prueba | media (bloquea los E2E de HU-01) |
| T-30 | ux-designer (product-owner si cambia el texto del criterio) | HU-01/CA-F12 (c); `docs/ux/wireframes/01-login.md`, "Cambio obligatorio del PIN", fila `423 LOCKED` | El wireframe muestra "Demasiados intentos fallidos. Podrás volver a intentarlo en 5 min." al reintroducir el PIN actual con la cuenta en bloqueo temporal; CA-F12 (c) (y I-01, I-12, design system §5.10b) pide "Cuenta bloqueada. Espera X min" para toda acción de la sesión que pide el propio PIN. El E2E sigue la historia | Usar "Cuenta bloqueada. Espera X min" también en esa pantalla, o que el PO diga que el cambio obligatorio del PIN queda fuera de CA-F12 (c) | baja |
| T-31 | ux-designer, software-engineer | HU-01/CA-F04 ("por URL"), CA-F03 | No están definidas las rutas de la SPA ni el estado "acceso denegado" de una ruta sin permiso. Además, para CA-F03/CA-F04 en E2E, HU-01 necesita que existan (aunque vacías) las rutas de Menú, Personal y Resumen con su guarda | Fijar rutas (propuesta en `tests/README.md` §5: `/pedidos`, `/cola`, `/menu`, `/personal`, `/resumen`) y el texto "Acceso denegado". El Orquestador confirma que el Developer crea esas pantallas vacías en HU-01 | baja |
| T-32 | software-engineer | `docs/arquitectura.md` §5, §7, §12 | Detalles de contrato que los tests necesitan y la arquitectura no fija: dónde va `retryAfterSeconds`, forma del `400` (código e `issues`), códigos y orden de las reglas de PIN, dependencias de `buildApp` (`publicOrigin`, `trustedProxies`, `logDestination`, `onRoute`, métricas), cómo declara cada ruta su permiso, *exports* de los paquetes y API de los comandos `create-initial-manager`/`unlock-user` | Adoptar la propuesta de `tests/README.md` §1–§3 en la arquitectura o proponer otra; Testing ajusta solo los ficheros de adaptación de `tests/support/` | baja |
| T-33 | product-owner | HU-01/CA-F13 | Sigue diciendo "A confirmar por Cybersecurity", pero `docs/seguridad.md` §6.4 (1.4c) confirmó los dos puntos | Quitar la marca y redactar el criterio para todo bloqueo indefinido; los tests ya aplican esa lectura | baja |
| T-34 | cybersecurity (infrastructure) | §7.1 (CA de la ejecución), §7.2; `tests/playwright.config.ts` | Chromium confía solo en el certificado del proxy verificado contra la CA de la ejecución (fijación SPKI en `global-setup.ts`), pero WebKit no tiene opción equivalente: sin `ignoreHTTPSErrors` no conecta. Sigue pendiente también la decisión de `chromiumSandbox` (§7.2) | Decidir si se admite `ignoreHTTPSErrors` solo en el proyecto WebKit de TESTING (red interna efímera) o se instala la CA en la imagen de Playwright en tiempo de construcción | baja (el proyecto `tablet-h-webkit` fallará hasta que se decida) |
| T-35 | infrastructure (orquestador para `.gitignore`) | `docs/infraestructura.md` §7.1; `compose.dev.yaml`; `deploy/dev/levantar.sh`; `.gitignore` | `tests/` es paquete del workspace (`@mi-app/tests`): `deps` necesita `./tests/node_modules` en `rw` y `comprobar_enlaces` de `levantar.sh` debería incluirlo (la de `tests/run.sh` ya lo hace). `tests/results/` no está en `.gitignore`: los informes de cada ejecución entrarían en `git add -A` | Añadir `./tests/node_modules` a la lista de permitidos de `deps` y a `comprobar_enlaces`; añadir `tests/results/*` (salvo `.gitkeep`) a `.gitignore` | baja |
| T-36 | software-engineer, infrastructure | HU-01/CA-N06; RS-13 ("configuración > 12 h → el servidor no arranca") | No hay nombre de variable para la caducidad absoluta configurable a la baja (no está en `docs/infraestructura.md` §6): no se puede escribir el unitario de `config.ts` de RS-13 | Fijar la variable (p. ej. `SESSION_MAX_HOURS`, 1–12, por defecto 12) en §4.1/§7 y en §6 de infraestructura | baja |
| T-37 | software-engineer (product-owner si se acepta la tolerancia) | HU-01/CA-F09; `docs/arquitectura.md` §7 (`last_activity_at` como mucho cada 30 s) | La inactividad se mide desde `last_activity_at`, que puede ir hasta 30 s por detrás de la última interacción real: una sesión podría cerrarse tras 14 min 30 s sin interacción, antes de los 15 min del criterio. Los tests espacian las peticiones > 30 s y no lo detectan | Actualizar `last_activity_at` si han pasado > 30 s **y** guardar la hora real de la petición (no la del último guardado), o que el PO acepte una tolerancia de −30 s en CA-F09 | baja |

**Estado tras la 2.1e (2026-11-24):** T-28 y T-29 cerrados por Infrastructure
(2.1b, `docs/infraestructura.md` §9.1: `test_admin`, `app_template`, red
`db-seed`); los tests y `tests/run.sh` ya los usan. T-30 cerrado por UX
(2.1d). T-31 cerrado (SE §5.2 y UX `10-acceso-denegado.md`). T-32 cerrado con
los ajustes de `docs/arquitectura.md` §17 (quedan detalles en T-38..T-42).
T-36 y T-37 cerrados (SE §7, §10.1; sin tolerancia en CA-F09). T-34:
implementado por Infrastructure, se verifica en la primera ejecución E2E.
T-33 y T-35 sin cambios.

### 14.6 Hallazgos nuevos (tarea 2.1e, HU-01)

| ID | Responsable | Criterio / archivo | Problema | Propuesta | Severidad |
|---|---|---|---|---|---|
| T-38 | software-engineer | RS-13, HU-01/CA-N06; `docs/arquitectura.md` §10.1 | No está fijada la forma del objeto que devuelve `parseSettings(env)`: el unitario no puede leer el valor por defecto (12) ni el resto sin suponer nombres | Fijarla en §10.1. Propuesta: los nombres de `AppDeps` (`host`, `port`, `metricsPort`, `installation.{tableCount, delayThresholdMinutes}`, `sessionMaxHours`, `publicOrigin`, `trustedProxies: string[]`, `logLevel`, `database.{host, port, database, user}`). Mientras, `tests/support/config.ts` adapta | baja |
| T-39 | software-engineer | HU-01/CA-F12 (P-1), RS-16b; `docs/arquitectura.md` §5 (orden) y §5.1 (`POST /auth/pin`) | El `403 FORBIDDEN` de `POST /auth/pin` sin PIN provisional no es del RBAC (`session:self`, que todos tienen) y el orden de §5 no dice si va antes o después de zod: con un cuerpo inválido podría salir `400` y la UI/los tests no sabrían qué esperar | Decir que esa comprobación va antes de la validación del cuerpo (p. ej. `preValidation`), igual que el RBAC. La matriz envía de momento un cuerpo bien formado en esa fila | baja |
| T-40 | software-engineer (cybersecurity) | RS-18 (`GET/PATCH /settings` → `404` para todos); `docs/arquitectura.md` §5 (orden de hooks `onRequest`) | Fastify ejecuta los hooks `onRequest` también en las rutas no encontradas: con el orden fijado, `/settings` daría `401` sin sesión, `403 PIN_CHANGE_REQUIRED` con PIN provisional y quizá `403 FORBIDDEN` (sin `config`) en lugar del `404` que pide RS-18 | Decidir qué responde `/api/v1/<ruta inexistente>`: (a) `404` para todos (los hooks de sesión y permiso se saltan si no hay ruta) o (b) `401`/`403` primero y RS-18 se ajusta (Cybersecurity, dueño de RS-18). El test sigue RS-18 | media (el test fallará por diseño si no se decide) |
| T-41 | software-engineer, infrastructure | HU-01 dependencia del encargado inicial, CA-F06 (RS-09, RS-09b); `docs/arquitectura.md` §2.1 (códigos de salida 0/2/1) | Los códigos de salida y "stderr sin el PIN" de los envoltorios `create-initial-manager` y `unlock-user` no se pueden probar: no está fijado el comando de la imagen (ruta del script, cómo recibe el nombre) ni un servicio de `compose.test.yaml` que lo ejecute | Fijar el comando (p. ej. `node dist/unlock-user.js <nombre>`) y añadir un servicio efímero `cmd` (perfil `setup`, `app_rw`, `pin_pepper`, nombre/PIN por secreto). Testing añade el caso a la suite `containers` | baja |
| T-42 | software-engineer (developer) | HU-01/CA-N01; `docs/ux/wireframes/01-login.md` "Reglas de PIN" (tabla total, 2.1d) | UX pide un unitario de la tabla `PinRule` → texto, pero no hay subruta de `@mi-app/web` en §3.1 | Añadir a §3.1 `@mi-app/web/pin-messages` con `pinRuleMessage(rule: string): string` (o el nombre que se elija; se cambia el import del test) | baja |
| T-43 | software-engineer | HU-01/CA-F09 (barra); `docs/arquitectura.md` §7 (temporizador de 60 s del hub) | La escritura periódica de `last_activity_at` cada 60 s es un temporizador real de la instancia, no del `Clock`: en integración solo se puede probar esperando 60 s reales, y es lo que protege a la barra tras un reinicio brusco de `app` | Permitir fijar el intervalo en `AppDeps` (p. ej. `kitchenActivityIntervalMs?`, por defecto 60 000) o aceptar que se verifica solo en Etapa 3 (reinicio de `app` con la cola abierta). Mientras, se prueban el cierre y la reconexión | baja |

Además, §4.5 recoge las **interpretaciones** vigentes: I-01..I-10 confirmadas
o corregidas por el PO (1.1f), I-11, I-12 pendientes de T-19 y T-20, e
I-13..I-16 (1.7i) confirmadas por el PO en la 1.7k y verificadas en la 1.7m.

### 14.7 Hallazgos y decisiones de la tarea 2.2b (HU-01)

| ID | Responsable | Criterio / archivo | Problema | Propuesta | Severidad |
|---|---|---|---|---|---|
| D-2.2-04 | testing (resuelto) | `integration/api/HU-01-dispositivo.int.test.ts`, RS-06 | **Error del test, no ambigüedad**: `fallosDesde(IP_A, 1, …)` usaba siempre la primera víctima y el 6.º fallo de esa cuenta es `423` (HU-01/CA-F06: "cuando intenta un sexto"). | Corregido: la víctima rota en cada llamada (`inicio`). Mismas aserciones. | — |
| D-2.2-05 | testing (resuelto) | `integration/api/HU-01-verify-pin.int.test.ts`, bloqueo de 15/60 min fabricado | **Error del test, no ambigüedad**: CA-F09 y `docs/arquitectura.md` §7 (`now >= last_activity_at + 15 min`, sin tolerancia) dan `401 idle` tras 15 min sin peticiones; con una sesión de 60 min de bloqueo la sesión no puede seguir viva sin actividad. | Corregido: el reloj avanza en pasos de 10 min con `GET /auth/me` (permitido con PIN provisional). Mismas aserciones. | — |
| T-44 | testing | `tests/support/bd-admin.ts`, `HU-01-comandos-cli.int.test.ts` | Intermitencia en la suite completa: (a) `DROP DATABASE … WITH (FORCE)` falla con "permission denied to terminate process" porque el proceso del servidor de una conexión de `app_rw` recién cerrada aún no ha salido; (b) una vez, `create-initial-manager` dio `1` en la segunda ejecución (sin causa visible). Cada fichero pasa solo. | (a) `borrarBd` reintenta 5 s ante ese error (una fuga real sigue fallando); (b) el test muestra ahora el `stderr` si vuelve a ocurrir. Pendiente de confirmar con más ejecuciones. | baja |
| T-45 | developer | RS-26 E, SEC-045 (g); `apps/web` (`zod` 4, sonda de JIT del *bundle*: `const l = Function; new l("")` en `assets/index-*.js`) | Cada carga de página provoca una violación de CSP `script-src` (`eval`) en Chromium y WebKit; zod la captura y sigue sin JIT, pero el navegador la registra (consola y `securitypolicyviolation`). Con la CSP de RS-26 (sin `unsafe-eval`) es el comportamiento esperado de zod 4. | Desactivar el JIT antes del primer uso de zod: `z.config({ jitless: true })` en el arranque de `apps/web` (y no añadir `unsafe-eval` a la CSP). Verificar con `sh tests/run.sh e2e HU-01-csp`. | media |
| T-46 | testing, infrastructure | e2e / a11y; `deploy/proxy/Caddyfile`, Toxiproxy | En 3 de ~9 ejecuciones con 3 *workers*, la primera carga de P-01 de algún test queda en blanco > 5 s: no sale ninguna petición a `/auth/me` y el CSS aparece sin terminar. 40 cargas secuenciales: siempre 200–500 ms. | Sin causa confirmada (¿arranque simultáneo de 3 Chromium con `proxy` a 0,5 CPU?). Testing prueba con `E2E_WORKERS=1` y `proxy` con más CPU; no se ha subido el *timeout* de 5 s para no ocultarlo. | media (ruido en la puerta) |
| T-47 | testing | `tests/run.sh`, `tests/playwright.config.ts` | Mejoras de infraestructura de pruebas necesarias para ejecutar: filtro por suite, *digests* por defecto (Playwright, Toxiproxy, k6), partes de e2e con artefactos propios (las series borraban las capturas y el informe de la anterior), `SSL_CERT_FILE` de k6 y `URL` en k6. | Hecho. | — |

### 14.8 Hallazgos y decisiones de la tarea 2.8a (HU-01)

Tests de los hallazgos bajos que quedan de HU-01, escritos antes de que el
developer los corrija (2.8b). Ficheros y resultados: §10 (HU-01) y §12.

| ID | Responsable | Criterio / archivo | Problema | Propuesta / decisión | Severidad |
|---|---|---|---|---|---|
| T-48 (el fallo intermitente que la tarea 2.8 llama T-46; **no** es la página en blanco del T-46 de §14.7) | developer (`apps/web/src/realtime/events.ts`, `apps/web/src/session/store.ts`); software-engineer y cybersecurity si se toca el `Set-Cookie` de `/events` | HU-01/CA-N06 (y CA-F09 con SEC-039); `tests/e2e/HU-01-iniciar-sesion.e2e.ts:396`, `tests/e2e/HU-01-caducidad-carrera.e2e.ts` | **Fallo de la app, no del test.** Cuando el flujo SSE y `GET /auth/me` descubren la caducidad a la vez (el despertar de una tablet tras caducar la sesión: `tick` y `watchdog` se disparan juntos), el `watchdog` reabre el `EventSource`. Su `401` lleva `Set-Cookie: __Host-sid=; Max-Age=0`, y un `EventSource` no puede leer el cuerpo (`details.reason`). `es.onerror` (estado `CLOSED`) llama a `onRejected` → `loadMe` → otro `GET /auth/me` que ya sale **sin cookie**: su `401` no trae `details`, `bannerFromDetails(undefined)` da `null` y `end(null)` vuelve a P-01 **sin banner**. La respuesta del primer `GET /auth/me` (la que sí trae `reason: absolute`) llega después y `abortAll()` la descarta. Evidencia: traza de la ejecución `…112804-6e633733` (peticiones: `me` cancelada, `events` cancelada, `me` `401`, sin ningún `details`) y, con latencias aleatorias inyectadas, el cuerpo del `401` de `/auth/me` es `{"error":{"code":"UNAUTHENTICATED","message":"Sesión no válida","requestId":…}}` en todos los fallos revisados (10 bitácoras). WebKit lo muestra más porque su primer `GET /auth/me` va por una conexión HTTP/1.1 nueva y tarda más que el de HTTP/2. | Cualquiera de estas (el test `HU-01-caducidad-carrera.e2e.ts` las acepta todas): (1) `onRejected` no lanza un segundo `GET /auth/me` si ya hay uno en curso: espera su resultado (una sola petición de estado de sesión a la vez); (2) un `401` sin `details` recibido por una petición que no trae cookie no decide el banner mientras haya otra con cookie pendiente; (3) el servidor no envía `Set-Cookie` de borrado en el `401` de `GET /events` (cambia el contrato de §5 «todo `401` con cookie lleva el de borrado»: decisión del software-engineer y de cybersecurity). | media-baja (se pierde el motivo, no la seguridad; intermitente en la puerta) |
| T-48b | testing (resuelto: es un efecto del propio fallo) | `tests/support/e2e/base.ts` (vigilante de CSP), WebKit | En el fallo de CA-N06 el vigilante registra además `style-src-elem bloqueó inline` (`origen ?:5:30`, muestra vacía) y «Refused to apply a stylesheet». **No es de la app**: aparece **después** del fallo del `expect` (traza: `expect` agota 5 s a 50701 ms, la consola a 50793 ms) y solo cuando el test falla en WebKit (10 de 10 con captura de fallo; 0 de 3 con `screenshot: 'off'`, 3 de 3 siguen fallando por el banner). Es la hoja de estilo que Playwright inyecta en WebKit para hacer la captura `only-on-failure`. | Sin cambios en el test ni en la CSP. Al corregir T-48 desaparece junto con el fallo. Si molestara, el vigilante podría ignorar las violaciones posteriores al fallo, pero no se hace (no se debilita sin aprobación del PO). | — |
| D-2.5-01 (resuelto: texto fijado) | developer | `apps/web/src/features/login/ChangePinScreen.tsx` (`label={pinLabel(isManager)}`), H-2.3-04 | La etiqueta del campo de PIN es la misma en los 3 pasos. Texto definido con la propuesta de `docs/ux/revision.md` §2.3 (H-2.3-04): paso 1 «PIN actual (provisional)», paso 2 «PIN nuevo (4 a 6 dígitos)» (camarero y barra) o «PIN nuevo (6 dígitos)» (encargado), paso 3 «Repite el PIN nuevo». | `tests/README.md` §5 y `ETIQUETAS_CAMBIO_PIN` (`tests/support/e2e/pantallas.ts`). El texto del paso sigue en `role="status"` y en `aria-describedby`. UX debe confirmarlo en la 2.8c. | baja |
| D-2.8-01 (contrato) | developer | `LoginScreen.tsx` («Cargando usuarios…»), H-2.3-07, H-2.6-02 | El estado «Cargando» sigue siendo solo texto. `docs/ux/design-system.md` §5.12 y el wireframe 01 piden esqueleto con la forma del contenido (4 tarjetas). | Contrato en `tests/README.md` §5: 4 × `data-testid="esqueleto-usuario"` con `aria-hidden`, mismo tamaño y columna que una tarjeta real (2 px), «Cargando usuarios…» en `role="status"`, sin alerta ni tarjetas reales. `data-testid` porque el esqueleto no tiene rol accesible (es decorativo). | baja |
| D-2.8-02 (contrato) | developer | barra superior en `/resumen` a 375 px, H-2.6-01 | El `h1` «Resumen del día» ocupa 2 líneas y la barra mide 121 px frente a 113 px. | El test mide **líneas** (`Range.getClientRects`) y altura de la barra (±1 px) en las 5 pantallas del encargado; sirve `white-space: nowrap` con elipsis o un título visible más corto a <= 767 px (las dos propuestas de UX). | baja |
| D-2.13-01 (contrato) | developer | `apps/web/src/ui/components.tsx` (`ScreenTitle`), `apps/web/src/ui/app.css`, H-2.8c-01 | A ≤ 767 px el `h1` de «Resumen del día» muestra «Resumen del …» (`scrollWidth` 176 > `clientWidth` 175 a 375 px y 120 a 320 px) y no existe ningún `span.sr-only` en el `h1` de «Resumen del día» ni de «Acceso denegado». | Contrato en `tests/README.md` §5 (fila «Barra superior: título corto a ≤ 767 px»): `<h1>Resumen<span class="sr-only"> del día</span></h1>` y `<h1>Acceso<span class="sr-only"> denegado</span></h1>`, `.sr-only` real (1 × 1 px, sin `display:none`) solo en `@media (max-width: 767px)`. Comprobado que los tests no son vacíos: con la solución simulada (SPA parcheada en una imagen derivada fuera del repo) pasan los 24; con `display:none` fallan 12 (el `h1` pierde su nombre accesible); sin ocultación visual fallan 12 (el `span` no mide 1 × 1 px). | baja |
| D-2.8-03 | testing | `tests/support/app.ts`, `tests/support/sse.ts` | El hasher espía no medía simultaneidad y el cliente SSE no exponía cabeceras. | `HasherEspia` gana `enCurso`, `maxSimultaneas` y `reiniciarSimultaneas()`; `ClienteSse` gana `headers`. No cambia ninguna aserción anterior. | — |

Comprobación de que las regresiones SEC-039..042 no son vacías: con 5 defectos
inyectados a mano en una copia del árbol (fuera del repositorio), 19 de los 24
tests nuevos fallan (§12). Una regla de texto más amplia que la de SEC-042
(C1, espacios Unicode: D-2.5-03 c del software-engineer) no está cubierta a
propósito: los tests solo fijan los caracteres de control C0 y DEL.
