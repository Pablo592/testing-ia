# Logging, métricas, alertas y health checks

> Responsable: Monitoring Engineer · Etapa 1, tarea 1.6 · Fecha: 2026-11-21
> Estado: **propuesta, pendiente de la puerta de la Etapa 1**.
> Entradas: `docs/reglas-equipo.md`, `docs/historias/` (HU-01..HU-08 y supuestos),
> `docs/arquitectura.md` (§5, §6, §10, §11), ADR-001..ADR-008,
> `deploy/dev/Containerfile`. `docs/seguridad.md` e `docs/infraestructura.md`
> aún no existían al redactar esto: cuando existan, este documento se revisa
> contra ellos. En caso de conflicto manda `docs/seguridad.md` en lo que es
> seguridad, y este documento en el formato de logs y métricas.
>
> Este documento **no implementa nada**: define el contrato que el Developer
> sigue al instrumentar y lo que Testing verifica. Los cambios que pide en la
> arquitectura están en la §10 y en `docs/estado.md`.
>
> **Revisión 1.6c (2026-11-23)**, tras las decisiones del humano y contrastada
> con `docs/seguridad.md` §6.3 y `docs/infraestructura.md` §11.1:
> - M-07: alertas por correo, horario de alertas 07:00–21:00 `Europe/Madrid`,
>   retención de logs de 30 días (90 los de seguridad), aviso a los empleados
>   (§4.6, §5.2, §6.6, §7).
> - M-06: opción **B** sin excepción a §3.4 (§5.1, §5.2, §5.3, §5.5, §6.5).
> - SEC-017: `confirmPin` y cualquier clave que case con `/pin/i` se redactan
>   (§3.2, §4.1, §4.3, §4.5).

---

## 1. Principios

1. **Un evento = una línea JSON** en stdout (stderr solo para fallos del propio
   logger o para el arranque, antes de que exista el logger). El motor de
   contenedores recoge los logs (§5). La app **no escribe ficheros de log** (es
   `--read-only`).
2. **Lista de permitidos, no de prohibidos.** Cada evento registra solo los
   campos que se definen en el catálogo (§3). Nunca se vuelca un cuerpo de
   petición, una cabecera completa, una fila de BD ni un objeto de dominio
   entero. La redacción de pino (§4.3) es la **segunda** barrera, no la primera.
3. **Seudónimos, no personas.** Al usuario se le identifica por su `user_id`
   (UUID) y su rol, nunca por su nombre. Quien necesite saber quién es el UUID
   lo consulta en la aplicación (encargado) o en la BD.
4. **Logs para diagnosticar, métricas para vigilar, `audit_log` para auditar.**
   La prueba legal o de negocio de quién cobró, anuló o cambió un precio está en
   la tabla `audit_log` (inmutable, ADR-003), no en los logs. Los logs tienen
   retención corta y pueden perderse; el `audit_log` no.
5. **Bajo volumen.** Con ~500 pedidos/día se estima ≤ 30 000 líneas/día
   (≈ 10 MB/día). No se registran los `ping` SSE ni los health checks.

---

## 2. Formato

### 2.1 Campos

Nombres en `snake_case` en **todos** los servicios propios (los logs de Caddy y
PostgreSQL tienen su formato y se normalizan en el recolector, §5.4).

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `time` | siempre | string ISO 8601 UTC con ms | `2026-11-21T09:15:02.123Z` (`pino.stdTimeFunctions.isoTime`) |
| `level` | siempre | string | `debug` \| `info` \| `warn` \| `error` (etiqueta, no número) |
| `service` | siempre | string | `app`, `migrate`, `proxy`, `db` |
| `env` | siempre | string | `dev` \| `test` \| `demo` \| `prod` |
| `version` | siempre | string | versión de la imagen / commit corto (de una variable de entorno de build) |
| `event` | siempre | string | nombre del evento del catálogo (§3), `dominio.objeto.accion` |
| `msg` | siempre | string | texto corto en español para humanos; **sin datos variables sensibles** |
| `category` | siempre | string | `http` \| `system` \| `business` \| `security` \| `realtime` \| `client` |
| `request_id` | si hay petición HTTP | string | id de correlación (§2.3) |
| `user_id` | si hay sesión | uuid | usuario autenticado (actor) |
| `role` | si hay sesión | string | `waiter` \| `kitchen` \| `manager` |
| `session_id` | si hay sesión | uuid | `sessions.id`; **nunca** el token ni su hash |
| `client_ip` | eventos `http` y `security` | string | IP del dispositivo en la red del local (§4.2) |
| `duration_ms` | si mide algo | number | duración en milisegundos, entero o con 1 decimal |
| `err` | solo `warn`/`error` con excepción | object | `{type, message, code, stack}` con el serializador de §4.4 |

Campos específicos de cada evento: los del catálogo (§3). Ids de dominio con
sufijo `_id` (`order_id`, `payment_id`, `target_user_id`...), importes con sufijo
`_cents` (ADR-006).

Se eliminan de la base de pino `pid` y `hostname` (el contenedor ya lo
identifica el recolector).

### 2.2 Ejemplos

```json
{"time":"2026-11-21T09:15:02.123Z","level":"info","service":"app","env":"prod","version":"1.0.0+3f2a1c9","category":"business","event":"order.created","msg":"Pedido creado","request_id":"6f1c2b0e-8d7a-4f51-9a43-2c1e5d7b8a90","user_id":"0b6e…","role":"waiter","session_id":"9a2d…","order_id":"5c3e…","daily_number":42,"order_type":"table","table_number":7,"line_count":3,"total_cents":740,"replay":false}
{"time":"2026-11-21T09:15:40.007Z","level":"warn","service":"app","env":"prod","version":"1.0.0+3f2a1c9","category":"security","event":"auth.login.failed","msg":"Inicio de sesión fallido","request_id":"…","client_ip":"192.168.10.23","reason":"bad_pin","target_user_id":"0b6e…","failed_attempts":3}
```

### 2.3 Correlación (`request_id`)

- Caddy genera un UUID por petición y lo envía a `app` en la cabecera
  `X-Request-Id` (placeholder `{http.request.uuid}`); también lo escribe en su
  log de acceso. Así una petición se sigue de `proxy` a `app`.
- `app` usa ese valor si es un UUID válido (solo le llegan peticiones del proxy
  por la red interna); si falta (DEV sin proxy, tests) genera uno.
  En Fastify: `genReqId` + `requestIdHeader: 'x-request-id'` +
  `requestIdLogLabel: 'request_id'`.
- `app` devuelve `X-Request-Id` en todas las respuestas y lo incluye en el cuerpo
  de error (`error.requestId`) para que la UI pueda mostrar un código de
  incidencia corto (UX decide si lo muestra).
- Correlaciones de negocio: `order_id`, `payment_id` (los UUID que genera el
  cliente, ADR-008) permiten seguir un pedido desde el envío hasta el cobro;
  `sse_conn_id` identifica una conexión SSE (§3.5).
- Trabajo fuera de una petición (temporizadores, consultas de métricas, cierre
  de flujos SSE por revocación): `request_id` ausente y, si aplica, el
  `request_id` de la petición que lo originó en `cause_request_id`.

### 2.4 Niveles

| Nivel | Cuándo | Ejemplos | Entornos donde se emite |
|---|---|---|---|
| `debug` | Detalle para depurar flujos; nunca necesario para operar | `sse.event.sent` por cada destinatario, plan de una consulta, decisión de la máquina de estados | DEV siempre; TEST/DEMO/PROD solo activándolo temporalmente (`LOG_LEVEL=debug`, reinicio) |
| `info` | Hechos normales relevantes: cada petición HTTP, cada evento de negocio, arranque/parada, login correcto, conexiones SSE | `http.request`, `order.created`, `payment.created`, `sse.connected` | todos (nivel por defecto en TEST/DEMO/PROD) |
| `warn` | Algo anómalo o potencialmente hostil que el sistema ha **gestionado** sin perder servicio; si se repite, es un problema | login fallido, bloqueo, `403`, rechazo CSRF, consulta lenta, reconexión de BD con éxito, retraso del bucle de eventos | todos |
| `error` | Fallo que **afecta** a una petición o al servicio y requiere actuación: `5xx`, excepción no controlada, BD inalcanzable, configuración inválida | `http.request.unhandled_error`, `db.connection.lost`, `config.invalid` | todos |

Reglas:
- Un error de validación del usuario (`400`, `409`, `422`, `423`) **no** es
  `error`: es `info` (o `warn` si es de seguridad). `error` implica que algo del
  sistema ha fallado.
- No se usa `fatal` ni `trace` (pino los tiene): un fallo que impide arrancar es
  `error` con `event: "app.start.failed"` y el proceso sale con código ≠ 0.
- Un mismo fallo repetido en bucle se registra con muestreo: como máximo 1 línea
  cada 10 s por `event` + causa, con `suppressed_count` de las omitidas
  (p. ej. `db.connection.lost` durante una caída de la BD).

---

## 3. Catálogo de eventos

Columnas: **evento**, nivel, campos específicos (además de los obligatorios).
Ningún evento lleva campos que no estén aquí sin actualizar este documento
(lo revisan Monitoring y Cybersecurity).

### 3.1 HTTP y sistema (`category: http | system`)

