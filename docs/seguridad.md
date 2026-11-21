# Seguridad — Modelo de amenazas y hallazgos

> Responsable: Cybersecurity. Etapa 1 (tarea 1.4), 2026-11-21.
> Entradas: `docs/historias/` (README + HU-01..HU-08, versión del 2026-11-21),
> `docs/arquitectura.md`, `docs/decisiones/ADR-001..008`, `docs/ux/` (borrador
> en curso: `flujos.md`, wireframes 01–05), `docs/reglas-equipo.md` §3.
> Permisos y roles: `docs/permisos.md`.
>
> Todavía no hay código, Containerfile ni compose: la revisión de contenedores
> es **de diseño** (arquitectura §10). Se repetirá sobre los ficheros reales de
> `deploy/` en cuanto Infrastructure los entregue (tarea 1.5).

## Índice
1. Alcance y método
2. Activos
3. Actores de amenaza
4. Superficies de ataque y fronteras de confianza
5. Amenazas (STRIDE)
6. Decisiones sobre los hallazgos abiertos de `docs/estado.md`
7. Requisitos de seguridad verificables (para Testing)
8. Revisión de la arquitectura frente a la política de contenedores (§3)
9. Hallazgos (SEC-xxx)

---

## 1. Alcance y método

- **Método:** STRIDE por componente y flujo de datos (diagrama de
  `docs/arquitectura.md` §2), más casos de abuso de negocio (fraude de caja).
- **Escala de severidad** (probabilidad × impacto):

| Impacto \ Probabilidad | Baja | Media | Alta |
|---|---|---|---|
| **Crítico** (toma de control de encargado, fraude masivo, root en host) | Alta | Crítica | Crítica |
| **Alto** (fraude puntual, suplantación, fuga de PIN/tokens, parada del local) | Media | Alta | Alta |
| **Medio** (fuga de datos de negocio, DoS temporal, acción no atribuible) | Baja | Media | Media |
| **Bajo** | Baja | Baja | Baja |

- **Severidad inherente:** sin la mitigación propuesta. **Residual:** con la
  mitigación aplicada y verificada. La regla de bloqueo se aplica sobre los
  **hallazgos** (§9), no sobre las amenazas mitigadas por diseño.

## 2. Activos

| ID | Activo | Por qué importa |
|---|---|---|
| A1 | PIN del personal, `pin_hash`, *pepper* | Identidad de cada empleado; el PIN de encargado da control total |
| A2 | Token de sesión (cookie) | Equivale al PIN mientras la sesión vive |
| A3 | Cobros, anulaciones y cierres de caja (`payments`, `payment_orders`, `cash_closings`) | Dinero; base para cuadrar caja; posible uso fiscal futuro |
| A4 | Registro de auditoría (`audit_log`) | No repudio; detección de fraude |
| A5 | Menú y precios | Un precio alterado = fraude o pérdidas |
| A6 | Cuentas y roles del personal | Escalada de privilegios |
| A7 | Disponibilidad del servicio en horario de apertura | Sin servicio el local no puede tomar pedidos (offline fuera de alcance) |
| A8 | Clave privada de la CA interna de Caddy y certificados TLS | Con ella se puede hacer MITM a todos los dispositivos que confían en la CA |
| A9 | Credenciales de BD (`postgres`, `app_owner`, `app_rw`) y demás secretos | Acceso directo a todos los datos |
| A10 | Datos personales: nombres del personal, `customer_ref` y notas (texto libre) | RGPD (datos mínimos, pero existentes) |
| A11 | Copias de seguridad (`pg_dump`) | Contienen A1 (hashes), A3, A4, A10 |
| A12 | Host y motor de contenedores (usuario rootless, volúmenes) | Punto único de compromiso de todo lo anterior |

## 3. Actores de amenaza

| ID | Actor | Capacidad / motivación |
|---|---|---|
| X1 | Cliente del local en la Wi-Fi de clientes | Escucha y ataques de red si la Wi-Fi no está separada; curiosidad, consumir gratis |
| X2 | Atacante en internet | Solo si PROD es una VM pública (pregunta 11): rociado de PIN, escaneo, explotación de CVE |
| X3 | Empleado (camarero) deshonesto | Acceso legítimo a un dispositivo; quiere quedarse efectivo (cancelar/anular), usar el PIN del encargado o de un compañero |
| X4 | Empleado de barra | Rol con pocos permisos; puede intentar escalar o ver importes |
| X5 | Ex-empleado | Conoce PIN ajenos observados, nombres de usuario, la URL |
| X6 | Persona con acceso físico a un dispositivo desatendido | Usa la sesión abierta (tablet en la barra, pantalla de cocina) |
| X7 | Encargado malicioso | Máximo privilegio; el control es la auditoría (riesgo aceptado: suele ser el dueño) |
| X8 | Cadena de suministro (npm, imágenes base) | Código malicioso en dependencias o imágenes |
| X9 | Operador/agente con acceso al host | Errores de configuración (motor root, `exec -u root`, montar el socket) |

## 4. Superficies de ataque y fronteras de confianza

Fronteras: **FT1** Wi-Fi/red ↔ Caddy · **FT2** Caddy ↔ `app` (red interna) ·
**FT3** `app` ↔ `db` · **FT4** contenedores ↔ host · **FT5** navegador
(dispositivo compartido) ↔ servidor · **FT6** cadena de construcción ↔ imagen.

| ID | Superficie | Frontera | Autenticación |
|---|---|---|---|
| S1 | `POST /api/v1/auth/login` y la rejilla de usuarios del login (P-01) | FT1 | Pública |
| S2 | Resto de la API REST `/api/v1/*` | FT1/FT2 | Sesión + RBAC |
| S3 | Campo `managerApproval {name,pin}` (HU-06) | FT1/FT2 | Sesión de W + PIN de M |
| S4 | Flujo SSE `GET /api/v1/events` | FT1/FT2 | Sesión |
| S5 | SPA estática, `localStorage` (borrador), caché del navegador | FT5 | — |
| S6 | Caddy :8080/:8443 (o 80/443 en PROD) | FT1 | TLS |
| S7 | Red Wi-Fi del local / internet (según PROD) | FT1 | WPA2/3 |
| S8 | PostgreSQL :5432 | FT3 | SCRAM |
| S9 | Host: SSH, usuario de servicio, volúmenes, `podman secret`, copias | FT4 | Claves SSH |
| S10 | Construcción: `pnpm install`, imágenes base, escáneres | FT6 | — |
| S11 | Logs (stdout de `app`, Caddy, `db`; journald) | FT4 | — |
| S12 | Comando `create-initial-manager` y su secreto | FT4 | Acceso al host |
| S13 | DEV: Vite dev server, API en `watch`, `db` | FT1 (si se publica fuera de localhost) | — |

## 5. Amenazas (STRIDE)

P = probabilidad, I = impacto. "Inh." = severidad inherente, "Res." = residual
con la mitigación. **RS-xx** = requisito verificable de §7. **SEC-xxx** =
hallazgo de §9 cuando la mitigación exige cambiar un documento de otro agente.

### 5.1 Suplantación (Spoofing)

