# Seguridad — Modelo de amenazas y hallazgos

> Responsable: Cybersecurity. Etapa 1 (tarea 1.4), 2026-11-21. Revisión 1.4b,
> 2026-11-23: verificación de SEC-001..SEC-015 sobre las historias (ronda 1.1d),
> la arquitectura (revisión 1.3b) y la infraestructura (tarea 1.5); hallazgos
> nuevos SEC-016..SEC-022; dictámenes sobre M-06 y HU-09 (§6.3). Revisión
> 1.4c, 2026-11-23: verificación de SEC-010 y SEC-016..SEC-022 sobre la
> arquitectura 1.3c, la infraestructura 1.5b y el logging 1.6c/1.6e;
> dictámenes sobre HU-01/CA-F13, T-14, T-18, T-20, umbrales de alertas,
> comandos del temporizador, `NoNewPrivileges`, salida de Alertmanager y
> telemetría previa a la sesión (§6.4); hallazgos nuevos SEC-023..SEC-025.
> Revisión 1.7j, 2026-11-24: verificación de SEC-024 sobre `docs/logging.md`
> 1.7b (§3.2, §6.3, §7.4), del dictamen T-20 en `SessionPinProbing` y
> `auth.verify.rate_limited`, y de la telemetría `pre_session` (§6.4.1)
> frente a las condiciones de §6.4 "UX (1.2c)". Sin hallazgos nuevos.
> Revisión 1.7l, 2026-11-24: verificación de SEC-023 sobre `compose.dev.yaml`,
> `deploy/dev/levantar.sh` y `docs/infraestructura.md` §7.1 y §15 (commit
> aebd6ef), con prueba propia en Podman 5.7.0 rootless; hallazgos nuevos
> SEC-026 y SEC-027 (baja).
> Revisión 1.7q, 2026-11-24: verificación de SEC-026 y SEC-027 sobre
> `docs/infraestructura.md` §3, §7.1 y §15 y `deploy/dev/levantar.sh`
> (`comprobar_enlaces`, commit 0075d18), con prueba propia en el scratchpad
> (14 casos) y prueba de enlace duro en Podman 5.7.0 rootless. Comando de
> SEC-026/RS-45 corregido. Sin hallazgos nuevos.
> Revisión 2.1f, 2026-11-24 (Etapa 2, HU-01): TESTING de infrastructure
> 2.1b/2.1b2 (`test_admin`, `app_template`, `db-seed`, `proxy-app`, T-34,
> T-35) y tres puntos de la 2.1c (motivo del `401`, `TRUSTED_PROXIES` con
> CIDR, actividad por petición), con prueba propia en Podman 5.7.0 rootless
> (§6.5). Hallazgos nuevos SEC-028 (baja), SEC-029 (media) y SEC-030 (baja).
> Revisión 2.1k, 2026-11-24 (Etapa 2, HU-01): decisiones del SE de la 2.1i
> (commit `4f96dbb`, `docs/arquitectura.md` §2.1, §5, §7, §10.1, §17.1):
> T-40 (`404` con `is404`, RS-18), SEC-029, SEC-030 y las recomendaciones de
> la 2.1f, con prueba propia en el scratchpad (Fastify 5.12.8, `pg` 8 y
> PostgreSQL 19 efímero en Podman rootless) (§6.6). SEC-029 y SEC-030 pasan
> a corregido (diseño). Hallazgos nuevos SEC-031 y SEC-032 (baja).
> Entradas: `docs/historias/` (README + HU-01..HU-09, IDs estables `CA-`),
> `docs/arquitectura.md`, `docs/decisiones/ADR-001..008`, `docs/ux/`,
> `docs/infraestructura.md`, `compose.dev.yaml`, `compose.test.yaml`,
> `deploy/`, `.gitignore`, `docs/reglas-equipo.md` §3.
> Permisos y roles: `docs/permisos.md`.
>
> Comprobaciones ejecutadas en 1.4b (solo lectura, sin levantar contenedores):
> `podman info` (rootless `true`, cgroups v2, netavark, Podman 5.7.0),
> `podman-compose -f compose.dev.yaml config` y `compose.test.yaml config`
> (correctos), búsqueda de opciones prohibidas en la configuración resuelta
> (`privileged`, sockets, `network_mode: host`, `cap_add`, puertos en
> `0.0.0.0`: ninguna), permisos de `.secrets/` (0700/0600, ignorado por git,
> ningún fichero versionado) y prueba del filtro de PIN de
> `deploy/dev/generar-secretos.sh` con casos conocidos (§9, SEC-014). No se
> imprimió el contenido de ningún secreto.
>
> Comprobaciones ejecutadas en 1.4c (solo lectura, sin levantar contenedores
> ni tocar volúmenes): `podman info` (rootless `true`);
> `podman-compose -f compose.dev.yaml config` y `compose.test.yaml config`
> (con valores ficticios para las variables obligatorias de imagen); análisis
> de los dos compose fuente servicio a servicio (incluidos los perfiles que
> `config` no muestra): `user 1000:1000`, `cap_drop: ALL` sin `cap_add`,
> `no-new-privileges`, `read_only`, sin `privileged`, sockets ni
> `network_mode: host` (solo `none` en `runner-unit`), puertos solo en
> `127.0.0.1` (DEV) o ninguno (TESTING), tmpfs con `notmpcopyup` sobre
> `/workspace/.secrets` en los 11 servicios que montan el proyecto;
> lectura de `deploy/db/initdb/10-roles.sh`.

## Índice
1. Alcance y método
2. Activos
3. Actores de amenaza
4. Superficies de ataque y fronteras de confianza
5. Amenazas (STRIDE)
6. Decisiones sobre los hallazgos abiertos de `docs/estado.md` (incl. §6.3, otros puntos; §6.4, revisión 1.4c; §6.5, revisión 2.1f; §6.6, revisión 2.1k)
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
   o más dígitos consecutivos **en cualquier posición** (1234, 9876, 381234); no formado por un bloque
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
   **[1.4b, SEC-016; ajustado en 1.4c]** Toda verificación de un PIN contra
   el hash pasa por la función única `verifyPin` y cuenta igual, sea cual sea
   la ruta: login, `managerApproval`, `confirmPin` (SEC-007) y **`currentPin`
   de `POST /auth/pin`** (que en el MVP solo sirve para el cambio obligatorio
   del PIN provisional). **Todo bloqueo indefinido revoca todas las sesiones
   de la cuenta, venga de donde venga el fallo** (login desde otro
   dispositivo, aprobaciones o sesión propia; HU-01/CA-F13): a los 20 fallos
   alguien está probando ese PIN y ninguna sesión de esa cuenta debe seguir
   viva. Durante un bloqueo **temporal** la sesión sigue abierta y
   `confirmPin`/`currentPin` reciben `423 LOCKED` sin verificar ni contar
   (HU-01/CA-F12).
5. **Límite por origen (IP del dispositivo):** 10 fallos de **cualquier
   verificación de PIN** (login, `managerApproval`, `confirmPin` y
   `currentPin`) en 10 min desde la misma IP → `429` durante 10 min para
   cualquier usuario y cualquier ruta de PIN desde esa IP, comprobado
   **antes** de calcular el hash. Límite por sesión **para aprobaciones**
   (`managerApproval`, PIN de otro usuario): 5 fallos en 10 min → `429`.
   **[1.4c, T-20]** `confirmPin` y `currentPin` (PIN del propio titular de la
   sesión) no llevan límite por sesión: los acota el bloqueo de la cuenta,
   que para esos usos se comprueba antes que cualquier límite de sesión
   (dictamen T-20 en §6.4).
   Requiere que `app` vea la IP real del dispositivo (SEC-003).
   **[1.4b] "Dispositivo" = IP de origen.** Es lo que recogen HU-01/CA-F11 y el
   supuesto 11 ("10 fallos desde un mismo dispositivo en 10 min lo bloquean 10
   min"), y coincide con esta decisión: en la topología A (servidor en el
   local, recomendada) cada tablet tiene su IP. En la topología B (VM con lista
   blanca de la IP pública del local) todos los dispositivos salen por la misma
   IP y el límite pasa a ser **de todo el local** (SEC-019). Mientras dura el
   `429` se rechazan desde esa IP el login, las aprobaciones, las
   reconfirmaciones, el cambio de PIN y `GET /auth/login-options`.
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

### 6.3 Respuestas a otros puntos de `docs/estado.md` que tocan a Cybersecurity

**UX — rejilla de usuarios en el login (P-01).** Aceptada, condicionada a
SEC-002 (login solo alcanzable desde la red del personal) y a SEC-005
(endpoint público que devuelve solo nombre y rol de usuarios activos). Se
mantiene "Escribir mi usuario". La enumeración de nombres no aporta nada a
quien ya está dentro del local; el control real es el bloqueo de §6.1.

**UX/PO — parte de seguridad de la aprobación con PIN de encargado (HU-06).**
- Encargado + PIN (no solo PIN): correcto; evita que los PIN de encargado
  tengan que ser únicos y que un PIN cualquiera "valga" para algún encargado.
- Intentos y bloqueo: cuentan en el contador del encargado elegido, misma
  escala 5/10/15/20 (§6.1.3 y §6.1.4); además 5 fallos por sesión en 10 min →
  `429` (evita usar una tablet de camarero para bloquear al encargado).
  Cuenta bloqueada, desactivada o con PIN provisional no aprueba, con el mismo
  error genérico.
- Longitud: 6 dígitos (es un encargado, §6.1.1).
- Válida para **una sola acción**: el servidor no guarda la aprobación ni emite
  ningún token reutilizable; el cliente borra el PIN tras la respuesta (RS-29b).
- Encargado con sesión propia: **no** se le pide PIN para las acciones de HU-06
  (de acuerdo con el PO); **sí** para anular cobros y las escrituras de
  Personal (SEC-007).

**Testing T-12 — `chromiumSandbox: false` en el contenedor de Playwright.**
**Aprobado con condiciones**, solo si la opción (1) de `docs/testing.md` §7.2
no funciona: (a) solo en el contenedor efímero de e2e de TESTING (nunca en
DEV interactivo, DEMO ni PROD, ni fuera de contenedor); (b) el contenedor sigue
con UID ≥ 1000, `cap-drop=ALL`, `no-new-privileges`, el perfil seccomp por
defecto (no `unconfined`), sin `--privileged` ni `--ipc=host`; (c) el
navegador solo navega a la app bajo prueba, en la red interna de TESTING sin
salida a internet; (d) el contenedor no recibe más secretos que los aleatorios
de esa ejecución. Motivo: sin *sandbox*, un fallo del motor de render daría
ejecución dentro del contenedor; con contenido propio, sin salida a internet y
contenedor desechable, el riesgo es bajo. No se aprueba añadir `SYS_ADMIN` ni
desactivar seccomp para conseguir el *sandbox*.

**Monitoring M-03 — `POST /api/v1/telemetry`.** **Aprobado con condiciones**
(RS-43): sesión obligatoria (cualquier rol, permiso `telemetry:write`; con PIN
provisional, rechazado); comprobación de `Origin`; esquema zod `.strict()` solo
con enums y números acotados (sin texto libre salvo `client.js_error`, filtrado
como `docs/logging.md` §4.4); cuerpo ≤ 16 KiB y ≤ 50 elementos por lote;
≤ 1 petición cada 30 s por sesión (`429`); **no** cuenta como actividad para la
inactividad de 15 min; no se guarda en tablas de negocio ni en `audit_log`; no
admite ni devuelve importes. `emittedAt` en eventos SSE: sin objeción.

**Monitoring M-06 — excepción a §3.4 para montar `/var/log/journal`.**
**Cybersecurity no recomienda la excepción (a); recomienda la opción (b)**, que
cumple las reglas sin excepciones: log driver `k8s-file` con rotación
(`log_size_max`) en el `$HOME` del usuario de servicio, leído en solo lectura
por Alloy, y métricas de contenedores con el temporizador de usuario +
`node_exporter` solo con el colector `textfile` (sin `/proc`, `/sys` ni socket).
Motivo: (a) monta un directorio del sistema y, si el usuario de servicio está
en `systemd-journal`/`adm`, da acceso a todo el diario del host (incluidos los
logs de autenticación SSH). Si el humano aprueba (a) igualmente, condiciones
mínimas: solo `/var/log/journal` en solo lectura (nunca `/var` ni `/run/log`);
el usuario de servicio **no** pertenece a `systemd-journal`, `adm` ni `wheel`
(solo lee su propio diario); contenedor de Alloy con todas las restricciones de
§3.4. Hay discrepancia con Monitoring: **decide el humano**.

**[1.4b] M-06 — opción B mejorada de Infrastructure (`docs/infraestructura.md`
§11.1) y temporizador systemd del usuario. Dictamen: APROBADA con
condiciones.** Es la opción que recomienda Cybersecurity y mejora la (b)
original: con `log_opt path` a un directorio dedicado no se monta el
almacenamiento de Podman (`~/.local/share/containers`), que expondría la
configuración de todos los contenedores. El temporizador del host es
aceptable: corre como el usuario de servicio, que ya es el dueño del Podman
rootless, así que no añade ningún privilegio; y evita lo que sí está prohibido
(montar el socket de Podman en un contenedor). Condiciones:
1. Unidad `.service` + `.timer` **de usuario** (`~/.config/systemd/user/`,
   `systemctl --user`), nunca de sistema, root ni `sudo`. El script está
   versionado en `deploy/` y lo instala el aprovisionamiento; los ficheros de
   la unidad y del script son del usuario de servicio y nadie más puede
   escribirlos.
2. El script **solo lee**. Comandos permitidos: `podman stats --no-stream
   --format`, `podman ps --format`, `podman inspect --format` **con campos
   concretos** (`{{.State.OOMKilled}}`, `{{.RestartCount}}`, estado de salud;
   nunca el `inspect` completo, que incluye entorno y montajes), `systemctl
   --user show -p NRestarts,Result,ActiveState` y `df -P` sobre rutas fijas.
   Prohibidos `podman exec/run/rm/kill`, `podman secret inspect
   --showsecret` y cualquier `sudo`. **[1.4c]** Se añaden, con las
   condiciones de §6.4: `date` con formato fijo, lectura de `/proc/loadavg` y
   `/proc/meminfo` desde el host y `timedatectl show` con propiedades
   concretas (`chronyc` solo en el caso descrito allí).
3. Salida: lista cerrada de métricas con etiquetas acotadas (nombre del
   contenedor o de la unidad; nunca imagen, comando, variables ni rutas de
   montaje). Se escribe de forma atómica (fichero temporal + `mv`) en un
   directorio dedicado (p. ej. `~/mi-app/metrics/`, 0750), ficheros 0640.
4. `node_exporter` en contenedor con todo §3.4, solo
   `--collector.disable-defaults --collector.textfile`, montando **solo** ese
   directorio en `ro` (sin `/proc`, `/sys` ni `/` del host), sin puertos
   publicados (solo la red de Prometheus).
5. Unidad con `NoNewPrivileges=yes`, `UMask=0027` y `TimeoutStartSec=30`; sin
   red (no la necesita). Sus mensajes van al diario del usuario y no contienen
   secretos.
6. Logs: directorio de `log_opt path` 0750, del usuario de servicio; Alloy lo
   monta en `ro` y no monta nada más del host; `max-size` y rotación definidos.
   La redacción de datos sensibles de `docs/logging.md` sigue aplicando
   (SEC-017).
7. Infrastructure alinea §10 (journald en PROD) con §11.1 (`k8s-file`) cuando
   el humano decida M-06 (nota de M-05).

El mismo criterio vale para el temporizador de copias de SEC-011 (§13 de
`docs/infraestructura.md`): de usuario, contenedor efímero endurecido y solo
la clave pública de cifrado en el host. **El humano eligió la opción B el
2026-11-23** (`docs/estado.md`, "Decisiones del humano"): no hay excepción a
§3.4 y las condiciones 1–7 son obligatorias al implementarla
(infrastructure/monitoring, tarea 1.6c). Cybersecurity revisa el script del
temporizador y las unidades Quadlet de Alloy y `node_exporter` cuando existan.

**Monitoring M-05 — logs de PostgreSQL.** De acuerdo (la severidad alta es
correcta). Se añade `log_statement = none` y que las sentencias con contraseñas
de la inicialización no se registren (SEC-015).

**Monitoring M-08 — Grafana sin publicar a la LAN.** De acuerdo: `127.0.0.1` +
túnel SSH. Si se publica por Caddy, solo con autenticación propia de Grafana
(sin usuario anónimo), desde la red del personal y con la contraseña de
administración como `podman secret`.

**[1.4b] HU-09 — ¿reconfirmar el PIN al cambiar los ajustes? Sin efecto: el
humano dejó HU-09 fuera del MVP el 2026-11-23** (valores fijos en la
instalación, supuesto 20). Consecuencia para permisos: `PATCH /settings` no se
registra en el MVP (denegación por defecto) y los valores llegan a cada rol por
`GET /auth/me` (`localConfig` filtrado). Dictamen, por si HU-09 vuelve en otra
versión: **no** hace falta reconfirmar el PIN. SEC-007 pide `confirmPin` en las acciones que
mueven dinero hacia atrás (anular cobros) o cambian identidades y privilegios
(Personal). Los ajustes (mesas 1–99, umbral de retraso 1–60 min) no hacen
ninguna de las dos cosas: un cambio malicioso desde una sesión de encargado
desatendida solo molesta (mesas que no aparecen, retrasos que no se marcan), no
borra datos (HU-09/CA-F04, CA-F08), se deshace en segundos y queda auditado con
valor anterior y nuevo (CA-N02). Pedir el PIN añadiría fricción sin reducir un
riesgo relevante. **[1.4c]** Tras la revisión 1.3c no existen en el MVP la
tabla `settings`, `GET/PATCH /settings`, los permisos `settings:*` ni los
eventos `settings.updated`/`settings.changed`: mesas (20) y umbral (10 min)
son configuración de instalación de solo lectura (`TABLE_COUNT`,
`DELAY_THRESHOLD_MINUTES`) que llega a cada rol por `localConfig`. Si HU-09
volviera, aplicarían solo M, esquema `.strict()` con rangos y auditoría.

**[1.4b] Caddy — redirección HTTP → HTTPS con el `Host` del cliente
(`docs/infraestructura.md` §12.2).** Riesgo bajo: el navegador solo envía en
`Host` el nombre que ha escrito o abierto, así que la redirección solo puede
llevar a ese mismo nombre. En un ataque de *DNS rebinding* el destino sería
`https://<nombre-del-atacante>:8443`, que no tiene certificado válido de la CA
interna y que el bloque HTTPS de Caddy no sirve (solo responde a
`SITE_ADDRESS`). Se acepta tal cual; como defensa en profundidad,
**recomendado** (no bloqueante) limitar la redirección a los nombres de
`SITE_ADDRESS` y responder `421` o cerrar la conexión para cualquier otro
`Host`.

**[1.4b] SEC-003 — opciones de §12.5 de `docs/infraestructura.md`.**
- Opción 1 (activación por socket de systemd en PROD): **aprobada**, es la
  preferida. Caddy recibe el descriptor y ve la IP real; sigue en la red
  interna sin puertos publicados por `rootlessport`.
- Opción 2 (Caddy con `network_mode: pasta` y `app` en `127.0.0.1:3000` del
  host): **solo para DEMO**, no para PROD. Motivo: `app` queda accesible a
  cualquier proceso del host sin pasar por Caddy, y la IP desde la que la ve
  `app` es la misma para Caddy y para un proceso local, de modo que confiar en
  su `X-Forwarded-For` permitiría a un proceso del host falsificar la IP.
  Condiciones en DEMO: host de DEMO sin otros usuarios ni servicios, `app`
  publicada solo en `127.0.0.1`, `trustProxy` solo para esa IP y prueba RS-06
  con dos dispositivos. Si se puede, usar también en DEMO la opción 1 (mismas
  unidades que PROD).

### 6.4 Revisión 1.4c (2026-11-23): dictámenes

**SEC-016 — validación de la solución del SE (`docs/arquitectura.md` §5,
§5.1, §7; ADR-005 revisión (c)). Aceptada.**
- *Función única `verifyPin`, único componente con el hasher (DI por
  constructor).* Es la recomendación de 1.4b y cierra el problema de raíz: una
  ruta nueva no puede verificar un PIN sin los límites. En la Etapa 2 se
  comprueba con revisión de código y con un test que falle si otro módulo
  importa el hasher (RS-16c).
- *Revocación de todas las sesiones en el bloqueo indefinido, venga de donde
  venga el fallo* (más amplio que lo que pedía §6.1.4 en 1.4b). **Aceptada**
  y se adopta como regla (§6.1.4 corregido). Motivo: llegar a 20 fallos
  significa que el PIN de esa cuenta está bajo ataque, y una sesión viva de
  esa cuenta es justo lo que el atacante querría usar. Coste: quien provoca el
  bloqueo desde otro dispositivo también echa al titular de sus sesiones
  abiertas (p. ej. la pantalla de barra). Se acepta porque la cuenta ya no
  puede entrar de nuevo, llegar a 20 exige unos 80 min con esperas de
  5/15/60 min y cada paso genera alertas (`LockoutRepeated`,
  `AccountLockedManual`). Es el mismo DoS leve ya aceptado (T-35).
