# ADR-005: Autenticación y autorización

- **Estado:** Propuesto (pendiente de la puerta de la Etapa 1 y de la revisión
  de Cybersecurity)
- **Fecha:** 2026-11-21
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
  3. Verifica argon2id(pin + pepper). Fallo: `failed_attempts += 1`; al llegar a
     5, `locked_until = now() + 5 min` y `failed_attempts = 0`. Responde `401`;
     el sexto intento (y siguientes durante el bloqueo) recibe `423` (HU-01).
  4. Éxito: reinicia el contador. Si `active = false` → `403 USER_DISABLED`.
     Si no, crea la sesión.
  5. Además, límite de intentos por IP de origen (en memoria) para frenar el
     rociado de un mismo PIN contra todos los usuarios.
- **Sesión:** token de 256 bits (CSPRNG) en cookie `sid` con `HttpOnly; Secure;
  SameSite=Strict; Path=/`. En BD (`sessions`) solo `SHA-256(token)`. Cada
  petición resuelve sesión + usuario con una consulta (índice único): rol y
  estado siempre actuales.
- **Inactividad:** 15 min desde `last_activity_at`. Actualiza la actividad
  cualquier petición REST y `POST /session/activity` (el cliente lo envía como
  mucho una vez por minuto si hay toques sin otras peticiones). No cuentan el
  flujo SSE ni los `ping`. **Rol `kitchen`:** mientras su flujo SSE esté
  conectado, no caduca por inactividad. **Caducidad absoluta** de 14 h
  (configurable) para todas las sesiones, a validar por Cybersecurity.
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
