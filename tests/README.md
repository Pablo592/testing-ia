# tests/ — Suite de pruebas (Testing)

Estrategia completa: `docs/testing.md`. Este fichero es el **contrato con el
Developer**: nombres de módulos, rutas de import, dependencias de `buildApp` y
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
sh tests/run.sh e2e             # Playwright contra proxy -> app -> db (incluye la serie con PIN erróneo)
sh tests/run.sh a11y | visual   # axe / capturas para UX (tests/screenshots/HU-01/)
sh tests/run.sh perf            # k6 (Etapa 3; en Etapa 2 solo control rápido)
sh tests/run.sh containers      # TX-CONT-01 en el host sobre la pila en marcha
sh tests/run.sh trazabilidad    # cruza criterios de las historias con los títulos de los tests
sh tests/run.sh all             # orden de docs/testing.md §7.4
```

Variables: ver la cabecera de `tests/run.sh`.

## Estructura

```
tests/
├── unit/shared/          reglas puras de packages/shared (PIN, permisos, bloqueo, minutos)
├── integration/api/      API + BD real con buildApp(deps) y FakeClock en proceso
├── integration/realtime/ SSE (revocación, cierre del flujo)
├── security/             matriz de autorización y denegación por defecto (se ejecuta con integration)
├── e2e/                  Playwright: *.e2e.ts (paralelo) y *.pin.e2e.ts (serie, PIN erróneo)
├── a11y/                 axe + comprobaciones de teclado/etiquetas
├── visual/               capturas 375/768/1024/1440/1920 para UX
├── performance/k6/       escenarios k6
├── containers/           TX-CONT-01 (host)
├── support/              helpers (reloj, app, http, sse, bd, logs, métricas, semilla e2e)
├── tools/                trazabilidad
├── results/  screenshots/   SALIDA (únicas rutas en escritura desde los contenedores)
└── run.sh                punto de entrada (host)
```

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
| `@mi-app/api/commands` | `createInitialManager(deps: CommandDeps, input: { name: string; pin: string }): Promise<'created' \| 'skipped'>` (rechaza con error si el PIN no cumple las reglas de encargado) y `unlockUser(deps: CommandDeps, name: string): Promise<'unlocked' \| 'not_found'>`. `CommandDeps = { clock, database, pinHasher, logDestination? }` (mismos tipos que `AppDeps`). Los scripts `create-initial-manager` y `unlock-user` de la imagen son envoltorios de estas funciones |

- `Role = 'waiter' | 'kitchen' | 'manager'`.
- `PinRule = 'digits_only' | 'length' | 'manager_length' | 'all_same' |
  'sequence' | 'repeated_block' | 'common'`. Si un PIN incumple varias, se
  devuelve **la primera en este orden** (es el orden de los mensajes de
  `docs/ux/wireframes/01-login.md`, "Reglas de PIN", que se muestran de uno en
  uno). `digits_only`: algún carácter no es un dígito ASCII. `length` (fuera
  de 4–6) solo se usa para camarero y barra; para el encargado, cualquier
  longitud distinta de 6 es `manager_length`.

### 2. `buildApp(deps)` (`docs/arquitectura.md` §2, §12)

```ts
interface AppDeps {
  clock: { now(): Date };                 // FakeClock en los tests, SystemClock en main.ts
  database: { host: string; port: number; database: string; user: string; password: string; poolMax?: number };
  pinHasher: PinHasher;                   // solo lo recibe verifyPin (y el alta/cambio para hashear)
  publicOrigin: string;                   // Origin aceptado en métodos que modifican (RS-24)
  trustedProxies: string[];               // IP de proxy; solo de ellas se acepta X-Forwarded-For (RS-06)
  installation: { tableCount: number; delayThresholdMinutes: number };
  logDestination?: NodeJS.WritableStream; // destino de pino (por defecto stdout), misma configuración de redacción
  logLevel?: string;
  onRoute?: (route: { method: string | string[]; url: string; config?: unknown }) => void; // se registra como primer hook onRoute
}
```

- Devuelve la instancia de Fastify **sin** llamar a `listen` (los tests usan
  `inject()` con `remoteAddress` y, para SSE, `listen({ port: 0, host: '127.0.0.1' })`).
- Decorador `metricsText(): Promise<string>` en la instancia: texto Prometheus
  del registro de esa instancia (el mismo que sirve `:9464/metrics`). Los
  contadores de `docs/logging.md` §6.3 existen a 0 desde el arranque (RS-47).
- Prefijo de la API: `/api/v1`.
- Cada ruta declara en `config` **uno** de: `{ permission: '<permiso>' }`,
  `{ public: true }` (solo `POST /auth/login` y `GET /auth/login-options`) o
  `{ internal: true }` (`/healthz`, `/readyz`). Lo comprueba RS-17.
- Contadores por IP y por sesión **en memoria de la instancia** (cada test crea
  su instancia y empieza limpio).

### 3. Formato de errores (`docs/arquitectura.md` §5)

- `{ error: { code, message, requestId, details? } }`.
- Tiempo de espera (`423 LOCKED`, `429 TOO_MANY_ATTEMPTS`):
  **`error.details.retryAfterSeconds`** (entero, segundos) y, además, cabecera
  `Retry-After` con el mismo valor.
- `400` de validación: `error.code = 'VALIDATION_FAILED'` y
  `error.details.issues: [{ path: string[], rule: string }]`; para los PIN,
  `rule` usa los códigos de `PinRule`. Ningún error repite el valor de un campo
  `/pin/i` (RS-31).
- Sesión inválida, revocada o caducada: `401` (el código concreto no se
  comprueba).

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
| Cambio obligatorio del PIN | encabezado "Cambia tu PIN"; mismo campo y teclado; botones "Siguiente" y "Guardar PIN" |
| Barra superior | título de la pantalla en un `h1` ("Pedidos", "Cola"…); texto "<nombre> · <rol>"; botón "Cerrar sesión"; para el encargado, botón "Gestión" con las opciones "Cola de barra", "Menú", "Personal", "Resumen del día" (`menuitem` o `link`) |
| Aviso de inactividad | "Tu sesión se cerrará en 60 s por inactividad" con botón "Seguir conectado" |
| Rutas de la SPA (propuesta, ver hallazgo T-31) | `/` (P-01), `/pedidos` (P-02), `/cola` (P-05), `/menu` (P-09), `/personal` (P-10), `/resumen` (P-11). Una ruta sin permiso muestra "Acceso denegado" y no carga datos de esa función |

### 6. Entorno de los ejecutores (lo pide Testing a Infrastructure, hallazgos T-28/T-29)

| Variable | Ejecutor | Uso |
|---|---|---|
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME` | integration, e2e | BD de la pila efímera |
| `DATABASE_APP_USER`, `DATABASE_APP_PASSWORD_FILE` | integration, e2e | `app_rw`: la app en proceso y los constructores de datos |
| `DATABASE_ADMIN_USER`, `DATABASE_ADMIN_PASSWORD_FILE`, `DATABASE_TEMPLATE` | integration | rol solo de TESTING con `CREATEDB` y BD plantilla migrada, para los casos que necesitan una BD sin encargados (RS-09) |
| `PIN_PEPPER_FILE` | e2e | el mismo *pepper* de la `app` de esa ejecución, para sembrar usuarios hasta que exista HU-07 |
| `BASE_URL`, `DIRECT_URL`, `TOXIPROXY_API` | e2e | ya en `compose.test.yaml` (salvo `TOXIPROXY_API`, por defecto `http://toxiproxy:8474`) |
| `RESULTS_DIR` | todos | subcarpeta de `tests/results/` de esta ejecución (la fija `run.sh`) |