| ID | Amenaza | Actor | P | I | Inh. | Mitigación | Res. |
|---|---|---|---|---|---|---|---|
| T-01 | Fuerza bruta online del PIN de un usuario (4 dígitos, bloqueo 5/5 min ≈ 1 440 intentos/día → PIN aleatorio adivinado en ~3,5 días de media) | X2, X3, X5 | Alta | Crítico (si es encargado) | **Crítica** | Política de PIN de §6.1: PIN de 6 dígitos para encargado, bloqueo progresivo con bloqueo indefinido a los 20 fallos (máx. 20 intentos antes de intervención humana), lista de PIN prohibidos, alertas. RS-01..RS-05, SEC-001 | Baja |
| T-02 | Rociado: probar PIN comunes (1212, 2580, 1004…) contra los ≤ 15 usuarios desde un dispositivo | X2, X3 | Alta | Alto | **Alta** | Lista de PIN prohibidos (RS-02), límite por IP de fallos (RS-05), alerta de bloqueos en varios usuarios (RS-30) | Baja |
| T-03 | Saltarse el límite por IP falsificando `X-Forwarded-For`, o límite inútil porque el motor rootless oculta la IP real (todas las peticiones llegan desde la misma IP interna) | X2, X3 | Media | Alto | **Alta** | `trustProxy` solo para Caddy; red rootless que conserve la IP de origen (pasta). RS-06, SEC-003 | Baja |
| T-04 | Robo de cookie o PIN por escucha/MITM en la Wi-Fi (sin TLS, o usuarios que aceptan un aviso de certificado) | X1 | Media | Alto | **Alta** | HTTPS obligatorio fuera de `localhost`, HSTS, CA interna instalada solo en dispositivos del local, Wi-Fi del personal separada de la de clientes, prohibido "aceptar el riesgo" en avisos de certificado. §6.2, RS-26, RS-28, SEC-002 | Baja |
| T-05 | Uso de una sesión abierta en un dispositivo desatendido (sobre todo una sesión de encargado: crear un encargado nuevo, anular cobros) | X6, X3 | Alta | Alto | **Alta** | Inactividad 15 min (HU-01), exención solo para el rol `kitchen`, caducidad absoluta 12 h (§6.2), reconfirmación de PIN en acciones críticas del encargado (SEC-007) | Media |
| T-06 | Observar el PIN del encargado cuando lo teclea en la tablet del camarero (aprobación HU-06) | X3 | Media | Alto | **Alta** | PIN enmascarado (wireframe P-01 ya lo hace), PIN de encargado de 6 dígitos, registro de cada aprobación con `authorized_by` y alerta si se aprueba desde un dispositivo/sesión inusual (RS-30); el PIN nunca se guarda en estado del cliente tras la petición (RS-29b). Riesgo residual aceptado: es inherente a la aprobación presencial | Media |
| T-07 | Fijación o predicción del token de sesión | X1, X3 | Baja | Alto | Media | Token de 256 bits CSPRNG, nuevo en cada login, cookie `__Host-sid`. RS-10, RS-11 | Baja |
| T-08 | Sesión de un usuario desactivado o con PIN restablecido sigue viva | X5 | Media | Alto | Alta | Resolución de sesión+usuario en cada petición y revocación con cierre del SSE (ADR-005). RS-14 | Baja |
| T-09 | CSRF (incluido CSRF de login) desde otra web abierta en el dispositivo | X1, X2 | Baja | Alto | Media | `SameSite=Strict`, comprobación estricta de `Origin` (también en `/auth/login`), solo `application/json`. RS-24 | Baja |
| T-10 | El secreto del encargado inicial se queda en el host y permite recrear/reutilizar un PIN conocido | X9, X5 | Baja | Alto | Media | `create-initial-manager` solo actúa sin encargados; PIN provisional obligatorio de cambiar; el secreto se borra tras usarlo. RS-09 | Baja |
| T-11 | Enumeración de usuarios (rejilla de P-01, `423` frente a `401`) | X1, X2 | Alta | Bajo | Baja | Aceptado **solo** si el login no es alcanzable desde fuera de la red del personal (SEC-002). La rejilla muestra nombre y rol de usuarios activos, nada más (SEC-005) | Baja |

### 5.2 Manipulación (Tampering)

| ID | Amenaza | Actor | P | I | Inh. | Mitigación | Res. |
|---|---|---|---|---|---|---|---|
| T-12 | El cliente impone precio o total (campo extra `unitPriceCents`, `amountCents`) | X3 | Media | Alto | Alta | Precios y totales en servidor (HU-02/HU-04); esquemas zod `.strict()` que rechazan campos desconocidos. RS-20 | Baja |
| T-13 | Asignación masiva: `PATCH /staff/:id` con `pinHash`, `failedAttempts`, `lockedUntil`, `mustChangePin`; `PATCH /products/:id` con campos no previstos | X3, X7 | Media | Alto | Alta | Esquemas estrictos con lista blanca de campos por ruta. RS-20 | Baja |
| T-14 | Desbordamiento de enteros: `quantity smallint` sin máximo (32 767 × 99 999 céntimos > 2³¹−1) hace fallar el cálculo o el `INSERT` de `total_cents`; cantidades absurdas como DoS | X3 | Media | Medio | Media | Límites de cantidad y nº de líneas en servidor y BD. RS-23, SEC-006 | Baja |
| T-15 | Reutilizar un UUID de otro recurso (ADR-008) para leer o pisar el pedido/cobro de otro | X3 | Baja | Medio | Baja | Si el id existe con otro dueño o contenido → `409` sin devolver el recurso existente. RS-21 | Baja |
| T-16 | Borrar o reescribir auditoría, cobros o cierres desde la app | X3 (vía fallo), X7 | Media | Alto | Alta | Rol `app_rw` sin `UPDATE/DELETE` en esas tablas + trigger (ADR-003); `app` nunca recibe credenciales de `app_owner` ni de `postgres`. RS-32, RS-33, RS-38 | Baja |
| T-17 | Modificar líneas de un pedido cobrado o cobrar dos veces por condición de carrera | X3 | Media | Alto | Alta | Máquina de estados en servidor, `SELECT … FOR UPDATE`, índice único parcial (ADR-008). Recomendado además trigger que rechace cambios en `order_lines` de pedidos `paid` (defensa en profundidad, a criterio del SE) | Baja |
| T-18 | Barra ejecuta acciones de camarero (crear, cobrar, cancelar) llamando a la API | X4 | Media | Alto | Alta | RBAC en servidor con denegación por defecto. RS-17, RS-18 | Baja |
| T-19 | Borrador en `localStorage` de un usuario reutilizado por otro en el mismo dispositivo (pedido enviado a nombre de quien no lo tomó; mezcla de pedidos) | X3 | Media | Medio | Media | Borrador asociado a `userId`; no se muestra a otro usuario; se descarta al caducar. RS-23b, SEC-012 | Baja |
| T-20 | Dependencia npm maliciosa o vulnerable (scripts `postinstall`, typosquatting) | X8 | Media | Crítico | **Crítica** | Lockfile congelado, pocas dependencias, `pnpm audit` + Trivy/Grype en cada build, scripts de instalación deshabilitados salvo lista blanca (`argon2`), imágenes por digest. RS-39 | Media |
| T-21 | Imagen base sustituida (tag movido) | X8 | Baja | Crítico | Alta | Imágenes por digest (§3.2), escaneo en cada build. RS-39 | Baja |

### 5.3 Repudio

| ID | Amenaza | Actor | P | I | Inh. | Mitigación | Res. |
|---|---|---|---|---|---|---|---|
| T-22 | Un empleado niega haber cobrado, cancelado o anulado | X3, X7 | Media | Medio | Media | Usuario de la sesión en cada pedido/cobro/cambio (HU-01, HU-06), `audit_log` inmutable, `authorized_by` en aprobaciones. RS-30, RS-32 | Baja |
| T-23 | Fraude de caja: cobrar en efectivo sin registrar y luego cancelar el pedido "Pendiente" sin autorización (HU-06), o anulación de cobro tras cobrar en efectivo | X3, X7 | Media | Alto | **Alta** | Auditoría + visibilidad: el resumen del día debe mostrar cancelaciones y anulaciones **por usuario**, para que el encargado detecte patrones. SEC-008. Riesgo residual aceptado para X7 | Media |
| T-24 | Intentos de login y aprobaciones fallidas sin rastro | X3 | Media | Medio | Media | Eventos de seguridad obligatorios (sin PIN). RS-30 | Baja |
| T-25 | Varias personas usan la misma sesión de barra (las acciones quedan a nombre de quien entró) | X4 | Alta | Bajo | Baja | Aceptado: barra solo cambia estados de preparación. Caducidad absoluta de 12 h obliga a reentrar en cada jornada/turno | Baja |

### 5.4 Revelación de información