| Evento | Nivel | Campos específicos |
|---|---|---|
| `http.request` (una línea al terminar cada petición; sustituye a los logs por defecto de Fastify: `disableRequestLogging: true` + hook `onResponse`) | `info`; `error` si status ≥ 500 | `method`, `route` (plantilla: `/api/v1/orders/:id`), `status`, `duration_ms`, `res_bytes`, `client_ip`, `ua_family` (§4.2). **Sin** query string salvo en `/reports/daily` (`date`). Excluidas: `/healthz`, `/readyz`, puerto de métricas y `GET /events` (este se registra con `sse.*`) |
| `http.request.unhandled_error` | `error` | `route`, `err` |
| `http.validation.failed` (`400`) | `info` | `route`, `issues: [{path, code}]` (**sin** valores recibidos, §4.4). Alimenta la métrica de errores de formulario (§6.4) |
| `http.rate_limited` (`429`) | `warn` | `route`, `client_ip`, `limit` |
| `app.started` | `info` | `node_version`, `log_level`, `listen_port`, `metrics_port`, `config_keys` (nombres de las variables cargadas, **nunca valores**) |
| `app.ready` | `info` | `startup_ms` |
| `app.stopping` | `info` | `signal`, `open_sse_connections` |
| `app.start.failed` / `config.invalid` | `error` | `missing_keys` o `invalid_keys` (nombres, nunca valores) |
| `eventloop.lag` | `warn` | `lag_ms` (cuando el p99 de 10 s supera 200 ms; muestreado) |
| `db.query.slow` | `warn` | `query` (nombre de la consulta en el repositorio, p. ej. `orders.findOpen`), `duration_ms` (umbral 200 ms). **Nunca** SQL con valores ni parámetros |
| `db.query.failed` | `error` | `query`, `err` (con `code` SQLSTATE, sin `detail`/`parameters`) |
| `db.pool.waiting` | `warn` | `waiting`, `total`, `idle` (cuando hay peticiones esperando conexión > 1 s) |
| `db.connection.lost` / `db.connection.restored` | `error` / `info` | `downtime_ms` (en restored) |
| `db.migration.applied` / `db.migration.failed` (servicio `migrate`) | `info` / `error` | `migration`, `duration_ms`, `err` |
| `db.serialization_retry` | `warn` | `query`, `attempt` (si el Developer reintenta conflictos de transacción) |

### 3.2 Seguridad (`category: security`)

Todos llevan `client_ip` y `ua_family`. Cybersecurity puede añadir eventos en
`docs/seguridad.md`; se incorporan aquí.

| Evento | Nivel | Campos específicos |
|---|---|---|
| `auth.login.succeeded` | `info` | `user_id`, `role`, `session_id`, `provisional_credential` (bool: entra con PIN provisional; el nombre evita la subcadena `pin`, que se redacta siempre, §4.3) |
| `auth.login.failed` | `warn` | `reason`: `bad_pin` \| `unknown_user`; `target_user_id` (solo si el usuario existe), `failed_attempts` (contador tras este fallo). **Nunca** el nombre tecleado ni el PIN (§4.1) |
| `auth.login.locked` (intento con la cuenta bloqueada, `423`) | `warn` | `target_user_id`, `retry_after_s` |
| `auth.account.locked` (5.º fallo, se activa el bloqueo) | `warn` | `target_user_id`, `locked_until`, `lockouts_24h` (bloqueos de ese usuario en 24 h) |
| `auth.login.disabled_user` (`403 USER_DISABLED`) | `warn` | `target_user_id` |
| `auth.login.ip_rate_limited` | `warn` | `client_ip`, `attempts_window` |
| `auth.logout` | `info` | `user_id`, `session_id` |
| `auth.session.expired` | `info` | `user_id`, `session_id`, `reason`: `idle` \| `absolute` |
| `auth.session.revoked` | `info` | `user_id` (afectado), `session_id`, `reason`: `logout` \| `user_disabled` \| `pin_reset` \| `pin_changed`, `by_user_id` |
| `auth.session.invalid` (cookie `sid` que no corresponde a ninguna sesión válida) | `info`; `warn` si > 5 por IP en 1 min | `reason`: `not_found` \| `revoked` \| `expired` |
| `auth.pin.changed` | `info` | `user_id`, `was_provisional` |
| `auth.pin.change_failed` | `warn` | `user_id`, `reason`: `wrong_current` \| `rule_violation` (código de regla, sin el PIN) |
| `auth.must_change_pin.blocked` (ruta no permitida con PIN provisional) | `info` | `route` |
| `authz.denied` (`403 FORBIDDEN`) | `warn` | `route`, `method`, `permission` |
| `csrf.origin_rejected` | `warn` | `route`, `origin_host` (solo el host de la cabecera `Origin`) |
| `approval.granted` (PIN de encargado, HU-06) | `info` | `approver_id`, `action` (`order.lines_modified` \| `order.cancelled`), `order_id` |
| `approval.failed` | `warn` | `reason`: `bad_pin` \| `unknown_user` \| `not_manager` \| `locked` \| `disabled`; `approver_id` (si existe), `action`, `order_id` |
| `staff.created` | `info` | `target_user_id`, `role` |
| `staff.role_changed` | `warn` (un cambio de privilegios siempre se mira) | `target_user_id`, `old_role`, `new_role` |
| `staff.deactivated` / `staff.reactivated` | `info` | `target_user_id`, `sessions_revoked` |
| `staff.pin_reset` | `info` | `target_user_id`, `sessions_revoked` |
| `staff.last_manager_blocked` (`409 LAST_MANAGER`) | `info` | `target_user_id` |
| `staff.initial_manager.created` (comando `create-initial-manager`) | `warn` | `target_user_id` (se espera una sola vez en la vida del sistema) |
| `settings.changed` | `info` | `keys_changed` + valores anterior/nuevo (son números de configuración, no datos personales) |

### 3.3 Negocio: pedidos y cobros (`category: business`)

| Evento | Nivel | Campos específicos |
|---|---|---|
| `order.created` | `info` | `order_id`, `daily_number`, `order_type`, `table_number`, `line_count`, `total_cents`, `replay` (true si es un reintento idempotente, ADR-008) |
| `order.create.id_conflict` (`409`, mismo id con otro contenido) | `warn` | `order_id` |
| `order.lines_modified` | `info` | `order_id`, `version`, `added`, `changed`, `removed` (contadores), `total_cents`, `approver_id` (si hubo PIN de encargado) |
| `order.version_conflict` (`409 ORDER_VERSION_CONFLICT`) | `info` | `order_id`, `expected_version`, `current_version` |
| `order.cancelled` | `info` | `order_id`, `reason_code`, `prep_status`, `total_cents`, `approver_id`. **Nunca** `reason_text` (texto libre, §4.1) |
| `order.prep_changed` | `info` | `order_id`, `from`, `to`, `wait_s` (desde `sent_at`), `delayed` (bool: superaba el umbral) |
| `order.prep_undone` | `info` | `order_id`, `seconds_since_ready` |
| `order.invalid_transition` (`409`) | `info` | `order_id`, `action`, `current_prep_status` |
| `order.kitchen_ack` | `info` | `order_id`, `flag` |
| `payment.created` | `info` | `payment_id`, `method`, `amount_cents`, `order_ids`, `replay` |
| `payment.rejected` | `info` | `payment_id`, `reason`: `total_changed` \| `already_paid` \| `insufficient_cash` \| `order_not_open` |
| `payment.voided` | `warn` (anulación de dinero: siempre visible) | `payment_id`, `amount_cents`, `order_ids`, `method`. **Nunca** el motivo (texto libre) |
| `cash.closing.created` | `info`; `warn` si `difference_cents ≠ 0` | `business_date`, `expected_cash_cents`, `counted_cash_cents`, `difference_cents` |
| `product.availability_changed` | `info` | `product_id`, `available` |
| `product.price_changed` | `info` | `product_id`, `old_price_cents`, `new_price_cents` |
| `product.created` / `product.updated` / `category.archived` / `menu.reordered` | `info` | ids y campos cambiados (nombres de producto sí: no son datos personales) |
| `report.daily.viewed` | `info` | `business_date` |

`replay: true` y los `409` no son errores: son el diseño de idempotencia y
concurrencia funcionando. Se miden (§6.2) porque muchos indican Wi-Fi
inestable o problemas de UX.

### 3.4 Tiempo real (`category: realtime`)

| Evento | Nivel | Campos específicos |
|---|---|---|
| `sse.connected` | `info` | `sse_conn_id`, `session_id`, `user_id`, `role`, `clients_total`, `http_version` |
| `sse.disconnected` | `info` | `sse_conn_id`, `role`, `connected_s`, `reason`: `client_closed` \| `session_revoked` \| `role_changed` \| `write_error` \| `server_shutdown`, `clients_total` |
| `sse.write_failed` | `warn` | `sse_conn_id`, `event_type`, `err.code` |
| `sse.backpressure` (búfer de escritura de una conexión > 64 KiB) | `warn` | `sse_conn_id`, `buffered_bytes` |
| `sse.broadcast` | `debug` | `event_type`, `recipients`, `duration_ms` (de `COMMIT` a escrito en el último socket) |
| `sse.ping` | **no se registra** | — |

### 3.5 Cliente (`category: client`)

Solo si se aprueba el endpoint de telemetría (§10, cambio 3). El servidor los
escribe con `service: "app"`, `category: "client"` y los campos de la sesión.

| Evento | Nivel | Campos específicos |
|---|---|---|
| `client.js_error` | `error` | `screen` (P-01..P-12), `error_type`, `message` truncado a 200 caracteres y filtrado (§4.4), `app_version` |
| `client.offline` (el aviso "Sin conexión" se mostró) | `warn` | `screen`, `offline_ms` (al recuperar la conexión) |
| `client.propagation` (agregado, no por evento) | `debug` | `p50_ms`, `p95_ms`, `samples` |

Las métricas UX (pasos, abandonos, rage clicks) van solo como **contadores**,
no como líneas de log (§6.4).

---

## 4. Qué no se registra nunca y reglas de redacción

### 4.1 Prohibido en cualquier log (de cualquier servicio, de cualquier nivel)

