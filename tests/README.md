# tests/ — Suite de pruebas (Testing)

Estrategia completa: `docs/testing.md`. Este fichero es el **contrato con el
Developer**, aceptado por el Software Engineer con ajustes en la tarea 2.1c
(`docs/arquitectura.md` §2.1, §3.1, §5, §5.2, §7, §10.1, §17; la arquitectura
manda si algo difiere): nombres de módulos, rutas de import, dependencias de `buildApp` y
selectores de la interfaz que usan los tests. Los tests se escribieron **antes**
de la implementación (Etapa 2, tarea 2.1, HU-01) y fallarán hasta que exista.

Si el Developer necesita otro nombre o forma, **no cambia el test**: lo avisa a
Testing, que ajusta el punto único de adaptación (ver "Puntos de adaptación")
sin tocar las aserciones. Las aserciones solo cambian si cambia una historia,
la arquitectura o un wireframe, y con la aprobación del Product Owner si eso
relaja lo que se comprueba.

## Cómo se ejecuta

Siempre en contenedores, con `tests/run.sh` (nunca `pnpm`/`node`/`npx` en el
host, `docs/infraestructura.md` §7.1):

```sh
sh tests/run.sh unit            # Vitest, sin red
sh tests/run.sh integration     # Vitest + buildApp(FakeClock) + PostgreSQL efímero
sh tests/run.sh e2e             # Playwright contra proxy -> app -> db (incluye las series con PIN erróneo y con cortes de red)
sh tests/run.sh a11y | visual   # axe / capturas para UX (tests/screenshots/HU-01/)
sh tests/run.sh perf            # k6 (Etapa 3; en Etapa 2 solo control rápido)
sh tests/run.sh containers      # TX-CONT-01/02 en el host sobre la pila en marcha (y el aviso del registro de escaneo)
GATE=1 sh tests/run.sh <suite>  # ejecución de PUERTA: aborta si APP_IMAGE no tiene registro de escaneo vigente (ver abajo)
sh tests/run.sh trazabilidad    # cruza criterios de las historias con los títulos de los tests
sh tests/run.sh all             # orden de docs/testing.md §7.4
sh tests/run.sh integration integration/api/HU-01-login   # un fichero (filtro de Vitest)
sh tests/run.sh visual -g "P-01"                          # filtro de Playwright (a11y | visual)
```

Variables: ver la cabecera de `tests/run.sh`. Desde la 2.2b:

- **Vitest 4.1.12** (versión exacta, SEC-044: `pnpm audit` sin `--prod` da 0
  vulnerabilidades) y scripts `test:unit|integration|security` con
  `--configLoader runner`. Sigue haciendo falta con la 4.1.12: sin él Vitest
  empaqueta el `vitest.*.config.ts` y lo escribe en
  `tests/node_modules/.vite-temp`, que el ejecutor monta en `ro`
  (`ENOENT … mkdir '/workspace/tests/node_modules/.vite-temp'`, D-2.2-01).
- **Playwright** se lanza con `node tests/node_modules/@playwright/test/cli.js`
  (no `npx`: el ejecutor no tiene red, D-2.2-02) y **3 workers** por defecto
  (`E2E_WORKERS`; con 12 Chromium cae con `Target crashed`, D-2.2-03).
- **Imágenes por digest con valor por defecto** (verificadas con
  `podman image inspect`): `PLAYWRIGHT_IMAGE` = `v1.65.1-noble`
  (`sha256:766137e2…`, la del lockfile) y `TOXIPROXY_IMAGE` = 2.12.0
  (`sha256:a3e24437…`). Siguen siendo obligatorios `APP_IMAGE`
  (`sh deploy/app/construir.sh`) y, para `perf`, `K6_IMAGE`.

### Registro de escaneo aprobado y `GATE=1` (SEC-052 punto 3, tarea 2.11a)

`sh deploy/app/construir.sh` escanea app, db y proxy y, si todo pasa, escribe
`~/.local/state/mi-app/escaneos/aprobadas/<digest-app>`. Desde la 2.11a,
`tests/run.sh` lo **lee** (nunca lo escribe ni lo borra) con
`tests/containers/tx-cont-03.sh` en toda suite que usa `APP_IMAGE`
(`integration`, `security`, `e2e`, `a11y`, `visual`, `perf`, `containers`;
con `all`, una sola vez). Comprueba (§6.11 y §6.12 de `docs/seguridad.md`,
requisitos (a)–(h)):

1. `APP_IMAGE` es `localhost/mi-app@sha256:<64 hex>` y existe el registro de ese digest.
2. `app=` es exactamente `APP_IMAGE`; la imagen existe y ninguno de sus nombres lleva `-sucio` ni `-rechazada`.
3. `fecha` de hace como mucho **7 días** y no futura.
4. `etiqueta` sin `-sucio`/`-rechazada` e igual a los 12 primeros caracteres de `commit` (40 hex); `arbol_limpio=si`.
5. El commit existe y es `HEAD` o un antecesor.
6. `excepciones_sha256` coincide con el de `deploy/app/trivyignore.yaml` + `deploy/scan/trivyignore-proxy.yaml` **en ese commit** y en el árbol actual.
7. `db=` y `proxy=` son los digests que apuntan **hoy** `localhost/mi-app-db:19.0-alpine3.24` y `localhost/mi-app-proxy:2.11.9-alpine`.

