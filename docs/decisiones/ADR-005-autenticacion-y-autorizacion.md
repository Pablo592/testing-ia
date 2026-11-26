# ADR-005: Autenticación y autorización

- **Estado:** Propuesto (pendiente de la puerta de la Etapa 1 y de la revisión
  de Cybersecurity)
- **Fecha:** 2026-11-21 (revisiones 2026-11-21 y 2026-11-23)
- **Autor:** Software Engineer

## Contexto

- Acceso con **usuario + PIN de 4 a 6 dígitos** (supuesto 6, HU-01), en
  dispositivos compartidos del local.
- Bloqueo de 5 min tras 5 intentos fallidos; mensaje que no revela si falla el
  usuario o el PIN; "Usuario desactivado" si el PIN es correcto (HU-01).
- Cierre por inactividad a los 15 min, salvo la pantalla de barra con la cola
  abierta (HU-01). Logout que invalida la sesión.
- Cambio de rol efectivo en la siguiente acción sin volver a entrar; sesión de
  un usuario desactivado cerrada en ≤ 1 min; restablecer PIN invalida el
  anterior al instante y obliga a cambiarlo (HU-07).
- Autorización por rol validada en servidor, `403` por URL o API (HU-01).
- Autorización puntual con PIN de encargado para acciones sensibles (HU-06).
- PIN con hash, nunca en claro ni en logs (HU-01, HU-07). Login ≤ 1 s p95.

## Opciones consideradas

**Formato de sesión**
1. **JWT sin estado** (en cookie o cabecera): no permite revocar al instante sin
   añadir una lista de revocación en BD, que lo convierte en sesión con estado;
   el cambio de rol inmediato también exige consultar la BD. Más complejo sin
   ventaja con una sola instancia.
2. **Sesión opaca en servidor** (token aleatorio en cookie, registro en
   PostgreSQL): revocación, inactividad y cambio de rol triviales.
3. **Proveedor de identidad externo (OIDC, Keycloak):** desproporcionado para
   15 empleados con PIN.

**Hash del PIN**
1. bcrypt: válido, pero argon2id es la recomendación actual (OWASP).
2. **argon2id** con *pepper*: resistente a GPU; el *pepper* (secreto fuera de la
   BD) impide el ataque offline de 10⁴–10⁶ PIN si solo se filtra la BD.
3. SHA-256 con sal: inaceptable para secretos de tan baja entropía.

## Decisión

**Sesión opaca en servidor + argon2id con pepper + RBAC en servidor.**

- **Login** `POST /api/v1/auth/login {name, pin}`:
  1. Busca el usuario (nombre sin distinguir mayúsculas). Si no existe, verifica
     contra un hash ficticio (tiempo constante) y responde `401 INVALID_CREDENTIALS`.
  2. Si `locked_until > now()` → `423` con `retryAfterSeconds`, sin verificar.
  3. Verifica argon2id(pin + pepper). Fallo: `failed_attempts += 1` y se aplica
     la escala progresiva 5/10/15/20 de la revisión (b) (el contador **no** se
     reinicia al bloquear). Responde `401`; los intentos durante el bloqueo
     reciben `423` (HU-01). *(Texto original: bloqueo fijo de 5 min con
     reinicio del contador; sustituido por SEC-001.)*
  4. Éxito: reinicia el contador. Si `active = false` → `403 USER_DISABLED`.
     Si no, crea la sesión.
  5. Además, límite de intentos por IP de origen (en memoria) para frenar el
     rociado de un mismo PIN contra todos los usuarios.
- **Sesión:** token de 256 bits (CSPRNG) en cookie `__Host-sid` con `HttpOnly;
  Secure; SameSite=Strict; Path=/`, sin `Domain` ni `Max-Age`/`Expires`
  *(antes `sid`; cambiado por SEC-021, ver revisión (c))*. En BD (`sessions`) solo `SHA-256(token)`. Cada
  petición resuelve sesión + usuario con una consulta (índice único): rol y
  estado siempre actuales.
