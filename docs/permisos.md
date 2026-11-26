# Permisos — Roles, RBAC y mínimo privilegio

> Responsables: Cybersecurity (con Developer). Versión de Etapa 1, 2026-11-21;
> revisión 1.4b, 2026-11-23 (rutas de la revisión 1.3b del SE, §3.4; HU-09
> fuera del MVP por decisión del humano); revisión 1.4c, 2026-11-23 (ajuste a
> la revisión 1.3c del SE: `verifyPin`, `POST /auth/pin` solo para el PIN
> provisional, sin tabla ni eventos de ajustes, UID 1000:1000; T-20);
> revisión 2.1k, 2026-11-24 (decisiones del SE de la 2.1i: `404` de rutas
> inexistentes para todos (T-40, SEC-031), borrado de la cookie en el `401`
> (SEC-032) y peticiones pasivas (SEC-030), §3.2 y §5).
> Fuentes: `docs/historias/` (HU-01..HU-08), `docs/arquitectura.md` §5 y §7,
> ADR-003, ADR-005, `docs/seguridad.md` (decisiones §6 y hallazgos SEC-xxx).
> **Pendiente:** revisión conjunta con Developer al empezar la Etapa 2. La
> fuente ejecutable será `packages/shared/permissions.ts`; si difiere de este
> documento, manda este documento hasta que ambos se corrijan.
>
> Los elementos marcados **[SEC-xxx]** o **[T-xx]** dependen de un cambio que aún
> no está en historias/arquitectura. En 1.4c SEC-016, SEC-021 y SEC-022 ya
> están incorporados (se quitan sus marcas). Queda **[T-20]**: el límite por
> sesión solo para aprobaciones (`docs/seguridad.md` §6.3, dictamen T-20),
> pendiente de que el SE lo pase a `docs/arquitectura.md` §7 y ADR-005.

## 1. Roles

| Rol (código) | Persona | Propósito | Dispositivo típico |
|---|---|---|---|
| `waiter` — Camarero/cajero | Lucía | Tomar, modificar, cancelar (en "Pendiente") y cobrar pedidos; marcar agotados | Tablet 10", TPV |
| `kitchen` — Barra/cocina | Javi | Ver la cola y cambiar el estado de preparación. **No ve importes** | Pantalla fija 15"+ |
| `manager` — Encargado | Marta | Todo lo anterior + menú, personal, anulaciones, aprobaciones y resumen (los ajustes de HU-09 no están en el MVP) | Cualquiera, PC |
| `system` (no es un rol de usuario) | Operador del host | Comandos `create-initial-manager` y `unlock-user`; actor en auditoría | Host, `podman exec` sin root |

Estados de cuenta que **restringen** cualquier rol (se evalúan antes del RBAC):

| Estado | Efecto |
|---|---|
| Sin sesión | Solo rutas públicas (§3.1) |
| `active = false` | No puede iniciar sesión (`403 USER_DISABLED` solo con PIN correcto); sesiones revocadas |
| Bloqueo temporal (`locked_until > now`) | No puede iniciar sesión (`423 LOCKED`) ni aprobar (error genérico `403 MANAGER_APPROVAL_INVALID`). Una sesión ya abierta sigue (HU-01/CA-F12), pero su `confirmPin`/`currentPin` recibe `423 LOCKED {retryAfterSeconds}` sin verificar ni contar |
| Bloqueo indefinido (`locked_manual`) | Igual que el anterior con `423 ACCOUNT_LOCKED_MANUAL`; además, al llegar a él **se revocan todas las sesiones de la cuenta**, venga el fallo de donde venga (HU-01/CA-F13) |
| `must_change_pin = true` | Solo `POST /auth/pin`, `GET /auth/me`, `POST /auth/logout` (`403 PIN_CHANGE_REQUIRED` en el resto, incluido SSE) |

## 2. Principios

1. **Denegación por defecto:** una ruta sin permiso declarado no se registra
   (test RS-17). La lista pública es cerrada (§3.1).