Comportamiento (decisión de Testing): **sin `GATE`, aviso; con `GATE=1`, fallo.**

| Ejecución | Registro no vigente |
|---|---|
| `sh tests/run.sh <suite>` (trabajo diario) | informe `INCUMPLE: …` + `AVISO (SEC-052)`; la suite sigue; `resumen.txt` dice `registro_escaneo=AVISO` |
| `GATE=1 sh tests/run.sh <suite>` (puerta de Etapa 2/3 y antes de DEMO) | código 1 **antes de levantar nada**; `resumen.txt` no se escribe, queda `tests/results/<proyecto>/tx-cont-03.txt` |

Un valor de `GATE` distinto de vacío, `0` o `1` es un error (código 2). No hay
variable para cambiar los 7 días ni el directorio del registro más allá de
`SCAN_DIR`, el mismo que usa `construir.sh`. Mientras `construir.sh` no escriba
`arbol_limpio=si` (requisito (e), pendiente de infrastructure), `GATE=1`
falla siempre por ese campo: es lo que debe pasar, no se relaja la
comprobación.

## Estructura

```
tests/
├── unit/shared/          reglas puras de packages/shared (PIN, permisos, bloqueo, minutos)
├── unit/api/             parseSettings(env) de @mi-app/api/config (RS-13, §10.1)
├── unit/web/             tabla PinRule → texto de la app (propuesta T-42)
├── integration/api/      API + BD real con buildApp(deps) y FakeClock en proceso (incluye la concurrencia de RS-05b)
├── integration/realtime/ SSE (revocación, cierre del flujo)
├── security/             matriz de autorización y denegación por defecto; estático RS-16c/RS-25/RS-35 (se ejecuta con integration)
├── e2e/                  Playwright: *.e2e.ts (paralelo), *.pin.e2e.ts (serie, PIN erróneo) y *.red.e2e.ts (serie, cortes de Toxiproxy)
├── a11y/                 axe + comprobaciones de teclado/etiquetas
├── visual/               capturas 375/768/1024/1440/1920 para UX
├── performance/k6/       escenarios k6
├── containers/           TX-CONT-01 (rootless), TX-CONT-02 (excepciones y db/proxy derivadas), TX-CONT-03 (registro de escaneo), TX-CMD-01 (host)
├── support/              helpers (reloj, app, http, sse, bd, logs, métricas, semilla e2e)
├── tools/                trazabilidad
├── results/  screenshots/   SALIDA (únicas rutas en escritura desde los contenedores)
└── run.sh                punto de entrada (host)
```

## Tests que fallan a propósito (SEC-038, para el Developer)

`tests/integration/api/HU-01-concurrencia.int.test.ts` (RS-05b, SEC-045 a)
lanza ráfagas **simultáneas** (`Promise.all`) y **debe fallar mientras SEC-038
siga abierto** (tarea 2.5 del Developer). No se relajan ni se omiten; si la
forma de cumplir RS-05b es otra, se avisa a Testing. Son 4 tests:

| Test (resumido) | Debe cumplirse |
|---|---|
| 50 logins simultáneos desde una IP con PIN erróneo (50 usuarios distintos) | como mucho 10 llamadas al hasher y 10 respuestas `401`; el resto `429` |
| 50 logins simultáneos contra una cuenta desde IP distintas | como mucho 5 llamadas al hasher; el resto `423`; `failed_attempts` ≤ 5 y bloqueo de 5 min activo |
| ráfaga que lleva una cuenta de 19 fallos a `locked_manual`, con el PIN correcto al final | ese intento da `423`, sin `Set-Cookie` de sesión, 0 sesiones sin revocar |
| la misma ráfaga con `currentPin` en `POST /auth/pin` (PIN provisional) | el intento correcto da `423` (o `401` si la sesión ya estaba revocada), nunca `204`; `pin_hash` y `must_change_pin` no cambian; 0 sesiones sin revocar |

Con el código actual (`verifyPin` comprueba y luego actúa) se obtienen 50
verificaciones, ningún `429`/`423` y el PIN correcto entra (SEC-038, prueba
propia de Cybersecurity). Reproducir: `sh tests/run.sh integration
integration/api/HU-01-concurrencia`. Los demás tests de `verifyPin` (en
secuencia) pasan y no deben romperse al corregirlo.

**También en rojo hoy (T-45, Developer):** todos los `e2e/*.e2e.ts` fallan por el
vigilante de CSP (`tests/support/e2e/base.ts`): cada carga de la SPA registra una
violación `script-src` (`eval`) por la sonda de JIT de zod 4. Corrección:
`z.config({ jitless: true })` al arrancar `apps/web` (sin `unsafe-eval` en la
CSP). Se comprueba con `sh tests/run.sh e2e HU-01-csp`; sin esa violación el
resto de los e2e pasa (medido con el vigilante solo anotando: 70 + 5 + 1).

## Tests que fallan a propósito (tarea 2.8a, para el Developer en la 2.8b)

Escritos antes de la corrección (hallazgos bajos que quedan de HU-01). **No se
relajan ni se omiten**; si hace falta otra forma de cumplirlos, se avisa a
Testing. Con el código actual **fallan** (y deben pasar tras la 2.8b):