- *`403 PIN_INVALID` en `POST /auth/pin`* (no `401`). **Correcto:** el PIN
  actual incorrecto no invalida la sesión; con `401` el cliente cerraría la
  sesión y perdería el formulario. No revela nada: el titular ya está
  autenticado y sabe de quién es la cuenta.
- *`POST /auth/pin` solo con PIN provisional* (`403 FORBIDDEN` sin verificar
  ni contar con `mustChangePin = false`). **Correcto y reduce superficie:**
  una sesión desatendida normal ya no tiene ninguna ruta donde probar su
  propio PIN salvo `confirmPin` (solo encargado, con contador). El `403` sin
  contar no abre un oráculo: no verifica nada. Si se repite, salta
  `ProvisionalChangeMisuse` (`docs/logging.md` §7.4).
- *`423` sin verificar y sin contar durante un bloqueo temporal.* **Correcto**
  y coherente con §6.1.3 ("durante un bloqueo no se verifica el PIN ni cuentan
  los intentos"): sin esa regla, intentar durante el bloqueo alargaría la
  escala sin dar información al atacante, y con ella el PIN no se comprueba,
  así que tampoco hay oráculo.
- Resto detectado: en `managerApproval` con el encargado bloqueado, el paso 3
  responde sin calcular el hash, y la diferencia de tiempo (~0 ms frente a
  100–250 ms) revela al camarero que el encargado está bloqueado, aunque el
  error sea el genérico. Se abre **SEC-025 (baja)**.

**T-20 (Testing) — orden de los pasos 2 y 3 de `verifyPin` para `confirm` y
`change`. Opción A aceptada.** Para `confirmPin` y `currentPin` (el PIN es del
propio titular de la sesión): se comprueba el bloqueo de la cuenta **antes**
que cualquier límite de sesión, y el límite de sesión **no se aplica**. Orden
resultante: (1) límite por IP → `429`; (2) cuenta bloqueada → `423` sin hash
ni contar; (3) hash; (4) fallo → contador de la cuenta + contador de la IP.
Para `managerApproval` (PIN de otro usuario) se mantiene el orden actual: IP →
sesión (5/10 min) → bloqueo (error genérico) → hash. Motivo por el que es
aceptable: el límite por sesión se pidió para que una tablet de camarero no
pueda dedicarse a probar y bloquear el PIN de un encargado (§6.3); cuando el
PIN es del titular, el contador de su cuenta ya es más estricto (5 fallos →
bloqueo; no se reinicia al expirar; tope de 20 y revocación) y además sigue el
límite por IP de 10/10 min. El límite de sesión solo añadía en ese caso un
`429` que contradecía HU-01/CA-F12 (c) y (d). Riesgo residual aceptado: si el
titular acierta su PIN en otro sitio entre tandas, el contador vuelve a 0 (ya
ocurría igual con el login); lo acota el límite por IP del dispositivo, la
inactividad de 15 min y la caducidad de 12 h, y queda visible en
`auth.reconfirm.failed`/`auth.pin.change_failed`. Cambios: software-engineer
en `docs/arquitectura.md` §7 (pasos 2–3) y ADR-005 revisión (c); monitoring
en `SessionPinProbing` (ahora solo `purpose="approval"`), y RS-16b.
**No bloquea:** la redacción actual de la arquitectura es más estricta, no
menos segura; el cambio es de coherencia con la historia. No hace falta que el
PO cambie CA-F12.

**HU-01/CA-F13, puntos que dejó el PO "a confirmar por Cybersecurity".**
1. *Revocar también si el bloqueo indefinido llega por inicios de sesión
   fallidos desde otro dispositivo:* **confirmado** (ver SEC-016 arriba). El
   PO puede quitar la marca "a confirmar" y redactar CA-F13 para todo bloqueo
   indefinido, sea cual sea su origen.
2. *Pantalla sin interacción (cola de barra) vuelve al login en ≤ 1 s:*
   **confirmado** y exigido: es la misma regla de RS-14 para toda revocación.
   El servidor envía `session.revoked` y cierra el flujo SSE tras el `COMMIT`;
   si el flujo estaba caído, la reconexión recibe `401` y la UI va al login.
   Además, la pantalla no debe seguir mostrando datos después de la
   revocación (se vacía el estado en memoria al ir al login). RS-14 ampliado.
3. *Que el titular de la sesión vea "Cuenta bloqueada. Espera X min" en lugar
   del "PIN incorrecto" genérico (CA-F12 (c)):* **aceptado, solo para el PIN
   del propio titular** (`confirmPin`, `currentPin`). Quien usa la sesión ya
   está autenticado como esa cuenta y el bloqueo lo ha causado su propio
   intento o lo verá al intentar entrar (CA-F06 ya muestra el bloqueo en el
   login): no se revela nada nuevo. **Nunca** en `managerApproval`, donde el
   PIN es de otra persona: ahí sigue el error genérico (HU-06/CA-F18) y,
   además, sin diferencia de tiempo (SEC-025). El quinto fallo, el que activa
   el bloqueo, muestra el mensaje normal de PIN incorrecto (CA-F12 (b)):
   correcto, coherente con el login.

**T-14 (parte de seguridad).** Cerrado desde seguridad: la sesión no se
cierra en el bloqueo temporal (CA-F12) y se revoca en el indefinido
(CA-F13), que es lo que Cybersecurity defendía. Cerrar la sesión en cada
bloqueo temporal sería un DoS gratuito (cinco logins fallidos desde otra
tablet echarían al encargado) sin reducir riesgo, porque mientras dura el
bloqueo la sesión no puede probar ni usar el PIN.

**T-18 (Testing) — oráculo de RS-18.** **Aceptado.** RS-18 queda: tabla
esperada **escrita a mano** en el test a partir de `docs/permisos.md` §3 (y
§1 para los estados de cuenta), sin importar `permissions.ts`; un test aparte
compara `permissions.ts` con esa tabla y falla si difieren. Si difieren, manda
`docs/permisos.md` hasta que se corrijan los dos (§0 de permisos). Además se
añaden a la tabla las rutas que no deben existir (`GET/PATCH /settings` →
`404`).

**Monitoring — umbrales de `docs/logging.md` §7.4.**
- `LockoutRepeated` (≥ 2 bloqueos temporales del mismo usuario en 24 h,
  crítica [24h]): **aprobado.** Coincide con §6.1.7 ("segundo bloqueo de un
  mismo usuario en 24 h"); el cuarto bloqueo es indefinido y lo cubre
  `AccountLockedManual`.
- `AccountLockedManual` (`increase(...{kind="manual"}[5m]) > 0`, crítica
  [24h]): **aprobado con condición**: la serie del contador debe existir con
  valor 0 desde el arranque de `app` para todas las combinaciones de
  etiquetas (`kind` × `purpose`); si la serie nace con el primer incremento,
  `increase()` no ve el paso de "no existe" a 1 y la primera alerta tras un
  reinicio no salta. Lo mismo para `auth_verifications_total` (`result` =
  `rate_limited_ip`/`rate_limited_session`/`invalid`), `csrf_rejected_total`
  y `staff_privilege_changes_total`. → SEC-024.
- `SessionPinProbing` (`rate_limited_session` > 0 en 15 min, aviso [24h]):
  **aprobado**; tras T-20 solo puede venir de `purpose="approval"` (una
  tablet de sala probando el PIN de un encargado). La sesión propia probando
  su PIN la delatan `LockoutRepeated` y `AccountLockedManual` con
  `purpose` = `confirm`/`change`.
- **Faltan o no cumplen §6.1.7 (→ SEC-024, media, monitoring):**
  (a) no hay alerta para **cualquier bloqueo de una cuenta de encargado**
  (§6.1.7, HU-01/CA-N05); `auth_lockouts_total` no tiene la etiqueta de rol.
  (b) `LockoutSpray` usa 15 min y §6.1.7 pide **1 h**: con el límite de 10
  fallos/10 min por IP, bloquear a 3 usuarios desde un mismo dispositivo
  exige 15 fallos y por tanto más de 10 min, así que un rociado desde una
  sola tablet puede no caer nunca en una ventana de 15 min.
  `ManagerApprovalFailures` (≥ 3 en 15 min) es más amplia que los 10 min de
  §6.1.7: aprobado.

**Monitoring/Infrastructure — comandos nuevos del temporizador (condición 2
de §6.3).** Todos se ejecutan **en el host** por el script del usuario de
servicio; leer `/proc` desde el host no es montar `/proc` en un contenedor
(lo prohibido por §3.4), y son datos sin secretos que cualquier usuario del
host ya puede leer.
- `date`: **aprobado** solo con formato fijo de salida (`date +%s`,
  `TZ=Europe/Madrid date +%H%M`, `+%u`); nunca `-s`/`--set` (además
  fallaría sin `CAP_SYS_TIME`).
- `/proc/loadavg` y `/proc/meminfo`: **aprobados** con lectura de esas dos
  rutas fijas (`read`/`cat` o `awk` sobre la ruta literal), exportando solo
  `load1` (y, si se quiere, `load5`/`load15`) y `MemTotal`/`MemAvailable`
  (+ `SwapTotal`/`SwapFree`); nunca otras rutas de `/proc` (en particular
  `/proc/<pid>/*`, que expone entornos y líneas de comandos).
- `timedatectl show`: **aprobado** solo con propiedades concretas
  (`timedatectl show -p NTPSynchronized -p TimeUSec --value` o equivalente;
  `timedatectl show-timesync -p …` si el host usa `systemd-timesyncd`);
  nunca `set-*` ni `timedatectl` sin subcomando. Funciona por D-Bus
  (`AF_UNIX`), compatible con `RestrictAddressFamilies=AF_UNIX`.
- `chronyc tracking`: **aprobado solo como `chronyc -n -c tracking`** y solo
  si funciona sin ampliar `RestrictAddressFamilies` (por el socket Unix de
  `chronyd`). Si necesita UDP a `127.0.0.1:323` no se abre `AF_INET` en la
  unidad: se usa `timedatectl` (`NTPSynchronized`) y `ClockDrift` se basa en
  ese indicador. Nunca comandos de control de `chronyc` (`makestep`,
  `settime`, `burst`…), ni añadir el usuario de servicio al grupo `chrony`.
- Las métricas nuevas siguen la condición 3 (lista cerrada, etiquetas
  acotadas). Monitoring y Infrastructure actualizan la lista de
  `docs/infraestructura.md` §11.1 (hoy dice "pendientes de aprobación").

**Infrastructure — `NoNewPrivileges=yes` con `podman` en el temporizador.**
**Aprobado tal cual.** Que `podman` no pueda ejecutar `newuidmap`/`newgidmap`
(setuid) y solo se una al espacio de usuarios ya creado por los servicios
Quadlet es el comportamiento deseado: el temporizador no crea nada y, si no
hay espacio de usuarios, falla de forma segura (sin métricas →
`HostMetricsStale`). Condiciones: (1) no se "arregla" relajando
`NoNewPrivileges`, añadiendo capacidades de fichero a `newuidmap` ni
ejecutando `podman system migrate`/`podman unshare` desde el script; (2) la
alerta `HostMetricsStale` debe tener un margen que cubra el arranque del host
(los Quadlet arrancan después de `OnBootSec=30s`), para que no sea ruido en
cada reinicio; (3) se prueba en DEMO, incluido un arranque en frío.

**Infrastructure/Monitoring — salida de Alertmanager por `alert-egress`
filtrada con nftables `meta skuid` hacia 587. Aprobado con condiciones.**
El filtro por UID es válido en rootless: la salida de las redes de los
contenedores la hace un proceso del propio usuario (`pasta`/`slirp4netns`),
así que el paquete sale por la cadena `output` con `skuid` = usuario de
servicio (en Podman con root no funcionaría: el tráfico se reenvía y no tiene
socket propietario). Lo filtrado es **todo** el tráfico de ese usuario, no
solo Alertmanager; por eso:
1. Tabla de familia `inet` (IPv4 **e** IPv6); política del usuario: aceptar
   `oif lo`, `ct state established,related`, DNS solo al resolvedor
   configurado, `tcp dport 587` y **denegar el resto** (con contador o
   `log` limitado para ver intentos).
2. Destino del 587: si el proveedor SMTP tiene direcciones estables, limitar
   a un `set` con sus IP (rellenado en el despliegue); si no, solo el puerto,
   y se acepta el riesgo residual (exfiltración por 587 a otro servidor) por
   ser Alertmanager el único contenedor con red no interna.
3. Solo Alertmanager está en `alert-egress` (y `proxy` en una red con
   salida solo en la topología B con ACME). Ningún otro contenedor del stack
   tiene red no interna.
4. La apertura temporal de 443 para `podman pull` la hace el
   aprovisionamiento o la cuenta de administración (las reglas nftables
   necesitan privilegios); el usuario de servicio **no** recibe `sudo` ni
   permisos sobre nftables. Se cierra al terminar el despliegue y queda
   registrado.
5. Alertmanager con TLS verificado hacia el SMTP: `smtp_require_tls: true` y
   sin `insecure_skip_verify`.
6. Prueba en DEMO: desde Alertmanager, `587` al servidor SMTP funciona; `443`
   y `80` a internet y `587` a otra IP (si se usa el `set`) fallan; IPv6
   igual.

**UX (1.2c, `docs/ux/flujos.md` §10) — pasos de telemetría de `login` y
`pin_change` previos a la sesión. Aprobado con condiciones (baja, no
bloquea).** Es preferible a abrir un endpoint de telemetría sin sesión, que
sería una superficie pública nueva; RS-43 no cambia. Condiciones:
1. Solo en memoria de la página (nunca `localStorage`, `sessionStorage`,
   IndexedDB ni cookies); se pierden al recargar o cerrar.
2. Como mucho 20 pasos y 10 min de antigüedad; lo que exceda se descarta.
   Se envían en el primer lote tras `succeeded` (login) o `saved`
   (`pin_change`), dentro de los límites de RS-43 (≤ 50 elementos, ≤ 16 KiB).
3. Solo los enums ya definidos por UX: sin usuario elegido, sin longitud del
   PIN, sin eventos por dígito y sin tiempos entre pulsaciones (que podrían
   revelar patrones del PIN); la hora de cada paso, como mucho al segundo.
4. Cada paso previo va marcado (p. ej. `pre_session: true`) y Monitoring no
   lo atribuye al `user_id` de la sesión que lo envía: en una tablet
   compartida, el abandono o el `locked_shown` puede ser de otra persona. Se
   usan solo para métricas agregadas.
5. Al cerrar sesión (o al revocarse), el búfer se vacía: los pasos de una
   persona no se envían con la sesión de la siguiente.

**Infrastructure — volumen `caddy-data` montado en los ejecutores de
TESTING** (`docs/infraestructura.md` §9, nota 4). Aceptado con condiciones:
contiene la clave de la CA de la ejecución, así que (a) `tests/run.sh` lo
destruye al terminar cada ejecución (`down -v` o `podman volume rm`), de modo
que la CA es de verdad efímera; (b) la CA raíz de TESTING no se instala nunca
en un navegador ni en un dispositivo fuera de los contenedores efímeros;
(c) recomendado (no bloqueante): montar solo `root.crt` en lugar del volumen
entero. En DEMO/PROD nunca se monta en otro contenedor.

### 6.5 Revisión 2.1f (2026-11-24): TESTING de HU-01 (infrastructure 2.1b/2.1b2) y tres puntos de la 2.1c

Entradas: commits `5b4acb2` (2.1b) y `f9b0198` (2.1b2) (`compose.test.yaml`,
`compose.dev.yaml`, `deploy/db/testing/20-test-admin.sh`,
`deploy/dev/levantar.sh`, `deploy/dev/generar-secretos.sh`),
`docs/infraestructura.md` §6, §9.1 y §15; `06fbaf7` (`docs/arquitectura.md`
§5 `401`, §7 sesión, §10.1 `TRUSTED_PROXIES`).

**Pruebas propias (no destructivas, Podman 5.7.0 rootless, `rootless true`).**
Proyecto efímero `mi-app-test-secprobe` levantado con el `compose.test.yaml`
real (solo `db`, perfil `integration`; imágenes de app/ejecutores con un
digest ficticio porque no se arrancan; secretos aleatorios en
`$XDG_RUNTIME_DIR`, nunca mostrados). Clientes `psql`/`node` con UID 1000,
`cap-drop=ALL`, `no-new-privileges`, raíz `ro`. Al terminar: `down -v`,
contenedor auxiliar y directorio de secretos borrados; `podman ps -a` solo
muestra `mi-app-dev_db_1` (detenido, sin tocar); ninguna red ni volumen de la
prueba queda. Guion y SQL en el scratchpad de la sesión, fuera del repo.
- `db` *healthy*; `podman top`: procesos con el usuario del host, nunca UID 0.
- `pg_roles`: `test_admin` solo `CREATEDB` (sin `SUPERUSER`, `CREATEROLE`,
  `REPLICATION`, `BYPASSRLS`), `CONNECTION LIMIT 4`, sin pertenencia a ningún
  rol. `app_owner` 2 y `app_rw` 20 conexiones, sin cambios.
- `test_admin`: `CREATE DATABASE … TEMPLATE cafeteria` → `permission denied
  to copy database`; `TEMPLATE app_template` → correcto; `… OWNER app_owner`
  → `must be able to SET ROLE`; `ALTER ROLE test_admin SUPERUSER |
  CREATEROLE | BYPASSRLS | CONNECTION LIMIT -1` y `ALTER ROLE app_rw
  CONNECTION LIMIT 100` → denegados; `ALTER/DROP/RENAME` de `cafeteria` y
  `app_template` (incluido `IS_TEMPLATE false`) → `must be owner`;
  `pg_terminate_backend`/`pg_cancel_backend` sobre `app_rw` → no ve sus
  procesos (0 filas); `pg_stat_activity` de otros → `<insufficient
  privilege>`; `COPY … TO PROGRAM` y `pg_read_file('/run/secrets/…')` →
  denegados; `CONNECT` a `cafeteria` y `app_template` → denegado; en su clon
  no ve las tablas de la migración; `DROP DATABASE t_ok WITH (FORCE)` sin
  conexiones abiertas → correcto.
- Clon `t_ok`: `app_rw` inserta y lee, no puede crear tablas; `PUBLIC` tiene
  `CONNECT` y `TEMP` (como dice §9.1). **Comprobado además:** como
  propietario del clon, `test_admin` puede hacer `ALTER DATABASE t_ok SET
  search_path = trampa, public`, crear el esquema `trampa` y una tabla `t`
  con `GRANT` a `app_rw`; las consultas sin esquema de `app_rw` en ese clon
  van entonces a la tabla de `test_admin` (`public.t` 0 filas, `trampa.t` 1).
  `session_preload_libraries` → denegado. Valoración en el punto 1.
- Red `db-seed` (contenedor solo en ella, con un servicio falso `app:3000`
  en `backend`): `db:5432` conecta; `app` → `ENOTFOUND`; IP de `backend` del
  servicio falso y de `db` → `ENETUNREACH` (la red interna no tiene ruta a
  otras subredes). Control: desde `backend`, `app:3000` sí responde.
- SEC-015/SEC-020 con `20-test-admin.sh`: las 5 contraseñas aparecen 0 veces
  en el log de `db`.
- Asignación de IP en una red `internal` con subred `/29` (red de prueba
  `secprobe-ipam`, borrada): el primer contenedor sin IP fija recibe `.2`, y
  después un contenedor con `ip=…2` falla con `IPAM error: requested ip
  address … is already allocated`. Es el orden real de TESTING (`proxy`
  depende de `app`): **SEC-028**.
- `comprobar_enlaces` de `deploy/dev/levantar.sh` (extraída tal cual, árboles
  de prueba en el scratchpad): pasa con enlaces tipo pnpm en
  `tests/node_modules` (`→ ../../apps/web`, `→ ../../node_modules/.pnpm/pg`);
  se detiene con `tests/node_modules/malo → ../run.sh`, con
  `node_modules/x → ../tests/node_modules/../run.sh`, con un destino absoluto
  fuera del árbol, con un enlace anidado a `tests/` y con el prefijo
  engañoso `tests/node_modulesX` (y con el falso positivo conocido de un
  enlace a la carpeta raíz de la lista sin barra).
- `podman-compose -f compose.dev.yaml --profile setup config`:
  `./tests/node_modules` en `rw` **solo** en `deps`; `web` sigue con
  `apps/`, `packages/`, `node_modules/`; los 5 servicios con `./:/workspace:ro`.

**Dictámenes de infrastructure (2.1b/2.1b2).**

1. **`test_admin` y `app_template`: APROBADO; se mantiene SIN
   `pg_signal_backend`.** El rol solo puede crear BD clonando plantillas
   (`IS_TEMPLATE`) o `template0/1`, y borrar las suyas; no puede tocar
   `cafeteria`, ni la plantilla, ni roles, ni leer datos (comprobado).
   `pg_signal_backend` le permitiría terminar cualquier proceso no
   superusuario (también los de `app` y `migrate`): no hace falta, porque el
   fallo del `DROP` con conexiones abiertas es una señal útil de un test que
   no cierra su *pool*. La doble condición es defensa en profundidad; el
   control real es que el script vive en `deploy/db/testing/` y solo lo monta
   `compose.test.yaml` como fichero suelto (las dos condiciones vienen del
   mismo fichero, no son independientes). Condiciones: (a) DEMO/PROD montan
   solo `deploy/db/initdb/` (nunca `deploy/db/testing/`) y no fijan
   `MI_APP_ENTORNO=testing`; se comprueba al crear `compose.demo.yaml` y las
   unidades Quadlet (infrastructure; Cybersecurity lo revisa en la Etapa 4);
   (b) `CONNECT`/`TEMP` de `PUBLIC` en los clones: aceptado (efímeros, sin
   datos reales, solo `test_admin` y `app_rw` tienen credenciales en el
   ejecutor). **Riesgo residual aceptado:** como propietario del clon,
   `test_admin` puede desviar con `search_path` las consultas sin esquema de
   `app_rw` hacia objetos suyos (comprobado). No da privilegio nuevo, porque
   el mismo ejecutor ya tiene las dos credenciales y la BD es desechable;
   solo afectaría a la fiabilidad de un test que lo hiciera a propósito. En
   `cafeteria` (todos los entornos) solo `app_owner` puede crear esquemas.
   Recomendado, no bloqueante (developer): fijar `search_path=public` en las
   opciones de conexión del *pool* de `app` (defensa en profundidad tipo
   CVE-2018-1058).
2. **`db` con `db_test_admin_password` en todos los perfiles de TESTING:
   APROBADO.** `db` ya recibe la contraseña del superusuario; un secreto
   aleatorio de la ejecución más no cambia nada. Que falte el fichero haga
   fallar `db` (falla cerrado) es lo correcto. `tests/run.sh` ya lo genera.
3. **`runner-e2e` con `app_rw` y el *pepper* de la ejecución en `db-seed`:
   APROBADO.** Cumple la condición (d) de §6.3 (`chromiumSandbox`): solo
   recibe secretos aleatorios de esa ejecución (`tests/run.sh`, 48 bytes de
   `/dev/urandom`, borrados en el `trap`); (c) sin salida a internet (las 4
   redes `internal`); llega a `db` pero no a `app` (comprobado: `ENOTFOUND` y
   `ENETUNREACH`), así que no se salta `proxy`/Toxiproxy. `runner-perf` no
   recibe BD ni *pepper*: correcto. Condiciones: el *pepper* de TESTING no se
   reutiliza nunca en DEV/DEMO/PROD ni a la inversa; ningún informe de
   Playwright (trazas, vídeos, `tests/results`) incluye el contenido de
   `/run/secrets` ni la cadena de conexión (Testing lo revisa en RS-38).
4. **`runner-integration` sin `app_owner`: APROBADO** (mínimo privilegio; en
   `tests/` no queda ningún uso de `DATABASE_USER` ni de `app_owner`).
5. **T-34, tmpfs sobre `/etc/ssl/certs` + `entrypoint` `sh`: APROBADO.**
   §3.4 prohíbe montar directorios del sistema **del host**; un tmpfs del
   propio contenedor efímero con `nosuid,nodev,noexec`, tamaño acotado y
   copia del contenido de la imagen no expone nada del host ni amplía
   privilegios (UID 1000, sin capacidades, el resto de la raíz sigue `ro`).
   Lo que puede escribir allí es el propio código del contenedor, que ya es
   de confianza dentro de esa ejecución. **Confiar en toda la CA en WebKit
   es aceptable:** la CA es de esa ejecución, solo emite Caddy, y es
   exactamente el modelo de DEMO/PROD (los dispositivos confían en la CA
   interna, `docs/infraestructura.md` §12.6), así que WebKit prueba el
   escenario real. La fijación SPKI de Chromium es más estricta, pero
   frente a quién podría emitir otro certificado (alguien con la clave de la
   CA, que solo existe en el volumen efímero `caddy-data`) no añade
   protección real en TESTING. Condiciones: (a) nunca `ignoreHTTPSErrors`
   (comprobado: no aparece en `tests/`); (b) si el `entrypoint` no puede
   añadir la CA, el proyecto WebKit debe **fallar** por certificado, no
   saltarse (hoy es así: avisa y WebKit no conecta); (c) siguen las
   condiciones de `caddy-data` de §6.4 (volumen destruido al terminar; la CA
   de TESTING no se instala fuera de los contenedores efímeros). Pendiente
   de Testing: comprobar en la primera ejecución real que WebKit
   (glib-networking/GnuTLS) lee ese bundle.
6. **Límite de 20 conexiones de `app_rw` compartido: APROBADO.** Es un
   problema de capacidad de los tests, no de seguridad. Si hiciera falta
   más, **no** se cambia `10-roles.sh` (lo comparten todos los entornos): se
   sube solo en TESTING con `ALTER ROLE app_rw CONNECTION LIMIT n` en
   `20-test-admin.sh`, avisando a Cybersecurity. PROD sigue con 20.
7. **`tests/node_modules` en `rw` solo en `deps` y `comprobar_enlaces`
   ampliada: APROBADO** (SEC-023 y SEC-026 siguen como estaban: verificado y
   corregido). `tests/` entero y `tests/run.sh` siguen en `ro`; `web` no
   monta `tests/node_modules`; los enlaces de `tests/node_modules` se
   comprueban como los del resto de la lista (7 casos). Nada del host ejecuta
   `tests/node_modules` (las suites corren en contenedores). La condición de
   §7.1 sobre el IDE se extiende a `tests/node_modules`.
8. **Red `proxy-app`, `TRUSTED_PROXIES` = IP fija de `proxy`, `proxy` fuera
   de `backend`: APROBADO en diseño**, con **SEC-028** (baja) por la
   asignación de IP. Una sola IP (no la subred) es lo correcto: el
   *gateway* `.1` y `app` también están en esa subred. Nadie más está en
   `proxy-app`; `runner-integration` llega a `app` por `backend` con su IP
   propia (no de confianza), y sin `NET_RAW` ningún contenedor puede
   falsificar la IP de origen. Sacar `proxy` de `backend` le quita el acceso
   a `db`: mejora. Para DEMO/PROD, el mismo esquema (red propia `proxy`↔`app`
   e IP fija para los dos).

**Dictámenes de la 2.1c (software-engineer).**

- **Motivo del `401` (`details.reason`, `revokedReason`): APROBADO con
  condiciones.** Solo lo recibe quien presenta un token de 256 bits que casa
  con un `token_hash` guardado, es decir, el propio dispositivo de esa
  sesión. No revela nada que el titular no vaya a saber al volver a entrar
  (`403 USER_DISABLED`, `423 ACCOUNT_LOCKED_MANUAL`). En una tablet
  compartida el siguiente usuario puede ver "la sesión anterior se cerró
  porque se restableció el PIN": dato menor, aceptado. Condiciones: (a)
  `details` solo con `reason` y `revokedReason` de la lista cerrada, sin
  `userId`, nombre, fechas ni quién revocó; (b) sin cookie o con token
  desconocido, sin `details` y con el mismo cuerpo y tiempo de respuesta que
  hoy (no se puede distinguir "token que existió" de "token inventado" salvo
  teniendo el token); (c) recomendado: la respuesta `401` borra la cookie
  (`Set-Cookie: __Host-sid=; Max-Age=0; Path=/; Secure; HttpOnly;
  SameSite=Strict`) para que el dispositivo no la siga enviando; (d) los
  motivos dejan de devolverse cuando se purga la fila (30 días, `docs/permisos.md` §6).
- **`TRUSTED_PROXIES` con CIDR: APROBADO con condiciones → SEC-029
  (media).** El CIDR es útil, pero un valor amplio (o los nombres que acepta
  `proxy-addr`, como `uniquelocal`, que equivale a `10/8, 172.16/12,
  192.168/16`) haría que cualquier contenedor o equipo de esas redes pudiera
  falsificar `X-Forwarded-For` y saltarse el límite por IP del login (la
  defensa contra el rociado de PIN de SEC-001) o culpar a otra IP (SEC-003).
  `config.ts` debe validar de forma estricta y pasar a Fastify un *array*,
  no la cadena tal cual.
- **`last_activity_at` en cada petición y barra cada 60 s y al cerrar: el
  modelo de amenazas no cambia en lo esencial; un hallazgo bajo
  (SEC-030).** (a) Escribir en cada petición: solo con sesión válida, por
  clave primaria y con `GREATEST`; no abre una vía de denegación de servicio
  sin autenticar ni retrocede la marca. La comprobación se hace **antes** de
  escribir, así que una petición tardía no resucita una sesión caducada.
  Aceptado. (b) Barra: la exención ya existía (HU-01/CA-F09); las
  escrituras del *hub* solo la hacen robusta frente a cortes y reinicios. La
  ventana real tras cerrar la cola es de 15 min, igual que para cualquier
  otro rol. Condiciones: las escrituras del temporizador y del cierre usan
  `GREATEST` y `WHERE … AND revoked_at IS NULL AND expires_at > now`, solo
  para sesiones `kitchen` con flujo abierto **en ese momento** (nunca
  resucitan una sesión revocada o caducada ni se aplican a un encargado);
  un cambio de rol cierra el flujo (ya en ADR-004) y saca la sesión de la
  lista. (c) Lo que sí debilita el control del servidor: las peticiones
  automáticas (los *snapshots* que cada pantalla pide al recibir `hello` o
  al reconectar, §5 de la arquitectura, rutas de la SPA) cuentan como actividad, de modo que
  una tablet desatendida con Wi-Fi inestable alarga su sesión sin que nadie
  la toque. El temporizador del cliente es el control principal y la
  caducidad de 12 h limita el máximo, de ahí baja: **SEC-030**.

### 6.6 Revisión 2.1k (2026-11-24): decisiones del SE de la 2.1i (T-40, SEC-029, SEC-030, recomendaciones de la 2.1f)

Entradas: commit `4f96dbb` (`docs/arquitectura.md` §2.1, §3.1, §5, §5.1, §6,
§7, §10.1, §17.1); `deploy/db/initdb/10-roles.sh` y
`deploy/db/testing/20-test-admin.sh` (esquema `public`).

**Pruebas propias (no destructivas, fuera del repositorio).** En el
scratchpad, `fastify@5.12.8` y `pg@8` instalados con `--ignore-scripts` en
un directorio propio y *scripts* aparte con `fastify.inject()` (sin red ni
puertos): (1) cuatro hooks `onRequest` de guarda con
`if (request.is404) return;`, *not-found handler* y *error handler*, sobre
rutas declaradas e inexistentes; (2) `trustProxy` con *array* frente a
`X-Forwarded-For`/`-Host`/`-Proto` y direcciones IPv4 mapeadas; (3)
PostgreSQL 19 efímero (`--user 999:999 --cap-drop=ALL
--security-opt no-new-privileges`, solo en `127.0.0.1`, contraseña de
usar y tirar, contenedor `--rm` ya detenido) con
`ALTER ROLE … SET search_path = evil, public` y
`ALTER DATABASE … SET search_path = evil`. Resultados abajo.

**1. T-40 — `404` para todos con `request.is404`: CONFIRMADO con una
corrección (SEC-031, baja).** RS-18 queda como la decide el SE (opción a):
toda ruta o método no declarado bajo `/api/` → `404 NOT_FOUND` igual para
todos, sin BD ni `Set-Cookie`. Lo que he comprobado:
- `is404` lo calcula Fastify a partir del contexto de la ruta (el del
  *not-found handler* no tiene `url`); el cliente no puede influir en él.
  Con una ruta declarada es `false` en todos los casos probados (`?query`,
  `%6D` codificado que Fastify decodifica y encuentra, `HEAD` automático), y
  en ellos las cuatro guardas corren: no abre una vía para saltárselas.
- Con ruta inexistente las cuatro guardas se saltan y la respuesta es el
  `404`: `GET`/`PATCH /api/v1/settings`, método no declarado
  (`DELETE /api/v1/auth/me`, `PUT /api/v1/orders` → `404`, Fastify no
  responde `405`), barra final (`/api/v1/auth/me/` → `404`, con
  `ignoreTrailingSlash` por defecto en `false`) y `OPTIONS`.
- Las rutas `HEAD` que Fastify crea para cada `GET` (`exposeHeadRoutes`)
  pasan por `onRoute` con la misma `config` (`permission`), así que la
  denegación por defecto (RS-17) las ve y las guardas corren (`HEAD` sin
  sesión → `401`).
- `reply.callNotFound()` desde un *handler* declarado: las guardas ya han
  corrido y luego responde el *not-found handler*; no hay salto de control.
  El `404` de negocio (RS-46, cobro de otro día) sigue siendo del *handler*.
- **Fallo:** Fastify **sí analiza el cuerpo** de las peticiones que van al
  *not-found handler*. `PATCH /api/v1/settings` con `{bad` y JSON →
  `400 FST_ERR_CTP_INVALID_JSON_BODY`; con un cuerpo mayor que el límite →
  `413`; el *error handler* se ejecuta con `is404 = true`. Así RS-18 no da
  "`404` igual para todos" y además el servidor analiza JSON sin
  autenticar en rutas que no existen (acotado por el límite de 64 KiB de
  RS-23, por eso baja). Comprobado también que si el helper, en vez de
  `return`, **responde el `404` en el primer hook de guarda**
  (`return reply.code(404).send(cuerpo)`), los tres casos dan `404` sin
  tocar el analizador. → SEC-031.
- Observación (no es hallazgo): `/API/v1/…` y `//api/v1/…` no casan con
  ninguna ruta (Fastify distingue mayúsculas) y caen en la SPA; solo
  devuelve `index.html`, que es público. §5.2 dice "`GET`" para la SPA: un
  `POST` fuera de `/api/` debe dar `404`, no `index.html` (lo recoge
  SEC-031).
- Valoración de fondo: la existencia de rutas no es secreta (está en el
  *bundle*), y no tocar la BD ni renovar `last_activity_at` con rutas
  inexistentes es mejor que el orden anterior. `request_id` sigue
  corriendo (trazabilidad). Aceptado.

**2. SEC-029 — reglas de `TRUSTED_PROXIES` (§10.1): CUMPLE.** Estado a
corregido (diseño). Las reglas 1–5 recogen todo lo pedido (literal o CIDR
≥ /24 / ≥ /120; rechazo de nombres de `proxy-addr`, `true`, saltos,
vacíos, prefijos cortos; *array* validado a Fastify, nunca la cadena; falla
cerrado sin el valor en el mensaje) y lo endurecen: sin recortar espacios
(un `" "` no arranca), sin ceros a la izquierda (evita ambigüedades
octales), sin zona IPv6 (`net.isIPv6` las acepta, bien excluidas). **Tope de
4 elementos: aprobado**; 4 × /24 = 1024 direcciones como máximo. La
IPv6 mapeada `::ffff:a.b.c.d/n` medida como IPv6 (≥ /120) equivale a un
IPv4 ≥ /24: coherente. Comprobado con `proxy-addr` vía Fastify:
`['10.89.240.2']` confía en `10.89.240.2` y en `::ffff:10.89.240.2` (socket
de doble pila) y no en `10.89.240.3`; `request.ip` es el último elemento no
confiable de `X-Forwarded-For` (correcto con Caddy). Riesgo residual
aceptado: un /24 puede ser la LAN entera del local; no se explota porque
`app` solo es accesible desde `proxy-app`/`backend` (los dispositivos no
llegan a `app:3000`) y §10.1 fija la IP única de `proxy` en
TESTING/DEMO/PROD. **Condición nueva para la verificación en código:** con
`trustProxy`, Fastify toma `request.host`, `hostname` y `protocol` de
`X-Forwarded-Host`/`-Proto` del proxy de confianza (comprobado). Ninguna
lógica de seguridad puede usarlos: el `Origin` se compara solo con
`publicOrigin` (RS-24), la cookie lleva siempre `Secure` y no se construyen
URL absolutas desde `Host`. Se revisa con el código de HU-01.

**3. SEC-030 — `X-Activity: passive` (§7): CUMPLE.** Estado a corregido
(diseño). La cabecera solo resta (no hay que confiar en ella), la regla es
uniforme en servidor sin lista de rutas, las pasivas pasan por todas las
comprobaciones de sesión (revocada, 12 h, 15 min) **antes** de decidir no
escribir, el valor es exacto (cualquier otro = activa, sin error) y la
lista del cliente cubre los casos de SEC-030 (`hello`, reconexión,
vigilante de 5 s, `businessDate`, `menu.changed`, temporizadores) más
`GET /auth/me` siempre. Reenviar `POST /session/activity` al reconectar si
hubo toques reales es correcto: refleja interacción y el servidor
comprueba los 15 min antes de escribir, así que no resucita una sesión ya
caducada. Sin CORS no hay *preflight*; no se registra la cabecera en logs
(no es sensible). El riesgo de un cliente que no marque nada queda como
antes (12 h + temporizador del cliente), aceptado en SEC-030.

**4. Recomendaciones de la 2.1f aceptadas por el SE.**
- **`search_path=public` en el *pool*: CUMPLE.** Comprobado con PostgreSQL
  19 y `pg@8`: sin la opción, un rol con `ALTER ROLE … SET search_path =
  evil, public` conecta con `evil, public`; con
  `options: '-c search_path=public'` conecta con `public`, también con un
  `ALTER DATABASE … SET search_path = evil` añadido. El parámetro de
  arranque prevalece sobre `ALTER ROLE/DATABASE`. Con `REVOKE ALL ON SCHEMA
  public FROM PUBLIC` y `public` de `app_owner` (`10-roles.sh` y
  `20-test-admin.sh`), `app_rw` no puede crear objetos en el único esquema
  de la ruta; `pg_catalog` se busca antes de forma implícita y las tablas
  temporales solo afectan a la propia sesión. Verificación con código: un
  integración `SHOW search_path` = `public` en una conexión del *pool* de
  `app`, de `migrate` y de los comandos.
- **Borrado de `__Host-sid` en todo `401 UNAUTHENTICATED` con cookie:
  CUMPLE**, con una condición (SEC-032, baja). El `Set-Cookie` es válido
  para el prefijo `__Host-` (`Secure`, `Path=/`, sin `Domain`), idéntico
  en todos los motivos (no distingue token conocido de inventado), solo si
  la petición traía la cookie, y el logout lo repite; el `401
  INVALID_CREDENTIALS` del login no borra nada (correcto: no es una sesión).
  El riesgo nuevo que se añade: un `401` de la sesión vieja que llega
  **después** de un login nuevo en el mismo navegador borra la cookie
  nueva, porque el borrado no depende del valor. Impacto solo de
  disponibilidad (el usuario vuelve a P-01 y entra otra vez; no hay
  confusión de identidades ni escalada). Abortar con `AbortController` las
  peticiones en curso lo cierra para el cliente HTTP, pero el texto de §5
  no cubre los otros canales: el `EventSource` de `GET /events` (y la
  reconexión del vigilante de 5 s), el envío de telemetría si usa
  `sendBeacon` o `fetch({ keepalive: true })` (no se pueden abortar de
  forma fiable) y los temporizadores de recarga. → SEC-032.
- **`UnauthenticatedDetails` estricto y tiempo igualado: CUMPLE.**
  `.strict()` con `reason` y `revokedReason` de la lista cerrada cumple la
  condición (a) de §6.5; cuerpo idéntico salvo `requestId` sin cookie, con
  token desconocido o mal formado cumple (b); con cookie, siempre SHA-256 y
  **una** consulta por `token_hash` (índice único) que trae sesión y
  usuario, sin trabajo extra para el token conocido antes de responder,
  iguala el tiempo entre "existió" e "inventado"; sin cookie no hay
  consulta, lo que solo revela que no se envió cookie (lo sabe quien
  pregunta). Condición para el código: cualquier escritura o evento por
  la sesión caducada (p. ej. marcarla revocada, `auth.session.expired`)
  va después de enviar la respuesta o no se hace; un log de una línea es
  aceptable. Verificación: integración que compara medianas de 100
  peticiones con token revocado y con token inventado (< 5 ms, mismo
  criterio que RS-16d con un umbral acorde a una consulta).
- **Escritura acotada del *hub*: CUMPLE** las condiciones (b) de §6.5: una
  sola sentencia para el cierre del flujo y el temporizador, `GREATEST`
  (no retrocede), `$now` del `Clock`, `revoked_at IS NULL`,
  `expires_at > $now`, `u.role = 'kitchen' AND u.active` (cubre la carrera
  con un cambio de rol o una desactivación), sobre la copia de la lista de
  sesiones con flujo abierto en ese instante, que sale de la lista antes de
  lanzar la escritura del cierre. No resucita sesiones revocadas o
  caducadas ni se aplica al encargado con la cola abierta (RS-12).
  `kitchenActivityIntervalMs` (10–60000, no es variable de entorno) no
  añade superficie. Verificación con código: integración con `FakeClock`
  (sesión de barra revocada, caducada, cambiada a `waiter` y desactivada
  con el flujo abierto → `last_activity_at` no cambia).

**Altos o críticos en esta revisión: ninguno.**

---

## 7. Requisitos de seguridad verificables (para Testing)

Formato: requisito → cómo se verifica. Tipos: **U** unitario, **I**
integración (API + BD real), **E** e2e (navegador), **D** dinámico (DAST,
contra TESTING/DEMO), **S** estático (SAST/lint/CI), **C** contenedores/host.

### Autenticación y PIN
| ID | Requisito | Verificación |
|---|---|---|
| RS-01 | Encargado: PIN de exactamente 6 dígitos; camarero y barra: 4 a 6. Aplica en alta, restablecimiento, cambio del PIN provisional, promoción a encargado y encargado inicial. Error `400` con la regla | U (tabla de casos en `packages/shared`) + I (cada endpoint) |
| RS-02 | Reglas de composición de §6.1.2 y lista de PIN prohibidos | U con tabla: 1111, 1234, 9876, 381234, 1212, 123123, 2580, 112233 rechazados; 4831, 739164 aceptados |
| RS-03 | Bloqueo progresivo 5/10/15/20 de §6.1.3; el contador no se reinicia al expirar el bloqueo; durante el bloqueo no se verifica el PIN | I con reloj inyectable: 25 intentos fallidos → tiempos 5, 15, 60 min y `423 ACCOUNT_LOCKED_MANUAL`; luego PIN correcto sigue rechazado |
| RS-04 | `managerApproval` fallido suma al contador del encargado; cuenta bloqueada/desactivada/PIN provisional no aprueba; error genérico idéntico en todos los casos | I |
| RS-05 | 10 fallos/10 min desde una IP, sumando login, `managerApproval`, `confirmPin` y `currentPin` → `429` 10 min en todas las rutas de PIN (y en `GET /auth/login-options`) antes de verificar el hash; 5 aprobaciones fallidas/10 min por sesión → `429` | I (medir que no se llama al hasher) |
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
| RS-14 | Logout, desactivación, restablecimiento de PIN, cambio obligatorio del PIN provisional (las demás sesiones) y **bloqueo indefinido** (todas las sesiones de la cuenta, sea cual sea el origen de los fallos) → `401` en la siguiente petición y flujo SSE cerrado en ≤ 1 s; una pantalla sin interacción (cola de barra) vuelve al login en ≤ 1 s y no conserva datos en pantalla; cambio de rol → SSE cerrado por el servidor en ≤ 1 s y siguiente petición con el rol nuevo | I + E (cola de barra abierta; 20 logins fallidos con ese usuario desde otro dispositivo → login en ≤ 1 s) |
| RS-15 | Con `must_change_pin` solo `POST /auth/pin`, `GET /auth/me`, `POST /auth/logout`; el resto, incluido `GET /events`, → `403 PIN_CHANGE_REQUIRED` | I |
| RS-16 | (Tras SEC-007) anular cobro y acciones de escritura de Personal exigen `confirmPin` del encargado actuante; fallo cuenta para su bloqueo | I |
| RS-16b | [1.4b, SEC-016; 1.4c, T-20] `POST /auth/pin` solo con PIN provisional (si no, `403 FORBIDDEN` sin llamar al hasher ni sumar a ningún contador). `currentPin` y `confirmPin` erróneos: `403 PIN_INVALID` / `403 PIN_CONFIRMATION_INVALID`, suman al contador del usuario (escala 5/10/15/20) y al límite por IP; **sin** límite por sesión; con la cuenta bloqueada → `423` sin verificar ni contar; al terminar el bloqueo temporal se puede volver a intentar; al llegar al bloqueo indefinido se revocan todas las sesiones de la cuenta | I con reloj: 5 `currentPin` erróneos → el 5.º `403` y bloqueo de 5 min; 6.º (PIN correcto) → `423 LOCKED` sin llamar al hasher; a los 5 min 1 s, el PIN correcto → `204`. 20 fallos acumulados → `423 ACCOUNT_LOCKED_MANUAL` y la sesión recibe `401`. Sin PIN provisional → `403` y contadores sin cambios |
| RS-16c | [1.4c, SEC-016] Solo `verifyPin` usa el hasher argon2id | S: test/lint que falla si algún módulo distinto de `auth/verifyPin` importa o recibe el hasher |
| RS-16d | [1.4c, SEC-025] En `managerApproval`, la respuesta con el encargado bloqueado, inexistente o con PIN erróneo es indistinguible en código, cuerpo y tiempo | I: diferencia de medianas < 50 ms en 100 intentos entre encargado bloqueado y PIN erróneo |

### Autorización y validación
| ID | Requisito | Verificación |
|---|---|---|
| RS-17 | Denegación por defecto: toda ruta registrada declara un permiso o está en la lista pública (`POST /auth/login`, `GET /auth/login-options`) | S/I: test que recorre las rutas de Fastify y falla si alguna no tiene permiso |
| RS-18 | Matriz rol × endpoint de `docs/permisos.md` §3 (W, K, M, sin sesión, PIN provisional), incluidas las rutas que no existen (`GET/PATCH /settings` → `404`). [2.1k, T-40, SEC-031] Toda ruta o método no declarado bajo `/api/` → `404 NOT_FOUND` idéntico (salvo `requestId`) para todos: sin sesión, con cookie válida/caducada/inventada, PIN provisional, W/K/M, sin `Origin` o con `Origin` ajeno, **y con cualquier cuerpo** (JSON inválido, `Content-Type` no admitido, cuerpo > límite); sin `details`, sin `Set-Cookie`, sin consultar la BD y sin cambiar `last_activity_at` | I con la tabla esperada **escrita a mano** desde `docs/permisos.md` §3 (no se importa `permissions.ts`), comprobando que los `403` no tienen efecto; test aparte que compara `permissions.ts` con esa tabla (T-18). Casos de 404 (T-40): `GET`/`PATCH /api/v1/settings` en cada estado de la fila; `PATCH /api/v1/settings` con `{bad`, con `text/plain` y con 65 KiB; `DELETE /api/v1/auth/me` (método no declarado); `GET /api/v1/auth/me/` (barra final); sesión con 14 min de inactividad → tras el `404`, a los 15 min el `GET /auth/me` da `401 idle` (no renueva); contador de consultas de la BD sin cambios. Rutas `HEAD` generadas por Fastify incluidas en RS-17 (llevan la `config` del `GET`) |
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
| RS-29 | Ni PIN, ni token, ni cookie en ningún log (`app`, Caddy, `db`, journald): se usa un PIN centinela (p. ej. 908172) en login, aprobación, reconfirmación (`confirmPin`), alta, restablecimiento, cambio del PIN provisional (`currentPin` y `newPin`) y peticiones inválidas, y se buscan el centinela y el valor de la cookie `__Host-sid` en todos los logs → 0 coincidencias. Caddy sin `log_credentials` | I/C |
| RS-29b | El cliente no conserva PIN (propio ni `managerApproval`) en estado, `localStorage` ni `sessionStorage` tras la respuesta | E (inspeccionar almacenamiento) |
| RS-30 | Eventos de seguridad (sin PIN) del catálogo de `docs/logging.md` §3.2, que manda en los nombres: `auth.login.failed`, `auth.verify.locked`, `auth.account.locked` (`lock_kind`, `purpose`), `auth.sessions.revoked`, `auth.verify.rate_limited` (`scope`), `auth.reconfirm.failed`, `auth.pin.change_failed`, `approval.granted`/`approval.failed`, `auth.session.revoked`, `staff.*` (incl. `staff.unlocked`), `payment.voided`, `price.changed` | I |
| RS-47 | [1.4c, SEC-024] Alertas de §6.1.7: bloqueo de cualquier cuenta de encargado → alerta; ≥ 3 usuarios bloqueados en 1 h → alerta; las series de los contadores de seguridad existen con valor 0 desde el arranque de `app` | I (en `/metrics` tras arrancar, `auth_lockouts_total{kind="manual",…} 0` presente) + D en DEMO (provocar un bloqueo de encargado y uno indefinido tras reiniciar `app`: llegan las dos alertas) |
| RS-43 | Telemetría (`POST /telemetry`): sesión obligatoria, `Origin`, esquema estricto solo con enums/números, ≤ 16 KiB y ≤ 50 elementos, ≤ 1 petición/30 s por sesión (`429`), no cuenta como actividad, sin importes | I |
| RS-31 | Los errores de validación de campos `pin`, `currentPin`, `newPin`, `confirmPin`, `managerApproval.pin` no repiten el valor recibido | I |

### Base de datos
| ID | Requisito | Verificación |
|---|---|---|
| RS-32 | Privilegios de `app_rw` exactamente los de `docs/permisos.md` §6: como `app_rw`, `DELETE` en cualquier tabla salvo `sessions`, `UPDATE` de `audit_log`/`cash_closings`, `UPDATE payments.amount_cents`, `CREATE` en el esquema → `permission denied` | I (conectado como `app_rw`) |
| RS-33 | Trigger: `UPDATE/DELETE` en `audit_log` rechazado incluso como `app_owner` | I |
| RS-34 | 5432 no publicado en TESTING/DEMO/PROD; `pg_hba` solo `scram-sha-256`, sin `trust`; `app_owner` y `app_rw` no son superusuario | C (nmap desde la LAN; consulta a `pg_roles`) |
| RS-35 | Sin `sql.raw`/`sql.lit`/concatenación con datos de entrada; DAST básico de inyección sobre los endpoints con parámetros | S (semgrep/grep en CI) + D |
| RS-44 | [1.4b, SEC-020] Tras inicializar un volumen nuevo, `pg_stat_statements` no contiene ninguna sentencia con `PASSWORD` | C: como `postgres`, `SELECT count(*) FROM pg_stat_statements WHERE query ILIKE '%password%'` → 0 (contar, nunca mostrar `query`) |

### Contenedores y host
| ID | Requisito | Verificación |
|---|---|---|
| RS-36 | `podman info` → `rootless: true`; para cada contenedor: `podman top <c> huser,user` sin UID 0; `CapEff` = 0; `NoNewPrivs: 1`; raíz de solo lectura; límites de memoria/CPU; sin `--privileged`, sin socket, sin `network=host`, sin montajes de directorios del sistema | C (script sobre `podman inspect` en cada entorno) |
| RS-37 | Solo `proxy` publica puertos; `app` y `db` en red `internal: true`; desde `app` no hay salida a internet | C |
| RS-38 | Secretos montados como fichero; `podman inspect` sin secretos en `Env`; `app` no tiene credenciales de `app_owner` ni `postgres`; `migrate` no tiene el *pepper* | C |
| RS-39 | Trivy o Grype sobre cada imagen: 0 críticas/altas (excepciones solo con aprobación escrita de Cybersecurity en §9); `pnpm audit --prod` sin altas/críticas; `pnpm install --frozen-lockfile` con scripts deshabilitados salvo lista blanca; imágenes base por digest | S/CI |
| RS-40 | DEV: puertos publicados solo en `127.0.0.1` | C (`ss -ltnp` en el host) |
| RS-45 | [1.4b, SEC-018; 1.4c, SEC-023; 1.7l, SEC-026] Ningún contenedor de DEV ni de TESTING ve `.secrets/` (ni vacío por debajo ni copiado: el tmpfs lleva `notmpcopyup`), ni puede escribir en `.git/`, `.claude/`, `CLAUDE.md`, `deploy/`, `docs/`, `tools/`, `.gitignore`, los `compose.*.yaml` ni en ningún fichero que se ejecute en el host (`tests/run.sh` y cualquier otro script de entrada) | C: en cada servicio que monta el proyecto, `ls -la /workspace/.secrets` → denegado o vacío; en `/proc/mounts`, `tmpfs /workspace/.secrets ro,…`; `touch` en cada una de esas rutas y en `tests/run.sh` → error; control: el mismo contenedor sin esos montajes sí lee y escribe. Repetir con las imágenes reales de Playwright/k6/ZAP y con Vite y `pnpm install` reales. [1.7l, corregido en 1.7q] Además (SEC-026): (a) `find apps packages \( -name node_modules -type d \) -prune -o -type l -print` vacío (o solo excepciones explícitas revisadas con Cybersecurity, nunca comodines); el antiguo `-path '*/node_modules' -prune` **no vale** porque poda y oculta un enlace llamado `node_modules`; (b) cada línea de `find apps packages node_modules -type l -exec realpath -m -- {} +` empieza por `$(pwd -P)/apps/`, `/packages/` o `/node_modules/`, y `realpath` no falla; en TESTING, (b) también sobre `tests/results` y `tests/screenshots`, sin enlaces permitidos. Prueba: enlace plantado desde `deps` (`apps/x -> ../tests/run.sh`, `packages/p/node_modules -> ../../tests`, `node_modules/e -> /etc/passwd`) → `levantar.sh` y `tests/run.sh` salen con código ≠ 0 sin seguirlo y `tests/run.sh` no cambia |
| RS-46 | [1.4b, SEC-022] El rol `waiter` solo lee cobros y tickets del día de negocio actual; `manager`, de cualquier día | I: `GET /payments/:id` y `/ticket` de un cobro de ayer como W → `404`; como M → `200` |
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
| 3.3 `USER` ≥ 1000 | `app` y `migrate`: distroless con `USER 1000:1000` numérico (1.3c, SEC-010; no el `nonroot` 65532); `db` y `proxy`: imágenes oficiales que arrancan como root, se ejecutan con `--user 1000:1000` | Cumple con condiciones: volúmenes `pgdata` y `/data` de Caddy propiedad del UID elegido; Caddy además necesita `/config` escribible (tmpfs o volumen) por el `autosave.json` |
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

### 8.1 Revisión de `deploy/`, `compose.dev.yaml` y `compose.test.yaml` (1.4b)

| Comprobación | DEV | TESTING (borrador) | Resultado |
|---|---|---|---|
| Motor | `podman info`: rootless `true`, cgroups v2 | igual | Cumple |
| `user` | `1000:1000` + `keep-id` en todos (anclaje `x-hardening`) | igual | Cumple (UID del host = usuario sin privilegios) |
| `cap_drop: [ALL]`, sin `cap_add` | todos | todos | Cumple |
| `no-new-privileges`, `read_only`, `tmpfs /tmp noexec` | todos | todos | Cumple |
| Límites de memoria/CPU/pids | todos | todos | Cumple |
| `--privileged`, sockets, `network_mode: host`, montajes del sistema | ninguno en la configuración resuelta | ninguno (`runner-unit` con `network_mode: none`) | Cumple |
| Puertos | solo `127.0.0.1:3000` y `127.0.0.1:5173` | ninguno publicado | Cumple (SEC-013) |
| Redes | `backend` interna; `frontend` y `deps` con salida | `backend` y `edge` internas | Cumple; `api` y `web` tienen salida a internet en DEV (aceptado solo en DEV) |
| Imágenes por digest | `node`, `postgres` por digest; herramientas locales `pull_policy: never` | `db` y `proxy` por digest; resto por variable obligatoria | Cumple |
| `HEALTHCHECK` | Containerfile (forma exec) + compose | compose | Cumple |
| Secretos | ficheros en `/run/secrets`, variables `*_FILE`, ninguno en `environment` | igual, por ejecución | Cumple (SEC-010), **salvo** el montaje del proyecto (SEC-018) |
| Montaje del proyecto | `./` en `ro` en `api`/`migrate`/`init-manager`, **en `rw` en `web` y `deps`**; incluye `.secrets/`, `.git/` y `.claude/` | `./` en `ro` en los ejecutores; incluye `.secrets/` | **SEC-018 (media)**. [1.4c] Corregido y verificado: tmpfs vacío con `notmpcopyup` sobre `.secrets` en los 11 servicios que montan `./`; `.git`, `.claude`, `CLAUDE.md`, `deploy`, `docs`, `tools`, `.gitignore` y compose en `ro` en `web`/`deps`. Queda `tests/` escribible desde `web`/`deps` con `tests/run.sh` ejecutado en el host: **SEC-023 (media)**. [1.7l] SEC-023 **verificado**: en `web` y `deps` el proyecto está en `ro` y solo `apps/`, `packages/` y `node_modules/` en `rw` (lista de permitidos); prueba propia. Restos de baja: SEC-026 (enlaces simbólicos y consumidores del host en la lista), SEC-027 (tabla de §3 de `docs/infraestructura.md` desactualizada). [1.7q] SEC-027 **verificado**; SEC-026 **corregido** (diseño y `levantar.sh`; prueba propia), pendiente de `tests/run.sh` en la Etapa 2 |
| Containerfile de DEV | base por digest, `USER 1000:1000`, root solo en construcción, sin secretos | — | Cumple |
| `10-roles.sh` | sin contraseñas en el log (SEC-015); roles `NOSUPERUSER…`, límites de conexión, `app_backup` | igual | Cumple; **SEC-020 (media)** por `pg_stat_statements`. [1.4c] Corregido y verificado: `SET pg_stat_statements.track_utility = off` en cada bloque y `pg_stat_statements_reset()` al final |
| `Caddyfile` | — | `admin off`, 8080/8443, RS-26 completo, `-Server`, sin `log_credentials`, `X-Request-Id` propio, 404 a internos, sin `trusted_proxies` | Cumple |
| Escaneo Trivy/Grype | imagen de herramientas no desplegable | imagen final aún no existe | Pendiente (Etapa 2, RS-39) |

**Veredicto (1.4b):** ningún contenedor corre como root, usa `--privileged`,
monta el socket ni la red del host. No hay motivo de bloqueo por la regla de
contenedores. Queda SEC-018 (media) sobre el montaje del proyecto, y el
escaneo de imágenes sigue pendiente hasta que exista la imagen final.

**Veredicto (1.4c):** igual que en 1.4b sobre los compose actuales (revisados
servicio a servicio, incluidos los perfiles `setup`, `unit`, `integration`,
`e2e`, `perf` y `security`). SEC-018 y SEC-020 verificados; queda SEC-023
(media, `tests/run.sh` escribible). Ningún motivo de bloqueo por la regla de
contenedores. El escaneo de imágenes (RS-39) sigue pendiente de la Etapa 2.

**Veredicto (1.7l):** `compose.dev.yaml` tras aebd6ef revisado en `web` y
`deps` (el resto de servicios sin cambios): `user 1000:1000` + `keep-id`,
`CapEff` 0, `NoNewPrivs` 1, raíz `ro`, `/workspace` `ro`, `.secrets` tapado;
sin `--privileged`, sockets ni red del host. SEC-023 verificado. Ningún motivo
de bloqueo por la regla de contenedores. RS-39 sigue pendiente de la Etapa 2.

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
- Estado: verificado (documentos, 1.4b). Comprobado: HU-01/CA-F06, F11, N01, N05; HU-07/CA-F06, F08, F09, F10; HU-06/CA-F17, F18, F19; supuestos 6, 11 y 22 del README coinciden con §6.1 (escala 5/10/15/20 sin reinicio al expirar, 6 dígitos para el encargado y el encargado inicial, reglas y lista de PIN prohibidos, 10 fallos/10 min por dispositivo = IP, desbloqueo por encargado o `unlock-user`, promoción a encargado con PIN corto → cambio obligatorio). "Dispositivo" en CA-F11 y en el supuesto 11 es la IP de origen, que es lo decidido (§6.1.5); el caso de la topología B pasa a SEC-019. ADR-005 revisión (b) y `docs/arquitectura.md` §4.1 (`pin_digits`, `failed_attempts`, `locked_until`, `locked_manual`), §5 (`423 ACCOUNT_LOCKED_MANUAL`, aprobaciones y reconfirmaciones en el mismo contador, `429` antes del hash), §5.1 (`POST /staff/:id/unlock`) y §7 (lista de PIN prohibidos, `unlock-user`) cumplen. El hueco detectado en la revisión (el `currentPin` de `POST /auth/pin` no cuenta para el bloqueo) se abre aparte como **SEC-016** porque tampoco estaba en §6.1. Quedan para Etapa 2/3: RS-01..RS-05, RS-09b y RS-15.

## SEC-002: El login no debe ser alcanzable desde internet ni desde la Wi-Fi de clientes
- Severidad: alta
- Ubicación: docs/decisiones/ADR-007-proxy-tls-y-puertos.md:39-53; docs/arquitectura.md §10 (líneas 491-520); docs/historias/README.md pregunta 11
- Descripción: un PIN de 4–6 dígitos no es una credencial apta para internet ni para una red compartida con clientes (T-01, T-02, T-04, T-11). La arquitectura no exige restricción de red; si PROD es una VM pública, el login queda expuesto a todo internet.
- Responsable: infrastructure (cortafuegos, Terraform, documentación de requisitos de red del local); software-engineer (añadir la restricción como condición en ADR-007)
- Cómo corregir: aplicar §6.2a: PROD en el local con Wi-Fi del personal separada y cortafuegos del host limitado a la subred del personal; o PROD en VM con lista blanca de la IP fija del local o WireGuard. Documentarlo en `docs/infraestructura.md` como requisito previo del despliegue.
- Cómo verificar: RS-41: nmap/curl desde fuera de la red permitida (internet o Wi-Fi de clientes) no obtiene respuesta en 80/443/8080/8443; desde la red del personal sí.
- Estado: corregido (diseño, 1.4b). ADR-007 (revisión 2026-11-21), `docs/arquitectura.md` §7 y §10, y `docs/infraestructura.md` §12.1 recogen el requisito previo con las topologías A (local, Wi-Fi del personal separada, nftables) y B (VM con lista blanca de IP fija o WireGuard), y su verificación (RS-41). Ya no bloquea la puerta de la Etapa 1. Pasa a "verificado" cuando RS-41 se cumpla en DEMO (red del personal) y en PROD (Etapa 5). Relacionado: SEC-019.

## SEC-003: El límite por IP depende de que `app` vea la IP real del dispositivo
- Severidad: media
- Ubicación: docs/decisiones/ADR-005-autenticacion-y-autorizacion.md:54-55; docs/arquitectura.md:432-433
- Descripción: (1) si Fastify confía en cualquier `X-Forwarded-For`, el atacante lo falsifica y evita el límite (T-03); (2) con la red rootless de slirp4netns/rootlessport, todas las conexiones llegan a Caddy con la misma IP interna, de modo que el límite por IP bloquearía a todo el local a la vez o habría que desactivarlo.
- Responsable: infrastructure (red rootless: `pasta`, por defecto en Podman 5, o `slirp4netns` con `port_handler=slirp4netns`, que conservan la IP de origen); developer (Etapa 2: `trustProxy` limitado a la IP de `proxy` en la red interna)
- Cómo corregir: lo indicado arriba; documentarlo en `docs/infraestructura.md`.
- Cómo verificar: RS-06.
- Estado: abierto (media, no bloquea). Infrastructure (`docs/infraestructura.md` §12.5) ha comprobado que la red bridge rootless con `rootlessport` **pierde** la IP de origen y propone dos opciones: Cybersecurity aprueba la 1 (activación por socket de systemd) para PROD y la 2 (Caddy con `pasta`) solo para DEMO con condiciones (§6.3). Caddyfile sin `trusted_proxies`: correcto. Falta: elegir la opción, la prueba RS-06 con dos dispositivos reales en DEMO y `trustProxy` limitado a `proxy` (Developer, Etapa 2).

## SEC-004: Caducidad absoluta de 14 h demasiado larga
- Severidad: media
- Ubicación: docs/decisiones/ADR-005-autenticacion-y-autorizacion.md:64; docs/arquitectura.md:185 y :426
- Descripción: la sesión de barra no caduca por inactividad; con 14 h puede sobrevivir más allá de un turno y de la jornada, atribuyendo acciones a quien ya no está (T-05, T-25).
- Responsable: software-engineer (ADR-005, arquitectura) y product-owner (HU-01)
- Cómo corregir: caducidad absoluta de **12 h** para todos los roles, configurable solo a la baja (§6.2c). Redacción para el PO, **HU-01, añadir en No funcionales:** "Seguridad: toda sesión, incluida la de la pantalla de barra, caduca como máximo 12 horas después de iniciarla; después hay que volver a introducir usuario y PIN."
- Cómo verificar: RS-13.
- Estado: verificado (documentos, 1.4b). HU-01/CA-N06 y CA-F09; ADR-005 (12 h, solo a la baja); `docs/arquitectura.md` §4.1 (`expires_at`) y §7. En Etapa 2/3: RS-13.

## SEC-005: Falta el endpoint público de la rejilla de usuarios del login
- Severidad: media
- Ubicación: docs/ux/wireframes/01-login.md:5-20 y :81; docs/arquitectura.md §5.1 (líneas 336-366)
- Descripción: el paso 1 de P-01 muestra los usuarios activos, pero la API no tiene un endpoint público para obtenerlos; el Developer tendría que improvisarlo (riesgo de exponer `id`, estado de bloqueo, usuarios desactivados o el rol `kitchen`/`manager` de más). Decisión sobre la nota de UX: **se acepta la rejilla** siempre que SEC-002 esté cerrado (red restringida); se mantiene "Escribir mi usuario".
- Responsable: software-engineer
- Cómo corregir: añadir a §5.1 `GET /auth/login-options` (público): devuelve solo `[{name, role}]` de usuarios **activos**, sin `id`, sin estado de bloqueo ni `mustChangePin`; con `Cache-Control: no-store` y el mismo límite por IP que el login.
- Cómo verificar: I: la respuesta solo contiene `name` y `role`; un usuario desactivado no aparece.
- Estado: verificado (documentos, 1.4b). `GET /auth/login-options` en `docs/arquitectura.md` §5.1 y ADR-005 revisión (b): solo `[{name, role}]` de usuarios activos, `no-store`, límite por IP compartido. En Etapa 2/3: test de SEC-005.

## SEC-006: `quantity` sin máximo permite desbordar `total_cents`
- Severidad: media
- Ubicación: docs/arquitectura.md:237 (`quantity smallint > 0`) y :463; docs/decisiones/ADR-006-importes-monetarios.md (límites)
- Descripción: 32 767 × 99 999 céntimos = 3 276 667 233 > 2³¹−1: una sola línea desborda `total_cents integer`; el `INSERT`/`UPDATE` falla (500) o, si alguna suma se hiciera en BD con otro tipo, el total sería incorrecto (T-14). No hay límite de líneas por pedido.
- Responsable: software-engineer
- Cómo corregir: `CHECK (quantity BETWEEN 1 AND 99)` y validación zod igual; máximo 100 líneas por pedido (99 × 99 999 × 100 = 989 990 100 < 2³¹−1). Si el PO necesita cantidades mayores, recalcular el límite.
- Cómo verificar: RS-23.
- Estado: verificado (documentos, 1.4b). `docs/arquitectura.md` §4.1 (`CHECK (quantity BETWEEN 1 AND 99)`, ≤ 100 líneas), §5.1 (`422 ORDER_TOO_MANY_LINES`, `422 PAYMENT_AMOUNT_TOO_HIGH`, `tenderedCents` ≤ 10 000 000) y ADR-006. En Etapa 2/3: RS-23.

## SEC-007: Acciones críticas del encargado sin reconfirmación en dispositivos compartidos
- Severidad: media
- Ubicación: docs/historias/HU-04-cobrar-y-cerrar-pedido.md:25-32; docs/historias/HU-07-gestionar-personal.md:10-14; docs/arquitectura.md:360-362
- Descripción: durante los 15 min de inactividad de una sesión de encargado abierta en una tablet compartida, cualquiera puede crear un encargado nuevo, restablecer PIN o anular cobros (T-05). Son las acciones que permiten tomar el control o sacar efectivo.
- Responsable: product-owner (criterios), software-engineer (reutilizar el mecanismo de `managerApproval` como `confirmPin`), ux-designer (diálogo de PIN)
- Cómo corregir: exigir el PIN del encargado que actúa en: anular cobro, alta de usuario, cambio de rol, desactivar/activar, restablecer PIN y desbloquear. Redacción para el PO: **HU-04, añadir en Anulación:** "Dado un encargado que confirma una anulación, entonces debe introducir su PIN; si es incorrecto no se anula y el fallo cuenta para su bloqueo (HU-01)." **HU-07, añadir en No funcionales:** "Seguridad: crear un usuario, cambiar su rol, desactivarlo o activarlo, restablecer su PIN o desbloquearlo exige que el encargado introduzca su PIN en ese momento."
- Cómo verificar: RS-16.
- Estado: verificado (documentos, 1.4b). HU-04/CA-F23, HU-07/CA-N04 (cambiar solo el nombre no lo exige: aceptado, ver `docs/permisos.md` §3.2) y HU-06/CA-F15 (el encargado con sesión propia no reconfirma en HU-06); `docs/arquitectura.md` §5 y §5.1 (`confirmPin`, `403 PIN_CONFIRMATION_REQUIRED/INVALID`, mismo contador). Para HU-09 no se exige (§6.3). En Etapa 2/3: RS-16. Relacionado: SEC-017 (redacción de `confirmPin` en logs).

## SEC-008: Riesgo de fraude de caja sin visibilidad por usuario
- Severidad: baja
- Ubicación: docs/historias/HU-08-resumen-ventas-del-dia.md (criterio 1); docs/historias/HU-06-modificar-cancelar-pedido.md (cancelación de "Pendiente" sin autorización)
- Descripción: un camarero puede cobrar en efectivo sin registrar y cancelar el pedido "Pendiente" sin autorización (T-23). La auditoría lo registra, pero el resumen solo muestra totales, así que el patrón no se ve.
- Responsable: product-owner
- Cómo corregir: **HU-08, añadir en Funcionales:** "Dado el resumen del día, entonces muestra el número e importe de pedidos cancelados y de cobros anulados agrupados por usuario que los realizó (y, si lo hubo, encargado que autorizó)."
- Cómo verificar: revisión de la historia; en Etapa 3, test del resumen.
- Estado: verificado (historia, 1.4b). HU-08/CA-F13 (desglose por usuario y encargado que autorizó) y CA-F14 (las filas suman los totales). Falta el reflejo en el wireframe P-11 (tarea 1.2c de ux-designer, no es de seguridad). En Etapa 3: test del resumen.

## SEC-009: Imagen oficial de Caddy con capacidad de fichero frente a `cap-drop=ALL` y `--user`
- Severidad: media
- Ubicación: docs/decisiones/ADR-007-proxy-tls-y-puertos.md:39 ("imagen oficial, sin modificar") y :65-66; docs/arquitectura.md:501
- Descripción: `/usr/bin/caddy` en la imagen oficial lleva `cap_net_bind_service=+ep`. Con el conjunto límite vacío (`cap-drop=ALL`) el kernel puede rechazar el `execve` (`operation not permitted`). La tentación sería añadir `NET_BIND_SERVICE` o quitar `cap-drop`, ambas contrarias a §3.4 (y la capacidad es innecesaria porque escucha en 8080/8443).
- Responsable: infrastructure
- Cómo corregir: probar la imagen con `--user`, `cap-drop=ALL`, `no-new-privileges` y `--read-only`. Si falla, imagen derivada mínima (multi-stage) que copie el binario sin capacidades de fichero (`setcap -r`) a la misma base, por digest; Software Engineer actualiza "sin modificar" en ADR-007.
- Cómo verificar: RS-36 sobre `proxy`: `CapEff` = 0, `getcap /usr/bin/caddy` vacío o arranque correcto sin capacidades.
- Estado: verificado (1.4b, sobre la prueba de Infrastructure). `docs/infraestructura.md` §12.4: en la imagen por digest `getcap` da `cap_net_bind_service=p` (sin bit *effective*), Caddy arranca con `--user`, `cap-drop=ALL`, `no-new-privileges` y `--read-only` con `CapEff` = 0. `compose.test.yaml` aplica ese endurecimiento a `proxy` sin `cap_add`. ADR-007 "sin modificar" se mantiene. Repetir RS-36 sobre `proxy` en TESTING/DEMO y cada vez que cambie el digest.

## SEC-010: Forma de inyección de secretos y separación por contenedor
- Severidad: media
- Ubicación: docs/arquitectura.md:506-510
- Descripción: no se especifica que los secretos se monten como fichero; con `type=env` quedan visibles en `podman inspect` y en `/proc/*/environ` (T-29). Tampoco se dice qué contenedor recibe qué secreto.
- Responsable: infrastructure
- Cómo corregir: `podman secret` con `type=mount` (ficheros en `/run/secrets/`, modo 0400, propiedad del UID del contenedor); variables `*_FILE` con la ruta. Reparto según `docs/permisos.md` §7.
- Cómo verificar: RS-38.
- Estado: corregido (1.4b). Secretos como fichero en `/run/secrets` con variables `*_FILE`, ninguno en `environment` (comprobado en `compose.dev.yaml`, `compose.test.yaml` y en la configuración resuelta); reparto por servicio igual que `docs/permisos.md` §7. **Pero** el montaje del proyecto en todos los servicios de DEV y en los ejecutores de TESTING expone `.secrets/dev/` completo a cualquier contenedor (anula el reparto): **SEC-018**. Para PROD (Quadlet), el `uid` del secreto debe ser el UID real del contenedor (la imagen final distroless usa 65532 según `docs/permisos.md` §8.1, mientras §5 de infraestructura pone `uid=1000`): alinear al crear `deploy/app/Containerfile`; nunca resolverlo con modo 0444. Pasa a "verificado" con RS-38 en TESTING.
  **[1.4c] Resto corregido en diseño:** el SE fija `USER 1000:1000` numérico y `COPY --chown=1000:1000` en la imagen de `app`/`migrate` (ADR-001, `docs/arquitectura.md` §10 y §15), ejecución `--user 1000:1000` / `User=1000`, y secretos `type=mount,uid=1000,gid=1000,mode=0400` (`docs/infraestructura.md` §5); el desajuste con 65532 desaparece y no se usa 0444. La parte de DEV/TESTING (reparto real por contenedor) queda cubierta con SEC-018 verificado. Estado: **corregido**; pasa a verificado con RS-38 en TESTING cuando exista `deploy/app/Containerfile` (Etapa 2): el proceso de `app` lee su secreto y otro UID no.

## SEC-011: Copias de seguridad y *pepper*
- Severidad: media
- Ubicación: docs/decisiones/ADR-003-base-de-datos.md (consecuencias, `pg_dump` diario); docs/arquitectura.md:307
- Descripción: las copias contienen hashes de PIN, cobros y auditoría. Una copia sin cifrar junto con el *pepper* permite recuperar todos los PIN offline en segundos (10⁴–10⁶ candidatos) (T-30). El volumen `/data` de Caddy (clave de la CA, T-31) también debe copiarse de forma segura. Si se pierde el *pepper*, todos los PIN dejan de valer.
- Responsable: infrastructure
- Cómo corregir: `pg_dump` con rol de solo lectura (`app_backup`), cifrado con clave pública (age/GPG) en el host y clave privada fuera; copia fuera del host; *pepper* custodiado en un sitio distinto de las copias (p. ej. gestor de contraseñas del dueño); prueba de restauración en DEMO.
- Cómo verificar: RS-42.
- Estado: corregido (diseño, 1.4b). `docs/infraestructura.md` §13: rol `app_backup` (creado y comprobado en `10-roles.sh`: `CONNECT`, `USAGE`, `SELECT` por privilegios por defecto, 2 conexiones), `pg_dump` en contenedor efímero endurecido, cifrado con age solo con la clave pública en el host, copia fuera del host, `/data` de Caddy incluido y cifrado, *pepper* custodiado aparte. Pasa a "verificado" con RS-42 (prueba de restauración) en DEMO.

## SEC-012: Borrador en `localStorage` compartido entre usuarios del mismo dispositivo
- Severidad: baja
- Ubicación: docs/decisiones/ADR-002-frontend.md (borrador en `localStorage`); docs/arquitectura.md:478-480
- Descripción: el borrador sobrevive al cierre de sesión; el siguiente usuario del dispositivo podría verlo y enviarlo a su nombre (T-19).
- Responsable: software-engineer
- Cómo corregir: clave del borrador por `userId`; solo se ofrece al mismo usuario; se descarta a las 12 h; no guarda importes calculados (se recalculan).
- Cómo verificar: RS-23b.
- Estado: verificado (documentos, 1.4b). ADR-002 y `docs/arquitectura.md` §7 y §9: clave `draft:<userId>`, solo para el mismo usuario, caduca a las 12 h, sin importes ni PIN. En Etapa 3: RS-23b.

## SEC-013: Entorno DEV expuesto a la red
- Severidad: media
- Ubicación: docs/arquitectura.md:514-516 (DEV con Vite y `api` en `watch`)
- Descripción: si `compose.dev.yaml` publica Vite (5173), la API o PostgreSQL en `0.0.0.0`, cualquiera en la misma red llega al servidor de desarrollo (con CVE conocidas de lectura de ficheros en Vite dev server) y a la BD (T-34).
- Responsable: infrastructure
- Cómo corregir: publicar en `127.0.0.1:<puerto>:<puerto>`; Vite en versión parcheada; contraseñas de DEV distintas de las de cualquier otro entorno.
- Cómo verificar: RS-40.
- Estado: verificado (1.4b). Configuración resuelta de `compose.dev.yaml`: solo `127.0.0.1:3000` y `127.0.0.1:5173`; `db` sin puertos y en red `backend` interna; contraseñas de DEV aleatorias y propias de DEV (`generar-secretos.sh`). La versión parcheada de Vite se comprueba en Etapa 2 con `pnpm audit` (RS-39).

## SEC-014: El generador de PIN de DEV no aplica todas las reglas de PIN
- Severidad: baja
- Ubicación: deploy/dev/generar-secretos.sh:30-41
- Descripción: `random_pin` solo descarta 6 dígitos iguales y 10 secuencias completas; puede generar PIN que la regla de §6.1.2 rechaza (p. ej. con una secuencia de 4 dentro, `381234`, o un bloque repetido, `121212`), y `create-initial-manager` fallaría en DEV de forma intermitente. No hay riesgo de exposición: el PIN es aleatorio y el fichero tiene permisos 0600.
- Responsable: infrastructure
- Cómo corregir: generar el PIN con la función de reglas de `packages/shared` cuando exista (p. ej. un script de Node en la imagen de herramientas) o reintentar hasta que `create-initial-manager` lo acepte; mientras tanto, ampliar el filtro a cualquier subsecuencia de 4 consecutivos y a bloques repetidos.
- Cómo verificar: generar 1 000 PIN con el script y validarlos con la función de reglas: 0 rechazos.
- Estado: verificado (1.4b). Prueba de Cybersecurity del filtro `pin_ok` de `deploy/dev/generar-secretos.sh`: rechaza 111111, 123456, 381234, 987654, 901234, 121212, 123123, 120120, 135135, 112233, 112211, 147258, 159753 y 696969; acepta 739164 y 482915. Coincide con la prueba de 1 000 PIN de Infrastructure. La validación definitiva la hará `create-initial-manager` con la función de `packages/shared`.

## SEC-015: Contraseñas de roles de BD en claro en las sentencias de inicialización
- Severidad: media
- Ubicación: deploy/db/initdb/10-roles.sh:27-28 y :49
- Descripción: `CREATE ROLE … PASSWORD '<valor>'` lleva la contraseña en claro en el texto SQL. Si la sentencia falla (p. ej. el rol ya existe), PostgreSQL la escribe en su log por `log_min_error_statement = error` (valor por defecto), y también con `log_statement = ddl|all`. Leerla desde fichero con `\set` es correcto; el problema es el log del servidor. Faltan además el rol `app_backup` (SEC-011) y los `CONNECTION LIMIT` de `docs/permisos.md` §6.
- Responsable: infrastructure
- Cómo corregir: al inicio de cada bloque `psql` (como superusuario), `SET log_statement = 'none'; SET log_min_error_statement = 'panic';` (solo afecta a esa sesión), o enviar el verificador SCRAM ya calculado en lugar de la contraseña; añadir `app_backup` y los límites de conexión.
- Cómo verificar: forzar el error ejecutando la inicialización dos veces sobre el mismo volumen ("role already exists") y buscar las contraseñas de `.secrets/dev/` en los logs de `db` → 0 coincidencias; `\du` muestra `app_backup` y los límites.
- Estado: verificado (1.4b). `deploy/db/initdb/10-roles.sh`: cada sesión `psql` hace `SET log_statement='none'`, `SET log_min_error_statement='panic'` y `SET log_min_duration_statement=-1` antes de leer las contraseñas con `\set … \`cat\``; `app_backup` y `CONNECTION LIMIT` añadidos; prueba de Infrastructure (error forzado, 0 coincidencias en el log). El texto de esas sentencias puede quedar en `pg_stat_statements`: se abre aparte como **SEC-020**.

---

## SEC-016: El `currentPin` del cambio de PIN propio no está limitado
- Severidad: alta
- Ubicación: docs/arquitectura.md:520 (`POST /auth/pin {currentPin, newPin}`), :658-665 (límite por origen y por sesión: solo "login + aprobaciones + reconfirmaciones"); docs/decisiones/ADR-005-autenticacion-y-autorizacion.md:142-149; docs/seguridad.md §6.1.4 (omisión propia, corregida en 1.4b)
- Descripción: `POST /auth/pin` verifica `currentPin` contra el hash, pero ningún documento dice que sus fallos cuenten para el bloqueo del usuario, el límite por IP o el límite por sesión. Con una sesión abierta y desatendida (T-05; la de encargado vive hasta 12 h porque cada petición cuenta como actividad), se puede probar `currentPin` sin límite: un PIN de 4 dígitos cae en minutos, uno de 6 en horas (unos 16 intentos/s con 4 verificaciones simultáneas). Al acertar, el atacante **cambia el PIN** y se queda con la cuenta (si es de encargado, control total: T-01, T-05). Es la misma fuerza bruta que SEC-001 cerró en el login, por otra puerta.
- Responsable: software-engineer (ADR-005 revisión (b), `docs/arquitectura.md` §5, §5.1 y §7). Developer en Etapa 2.
- Cómo corregir: (1) en ADR-005 (b) y arquitectura §7, cambiar "10 fallos (login + aprobaciones + reconfirmaciones)" por "10 fallos de **cualquier verificación de PIN** (login, aprobaciones, reconfirmaciones y `currentPin` de `POST /auth/pin`)", y "Aprobaciones y reconfirmaciones: … 5 fallos por sesión en 10 min" por "Aprobaciones, reconfirmaciones y cambio de PIN propio: mismo contador del usuario cuyo PIN se verifica; 5 fallos por sesión en 10 min → `429`"; (2) en §5.1, fila `POST /auth/pin`, añadir los errores `403 PIN_INVALID` (genérico), `423` y `429`; (3) añadir: "si la cuenta llega a `locked_manual` por fallos desde una sesión propia (`confirmPin`/`currentPin`), se revocan todas sus sesiones". Recomendado: una sola función `verifyPin(user, pin, ctx)` que aplique límite por IP, límite por sesión, bloqueo y contador, y que sea la única forma de llamar al hasher (así una ruta nueva no se olvida del límite).
- Cómo verificar: Cybersecurity revisa ADR-005 y la arquitectura; en Etapa 2/3, RS-16b.
- Estado: **verificado** (documentos, 1.4c). `docs/arquitectura.md` §5 (aprobaciones, reconfirmación y cambio del PIN provisional por `verifyPin`), §5.1 (`POST /auth/pin` solo con `mustChangePin = true`, si no `403` sin verificar; `403 PIN_INVALID`, `423 LOCKED`, `423 ACCOUNT_LOCKED_MANUAL`, `429`), §7 (función única `verifyPin`, único componente con el hasher; límite por IP de todas las verificaciones; bloqueo sin hash ni conteo; contador del usuario cuyo PIN se verifica; revocación de todas las sesiones al llegar a `locked_manual` por cualquier vía), §13 y §15; ADR-005 revisión (c). Las cuatro propuestas están incorporadas y la revocación se amplió a todo bloqueo indefinido, que se acepta (§6.4). **Ya no bloquea la puerta.** Cambio de coherencia pendiente, no bloqueante: T-20 (opción A, §6.4) en `docs/arquitectura.md` §7 y ADR-005 (software-engineer). Resto aparte: SEC-025 (baja). En Etapa 2/3: RS-16b, RS-16c, RS-16d.

## SEC-017: `confirmPin` falta en las listas de redacción de logs
- Severidad: media
- Ubicación: docs/arquitectura.md:789-790 (redacción obligatoria: `pin`, `currentPin`, `newPin`, `managerApproval.pin`); docs/logging.md §4.1 (línea 236) y §4.3 (líneas 276-281)
- Descripción: `confirmPin` (SEC-007, PIN de 6 dígitos del encargado en anular cobros y Personal) es un campo nuevo de primer nivel del cuerpo y no está en ninguna de las listas de redacción de pino ni en la de "prohibido en cualquier log". La primera barrera (no registrar cuerpos) lo cubre, pero la redacción existe precisamente para cuando esa barrera falla (errores de validación, logs de depuración del Developer). Si se registra, es el PIN del encargado en claro (T-26).
- Responsable: monitoring (`docs/logging.md` §4.1 y §4.3) y software-engineer (`docs/arquitectura.md` §11)
- Cómo corregir: añadir `confirmPin` y `*.confirmPin` a la lista de §4.3 y a la tabla de §4.1 de `docs/logging.md`, y `confirmPin` a la lista de §11 de la arquitectura. Regla general recomendada: redactar cualquier clave que case con `/pin/i`.
- Cómo verificar: RS-29 (el PIN centinela se envía también como `confirmPin` en anular cobro, alta, reset y desbloqueo) y RS-31.
- Estado: **verificado** (documentos, 1.4c). `docs/logging.md` §4.1 (prohibido el valor de cualquier clave que case con `/pin/i`, `confirmPin` incluido), §4.3 (a) (`confirmPin` y `*.confirmPin` en las rutas fijas, cookie `__Host-sid`) y (b) (función recursiva por nombre de clave `/pin/i`, a cualquier profundidad, también en `err` y en los *bindings*, sin excepciones; `provisional_credential` en lugar de `must_change_pin`), §4.5 (centinela también como `confirmPin`, test unitario de la regla); `docs/arquitectura.md` §11 con la misma regla y remisión a logging. En Etapa 2/3: RS-29, RS-31 y el test de `docs/logging.md` §4.5.

## SEC-018: El montaje del proyecto expone `.secrets/` y permite escribir en `.git/` y `.claude/` desde contenedores
- Severidad: media
- Ubicación: compose.dev.yaml:142 (`api`, `./:/workspace:ro`), :175 (`web`, `rw`), :206 (`deps`, `rw`), :227 (`migrate`), :256 (`init-manager`); compose.test.yaml:58 (ejecutores, `ro`); docs/infraestructura.md §3 y §7 (excepción 2)
- Descripción: con `keep-id`, el UID 1000 del contenedor es el usuario del host (UID 1000, dueño de `.secrets/dev/*` en modo 0600), así que **todo** contenedor que monta `./` puede leer **todos** los secretos de DEV, incluida la contraseña de `postgres`: el reparto por contenedor de SEC-010 no se cumple en la práctica. Además `web` y `deps` montan el árbol en escritura: código de terceros (dependencias npm con *scripts* permitidos, plugins de Vite) puede escribir en `.git/hooks/` o en `.claude/settings.json` (hooks del agente), que luego **se ejecutan en el host** fuera del contenedor al hacer `git commit` o al abrir una sesión: es una salida del aislamiento del contenedor hacia la cuenta del usuario. `deps` tiene salida a internet y `api`/`web` también (red `frontend`), por lo que podrían exfiltrar lo leído. Impacto limitado a la máquina de desarrollo y a secretos de DEV (T-20, X8), de ahí media.
- Responsable: infrastructure
- Cómo corregir: en los servicios que montan `./`, ocultar lo que no necesitan, p. ej. añadir después del montaje del proyecto `- type: tmpfs, target: /workspace/.secrets, tmpfs: {size: 1k, mode: 0}` (o un volumen vacío en `ro`), y montar `./.git` y `./.claude` en `ro` encima (`- ./.git:/workspace/.git:ro`, `- ./.claude:/workspace/.claude:ro`) en `web` y `deps`; en los ejecutores de TESTING, ocultar `.secrets/` igual. Alternativa más limpia: montar solo lo necesario (`apps/`, `packages/`, `tests/`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig*.json`, `node_modules/`). Documentarlo en `docs/infraestructura.md` §3 y §7.
- Cómo verificar: RS-45.
- Estado: **verificado** (DEV y `runner-unit`, 1.4c). Configuración: los 11 servicios que montan `./` (DEV: `api`, `web`, `deps`, `migrate`, `init-manager`; TESTING: `runner-unit`, `runner-integration`, `runner-security`, `zap`, `runner-e2e`, `runner-perf`) llevan `tmpfs /workspace/.secrets:ro,nosuid,nodev,noexec,size=4k,mode=0000,notmpcopyup`; `web` y `deps` vuelven a montar en `ro` `.git`, `.claude`, `CLAUDE.md`, `deploy/`, `docs/`, `tools/`, `.gitignore` y los dos compose; los ejecutores de TESTING montan el proyecto en `ro`. `notmpcopyup` es **obligatorio** (RS-45): sin él Podman copia al tmpfs el contenido de `.secrets/` que hay debajo y el arreglo anularía su propio objetivo; Infrastructure lo comprobó (la copia falló por falta de espacio). Prueba real de Infrastructure (`docs/infraestructura.md` §15) con control negativo, que acepto como verificación de RS-45. Pendiente: repetir RS-45 con las imágenes reales de Playwright/k6/ZAP y con Vite y `pnpm install` reales (Etapa 2). Resto detectado: **SEC-023** (`tests/` sigue escribible desde `web`/`deps` y `tests/run.sh` se ejecuta en el host).

## SEC-019: En la topología B el límite "por dispositivo" bloquea a todo el local
- Severidad: media
- Ubicación: docs/infraestructura.md:453-456 (§12.1, topología B); docs/historias/HU-01-iniciar-sesion-por-rol.md CA-F11; docs/historias/README.md supuesto 11
- Descripción: el límite de 10 fallos/10 min va por IP (§6.1.5). En la topología A cada tablet tiene su IP y "dispositivo" = IP. En la B (VM con lista blanca de la IP pública del local, o WireGuard de sitio a sitio desde el router) todos los dispositivos llegan a la VM con **la misma IP**: 10 fallos sumados de todo el personal en 10 min, o un empleado que lo provoque a propósito, dejan a todo el local 10 min sin poder iniciar sesión ni autorizar (T-35 ampliado a todo el local). Además el criterio CA-F11 ("desde este dispositivo") no se cumpliría tal como está redactado.
- Responsable: infrastructure (§12.1)
- Cómo corregir: en §12.1 B, preferir **WireGuard con un *peer* por dispositivo** (cada tablet con su IP de túnel, que `app` ve como IP de origen); si se usa lista blanca de IP pública sin túnel por dispositivo, documentar que el límite por IP es de todo el local y que eso exige la aprobación expresa del humano en la Etapa 5, con la alerta de `429` ya prevista en §6.1.7. No hace falta cambiar las historias mientras la topología A sea la elegida.
- Cómo verificar: en DEMO/PROD con la topología B, dos dispositivos aparecen con IP distinta en los logs de `app` (RS-06).
- Estado: **corregido** (diseño, 1.4c). `docs/infraestructura.md` §12.1: B1 (WireGuard con un *peer* y una `/32` por dispositivo, `AllowedIPs` limitado, 80/443 solo desde `wg0`, IP de túnel = dispositivo) es la única variante propuesta para PROD en VM; B2 (IP compartida) solo con aprobación expresa del humano en la Etapa 5, registrada en `docs/estado.md`. Condición añadida: en B1, la clave privada de cada dispositivo no sale de él, y un dispositivo perdido se revoca quitando su *peer* (ya previsto). No aplica si PROD usa la topología A. Pasa a verificado con RS-06 en DEMO/PROD si se elige B.

## SEC-020: Las sentencias `CREATE ROLE … PASSWORD` pueden quedar en `pg_stat_statements`
- Severidad: media
- Ubicación: deploy/db/initdb/10-roles.sh:29-56 y :60-70; compose.dev.yaml:90 y compose.test.yaml:103 (`shared_preload_libraries=pg_stat_statements`)
- Descripción: el contenedor `db` arranca también el servidor temporal de inicialización con `pg_stat_statements` precargado, y el seguimiento de sentencias de utilidad (`pg_stat_statements.track_utility`) está activo por defecto. Los `SET log_*` de SEC-015 evitan el log, pero no `pg_stat_statements`: el texto de `CREATE ROLE … PASSWORD '<valor>'` puede quedar guardado (en memoria y en el fichero de estadísticas que se conserva entre reinicios), visible para `postgres` y para el rol `monitoring` (`pg_monitor` incluye `pg_read_all_stats`, que ve el texto de todas las consultas) y, a través de él, para `postgres_exporter`. Sin verificar en ejecución (no se levantan contenedores en esta tarea).
- Responsable: infrastructure
- Cómo corregir: añadir `SET pg_stat_statements.track_utility = off;` junto a los otros `SET` al inicio de cada bloque `psql` de `10-roles.sh` (requiere superusuario, que es quien lo ejecuta), o enviar el verificador SCRAM ya calculado en lugar de la contraseña. Ejecutar `SELECT pg_stat_statements_reset();` al final de la inicialización como medida adicional.
- Cómo verificar: RS-44 sobre un volumen de DEV nuevo.
- Estado: **verificado** (1.4c). `deploy/db/initdb/10-roles.sh`: `SET pg_stat_statements.track_utility = off` junto a los `SET log_*` en los dos bloques que llevan `PASSWORD` (antes de leer las contraseñas) y `SELECT pg_stat_statements_reset()` al final. Prueba de Infrastructure con RS-44 en BD efímera: 4 sentencias con contraseña antes, 0 después (también tras reiniciar `db`) y 0 en logs. Resto conocido: el volumen DEV `mi-app-dev_pgdata`, creado antes del arreglo, conserva 3 sentencias con contraseña en `pg_stat_statements`, solo visibles para `postgres` (en DEV no existe el rol `monitoring`); riesgo bajo (secretos solo de DEV). Recomendado: con aprobación del humano (borra datos de DEV), recrear el volumen (`down -v`) o ejecutar `SELECT pg_stat_statements_reset()` como `postgres`, y regenerar las contraseñas de DEV si se quiere descartar cualquier exposición.

## SEC-021: Nombre de la cookie de sesión sin prefijo `__Host-`
- Severidad: baja
- Ubicación: docs/decisiones/ADR-005-autenticacion-y-autorizacion.md:58 (cookie `sid`); docs/arquitectura.md:637 (sin nombre)
- Descripción: RS-10 exige `__Host-sid`. El prefijo obliga al navegador a aceptar la cookie solo con `Secure`, `Path=/` y sin `Domain`, de modo que otro servicio de la red o un subdominio no puede fijarla ni pisarla (T-07). ADR-005 la llama `sid` y la arquitectura no da nombre. Nota: en DEV (`http://localhost`) Chromium y Firefox aceptan cookies `Secure` y `__Host-` en `localhost`.
- Responsable: software-engineer
- Cómo corregir: en ADR-005 y arquitectura §7, cookie `__Host-sid` con `HttpOnly; Secure; SameSite=Strict; Path=/`, sin `Domain` ni `Max-Age`/`Expires`.
- Cómo verificar: RS-10.
- Estado: **verificado** (documentos, 1.4c). ADR-005 (sección "Decisión" y revisión (c)) y `docs/arquitectura.md` §7: `__Host-sid` con `HttpOnly; Secure; SameSite=Strict; Path=/`, sin `Domain` ni `Max-Age`/`Expires`; `docs/logging.md` §4.1 y §4.3 redactan `__Host-sid`. En Etapa 2/3: RS-10.

## SEC-022: El camarero puede leer cobros y tickets de cualquier día
- Severidad: baja
- Ubicación: docs/arquitectura.md:542-543 (`GET /payments/:id` y `/ticket`, W y M, sin restricción de fecha)
- Descripción: HU-04 solo da al camarero la vista "Cobrados hoy" (CA-F20..F22). Las rutas por id no limitan la fecha, así que un camarero con un id (los genera el cliente, ADR-008, y aparecen en "Cobrados hoy" día a día) puede volver a leer cobros antiguos, importes y `customerRef`. Es poco riesgo, pero no es mínimo privilegio.
- Responsable: software-engineer
- Cómo corregir: en §5.1, para el rol W, `GET /payments/:id` y `GET /payments/:id/ticket` solo devuelven cobros con fecha de negocio de hoy (`404` si no); M sin restricción. Recogido en `docs/permisos.md` §3.2.
- Cómo verificar: RS-46.
- Estado: **verificado** (documentos, 1.4c). `docs/arquitectura.md` §5.1 (`GET /payments/:id` y `/ticket`: W solo si `payments.business_date = businessDate(clock.now())`, si no `404 NOT_FOUND` igual que un id inexistente; M cualquier día) y §7 (matriz); `docs/permisos.md` §3.2. En Etapa 2/3: RS-46.

## SEC-023: `tests/run.sh` y otros ficheros que se ejecutan en el host siguen siendo escribibles desde `web` y `deps`
- Severidad: media
- Ubicación: compose.dev.yaml:207 (`web`, `./:/workspace:rw`) y :248 (`deps`, ídem); docs/infraestructura.md §7, excepción 2 ("riesgo residual aceptado: … `tests/` sigue siendo escribible"); docs/testing.md:150 y :871 (`tests/run.sh`, punto de entrada que se ejecuta en el host)
- Descripción: SEC-018 vuelve a montar en `ro` lo que se ejecuta en el host (`.git`, `.claude`, `deploy/`, `tools/`…), pero `tests/` queda escribible desde `web` y `deps`, y `tests/run.sh` será el punto de entrada de todas las suites que el Orquestador y Testing ejecutan **en el host** (`docs/testing.md` §7.3). Código de terceros dentro de `deps` (scripts de instalación permitidos) o de `web` (plugins de Vite) puede modificar `tests/run.sh` y conseguir ejecución en la cuenta del usuario fuera del contenedor, que es la misma salida del aislamiento que cerró SEC-018 para `.git/hooks`. El argumento de la excepción ("no se ejecuta solo en el host y se ve en `git diff`") no vale para `run.sh`: se ejecuta antes de que nadie mire el diff, y un cambio en un fichero que se modifica a menudo pasa desapercibido. Lo mismo vale para cualquier fichero nuevo en la raíz que una herramienta del host ejecute al abrir el directorio (p. ej. `.envrc` de direnv, `.vscode/tasks.json`). Impacto limitado a la máquina de desarrollo (amenaza T-20 de §5.2, actor X8), de ahí media.
- Responsable: infrastructure (compose y `docs/infraestructura.md` §7) y testing (ubicación de `run.sh`)
- Cómo corregir: (1) que todo script que se ejecute en el host esté en una ruta que `web`/`deps` montan en `ro`: mover el punto de entrada a `tools/` (p. ej. `tools/run-tests.sh`, ya en `ro`), o montar `./tests/run.sh:/workspace/tests/run.sh:ro` en `web` y `deps` en cuanto exista el fichero (si no existe, `podman-compose` crearía un directorio); (2) añadir a `docs/infraestructura.md` §7 la regla "ningún fichero que se ejecute en el host queda escribible desde un contenedor" y aplicarla a cada script nuevo; (3) recomendado: montar en `web`/`deps` solo lo que necesitan (`apps/`, `packages/`, `tests/` salvo sus scripts de host, `node_modules/`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig*.json`) en lugar de `./` entero, para que un fichero nuevo en la raíz no quede escribible por defecto.
- Cómo verificar: RS-45 ampliado (`touch /workspace/tests/run.sh` o el script que se elija → error en `web` y `deps`).
- Estado: abierto (media, no bloquea; debe estar corregido antes de crear `tests/run.sh` en la Etapa 2)
- Corrección 1.7c (infrastructure, commit aebd6ef): se aplica la opción (3), más estricta que (1): `web` y `deps` montan `./:/workspace:ro` y solo vuelven a montar en `rw` la lista de permitidos `apps/`, `packages/` y `node_modules/` (`x-rw-apps`, `x-rw-packages`, `x-rw-node-modules`, compose.dev.yaml:63-65, :207-210, :244-247); `api`, `migrate` e `init-manager` siguen en `ro` sin excepciones; `deploy/dev/levantar.sh:35-36` crea `.secrets` (0700) y los tres directorios antes de cualquier `run`/`up`. Regla (2) en `docs/infraestructura.md` §7.1 con los requisitos de `tests/run.sh` (crear `.secrets`, no ejecutar nada de rutas `rw`, vivir fuera de ellas, solo `podman-compose`) y prohibición de añadir a la lista la raíz, `tests/` entero o rutas con scripts del host. En TESTING (`compose.test.yaml:68-70`) solo `tests/results` y `tests/screenshots` son `rw`: `tests/run.sh` tampoco es escribible allí.
- Verificación 1.7l (2026-11-24, Cybersecurity, prueba propia no destructiva): Podman 5.7.0 rootless (`rootless true`, cgroups v2), `podman-compose` 1.5.0, `DBUS_SESSION_BUS_ADDRESS=unix:path=$XDG_RUNTIME_DIR/bus` (§4.2 de `docs/infraestructura.md`), `apps/`, `packages/` y `node_modules/` creados antes con `mkdir -p` como hace `levantar.sh`. Con `podman-compose -f compose.dev.yaml --profile setup run --rm --no-deps --entrypoint sh <web|deps> /probe.sh` (script de prueba montado `ro` desde el scratchpad), proceso `uid=1000(node)`, `CapEff 0`, `NoNewPrivs 1`, en **los dos** servicios:
  - `touch` en `/workspace/tests/run.sh`, `/workspace/CLAUDE.md`, `/workspace/.git/hooks/x`, `/workspace/.envrc`, `/workspace/.claude/x`, `/workspace/tools/x`, `/workspace/deploy/x`, `/workspace/compose.dev.yaml`, `/workspace/tests/results/x`, `/workspace/src/x` y un fichero nuevo de la raíz → `Read-only file system` (11/11).
  - `touch` + `rm` en `/workspace/apps/`, `/workspace/packages/` y `/workspace/node_modules/` → correcto (3/3).
  - `/workspace/.secrets` → `Permission denied`.
  - `/proc/mounts`: `/workspace ro`, `/workspace/.secrets ro`, `/workspace/{apps,packages,node_modules} rw`; nada más en `rw` bajo `/workspace`.
  - `ln -s ../tests/run.sh /workspace/apps/x` → correcto; en el host aparece el enlace `apps/x -> ../tests/run.sh` (origen de SEC-026).
  - Limpieza: enlace borrado y `apps/`, `packages/`, `node_modules/` eliminados con `rmdir` (estaban vacíos); `tests/` sin cambios; ningún contenedor huérfano (`podman ps -a` solo `mi-app-dev_db_1`, detenido). El aviso `rootless netns: kill network process: permission denied` al borrar el contenedor es la incidencia de entorno ya descrita en §15, sin efecto.
  - Coincide con la prueba de Infrastructure (§15). Diseño: es una lista de permitidos, de modo que un fichero nuevo en la raíz (`.envrc`, `.vscode/`) queda en `ro` sin acordarse de él, que era el punto (3) recomendado.
- Riesgo residual aceptado (valoración 1.7l): `web`/`deps` pueden modificar el código de `apps/`, `packages/` y `node_modules/`. Es aceptable porque (a) hoy esas rutas no existen y no contienen nada que el host ejecute; (b) según `docs/infraestructura.md` §3 y §7.1 y `docs/testing.md` §7.3/§7.4, todo `pnpm`/`node`/Vite/Vitest corre en contenedores, `node_modules/` tiene binarios musl y el host solo ejecuta `tests/run.sh`, `tests/containers/` (TX-CONT-01), `deploy/`, `tools/` y `.claude/hooks/`, todo fuera de la lista; (c) un cambio malicioso en `apps/`/`packages/` solo corre dentro de un contenedor endurecido hasta que alguien lo revisa en `git diff` y, desde TESTING, en la imagen final construida desde el árbol (ese paso sí lleva el código a DEMO/PROD: lo cubren la revisión de `git diff` en cada historia y RS-39). Lo que **no** cubre la regla y se registra aparte: enlaces simbólicos plantados en la lista y herramientas del host que leen o ejecutan `node_modules/` (extensiones del IDE): SEC-026 (baja).
- Estado: **verificado** (DEV, 1.7l). En la Etapa 2: repetir RS-45 con `pnpm install` y Vite reales (si piden escribir fuera de la lista se decide con Cybersecurity, sin ampliar a la raíz ni a `tests/`) y comprobar que `tests/run.sh` cumple los requisitos 1–4 de `docs/infraestructura.md` §7.1.

## SEC-024: Alertas de seguridad que no cumplen §6.1.7
- Severidad: media
- Ubicación: docs/logging.md §7.4 (línea 950, `LockoutSpray` en 15 min; falta alerta de bloqueo de encargado), §6.3 (línea 604, `auth_lockouts_total` sin etiqueta de rol), §7.4 (línea 949, `AccountLockedManual` con `increase()`); docs/historias/HU-01-iniciar-sesion-por-rol.md CA-N05
- Descripción: (a) §6.1.7 y HU-01/CA-N05 exigen una alerta en **cualquier bloqueo de una cuenta de encargado** (el objetivo valioso de T-01); no hay ninguna regla que la produzca y la métrica `auth_lockouts_total` no permite distinguir el rol. Hoy el primer bloqueo de 5 min del encargado solo avisaría si se repite en 24 h. (b) `LockoutSpray` usa una ventana de 15 min y §6.1.7 pide 1 h: con el límite de 10 fallos/10 min por IP, bloquear a 3 usuarios desde un mismo dispositivo exige 15 fallos y más de 10 min, de modo que un rociado desde una sola tablet puede no caer nunca en la ventana. (c) Las alertas con `increase(contador[5m]) > 0` no saltan con el **primer** incremento de una serie que no existía (Prometheus no ve el paso de "sin serie" a 1); tras cada reinicio de `app` el primer bloqueo indefinido, el primer `429` por sesión o el primer rechazo CSRF pasarían sin alerta.
- Responsable: monitoring (`docs/logging.md` §6.3 y §7.4); developer en la Etapa 2 (inicializar las series)
- Cómo corregir: (a) añadir la etiqueta `target_role` (`waiter` \| `kitchen` \| `manager`) a `auth_lockouts_total` y la alerta `ManagerLocked`: `increase(auth_lockouts_total{target_role="manager"}[5m]) > 0`, crítica **[24h]** (o la misma condición en Loki sobre `auth.account.locked` con `target_role`); (b) `LockoutSpray` con ventana de **1 h**; (c) en `docs/logging.md` §6, regla: todos los contadores usados en alertas se crean con valor 0 al arrancar `app` para cada combinación de etiquetas de enum (`auth_lockouts_total`, `auth_verifications_total`, `csrf_rejected_total`, `staff_privilege_changes_total`, `auth_pin_change_rejected_total`), y Testing lo comprueba leyendo `/metrics` tras el arranque. Además, ajustar el texto de `SessionPinProbing` al dictamen T-20 (solo `purpose="approval"`).
- Cómo verificar: RS-47.
- Verificación 1.7j (2026-11-24, `docs/logging.md` revisión 1.7b, commit 5df5a84):
  (a) `target_role` (`waiter` \| `kitchen` \| `manager`) en `auth.account.locked` (§3.2) y en `auth_lockouts_total` (§6.3); `new_role` en `staff_privilege_changes_total` (con `none` en `deactivated`/`pin_reset`), coherente con la regla `PrivilegeChange`; alerta `ManagerLocked` = `increase(auth_lockouts_total{target_role="manager"}[5m]) > 0`, cualquier `kind`, crítica, incluida en la lista [24h] de §7.0 y en §7.4: **cumple**. (b) `LockoutSpray` con ventana de **1 h**: **cumple**. (c) regla "series a 0 desde el arranque" en §6.3 con RS-47, para cada combinación de etiquetas de enum de `auth_lockouts_total`, `auth_verifications_total`, `auth_login_attempts_total`, `csrf_rejected_total`, `authz_denied_total`, `staff_privilege_changes_total`, `auth_pin_change_rejected_total` y `payments_voided_total` (más de lo pedido), responsable developer en la Etapa 2 y comprobación de Testing en `/metrics`: **cumple**. T-20: `auth.verify.rate_limited` y `SessionPinProbing` limitan `scope = session` a `purpose = "approval"` y remiten `confirm`/`change` a `LockoutRepeated`/`AccountLockedManual`, coherente con `docs/arquitectura.md` (reconfirmación y `POST /auth/pin` sin límite por sesión): **cumple**. La cardinalidad añadida es acotada (`auth_lockouts_total` 2 × 4 × 3 = 24 series).
- Estado: verificado (en diseño, 1.7j). La implementación se comprueba con RS-47 (I en la Etapa 2; D en DEMO)

## SEC-025: Diferencia de tiempo que revela que el encargado elegido está bloqueado
- Severidad: baja
- Ubicación: docs/arquitectura.md:705-710 (`verifyPin` paso 3: cuenta bloqueada → sin calcular el hash; en `managerApproval`, error genérico) y :504-507; ADR-005 revisión (c), paso 3
- Descripción: en una aprobación de HU-06 con el encargado bloqueado, `verifyPin` responde el error genérico `403 MANAGER_APPROVAL_INVALID` sin calcular el hash (~0 ms), mientras que un PIN erróneo tarda 100–250 ms. El camarero puede saber así si el encargado está bloqueado y cuándo termina el bloqueo, aunque HU-06/CA-F18 y la arquitectura quieren no revelarlo. El impacto es bajo (lo sabría quien provocó el bloqueo y el contador no se reinicia), pero contradice el propio diseño y RS-07. No se debe resolver calculando un hash real durante el bloqueo, porque esos intentos no cuentan y se convertirían en una forma de gastar CPU sin límite (T-36).
- Responsable: software-engineer (`docs/arquitectura.md` §7 y ADR-005) y developer (Etapa 2)
- Cómo corregir: para `purpose = "approval"` con la cuenta bloqueada, igualar el tiempo de respuesta sin calcular el hash (esperar hasta la duración típica de una verificación, medida al arrancar, más una variación aleatoria pequeña), y lo mismo en el caso "acierto + encargado desactivado o con PIN provisional" si su tiempo difiere. Para `confirm`/`change` no hace falta: el `423` ya es explícito para el titular.
- Cómo verificar: RS-16d.
- Estado: abierto (baja, no bloquea)

## SEC-026: Enlaces simbólicos y herramientas del host sobre la lista de permitidos en escritura
- Severidad: baja
- Ubicación: compose.dev.yaml:63-65 (`apps/`, `packages/`, `node_modules/` en `rw` en `web` y `deps`); docs/infraestructura.md §7.1 (viñeta "Toda ruta en `rw` es solo datos…") y §3 (`node_modules/` en el host "para que el IDE vea los tipos")
- Descripción: comprobado en 1.7l: desde `web` o `deps` se puede crear en `apps/` un enlace simbólico a cualquier ruta (p. ej. `apps/x -> ../tests/run.sh` o a `~/.ssh/…` con ruta absoluta del host); dentro del contenedor no sirve de nada, pero en el host se resuelve contra el sistema de ficheros del usuario. Si después una herramienta del host **escribe** en esa ruta (el Developer o Testing editando un fichero de `apps/` con sus herramientas, un formateador del IDE al guardar), el contenido acaba en el destino (`tests/run.sh`, un hook de `.git`, `~/.bashrc`); si la **lee** (un agente que abre el fichero), el contenido de un fichero privado del host entra en el contexto del agente y podría acabar copiado en el repositorio. Segundo vector del mismo origen: la regla de §7.1 dice que el host no ejecuta nada de la lista, pero solo nombra `vite.config`/`vitest.config`; las extensiones habituales del IDE (ESLint, Prettier, Vitest, TypeScript con "versión del workspace" o `plugins` de un `apps/*/tsconfig.json`) cargan y ejecutan código de `node_modules/` **en el host**, y `node_modules/` lo escribe `deps` con scripts de terceros. El control del contenido por el atacante es parcial y hace falta una acción posterior en el host, de ahí baja.
- Responsable: infrastructure (`docs/infraestructura.md` §7.1) y testing/developer (comprobación en `tests/run.sh` o en la revisión de cada historia, Etapa 2)
- Cómo corregir: (1) en §7.1, ampliar la regla: "en el host no se usan extensiones del IDE ni herramientas que carguen código de `node_modules/` o de `apps/`/`packages/` (ESLint, Prettier, Vitest, TypeScript del workspace, plugins de `tsconfig`); si se quieren, se ejecutan en un contenedor o con el IDE apuntando a un contenedor"; (2) comprobación de enlaces: antes de editar en el host y al inicio de `tests/run.sh`, `find apps packages \( -name node_modules -type d \) -prune -o -type l -print` debe salir vacío (corregido en 1.7q: el `-path '*/node_modules' -prune` propuesto en 1.7l poda también un **enlace** llamado `node_modules` y lo oculta; hueco detectado por Infrastructure) y ningún destino de `find apps packages node_modules -type l -exec realpath -m -- {} +` debe salir de `apps/`, `packages/` o `node_modules/` (o solo enlaces revisados y versionados, visibles en `git diff` con modo `120000`); si hay alguno no esperado, el script se detiene; (3) recomendado: que los agentes del host no sigan enlaces simbólicos al leer/escribir en `apps/`/`packages/` (comprobar con `test -L` antes de escribir).
- Cómo verificar: RS-45 ampliado (enlace plantado desde `deps` en `apps/` → `tests/run.sh` se detiene con error y no lo sigue); revisión de `docs/infraestructura.md` §7.1.
- Estado: **corregido** (diseño y DEV, 1.7q). Pasa a "verificado" cuando exista `tests/run.sh` con el requisito 5 de `docs/infraestructura.md` §7.1 y RS-45 se repita con el enlace plantado desde `deps` real (Etapa 2, testing/developer). No bloquea.
- Verificación 1.7q (Cybersecurity):
  - `docs/infraestructura.md` §7.1: regla del IDE y herramientas del host (modo restringido, IDE en contenedor revisado por Cybersecurity, TypeScript solo del IDE y sin `plugins`, sin tareas automáticas ni formateo al guardar con herramientas del workspace) → cubre el punto (1). Regla de enlaces (ninguno en `apps/`/`packages/` fuera de los `node_modules/` reales; ninguno de la lista resuelve fuera de ella; excepciones explícitas, nunca comodín; inspeccionar con `ls -l` y borrar con `rm` sin `-r`) y requisito 5 de `tests/run.sh` (antes de cualquier `up`/`run` y otra vez antes de leer resultados; también `tests/results`/`tests/screenshots` en TESTING) → cubre el punto (2). Regla `test -L` en cada componente del camino antes de escribir y `realpath` antes de leer de `node_modules/` → cubre el punto (3). §4 (orden de `levantar.sh`) y §15 (pruebas) coherentes.
  - Corrección del comando: acepto el cambio de Infrastructure. `-name node_modules -type d` solo poda directorios reales; `find` no sigue enlaces (sin `-L`), así que un enlace llamado `node_modules` no se poda y aparece. La comprobación (b) con `realpath -m` cubre lo que la poda deja fuera (enlaces de pnpm dentro de los `node_modules/`). La comparación con `case "$R"/apps/*` exige la barra, así que `apps-evil/` no pasa; como `realpath` devuelve una ruta canónica (sin `..` ni enlaces), cualquier destino que empiece por `$R/apps/` está de verdad dentro.
  - `comprobar_enlaces` (`deploy/dev/levantar.sh`): el script corre con `set -eu`, desde la raíz (`cd "$ROOT"`), y la llama tras `mkdir -p apps packages node_modules` y antes de construir o arrancar nada, y otra vez justo después de `deps`. `deploy/` está en `ro` para `web`/`deps`, así que no pueden alterar la comprobación. Prueba propia no destructiva en el scratchpad (función extraída tal cual del script, `/bin/sh` + GNU find, árboles de prueba fuera del repo; nada creado en el proyecto): **se detiene** (salida 1) con `apps/x -> ../tests/run.sh`; con un enlace llamado `packages/p/node_modules -> ../../tests`; con `node_modules/evil -> /etc/passwd`; con un enlace dentro de un `node_modules/` real de paquete que sale (`packages/p/node_modules/t -> ../../../tests`); con un prefijo engañoso (`node_modules/pe -> ../apps-evil`); con destinos con salto de línea, incluido uno construido para que su segunda línea empiece por `$R/apps/` (se rechaza entero en el camino lento); con un bucle de enlaces (`realpath` falla); con un nombre que empieza por `-`; y con una carpeta en modo `000` dentro de `apps/` (`find` falla y `set -e` corta: falla cerrado, aunque solo con el mensaje de `find` y no con el de SEC-026, detalle cosmético). **Pasa** con la lista vacía y con enlaces tipo pnpm (`apps/web/node_modules/a -> ../../../node_modules/.pnpm/a`, `node_modules/p -> ../packages/p`).
  - Vector adicional comprobado: **enlaces duros**. En Podman rootless con el montaje del proyecto en `ro` y `apps/` en `rw` (mismos flags que `web`/`deps`, en el scratchpad), `ln /workspace/tests/run.sh /workspace/apps/h` → `Cross-device link`: el kernel no permite enlaces duros entre montajes distintos aunque sea el mismo sistema de ficheros, así que la lista de permitidos no puede enlazar ficheros del resto del árbol. `mknod` → `Operation not permitted`. `mkfifo` sí funciona: una FIFO en `apps/` solo puede colgar una herramienta del host que la lea (denegación de servicio local, sin fuga ni escritura); no lo registro como hallazgo. Recomendación opcional para `tests/run.sh`: añadir `-type p` a la comprobación (a).
- Riesgo residual aceptado (valoración 1.7q): la comprobación es una foto. `web` sigue corriendo tras `levantar.sh` y puede crear enlaces después, y entre la comprobación del host y la escritura hay una ventana (TOCTOU). Lo acepto como baja porque (a) explotarlo exige que el código de `web` (Vite y dependencias que se revisan en `git diff` y RS-39) ya esté comprometido; (b) hace falta además una acción posterior del host sobre ese nombre exacto; (c) los consumidores conocidos del host están cubiertos: `tests/run.sh` repite la comprobación al empezar y antes de leer resultados, los agentes y personas aplican `test -L` en cada componente del camino antes de escribir y `realpath` antes de leer de `node_modules/`, y el IDE no carga código de la lista; (d) no hay alternativa barata mejor: impedir enlaces en un montaje bind `rw` no es posible con Podman sin un sistema de ficheros aparte (p. ej. un volumen con nombre en vez del bind, que quitaría la visibilidad del código en el host). Si en la Etapa 2 algún agente del host escribe de forma automática y repetida en `apps/`/`packages/` (p. ej. un generador de código), se vuelve a valorar.

## SEC-027: `docs/infraestructura.md` §3 describe todavía el montaje anterior a SEC-023
- Severidad: baja
- Ubicación: docs/infraestructura.md:118 (`./` → `/workspace` … `web`, `deps`: rw) y :120 (fila de los montajes `ro` de SEC-018 sobre `.git`, `.claude`, `CLAUDE.md`…)
- Descripción: la tabla de volúmenes de §3 sigue diciendo que `web` y `deps` montan el proyecto en `rw` con una lista de prohibidos en `ro`, que es el diseño de 1.5b. `compose.dev.yaml` y §7/§7.1 ya usan proyecto en `ro` + lista de permitidos. Quien añada un servicio o un montaje copiando §3 puede reintroducir el árbol en `rw`, que es justo lo que corrige SEC-023.
- Responsable: infrastructure
- Cómo corregir: sustituir esas filas por "`./` → `/workspace`: `ro` en los 5 servicios" y "`./apps`, `./packages`, `./node_modules` → mismo sitio en `rw`: solo `web`, `deps` (lista de permitidos, §7.1)".
- Cómo verificar: lectura de §3 frente a `podman-compose -f compose.dev.yaml --profile setup config`.
- Estado: **verificado** (1.7q). §3 dice ahora `./` → `/workspace` en `ro` en los 5 servicios y `./apps`, `./packages`, `./node_modules` en `rw` solo en `web` y `deps` (lista de permitidos), sin la fila antigua de montajes `ro` sobre `.git`, `.claude`…; añade la nota de copiar la tabla y no un montaje `rw` del proyecto entero. Contrastado por mí con `podman-compose -f compose.dev.yaml --profile setup config`: `./:/workspace:ro` en `api`, `web`, `deps`, `migrate` e `init-manager`; los tres `rw` solo en `web` y `deps`; tmpfs de `.secrets` con `notmpcopyup` en los 5.

## SEC-028: La IP fija de `proxy` en `proxy-app` puede estar ya asignada a `app`
- Severidad: baja
- Ubicación: compose.test.yaml:248-251 (`proxy`, `ipv4_address: ${TEST_PROXY_IP:-10.89.240.2}`), :222 (`app` en `proxy-app` sin IP fija), :252-253 (`proxy` depende de `app`), :424-428 (subred `/29`); tests/run.sh (`up -d proxy toxiproxy` arranca antes `app`)
- Descripción: Podman asigna las IP dinámicas desde la primera libre de la subred. `app` se crea antes que `proxy` (depende de ella) y recibe `10.89.240.2`, la IP fija que se reserva a `proxy`; después `proxy` no arranca. Comprobado con una red `internal` `/29` de prueba: primer contenedor sin IP fija → `.2`; el siguiente con `ip=….2` → `IPAM error: requested ip address … is already allocated`. Falla cerrado (no se confía en nadie más), pero bloquearía todas las suites que usan `proxy` (e2e, a11y, visual, perf, security) y empuja a la "solución" peligrosa de poner en `TRUSTED_PROXIES` la subred entera. La prueba de §15 de `docs/infraestructura.md` arrancó `proxy` sin `app` (no hay imagen), por eso no apareció.
- Responsable: infrastructure
- Cómo corregir: dar también IP fija a `app` en `proxy-app` (p. ej. `TEST_APP_IP`, por defecto `10.89.240.3`), o reservar las dinámicas fuera de la de `proxy` (`ip_range` de la red, si `podman-compose` lo pasa); `TRUSTED_PROXIES` sigue siendo solo la IP de `proxy`. Mismo esquema en DEMO/PROD.
- Cómo verificar: con la imagen de la app, `tests/run.sh e2e` llega a `proxy` *healthy*; `podman inspect` muestra `proxy` con `TEST_PROXY_IP` y `app` con otra; RS-06 (una petición directa a `app:3000` desde `backend` con `X-Forwarded-For` falso no cambia la IP que ve la app).
- Estado: abierto (baja, no bloquea)

## SEC-029: `TRUSTED_PROXIES` admite CIDR sin límites ni validación estricta
- Severidad: media
- Ubicación: docs/arquitectura.md:1551 (§10.1, fila `TRUSTED_PROXIES`: "lista separada por comas de IP o CIDR") y :1388 (`trustProxy` solo para `proxy`)
- Descripción: el diseño acepta cualquier CIDR. Fastify pasa `trustProxy` a `proxy-addr`, que también admite nombres (`loopback`, `linklocal`, `uniquelocal` = 10/8, 172.16/12, 192.168/16) y que con un rango amplio confía en `X-Forwarded-For` de cualquier equipo o contenedor de ese rango. Un valor como `10.0.0.0/8`, `uniquelocal` o `0.0.0.0/0` (error de instalación o "arreglo" de SEC-028) deja que cualquiera de la red falsifique la IP de origen: se salta el límite de 10 fallos/10 min por IP del login, que es la defensa contra el rociado de PIN entre usuarios (SEC-001, §6.1.5), y puede bloquear a propósito la IP de otro dispositivo (SEC-003). Requiere un error de configuración, de ahí media y no alta.
- Responsable: software-engineer (`docs/arquitectura.md` §10.1) y developer (`config.ts`)
- Cómo corregir: en `parseSettings`, cada elemento debe ser una IPv4/IPv6 literal o un CIDR con prefijo **≥ /24** (IPv4) o **≥ /120** (IPv6); se rechazan (no arranca) `0.0.0.0/0`, `::/0`, nombres (`loopback`, `linklocal`, `uniquelocal`), `true`, números de saltos y elementos vacíos o con espacios; se pasa a Fastify un *array* ya validado, nunca la cadena original. En TESTING, DEMO y PROD el valor es la IP única de `proxy` (`/32`); un CIDR solo para una red dedicada `proxy`↔`app`. Documentarlo en §10.1 y en `docs/infraestructura.md` §6.
- Cómo verificar: unitario de `parseSettings` (como RS-13) con `10.0.0.0/8`, `uniquelocal`, `0.0.0.0/0`, `::/0`, `true`, `1`, `10.89.240.2,` → no arranca; `10.89.240.2` y `10.89.240.0/29` → arranca. RS-06 en integración: `X-Forwarded-For` desde una IP no listada se ignora.
- Estado: **corregido (diseño, 2.1k)**. `docs/arquitectura.md` §10.1 (reglas 1–5 de `parseTrustedProxies`) y §2.1 (`buildApp` valida igual y pasa a Fastify el *array* o `false`) cumplen lo pedido y lo endurecen (tope de 4 elementos, sin recorte de espacios, sin ceros a la izquierda, sin zona IPv6, mensaje sin el valor). Valoración en §6.6. Pasa a **verificado** con el código de HU-01: unitario de `parseSettings` con los casos de "Cómo verificar" más `" "`, `10.89.240.2 ` (espacio final), `010.89.240.2`, `fe80::1%eth0`, `[::1]`, `::/119`, `::ffff:10.0.0.0/104` y 5 elementos válidos → no arranca, y `::ffff:10.89.240.0/120` y 4 elementos válidos → arranca; unitario de `buildApp` con `trustedProxies: ['uniquelocal']` → rechaza con `ConfigError`; integración RS-06; revisión de código de que ninguna lógica de seguridad usa `request.host`/`hostname`/`protocol` (§6.6)

## SEC-030: Las peticiones automáticas del cliente cuentan como actividad para la inactividad de 15 min
- Severidad: baja
- Ubicación: docs/arquitectura.md:1246-1249 (§7, "cuenta como actividad cualquier petición REST con sesión válida salvo `POST /telemetry`") y :1121-1125 (§5, rutas de la SPA: los *snapshots* se piden "al recibir `hello`/reconexión")
- Descripción: con la regla actual, las peticiones que la app hace sin intervención del usuario (recarga del *snapshot* al recibir `hello`, al reconectar el SSE tras un corte o tras el aviso de 5 s sin `ping`) renuevan `last_activity_at`. Una tablet desatendida con Wi-Fi inestable puede así mantener viva una sesión de camarero o encargado más allá de 15 min sin interacción (hasta la caducidad de 12 h), y la comprobación del servidor deja de ser un respaldo fiable del temporizador del cliente (CA-F09). El temporizador del cliente sigue cerrando la pantalla, por eso es baja.
- Responsable: software-engineer (§7 y §9) y developer
- Cómo corregir: marcar las peticiones que no nacen de una acción del usuario (p. ej. cabecera `X-Activity: passive` en los *snapshots* por `hello`/reconexión y en cualquier recarga automática) y no actualizar `last_activity_at` con ellas (sí se comprueban caducidad e inactividad). Las acciones del usuario y `POST /session/activity` siguen contando como ahora. La cabecera solo puede **restar** actividad, nunca sumarla, así que no hace falta confiar en ella.
- Cómo verificar: integración con reloj falso: sesión de camarero, 14 min sin actividad, `GET` con `X-Activity: passive` → `200`; a los 15 min → `401` con `reason: idle`. E2E: tras un corte de red con la pantalla montada y sin tocar nada, la sesión se cierra a los 15 min de la última interacción.
- Estado: **corregido (diseño, 2.1k)**. `docs/arquitectura.md` §7 ("Peticiones pasivas") y §6: `X-Activity: passive` con valor exacto, regla uniforme en servidor que solo resta actividad, comprobaciones de sesión completas también en las pasivas, y lista del cliente (`GET /auth/me` siempre, *snapshots* por `hello`/reconexión, recargas por `businessDate`/`menu.changed`/temporizador). Valoración en §6.6. Pasa a **verificado** con el código de HU-01: los casos de "Cómo verificar" más (a) `X-Activity: Passive`, `passive ` y `passive, x` cuentan como activas; (b) con la sesión a 14 min, una pasiva no mueve `last_activity_at` (lectura de la fila) y a los 15 min el siguiente `GET` → `401 idle`; (c) en el cliente, revisión de código de que solo el cliente HTTP único pone la cabecera y que ningún *handler* de gesto pasa `{ passive: true }`

## SEC-031: Las rutas inexistentes analizan el cuerpo y no siempre responden `404`
- Severidad: baja
- Ubicación: docs/arquitectura.md:995-1003 (§5, "Rutas inexistentes (T-40)": los hooks de guarda hacen `if (request.is404) return;` y responde el *not-found handler*) y :1243-1246 (§5.2, SPA para "cualquier `GET`")
- Descripción: con el diseño de T-40, Fastify ejecuta el analizador de cuerpo antes del *not-found handler*. Comprobado con Fastify 5.12.8 (`inject`, §6.6): `PATCH /api/v1/settings` con `Content-Type: application/json` y cuerpo `{bad` → `400 FST_ERR_CTP_INVALID_JSON_BODY`; con un cuerpo mayor que el límite → `413 FST_ERR_CTP_BODY_TOO_LARGE`; el *error handler* corre con `is404 = true`. RS-18 exige `404` idéntico para todos; además el servidor analiza JSON sin autenticar en rutas que no existen (acotado por los 64 KiB de RS-23, de ahí baja). Fuera de `/api/`, §5.2 limita la SPA a `GET`, pero el diseño no dice qué responde un `POST`/`PATCH` a una ruta inexistente fuera de `/api/`.
- Responsable: software-engineer (§5 y §5.2) y developer
- Cómo corregir: en el helper de las guardas, si `request.is404`, **responder** en el primer hook de guarda en vez de solo salir: bajo `/api/` (o con un método distinto de `GET`/`HEAD` en cualquier ruta) `return reply.code(404).send({ code: 'NOT_FOUND', message, requestId })` sin `details` ni `Set-Cookie`; con `GET`/`HEAD` fuera de `/api/`, salir y dejar que el *not-found handler* sirva `index.html`. El *not-found handler* mantiene el mismo `404` (lo usa `reply.callNotFound()`). Comprobado en el scratchpad que así JSON inválido, `Content-Type` desconocido y cuerpo > límite dan `404` sin tocar el analizador.
- Cómo verificar: RS-18 (casos de `404` añadidos en la 2.1k): `PATCH /api/v1/settings` con `{bad`, con `text/plain` y con 65 KiB, con y sin sesión → `404 NOT_FOUND` idéntico salvo `requestId`, sin `Set-Cookie` y sin consultas a la BD; `POST /pedidos` → `404` (no `index.html`); `GET /pedidos` → `index.html`.
- Estado: abierto (baja, no bloquea; debe estar corregido al implementar las guardas en HU-01)

## SEC-032: El aborto al primer `401` no cubre todos los canales que pueden borrar la cookie de un login nuevo
- Severidad: baja
- Ubicación: docs/arquitectura.md:963-972 (§5, "Borrado de la cookie": "aborta sus peticiones en curso (`AbortController` del cliente HTTP)") y §6 (flujo SSE con `EventSource` y vigilante de 5 s)
- Descripción: el `Set-Cookie` de borrado del `401` no depende del valor de la cookie, así que cualquier respuesta `401` de la sesión vieja que el navegador procese después de un login nuevo borra la cookie nueva. El diseño lo cierra solo para el cliente HTTP (`AbortController`). Quedan fuera: el `EventSource` de `GET /events` y su reconexión forzada por el vigilante de 5 s (una petición de reconexión lanzada con la cookie vieja cuya respuesta llega tras el login), el envío de telemetría si usa `navigator.sendBeacon` o `fetch({ keepalive: true })` (no se pueden abortar de forma fiable) y los temporizadores de recarga que lancen peticiones nuevas entre el `401` y el login. Impacto solo de disponibilidad (el usuario vuelve a P-01 y repite el login; no hay mezcla de identidades), de ahí baja.
- Responsable: software-engineer (§5) y developer (`apps/web/src/api/`)
- Cómo corregir: al primer `401`, en este orden y antes de habilitar el login de P-01: (1) `abort()` de todas las peticiones del cliente HTTP; (2) `close()` del `EventSource` y cancelación del vigilante de 5 s y de los reintentos de reconexión; (3) cancelación de todos los temporizadores de recarga y de la cola de telemetría (que va por el cliente HTTP con `AbortController`, sin `sendBeacon` ni `keepalive`). Mientras P-01 está visible no sale ninguna petición con sesión. Documentarlo en §5 junto al borrado de la cookie.
- Cómo verificar: E2E con Toxiproxy (o retraso de red de Playwright): con la sesión caducada por inactividad, retrasar 3 s la respuesta de una petición en curso y de la reconexión SSE, hacer login nuevo durante el retraso y comprobar que la cookie nueva sigue presente y la siguiente petición da `200`. Revisión de código: ningún uso de `sendBeacon` ni `keepalive` en `apps/web/`.
- Estado: abierto (baja, no bloquea)


---

### Resumen de la revisión 2.1k (Etapa 2, HU-01, 2026-11-24)
- **Altos o críticos abiertos: ninguno.**
- Dictámenes (§6.6): **T-40** confirmado (`404 NOT_FOUND` para todos con
  `is404`; RS-18 ampliado) con la corrección de **SEC-031**; **SEC-029**
  cumple (tope de 4 aprobado) → corregido (diseño); **SEC-030** cumple →
  corregido (diseño); `search_path=public` cumple (probado: prevalece sobre
  `ALTER ROLE/DATABASE`); borrado de `__Host-sid` en el `401` cumple, con
  **SEC-032**; `UnauthenticatedDetails` estricto y tiempo igualado cumple;
  escritura acotada del *hub* cumple.
- Nuevos: **SEC-031** (baja; software-engineer + developer: el `404` de
  rutas inexistentes debe responderse en el primer hook de guarda, porque
  Fastify analiza el cuerpo y da `400`/`413`); **SEC-032** (baja;
  software-engineer + developer: el aborto al primer `401` debe cubrir
  también `EventSource`, telemetría y temporizadores).
- Abiertos que no bloquean: SEC-003 (media), SEC-025 (baja), SEC-028
  (baja; cambio de infrastructure en la 2.1h aún no revisado por
  Cybersecurity), SEC-031 (baja), SEC-032 (baja).
- Corregidos pendientes de verificación con código o en un entorno
  posterior: SEC-026, SEC-029, SEC-030.
- Contenedores: sin cambios (esta revisión no toca compose ni `deploy/`).
  Escaneo de imágenes (RS-39): pendiente de que exista la imagen de la app.


### Resumen de la revisión 2.1f (Etapa 2, HU-01, 2026-11-24; histórico, sustituido por el de 2.1k)
- **Altos o críticos abiertos: ninguno.**
- Dictámenes (§6.5): `test_admin`/`app_template` aprobado y **sin**
  `pg_signal_backend`; `db_test_admin_password` en `db` aprobado;
  `runner-e2e` con `app_rw` y *pepper* en `db-seed` aprobado (sin acceso a
  `app`, comprobado); `runner-integration` sin `app_owner` aprobado; T-34
  (tmpfs en `/etc/ssl/certs`, CA entera en WebKit) aprobado con condiciones;
  20 conexiones de `app_rw` aprobado; T-35 aprobado; `proxy-app` aprobado en
  diseño. 2.1c: motivo del `401` aprobado con condiciones; CIDR con
  SEC-029; actividad por petición sin cambio esencial, con SEC-030.
- Nuevos: **SEC-029** (media; software-engineer + developer: validación
  estricta de `TRUSTED_PROXIES`, antes de cerrar HU-01); **SEC-028** (baja;
  infrastructure: IP fija de `proxy` ya ocupada por `app`, rompe las suites
  con `proxy`); **SEC-030** (baja; software-engineer + developer: peticiones
  automáticas como actividad).
- Abiertos que no bloquean: SEC-003 (media), SEC-025 (baja), SEC-028,
  SEC-029, SEC-030. Corregido pendiente de verificación: SEC-026.
- Contenedores: sin motivo de bloqueo (UID del usuario, sin root, sin
  `--privileged`, sin sockets, redes `internal`). Escaneo de imágenes
  (RS-39): pendiente de que existan la imagen de la app y las de ejecutores.

### Resumen para la puerta de la Etapa 1 (revisión 1.7q, 2026-11-24)
- **Altos o críticos abiertos: ninguno.**
- **SEC-027** (baja, infrastructure): **verificado** (§3 alineada con
  `compose.dev.yaml`, contrastada con `podman-compose config`).
- **SEC-026** (baja, infrastructure + testing/developer): **corregido** en
  diseño y en `levantar.sh` (`comprobar_enlaces`, 14 casos probados en el
  scratchpad; enlaces duros imposibles entre montajes, comprobado en Podman).
  Comando de SEC-026 y RS-45 corregido a
  `find apps packages \( -name node_modules -type d \) -prune -o -type l -print`
  más la comprobación de destinos con `realpath -m`. Riesgo residual aceptado
  (comprobación puntual; `web` puede crear enlaces después; queda la regla
  `test -L`/`realpath` en el host). Pasa a "verificado" con `tests/run.sh`
  (requisito 5 de §7.1) y RS-45 en la Etapa 2.
- Abiertos que no bloquean: SEC-003 (media), SEC-025 (baja).
- Corregidos pendientes de verificación en Etapa 2 (no bloquean): SEC-026.
- Contenedores: sin motivo de bloqueo (§8.1, veredicto 1.7l). Escaneo de
  imágenes (RS-39): Etapa 2.

### Resumen para la puerta de la Etapa 1 (revisión 1.7l, 2026-11-24; histórico, sustituido por el de 1.7q)
- **Altos o críticos abiertos: ninguno.**
- **SEC-023** (media, infrastructure + testing): **verificado** en DEV con
  prueba propia en `web` y `deps` (proyecto `ro`, lista de permitidos `rw`,
  11/11 escrituras fuera de la lista denegadas, 3/3 dentro permitidas,
  `.secrets` tapado). Pendiente en la Etapa 2: RS-45 con `pnpm install` y
  Vite reales y los requisitos de `tests/run.sh` (§7.1).
- Nuevos: **SEC-026** (baja, infrastructure + testing/developer: enlaces
  simbólicos y extensiones del IDE sobre la lista de permitidos) y
  **SEC-027** (baja, infrastructure: tabla de §3 desactualizada).
- Abiertos que no bloquean: SEC-003 (media), SEC-025 (baja), SEC-026 (baja),
  SEC-027 (baja).
- Contenedores: sin motivo de bloqueo (§8.1, veredicto 1.7l). Escaneo de
  imágenes (RS-39): Etapa 2.

### Resumen para la puerta de la Etapa 1 (revisión 1.7j, 2026-11-24; histórico, sustituido por el de 1.7l)
- **Altos o críticos abiertos: ninguno.** Sin hallazgos nuevos en 1.7j.
- **SEC-024** (media, monitoring): **verificado** en diseño (`docs/logging.md`
  1.7b); RS-47 lo comprueba en la implementación.
- Telemetría `pre_session` (`docs/logging.md` §6.4.1): cumple las cinco
  condiciones de §6.4 "UX (1.2c)": (1) solo en memoria, también sin Service
  Worker; (2) ≤ 20 pasos y ≤ 10 min, solo `login`/`pin_change`, primer lote
  tras `succeeded`/`saved` dentro de RS-43; (3) solo `flow`, `step`,
  `pre_session` y `duration_s` en el paso de éxito, sin usuario, longitud
  del PIN, dígitos, tiempos entre pulsaciones **ni hora por paso** (más
  estricto de lo exigido); (4) marcados `pre_session: true`, sin líneas de
  log, sin `user_id`/`session_id` ni BD, solo contadores agregados; (5) se
  vacía al cerrar sesión, con `401` por revocación o caducidad y en
  `idle_logout`. RS-43 no cambia (sin endpoint sin sesión ni excepción para
  la sesión provisional). Que "Cambiar de usuario" en P-01 no vacíe el búfer
  se acepta: no hay sesión y los pasos no llevan identidad. Riesgo residual
  aceptado (sin hallazgo): una sesión válida puede inflar los contadores
  agregados de `login`/`pin_change` (≤ 20 elementos por lote, ≤ 1 lote/30 s),
  igual que con el resto de la telemetría; solo afecta a métricas de UX.
- Abiertos que no bloquean: SEC-003 (media), SEC-023 (media; Infrastructure
  indica verificación real en 1.7c, pendiente de que Cybersecurity la
  registre aquí), SEC-025 (baja).
- Contenedores: sin cambios respecto a 1.4c (esta revisión no toca compose ni
  `deploy/`).

### Resumen para la puerta de la Etapa 1 (revisión 1.4c, 2026-11-23; histórico, sustituido por el de 1.7j)
- **Altos o críticos abiertos: ninguno.** SEC-016 (alta) **verificado**:
  `verifyPin` única con límite por IP, bloqueo y revocación, y `POST /auth/pin`
  solo para el PIN provisional. SEC-001 (alta) verificado y SEC-002 (alta)
  corregido en diseño (se verifica con RS-41 en DEMO/PROD).
- Verificados en 1.4c: SEC-016, SEC-017, SEC-018 (DEV y `runner-unit`),
  SEC-020, SEC-021, SEC-022. Corregidos en diseño (pasan a verificado en un
  entorno posterior): SEC-010 (RS-38 en TESTING), SEC-019 (RS-06 si PROD usa
  la topología B).
- Abiertos que no bloquean: SEC-003 (media), **SEC-023** (media, infrastructure
  + testing), **SEC-024** (media, monitoring), **SEC-025** (baja,
  software-engineer).
- Dictámenes de §6.4: SEC-016 (revocación ampliada, `403 PIN_INVALID`, solo PIN
  provisional, `423` sin contar), T-20 (opción A), HU-01/CA-F13 (tres puntos
  confirmados), T-14, T-18, umbrales de §7.4, comandos del temporizador,
  `NoNewPrivileges`, `alert-egress` con nftables, telemetría previa a la
  sesión y `caddy-data` en TESTING.
- Contenedores: ningún contenedor como root, `--privileged`, socket montado ni
  red del host (§8.1, veredicto 1.4c). Escaneo de imágenes: Etapa 2.

### Resumen para la puerta de la Etapa 1 (revisión 1.4b, 2026-11-23; histórico, sustituido por el de 1.4c)
- **Altos abiertos (bloquean la puerta):** **SEC-016** (`currentPin` sin
  límite; responsable software-engineer; arreglo de redacción en ADR-005 y
  `docs/arquitectura.md` §5/§5.1/§7).
- SEC-001 (alta): **verificado**. SEC-002 (alta): **corregido** en diseño; ya
  no bloquea (se verifica con RS-41 en DEMO/PROD).
- Verificados: SEC-001, SEC-004, SEC-005, SEC-006, SEC-007, SEC-008, SEC-009,
  SEC-012, SEC-013, SEC-014, SEC-015. Corregidos (pendientes de prueba en un
  entorno posterior): SEC-002, SEC-010, SEC-011.
- Abiertos que no bloquean: SEC-003, SEC-017, SEC-018, SEC-019, SEC-020
  (medias); SEC-021, SEC-022 (bajas).
- Decisiones sobre otros puntos de `docs/estado.md`: §6.3 (rejilla de login,
  aprobación de encargado, Chromium sin *sandbox*, telemetría, M-05, M-06
  —opción B aprobada con condiciones—, M-08, HU-09 —sin efecto—, redirección
  de Caddy, opciones de SEC-003).
- Contenedores: revisión de `deploy/` y compose en §8.1; ningún motivo de
  bloqueo por la regla de contenedores. Escaneo de imágenes pendiente (Etapa 2).