2. **Autoridad en el servidor:** la UI usa la matriz solo para ocultar opciones.
3. **Mínimo privilegio:** `kitchen` no tiene ningún permiso de pedidos fuera de
   la preparación ni recibe importes; `waiter` no gestiona menú, personal
   ni informes; las acciones que mueven dinero hacia atrás (anular) o
   cambian identidades solo las hace `manager`, con PIN reconfirmado (SEC-007).
4. **Separación de funciones:** acciones de riesgo de un `waiter` sobre pedidos
   ya en preparación exigen la aprobación presencial de un `manager`
   (`managerApproval`), registrada en `authorized_by`.
5. **Permisos siempre actuales:** rol y estado se leen en cada petición; un
   cambio de rol cierra el flujo SSE y aplica en la siguiente petición.
6. **Mismo mínimo privilegio fuera de la app:** usuarios de BD (§6),
   secretos (§7) y contenedores/host (§8).

## 3. Matriz rol × acción (API `/api/v1`)

Leyenda: ✓ permitido · ✗ `403 FORBIDDEN` · **A** solo con `managerApproval`
de un encargado activo, no bloqueado y sin PIN provisional · **P** exige
`confirmPin` del propio encargado (SEC-007) · (K) respuesta con serializador
sin importes.

### 3.1 Rutas públicas (sin sesión)
| Ruta | Notas |
|---|---|
| `POST /auth/login` | Límite por IP y bloqueo por usuario (`docs/seguridad.md` §6.1). Exige `Origin` correcto |
| `GET /auth/login-options` | Solo `[{name, role}]` de usuarios activos; `no-store`; comparte el límite por IP |

`GET /healthz`, `GET /readyz` y `GET /metrics` (puerto 9464) no son públicos:
Caddy responde `404` a los tres y el 9464 no se publica ni se enruta.

### 3.2 Rutas con sesión