| Hallazgo | Test | Debe cumplirse |
|---|---|---|
| SEC-047 (baja, `developer`) | `integration/api/HU-01-concurrencia-nombres.int.test.ts` (4 tests) | 16 variantes `i`/`İ` (y `i`/`İ` + sigma final `σ`/`Σ`) de un nombre en paralelo desde IP distintas: como mucho 5 llamadas al hasher y el resto `423`, contador ≤ 5; con 19 fallos, una ráfaga de variantes lleva a `locked_manual` con contador ≤ 20 y el acierto da `423` sin sesión; un login (variante del nombre) y un `POST /auth/pin` de la misma cuenta nunca verifican a la vez (`maxSimultaneas` del hasher espía = 1). Corrección propuesta en `docs/seguridad.md` SEC-047: clave del cerrojo = `user:<id>` resuelto con `lower(name) = lower($1)` de PostgreSQL |
| H-2.3-04 / D-2.5-01 (baja, `developer`) | `a11y/HU-01-login.a11y.ts` › "cambio de PIN (manager\|waiter): el campo tiene una etiqueta accesible distinta en cada uno de los 3 pasos" | etiqueta del campo de PIN por paso, ver §5 (tabla "Cambio obligatorio del PIN") |
| H-2.3-07 / H-2.6-02 (baja, `developer`) | `e2e/HU-01-estados-carga.e2e.ts` (1280 px y 375 px) | esqueleto de 4 tarjetas mientras carga la rejilla, ver §5 (fila "Estado de carga de P-01") |
| H-2.6-01 (baja, `developer`) y H-2.8c-01 (baja, `developer`, 2.13b) | `e2e/HU-01-barra-superior-375.e2e.ts` | barra de 113 px (≤ 767 px) / 65 px (≥ 768 px) igual en todas las pantallas de cada rol, y título corto visible ("Resumen", "Acceso") con el título completo como nombre accesible, ver §5 (fila "Barra superior: título corto a ≤ 767 px") |

Regresiones automáticas de SEC-039..SEC-042 (D-2.5-02): **pasan** con el código
actual y deben seguir pasando (`integration/realtime/HU-01-sse-limites.int.test.ts`,
`integration/api/HU-01-no-store.int.test.ts`, `integration/api/HU-01-nombre-control.int.test.ts`).

## Contrato con el código (HU-01)

### 1. Workspace

- `tests/` es un paquete del workspace pnpm: `@mi-app/tests`
  (`tests/package.json`). El `pnpm-workspace.yaml` de la raíz debe incluir
  `apps/*`, `packages/*` y `tests` (`docs/arquitectura.md` §3).
- Nombres de paquete: `@mi-app/shared` (`packages/shared`), `@mi-app/api`
  (`apps/api`), `@mi-app/web` (`apps/web`).
- Los subpath exports que importan los tests (campo `exports` del
  `package.json` de cada paquete; pueden apuntar a `src/*.ts` o a `dist/`):

| Import | Qué debe exportar |
|---|---|
| `@mi-app/shared/pin` | `validatePin(pin: string, role: Role): { ok: true } \| { ok: false; rule: PinRule }` |
| `@mi-app/shared/permissions` | `PERMISSIONS_BY_ROLE: Record<Role, readonly string[]>` y `hasPermission(role: Role, permission: string): boolean` |
| `@mi-app/shared/lockout` | `lockoutForFailures(failedAttempts: number): { kind: 'none' } \| { kind: 'temporary'; minutes: 5 \| 15 \| 60 } \| { kind: 'manual' }` (efecto de **llegar** a ese número de fallos consecutivos) |
| `@mi-app/shared/retry` | `retryMinutes(retryAfterSeconds: number): number` (minutos redondeados hacia arriba, mínimo 1; I-03) |
| `@mi-app/api/app` | `buildApp(deps: AppDeps): Promise<FastifyInstance>` (ver §2) |
| `@mi-app/api/auth/hasher` | `createPinHasher({ pepper: Buffer \| string }): PinHasher` con `hash(pin): Promise<string>` y `verify(hash, pin): Promise<boolean>` (argon2id + *pepper*) |
| `@mi-app/api/commands` | `createInitialManager(deps: CommandDeps, input: { name: string; pin: string }): Promise<'created' \| 'skipped'>` (si el PIN no cumple las reglas de encargado rechaza con `InvalidPinError`, cuyo `rule` es el `PinRule` y cuyo mensaje no contiene el PIN; nombre de 1–30 caracteres tras recortar; `'skipped'` si existe cualquier encargado, activo o no) y `unlockUser(deps: Pick<CommandDeps, 'clock' \| 'database' \| 'logDestination'>, name: string): Promise<'unlocked' \| 'not_found'>` (acepta el `CommandDeps` completo; audita `user.unlocked` con actor `system` aunque no estuviera bloqueado). `CommandDeps = { clock, database, pinHasher, logDestination? }`. Los scripts `create-initial-manager` y `unlock-user` de la imagen son envoltorios: salen con `0` (`created`/`skipped`/`unlocked`), `2` (`not_found`) y `1` (error; stderr sin el PIN) |
| `@mi-app/api/commands/cli` | `runCommand(name: 'create-initial-manager' \| 'unlock-user', argv, io: { env, stderr, clock?, logDestination? }): Promise<0 \| 1 \| 2>` (nunca lanza; lee la configuración con `loadConfig(io.env)`; T-41) |
| `@mi-app/api/config` | `parseSettings(env): Settings` pura, `loadConfig(env?): Config` y `ConfigError` (`variable: string`). Forma fijada en `docs/arquitectura.md` §10.1 (2.1i, T-38): `Settings = { host, port, metricsPort, logLevel, publicOrigin, trustedProxies, installation: { tableCount, delayThresholdMinutes }, sessionMaxHours, database: { host, port, database, user } }`; `Config` añade `database.password`, `pinPepper?` e `initialManager?`. `TRUSTED_PROXIES` con las reglas de SEC-029 |
| `@mi-app/web/pin-messages` (T-42) | `pinRuleMessage(rule: string): string`: texto de `docs/ux/wireframes/01-login.md` "Reglas de PIN" para cada `PinRule` y "Ese PIN no es válido: elige otro" para una regla desconocida |