| ID | Amenaza | Actor | P | I | Inh. | Mitigación | Res. |
|---|---|---|---|---|---|---|---|
| T-26 | PIN en logs: cuerpo de la petición registrado, errores de validación que repiten el valor, `managerApproval.pin`, logs de Caddy con cabeceras | X9, X3 | Media | Alto | **Alta** | Redacción en pino (arquitectura §11) + no registrar cuerpos + errores de validación sin el valor + Caddy sin `log_credentials`. Test con PIN centinela en todos los logs. RS-29, RS-31 | Baja |
| T-27 | Barra recibe importes por la API o por SSE (HU-03) | X4 | Media | Medio | Media | Serializador `toKitchenDto` por rol en REST y SSE. RS-19 | Baja |
| T-28 | El flujo SSE de una sesión cuyo rol baja (encargado → barra) sigue enviando importes | X4 | Baja | Medio | Baja | El hub cierra el flujo al cambiar el rol (ADR-004) y serializa con el rol vigente. RS-14 | Baja |
| T-29 | Secretos visibles en variables de entorno (`podman inspect`, `/proc/*/environ`, volcados de error) | X9 | Media | Alto | Alta | Secretos montados como fichero (`type=mount`), nunca `type=env`. RS-38, SEC-010 | Baja |
| T-30 | Copias de seguridad sin cifrar o junto con el *pepper* (dan hashes + pepper = PIN recuperables por fuerza bruta offline en segundos) | X9 | Media | Alto | **Alta** | Copias cifradas, fuera del host; *pepper* custodiado aparte. RS-42, SEC-011 | Baja |
| T-31 | Robo de la clave de la CA interna de Caddy (volumen `/data`) → MITM a todas las tablets | X9 | Baja | Crítico | Alta | `/data` con permisos 0700 del UID de Caddy, incluido en copias cifradas; CA instalada solo en dispositivos del local; procedimiento de rotación. §6.2 | Baja |
| T-32 | Respuestas de la API en la caché de un dispositivo compartido; trazas de error con detalles internos | X6 | Media | Medio | Media | `Cache-Control: no-store` en `/api`, errores genéricos en producción, sin cabecera `Server`. RS-27 | Baja |
| T-33 | Datos personales en texto libre (`customer_ref`, notas, motivos) acaban en logs | X9 | Media | Bajo | Baja | No registrar cuerpos ni esos campos (estándar de Monitoring). RS-29 | Baja |
| T-34 | Servidor de desarrollo (Vite) o BD de DEV accesibles desde la red (CVE de lectura de ficheros en Vite dev server) | X1 | Media | Medio | Media | Puertos de DEV publicados solo en `127.0.0.1`. RS-40, SEC-013 | Baja |

### 5.5 Denegación de servicio

| ID | Amenaza | Actor | P | I | Inh. | Mitigación | Res. |
|---|---|---|---|---|---|---|---|
| T-35 | Bloquear a propósito a un compañero o al encargado con PIN erróneos (más grave ahora con el bloqueo indefinido) | X3 | Media | Medio | Media | Cada bloqueo genera alerta; el encargado desbloquea en Personal; si el bloqueado es el único encargado, desbloqueo por comando en el host (`unlock-user`). Llegar al bloqueo indefinido exige ~80 min de intentos con esperas, visibles en alertas. §6.1 | Baja |
| T-36 | Agotar CPU/memoria con logins masivos (argon2id ≈ 19 MiB y 100–250 ms por intento) | X2, X3 | Media | Alto | Alta | Límite por IP **antes** de verificar el hash, semáforo de verificaciones simultáneas, límite de memoria del contenedor dimensionado. RS-05, RS-08 | Baja |
| T-37 | Agotar conexiones SSE | X3 | Baja | Medio | Baja | SSE solo con sesión; máx. 2 flujos por sesión y 50 en total. RS-23 | Baja |
| T-38 | Cuerpos enormes o pedidos con miles de líneas | X3 | Baja | Medio | Baja | `bodyLimit` 64 KiB, máx. 100 líneas. RS-23 | Baja |
| T-39 | Caída de la Wi-Fi / internet | — | Media | Alto | Alta | Fuera de seguridad del software (pregunta 11). Recomendación: PROD en el propio local reduce la dependencia de internet | Media (aceptado por el humano) |

### 5.6 Elevación de privilegios

| ID | Amenaza | Actor | P | I | Inh. | Mitigación | Res. |
|---|---|---|---|---|---|---|---|
| T-40 | Ruta nueva sin permiso declarado (control de acceso roto, OWASP A01) | X3, X4 | Media | Crítico | **Crítica** | Denegación por defecto: test que recorre todas las rutas registradas y falla si alguna no declara permiso. RS-17, RS-18 | Baja |
| T-41 | XSS almacenado (nota, nombre de producto, `customer_ref`, motivo) que se ejecuta en la sesión del encargado y crea un encargado nuevo | X3 | Baja | Crítico | Alta | React escapa por defecto; prohibido `dangerouslySetInnerHTML`; CSP estricta sin `unsafe-inline`; cookie `HttpOnly`. RS-25, RS-26 | Baja |
| T-42 | Saltarse `must_change_pin` (usar la app con el PIN provisional que conoce el encargado) | X7, X3 | Media | Medio | Media | Solo 3 rutas permitidas, también para SSE. RS-15 | Baja |
| T-43 | Aprobación de encargado con una cuenta bloqueada, desactivada o con PIN provisional | X3 | Baja | Alto | Media | Mismas comprobaciones que el login. RS-04 | Baja |
| T-44 | Quedarse sin encargado activo por condición de carrera (dos encargados se degradan a la vez) | X7 | Baja | Alto | Media | Comprobación en transacción con bloqueo; recuperación por comando en host. RS-22 | Baja |
| T-45 | Encargado con PIN de 4 dígitos por promoción de rol (camarero → encargado conserva su PIN corto) | X3 | Media | Alto | Alta | Promoción a encargado con PIN < 6 dígitos activa `must_change_pin`. RS-15, SEC-001 | Baja |
| T-46 | Escape de contenedor → host | X8 | Baja | Crítico | Alta | Motor rootless, UID ≥ 1000, `cap-drop=ALL`, `no-new-privileges`, solo lectura, sin socket ni `--privileged`. §8, RS-36 | Baja |
| T-47 | Uso accidental del Docker con demonio root presente en la máquina de desarrollo (`docker compose`, `podman compose` delegando) | X9 | Media | Crítico | **Crítica** | Regla §3.1 (solo `podman-compose`); verificación `podman info` → `rootless: true` y `podman top … huser` en cada entorno. RS-36 | Baja |
| T-48 | Inyección SQL (OWASP A03) | X3 | Baja | Crítico | Alta | Kysely parametrizado; prohibido `sql.raw`/`sql.lit` con datos de usuario (SAST). RS-35 | Baja |
| T-49 | SSRF / exfiltración desde `app` | X8 | Baja | Alto | Media | `app` no hace peticiones salientes; `app` y `db` en red interna sin salida. RS-37 | Baja |

### 5.7 Amenazas críticas/altas inherentes (resumen)

Críticas: T-01, T-20, T-40, T-47. Altas: T-02, T-03, T-04, T-05, T-06, T-08,
T-12, T-13, T-16, T-17, T-18, T-21, T-23, T-26, T-29, T-30, T-31, T-36, T-39,
T-41, T-45, T-46, T-48. Todas quedan en baja/media residual **si** se cumplen
los requisitos de §7 y se cierran los hallazgos de §9.

---

## 6. Decisiones sobre los hallazgos abiertos de `docs/estado.md`

### 6.1 PIN de 4 dígitos con bloqueo 5/5 min — DECIDIDO

**Análisis.** Con el bloqueo actual (5 fallos → 5 min, y el contador vuelve a
cero) un atacante hace 5 intentos cada ~5 min ≈ **1 440 intentos/día por
usuario**. Un PIN de 4 dígitos aleatorio cae en ~3,5 días de media; un PIN
"humano" (fechas, patrones de teclado, 1212, 2580…) en minutos u horas. Con 15
usuarios en paralelo, el rociado multiplica la probabilidad. El objetivo
valioso es el **encargado** (anular cobros, crear usuarios, ver la caja).

**Decisión (política de PIN y bloqueo):**

