# Permisos — Roles, RBAC y mínimo privilegio

> Responsables: Cybersecurity (con Developer). Versión de Etapa 1, 2026-11-21.
> Fuentes: `docs/historias/` (HU-01..HU-08), `docs/arquitectura.md` §5 y §7,
> ADR-003, ADR-005, `docs/seguridad.md` (decisiones §6 y hallazgos SEC-xxx).
> **Pendiente:** revisión conjunta con Developer al empezar la Etapa 2. La
> fuente ejecutable será `packages/shared/permissions.ts`; si difiere de este
> documento, manda este documento hasta que ambos se corrijan.
>
> Los elementos marcados **[SEC-xxx]** dependen de un hallazgo abierto que aún
> no está incorporado a historias/arquitectura.

## 1. Roles

| Rol (código) | Persona | Propósito | Dispositivo típico |
|---|---|---|---|
| `waiter` — Camarero/cajero | Lucía | Tomar, modificar, cancelar (en "Pendiente") y cobrar pedidos; marcar agotados | Tablet 10", TPV |
| `kitchen` — Barra/cocina | Javi | Ver la cola y cambiar el estado de preparación. **No ve importes** | Pantalla fija 15"+ |
| `manager` — Encargado | Marta | Todo lo anterior + menú, personal, anulaciones, aprobaciones, ajustes y resumen | Cualquiera, PC |
| `system` (no es un rol de usuario) | Operador del host | Comandos `create-initial-manager` y `unlock-user`; actor en auditoría | Host, `podman exec` sin root |

Estados de cuenta que **restringen** cualquier rol (se evalúan antes del RBAC):

| Estado | Efecto |
|---|---|
| Sin sesión | Solo rutas públicas (§3.1) |
| `active = false` | No puede iniciar sesión (`403 USER_DISABLED` solo con PIN correcto); sesiones revocadas |
| Bloqueada (`locked_until` o bloqueo indefinido) | No puede iniciar sesión ni aprobar (`423`) |
| `must_change_pin = true` | Solo `POST /auth/pin`, `GET /auth/me`, `POST /auth/logout` (`403 PIN_CHANGE_REQUIRED` en el resto, incluido SSE) |

## 2. Principios

1. **Denegación por defecto:** una ruta sin permiso declarado no se registra
   (test RS-17). La lista pública es cerrada (§3.1).
2. **Autoridad en el servidor:** la UI usa la matriz solo para ocultar opciones.
3. **Mínimo privilegio:** `kitchen` no tiene ningún permiso de pedidos fuera de
   la preparación ni recibe importes; `waiter` no gestiona menú, personal,
   ajustes ni informes; las acciones que mueven dinero hacia atrás (anular) o
   cambian identidades solo las hace `manager`, con PIN reconfirmado [SEC-007].
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
`confirmPin` del propio encargado [SEC-007] · (K) respuesta con serializador
sin importes.

### 3.1 Rutas públicas (sin sesión)
| Ruta | Notas |
|---|---|
| `POST /auth/login` | Límite por IP y bloqueo por usuario (`docs/seguridad.md` §6.1). Exige `Origin` correcto |
| `GET /auth/login-options` [SEC-005] | Solo `[{name, role}]` de usuarios activos; `no-store`; límite por IP |

`GET /healthz` no es público: solo lo usa el `HEALTHCHECK` dentro del
contenedor y Caddy no lo reenvía.

### 3.2 Rutas con sesión