- `Role = 'waiter' | 'kitchen' | 'manager'`.
- `PinRule = 'digits_only' | 'length' | 'manager_length' | 'all_same' |
  'sequence' | 'repeated_block' | 'common'`. Si un PIN incumple varias, se
  devuelve **la primera en este orden** (es el orden de los mensajes de
  `docs/ux/wireframes/01-login.md`, "Reglas de PIN", que se muestran de uno en
  uno). Definiciones exactas en `docs/arquitectura.md` §7: `digits_only` (algún
  carácter no es un dígito ASCII; la cadena vacía no falla aquí), `length`
  (4–6, camarero y barra) / `manager_length` (≠ 6, encargado), `all_same`,
  `sequence` (4 o más consecutivos +1/−1 en cualquier posición, sin vuelta de
  9 a 0), `repeated_block` (el PIN entero es un bloque de 2 o 3 dígitos
  repetido ≥ 2 veces), `common` (lista de PIN prohibidos).

### 2. `buildApp(deps)` (`docs/arquitectura.md` §2.1)

```ts
interface AppDeps {
  clock: { now(): Date };                 // FakeClock en los tests, SystemClock en main.ts
  database: { host: string; port: number; database: string; user: string; password: string; poolMax?: number };
  pinHasher: PinHasher;                   // solo lo recibe el módulo auth (verifyPin y hashNewPin)
  publicOrigin: string;                   // Origin aceptado en métodos que modifican (RS-24)
  trustedProxies: string[];               // IP o CIDR de proxy; solo de ellas se acepta X-Forwarded-For (RS-06)
  installation: { tableCount: number; delayThresholdMinutes: number };
  sessionMaxHours?: number;               // entero 1–12, por defecto 12 (§10.1, T-36)
  kitchenActivityIntervalMs?: number;     // temporizador del hub para la barra, entero 10–60000, por defecto 60000 (T-43)
  logDestination?: NodeJS.WritableStream; // destino de pino (por defecto stdout), misma configuración de redacción
  logLevel?: string;
  onRoute?: (route: { method: string | string[]; url: string; config?: unknown }) => void; // primer hook onRoute
}
```

- Devuelve la instancia de Fastify **sin** llamar a `listen` (los tests usan
  `inject()` con `remoteAddress` y, para SSE, `listen({ port: 0, host: '127.0.0.1' })`).
- Valida sus dependencias con la misma validación que `parseSettings`: fuera
  de rango (p. ej. `sessionMaxHours` 0, 13 o 1.5) **rechaza** la promesa, antes
  de abrir el pool. `trustedProxies` (reglas de SEC-029, p. ej. `['uniquelocal']`
  no) y `kitchenActivityIntervalMs` fuera de 10–60000 rechazan con
  `ConfigError` cuya `variable` es el nombre del campo.
- Decorador `metricsText(): Promise<string>`: texto Prometheus de un
  `Registry` **propio de la instancia** (dos instancias en el mismo proceso no
  se mezclan ni fallan). Los contadores de `docs/logging.md` §6.3 existen a 0
  desde el arranque (RS-47).
- Prefijo de la API: `/api/v1`.
- Cada ruta declara en `config` **exactamente uno** de: `{ permission: '<permiso>' }`,
  `{ public: true }` (solo `POST /auth/login` y `GET /auth/login-options`) o
  `{ internal: true }` (`/healthz`, `/readyz`). Una ruta sin ninguno responde
  `403 FORBIDDEN` (denegación por defecto). RS-17 lo comprueba registrando en
  proceso, antes de `ready()`, una ruta sin `config` en la instancia devuelta
  (el hook de RBAC tiene que aplicarse a todo el contexto raíz).
- Hasher: `verifyPin` es la única que llama a `verify`; `hashNewPin(pin, role)`
  valida con `validatePin` **antes** de llamar a `hash` (los tests cuentan las
  llamadas con un hasher espía).
- Contadores por IP y por sesión, y el temporizador del hub SSE
  (`kitchenActivityIntervalMs`), **en memoria de la instancia** (se detienen en
  `onClose`). El hub escribe con la hora del `Clock` y solo en sesiones de
  barra no revocadas ni caducadas cuyo usuario sigue siendo barra.
- Todo *pool* creado desde `DatabaseDeps` fija `search_path=public` en la
  conexión (el test hace `ALTER DATABASE … SET search_path = trampa` en el clon).

### 3. Formato de errores (`docs/arquitectura.md` §5)