- **Inactividad:** 15 min desde `last_activity_at`. Actualiza la actividad
  cualquier petición REST y `POST /session/activity` (el cliente lo envía como
  mucho una vez por minuto si hay toques sin otras peticiones). No cuentan el
  flujo SSE ni los `ping`. **Rol `kitchen`:** mientras su flujo SSE esté
  conectado, no caduca por inactividad. **Caducidad absoluta** de 12 h para
  todas las sesiones, configurable solo a la baja (antes 14 h; cambiado por
  SEC-004, ver revisión (b)).
- **Revocación:** logout, desactivación, restablecimiento de PIN y cambio de
  PIN propio marcan `revoked_at` y cierran el flujo SSE de las sesiones afectadas
  (ADR-004). Cambio de rol: no revoca; envía `session.updated`.
- **PIN provisional:** con `must_change_pin = true` solo se permiten
  `POST /auth/pin`, `GET /auth/me` y `POST /auth/logout`.
- **Reglas de PIN** (HU-07): 4–6 dígitos, no todos iguales, sin secuencias
  ascendentes o descendentes de 4+ dígitos; función pura en `packages/shared`.
- **argon2id:** parámetros iniciales a afinar en el hardware real para ≈ 100–250
  ms por verificación (p. ej. m = 19 MiB, t = 2, p = 1, mínimo OWASP). El
  *pepper* se inyecta con `podman secret`.
- **CSRF:** `SameSite=Strict`, mismo origen y comprobación de la cabecera
  `Origin` en métodos que modifican datos.
- **Autorización:** matriz rol → permisos en `packages/shared/permissions.ts`
  (`docs/arquitectura.md` §7). Cada ruta declara un permiso; el middleware
  responde `403 FORBIDDEN` antes del handler. La UI usa la misma matriz solo para
  ocultar opciones. Las respuestas para el rol `kitchen` usan un serializador
  sin importes.
- **Aprobación de encargado (HU-06):** campo `managerApproval {name, pin}` en la
  petición; se verifica igual que un login (cuenta para el bloqueo de ese
  encargado), exige rol `manager` activo y se registra en `authorized_by`. No
  crea sesión.
- **Encargado inicial:** comando `create-initial-manager` que lee nombre y PIN
  provisional de un secreto y solo actúa si no hay ningún encargado.

## Consecuencias

- (+) Revocación inmediata y permisos siempre actuales con un diseño simple.
- (+) Una filtración de la BD sola no permite recuperar PIN (pepper).
- (−) Una consulta a BD por petición para resolver la sesión: despreciable a esta
  escala (índice único, ≤ 10 dispositivos).
- (−) El bloqueo por usuario permite que alguien bloquee a propósito a un
  compañero durante 5 min (DoS leve, aceptado por el requisito).
- (−) **Riesgo residual:** un PIN de 4 dígitos admite ~1 440 intentos/día por
  usuario con este bloqueo. Se reporta a Cybersecurity y PO con propuestas en
  `docs/estado.md`.
- Requiere HTTPS en cualquier entorno que no sea `localhost` (cookie `Secure`),
  ver ADR-007.

## Revisión 2026-11-21 (tarea 1.3b)

La decisión (sesión opaca + argon2id + RBAC) **no cambia**. Ajustes:
- **Aprobación de encargado (supuesto 22):** `managerApproval {managerId, pin}`
  (se elige el encargado de `GET /staff/managers` y se teclea su PIN). Vale para
  **una sola acción por construcción**: viaja dentro de la petición de esa
  acción y no deja token ni estado en servidor. Si la sesión ya es de
  encargado, se omite y `authorized_by = actor`, salvo que Cybersecurity exija
  reautenticación (el contrato ya lo admite). Fallo: `403
  MANAGER_APPROVAL_INVALID` con la misma respuesta para id inexistente, no
  encargado o PIN incorrecto. Límites y bloqueo: Cybersecurity.