1. **Longitud por rol.**
   - Encargado: **exactamente 6 dígitos** (10⁶ combinaciones).
   - Camarero/cajero y barra/cocina: **4 a 6 dígitos** (se mantiene el
     supuesto 6 del README; su impacto es menor y el bloqueo de abajo lo acota).
   - Promoción a encargado de un usuario con PIN de menos de 6 dígitos →
     `must_change_pin = true` (solo podrá cambiar el PIN, ver su perfil y salir).
   - El encargado inicial (`create-initial-manager`) también exige 6 dígitos.
2. **Reglas de composición** (función pura en `packages/shared`, validada en
   servidor): no todos iguales; sin secuencias ascendentes ni descendentes de 4
   o más dígitos consecutivos (1234, 9876, 345678); no formado por un bloque
   repetido (1212, 123123, 121212); no incluido en la **lista de PIN prohibidos**
   (≥ 100 PIN más frecuentes de 4 y 6 dígitos según estudios públicos de
   frecuencia de PIN, p. ej. 2580, 1004, 2000, 6969, 1122, 0852, 112233,
   147258, 159753, 696969; la lista se versiona en `packages/shared`).
3. **Bloqueo progresivo por usuario** (contador de fallos **consecutivos**
   persistido en BD; solo lo reinicia un acceso correcto o el desbloqueo/
   restablecimiento por un encargado; **no** se reinicia al expirar un bloqueo):

   | Fallos consecutivos acumulados | Efecto |
   |---|---|
   | 5 | Bloqueo 5 min (`423`, `retryAfterSeconds`) |
   | 10 | Bloqueo 15 min |
   | 15 | Bloqueo 60 min |
   | 20 | **Bloqueo indefinido**: `423 ACCOUNT_LOCKED_MANUAL`, "Cuenta bloqueada. Pide al encargado que la desbloquee" |

   Durante un bloqueo no se verifica el PIN ni cuentan los intentos. Resultado:
   **máximo 20 intentos** sobre una cuenta antes de exigir intervención humana
   (probabilidad de acertar un PIN de 4 dígitos aleatorio ≈ 0,2 %; de 6 dígitos
   ≈ 0,002 %), y llegar a ellos exige ~80 min con esperas, visibles en alertas.
4. **Las aprobaciones de encargado** (`managerApproval`, HU-06) cuentan en el
   mismo contador del encargado y siguen la misma escala. Una cuenta bloqueada,
   desactivada o con PIN provisional no puede aprobar (mismo error genérico).
5. **Límite por origen (IP del dispositivo):** 10 fallos de autenticación
   (login + aprobaciones) en 10 min desde la misma IP → `429` durante 10 min
   para cualquier usuario desde esa IP, comprobado **antes** de calcular el
   hash. Límite por sesión para aprobaciones: 5 fallos en 10 min → `429`.
   Requiere que `app` vea la IP real del dispositivo (SEC-003).
6. **Desbloqueo:** acción "Desbloquear" en Personal (encargado, con
   reconfirmación de PIN, SEC-007), auditada. Si la cuenta bloqueada es la del
   único encargado: comando `unlock-user <nombre>` en la imagen de `app`,
   ejecutado por el operador en el host como usuario sin privilegios
   (`podman exec` sin `-u root`), auditado como actor `system`.
7. **Alertas** (las define Monitoring en `docs/logging.md`; aquí el qué):
   - Cualquier bloqueo de una cuenta de **encargado** → alerta inmediata.
   - Cualquier **bloqueo indefinido** → alerta inmediata.
   - Segundo bloqueo de un mismo usuario en 24 h → alerta.
   - ≥ 3 usuarios distintos bloqueados en 1 h, o cualquier `429` por IP →
     alerta (rociado).
   - ≥ 3 aprobaciones de encargado fallidas en 10 min → alerta.
8. **MFA:** no aplica en el MVP (dispositivos compartidos, sin móvil personal
   obligatorio). Controles compensatorios: red restringida (SEC-002), bloqueo
   anterior, reconfirmación de PIN (SEC-007). Mejora futura recomendada:
   registro de dispositivos de confianza (cookie de dispositivo emitida por el
   encargado) para que el login solo se acepte desde tablets del local.

Implica cambiar **HU-01 y HU-07** (redacción exacta en SEC-001, responsable
product-owner) y **ADR-005 / arquitectura §4.1, §5.1, §7** (columnas y endpoint
de desbloqueo; responsable software-engineer).

### 6.2 Red y TLS en el local, caducidad de sesión, `ip_unprivileged_port_start` — DECIDIDO

**a) Exposición de red (requisito de despliegue, bloqueante: SEC-002).**
- El login y la API **no pueden ser alcanzables desde internet ni desde la
  Wi-Fi de clientes.** Con la política de PIN de §6.1 el riesgo baja, pero un
  PIN de 4–6 dígitos no es una credencial apta para internet.
- **PROD en el propio local (recomendado):** servidor conectado a la red del
  personal; Wi-Fi del personal **separada** (SSID/VLAN distinta, WPA2-AES o
  WPA3-Personal, contraseña que no se comparte con clientes); Wi-Fi de clientes
  con aislamiento de clientes y sin ruta hacia la red del personal. Cortafuegos
  del host: solo 80/443 (o 8080/8443) desde la subred del personal; SSH solo
  con clave, sin `root`, desde la subred de administración.
- **PROD en una VM en internet:** obligatorio **uno** de estos: (1) regla del
  cortafuegos/grupo de seguridad (Terraform) que solo admita 80/443 desde la IP
  pública fija del local, o (2) túnel WireGuard entre el local y la VM, con
  80/443 cerrados al resto de internet. Sin IP fija ni VPN no se aprueba PROD
  en VM. SSH igual que arriba.
- La configuración del router/Wi-Fi del local la hace el cliente: Infrastructure
  la documenta como **requisito previo** en `docs/infraestructura.md` y en
  `docs/especificacion/` (Etapa 4); Cybersecurity la verifica en DEMO/PROD.

**b) TLS (Caddy).**
- TLS 1.2 y 1.3 únicamente (por defecto en Caddy; no se rebaja). HTTP/2 activo.
- `:8080`/`:80` solo responde `308` hacia HTTPS; ninguna ruta de la API se
  sirve en claro.
- **CA interna (`tls internal`):** la raíz se instala **solo** en dispositivos
  del local (nunca en móviles personales); el volumen `/data` de Caddy es
  propiedad del UID del contenedor con permisos 0700 y entra en las copias
  cifradas (SEC-011); si se sospecha fuga de `/data`, se regenera la CA y se
  reinstala en todos los dispositivos (procedimiento de Infrastructure). Nombre
  del servidor fijo (entrada DNS en el router o IP fija incluida en el
  certificado), no depender de mDNS.
- **ACME (VM con dominio):** Let's Encrypt automático; HSTS igual.
- Formación mínima del personal (en la especificación de Etapa 4): un aviso de
  certificado **nunca** se acepta; se avisa al encargado.
- Cabeceras de seguridad obligatorias en Caddy (lista exacta en RS-26).

**c) Caducidad absoluta de sesión: 12 h (se rechaza la propuesta de 14 h).**
- Motivo: la jornada ordinaria máxima de una persona es de 9 h (12 h de
  descanso entre jornadas); 12 h cubre un turno largo con margen. Lo que
  importa es la pantalla de barra, que no caduca por inactividad: con 12 h la
  sesión no sobrevive a la jornada siguiente y obliga a reentrar en el cambio
  de turno, de modo que las acciones de barra quedan a nombre de quien está.
- Configurable **solo a la baja** (el servidor no arranca con un valor > 12 h).
- Se mantienen: inactividad 15 min (camarero y encargado; el encargado no
  hereda la exención aunque abra la cola), exención solo para el rol `kitchen`
  con el flujo SSE abierto.
- Implica actualizar ADR-005 (línea 64), arquitectura (líneas 185 y 426) y
  añadir el criterio a HU-01 (SEC-004).

**d) `net.ipv4.ip_unprivileged_port_start=80` en PROD — APROBADO con condiciones.**
- Valor **exactamente 80** (nunca 0): los puertos < 80 (SSH 22, SMTP 25, DNS
  53) siguen siendo privilegiados.