| Permiso | Ruta(s) | W | K | M | Historia | Condiciones |
|---|---|---|---|---|---|---|
| `session:self` | `POST /auth/logout`, `GET /auth/me` | ✓ | ✓ | ✓ | HU-01 | Permitidas también con PIN provisional |
| `session:self` | `POST /auth/pin` | ✓ (solo con PIN provisional) | ✓ (ídem) | ✓ (ídem) | HU-07/CA-F04, CA-F09 | **Solo el cambio obligatorio del PIN provisional** (`must_change_pin = true`); sin PIN provisional → `403 FORBIDDEN` sin verificar nada ni sumar a ningún contador. Exige `currentPin` (pasa por `verifyPin`: contador del usuario y límite por IP; `403 PIN_INVALID`, `423 LOCKED`, `423 ACCOUNT_LOCKED_MANUAL`, `429`); regla de PIN por rol; revoca las demás sesiones del usuario. No hay cambio voluntario del PIN en el MVP |
| `session:self` | `POST /session/activity` | ✓ | ✓ | ✓ | HU-01 | Máx. 1/min |
| `events:subscribe` | `GET /events` | ✓ | ✓ (K) | ✓ | HU-03, HU-05 | Máx. 2 flujos por sesión |
| `menu:read` | `GET /menu` | ✓ | ✓ (K, sin precios) | ✓ | HU-02, HU-05 | |
| (sin permiso propio) | `GET /auth/me` → `localConfig` (configuración de instalación de solo lectura: `TABLE_COUNT`, `DELAY_THRESHOLD_MINUTES`) | W `{tableCount}` | K `{delayThresholdMinutes}` | ambos | HU-02, HU-03 | Cada rol recibe solo el valor que usa. Barra lo recibe además en `GET /kitchen/queue`. No hay evento SSE de ajustes (cambian solo con un reinicio de `app`) |
| `product:set_availability` | `PATCH /products/:id/availability` | ✓ | ✗ | ✓ | HU-05 | Solo el campo `available` |
| `menu:manage` | `POST/PATCH/DELETE /categories…`, `POST/PATCH /products…`, `PUT /menu/order` | ✗ | ✗ | ✓ | HU-05 | Cambio de precio auditado |
| `order:read` | `GET /orders/floor`, `GET /orders/:id`, `GET /tables/:n/open-orders` | ✓ | ✗ | ✓ | HU-02, HU-03, HU-04 | Todos los pedidos del local (no solo los propios): es un requisito de sala (supuesto 19). Serializador `toStaffDto` (con importes): nunca para `kitchen` |
| `order:serve` | `POST /orders/:id/serve`, `POST /orders/:id/serve/undo` | ✓ | ✗ | ✓ | HU-03 (supuesto 18) | Solo desde "Listo"; deshacer ≤ 30 s (reloj del servidor), solo la última acción y solo el usuario que la hizo; auditado |
| `order:create` | `POST /orders` | ✓ | ✗ | ✓ | HU-02 | Precios del servidor; `id` de otro dueño → `409` sin datos |
| `order:modify` (añadir) | `PATCH /orders/:id/lines` `add` | ✓ | ✗ | ✓ | HU-06 | Solo `status = open` |
| `order:modify` (quitar/reducir, `prep = pending`) | `PATCH /orders/:id/lines` `remove/change` | ✓ | ✗ | ✓ | HU-06 | |
| `order:modify` (quitar/reducir, `prep ∈ in_progress, ready, served`) | ídem | **A** | ✗ | ✓ | HU-06 | El encargado con sesión propia no necesita aprobación (HU-06/CA-F15) |
| `order:cancel` (`prep = pending`) | `POST /orders/:id/cancel` | ✓ | ✗ | ✓ | HU-06 | Motivo obligatorio |
| `order:cancel` (`prep ∈ in_progress, ready, served`) | ídem | **A** | ✗ | ✓ | HU-06 | |
| `kitchen:read` | `GET /kitchen/queue` | ✗ | ✓ (K) | ✓ (K) | HU-03 | Sin importes para nadie en esta ruta |
| `kitchen:transition` | `POST /orders/:id/prep` (`action: start \| ready \| undo`), `POST /orders/:id/kitchen-ack` | ✗ | ✓ | ✓ | HU-03 | Transición validada en servidor; `undo` solo deshace la última transición `start`/`ready` de ese pedido y en ≤ 30 s (reloj del servidor); auditado |
| `payment:create` | `POST /payments` | ✓ | ✗ | ✓ | HU-04 | Importe del servidor; `expectedTotalCents` |
| `payment:read` | `GET /payments/today`, `GET /payments/:id`, `GET /payments/:id/ticket` | ✓ (solo cobros del día de negocio actual, SEC-022) | ✗ | ✓ | HU-04 | Para W, un cobro de otro día → `404 NOT_FOUND`, la misma respuesta que un id inexistente (RS-46) |
| `payment:void` | `POST /payments/:id/void` | ✗ | ✗ | ✓ **P** | HU-04 | Motivo ≥ 5 caracteres; cobro completo |
| `staff:read` | `GET /staff` | ✗ | ✗ | ✓ | HU-07 | Nunca devuelve `pin_hash`, `failed_attempts` ni datos de sesión |
| `staff:manage` | `POST /staff`, `PATCH /staff/:id` (nombre, rol, activo) | ✗ | ✗ | ✓ **P** | HU-07 | `409 LAST_MANAGER`; promoción a encargado con PIN < 6 → `must_change_pin`. `PATCH` **sin** `confirmPin` solo si el cuerpo contiene únicamente `name` (si trae `role` o `active`, aunque no cambien, lo exige); cambio de nombre auditado con valor anterior y nuevo |
| `staff:manage` | `POST /staff/:id/reset-pin` | ✗ | ✗ | ✓ **P** | HU-07 | Revoca sesiones del usuario; reinicia contador y bloqueo |
| `staff:unlock` | `POST /staff/:id/unlock` | ✗ | ✗ | ✓ **P** | HU-07 | Pone el contador a 0 y quita `locked_until`/`locked_manual`; auditado |
| `approval:request` | `GET /staff/managers` | ✓ | ✗ | ✓ | HU-06 | Solo `[{id, name}]` de encargados **activos** (no filtra por bloqueo ni PIN provisional, para no revelar ese estado; el servidor rechaza con el error genérico) |
| `reports:read` | `GET /reports/daily` | ✗ | ✗ | ✓ | HU-08 | Últimos 90 días |
| `reports:close` | `POST /reports/daily/:date/closing` | ✗ | ✗ | ✓ | HU-08 | Inmutable; `409` si ya cerrado |
| `telemetry:write` (M-03) | `POST /telemetry` | ✓ | ✓ | ✓ | — | Condiciones de `docs/seguridad.md` §6.3 (RS-43); no cuenta como actividad |
| `approval:grant` | (campo `managerApproval` en las rutas marcadas **A**) | ✗ | ✗ | ✓ | HU-06 | Cuenta para el bloqueo del encargado elegido, el límite por IP y el de 5 fallos/10 min de la sesión que pide la aprobación |