- `{ error: { code, message, requestId, details? } }`.
- Tiempo de espera (`423 LOCKED`, `429 TOO_MANY_ATTEMPTS`):
  **`error.details.retryAfterSeconds`** (entero ≥ 1, redondeado hacia arriba)
  y cabecera `Retry-After` con el mismo valor. `423 ACCOUNT_LOCKED_MANUAL` no
  lleva ninguno de los dos. `reintentarEn()` de `tests/support/http.ts` lo
  comprueba en cada uso.
- `400` de validación: `error.code = 'VALIDATION_FAILED'` y
  `error.details.issues: { path: (string | number)[]; rule: string }[]`
  (ruta de zod; los índices de *array* son números, p. ej.
  `["lines", 3, "quantity"]`). PIN nuevo (`pin` de alta/restablecimiento,
  `newPin`): una incidencia por campo con el `PinRule` que falla primero. El
  resto: `required`, `type`, `format`, `enum`, `min`, `max`, `min_length`,
  `max_length`, `not_allowed`, `invalid_json` (con `path: []`). Ningún error
  repite el valor recibido (RS-31).
- `401 UNAUTHENTICATED` para toda petición sin sesión válida. Si la cookie es
  de una sesión que existió: `details.reason` ∈ `idle`, `absolute`, `revoked`
  y, con `revoked`, `details.revokedReason` ∈ `logout`, `user_disabled`,
  `pin_reset`, `pin_changed`, `account_locked_manual`. Sin cookie o con un
  token desconocido o mal formado, sin `details` y el mismo cuerpo salvo
  `requestId` (`esperar401()` en `tests/support/http.ts`, que compara
  `details` con `toEqual`). Si la petición traía `__Host-sid`, el `401` lleva
  exactamente `Set-Cookie: __Host-sid=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`
  (también el `204` del logout); sin cookie, ningún `Set-Cookie`.
  El login fallido es `401 INVALID_CREDENTIALS` (§5.1).
- `403 FORBIDDEN` (RBAC) sin `details`; `403 ORIGIN_NOT_ALLOWED` (`Origin`
  ausente o distinto de `publicOrigin` en `POST/PUT/PATCH/DELETE`); `415
  UNSUPPORTED_MEDIA_TYPE`. Los demás `403` tienen su código
  (`PIN_CHANGE_REQUIRED`, `PIN_INVALID`, `USER_DISABLED`…).
- **Orden fijo**: `Origin` → sesión → PIN provisional → permiso → `415`/`400`
  (cuerpo y zod) → *handler*. La matriz de autorización lo comprueba (sin
  `Origin` → `403` antes que `401`; rol sin permiso con cuerpo inválido →
  `403`, no `400`/`415`).
- Inactividad (`docs/arquitectura.md` §7, T-37): caducada si
  `now >= last_activity_at + 15 min`, sin tolerancia; `last_activity_at` se
  escribe en cada petición que cuenta y, para `kitchen` con la cola abierta,
  al cerrarse el flujo SSE y cada 60 s. Caducidad absoluta:
  `now >= expires_at`, `expires_at = created_at + sessionMaxHours`.
- `session.revoked` lleva `reason` con los mismos valores que `revokedReason`.
- `X-Activity: passive` (valor exacto, SEC-030): todas las comprobaciones de
  sesión, sin escribir `last_activity_at`, en cualquier ruta (también
  `POST /session/activity`). Otro valor = activa.
- `404 NOT_FOUND` (RS-18, T-40, SEC-031): toda ruta o método no declarado bajo
  `/api/` (también barra final y `OPTIONS`, con cualquier cuerpo), igual para
  todos, sin `details`, sin `Set-Cookie`, sin BD y sin renovar la actividad.
  Fuera de `/api/`, un método que no es `GET`/`HEAD` → `404`, no `index.html`.
- `POST /auth/pin` sin PIN provisional → `403 FORBIDDEN` antes del cuerpo
  (T-39), con cualquier cuerpo o sin él.

### 4. Base de datos (`docs/arquitectura.md` §4.1)

Los tests leen y fabrican estado con los nombres de columna de §4.1
(`users.failed_attempts`, `locked_until`, `locked_manual`, `must_change_pin`,
`pin_hash`, `pin_digits`, `active`; `sessions.token_hash`, `created_at`,
`last_activity_at`, `expires_at`, `revoked_at`, `user_id`; `audit_log.action`,
`actor_id`, `entity_id`). Si cambian, se ajusta solo `tests/support/bd.ts` y
`tests/support/fixtures.ts`. Hasta que exista HU-07 (`POST /staff`), los
usuarios de prueba se insertan en `users` con el hash de `createPinHasher`.

### 5. Interfaz (selectores accesibles que usan los E2E)