| Dato | Por qué / dónde aparece | Regla |
|---|---|---|
| PIN (`pin`, `currentPin`, `newPin`, `confirmPin`, `managerApproval.pin`, PIN provisional de alta/restablecimiento) y, en general, **el valor de cualquier clave cuyo nombre case con `/pin/i`** (SEC-017) | HU-01, HU-06, HU-07; `confirmPin` es el PIN de 6 dígitos del encargado al anular cobros y en Personal (SEC-007) | nunca; ni truncado ni enmascarado parcialmente (4–6 dígitos: cualquier dígito revela demasiado) |
| Hash del PIN (`pin_hash`) y parámetros de argon2 de un usuario | permite ataque offline | nunca |
| *Pepper* y cualquier secreto (`podman secret`: contraseñas de BD, datos del encargado inicial) | ADR-005, §3.7 de reglas | nunca; `app.started` lista solo los **nombres** de las claves |
| Cookie `sid`, token de sesión, `token_hash`, cabeceras `Cookie`, `Set-Cookie`, `Authorization`, `Proxy-Authorization` | secuestro de sesión | nunca; las sesiones se identifican con `session_id` |
| Nombre de usuario **tecleado** en un login fallido | puede ser un PIN escrito en el campo equivocado o el nombre de una persona | nunca; se registra `target_user_id` solo si existe |
| Nombre de los empleados | dato personal; el `user_id` basta | nunca en logs; sí en la BD |
| `customer_ref` (nombre del cliente en pedidos de mostrador) | dato personal de un tercero | nunca |
| Notas de línea (`note`) y textos libres de motivo (`reason_text` de cancelación, motivo de anulación de cobro) | texto libre: puede contener nombres, alergias (dato de salud) u otros datos | nunca; solo el `reason_code` |
| Cuerpos de petición y de respuesta completos | contienen todo lo anterior | nunca, en ningún nivel (tampoco en `debug`) |
| Valores recibidos en errores de validación | un PIN mal formado aparecería en el error | solo `path` y `code` del error |
| Parámetros de consultas SQL | `UPDATE users SET pin_hash = $1` | nunca (también en PostgreSQL, §5.4) |
| User-Agent completo | huella del dispositivo, poco útil | solo `ua_family` (§4.2) |
| Datos de tarjeta | no existen en el MVP (datáfono externo) | si algún día aparecieran, nunca |

### 4.2 Datos permitidos con condiciones

- `user_id`, `session_id`, `target_user_id`, `approver_id`: UUID seudónimos.
  Son datos personales de los empleados en sentido RGPD (se pueden relacionar
  con la persona en la BD): se aplican la retención de la §5 y el acceso
  restringido al stack de monitorización. Se informa a los empleados de que
  existe este registro con el texto de la §4.6 (decisión del humano, M-07).
- `client_ip`: IP de la red interna del local. Necesaria para el límite por IP
  de ADR-005 y para detectar un dispositivo que ataca. En PROD con VM en
  internet la IP puede ser pública: misma retención; Cybersecurity decide si se
  trunca.
- `ua_family`: valor reducido calculado en servidor
  (`chrome-android`, `safari-ios`, `firefox-desktop`, `other`).
- Importes (`*_cents`), números de mesa y de pedido, nombres de producto: no
  son datos personales.

### 4.3 Redacción en pino (segunda barrera)

Dos mecanismos, los dos obligatorios en `app` y `migrate` (y en el comando
`create-initial-manager`), con `censor: "[REDACTED]"` (no `remove`, para que
se note si algo se intentó registrar).

**(a) `redact` de pino con rutas fijas.** Rutas mínimas:

```
# cabeceras
req.headers.cookie, req.headers.authorization, req.headers["proxy-authorization"],
res.headers["set-cookie"],
# primer nivel del objeto registrado
pin, currentPin, newPin, confirmPin, managerApproval, pinHash, pin_hash, pepper,
token, tokenHash, token_hash, sid, password, customerRef, customer_ref, note,
reasonText, reason_text, body,
# segundo nivel (comodín de pino: obj.<cualquiera>.campo)
*.pin, *.currentPin, *.newPin, *.confirmPin, *.managerApproval, *.pinHash,
*.pin_hash, *.pepper, *.token, *.tokenHash, *.token_hash, *.sid, *.password,
*.customerRef, *.customer_ref, *.note, *.reasonText, *.reason_text, *.body
```

En pino, `*.campo` solo cubre el segundo nivel y no hay comodín recursivo: el
Developer añade las rutas anidadas reales que existan (p. ej.
`*.lines[*].note`) y Testing las comprueba (§4.5).

**(b) Regla general por nombre de clave: `/pin/i` (SEC-017).** `redact` no
admite expresiones regulares, así que se añade una función de redacción
recursiva que se aplica al objeto **final** de cada línea:
- Recorre objetos y *arrays* a cualquier profundidad (con protección frente a
  ciclos y un límite de 10 niveles; lo que pase de ahí se sustituye por
  `"[TRUNCATED]"`).
- Si el **nombre de una clave** casa con `/pin/i`, su valor se sustituye por
  `"[REDACTED]"`, sea del tipo que sea (cadena, número, objeto completo). Cubre
  `pin`, `currentPin`, `newPin`, `confirmPin`, `managerApproval.pin`,
  `pinHash`, `pin_hash`, `provisionalPin` y cualquier campo nuevo con `pin` que
  aparezca en el futuro sin tener que acordarse de añadirlo a (a).
- Se aplica también al `err` ya serializado (§4.4) y a los *bindings* de los
  loggers hijos (`logger.child({...})`), no solo a los campos de la llamada.
  El punto exacto de pino (p. ej. `formatters.log` + la misma función en
  `formatters.bindings` y al final del serializador `err`) lo elige el
  Developer; el test de §4.5 demuestra que funciona.
- **Sin excepciones.** Ningún campo del catálogo tiene `pin` en su nombre (por
  eso `auth.login.succeeded` usa `provisional_credential`). Los falsos
  positivos (`mapping`, `shipping`, `spinner`...) se aceptan: redactar de más
  no pone datos en riesgo; si molesta, se cambia el nombre del campo, no la
  regla.
- La regla mira **claves**, no valores: los valores de enum como
  `reason: "bad_pin"`, `reason: "pin_reset"` o `event: "auth.pin.changed"` no
  se redactan (los pone el código, nunca el usuario).

La regla (b) es la misma que el software-engineer recoge en
`docs/arquitectura.md` §11. El campo `reason` de los eventos del catálogo es
siempre un valor de un enum que pone el código (`"bad_pin"`, `"idle"`...),
nunca texto del usuario, y por eso no se redacta.

### 4.4 Serializadores

- **Errores (`err`)**: `{type, message, code, stack}`. Se eliminan siempre
  `detail`, `parameters`, `where`, `query`, `hint` (errores de `pg`, que
  incluyen valores de la fila: "Key (lower(name))=(lucía) already exists") y
  cualquier propiedad `body`/`request`/`config`. Para errores de zod, solo
  `issues[].path` e `issues[].code`. En PROD el `stack` se mantiene (no contiene
  datos) pero se limita a 2 KB.
- **Petición (`req`)**: no se usa el serializador por defecto de Fastify. Solo
  los campos de `http.request` (§3.1).
- **Mensajes del cliente** (`client.js_error`): truncados a 200 caracteres;
  se sustituyen por `[n]` las secuencias de 4 o más dígitos (posible PIN o
  importe) y se descarta todo lo que siga a `?` en URLs.

### 4.5 Verificación (Testing + Cybersecurity)

- Test automático: se ejecutan login correcto y fallido, cambio y
  restablecimiento de PIN, aprobación de encargado, pedido con nota y
  `customerRef`, cancelación con texto y anulación con motivo; se captura todo
  el stdout de `app` y se comprueba que **no** aparece ningún PIN usado en el
  test, ni el pepper de test, ni el valor de la cookie `sid`, ni el nombre del
  usuario, ni el texto de las notas/motivos. Debe fallar el build si aparecen.
- SEC-017 (RS-29, RS-31 de `docs/seguridad.md`): el PIN centinela se envía
  también como `confirmPin` (anular cobro, alta, restablecimiento y
  desbloqueo). Test unitario de la regla (b) de §4.3: se registra a propósito
  `{confirmPin, a: {b: {c: {userPin}}}, list: [{pin}]}`, un `logger.child`
  con una clave `pin` y un error con una propiedad `pin`; ninguno de los
  valores aparece en la salida y todos quedan como `"[REDACTED]"`.
- Mismo test sobre los logs de `proxy` y `db` en TESTING.
- Toda línea de stdout de `app` es JSON válido y tiene los campos obligatorios
  de §2.1 (validación con un esquema JSON en el test).

### 4.6 Información a los empleados (M-07)

Decisión del humano: se informa con un texto breve, sin desarrollo en la
aplicación. El texto lo entrega el cliente a su personal (por ejemplo con el
manual de uso de la Etapa 4 en `docs/especificacion/`). El cliente es el
responsable del tratamiento y puede adaptarlo; no sustituye a un
asesoramiento jurídico.

> **Registro de actividad en la aplicación de pedidos**
>
> Para que la aplicación funcione de forma segura y para poder resolver
> incidencias, el sistema registra la actividad de cada usuario: inicios y
> cierres de sesión (también los fallidos), pedidos, cambios de estado,
> cobros, anulaciones, cambios en la carta y en el personal, la hora y la
> dirección de red del dispositivo usado. En estos registros técnicos cada
> persona aparece con un identificador interno y su rol, no con su nombre.
> **Nunca** se registran los PIN, las notas de los pedidos ni el nombre de los
> clientes.
>
> Los registros técnicos se conservan **30 días** (los relativos a la
> seguridad, como los inicios de sesión fallidos, **90 días**) y después se
> borran automáticamente. Solo accede a ellos el responsable técnico del
> sistema. Las operaciones de cobro y anulación quedan además en el historial
> de la aplicación, que forma parte de los datos de negocio del local.
>
> Para cualquier consulta sobre estos datos, diríjase a [responsable del
> local].