Rutas que **no existen** en el MVP (denegación por defecto, `404`):
`GET /settings`, `PATCH /settings` (HU-09 fuera, decisión del humano
2026-11-23). [2.1k, T-40] Toda ruta o método no declarado bajo `/api/v1`
responde `404 NOT_FOUND` igual para todos (sin sesión, cualquier rol, PIN
provisional, cualquier `Origin` y cualquier cuerpo), antes de leer el cuerpo
y sin consultar la BD (`docs/seguridad.md` RS-18, SEC-031). No hay permisos `settings:*` ni tabla `settings`. Si HU-09
vuelve en otra versión: solo M, sin `confirmPin` (`docs/seguridad.md` §6.3).

**Cambio respecto a `docs/arquitectura.md` §7:** se separan `staff:read`,
`staff:unlock`, `reports:close`, `session:self`, `events:subscribe` y
`telemetry:write` para que cada ruta tenga un permiso explícito (necesario
para RS-17). La matriz de la arquitectura queda como resumen; tras la revisión
1.3c del SE ambas coinciden. La tabla esperada de RS-18 se escribe **a mano**
desde esta §3, no desde `permissions.ts` (T-18, `docs/seguridad.md` §6.3).

### 3.4 Revisión 1.4b: diferencias reportadas por el SE (`docs/estado.md`)

| # | Cambio propuesto | Dictamen | Motivo |
|---|---|---|---|
| 1a | `GET /orders/floor` sustituye a `GET /orders?status=open` (`order:read`, W y M) | **Aceptado** | Mismo permiso y mismos datos de sala; K sigue sin acceso porque la respuesta lleva importes |
| 1b | `POST /orders/:id/serve` y `/serve/undo` con permiso nuevo `order:serve` (W, M; K → 403) | **Aceptado** con condiciones de la tabla §3.2 | Supuesto 18: sala entrega, barra no; deshacer limitado a 30 s, última acción y mismo usuario |
| 1c | `GET /payments/today` y `GET /payments/:id` (`payment:read`) | **Aceptado con condición** (SEC-022) | HU-04 da a W "Cobrados hoy"; por mínimo privilegio W solo lee cobros del día actual |
| 1d | `GET /staff/managers` con permiso nuevo `approval:request` (W, M) | **Aceptado** | Necesario para elegir encargado (supuesto 22); solo `id` y `name`, nombres que ya muestra la rejilla de login; K no pide aprobaciones |
| 2 | `POST /orders/:id/prep` con `action: "undo"` en lugar de `undo_ready` | **Aceptado** | HU-03 permite deshacer "Empezar" y "Listo"; una acción genérica limitada a la última transición y a 30 s no amplía permisos |
| 3 | `GET /settings` solo M; W y K reciben su valor en `/auth/me` y `settings.updated` | **Aceptado**; **superado en 1.3c**: sin HU-09 no existen `GET/PATCH /settings`, `settings.updated` ni la tabla `settings`; queda `localConfig` filtrado por rol | Mínimo privilegio: cada rol recibe solo el dato que usa |
| 4 | Quitar/reducir y cancelar con **A** también con preparación `served` | **Aceptado** | Coincide con HU-06/CA-F03 y CA-F05: "Servido" se trata como "Listo" |
| 5 | `PATCH /staff/:id` sin `confirmPin` si solo cambia el nombre | **Aceptado con condición** | Coincide con HU-07/CA-N04. Renombrar no cambia rol, estado ni PIN; un renombrado malicioso solo obliga a corregirlo y queda auditado. Condición: la exención la decide el servidor por los campos presentes en el cuerpo (solo `name`), no por si su valor cambia |