- **Nuevos permisos:** `order:serve` (W, M; barra recibe `403`),
  `approval:request` (W, M), `settings:read`/`settings:manage` (M, HU-09;
  **retirados** en la revisión (c): HU-09 fuera del MVP),
  `telemetry:write` (todos), además de los que separa `docs/permisos.md`
  (`staff:read`, `staff:unlock`, `reports:close`, `session:self`,
  `events:subscribe`). Matriz en `docs/arquitectura.md` §7.
- `POST /telemetry` no cuenta como actividad para la inactividad de 15 min.

## Revisión 2026-11-21 (b): decisiones de Cybersecurity (`docs/seguridad.md` §6)

Estas reglas **sustituyen** a las equivalentes de la sección "Decisión":

- **Longitud de PIN (SEC-001):** encargado exactamente 6 dígitos (también el
  encargado inicial); camarero/cajero y barra 4–6. Reglas de composición en
  `packages/shared`: no todos iguales, sin secuencias de 4+ en cualquier
  posición, no un bloque repetido, no en la **lista de PIN prohibidos**
  versionada (≥ 100 más frecuentes). `users.pin_digits` guarda la longitud: al
  promocionar a encargado a un usuario con menos de 6 → `must_change_pin = true`.
- **Bloqueo progresivo (SEC-001):** `failed_attempts` cuenta fallos
  consecutivos acumulados y **no** se reinicia al expirar un bloqueo; solo lo
  reinician un acceso correcto, `POST /staff/:id/unlock`, el restablecimiento
  de PIN o el comando `unlock-user`. Al llegar a 5 / 10 / 15 → bloqueo 5 / 15 /
  60 min (`423 LOCKED {retryAfterSeconds}`); a 20 → `locked_manual = true`
  (`423 ACCOUNT_LOCKED_MANUAL`). Durante un bloqueo no se verifica el PIN ni
  cuentan intentos.
- **Límite por origen (SEC-001):** 10 fallos (login + aprobaciones +
  reconfirmaciones) en 10 min desde una IP → `429` 10 min para cualquier
  usuario desde esa IP, comprobado **antes** del hash (en memoria; una sola
  instancia). Aprobaciones: además 5 fallos por sesión en 10 min → `429`.
  Requiere IP real (SEC-003, ADR-007).
- **Aprobaciones de encargado:** cuentan en el mismo contador del encargado
  elegido; una cuenta bloqueada, desactivada o con PIN provisional no aprueba
  (mismo error genérico).
- **Reconfirmación de PIN del encargado (SEC-007):** campo `confirmPin` (PIN
  del propio encargado de la sesión) obligatorio en: anular cobro, alta de
  usuario, cambio de rol, activar/desactivar, restablecer PIN y desbloquear.
  Se verifica con el mismo mecanismo que `managerApproval` (mismo contador,
  mismos límites) y no crea estado. Para las acciones de HU-06 el encargado con
  sesión propia **no** reconfirma.
- **Desbloqueo:** `POST /staff/:id/unlock` (M, `staff:unlock`, con `confirmPin`)
  y comando `unlock-user <nombre>` en la imagen (operador del host, sin root),
  auditado con actor `system`.
- **Caducidad absoluta (SEC-004):** **12 h** para todos los roles (incluida
  barra); configurable solo a la baja: `config.ts` no arranca con un valor
  mayor. Inactividad 15 min sin cambios; la exención es solo del rol `kitchen`
  con flujo SSE abierto (un encargado con la cola abierta no la hereda).
- **Rejilla de login (SEC-005):** `GET /auth/login-options` público: solo
  `[{name, role}]` de usuarios activos, sin `id`, bloqueo ni `mustChangePin`;
  `Cache-Control: no-store`; mismo límite por IP que el login. Aceptable solo
  con la red restringida de SEC-002.
- Consecuencia: el riesgo residual de la sección anterior (~1 440 intentos/día)
  queda acotado a **20 intentos** por cuenta antes de exigir intervención
  humana, con alertas (Monitoring).

## Revisión 2026-11-23 (c): SEC-016, SEC-021 y HU-09 (tarea 1.3c)