- Solo en un **host dedicado**: un único usuario de servicio sin `sudo` ni
  grupo `wheel`/`sudo`, sin otros usuarios interactivos ni otros servicios
  escuchando en 80–1023. Riesgo que se acepta: un proceso sin privilegios del
  host podría ocupar 80/443 si Caddy está caído; con un host dedicado y
  rootless, ese proceso ya tendría el mismo nivel de acceso que el propio
  servicio.
- Aplicado por Terraform/cloud-init en `/etc/sysctl.d/` (persistente), nunca
  desde un contenedor; los contenedores siguen sin capacidades.
- Si el host de PROD **no es dedicado** (p. ej. el PC del mostrador con otros
  usos): no se toca el sysctl; se usa la opción (a) de ADR-007 (8443 con
  puerto en la URL) o una redirección `nftables` 443→8443 y 80→8080 creada por
  el aprovisionamiento.
- En cualquiera de los casos, la red rootless debe **conservar la IP de origen**
  del dispositivo (SEC-003).

---

## 7. Requisitos de seguridad verificables (para Testing)

Formato: requisito → cómo se verifica. Tipos: **U** unitario, **I**
integración (API + BD real), **E** e2e (navegador), **D** dinámico (DAST,
contra TESTING/DEMO), **S** estático (SAST/lint/CI), **C** contenedores/host.

### Autenticación y PIN
| ID | Requisito | Verificación |
|---|---|---|
| RS-01 | Encargado: PIN de exactamente 6 dígitos; camarero y barra: 4 a 6. Aplica en alta, restablecimiento, cambio propio, promoción a encargado y encargado inicial. Error `400` con la regla | U (tabla de casos en `packages/shared`) + I (cada endpoint) |
| RS-02 | Reglas de composición de §6.1.2 y lista de PIN prohibidos | U con tabla: 1111, 1234, 9876, 345678, 1212, 123123, 2580, 112233 rechazados; 4831, 739164 aceptados |
| RS-03 | Bloqueo progresivo 5/10/15/20 de §6.1.3; el contador no se reinicia al expirar el bloqueo; durante el bloqueo no se verifica el PIN | I con reloj inyectable: 25 intentos fallidos → tiempos 5, 15, 60 min y `423 ACCOUNT_LOCKED_MANUAL`; luego PIN correcto sigue rechazado |
| RS-04 | `managerApproval` fallido suma al contador del encargado; cuenta bloqueada/desactivada/PIN provisional no aprueba; error genérico idéntico en todos los casos | I |
| RS-05 | 10 fallos/10 min desde una IP → `429` 10 min antes de verificar el hash; 5 aprobaciones fallidas/10 min por sesión → `429` | I (medir que no se llama al hasher) |
| RS-06 | La IP del cliente que usa la app es la que añade Caddy; `X-Forwarded-For` enviado por el cliente se ignora; en TESTING/DEMO/PROD dos dispositivos distintos se ven con IP distinta | D (enviar XFF variable: el límite salta igual) + C (log con dos IP reales) |
| RS-07 | Usuario inexistente: mismo código, cuerpo y tiempo que PIN erróneo (diferencia de medianas < 50 ms en 100 intentos) | I |
| RS-08 | argon2id con `m ≥ 19456 KiB, t ≥ 2, p = 1`; *pepper* leído de fichero de secreto; máx. 4 verificaciones simultáneas | U (prefijo del hash) + I (carga: 50 logins simultáneos no superan el límite de memoria del contenedor) |
| RS-09 | `create-initial-manager` no hace nada si existe un encargado; exige PIN de 6 dígitos; deja `must_change_pin = true` | I |
| RS-09b | `unlock-user` y "Desbloquear" ponen el contador a 0, quitan `locked_until` y quedan en `audit_log` | I |

### Sesiones
| ID | Requisito | Verificación |
|---|---|---|
| RS-10 | Cookie `__Host-sid` con `HttpOnly; Secure; SameSite=Strict; Path=/`, sin `Domain` ni `Max-Age`/`Expires` | E (inspeccionar `Set-Cookie`) |
| RS-11 | Token de 256 bits de CSPRNG, nuevo en cada login (una cookie previa enviada por el cliente nunca se reutiliza); en BD solo SHA-256 | I (buscar el token en claro en todas las tablas: 0 resultados) |
| RS-12 | Inactividad 15 min para camarero y encargado (también si el encargado tiene la cola abierta); exención solo rol `kitchen` con SSE abierto; `ping` y SSE no cuentan como actividad | I con reloj |
| RS-13 | Caducidad absoluta 12 h para todos los roles; configuración > 12 h → el servidor no arranca | I con reloj + U de `config.ts` |
| RS-14 | Logout, desactivación, restablecimiento de PIN y cambio de PIN propio (las demás sesiones) → `401` en la siguiente petición y flujo SSE cerrado en ≤ 1 s; cambio de rol → SSE cerrado por el servidor en ≤ 1 s y siguiente petición con el rol nuevo | I |
| RS-15 | Con `must_change_pin` solo `POST /auth/pin`, `GET /auth/me`, `POST /auth/logout`; el resto, incluido `GET /events`, → `403 PIN_CHANGE_REQUIRED` | I |
| RS-16 | (Tras SEC-007) anular cobro y acciones de escritura de Personal exigen `confirmPin` del encargado actuante; fallo cuenta para su bloqueo | I |

### Autorización y validación
| ID | Requisito | Verificación |
|---|---|---|
| RS-17 | Denegación por defecto: toda ruta registrada declara un permiso o está en la lista pública (`POST /auth/login`, `GET /auth/login-options`) | S/I: test que recorre las rutas de Fastify y falla si alguna no tiene permiso |
| RS-18 | Matriz rol × endpoint de `docs/permisos.md` §3 (W, K, M, sin sesión, PIN provisional) | I generado desde `permissions.ts` |
| RS-19 | Para el rol `kitchen`, ninguna respuesta REST ni evento SSE contiene claves que casen con `/cents|price|total|amount|tendered|change/i` | I (recorrido recursivo del JSON) |
| RS-20 | Esquemas zod `.strict()`: campos desconocidos → `400` (p. ej. `unitPriceCents` en líneas, `pinHash`/`failedAttempts`/`lockedUntil` en `PATCH /staff/:id`) | I |
| RS-21 | UUID de cliente existente con otro dueño o contenido → `409` sin datos del recurso existente | I |
| RS-22 | Dos degradaciones simultáneas de los dos únicos encargados → queda al menos uno activo | I (concurrencia) |
| RS-23 | Límites: `quantity` 1–99, ≤ 100 líneas por pedido, nota ≤ 100, `customerRef` ≤ 30, motivo ≤ 100, cuerpo ≤ 64 KiB (`413`), ≤ 2 flujos SSE por sesión y ≤ 50 en total | I |
| RS-23b | Borrador de `localStorage` asociado al `userId`: otro usuario en el mismo dispositivo no lo ve ni lo envía; se descarta a las 12 h | E |

### CSRF, XSS, cabeceras, TLS
| ID | Requisito | Verificación |
|---|---|---|
| RS-24 | `POST/PUT/PATCH/DELETE` (incluido `/auth/login`) exigen `Origin` igual al origen configurado (ausente o distinto → `403`) y `Content-Type: application/json` (`415`) | I + D |
| RS-25 | Sin `dangerouslySetInnerHTML`, `eval`, `new Function`, `innerHTML` en `apps/web` (regla ESLint que falla el build); una nota `<img src=x onerror=alert(1)>` se ve como texto en barra, pedido y ticket | S + E |
| RS-26 | Cabeceras en todas las respuestas de Caddy: `Strict-Transport-Security: max-age=31536000`; `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`; `X-Content-Type-Options: nosniff`; `X-Frame-Options: DENY`; `Referrer-Policy: no-referrer`; `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=(self)`; `Cross-Origin-Opener-Policy: same-origin`; `Cross-Origin-Resource-Policy: same-origin`; sin cabecera `Server` | D (curl/ZAP baseline) + E (la SPA funciona sin violaciones de CSP en consola) |
| RS-27 | `Cache-Control: no-store` en `/api/*`; errores `5xx` sin traza ni mensajes internos en producción | D |
| RS-28 | Solo TLS 1.2/1.3; `:8080`/`:80` solo `308`; `POST http://…/api/v1/auth/login` no llega a `app` (no aparece en su log) | D (testssl.sh o nmap `ssl-enum-ciphers`) |