### 3.3 Comandos de host (`system`)
| Comando | Quién | Condiciones |
|---|---|---|
| `create-initial-manager` | Operador del host | Solo si no hay ningún encargado; PIN provisional de 6 dígitos; el secreto se borra después |
| `unlock-user <nombre>` | Operador del host | Para el caso de que el único encargado esté bloqueado; auditado como `system` |

## 4. Visibilidad de datos por rol

| Dato | W | K | M |
|---|---|---|---|
| Líneas, cantidades, notas, mesa/cliente, estados | ✓ | ✓ | ✓ |
| Precios, totales, cobros, cambio, método de pago | ✓ | ✗ (ni REST ni SSE) | ✓ |
| Tickets | ✓ | ✗ | ✓ |
| Lista de personal (nombre, rol, estado) | ✗ | ✗ | ✓ |
| Hash de PIN, contadores de intentos, tokens | ✗ | ✗ | ✗ (nunca salen de la BD) |
| Auditoría | ✗ | ✗ | Solo lo que muestran HU-04/HU-08 (no hay consulta libre en el MVP) |
| Resumen y cierres | ✗ | ✗ | ✓ |

Eventos SSE: todos se serializan con el rol vigente de la sesión
(`toKitchenDto` para `kitchen`); `session.revoked`/`session.updated` solo a la
sesión afectada.

## 5. Credenciales, sesiones y tokens