| Elemento | Selector |
|---|---|
| P-01 paso 1 | encabezado "¿Quién eres?"; una tarjeta por usuario, `button` cuyo nombre accesible contiene el nombre y el rol ("Camarero", "Barra", "Encargado"); botón "Escribir mi usuario" que abre un campo con etiqueta "Usuario" y un botón "Continuar" |
| P-01 paso 2 | texto "Hola, <nombre> (<rol>)"; campo con etiqueta visible "PIN (4 a 6 dígitos)" o "PIN (6 dígitos)" (encargado): un `input type="password" inputmode="numeric"` (los puntos son su representación); teclas `button` "0".."9", "Borrar", "Entrar"; "Cambiar de usuario" |
| Mensajes | dentro de un elemento `role="alert"`, con los textos exactos de `docs/ux/wireframes/01-login.md` |
| Cambio obligatorio del PIN | encabezado "Cambia tu PIN"; mismo campo y teclado; botones "Siguiente" y "Guardar PIN". **Etiqueta accesible propia del campo de PIN en cada paso** (H-2.3-04, D-2.5-01; texto fijado en la 2.8a a partir de `docs/ux/revision.md` §2.3; `getByLabel(texto, { exact: true })` devuelve un único elemento visible): paso 1 **"PIN actual (provisional)"**; paso 2 **"PIN nuevo (4 a 6 dígitos)"** (camarero y barra) o **"PIN nuevo (6 dígitos)"** (encargado); paso 3 **"Repite el PIN nuevo"**. Ya no existe en estas pantallas la etiqueta genérica "PIN (4 a 6 dígitos)" / "PIN (6 dígitos)" (sigue siendo la de P-01 paso 2). El texto del paso ("Paso 2 de 3 · PIN nuevo") se mantiene en `role="status"` y en `aria-describedby`. Constantes: `ETIQUETAS_CAMBIO_PIN` en `tests/support/e2e/pantallas.ts` |
| Estado de carga de P-01 (H-2.3-07, H-2.6-02; `design-system.md` §5.12, wireframe 01) | mientras `GET /auth/login-options` está pendiente: **4 elementos `data-testid="esqueleto-usuario"`** con `aria-hidden="true"`, visibles, en la misma rejilla que las tarjetas reales y con el mismo ancho, alto y columna de inicio que una tarjeta real (tolerancia 2 px, a 1280 y a 375 px); el texto "Cargando usuarios…" sigue en un `role="status"` (visible si la espera pasa de 1 s); sin `role="alert"` ni tarjetas reales. Al llegar la respuesta desaparecen el esqueleto y el texto de carga |
| Barra superior: título corto a ≤ 767 px (H-2.6-01, **H-2.8c-01**; `design-system.md` §5.11 y **§5.11.1**, commit c09ee50) | **Contrato para el developer.** A ≤ 767 px el `h1` va en una sola línea (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`, esta última solo como red de seguridad) y muestra el título corto; el resto del título completo está en un `<span class="sr-only">` DENTRO del `h1`, con el espacio inicial, para que el DOM tenga siempre el título completo: `<h1 …>Resumen<span class="sr-only"> del día</span></h1>` y `<h1 …>Acceso<span class="sr-only"> denegado</span></h1>`. Los demás títulos ("Pedidos", "Cola", "Menú", "Personal") no llevan `span`. `.sr-only` = `position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0,0,0,0); clip-path:inset(50%); white-space:nowrap; border:0`, **solo dentro de `@media (max-width: 767px)`**; prohibidos `display:none`, `visibility:hidden` y `hidden` (quitan el texto del nombre accesible). A ≥ 768 px el `span` se ve como texto normal (título completo). Los contadores ("· 7") siguen fuera del `h1`. El `<title>` y el foco al `h1` no cambian. **Qué mide `e2e/HU-01-barra-superior-375.e2e.ts`** (encargado: Pedidos, Cola, Menú, Personal, Resumen; camarero: Pedidos y "Acceso denegado" en `/menu`, `/personal`, `/resumen`, `/cola`; barra: Cola y "Acceso denegado" en `/pedidos`, `/menu`, `/personal`, `/resumen`; a 375, 320, 768 y 1280 px; Chromium y WebKit; nombres de usuario cortos, p. ej. "Ana3f2a1 · Camarero"): **(1)** `getByRole('heading', { level: 1, name: '<título completo>', exact: true })` encuentra 1 elemento (y es el único `h1`) y su `textContent` es exactamente el título completo; **(2)** a ≤ 767 px la concatenación del `textContent` de los hijos del `h1` sin la clase `sr-only`, con `.trim()`, es el título corto ("Resumen", "Acceso", y el propio título en los demás) y el texto renderizado no contiene "…"; **(3)** `h1.scrollWidth <= h1.clientWidth`; **(4)** `h1` de altura ≤ 1,5 × `line-height` y texto visible en 1 sola fila (`Range.getClientRects` de los hijos sin `sr-only`); **(5)** la barra (`banner`) mide **113 px** a 375 y 320 px y **65 px** a 768 y 1280 px (±0,5), igual en todas las pantallas del rol (±1 px), sin desplazamiento horizontal del documento; **(6)** a ≤ 767 px el `span.sr-only` existe (en "Resumen" y "Acceso"), con `display` ≠ `none`, `visibility: visible`, sin `hidden`, 1 × 1 px y el resto del título como texto; a ≥ 768 px el texto visible (`innerText`) es el título completo y el `span` no mide 1 × 1; **(7)** `<title>` = "<título completo> · Café · Toma de pedidos" en todos los anchos. En "Acceso denegado" comprueba además `AccesoDenegado.comprobar` (foco en el `h1`, textos, enlace, único texto "Acceso denegado" y es el `h1`). **Los tests localizan las pantallas por nombre accesible exacto** (`BarraSuperior.titulo()`, `AccesoDenegado.titulo()`), nunca por el texto visible a ≤ 767 px; la altura se mide con `getBoundingClientRect` y las líneas con `Range.getClientRects` sin contar el `sr-only` |
| Barra superior | título de la pantalla en el único `h1`: "Pedidos", "Cola" (el contador de la cola va fuera del `h1`), "Menú", "Personal", "Resumen del día"; texto "<nombre> · <rol>"; botón "Cerrar sesión"; para el encargado, botón "Gestión" con las opciones "Cola de barra", "Menú", "Personal", "Resumen del día" (`menuitem` o `link`) |
| Pantallas vacías de HU-01 (`/menu`, `/personal`, `/resumen`) | su `h1` y el texto "Esta pantalla todavía no está disponible." hasta que llegue su historia |
| Aviso de inactividad | "Tu sesión se cerrará en 60 s por inactividad" con botón "Seguir conectado" |
| Banner de P-01 por motivo | `role="status"` en el paso 1 con el texto de `docs/ux/wireframes/01-login.md` "Vuelta al inicio de sesión" según `details.reason`/`revokedReason` del `401` o `reason` de `session.revoked` (`BANNER_POR_MOTIVO` en `tests/support/e2e/pantallas.ts`); sin banner con `logout`; un `401` **sin `details`** (petición que salió sin cookie porque el `401` del flujo SSE ya la borró y su cuerpo no se puede leer) da el banner `absolute` si el cliente sabe que la caducidad absoluta de su sesión (`me.session.expiresAt`, hora del servidor) ya ha pasado, y **ningún banner** si la sesión sigue vigente (decisión 2.8d de T-48; `e2e/HU-01-caducidad-carrera.e2e.ts`); desaparece al elegir usuario |
| "Acceso denegado" (`docs/ux/wireframes/10-acceso-denegado.md`) | `h1` "Acceso denegado" (único elemento visible con ese texto; recibe el foco), textos "No tienes permiso para ver esta pantalla." y "Si la necesitas, pide al encargado que revise tu rol.", título del documento "Acceso denegado · Café · Toma de pedidos" y un enlace `getByRole('link', { name: 'Ir a Pedidos' })` (camarero y encargado, → `/pedidos`) o `getByRole('link', { name: 'Ir a la cola' })` (barra, → `/cola`). La URL no cambia. Solo para `403 FORBIDDEN`; los demás `403` tienen su propio mensaje |
| Cambio de PIN con `423 LOCKED` (T-30) | en el `role="alert"`: "Cuenta bloqueada. Espera X min." y "No se ha cambiado el PIN."; los tres PIN vacíos; teclado y "Guardar PIN" deshabilitados durante la cuenta atrás |
| Rutas de la SPA (`docs/arquitectura.md` §5.2) | `/` (P-01), `/pedidos` (P-02), `/cola` (P-05), `/menu` (P-09), `/personal` (P-10), `/resumen` (P-11). Una ruta sin permiso muestra "Acceso denegado" y no carga datos de esa función; un `403 FORBIDDEN` en una pantalla montada la sustituye por "Acceso denegado" y recarga `GET /auth/me` |

### 6. Entorno de los ejecutores (lo pide Testing a Infrastructure, hallazgos T-28/T-29)

| Variable | Ejecutor | Uso |
|---|---|---|
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME` | integration, e2e | BD de la pila efímera |
| `DATABASE_APP_USER`, `DATABASE_APP_PASSWORD_FILE` | integration, e2e | `app_rw`: la app en proceso y los constructores de datos |
| `DATABASE_ADMIN_USER`, `DATABASE_ADMIN_PASSWORD_FILE`, `DATABASE_TEMPLATE` | integration | `test_admin` (solo TESTING, `CREATEDB`, se conecta a `postgres`) y `app_template` migrada por `migrate-template`: cada fichero de integración clona su BD (`tests/support/bd-fichero.ts`) y RS-09 una por test (`bdAislada`). Ya no hay `app_owner` ni `DATABASE_USER` en el ejecutor |
| `PIN_PEPPER_FILE` | e2e | el mismo *pepper* de la `app` de esa ejecución, para sembrar usuarios hasta que exista HU-07 (por la red `db-seed`, con `app_rw`; k6 no tiene BD: la semilla de perf la hace `runner-e2e`) |
| `BASE_URL`, `DIRECT_URL`, `TOXIPROXY_API` | e2e | ya en `compose.test.yaml` (salvo `TOXIPROXY_API`, por defecto `http://toxiproxy:8474`) |
| `RESULTS_DIR` | todos | subcarpeta de `tests/results/` de esta ejecución (la fija `run.sh`) |