### Logs y auditoría
| ID | Requisito | Verificación |
|---|---|---|
| RS-29 | Ni PIN, ni token, ni cookie en ningún log (`app`, Caddy, `db`, journald): se usa un PIN centinela (p. ej. 908172) en login, aprobación, alta, restablecimiento, cambio propio y peticiones inválidas, y se buscan el centinela y el valor de `sid` en todos los logs → 0 coincidencias. Caddy sin `log_credentials` | I/C |
| RS-29b | El cliente no conserva PIN (propio ni `managerApproval`) en estado, `localStorage` ni `sessionStorage` tras la respuesta | E (inspeccionar almacenamiento) |
| RS-30 | Eventos de seguridad (sin PIN): `auth.login_failed` (usuario si existe, IP, motivo), `auth.locked` (nivel), `auth.locked_manual`, `auth.unlocked`, `auth.ip_throttled`, `auth.approval_granted`/`auth.approval_failed`, `session.created`/`session.revoked` (motivo), `staff.*`, `payment.voided`, `price.changed` | I |
| RS-31 | Los errores de validación de campos `pin`, `currentPin`, `newPin`, `confirmPin`, `managerApproval.pin` no repiten el valor recibido | I |

### Base de datos
| ID | Requisito | Verificación |
|---|---|---|
| RS-32 | Privilegios de `app_rw` exactamente los de `docs/permisos.md` §6: como `app_rw`, `DELETE` en cualquier tabla salvo `sessions`, `UPDATE` de `audit_log`/`cash_closings`, `UPDATE payments.amount_cents`, `CREATE` en el esquema → `permission denied` | I (conectado como `app_rw`) |
| RS-33 | Trigger: `UPDATE/DELETE` en `audit_log` rechazado incluso como `app_owner` | I |
| RS-34 | 5432 no publicado en TESTING/DEMO/PROD; `pg_hba` solo `scram-sha-256`, sin `trust`; `app_owner` y `app_rw` no son superusuario | C (nmap desde la LAN; consulta a `pg_roles`) |
| RS-35 | Sin `sql.raw`/`sql.lit`/concatenación con datos de entrada; DAST básico de inyección sobre los endpoints con parámetros | S (semgrep/grep en CI) + D |

### Contenedores y host
| ID | Requisito | Verificación |
|---|---|---|
| RS-36 | `podman info` → `rootless: true`; para cada contenedor: `podman top <c> huser,user` sin UID 0; `CapEff` = 0; `NoNewPrivs: 1`; raíz de solo lectura; límites de memoria/CPU; sin `--privileged`, sin socket, sin `network=host`, sin montajes de directorios del sistema | C (script sobre `podman inspect` en cada entorno) |
| RS-37 | Solo `proxy` publica puertos; `app` y `db` en red `internal: true`; desde `app` no hay salida a internet | C |
| RS-38 | Secretos montados como fichero; `podman inspect` sin secretos en `Env`; `app` no tiene credenciales de `app_owner` ni `postgres`; `migrate` no tiene el *pepper* | C |
| RS-39 | Trivy o Grype sobre cada imagen: 0 críticas/altas (excepciones solo con aprobación escrita de Cybersecurity en §9); `pnpm audit --prod` sin altas/críticas; `pnpm install --frozen-lockfile` con scripts deshabilitados salvo lista blanca; imágenes base por digest | S/CI |
| RS-40 | DEV: puertos publicados solo en `127.0.0.1` | C (`ss -ltnp` en el host) |
| RS-41 | PROD: cortafuegos según §6.2a; SSH solo con clave y sin `root`; `sysctl net.ipv4.ip_unprivileged_port_start` = 80 (o sin tocar si no es host dedicado); usuario de servicio sin `sudo` | C (nmap desde fuera de la red permitida, `sysctl`, `id`) |
| RS-42 | Copias cifradas (clave pública en el host, privada fuera), fuera del host, restauración probada; *pepper* custodiado aparte de las copias | C (prueba de restauración en DEMO) |

---

## 8. Revisión de la arquitectura frente a la política de contenedores (§3)

Revisión de `docs/arquitectura.md` §10, ADR-003 y ADR-007. Sin ficheros reales
aún; resultado provisional.

| Regla | Estado en el diseño | Resultado |
|---|---|---|
| 3.1 Motor rootless, `podman-compose`, sin `sudo` ni `docker` | Podman rootless en todos los entornos; Quadlet en PROD | Cumple (verificar RS-36; existe Docker root en la máquina: riesgo T-47) |
| 3.2 Multi-stage, base mínima por digest, sin secretos en build | `app`: `node:<LTS>-alpine` → distroless; resto, imágenes oficiales por digest | Cumple. Añadir: `pnpm install --frozen-lockfile --ignore-scripts` + reconstrucción explícita solo de `argon2` en la etapa de compilación |
| 3.2 Escáner sin socket | No especificado | **Requisito:** escanear con Trivy/Grype sobre `podman save` (archivo `.tar` montado en solo lectura) o con el binario en el host; **nunca** montando el socket de Podman en el contenedor del escáner |
| 3.3 `USER` ≥ 1000 | `app`: distroless `nonroot` (UID 65532, válido); `db` y `proxy`: imágenes oficiales que arrancan como root, se ejecutan con `--user` | Cumple con condiciones: volúmenes `pgdata` y `/data` de Caddy propiedad del UID elegido; Caddy además necesita `/config` escribible (tmpfs o volumen) por el `autosave.json` |
| 3.3 Puertos > 1024 | 3000, 5432, 8080, 8443 | Cumple |
| 3.3 `HEALTHCHECK` | `app`: exec `node dist/healthcheck.js`. `db` y `proxy`: imágenes oficiales sin `HEALTHCHECK` | **Requisito:** definirlo en compose/Quadlet (`pg_isready` en `db`; petición HTTP local en `proxy`) |
| 3.4 `cap-drop=ALL`, `no-new-privileges`, solo lectura, límites | Declarado para los tres | Cumple en diseño. **Riesgo a verificar (SEC-009):** el binario de la imagen oficial de Caddy lleva la capacidad de fichero `cap_net_bind_service=+ep`; con `cap-drop=ALL` el `execve` puede fallar con `operation not permitted`. **No** se acepta como arreglo añadir `NET_BIND_SERVICE`; ver SEC-009 |
| 3.4 Prohibidos `--privileged`, socket, `network=host`, montajes del sistema | No se usan. DEV monta el código del proyecto en `api` | Cumple: el montaje de DEV debe limitarse al directorio del proyecto (nunca `$HOME` ni `/`) |
| 3.5 `exec` sin root | `unlock-user`/`create-initial-manager` se ejecutan como el usuario de la imagen | Cumple |
| 3.6 Puertos 80/443 | ADR-007: proxy + sysctl en PROD | Aprobado con condiciones (§6.2d) |
| 3.7 Secretos en ejecución | `podman secret` | Cumple con condición: montados como **fichero**, nunca como variable de entorno (SEC-010); un secreto por contenedor según `docs/permisos.md` §7 |
| 3.8 Entornos | DEV/TESTING/DEMO/PROD según la tabla | Cumple. DEV con puertos solo en `127.0.0.1` (SEC-013) |
| Red | Red interna propia | **Requisito:** dos redes — `edge` (solo `proxy`, con puertos publicados) e `internal` (`proxy`, `app`, `db`, `migrate`, `internal: true`, sin salida). Con ACME en VM, solo `proxy` necesita salida |
| Límites de recursos | Sin cifras | **Requisito:** `app` ≥ 256 MiB (argon2id 19 MiB × 4 simultáneas + Node) y el semáforo de RS-08 |

**Veredicto de contenedores (Etapa 1):** sin incumplimientos en el diseño. No
hay nada que bloquear todavía; los requisitos anteriores son condiciones para
aprobar los ficheros de `deploy/` cuando existan.

---

## 9. Hallazgos