| Aspecto | Política |
|---|---|
| Credencial | Usuario + PIN numérico |
| Longitud del PIN | Encargado: 6 dígitos. Camarero y barra: 4–6 |
| Composición | No todos iguales; sin secuencias ascendentes/descendentes de ≥ 4; sin bloque repetido; fuera de la lista de PIN prohibidos |
| Almacenamiento | argon2id (`m ≥ 19 MiB, t ≥ 2, p = 1`) con *pepper* fuera de la BD |
| PIN provisional | Tras alta, restablecimiento o promoción a encargado con PIN corto; obliga a cambiarlo |
| Bloqueo por usuario | 5 → 5 min; 10 → 15 min; 15 → 60 min; 20 → indefinido (desbloquea un encargado o `unlock-user`). El contador solo se reinicia con un acceso correcto o desbloqueo |
| Límite por origen | 10 fallos/10 min por IP de **cualquier verificación de PIN** (login, `managerApproval`, `confirmPin` y `currentPin`) → `429` 10 min para cualquier usuario y ruta de PIN desde esa IP, antes del hash. Por sesión: 5 aprobaciones (`managerApproval`) fallidas/10 min → `429`. **[T-20]** `confirmPin` y `currentPin` (PIN del propio titular de la sesión) no tienen límite por sesión: los acota el bloqueo de su cuenta, que se comprueba antes y responde `423` (HU-01/CA-F12) |
| MFA | No en el MVP (ver `docs/seguridad.md` §6.1.8); compensado por red restringida, bloqueo y reconfirmación de PIN |
| Token de sesión | 256 bits CSPRNG; cookie `__Host-sid`, `HttpOnly; Secure; SameSite=Strict; Path=/`, sin caducidad persistente; en BD solo SHA-256. [2.1k] Todo `401 UNAUTHENTICATED` de una petición con la cookie y el logout responden `Set-Cookie: __Host-sid=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict` (idéntico en todos los motivos); al primer `401` el cliente corta todos sus canales (peticiones, `EventSource`, temporizadores, telemetría) antes de permitir otro login (SEC-032) |
| Inactividad | 15 min (camarero, encargado). Rol `kitchen`: sin caducidad por inactividad mientras el SSE está abierto. [2.1k, SEC-030] Las peticiones con `X-Activity: passive` (las que lanza la app sin gesto del usuario) se comprueban igual pero no renuevan la actividad; las rutas inexistentes (`404`) tampoco |
| Caducidad absoluta | 12 h para todos; configurable solo a la baja |
| Revocación | Logout, desactivación, restablecimiento de PIN, cambio obligatorio del PIN provisional (el resto de sesiones del usuario), **bloqueo indefinido** (todas las sesiones de la cuenta, venga el fallo de login, aprobación, `confirmPin` o `currentPin`; HU-01/CA-F13), caducidad. Toda revocación cierra el flujo SSE y la pantalla vuelve al login en ≤ 1 s (RS-14). **[2.3, SEC-039]** La caducidad por inactividad también cierra en el servidor los flujos SSE de la sesión (salvo `kitchen` con la cola abierta), aunque no llegue ninguna petición REST. Cambio de rol: cierra SSE, no revoca |
| Reautenticación | `confirmPin` en anular cobro y escrituras de Personal (salvo cambio solo de nombre). No en HU-06 con sesión propia de encargado |
| Verificaciones de PIN | Todas pasan por la función única `verifyPin` (login, `managerApproval`, `confirmPin`, `currentPin`): cuentan para el mismo contador del usuario cuyo PIN se verifica (escala 5/10/15/20) y para el límite por IP; `managerApproval`, además, para el límite por sesión. Con la cuenta bloqueada no se calcula el hash ni se cuenta el intento. **[2.3, SEC-038]** Estos límites valen también con peticiones simultáneas: la IP reserva su cupo y la cuenta cuenta el intento **antes** del hash, y un acierto con la cuenta bloqueada en ese momento no crea sesión ni cambia el PIN (RS-05b) |
| Rotación del PIN | No se fuerza caducidad periódica (no aporta con bloqueo + red restringida). Si se sospecha que un PIN se ha visto, o al dar de baja a un empleado que pudo conocer el PIN del encargado, el encargado lo **restablece** (`reset-pin`) y el titular elige uno nuevo con el cambio obligatorio del PIN provisional (no hay cambio voluntario en el MVP) |

## 6. Usuarios de base de datos

Todos `NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS` salvo
`postgres`. Autenticación `scram-sha-256` (sin `trust`), solo desde la red
interna. `REVOKE ALL ON DATABASE … FROM PUBLIC` y `REVOKE ALL ON SCHEMA public FROM
PUBLIC`; el esquema de la aplicación (`public`, propiedad de `app_owner`, como
hace `deploy/db/initdb/10-roles.sh`). Los privilegios se conceden **explícitamente en cada
migración** (nada de `GRANT ALL`).

| Usuario | Lo usa | Privilegios | Límite de conexiones |
|---|---|---|---|
| `postgres` (superusuario) | Solo la inicialización del contenedor `db` (crear roles y BD) | Todo. Su contraseña no la recibe ningún otro contenedor | — |
| `app_owner` | Solo el contenedor efímero `migrate` | Propietario del esquema `app`: DDL y `GRANT` sobre sus objetos | 2 |
| `app_rw` | `app` (incluidos `create-initial-manager` y `unlock-user`) | Tabla siguiente | 20 |
| `app_backup` [SEC-011, SEC-015] | Tarea de copia (`pg_dump`) | `CONNECT`, `USAGE` del esquema y `SELECT` en sus tablas y secuencias; nada más | 2 |
| `monitoring` (M-05) | `postgres_exporter` (DEMO/PROD) | `pg_monitor` y `CONNECT`; ningún privilegio sobre tablas de la aplicación | 2 |