Reglas de la pila TESTING que afectan a los tests (`docs/infraestructura.md` §6, §9.1):
- `PUBLIC_ORIGIN=https://toxiproxy:8443` (= `BASE_URL`). Una petición que
  modifica enviada a `DIRECT_URL` (`https://proxy:8443`) con su propio
  `Origin` recibe `403 ORIGIN_NOT_ALLOWED`: los tests que usen `DIRECT_URL`
  deben mandar `Origin: https://toxiproxy:8443` o usar solo `GET`.
- `TRUSTED_PROXIES` es solo la IP de `proxy` en la red `proxy-app`: lo que
  llega a `app` por `backend` no es de confianza y su `X-Forwarded-For` se
  ignora. La integración prueba RS-06 en proceso, con su propio
  `trustedProxies`.
- Conexiones: `app_rw` tiene un límite de 20, compartido por `app`, la app en
  proceso (`poolMax` 4), los constructores (`max` 2) y los comandos (`poolMax`
  4). Los ficheros de integración van en serie (`fileParallelism: false`);
  no se activan en paralelo sin recalcularlo con Infrastructure. `test_admin`
  tiene 4: se usa un `Client` por operación.
- `DROP DATABASE … WITH (FORCE)` no puede cerrar conexiones de `app_rw`:
  `cerrar()` de `montarApp` cierra primero el pool de los constructores,
  después la app (su pool) y por último borra la BD. Un `DROP` que falla es una
  fuga de conexiones del test o de la app.