---

## 5. Recogida, retención y rotación

### 5.1 Cómo llegan los logs

Cada contenedor escribe en stdout/stderr; Podman (rootless, usuario sin
privilegios) los recoge con su *log driver*. Ningún servicio escribe ficheros
de log dentro del contenedor. En todos los entornos el *log driver* es
`k8s-file` (M-06, opción B: no se usa journald para los contenedores, §5.5).

| Servicio | Formato en stdout |
|---|---|
| `app`, `migrate` | JSON de §2 (pino) |
| `proxy` (Caddy) | JSON nativo de Caddy: directiva `log` con `format json` en el sitio, salida `stdout`. Caddy ya muestra `Cookie`/`Authorization`/`Set-Cookie` como `REDACTED`; **prohibido** activar `log_credentials`. Excluir de su log `/api/v1/events` solo si el volumen lo exige (registra una línea al cerrar la conexión: es útil) |
| `db` (PostgreSQL) | texto en stderr con prefijo fijo (§5.4); el recolector lo convierte a campos |
| stack de monitorización | formato nativo de cada herramienta (logfmt/JSON) |

### 5.2 Por entorno

| Entorno | Log driver | Rotación / retención local | Nivel `app` | Recolección central | Notas |
|---|---|---|---|---|---|
| DEV | `k8s-file` (por defecto en compose) con `log_size_max = 10 MB` en `containers.conf` del usuario o `log_opt: max-size` en `compose.dev.yaml` | lo que dure el contenedor (se pierde al recrearlo) | `debug` | no (opcional: perfil `monitoring` para probar dashboards) | lectura con `podman logs -f app \| jq` o `pino-pretty`. El logger **siempre** emite JSON; el formato bonito se aplica solo al leer, nunca en el proceso |
| TESTING | `k8s-file`, 20 MB | efímero; al final de cada ejecución se guardan `podman logs` de cada servicio como **artefacto** de la ejecución (14 días) | `info` (`debug` si se reproduce un fallo) | no | los tests de §4.5 se ejecutan sobre estos artefactos |
| DEMO | `k8s-file` con `log_opt path=` al directorio dedicado de logs (§5.3) y `max-size` 100 MB | búfer local: el fichero se trunca al llegar a `max-size`; no es la copia de referencia | `info` | sí (Loki 7 días) | igual que PROD para probar la recogida; los datos de la demo son ficticios; los participantes de la prueba de usabilidad usan usuarios de prueba, nunca su nombre |
| PROD | `k8s-file` con `log_opt path=` al directorio dedicado de logs (§5.3) y `max-size` 100 MB (Quadlet: `LogDriver=k8s-file`, `LogOpt=path=...`, `LogOpt=max-size=100mb`) | búfer local de ~7–10 días de `app` (≈ 10 MB/día); la retención la da Loki | `info` | sí: Loki **30 días** general y **90 días** para `category="security"` (decisión del humano, M-07) | ver §5.3 y §5.5 |

Tamaño estimado en PROD: ~10 MB/día de `app` + ~5 MB/día de `proxy` → menos de
0,5 GB en Loki en 30 días (más los 90 días de `security`, de volumen mucho
menor). La retención de 30/90 días es **decisión del humano** (M-07) y se
aplica en Loki (§6.6). Los datos de negocio y el `audit_log` viven en la BD,
no en los logs, y siguen la conservación decidida para el MVP (sin borrado).

Mensajes que siguen yendo a journald del usuario: los de las unidades systemd
(arranque y parada de los servicios Quadlet, temporizador de métricas de §6.5,
copias de seguridad). No contienen datos de la aplicación. Retención
recomendada a Infrastructure: la misma, 30 días (`MaxRetentionSec=30day`).

### 5.3 Requisitos del host de PROD (Infrastructure)

Lo diseña y aplica Infrastructure (`docs/infraestructura.md` §10 y §11.1, que
está unificando); aquí solo se fija lo que necesita la monitorización, con las
condiciones de Cybersecurity (`docs/seguridad.md` §6.3, condiciones 1–7).

- **Directorio dedicado de logs** del usuario de servicio (p. ej.
  `~/mi-app/logs/`, un fichero por servicio `<servicio>.log` vía `log_opt
  path`), modo 0750 y propiedad del usuario de servicio (condición 6). No se
  monta el almacenamiento de Podman (`~/.local/share/containers`).
- **Directorio dedicado de métricas** del temporizador de §6.5 (p. ej.
  `~/mi-app/metrics/`), 0750, ficheros 0640 escritos de forma atómica
  (condición 3).
- `loginctl enable-linger <usuario>` para que los servicios Quadlet y los
  temporizadores sigan sin sesión abierta.
- journald persistente solo para los mensajes de las unidades (§5.2).
- Lectura para agentes y humano sin root:
  `podman logs --since 1h app | jq ...` (Podman quita el prefijo CRI del
  fichero `k8s-file`), o en Loki con `logcli` (§9). `journalctl --user` ya
  **no** muestra los logs de los contenedores.

### 5.4 PostgreSQL

Parámetros (en el `command`/configuración del contenedor `db`, Infrastructure):

```
log_destination = stderr
logging_collector = off                 # a stderr, lo recoge Podman
log_line_prefix = '%m [%p] %q%u@%d '    # timestamp, pid, usuario@bd
log_min_duration_statement = 200ms      # consultas lentas
log_parameter_max_length = 0            # NUNCA valores de parámetros
log_parameter_max_length_on_error = 0
log_statement = none
log_error_verbosity = terse             # sin DETAIL (contiene valores de filas)
log_lock_waits = on
log_checkpoints = on
log_autovacuum_min_duration = 1s
log_connections = on                    # pocas conexiones (pool); útil en seguridad
log_disconnections = off
shared_preload_libraries = 'pg_stat_statements'   # consultas normalizadas, sin valores
```

`log_parameter_max_length = 0` es obligatorio: por defecto PostgreSQL escribe
los parámetros de las consultas lentas en el log, y uno de ellos podría ser un
`pin_hash` o un `customer_ref`.

### 5.5 Recolección central (DEMO y PROD)

- **Grafana Alloy** (sustituto de Promtail) envía a **Loki** con etiquetas de
  baja cardinalidad: `service`, `env`, `level`, `category`. El resto de campos
  (incluidos `event`, `request_id`, `user_id`) se consultan como campos JSON
  (`| json`), no como etiquetas.
- **Decisión M-06: opción B** (humano, 2026-11-23), tal como la diseñó
  Infrastructure (`docs/infraestructura.md` §11.1) y la aprobó Cybersecurity
  con condiciones (`docs/seguridad.md` §6.3). **Sin excepción a §3.4**: no se
  monta `/var/log/journal`, ni el almacenamiento de Podman, ni el socket.
  Sustituye a la recomendación (a) anterior de Monitoring.
- **Fuente:** los ficheros `k8s-file` del directorio dedicado de logs (§5.3).
  El contenedor de Alloy monta **solo** ese directorio, en `ro`, y nada más del
  host (condición 6); resto de §3.4 completo (UID ≥ 1000, `cap-drop: ALL`,
  `no-new-privileges`, `read-only`, límites, sin `network=host`). Su fichero
  de posiciones va a un volumen propio de Alloy, no al directorio de logs.
- **Formato:** cada línea del fichero `k8s-file` tiene el prefijo CRI
  (`<hora> stdout|stderr F|P <línea>`). Alloy usa `stage.cri` para quitarlo y
  unir las líneas partidas (`P`), y después `stage.json` para extraer `level`
  y `category` (servicios propios) o el parser de Caddy/PostgreSQL. El
  servicio sale del nombre del fichero (`<servicio>.log`), no de lo que diga
  la línea.
- **Riesgo aceptado:** si Alloy no puede leer o Loki no acepta durante tanto
  tiempo que el fichero llega a `max-size` y se trunca, se pierden esas
  líneas. Mitigación: `max-size` 100 MB (~7–10 días de margen en `app`) y las
  alertas `LogShippingFailing` y `LogIngestionStopped` (§7.1).
- La redacción de §4 sigue aplicando (condición 6, SEC-017): Alloy no añade
  campos ni etiquetas con datos personales; solo las etiquetas de baja
  cardinalidad de arriba.

---

## 6. Métricas

Formato Prometheus. `app` expone `/metrics` con `prom-client` en un **puerto
interno aparte (9464)**, no en el 3000, para que Caddy no pueda enrutarlo por
error (§10, cambio 2). Reglas de etiquetas: **nunca** `user_id`, `order_id`,
`session_id`, IP, mesa ni nada sin límite; `route` siempre la plantilla.

### 6.1 Técnicas: API (RED), runtime y BD

| Métrica | Tipo | Etiquetas | Fuente |
|---|---|---|---|
| `http_requests_total` | counter | `method`, `route`, `status_class` (2xx..5xx), `status` solo para 401/403/409/423/429 | app |
| `http_request_duration_seconds` | histogram, buckets 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5 | `method`, `route` | app (excluye `GET /events`) |
| `http_requests_in_flight` | gauge | — | app |
| `nodejs_eventloop_lag_p99_seconds`, `process_resident_memory_bytes`, `nodejs_heap_size_used_bytes`, `process_cpu_seconds_total`, `nodejs_gc_duration_seconds` | varias | — | `prom-client` (métricas por defecto) |
| `db_query_duration_seconds` | histogram | `query` (nombre del método del repositorio; lista cerrada) | app |
| `db_pool_connections` | gauge | `state` = `total` \| `idle` \| `waiting` | app |
| `db_slow_queries_total` | counter | `query` | app (umbral 200 ms) |
| `db_errors_total` | counter | `sqlstate_class` | app |
| `readiness_status` | gauge 0/1 | `check` = `db` \| `migrations` | app |
| `pg_up`, `pg_stat_database_*`, `pg_database_size_bytes`, `pg_stat_statements_*`, `pg_locks_count` | varias | — | `postgres_exporter` (usuario de BD de solo monitorización, `pg_monitor`) |
| `caddy_http_request_duration_seconds`, `caddy_http_requests_total`, `caddy_reverse_proxy_upstreams_healthy` | varias | — | Caddy (`metrics` en un sitio interno `:9180`, nunca el admin API en red) |
| `tls_cert_expiry_timestamp_seconds` | gauge | `domain` | Caddy / blackbox |