Privilegios de `app_rw` (además de `USAGE` en el esquema y en las secuencias):

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | ✓ | ✓ | ✓ | ✗ (no se borran) |
| `sessions` | ✓ | ✓ | ✓ | ✓ (solo para purgar sesiones caducadas hace > 30 días) |
| `categories`, `products` | ✓ | ✓ | ✓ | ✗ (se archivan/desactivan) |
| `daily_counters` | ✓ | ✓ | ✓ | ✗ |
| `orders`, `order_lines` | ✓ | ✓ | ✓ | ✗ (cancelar/eliminar = marcar) |
| `payments` | ✓ | ✓ | solo `voided_at`, `voided_by`, `void_reason` | ✗ |
| `payment_orders` | ✓ | ✓ | solo `voided` | ✗ |
| `cash_closings` | ✓ | ✓ | ✗ | ✗ |
| `audit_log` | ✓ | ✓ | ✗ | ✗ (+ trigger que rechaza `UPDATE/DELETE` para cualquiera) |

Sin `TRUNCATE`, `REFERENCES` ni `TRIGGER` para `app_rw` en ninguna tabla.

**Solo TESTING (T-28, revisión 2.1f de Cybersecurity, `docs/seguridad.md` §6.5).**
Única excepción a `NOCREATEDB`, que no existe en DEV, DEMO ni PROD:

| Usuario | Lo usa | Privilegios | Límite de conexiones |
|---|---|---|---|
| `test_admin` | Solo `runner-integration` de `compose.test.yaml` | `LOGIN CREATEDB`; nada más (sin `SUPERUSER`, `CREATEROLE`, `REPLICATION`, `BYPASSRLS`, sin pertenencia a otros roles, **sin `pg_signal_backend`**). Sin `CONNECT` en `cafeteria` ni en `app_template`; clona `app_template` (`IS_TEMPLATE`) y borra solo las BD que crea | 4 |

Lo crea `deploy/db/testing/20-test-admin.sh`, que solo monta
`compose.test.yaml` (condiciones `MI_APP_ENTORNO=testing` y secreto
`db_test_admin_password`). `app_template` es de `app_owner` y tiene los mismos
permisos que `cafeteria` (sin `app_backup`); la migra `migrate-template`. En
TESTING `runner-integration` usa `app_rw` + `test_admin` (ya no `app_owner`) y
`runner-e2e` usa `app_rw` desde la red `db-seed`, sin acceso a `app`. El límite
de `app_rw` (20) no se cambia en `10-roles.sh`; si TESTING necesitara más, se
sube solo en `20-test-admin.sh` con aviso a Cybersecurity.
Recomendado (defensa en profundidad, decide el SE): trigger que impida anular
un cobro ya anulado y modificar `order_lines` de pedidos `paid`.

## 7. Secretos por contenedor

Todos con `podman secret`, montados como **fichero** (`type=mount`, modo 0400,
propietario el UID del contenedor), nunca como variable de entorno ni en la
imagen, el repositorio o `docs/`.

| Secreto | `db` | `migrate` | `app` | `proxy` | Copia |
|---|---|---|---|---|---|
| Contraseña de `postgres` | ✓ (solo init) | ✗ | ✗ | ✗ | ✗ |
| Contraseña de `app_owner` | ✓ (solo init) | ✓ | ✗ | ✗ | ✗ |
| Contraseña de `app_rw` | ✓ (solo init) | ✗ | ✓ | ✗ | ✗ |
| Contraseña de `app_backup` | ✓ (solo init) | ✗ | ✗ | ✗ | ✓ |
| Contraseña de `monitoring` | ✓ (solo init) | ✗ | ✗ | ✗ | ✗ (solo `postgres_exporter`) |
| *Pepper* de PIN | ✗ | ✗ | ✓ | ✗ | ✗ (se custodia aparte) |
| Encargado inicial (nombre + PIN provisional) | ✗ | ✗ | ✓ (solo el comando; se borra después) | ✗ | ✗ |
| Clave pública de cifrado de copias | ✗ | ✗ | ✗ | ✗ | ✓ (la privada, fuera del host) |