## SEC-001: Política de PIN y bloqueo insuficiente frente a fuerza bruta
- Severidad: alta
- Ubicación: docs/historias/HU-01-iniciar-sesion-por-rol.md:15 y :28; docs/historias/HU-07-gestionar-personal.md:15; docs/decisiones/ADR-005-autenticacion-y-autorizacion.md:49-55; docs/arquitectura.md:173-174 (columnas de bloqueo) y §5.1 (sin endpoint de desbloqueo)
- Descripción: con PIN de 4 dígitos y bloqueo 5 fallos/5 min con contador reiniciado, un atacante tiene ~1 440 intentos/día por usuario (PIN aleatorio adivinado en ~3,5 días; PIN comunes en minutos). El encargado tiene el mismo PIN corto. Amenazas T-01, T-02, T-45.
- Responsable: product-owner (HU-01, HU-07) y software-engineer (ADR-005, arquitectura)
- Cómo corregir: aplicar la decisión de §6.1. Redacción exacta para el PO:
  - **HU-01, sustituir la línea 15 por:** "Dados 5 intentos fallidos consecutivos para un mismo usuario, cuando intenta un sexto, entonces la cuenta queda bloqueada 5 minutos y se muestra el tiempo restante. Si después vuelve a acumular 5 fallos consecutivos, el bloqueo es de 15 minutos; tras otros 5, de 60 minutos; y al llegar a 20 fallos consecutivos sin ningún acceso correcto, la cuenta queda bloqueada hasta que un encargado la desbloquee, con el mensaje "Cuenta bloqueada. Pide al encargado que la desbloquee". Solo un acceso correcto o el desbloqueo por el encargado reinician el contador."
  - **HU-01, añadir en Funcionales:** "Dados 10 intentos fallidos desde un mismo dispositivo en 10 minutos, sea cual sea el usuario, cuando se intenta otro inicio de sesión desde ese dispositivo, entonces se rechaza durante 10 minutos con el mensaje "Demasiados intentos desde este dispositivo. Espera X min"."
  - **HU-01, sustituir la línea 28 por:** "Seguridad: PIN de 6 dígitos para el rol encargado y de 4 a 6 dígitos para camarero/cajero y barra, almacenado con argon2id; nunca en texto plano ni en logs."
  - **HU-01, añadir en No funcionales:** "Seguridad: cada bloqueo de cuenta y cada rechazo por dispositivo queda registrado; el bloqueo de un encargado y cualquier bloqueo indefinido generan una alerta."
  - **HU-07, sustituir la línea 15 por:** "Dado un PIN que no cumple la regla (camarero/cajero y barra: 4 a 6 dígitos; encargado: 6 dígitos; no todos iguales, p. ej. 1111; sin secuencias ascendentes o descendentes de 4 o más dígitos, p. ej. 1234 o 9876; no formado por un bloque repetido, p. ej. 1212 o 123123; que no esté en la lista de PIN más comunes), cuando se intenta guardar, entonces se rechaza indicando la regla."
  - **HU-07, añadir en Funcionales:** "Dado un usuario con la cuenta bloqueada hasta desbloqueo (HU-01), cuando el encargado pulsa "Desbloquear" en Personal, entonces el usuario puede volver a iniciar sesión con el contador de intentos a cero y la acción queda registrada." y "Dado un usuario cuyo PIN tiene menos de 6 dígitos, cuando el encargado le asigna el rol encargado, entonces el usuario debe crear un PIN de 6 dígitos en su siguiente acción antes de poder usar ninguna otra función."
  - **Software Engineer:** en ADR-005 y arquitectura, escala de bloqueo 5/10/15/20 sin reiniciar el contador al expirar el bloqueo, código `423 ACCOUNT_LOCKED_MANUAL`, `managerApproval` en el mismo contador, límite por IP antes del hash, endpoint `POST /staff/:id/unlock` (M) y comando `unlock-user`, lista de PIN prohibidos en `packages/shared`, promoción a encargado → `must_change_pin`.
- Cómo verificar: Cybersecurity revisa los documentos actualizados; en Etapa 2/3, RS-01..RS-05, RS-09b y RS-15 pasan.
- Estado: abierto

## SEC-002: El login no debe ser alcanzable desde internet ni desde la Wi-Fi de clientes
- Severidad: alta
- Ubicación: docs/decisiones/ADR-007-proxy-tls-y-puertos.md:39-53; docs/arquitectura.md §10 (líneas 491-520); docs/historias/README.md pregunta 11
- Descripción: un PIN de 4–6 dígitos no es una credencial apta para internet ni para una red compartida con clientes (T-01, T-02, T-04, T-11). La arquitectura no exige restricción de red; si PROD es una VM pública, el login queda expuesto a todo internet.
- Responsable: infrastructure (cortafuegos, Terraform, documentación de requisitos de red del local); software-engineer (añadir la restricción como condición en ADR-007)
- Cómo corregir: aplicar §6.2a: PROD en el local con Wi-Fi del personal separada y cortafuegos del host limitado a la subred del personal; o PROD en VM con lista blanca de la IP fija del local o WireGuard. Documentarlo en `docs/infraestructura.md` como requisito previo del despliegue.
- Cómo verificar: RS-41: nmap/curl desde fuera de la red permitida (internet o Wi-Fi de clientes) no obtiene respuesta en 80/443/8080/8443; desde la red del personal sí.
- Estado: abierto

## SEC-003: El límite por IP depende de que `app` vea la IP real del dispositivo
- Severidad: media
- Ubicación: docs/decisiones/ADR-005-autenticacion-y-autorizacion.md:54-55; docs/arquitectura.md:432-433
- Descripción: (1) si Fastify confía en cualquier `X-Forwarded-For`, el atacante lo falsifica y evita el límite (T-03); (2) con la red rootless de slirp4netns/rootlessport, todas las conexiones llegan a Caddy con la misma IP interna, de modo que el límite por IP bloquearía a todo el local a la vez o habría que desactivarlo.
- Responsable: infrastructure (red rootless: `pasta`, por defecto en Podman 5, o `slirp4netns` con `port_handler=slirp4netns`, que conservan la IP de origen); developer (Etapa 2: `trustProxy` limitado a la IP de `proxy` en la red interna)
- Cómo corregir: lo indicado arriba; documentarlo en `docs/infraestructura.md`.
- Cómo verificar: RS-06.
- Estado: abierto

## SEC-004: Caducidad absoluta de 14 h demasiado larga
- Severidad: media
- Ubicación: docs/decisiones/ADR-005-autenticacion-y-autorizacion.md:64; docs/arquitectura.md:185 y :426
- Descripción: la sesión de barra no caduca por inactividad; con 14 h puede sobrevivir más allá de un turno y de la jornada, atribuyendo acciones a quien ya no está (T-05, T-25).
- Responsable: software-engineer (ADR-005, arquitectura) y product-owner (HU-01)
- Cómo corregir: caducidad absoluta de **12 h** para todos los roles, configurable solo a la baja (§6.2c). Redacción para el PO, **HU-01, añadir en No funcionales:** "Seguridad: toda sesión, incluida la de la pantalla de barra, caduca como máximo 12 horas después de iniciarla; después hay que volver a introducir usuario y PIN."
- Cómo verificar: RS-13.
- Estado: abierto

## SEC-005: Falta el endpoint público de la rejilla de usuarios del login
- Severidad: media
- Ubicación: docs/ux/wireframes/01-login.md:5-20 y :81; docs/arquitectura.md §5.1 (líneas 336-366)
- Descripción: el paso 1 de P-01 muestra los usuarios activos, pero la API no tiene un endpoint público para obtenerlos; el Developer tendría que improvisarlo (riesgo de exponer `id`, estado de bloqueo, usuarios desactivados o el rol `kitchen`/`manager` de más). Decisión sobre la nota de UX: **se acepta la rejilla** siempre que SEC-002 esté cerrado (red restringida); se mantiene "Escribir mi usuario".
- Responsable: software-engineer
- Cómo corregir: añadir a §5.1 `GET /auth/login-options` (público): devuelve solo `[{name, role}]` de usuarios **activos**, sin `id`, sin estado de bloqueo ni `mustChangePin`; con `Cache-Control: no-store` y el mismo límite por IP que el login.
- Cómo verificar: I: la respuesta solo contiene `name` y `role`; un usuario desactivado no aparece.
- Estado: abierto