La decisión (sesión opaca + argon2id con pepper + RBAC) **no cambia**. Estas
reglas sustituyen a las equivalentes de las secciones anteriores:

- **Contexto (SEC-016, alta):** `POST /auth/pin` verificaba `currentPin` sin
  contar fallos: con una sesión desatendida se podía probar PIN sin límite y,
  al acertar, cambiarlo y quedarse con la cuenta. Es la fuerza bruta que
  SEC-001 cerró en el login, por otra puerta.
- **Opciones evaluadas:** (1) añadir los límites en `POST /auth/pin` como en
  las demás rutas; (2) **una función única `verifyPin`** por la que pasa toda
  verificación de PIN. Se elige (2): con (1) cada ruta nueva tendría que
  acordarse de los límites (es exactamente el fallo que se ha producido).
- **Decisión:** `verifyPin(target, pin, {ip, sessionId?, purpose})` en el
  módulo `auth` es el **único** componente que recibe el hasher argon2id
  (DI por constructor). La usan el login (`pin`), `managerApproval.pin`,
  `confirmPin` y `currentPin`. Orden:
  1. límite por IP: 10 fallos de cualquier verificación de PIN en 10 min →
     `429` durante 10 min, **antes** del hash;
  2. límite por sesión (aprobación, reconfirmación y cambio de PIN, sumados):
     5 fallos en 10 min → `429`, **antes** del hash;
  3. cuenta bloqueada → `423` sin hash ni contar el intento;
  4. hash (ficticio si el usuario no existe o no es un encargado activo);
  5. fallo → suma al contador del usuario cuyo PIN se verifica (escala
     5/10/15/20 → 5 min / 15 min / 60 min / `locked_manual`), al de la IP y al
     de la sesión. **Al llegar a `locked_manual` se revocan todas las sesiones
     de esa cuenta** (en la misma transacción; `session.revoked` tras el
     `COMMIT`), sea cual sea la ruta que lo provocó;
  6. acierto → contador a 0.
  Detalle en `docs/arquitectura.md` §7.
- **Alcance de `POST /auth/pin` (PO ronda 1.1f, criterio de menor carga):**
  solo sirve para el cambio obligatorio del PIN provisional
  (`must_change_pin = true`, HU-07/CA-F04, CA-F09). Con `must_change_pin =
  false` responde `403 FORBIDDEN` sin verificar el PIN. No hay cambio
  voluntario en el MVP: si se sospecha que un PIN se ha visto, el encargado lo
  restablece (`reset-pin`). SEC-016 aplica igual a su `currentPin`.
- **Bloqueo temporal (HU-01/CA-F12):** `confirmPin` y `currentPin` sobre una
  cuenta bloqueada → `423 LOCKED {retryAfterSeconds}` sin comprobar el PIN y
  sin contar como fallo. Bloqueo indefinido → se revocan todas las sesiones
  (HU-01/CA-F13).
- **`POST /auth/pin`:** errores `403 PIN_INVALID` (no `401`: la sesión sigue
  siendo válida), `423 LOCKED {retryAfterSeconds}`, `423 ACCOUNT_LOCKED_MANUAL`
  (la sesión queda revocada) y `429 TOO_MANY_ATTEMPTS {retryAfterSeconds}`.
- **Cookie (SEC-021, RS-10):** `__Host-sid` con `HttpOnly; Secure;
  SameSite=Strict; Path=/`, sin `Domain` ni `Max-Age`/`Expires`. El prefijo
  impide que otro servicio de la red o un subdominio fije o pise la cookie. En
  DEV (`http://localhost`) Chromium y Firefox la aceptan.
- **HU-09 fuera del MVP:** no existen `settings:read` ni `settings:manage`. La
  configuración de instalación (mesas, umbral de retraso) llega al cliente en
  `localConfig` de `GET /auth/me`, filtrada por rol, sin permiso propio.