## Puntos de adaptación (si el Developer elige otros nombres)

| Cambio | Único fichero que se toca |
|---|---|
| Firma o nombre de `buildApp`, `createPinHasher`, decorador de métricas | `tests/support/app.ts` |
| Formato de errores, `retryAfterSeconds`, cookie | `tests/support/http.ts` |
| Columnas de `users`/`sessions` | `tests/support/bd.ts`, `tests/support/fixtures.ts`, `tests/support/e2e/semilla.ts` |
| Selectores de P-01 y barra superior, textos de UX, banners, "Acceso denegado" | `tests/support/e2e/pantallas.ts` |
| Rutas de la SPA | `tests/support/e2e/pantallas.ts` |
| Textos de las reglas de PIN | `tests/support/textos.ts` |
| Ayudas de `@mi-app/api/config` (`ConfigError`) | `tests/support/config.ts` |
| Servicio y forma de invocar los comandos en la imagen (T-41) | `tests/containers/tx-cmd-01.sh` (`TX_CMD_SERVICE`, `TX_CMD_PREFIJO`) |
| BD por fichero, clon de la plantilla | `tests/support/bd-fichero.ts`, `tests/support/bd-admin.ts` |

## Historias en alcance

`tests/support/alcance.ts` lista las historias que ya se han empezado en la
Etapa 2. Los casos que dependen de rutas de historias posteriores (p. ej.
HU-01/CA-F10 necesita `POST /orders` y `POST /payments`; las filas de la matriz
de autorización de HU-02..HU-08) se ejecutan cuando su historia entra en la
lista. Testing la actualiza al empezar cada historia; no es un mecanismo para
saltarse tests fallidos.

## Comprobaciones de seguridad que no son de comportamiento (SEC-045)

- **Estático** (`tests/security/estatico.sec.test.ts`, detectores en
  `tests/support/estatico.ts`, suite `security`): RS-16c (solo
  `apps/api/src/modules/auth` importa `argon2`; el `PinHasher` solo lo nombran
  `modules/auth/*` y las raíces de composición `app.ts`, `main.ts`,
  `commands/index.ts` y `commands/cli.ts`, y estas solo se lo pasan a
  `createAuthModule`; solo `verify-pin.ts` llama a `hasher.verify/hash`), RS-25
  (ni `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
  `document.write`, `eval`, `new Function` ni `setTimeout("cadena")` en
  `apps/web`) y RS-35 (ni `sql.raw|lit|ref|id|table`, ni `.raw(`, ni plantillas
  con `${}` o concatenación de SQL fuera de la etiqueta `sql`` en `apps/api`).
  Cada regla se prueba también con fragmentos sintéticos (defecto → detectado;
  comentarios y código correcto → sin hallazgos). **Si una regla da un falso
  positivo con código legítimo, el Developer lo comunica a Testing**: se ajusta
  el detector, no se desactiva. No usan BD (corren en el ejecutor de integración).
- **CSP en e2e** (RS-26 E): los `*.e2e.ts` importan `test` de
  `tests/support/e2e/base.ts`, que falla el test si el navegador registra una
  violación de CSP (`securitypolicyviolation` o mensaje de consola de CSP). Los
  tests que crean su contexto con `browser.newContext()` usan `vigilarCsp`.
  `e2e/HU-01-csp.e2e.ts` comprueba que la CSP de RS-26 llega y que el vigilante
  detecta una violación provocada.
- **SEC-032 con respuesta retrasada** (`e2e/HU-01-sec032-retraso.e2e.ts`): el
  latido y la reconexión del SSE de la sesión vieja quedan retenidos 3 s, hay un
  login nuevo en ese intervalo y, al entregarse la respuesta vieja (401 con la
  cookie de borrado), la cookie nueva sigue y `GET /auth/me` da `200`.

## Cortes de red en E2E

El proxy `app` de Toxiproxy lo comparten todos los navegadores. Los tests que
lo cortan van en `*.red.e2e.ts` (proyecto `serie-red`, un worker), que
`tests/run.sh` ejecuta solo, después de los demás.

## Presupuesto de fallos de PIN en E2E

Todos los navegadores de Playwright salen de la misma IP: 10 fallos en 10 min
activarían HU-01/CA-F11 para el resto de la suite. Los E2E con PIN erróneo van
en `*.pin.e2e.ts` (proyecto `serie-pin`, un worker) y los bloqueos se fabrican
en BD. HU-01 gasta **4** fallos reales por ejecución (CA-F05 x2, CA-F12 (b),
CA-F13). El mensaje del `429` por dispositivo se comprueba con la respuesta
interceptada (`route.fulfill`); la regla del servidor, en integración.