## SEC-006: `quantity` sin máximo permite desbordar `total_cents`
- Severidad: media
- Ubicación: docs/arquitectura.md:237 (`quantity smallint > 0`) y :463; docs/decisiones/ADR-006-importes-monetarios.md (límites)
- Descripción: 32 767 × 99 999 céntimos = 3 276 667 233 > 2³¹−1: una sola línea desborda `total_cents integer`; el `INSERT`/`UPDATE` falla (500) o, si alguna suma se hiciera en BD con otro tipo, el total sería incorrecto (T-14). No hay límite de líneas por pedido.
- Responsable: software-engineer
- Cómo corregir: `CHECK (quantity BETWEEN 1 AND 99)` y validación zod igual; máximo 100 líneas por pedido (99 × 99 999 × 100 = 989 990 100 < 2³¹−1). Si el PO necesita cantidades mayores, recalcular el límite.
- Cómo verificar: RS-23.
- Estado: abierto

## SEC-007: Acciones críticas del encargado sin reconfirmación en dispositivos compartidos
- Severidad: media
- Ubicación: docs/historias/HU-04-cobrar-y-cerrar-pedido.md:25-32; docs/historias/HU-07-gestionar-personal.md:10-14; docs/arquitectura.md:360-362
- Descripción: durante los 15 min de inactividad de una sesión de encargado abierta en una tablet compartida, cualquiera puede crear un encargado nuevo, restablecer PIN o anular cobros (T-05). Son las acciones que permiten tomar el control o sacar efectivo.
- Responsable: product-owner (criterios), software-engineer (reutilizar el mecanismo de `managerApproval` como `confirmPin`), ux-designer (diálogo de PIN)
- Cómo corregir: exigir el PIN del encargado que actúa en: anular cobro, alta de usuario, cambio de rol, desactivar/activar, restablecer PIN y desbloquear. Redacción para el PO: **HU-04, añadir en Anulación:** "Dado un encargado que confirma una anulación, entonces debe introducir su PIN; si es incorrecto no se anula y el fallo cuenta para su bloqueo (HU-01)." **HU-07, añadir en No funcionales:** "Seguridad: crear un usuario, cambiar su rol, desactivarlo o activarlo, restablecer su PIN o desbloquearlo exige que el encargado introduzca su PIN en ese momento."
- Cómo verificar: RS-16.
- Estado: abierto

## SEC-008: Riesgo de fraude de caja sin visibilidad por usuario
- Severidad: baja
- Ubicación: docs/historias/HU-08-resumen-ventas-del-dia.md (criterio 1); docs/historias/HU-06-modificar-cancelar-pedido.md (cancelación de "Pendiente" sin autorización)
- Descripción: un camarero puede cobrar en efectivo sin registrar y cancelar el pedido "Pendiente" sin autorización (T-23). La auditoría lo registra, pero el resumen solo muestra totales, así que el patrón no se ve.
- Responsable: product-owner
- Cómo corregir: **HU-08, añadir en Funcionales:** "Dado el resumen del día, entonces muestra el número e importe de pedidos cancelados y de cobros anulados agrupados por usuario que los realizó (y, si lo hubo, encargado que autorizó)."
- Cómo verificar: revisión de la historia; en Etapa 3, test del resumen.
- Estado: abierto

## SEC-009: Imagen oficial de Caddy con capacidad de fichero frente a `cap-drop=ALL` y `--user`
- Severidad: media
- Ubicación: docs/decisiones/ADR-007-proxy-tls-y-puertos.md:39 ("imagen oficial, sin modificar") y :65-66; docs/arquitectura.md:501
- Descripción: `/usr/bin/caddy` en la imagen oficial lleva `cap_net_bind_service=+ep`. Con el conjunto límite vacío (`cap-drop=ALL`) el kernel puede rechazar el `execve` (`operation not permitted`). La tentación sería añadir `NET_BIND_SERVICE` o quitar `cap-drop`, ambas contrarias a §3.4 (y la capacidad es innecesaria porque escucha en 8080/8443).
- Responsable: infrastructure
- Cómo corregir: probar la imagen con `--user`, `cap-drop=ALL`, `no-new-privileges` y `--read-only`. Si falla, imagen derivada mínima (multi-stage) que copie el binario sin capacidades de fichero (`setcap -r`) a la misma base, por digest; Software Engineer actualiza "sin modificar" en ADR-007.
- Cómo verificar: RS-36 sobre `proxy`: `CapEff` = 0, `getcap /usr/bin/caddy` vacío o arranque correcto sin capacidades.
- Estado: abierto

## SEC-010: Forma de inyección de secretos y separación por contenedor
- Severidad: media
- Ubicación: docs/arquitectura.md:506-510
- Descripción: no se especifica que los secretos se monten como fichero; con `type=env` quedan visibles en `podman inspect` y en `/proc/*/environ` (T-29). Tampoco se dice qué contenedor recibe qué secreto.
- Responsable: infrastructure
- Cómo corregir: `podman secret` con `type=mount` (ficheros en `/run/secrets/`, modo 0400, propiedad del UID del contenedor); variables `*_FILE` con la ruta. Reparto según `docs/permisos.md` §7.
- Cómo verificar: RS-38.
- Estado: abierto

## SEC-011: Copias de seguridad y *pepper*
- Severidad: media
- Ubicación: docs/decisiones/ADR-003-base-de-datos.md (consecuencias, `pg_dump` diario); docs/arquitectura.md:307
- Descripción: las copias contienen hashes de PIN, cobros y auditoría. Una copia sin cifrar junto con el *pepper* permite recuperar todos los PIN offline en segundos (10⁴–10⁶ candidatos) (T-30). El volumen `/data` de Caddy (clave de la CA, T-31) también debe copiarse de forma segura. Si se pierde el *pepper*, todos los PIN dejan de valer.
- Responsable: infrastructure
- Cómo corregir: `pg_dump` con rol de solo lectura (`app_backup`), cifrado con clave pública (age/GPG) en el host y clave privada fuera; copia fuera del host; *pepper* custodiado en un sitio distinto de las copias (p. ej. gestor de contraseñas del dueño); prueba de restauración en DEMO.
- Cómo verificar: RS-42.
- Estado: abierto

## SEC-012: Borrador en `localStorage` compartido entre usuarios del mismo dispositivo
- Severidad: baja
- Ubicación: docs/decisiones/ADR-002-frontend.md (borrador en `localStorage`); docs/arquitectura.md:478-480
- Descripción: el borrador sobrevive al cierre de sesión; el siguiente usuario del dispositivo podría verlo y enviarlo a su nombre (T-19).
- Responsable: software-engineer
- Cómo corregir: clave del borrador por `userId`; solo se ofrece al mismo usuario; se descarta a las 12 h; no guarda importes calculados (se recalculan).
- Cómo verificar: RS-23b.
- Estado: abierto

## SEC-013: Entorno DEV expuesto a la red
- Severidad: media
- Ubicación: docs/arquitectura.md:514-516 (DEV con Vite y `api` en `watch`)
- Descripción: si `compose.dev.yaml` publica Vite (5173), la API o PostgreSQL en `0.0.0.0`, cualquiera en la misma red llega al servidor de desarrollo (con CVE conocidas de lectura de ficheros en Vite dev server) y a la BD (T-34).
- Responsable: infrastructure
- Cómo corregir: publicar en `127.0.0.1:<puerto>:<puerto>`; Vite en versión parcheada; contraseñas de DEV distintas de las de cualquier otro entorno.
- Cómo verificar: RS-40.
- Estado: abierto

---

### Resumen para la puerta de la Etapa 1
- **Altos abiertos (bloquean la puerta):** SEC-001, SEC-002.
- Medios abiertos: SEC-003, SEC-004, SEC-005, SEC-006, SEC-007, SEC-009,
  SEC-010, SEC-011, SEC-013. Bajos: SEC-008, SEC-012.
- Contenedores: sin incumplimientos en el diseño (§8); revisión de `deploy/`
  pendiente.