- **Consecuencias:**
  - (+) Ninguna ruta puede verificar un PIN sin los límites; un solo punto que
    probar (RS-16b) y revisar.
  - (+) A los 20 fallos no queda ninguna sesión viva de la cuenta atacada.
  - (−) Un compañero puede bloquear a propósito la cuenta de otro también desde
    las rutas con sesión (mismo DoS leve ya aceptado en el login); como mucho
    5 fallos por sesión cada 10 min y 10 por IP.
  - (−) Los contadores por IP y por sesión viven en memoria: un reinicio de
    `app` los vacía (aceptado; el contador de la cuenta está en BD y no se
    pierde).

## Revisión 2026-11-26 (d): `verifyPin` con peticiones simultáneas (SEC-038, SEC-047, SEC-043; tarea 2.2c)

La decisión (sesión opaca + argon2id con pepper + RBAC + `verifyPin` única)
**no cambia**. Se fija cómo resiste la concurrencia.

- **Contexto (SEC-038, alta, ya corregido):** los pasos de la revisión (c)
  eran "comprobar y luego actuar". Con 300 logins simultáneos desde una IP se
  hacían 300 verificaciones y el PIN correcto entraba en una cuenta ya en
  `locked_manual`; con `currentPin`, el PIN provisional se cambiaba en una
  cuenta bloqueada.
- **Opciones evaluadas:**
  1. **Todo en BD:** sumar el intento con `UPDATE users SET failed_attempts =
     failed_attempts + 1 WHERE … AND NOT locked_manual AND (locked_until IS
     NULL OR locked_until <= $now) RETURNING` **antes** del hash y restarlo
     si acierta. Vale con varias instancias, pero cada intento son dos
     escrituras, y el "fallo anotado antes de saber si falla" complica los
     logs, las métricas y la escala 5/10/15/20.
  2. **Cerrojo por cuenta en memoria + acierto condicionado en BD** (la
     alternativa que admite SEC-038): las verificaciones de una cuenta se
     serializan (FIFO) y cada una lee la fila en su turno; el acierto y su
     efecto (crear la sesión, cambiar el PIN) van en una transacción con
     `UPDATE … WHERE NOT locked_manual AND (locked_until IS NULL OR
     locked_until <= $now)`. Los cupos de IP y sesión se reservan de forma
     síncrona antes del primer `await`.
- **Decisión: opción 2**, implementada en la 2.5 y la 2.8b y verificada por
  Cybersecurity (2.6, 2.8c). Es la más simple con **una sola instancia**,
  que ya es un supuesto de la arquitectura (bus SSE y cupos por IP en
  memoria, `docs/arquitectura.md` §1, §10), y deja el código del fallo como
  estaba. Detalles obligatorios (`docs/arquitectura.md` §7): clave del cerrojo
  `user:<id>` resuelta por PostgreSQL con la misma condición que el índice
  único (`lower(name)`, SEC-047), nunca con `toLowerCase()` de JavaScript;
  semáforo de 4 operaciones argon2 con cola acotada a 32 (llena → `503`);
  clave del cupo por IP = IPv4 o prefijo /64 de IPv6 y poda que nunca borra
  entradas bloqueadas (SEC-043, pendiente de implementar antes de HU-06).
- **Consecuencias:**
  - (+) RS-05b se cumple: una IP nunca tiene más verificaciones en curso que
    los fallos que le quedan; una cuenta no supera el umbral siguiente; un
    acierto con la cuenta ya bloqueada no crea sesión ni cambia el PIN.
  - (+) Una sola función que probar; las rutas de HU-04, HU-06 y HU-07 la
    heredan.
  - (−) Refuerza el supuesto de **una sola instancia** de `app`: con varias,
    hay que pasar a la opción 1 (o a un cerrojo consultivo de PostgreSQL por
    cuenta) en un ADR nuevo. Hoy no hay ninguna historia que lo pida (YAGNI).
  - (−) Todos los dispositivos de un mismo /64 IPv6 comparten el cupo por IP;
    por eso el despliegue publica `proxy` solo por IPv4 (ADR-007).
  - (−) Con muchas verificaciones a la vez (solo en un ataque) algunas
    reciben `503` en vez de esperar sin límite.