Percentiles p50/p95/p99 con `histogram_quantile` sobre las ventanas de §7.

### 6.2 Tiempo real y negocio

| Métrica | Tipo | Etiquetas | Notas |
|---|---|---|---|
| `sse_clients_connected` | gauge | `role` | clave: `role="kitchen"` = 0 en horario de apertura significa que nadie ve la cola |
| `sse_connections_total` / `sse_disconnections_total` | counter | `role` / `role`, `reason` | muchas reconexiones = Wi-Fi inestable |
| `sse_events_sent_total` | counter | `type` | |
| `sse_write_failures_total` | counter | — | |
| `sse_event_delivery_seconds` | histogram, buckets 0.005..2 | `type` | **parte servidor** de la propagación: de `COMMIT` a escrito en el socket |
| `order_to_kitchen_server_seconds` | histogram | — | de llegada de `POST /orders` a escrito en el socket de **cada** conexión `kitchen` |
| `order_propagation_seconds` | histogram, buckets 0.1, 0.25, 0.5, 1, 1.5, 2, 3, 5, 10 | `target` = `kitchen` \| `waiter` | **extremo a extremo** medido por el cliente que recibe: `recibido (corregido con el desfase de serverTime) − emittedAt`; enviado agregado por telemetría (§10, cambios 3 y 4). Es el indicador directo de HU-02/HU-03/HU-06 (≤ 2 s p95) |
| `orders_created_total` | counter | `order_type` | |
| `orders_open` | gauge | — | se calcula al hacer *scrape* (consulta con índice) |
| `orders_in_queue` | gauge | `prep_status` | ídem |
| `orders_delayed` | gauge | — | pedidos en `pending`/`in_progress` con espera > `delay_threshold_minutes` (HU-03) |
| `order_wait_seconds` | histogram, buckets 60..1800 | — | de `sent_at` a `ready_at` |
| `orders_cancelled_total` | counter | `reason_code`, `prep_status` | |
| `order_version_conflicts_total` | counter | — | HU-06 |
| `idempotent_replays_total` | counter | `resource` = `order` \| `payment` | reintentos por red |
| `payments_total` / `payments_amount_cents_total` | counter | `method` | |
| `payments_rejected_total` | counter | `reason` | |
| `payments_voided_total` | counter | — | |
| `cash_closing_difference_cents` | gauge | — | último cierre |

### 6.3 Seguridad

| Métrica | Tipo | Etiquetas |
|---|---|---|
| `auth_login_attempts_total` | counter | `result` = `success` \| `bad_pin` \| `unknown_user` \| `locked` \| `disabled` \| `ip_rate_limited` |
| `auth_lockouts_total` | counter | — |
| `auth_users_locked` | gauge | — |
| `auth_sessions_active` | gauge | `role` |
| `auth_sessions_ended_total` | counter | `reason` = `logout` \| `idle` \| `absolute` \| `user_disabled` \| `pin_reset` \| `pin_changed` |
| `auth_invalid_session_total` | counter | `reason` |
| `authz_denied_total` | counter | `permission` |
| `csrf_rejected_total` | counter | — |
| `manager_approvals_total` | counter | `action`, `result` = `granted` \| `failed` |
| `staff_privilege_changes_total` | counter | `kind` = `role_changed` \| `deactivated` \| `pin_reset` \| `initial_manager` |
| `http_requests_total{status="429"}` y tasa total de peticiones por IP | — | picos anómalos: la tasa por IP se calcula **en Loki** sobre `client_ip` (no como etiqueta de Prometheus) |

### 6.4 UX

Necesitan el endpoint de telemetría (§10, cambio 3), salvo las marcadas
"servidor". Etiquetas solo de listas cerradas definidas por UX
(`docs/ux/flujos.md`: pantallas P-01..P-12).

| Métrica | Tipo | Etiquetas | Qué responde |
|---|---|---|---|
| `ux_flow_steps_total` | counter | `flow`, `step` | embudo de cada flujo |
| `ux_flow_abandoned_total` | counter | `flow`, `step` | abandono en cada paso |
| `ux_flow_duration_seconds` | histogram | `flow` | tiempo de tarea (p. ej. tomar pedido) |
| `ux_form_errors_total` (servidor) | counter | `form` (= `route`), `field`, `code` | errores de formulario (a partir de `http.validation.failed`) |
| `ux_client_validation_errors_total` | counter | `form`, `field`, `code` | errores que el cliente muestra antes de enviar |
| `ux_rage_clicks_total` | counter | `screen` | ≥ 3 toques en el mismo control (radio 30 px) en ≤ 1 s, sin cambio de estado |
| `ux_offline_banner_total` / `ux_offline_seconds_total` | counter | `screen` | "Sin conexión" (HU-03) visto por el usuario |
| `ux_conflict_shown_total` | counter | `screen` | aviso "El pedido ha cambiado" (HU-06) |
| `client_js_errors_total` | counter | `screen` | errores JS |

Flujos y pasos iniciales (UX los ajusta):

| `flow` | Pasos (`step`) | Abandono = |
|---|---|---|
| `login` | `user_selected`, `pin_entered`, `succeeded` | se elige usuario y no hay login en 60 s |
| `take_order` | `started`, `table_chosen`, `product_added`, `sent` | `discarded` o borrador sin enviar al salir de la pantalla |
| `payment` | `opened`, `method_chosen`, `amount_entered`, `confirmed` | cerrar el cobro sin confirmar |
| `cancel_order` | `opened`, `reason_chosen`, `approval_requested`, `confirmed` | cerrar sin confirmar |
| `modify_order` | `opened`, `changed`, `approval_requested`, `saved` | cerrar sin guardar, o `409` sin reintento |

### 6.5 Contenedores y host

Restricción: las reglas prohíben montar el socket de Podman y `/proc` u otros
directorios del sistema en contenedores, así que cAdvisor o
`prometheus-podman-exporter` no son válidos. Solución de la opción B (M-06,
`docs/infraestructura.md` §11.1), con las condiciones 1–5 de
`docs/seguridad.md` §6.3, obligatorias:

- Un **temporizador de systemd del usuario** de servicio
  (`~/.config/systemd/user/`, `systemctl --user`; nunca de sistema, root ni
  `sudo`), cada 15 s, ejecuta un script versionado en `deploy/` que **solo
  lee**. Comandos permitidos (y ningún otro):
  - `podman stats --no-stream --format ...`
  - `podman ps --format ...`
  - `podman inspect --format` con campos concretos
    (`{{.State.Health.Status}}`, `{{.State.OOMKilled}}`, `{{.RestartCount}}`);
    nunca el `inspect` completo (incluye entorno y montajes)
  - `systemctl --user show <unidad> -p NRestarts,Result,ActiveState`
  - `df -P` sobre rutas fijas
  - Prohibidos `podman exec/run/rm/kill`, `podman healthcheck run` (ejecuta el
    comando de salud **dentro** del contenedor; el estado se lee con
    `inspect`), `podman events`, `podman secret inspect --showsecret` y `sudo`.
- Escribe un fichero `.prom` de forma atómica (temporal + `mv`) en el
  directorio dedicado de métricas (§5.3), con la **lista cerrada** de métricas
  de abajo y etiquetas acotadas: nombre del contenedor o de la unidad; nunca
  imagen, comando, variables ni rutas de montaje.
- Unidad con `NoNewPrivileges=yes`, `UMask=0027`, `TimeoutStartSec=30`, sin
  red. Sus mensajes van al diario del usuario y no contienen secretos.
- Un contenedor `node_exporter` con todo §3.4 y **solo** el colector
  `textfile` (`--collector.disable-defaults --collector.textfile`) monta
  **solo** ese directorio en `ro` (sin `/proc`, `/sys` ni `/` del host), sin
  puertos publicados (solo en la red de Prometheus).
- Cybersecurity revisa el script y las unidades cuando existan (Etapa 2/5).

Métricas resultantes (lista cerrada):