## Puntos de adaptación (si el Developer elige otros nombres)

| Cambio | Único fichero que se toca |
|---|---|
| Firma o nombre de `buildApp`, `createPinHasher`, decorador de métricas | `tests/support/app.ts` |
| Formato de errores, `retryAfterSeconds`, cookie | `tests/support/http.ts` |
| Columnas de `users`/`sessions` | `tests/support/bd.ts`, `tests/support/fixtures.ts`, `tests/support/e2e/semilla.ts` |
| Selectores de P-01 y barra superior | `tests/support/e2e/pantallas.ts` |
| Rutas de la SPA | `tests/support/e2e/pantallas.ts` |

## Historias en alcance

`tests/support/alcance.ts` lista las historias que ya se han empezado en la
Etapa 2. Los casos que dependen de rutas de historias posteriores (p. ej.
HU-01/CA-F10 necesita `POST /orders` y `POST /payments`; las filas de la matriz
de autorización de HU-02..HU-08) se ejecutan cuando su historia entra en la
lista. Testing la actualiza al empezar cada historia; no es un mecanismo para
saltarse tests fallidos.

## Presupuesto de fallos de PIN en E2E

Todos los navegadores de Playwright salen de la misma IP: 10 fallos en 10 min
activarían HU-01/CA-F11 para el resto de la suite. Los E2E con PIN erróneo van
en `*.pin.e2e.ts` (proyecto `serie-pin`, un worker) y los bloqueos se fabrican
en BD. HU-01 gasta **4** fallos reales por ejecución (CA-F05 x2, CA-F12 (b),
CA-F13). El mensaje del `429` por dispositivo se comprueba con la respuesta
interceptada (`route.fulfill`); la regla del servidor, en integración.