| Permiso | Ruta(s) | W | K | M | Historia | Condiciones |
|---|---|---|---|---|---|---|
| `session:self` | `POST /auth/logout`, `GET /auth/me` | ✓ | ✓ | ✓ | HU-01 | Permitidas también con PIN provisional |
| `session:self` | `POST /auth/pin` | ✓ | ✓ | ✓ | HU-07 | Exige `currentPin`; regla de PIN por rol; revoca las demás sesiones del usuario |
| `session:self` | `POST /session/activity` | ✓ | ✓ | ✓ | HU-01 | Máx. 1/min |
| `events:subscribe` | `GET /events` | ✓ | ✓ (K) | ✓ | HU-03, HU-05 | Máx. 2 flujos por sesión |
| `menu:read` | `GET /menu` | ✓ | ✓ (K, sin precios) | ✓ | HU-02, HU-05 | |
| `settings:read` | `GET /settings` | ✓ | ✓ | ✓ | HU-02, HU-03 | Sin datos sensibles |
| `product:set_availability` | `PATCH /products/:id/availability` | ✓ | ✗ | ✓ | HU-05 | Solo el campo `available` |
| `menu:manage` | `POST/PATCH/DELETE /categories…`, `POST/PATCH /products…`, `PUT /menu/order` | ✗ | ✗ | ✓ | HU-05 | Cambio de precio auditado |
| `order:read` | `GET /orders?status=open`, `GET /orders/:id`, `GET /tables/:n/open-orders` | ✓ | ✗ | ✓ | HU-02, HU-04 | Todos los pedidos del local (no solo los propios): es un requisito de sala |
| `order:create` | `POST /orders` | ✓ | ✗ | ✓ | HU-02 | Precios del servidor; `id` de otro dueño → `409` sin datos |
| `order:modify` (añadir) | `PATCH /orders/:id/lines` `add` | ✓ | ✗ | ✓ | HU-06 | Solo `status = open` |
| `order:modify` (quitar/reducir, `prep = pending`) | `PATCH /orders/:id/lines` `remove/change` | ✓ | ✗ | ✓ | HU-06 | |
| `order:modify` (quitar/reducir, `prep ∈ in_progress, ready`) | ídem | **A** | ✗ | ✓ | HU-06 | El encargado con sesión propia no necesita aprobación |
| `order:cancel` (`prep = pending`) | `POST /orders/:id/cancel` | ✓ | ✗ | ✓ | HU-06 | Motivo obligatorio |
| `order:cancel` (`prep ∈ in_progress, ready`) | ídem | **A** | ✗ | ✓ | HU-06 | |
| `kitchen:read` | `GET /kitchen/queue` | ✗ | ✓ (K) | ✓ (K) | HU-03 | Sin importes para nadie en esta ruta |
| `kitchen:transition` | `POST /orders/:id/prep`, `POST /orders/:id/kitchen-ack` | ✗ | ✓ | ✓ | HU-03 | Transición validada; `undo_ready` ≤ 30 s |
| `payment:create` | `POST /payments` | ✓ | ✗ | ✓ | HU-04 | Importe del servidor; `expectedTotalCents` |
| `payment:read` | `GET /payments/:id/ticket` | ✓ | ✗ | ✓ | HU-04 | |
| `payment:void` | `POST /payments/:id/void` | ✗ | ✗ | ✓ **P** | HU-04 | Motivo ≥ 5 caracteres; cobro completo |
| `staff:read` | `GET /staff` | ✗ | ✗ | ✓ | HU-07 | Nunca devuelve `pin_hash`, `failed_attempts` ni datos de sesión |
| `staff:manage` | `POST /staff`, `PATCH /staff/:id` (nombre, rol, activo) | ✗ | ✗ | ✓ **P** | HU-07 | `409 LAST_MANAGER`; promoción a encargado con PIN < 6 → `must_change_pin` |
| `staff:manage` | `POST /staff/:id/reset-pin` | ✗ | ✗ | ✓ **P** | HU-07 | Revoca sesiones del usuario |
| `staff:unlock` [SEC-001] | `POST /staff/:id/unlock` | ✗ | ✗ | ✓ **P** | HU-07 | Pone el contador a 0; auditado |
| `settings:manage` | `PATCH /settings` | ✗ | ✗ | ✓ | HU-02, HU-03 | |
| `reports:read` | `GET /reports/daily` | ✗ | ✗ | ✓ | HU-08 | Últimos 90 días |
| `reports:close` | `POST /reports/daily/:date/closing` | ✗ | ✗ | ✓ | HU-08 | Inmutable; `409` si ya cerrado |
| `telemetry:write` (M-03) | `POST /telemetry` | ✓ | ✓ | ✓ | — | Condiciones de `docs/seguridad.md` §6.3 (RS-43); no cuenta como actividad |
| `approval:grant` | (campo `managerApproval` en las rutas marcadas **A**) | ✗ | ✗ | ✓ | HU-06 | Cuenta para el bloqueo del encargado |