| Métrica | Etiquetas | Fuente en el script / notas |
|---|---|---|
| `container_health_status` | `name`, `status` = `healthy` \| `unhealthy` \| `starting` | `podman inspect --format '{{.State.Health.Status}}'` |
| `container_restarts_total` | `name` | `NRestarts` de la unidad systemd: con Quadlet el contenedor se recrea en cada reinicio y el `RestartCount` de Podman vuelve a 0 |
| `container_oom_kills_total` | `name` | `Result=oom-kill` de la unidad y `{{.State.OOMKilled}}`; el script acumula el contador en su propio fichero de estado |
| `container_cpu_ratio`, `container_memory_bytes`, `container_memory_limit_bytes` | `name` | `podman stats --no-stream` |
| `systemd_unit_active` | `unit` | `ActiveState` (1 = `active`) |
| `host_filesystem_used_ratio` | `mount` = `containers_storage` \| `pgdata` \| `logs` \| `metrics` | `df -P` sobre rutas fijas (`logs` = directorio dedicado de logs, §5.3) |
| `business_hours_open` | — | 1 entre 07:00 y 21:00 `Europe/Madrid`, 0 fuera; para las alertas **(H)** (§7). Requiere `date` en el script (ver nota) |
| `business_minutes_since_open` | — | minutos desde las 07:00 `Europe/Madrid` (0 fuera de horario); margen de las alertas de conexión de §7.3 |
| `backup_last_success_timestamp_seconds` | `kind` = `pg_dump` | lo escribe el trabajo de copia de Infrastructure (SEC-011) en el mismo directorio |
| `host_load1`, `host_memory_available_bytes` | — | **pendiente de Cybersecurity**: leer `/proc/loadavg` y `/proc/meminfo` no está en la lista de la condición 2. Si no se aprueba, se quitan (`podman stats` ya da la memoria por contenedor) |
| `time_offset_seconds` | — | **pendiente de Cybersecurity**: necesita `timedatectl show` o `chronyc tracking` (solo lectura), fuera de la lista de la condición 2. Si no se aprueba, se quita `ClockDrift` (§7.1) |

Nota: `business_hours_open` se calcula en el host porque Prometheus no
conoce zonas horarias (`hour()` es UTC y el cambio de hora desplazaría la
ventana). Solo usa `TZ=Europe/Madrid date +%H%M`, de solo lectura; se pide a
Cybersecurity que lo añada a la lista de la condición 2 junto con los dos
puntos pendientes de arriba. Si el temporizador deja de escribir, la alerta
`HostMetricsStale` (§7.1) avisa, porque sin esta métrica las alertas (H) no
saltan.

### 6.6 Stack de monitorización

Todo en contenedores rootless conforme a la §3 de las reglas (UID ≥ 1000,
`cap-drop: ALL`, `no-new-privileges`, `read-only` con volúmenes de datos,
límites de memoria y CPU, sin `network=host`), en la misma red interna, sin
publicar puertos a la LAN:

| Contenedor | Retención | Memoria orientativa |
|---|---|---|
| Prometheus | PROD 30 días, DEMO 7 días | 256 MB |
| Alertmanager | — (estado de silencios y notificaciones en su volumen) | 64 MB |
| Loki (modo monolítico, almacenamiento en volumen local) | PROD 30 días general, 90 días `category="security"`; DEMO 7 días | 256 MB |
| Grafana Alloy | — | 128 MB |
| Grafana | — | 192 MB |
| node_exporter (solo textfile), postgres_exporter | — | 32 MB c/u |

**Retención (M-07, decisión del humano)**, configuración en PROD:

```yaml
# Loki: borrado real con el compactor (sin él, retention_period no borra nada)
compactor:
  working_directory: /loki/compactor
  retention_enabled: true
  retention_delete_delay: 2h
  delete_request_store: filesystem
limits_config:
  retention_period: 720h            # 30 días: todo lo que no sea seguridad
  retention_stream:
    - selector: '{category="security"}'
      priority: 1
      period: 2160h                 # 90 días
```

```
# Prometheus (argumentos del contenedor)
--storage.tsdb.retention.time=30d
--storage.tsdb.retention.size=5GB   # tope de seguridad del disco; el que llegue antes
```

- Las métricas no llevan datos personales (§6, sin `user_id` ni IP en
  etiquetas); 30 días bastan para comparar semanas (`TrafficSpike` usa 7).
- La retención de 90 días se aplica a la etiqueta `category="security"`, que
  pone Alloy a partir del campo `category` de los servicios propios (§3.2). Los
  logs de `proxy` y `db` quedan en 30 días.
- DEMO: Loki y Prometheus 7 días (`retention_period: 168h`, sin
  `retention_stream`).
- Testing comprueba en DEMO que el compactor borra (consulta de un intervalo
  ya vencido sin resultados) antes de la Etapa 5.

Total ≈ 1 GB: Infrastructure lo tiene en cuenta al dimensionar el host
(`docs/infraestructura.md` §11.2: 2 vCPU, 4 GB, 40 GB). Grafana solo en
`127.0.0.1` del host con acceso del humano por túnel SSH (decisión de
Infrastructure, §11.2). Los ficheros (dashboards como JSON, reglas de alerta,
config de Alloy y la **plantilla** de Alertmanager de §7.0) se versionan en
`deploy/monitoring/` cuando se implementen (Etapa 2, con Infrastructure).

---

## 7. Alertas propuestas para PROD

**No se implementan todavía** (se activan en la Etapa 5). Severidades:

- **crítica** (etiqueta `severity="critical"`): el local no puede trabajar o
  hay riesgo de seguridad activo. Correo inmediato (dentro del horario de
  alertas, o a cualquier hora si la alerta está marcada **[24h]**).
- **aviso** (`severity="warning"`): degradación o señal a revisar en el día.
  Correo agrupado.
- **info** (`severity="info"`): solo en el dashboard y en el informe diario a
  los agentes; no genera correo.

Decisiones del humano (M-07): canal **correo**; **horario de alertas
07:00–21:00 `Europe/Madrid`**.