El `uid` del secreto montado es el UID real del contenedor que lo recibe
(nunca se arregla un desajuste con modo 0444): en `app` y `migrate`,
`uid=1000,gid=1000,mode=0400` (SEC-010). En DEV y TESTING los contenedores que
montan el proyecto llevan un tmpfs vacío con `notmpcopyup` sobre
`/workspace/.secrets`, y el proyecto se monta en `ro` en todos ellos; `web` y
`deps` solo escriben en la lista de permitidos `apps/`, `packages/` y
`node_modules/`, de modo que nada de lo que se ejecuta en el host (`.git/`,
`.claude/`, `tests/run.sh`, `deploy/`, `tools/`…) es escribible desde un
contenedor (SEC-018 y SEC-023, verificados; SEC-026 para enlaces simbólicos y
herramientas del host sobre esa lista).

TESTING (efímero, secretos aleatorios de cada ejecución en `TEST_SECRETS_DIR`,
revisión 2.1f): `db` recibe además `db_test_admin_password` (solo init);
`runner-integration`, `db_app_password` y `db_test_admin_password`;
`runner-e2e`, `db_app_password` y el *pepper* de la ejecución (nunca el de
otro entorno); `runner-perf`, `runner-unit`, `runner-security` y `zap`,
ninguno. `deps` (DEV) escribe también en `tests/node_modules` (T-35), con la
misma comprobación de enlaces de SEC-026.

## 8. Contenedores y host

### 8.1 Contenedores (`docs/reglas-equipo.md` §3)

| Servicio | Usuario | Capacidades | Raíz | Montajes | Red | Puertos publicados |
|---|---|---|---|---|---|---|
| `proxy` | UID ≥ 1000 | ninguna (`cap-drop=ALL`, `no-new-privileges`; SEC-009 verificado: `CapEff` = 0) | solo lectura | `Caddyfile` (ro), volumen `/data` (rw, 0700), `/config` tmpfs o volumen | `edge` + `internal` | 8080, 8443 (o 80/443 en PROD, §6.2d de seguridad) |
| `app` | `1000:1000` numérico (`USER 1000:1000` en la imagen, `--user 1000:1000` / `User=1000` en Quadlet; no el `nonroot` 65532 de distroless) | ninguna | solo lectura, `/tmp` tmpfs | solo secretos (`uid=1000,gid=1000,mode=0400`) | `internal` | ninguno |
| `migrate` | `1000:1000` (misma imagen que `app`) | ninguna | solo lectura | solo su secreto (`uid=1000,gid=1000,mode=0400`) | `internal` | ninguno |
| `db` | UID ≥ 1000 | ninguna | solo lectura; tmpfs `/var/run/postgresql`, `/tmp` | volumen `pgdata` (rw, dueño ese UID), secretos | `internal` | ninguno |

Para todos: límites de memoria y CPU; prohibidos `--privileged`, el socket de
Podman/Docker, `--network=host` y montar directorios del sistema. La red
`internal` es `internal: true` (sin salida). `exec` siempre con el usuario de
la imagen; `exec -u root/0` o `--privileged` solo con aprobación humana.

### 8.2 Host

| Cuenta / acceso | Permisos |
|---|---|
| Usuario de servicio (p. ej. `cafe`) | Sin `sudo` ni grupos `wheel`/`sudo`/`docker`; ejecuta Podman rootless y Quadlet con `linger`; propietario de volúmenes y secretos |
| Administrador | Cuenta distinta con SSH por clave (sin contraseña, sin `root` por SSH); para operar los contenedores entra en la sesión del usuario de servicio (`machinectl shell cafe@`), nunca `sudo podman` |
| Aprovisionamiento (Terraform/cloud-init) | Único que aplica cambios con privilegios en el host: sysctl `ip_unprivileged_port_start=80` (solo host dedicado), cortafuegos, creación del usuario de servicio |
| Agentes del equipo | Solo entornos DEV/TESTING locales con Podman rootless y `podman-compose`; nunca el comando `docker` |