**Cambio respecto a `docs/arquitectura.md` §7:** se separan `staff:read`,
`staff:unlock`, `reports:close`, `settings:read`, `session:self`,
`events:subscribe` y `telemetry:write` para que cada ruta tenga un permiso explícito (necesario
para RS-17). La matriz de la arquitectura queda como resumen.

### 3.3 Comandos de host (`system`)
| Comando | Quién | Condiciones |
|---|---|---|
| `create-initial-manager` | Operador del host | Solo si no hay ningún encargado; PIN provisional de 6 dígitos; el secreto se borra después |
| `unlock-user <nombre>` [SEC-001] | Operador del host | Para el caso de que el único encargado esté bloqueado; auditado como `system` |

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
| Límite por origen | 10 fallos/10 min por IP → `429` 10 min; 5 aprobaciones fallidas/10 min por sesión → `429` |
| MFA | No en el MVP (ver `docs/seguridad.md` §6.1.8); compensado por red restringida, bloqueo y reconfirmación de PIN |
| Token de sesión | 256 bits CSPRNG; cookie `__Host-sid`, `HttpOnly; Secure; SameSite=Strict; Path=/`, sin caducidad persistente; en BD solo SHA-256 |
| Inactividad | 15 min (camarero, encargado). Rol `kitchen`: sin caducidad por inactividad mientras el SSE está abierto |
| Caducidad absoluta | 12 h para todos; configurable solo a la baja |
| Revocación | Logout, desactivación, restablecimiento de PIN, cambio de PIN propio (resto de sesiones), caducidad. Cambio de rol: cierra SSE, no revoca |
| Reautenticación | `confirmPin` en anular cobro y escrituras de Personal [SEC-007] |
| Rotación del PIN | No se fuerza caducidad periódica (no aporta con bloqueo + red restringida). Cambio obligatorio si se sospecha que se ha visto y al dar de baja a un empleado que pudo conocer el PIN del encargado |

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
| `settings` | ✓ | ✗ | ✓ | ✗ |
| `categories`, `products` | ✓ | ✓ | ✓ | ✗ (se archivan/desactivan) |
| `daily_counters` | ✓ | ✓ | ✓ | ✗ |
| `orders`, `order_lines` | ✓ | ✓ | ✓ | ✗ (cancelar/eliminar = marcar) |
| `payments` | ✓ | ✓ | solo `voided_at`, `voided_by`, `void_reason` | ✗ |
| `payment_orders` | ✓ | ✓ | solo `voided` | ✗ |
| `cash_closings` | ✓ | ✓ | ✗ | ✗ |
| `audit_log` | ✓ | ✓ | ✗ | ✗ (+ trigger que rechaza `UPDATE/DELETE` para cualquiera) |

Sin `TRUNCATE`, `REFERENCES` ni `TRIGGER` para `app_rw` en ninguna tabla.
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

## 8. Contenedores y host

### 8.1 Contenedores (`docs/reglas-equipo.md` §3)

| Servicio | Usuario | Capacidades | Raíz | Montajes | Red | Puertos publicados |
|---|---|---|---|---|---|---|
| `proxy` | UID ≥ 1000 | ninguna (`cap-drop=ALL`, `no-new-privileges`) [SEC-009] | solo lectura | `Caddyfile` (ro), volumen `/data` (rw, 0700), `/config` tmpfs o volumen | `edge` + `internal` | 8080, 8443 (o 80/443 en PROD, §6.2d de seguridad) |
| `app` | `nonroot` (65532) | ninguna | solo lectura, `/tmp` tmpfs | solo secretos | `internal` | ninguno |
| `migrate` | `nonroot` (65532) | ninguna | solo lectura | solo su secreto | `internal` | ninguno |
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