- **(H)** = la condición solo tiene sentido con el local abierto (p. ej. "nadie
  conectado"). Se evalúa solo en horario: la expresión de Prometheus lleva
  `and on() business_hours_open == 1` (§6.5). Así, a las 07:00 no llega un
  correo por algo que fue normal durante la noche.
- **[24h]** = se envía también fuera de horario (21:00–07:00). Solo alertas de
  seguridad (con el local cerrado no hay tráfico legítimo, cualquier señal es
  sospechosa y su volumen es bajo) y el disco casi lleno (puede impedir las
  copias y la ingesta de logs de la noche).
- **Resto (aviso y crítica sin [24h])**: fuera de horario **esperan**. Si
  siguen activas a las 07:00, el correo sale entonces. Las que se resuelven
  solas durante la noche no envían correo, pero aparecen en el dashboard y en
  el informe a los agentes (§9).

### 7.0 Enrutamiento de Alertmanager (correo)

Plantilla orientativa; se versiona como `deploy/monitoring/alertmanager.yml.tmpl`
y se completa en el despliegue (Etapa 5).

```yaml
global:
  smtp_smarthost: "${SMTP_HOST}:587"        # Etapa 5
  smtp_from: "${ALERT_FROM}"
  smtp_auth_username: "${SMTP_USER}"
  smtp_auth_password_file: /run/secrets/alertmanager_smtp_password
  smtp_require_tls: true

time_intervals:
  - name: horario_alertas
    time_intervals:
      - times: [{start_time: "07:00", end_time: "21:00"}]
        location: Europe/Madrid

route:
  receiver: correo-aviso
  group_by: [alertname, severity]
  group_wait: 1m
  group_interval: 10m
  repeat_interval: 12h
  routes:
    - matchers: ['severity="info"']
      receiver: nulo                          # solo dashboard e informe
    - matchers: ['alertname="Watchdog"']      # latido diario del canal
      receiver: correo-aviso
      active_time_intervals: [horario_alertas]
      group_wait: 0s
      repeat_interval: 24h
    - matchers: ['after_hours="notify"']      # [24h]: a cualquier hora
      receiver: correo-critica
      group_wait: 10s
      repeat_interval: 1h
    - matchers: ['severity="critical"']
      receiver: correo-critica
      active_time_intervals: [horario_alertas]
      group_wait: 10s
      repeat_interval: 1h
    - matchers: ['severity="warning"']
      receiver: correo-aviso
      active_time_intervals: [horario_alertas]

inhibit_rules:                                # una causa, un correo
  - source_matchers: ['alertname="DbDown"']
    target_matchers: ['alertname=~"AppNotReady|ErrorRateHigh|ErrorLogBurst|SlowQueries|DbPoolSaturated"']
  - source_matchers: ['alertname="AppDown"']
    target_matchers: ['alertname=~"AppNotReady|NoClientsConnected|KitchenScreenDisconnected|LogIngestionStopped|ErrorRateHigh"']
  - source_matchers: ['alertname="NoClientsConnected"']
    target_matchers: ['alertname="KitchenScreenDisconnected"']
  - source_matchers: ['severity="critical"']  # misma alerta en crítica tapa su aviso
    target_matchers: ['severity="warning"']
    equal: [alertname]

receivers:
  - name: nulo
  - name: correo-critica
    email_configs:
      - to: "${ALERT_TO_CRITICAL}"            # responsable técnico y encargado
        send_resolved: true
        headers: {Subject: '[mi-app CRÍTICA] {{ .CommonLabels.alertname }}'}
  - name: correo-aviso
    email_configs:
      - to: "${ALERT_TO_WARNING}"             # responsable técnico
        send_resolved: false
        headers: {Subject: '[mi-app aviso] {{ .CommonLabels.alertname }}'}
```

- **Servidor SMTP, usuario, remitente y destinatarios se definen en la
  Etapa 5.** La contraseña SMTP es un secreto (`podman secret`, montado como
  fichero en `/run/secrets/`, §3.7 de las reglas); los demás valores (las
  direcciones son datos personales) se inyectan al generar el fichero en el
  despliegue. **Nada de esto se escribe en `docs/` ni se versiona**: en el
  repositorio solo está la plantilla con los marcadores `${...}`.
  Alertmanager no expande variables: el aprovisionamiento genera el fichero
  final fuera del repositorio.
- El contenedor de Alertmanager es el único del stack con salida a internet,
  y solo hacia el puerto SMTP (submission 587 con TLS). Infrastructure lo
  define en la red; Cybersecurity lo valida.
- **`Watchdog`**: regla siempre activa (`expr: vector(1)`) que envía un correo
  al día al empezar el horario. Si un día no llega, el canal de alertas está
  roto (SMTP, credenciales o Alertmanager caído). El humano lo revisa.
- El correo no "despierta" a nadie por sí solo: si se quiere que las [24h]
  suenen de noche, quien las recibe configura un aviso en su móvil para el
  asunto `[mi-app CRÍTICA]`. Decisión del humano/cliente, sin desarrollo.

Alertas **[24h]** (llevan la etiqueta `after_hours="notify"`):
`LoginFailuresHigh` (aviso y crítica), `LockoutRepeated`, `LockoutSpray`,
`LoginIpRateLimited`, `ManagerApprovalFailures`, `AuthzDeniedBurst`,
`CsrfRejected`, `InvalidSessionBurst`, `PrivilegeChange` (solo la de
`new_role="manager"` o `initial_manager`), `LoginOutsideHours`,
`TrafficSpike`, `DiskFilling` (solo la crítica, > 90 %).

### 7.1 Disponibilidad y contenedores

| Alerta | Condición | Severidad | Acción sugerida | Responsable |
|---|---|---|---|---|
| `AppDown` | `/healthz` falla o `up{job="app"} == 0` durante 1 min | crítica | `systemctl --user status app.service`, `podman logs --tail 200 app`; comprobar reinicio automático | infrastructure |
| `AppNotReady` | `readiness_status == 0` durante 2 min | crítica | ver qué `check` falla; si es `db`, ver `DbDown` | infrastructure |
| `DbDown` | `pg_up == 0` durante 1 min | crítica | estado del contenedor `db`, disco, logs de PostgreSQL | infrastructure |
| `ContainerRestartLoop` | `increase(container_restarts_total[15m]) >= 3` | crítica | logs del arranque (`app.start.failed`, `config.invalid`); no reiniciar a mano en bucle | infrastructure (developer si es un fallo de código) |
| `ContainerOOMKilled` | `increase(container_oom_kills_total[1h]) > 0` | aviso (crítica si ≥ 2 en 1 h) | revisar `process_resident_memory_bytes` previo; fuga o límite de memoria bajo | developer / infrastructure |
| `ContainerUnhealthy` | `container_health_status{status="unhealthy"} == 1` durante 2 min, cualquier contenedor | crítica para `app`/`db`/`proxy`, aviso para el stack de monitorización | `podman healthcheck run <nombre>`; logs | infrastructure |
| `MemoryNearLimit` | `container_memory_bytes / container_memory_limit_bytes > 0.85` durante 10 min | aviso | ajustar límite o investigar fuga | infrastructure / developer |
| `DiskFilling` | `host_filesystem_used_ratio > 0.80` | aviso; > 0.90 crítica **[24h]** | limpiar imágenes antiguas (`podman image prune`), revisar la retención de Loki/Prometheus (§6.6), el `max-size` de los logs y el tamaño de `pgdata` | infrastructure |
| `BackupMissing` | `time() - backup_last_success_timestamp_seconds > 26 h` | crítica | ejecutar la copia y revisar por qué falló | infrastructure |
| `TlsCertExpiring` | caducidad < 14 días (aviso), < 3 días (crítica) | aviso / crítica | renovación ACME de Caddy; en CA interna, revisar `/data` de Caddy | infrastructure |
| `MonitoringTargetDown` | cualquier `up == 0` del stack de monitorización durante 5 min | aviso | sin esto, las demás alertas pueden no saltar | infrastructure |
| `LogIngestionStopped` | sin líneas de `service="app"` en Loki durante 15 min **(H)** | aviso | Alloy caído o sin acceso al directorio de logs (§5.5); comprobar que `app` sigue escribiendo (`podman logs --tail 5 app`) | infrastructure |
| `LogShippingFailing` | `increase(loki_write_dropped_entries_total[10m]) > 0`, o el envío de Alloy falla durante 10 min | aviso | Loki caído o lleno; si dura, el fichero `k8s-file` puede truncarse antes de enviarse (§5.5) | infrastructure |
| `HostMetricsStale` | `time() - node_textfile_mtime_seconds > 120`, o `node_textfile_scrape_error == 1` | aviso | el temporizador de §6.5 no escribe: `systemctl --user status <temporizador>`; sin él no saltan las alertas (H) ni las de contenedores | infrastructure |
| `Watchdog` | `vector(1)` (siempre activa) | aviso (ruta propia, §7.0) | un correo al día a las 07:00; si no llega, el canal de alertas está roto | infrastructure |
| `ClockDrift` | `abs(time_offset_seconds) > 2` (solo si Cybersecurity aprueba la métrica, §6.5) | aviso | NTP del host | infrastructure |

### 7.2 Rendimiento (umbrales de las historias)

| Alerta | Condición | Severidad | Acción sugerida | Responsable |
|---|---|---|---|---|
| `OrderPropagationSlow` | p95 de `order_propagation_seconds{target="kitchen"}` > 2 s en 10 min **(H)** (HU-02); > 5 s crítica | aviso / crítica | comparar con `sse_event_delivery_seconds`: si el servidor es rápido, es la red Wi-Fi (infrastructure); si no, el código | developer / infrastructure |
| `SsePropagationServerSlow` | p95 de `sse_event_delivery_seconds` > 0,5 s en 10 min | aviso | bucle de eventos bloqueado o *backpressure* | developer |
| `LoginSlow` | p95 de `http_request_duration_seconds{route="/api/v1/auth/login"}` > 1 s en 10 min (HU-01) | aviso | parámetros de argon2 frente a la CPU del host | developer / software-engineer |
| `PaymentSlow` | p95 de `POST /api/v1/payments` > 1 s en 10 min (HU-04) | aviso | consultas lentas y bloqueos (`FOR UPDATE`) | developer |
| `ApiLatencyHigh` | p95 de todas las rutas (sin login ni `/events`) > 500 ms en 10 min | aviso | `db_query_duration_seconds` por consulta | developer |
| `DailyReportSlow` | p95 de `GET /reports/daily` > 2 s (HU-08) | info | índices de la consulta | developer |
| `ErrorRateHigh` | 5xx / total > 2 % en 5 min con ≥ 5 errores; > 5 % crítica | aviso / crítica | buscar `level=error` por `route` en Loki | developer |
| `EventLoopLag` | `nodejs_eventloop_lag_p99_seconds > 0.2` durante 5 min | aviso | CPU síncrona en el bucle (argon2 debe ir al pool de libuv, ADR-001) | developer |
| `SlowQueries` | `increase(db_slow_queries_total[10m]) > 10` | aviso | `pg_stat_statements`, índices | developer / software-engineer |
| `DbPoolSaturated` | `db_pool_connections{state="waiting"} > 0` durante 5 min | aviso | transacciones largas o pool pequeño | developer |
| `ErrorLogBurst` | > 5 líneas `level=error` de `app` en 5 min (Loki) | aviso | leer los errores | developer |

### 7.3 Tiempo real y operación del local

Las alertas (H) de conexión de clientes (`KitchenScreenDisconnected`,
`NoClientsConnected`) llevan además `and on() business_minutes_since_open >= 15`
(margen de 15 min tras las 07:00, §6.5) para no avisar cada mañana mientras se
encienden las pantallas. Si el local abre más tarde de las 07:00, se ajusta ese margen, no
el horario de alertas.

| Alerta | Condición | Severidad | Acción sugerida | Responsable |
|---|---|---|---|---|
| `KitchenScreenDisconnected` | `sse_clients_connected{role="kitchen"} == 0` durante 2 min **(H)** | crítica | nadie ve la cola: revisar la pantalla de barra (Wi-Fi, navegador, sesión) | infrastructure (aviso al encargado) |
| `NoClientsConnected` | `sum(sse_clients_connected) == 0` durante 5 min **(H)** | crítica | caída de red del local o del proxy | infrastructure |
| `SseReconnectStorm` | `increase(sse_connections_total[10m]) > 30` **(H)** | aviso | Wi-Fi inestable o reinicios de `app` | infrastructure |
| `ClientsOffline` | `increase(ux_offline_seconds_total[10m]) > 60` **(H)** | aviso | ídem, visto desde los dispositivos | infrastructure / ux-designer |
| `OrdersDelayed` | `orders_delayed >= 3` durante 10 min **(H)** | info | es operación del local, no fallo técnico; solo dashboard | — (humano) |
| `IdempotentReplaysHigh` | `increase(idempotent_replays_total[1h]) > 20` | info | reintentos por red; correlacionar con Wi-Fi | infrastructure |
| `VersionConflictsHigh` | `increase(order_version_conflicts_total[1h]) > 10` | info | flujo de trabajo que provoca colisiones | ux-designer |

### 7.4 Seguridad

Umbrales iniciales a validar por Cybersecurity en `docs/seguridad.md`.

| Alerta | Condición | Severidad | Acción sugerida | Responsable |
|---|---|---|---|---|
| `LoginFailuresHigh` | `increase(auth_login_attempts_total{result=~"bad_pin\|unknown_user"}[5m]) > 10`; > 30 crítica | aviso / crítica **[24h]** | en Loki, agrupar `auth.login.failed` por `client_ip` y `target_user_id` | cybersecurity |
| `LockoutRepeated` | ≥ 3 `auth.account.locked` del mismo `target_user_id` en 24 h (Loki) | crítica **[24h]** | posible ataque de fuerza bruta a un PIN de 4 dígitos (riesgo de §13 de arquitectura); restablecer PIN y revisar el dispositivo de origen | cybersecurity |
| `LockoutSpray` | ≥ 3 usuarios distintos bloqueados en 15 min | crítica **[24h]** | rociado de un PIN común contra todos los usuarios | cybersecurity |
| `LoginIpRateLimited` | `increase(auth_login_attempts_total{result="ip_rate_limited"}[15m]) > 0` | aviso **[24h]** | identificar el dispositivo por `client_ip` | cybersecurity |
| `ManagerApprovalFailures` | `increase(manager_approvals_total{result="failed"}[15m]) >= 3` | aviso **[24h]** | alguien prueba el PIN del encargado desde un dispositivo de sala | cybersecurity |
| `AuthzDeniedBurst` | `increase(authz_denied_total[10m]) > 10`, o > 5 de una misma sesión (Loki) | aviso **[24h]** | sondeo de rutas o fallo de la UI que muestra opciones no permitidas | cybersecurity (developer si es la UI) |
| `CsrfRejected` | `increase(csrf_rejected_total[10m]) > 0` | aviso **[24h]** | origen ajeno intentando modificar datos | cybersecurity |
| `InvalidSessionBurst` | > 20 `auth.session.invalid` de una IP en 10 min | aviso **[24h]** | posible reutilización o fuerza bruta de cookies | cybersecurity |
| `PrivilegeChange` | `increase(staff_privilege_changes_total{kind=~"role_changed\|initial_manager"}[5m]) > 0` | info (aviso **[24h]** si `new_role="manager"` o `initial_manager`) | confirmar con el encargado que el cambio es legítimo | cybersecurity |
| `LoginOutsideHours` | `increase(auth_login_attempts_total{result="success"}[5m]) > 0 and on() business_hours_open == 0` (login correcto entre 21:00 y 07:00) | aviso **[24h]** | acceso fuera de horario; en Loki, `auth.login.succeeded` de esa franja para ver `user_id` y `client_ip`. Si el local cierra algún día más tarde, se silencia en Alertmanager para esa noche | cybersecurity |
| `PaymentVoidsHigh` | `increase(payments_voided_total[1d]) > 3` | aviso | posible fraude interno; revisar `audit_log` | cybersecurity (informar al humano) |
| `CashClosingDifference` | `abs(cash_closing_difference_cents) > 500` (5 €) | info | lo revisa el encargado | — (humano) |
| `TrafficSpike` | tasa de peticiones > 5× la mediana de la misma hora de los últimos 7 días, o > 20 req/s sostenidas 2 min | aviso **[24h]** | un dispositivo en bucle o un ataque; agrupar por `client_ip` en Loki | cybersecurity / developer |

---

## 8. Health checks

Coherentes con la §3.3 de las reglas (`HEALTHCHECK` en todas las imágenes) y
con `deploy/dev/Containerfile`, que ya usa `GET /healthz` en forma exec.

### 8.1 `app`

| Endpoint | Tipo | Qué comprueba | Respuesta |
|---|---|---|---|
| `GET /healthz` | **liveness** (lo usa el `HEALTHCHECK` de la imagen) | el proceso atiende HTTP y el bucle de eventos responde (lag < 1 s). **No** consulta la BD | `200 {"status":"ok"}` / `503 {"status":"fail"}` |
| `GET /readyz` | **readiness** | `SELECT 1` en la BD con *timeout* de 1 s; migraciones en la versión esperada; secretos cargados | `200 {"status":"ok","checks":{"db":"ok","migrations":"ok"}}` / `503` con el mismo formato y `"fail"` en el check que falla. **Sin** mensajes de error ni versiones de software |

Por qué separados: si `/healthz` comprobara la BD (como dice hoy la §5 de la
arquitectura), una caída de `db` haría que `app` se marcara como `unhealthy` y,
con reinicio por health check, entraría en un bucle de reinicios que no
arregla nada y oculta la causa real. Con la separación, `AppNotReady` + `DbDown`
apuntan a la causa y `ContainerRestartLoop` solo salta si el proceso de `app`
está realmente colgado. Cambio pedido a software-engineer (§10, cambio 1).

Parámetros del `HEALTHCHECK` / Quadlet:

```
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
  CMD ["node", "dist/healthcheck.js"]        # GET http://127.0.0.1:3000/healthz
```

En Quadlet (PROD): `HealthCmd`, `HealthInterval=15s`, `HealthRetries=3`,
`HealthStartPeriod=30s`, `HealthOnFailure=kill` + `Restart=always` en la unidad,
y `Notify=healthy` para que las unidades dependientes esperen a que esté sano.

- Ninguno de los dos endpoints genera líneas `http.request` ni necesita sesión.
- `/healthz`, `/readyz` y el puerto 9464 **no** se exponen por Caddy: el
  `Caddyfile` responde `404` a `/healthz` y `/readyz` explícitamente aunque
  la ruta no exista en la API pública (defensa en profundidad).
- Prometheus consulta `/readyz` (vía *blackbox* o la métrica `readiness_status`)
  para la alerta `AppNotReady`.

### 8.2 Resto de servicios

| Servicio | `HEALTHCHECK` (forma exec) | Intervalo / timeout / reintentos / inicio | Notas |
|---|---|---|---|
| `db` | `["pg_isready", "-h", "127.0.0.1", "-p", "5432", "-d", "<bd>", "-U", "app_rw"]` | 10 s / 3 s / 5 / 30 s | `app` y `migrate` dependen de `db` sano (`depends_on: condition: service_healthy`) |
| `migrate` | sin health check (efímero); su resultado es el código de salida | — | `app` depende de `service_completed_successfully`. Fallo = `db.migration.failed` en el log |
| `proxy` | `["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:9180/health"]` | 15 s / 3 s / 3 / 10 s | sitio interno `:9180` del `Caddyfile` con `respond /health 200` y `metrics`; no publicado al host. No se usa el admin API (2019) desde fuera del contenedor |
| `prometheus`, `alertmanager`, `loki`, `grafana` | sus endpoints `/-/ready`, `/ready`, `/api/health` | 30 s / 5 s / 3 | |

En DEV con `podman-compose`, los health checks dependen de los temporizadores
de systemd del usuario; si no hay sesión systemd de usuario, `podman ps`
mostrará `starting` indefinidamente (Infrastructure lo documenta).

---

## 9. Informes a los agentes

Los dashboards son para el humano. Para los agentes, Monitoring genera informes
en texto en `docs/estado.md` (sección "Hallazgos reportados a otros agentes"),
leyendo logs y métricas con comandos, por ejemplo:

```
# Errores de app de la última hora (PROD; logs k8s-file, M-06 B)
podman logs --since 1h app | jq -c 'select(.level=="error") | {time,event,route,request_id,err:.err.message}'
# Logins fallidos agrupados por IP (DEMO/PROD, Loki)
logcli query --since=1h '{service="app",category="security"} | json | event="auth.login.failed"' -o jsonl | jq -r '.client_ip' | sort | uniq -c
# p95 de propagación a barra
promtool query instant http://prometheus:9090 'histogram_quantile(0.95, sum by (le)(rate(order_propagation_seconds_bucket{target="kitchen"}[10m])))'
# Estado de contenedores (DEV/TEST)
podman ps --format '{{.Names}} {{.Status}}'
```

Formato de cada hallazgo: fecha, `monitoring` como quien reporta, agente
responsable (rendimiento → developer / software-engineer; seguridad →
cybersecurity; UX → ux-designer; infraestructura → infrastructure), métrica o
evento concreto con su valor, umbral incumplido, ventana temporal, ejemplo de
`request_id` y la consulta usada para reproducirlo.

---

## 10. Cambios que se piden a la arquitectura (resumen)

Registrados en `docs/estado.md` con su responsable.

1. **`/healthz` = liveness sin BD; nuevo `/readyz` con la BD** (§8.1).
   Hoy `docs/arquitectura.md` §5 dice "`/healthz` (BD alcanzable)". → software-engineer.
2. **Puerto interno de métricas 9464** con `/metrics` (`prom-client`), aparte del
   3000. → software-engineer (infrastructure: no publicarlo; Caddy no lo enruta).
3. **Endpoint de telemetría del cliente** `POST /api/v1/telemetry`: con sesión,
   lotes cada 60 s como máximo, límite de tamaño y de frecuencia, esquema zod
   estricto con enums (pantalla, flujo, paso, campo, código) y sin texto libre
   salvo `client.js_error` filtrado (§4.4). Necesario para la propagación
   extremo a extremo, las métricas UX y los errores JS. → software-engineer,
   revisión de cybersecurity; ux-designer define flujos y pasos.
4. **`emittedAt` en cada evento SSE de pedido/producto** (hora del servidor en el
   `COMMIT`) para medir la propagación en el cliente con el desfase de
   `serverTime` que ya existe. → software-engineer.
5. **`X-Request-Id`** generado por Caddy, aceptado por `app`, devuelto en las
   respuestas y en `error.requestId` (§2.3). → software-engineer; infrastructure
   (Caddyfile); ux-designer (si muestra el código al usuario).
6. **Nombres de campos de log en `snake_case`** (`request_id`, `user_id`, `role`)
   en lugar de los `requestId`/`userId` de la §11 de la arquitectura. → software-engineer (solo actualizar el texto).
7. **Usuario de BD de solo monitorización** (`pg_monitor`) para
   `postgres_exporter` y `pg_stat_statements` precargado (§5.4). → infrastructure,
   software-engineer (migración que crea la extensión).
8. **Recogida de logs y métricas de contenedores compatible con la §3.4 de
   las reglas** (§5.5 y §6.5). **Resuelto (M-06):** el humano eligió la
   opción B, sin excepción: `k8s-file` con `log_opt path` a un directorio
   dedicado leído en `ro` por Alloy, y temporizador systemd del usuario →
   `.prom` → `node_exporter` solo `textfile`, con las condiciones 1–7 de
   `docs/seguridad.md` §6.3. → infrastructure (implementa, unifica su §10 y
   §11.1), cybersecurity (revisa el script y las unidades; decide sobre las
   lecturas pendientes de §6.5).
9. **Regla de redacción `/pin/i`** (SEC-017, §4.3 b) también en
   `docs/arquitectura.md` §11, junto con `confirmPin` en la lista explícita.
   → software-engineer.
