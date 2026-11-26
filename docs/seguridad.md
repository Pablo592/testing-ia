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
> Revisión 2.1m, 2026-11-24 (Etapa 2, HU-01): CVE-2026-107494 y
> CVE-2026-124709 de `libssl3t64` en la base distroless (excepción fechada
> EXC-01), imagen final `deploy/app/` y contrato §8.1, etapa Debian trixie y
> SEC-028 (2.1h), con prueba propia (Trivy 0.76.2 rootless sobre `podman
> save`, `readelf`/`nm` de la raíz exportada, Node de la imagen endurecido,
> red `/29` de prueba) (§6.7). SEC-028 pasa a corregido. Hallazgos nuevos
> SEC-033 (baja, con EXC-01), SEC-034 (media), SEC-035..SEC-037 (baja).
> Revisión 2.3, 2026-11-25 (Etapa 2, HU-01): entrega del developer (commit
> `4460e09`, tarea 2.2): `apps/api`, `apps/web`, `packages/shared`, migración
> 0001, comandos, build e imagen real, con pruebas propias en Podman rootless
> (pila de integración de `compose.test.yaml` con scripts propios montados en
> `ro`, suites unitaria y de seguridad, `pnpm audit`, Trivy 0.76.2 sobre la
> imagen, `readelf`/`nm`) (§6.8). SEC-029, SEC-030, SEC-031 y SEC-032 pasan a
> verificado; SEC-028 confirmado con la imagen real. Hallazgos nuevos
> **SEC-038 (alta, bloquea)** y SEC-039..SEC-046 (baja).
> Revisión 2.6, 2026-11-26 (Etapa 2, HU-01): verificación de la entrega 2.5
> del developer (commit `0d7ca30`): SEC-038, T-45, SEC-039..SEC-042, cambios
> de UX H-2.3-01..11 y D-2.5-01..05, con la imagen reconstruida desde el
> commit (`localhost/mi-app:0b3c9f111c63`, `sha256:66fcdf09…`), suites
> `unit`, `security`, `integration` y `e2e`, prueba propia en
> `runner-integration` (fichero temporal, borrado al terminar), `lower()` de
> PostgreSQL en contenedor efímero, `pnpm audit` y Trivy 0.76.2 sobre las
> tres imágenes desplegables (§6.9). **SEC-038 verificado**; SEC-039..SEC-042,
> SEC-044 y SEC-045 verificados; aplazamiento de SEC-043 aceptado con
> condiciones. Hallazgos nuevos SEC-047 (baja) y **SEC-048, SEC-049 y SEC-050
> (alta, imágenes de `app`, `db` y `proxy`; bloquean)**.
> Revisión 2.9, 2026-11-26 (Etapa 2, HU-01): entrega 2.7/2.1n de
> infrastructure (commit `0af1331`): imágenes de `app`, `db` y `proxy`,
> excepciones propuestas de `gosu` y Caddy, `deploy/scan/escanear.sh` y
> controles de `construir.sh` y de los `Containerfile`, con pruebas propias
> en Podman rootless (build limpio, Trivy 0.76.2 con BD nueva y sin
> excepciones, pruebas negativas del escaneo y del build en un clon del
> repositorio, `nm` de `gosu` y `caddy`, secdb/APKINDEX/APKBUILD de Alpine,
> suite `containers`) (§6.10). **SEC-048 verificado**; SEC-034..SEC-037
> verificados; **EXC-02 (`gosu`) y EXC-03 (Caddy) aprobadas con
> condiciones**; EXC-01 sigue vigente. **SEC-049 sigue abierto (alta,
> bloquea)**: `alpine3.23` no corrige `libxml2`, solo lo oculta al escáner.
> Hallazgos nuevos SEC-051, SEC-052 y SEC-054 (media) y SEC-053 (baja).
> Revisión 2.10d, 2026-11-26 (Etapa 2, HU-01): entrega 2.10c de
> infrastructure (commit `46458cb`): `apk upgrade` en db, imagen derivada
> del proxy, comprobación de paquetes atrasados y registro de aprobadas, con
> pruebas propias en Podman rootless (Trivy con BD nueva y sin excepciones,
> `image diff` del proxy, 7 builds reales en un clon con almacén aislado, 22
> mutaciones) (§6.12). **SEC-055 verificado**; SEC-052 3a/3b verificados,
> con requisitos nuevos (e)–(h); SEC-056 ampliado (M11–M12). Ningún
> crítico ni alto abierto que bloquee la puerta de la Etapa 2.
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
6. Decisiones sobre los hallazgos abiertos de `docs/estado.md` (incl. §6.3, otros puntos; §6.4, revisión 1.4c; §6.5, revisión 2.1f; §6.6, revisión 2.1k; §6.7, revisión 2.1m; §6.8, revisión 2.3; §6.9, revisión 2.6; §6.10, revisión 2.9)
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

### 6.7 Revisión 2.1m (2026-11-24): CVE de `libssl3t64`, imagen final de la app y SEC-028

Entradas: commit `1568e34` (`deploy/app/Containerfile`, `deploy/app/construir.sh`,
`deploy/app/containerignore`, `compose.test.yaml` servicio `commands`,
`docs/infraestructura.md` §8, §8.1, §9.2 y §15) y el cambio de la 2.1h en
`compose.test.yaml` (SEC-028).

**Pruebas propias (rootless, sin `sudo`, fuera del repositorio).** (1) Raíz
de la distroless (`nodejs26-debian13@sha256:b462e87a…`) exportada con
`podman create` + `podman export` al scratchpad: paquetes, `readelf -d` de
todos los ELF y `nm -D` del binario de Node. (2) `node` de esa imagen con
`--user 1000:1000 --cap-drop=ALL --security-opt=no-new-privileges
--read-only --network=none`: versiones, `process.config`, `node:quic` con y
sin `--experimental-quic`, `/proc/self/maps`. (3) Trivy 0.76.2 (mismo digest
de `docs/infraestructura.md` §8) en contenedor rootless (UID 1000,
`cap-drop ALL`, raíz `ro`, sin socket) sobre `podman save` de las dos bases;
prueba del fichero de excepciones con caducidad y `purl`. (4) Red `internal`
`/29` de prueba con IP fijas en los dos órdenes de arranque. Contenedores,
red, imagen de Trivy y ficheros de prueba borrados al terminar.

**1. CVE-2026-107494 y CVE-2026-124709 (`libssl3t64` 3.5.9-1~deb13u1): EXCEPCIÓN
FECHADA (EXC-01), riesgo residual bajo. Ver SEC-033.**
Trivy confirma lo de Infrastructure: 0 críticas, 2 altas, las dos `affected`
sin versión corregida, CVSS 3.1 `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H` (solo
disponibilidad). CVE-2026-107494: un par QUIC malicioso hace que la pila QUIC
encole sin límite tramas `RETIRE_CONNECTION_ID` (corrección incompleta de
CVE-2026-84784) → falta de memoria. CVE-2026-124709: un **servidor** QUIC que
rechaza flujos del par conserva su estado si el par los reinicia antes →
memoria sin límite. Las dos exigen un extremo QUIC (UDP) que procese
paquetes del atacante.
- **Alcanzabilidad en la imagen: no.** (a) Ningún ejecutable de la imagen
  enlaza la biblioteca del sistema: `readelf -d` de `/nodejs/bin/node` da solo
  `libatomic`, `libdl`, `libm`, `libstdc++`, `libgcc_s`, `libpthread`, `libc`
  y `ld-linux`; los únicos ELF con `NEEDED libssl/libcrypto` son la propia
  `libssl.so.3` y los *engines* de OpenSSL (`padlock`, `afalg`,
  `loader_attic`), que nadie carga. `/proc/self/maps` de Node no tiene
  `libssl` ni `libcrypto`. (b) La app es Fastify sobre **TCP** (HTTP/1.1 en
  claro hacia Caddy por la red `internal` `proxy-app`; 3000 y 9464 TCP), sin
  escucha UDP. (c) El Node de la imagen está compilado **sin QUIC**:
  `process.config.variables.node_use_quic = false`, `process.versions` sin
  `ngtcp2`/`nghttp3`, y `require('node:quic')` → `ERR_UNKNOWN_BUILTIN_MODULE`
  incluso con `--experimental-quic`. (d) El HTTP/3 que pueda servir Caddy es
  `quic-go` (Go), no OpenSSL: estas CVE no le afectan.
- **Matiz importante que el escáner no ve:** Node lleva su **propio** OpenSSL
  3.5.9 enlazado estáticamente (`node_shared_openssl: false`), y ese OpenSSL
  **sí contiene la pila QUIC** (553 símbolos `ossl_quic_*`; exporta
  `OSSL_QUIC_server_method`, `OSSL_QUIC_client_method`, `SSL_new_listener` y
  `SSL_set_quic_tls_cbs` para los módulos nativos). Desde JavaScript no es
  alcanzable (los módulos `tls`/`https`/`http2` usan TLS sobre TCP y no hay
  `node:quic`); solo lo sería un módulo nativo que llamara a esas funciones.
  Consecuencias: (1) la corrección de Debian **no** arregla la copia de Node;
  hay que seguir también las versiones de seguridad de Node; (2) la
  condición 4 de EXC-01 (ningún módulo nativo usa la API QUIC de OpenSSL) es
  la que de verdad protege, y se comprueba en cada build.
- **Por qué no la opción (b).** Esperar bloquearía TESTING y la puerta de la
  Etapa 2 (necesitan la imagen) sin reducir un riesgo que hoy no es
  alcanzable. Cambiar de base no lo resuelve: todas las distroless con glibc
  (`base`, `cc`, `nodejs`) traen `libssl3t64`; `static` no tiene glibc (Node
  no arranca); Alpine (musl) rompe `argon2` (§8.1 de infraestructura) y trae
  la misma rama 3.5 de OpenSSL; una base a mano (`scratch` + glibc + Node)
  pierde las actualizaciones de distroless y añade mantenimiento; y en todos
  los casos el binario de Node sigue llevando su OpenSSL con la pila QUIC.
- **Aprobación.** RS-39 permite excepciones "con aprobación escrita de
  Cybersecurity en §9": queda concedida en SEC-033. **No supone aceptar un
  riesgo alto** (el riesgo residual es bajo), pero es una excepción a la
  regla de `docs/reglas-equipo.md` §3.3 ("sin críticas/altas"), así que el
  Orquestador debe **comunicársela al humano para que la ratifique** en la
  puerta de la Etapa 2. Hasta la puerta no bloquea el trabajo (2.2).

**2. Imagen final y su contrato (`deploy/app/`, §8.1): CUMPLE §3 con
condiciones.**

| Regla (§3) | Comprobación | Resultado |
|---|---|---|
| 3.2 Multietapa, imagen final mínima | `build` (trixie-slim) → distroless; la final solo recibe `/app` (`package.json`, `node_modules` de producción, `dist`, `public`). Paquetes de la final: `base-files`, `ca-certificates`, `gcc-14-base`, `libatomic1`, `libc6`, `libgcc-s1`, `libgomp1`, `libssl3t64`, `libstdc++6`, `libzstd1`, `media-types`, `netbase`, `tzdata`, `tzdata-legacy`, `zlib1g`; `/bin` y `/usr/bin` vacíos (sin shell ni gestor de paquetes) | Cumple |
| 3.2 Bases por digest | las dos por digest de índice; `ARG` con valor por defecto (sobrescribible con `--build-arg`, `construir.sh` no lo hace) | Cumple (SEC-037: el script debe seguir sin aceptar `--build-arg`) |
| 3.2 Sin secretos en imagen ni *build args* | *build args* solo de versión y rutas; contexto de lista de permitidos (`.secrets/`, `.git/`, `docs/`, `deploy/`, `tests/` fuera, comprobado por Infrastructure con señuelos); comprobación de `.env*`/`*.pem`/`*.key` en la salida | Cumple, salvo `.npmrc` (SEC-036, baja) |
| 3.2 Construcción rootless, sin socket | `construir.sh` rechaza UID 0 y Podman no rootless; sin `sudo` | Cumple |
| 3.3 `USER` ≥ 1000, `--chown` | `USER 1000:1000` numérico (UID no listado en `/etc/passwd`, sin efecto: `HOME=/tmp`); `COPY --chown=1000:1000` | Cumple (ver nota 1) |
| 3.3 Puertos > 1024, `HEALTHCHECK` | 3000 y 9464; `HEALTHCHECK` exec sin shell, conservado con `--format docker` | Cumple |
| 3.3 Escaneo en cada build | no está en `construir.sh` (Infrastructure lo ejecutó a mano) | **No cumple: SEC-034 (media)** |
| 3.3 Sin críticas/altas | 0 críticas; 2 altas cubiertas por EXC-01 | Cumple con EXC-01 (SEC-033) |
| 3.4 Ejecución | lo aplica compose (`x-hardening`): UID 1000, `cap_drop ALL`, `no-new-privileges`, raíz `ro`, `/tmp` tmpfs `noexec`, límites; servicio `commands` igual, solo en `backend`, rol `app_rw`, secretos como fichero | Cumple |
| RS-39 scripts de instalación | pnpm 12 no ejecuta scripts de dependencias salvo `allowBuilds` (`argon2`); `--frozen-lockfile`; `install --offline` | Cumple (equivale al `--ignore-scripts` + lista blanca de §8). Falta `pnpm audit --prod` en el build: dentro de SEC-034 |
| Cadena de suministro de pnpm | `npm install --global pnpm@12.21.0` como root de construcción, sin integridad fijada | SEC-035 (baja) |
| Trazabilidad de la etiqueta | `-sucio` no mira todo lo que entra en el contexto | SEC-037 (baja) |

Notas sin hallazgo: (1) `/app` es propiedad del UID 1000 (lo pide §3.3), así
que el proceso podría reescribir su propio código si alguna vez se ejecuta
**sin** raíz de solo lectura: `read_only: true` (compose) y `ReadOnly=true`
(Quadlet, Etapa 5) son obligatorios en todos los entornos y RS-36 lo
comprueba. (2) Node es PID 1 sin *init*: el punto 8 del contrato
(`SIGTERM`/`SIGINT`) es necesario; es disponibilidad, no seguridad. (3) El
contrato con el Developer (§8.1, puntos 1–10) no tiene implicaciones de
seguridad nuevas; el punto 9 (nada escribe fuera de `/tmp`) es coherente con
`read_only`.

**3. Etapa de construcción Debian trixie (`node:26.13.1-trixie-slim`):
APROBADA.** Desde el punto de vista de seguridad es mejor que la `-alpine` de
`docs/arquitectura.md` §10: misma glibc (2.41) y mismo Node (ABI 147) que la
final, así que `argon2` nativo se instala y prueba para la libc real. Trivy
sobre la base de construcción: muchas altas sin corrección (`util-linux`,
`sqlite`, `systemd`, `ncurses`, `perl-base`, `openssl`) y, en el `npm` 11.20.0
incluido, `undici` 6.28.0 (CVE-2026-109383, *bypass* de validación de
certificado con opciones TLS propias en `Agent`, entre otras) y
`brace-expansion` 5.0.9. **Ninguna llega a la imagen final** (la etapa se
descarta) y §3.3 aplica a la imagen final; no necesitan excepción. El
`undici` de `npm` solo lo usa su `node-gyp` (no la descarga de paquetes del
registro), pero el paso `npm install --global pnpm` depende solo del TLS del
registro: SEC-035 lo cierra fijando la integridad. Cuando se actualice el
digest de la base de construcción, Infrastructure repite este escaneo
informativo.

**4. SEC-028 (2.1h): CORREGIDO.** `compose.test.yaml:261-264` da a `app` la IP
fija `${TEST_APP_IP:-10.89.240.3}` en `proxy-app`; `proxy` sigue en
`${TEST_PROXY_IP:-10.89.240.2}` (:290-292) y `TRUSTED_PROXIES` es solo esa IP
(:68). Prueba propia en una red `internal` `/29`: con `app` en `.3` primero y
`proxy` en `.2` después, y en el orden inverso, los dos arrancan; un tercer
contenedor sin IP fija recibe `.4` (nunca `.2`); pedir `.2` ocupada da
`IPAM error … already allocated` (falla cerrado). Si alguien pone las dos
variables iguales, un contenedor no arranca (falla cerrado; no amplía la
confianza). En `proxy-app` solo están `app` y `proxy`. Queda la verificación
con la imagen real (primera ejecución de `tests/run.sh e2e`) y el mismo
esquema en `compose.demo.yaml` y Quadlet cuando existan.

**Altos o críticos en esta revisión: ninguno** (las dos CVE altas quedan
cubiertas por EXC-01, pendiente de ratificación humana en la puerta de la
Etapa 2).

### 6.8 Revisión 2.3 (2026-11-25): entrega de HU-01 del developer (commit `4460e09`, tarea 2.2)

Alcance: `apps/api` (config, `buildApp`, guarda, rutas de auth, `verifyPin`,
límites, hasher, tokens, logger, métricas, hub SSE, SPA, `/healthz`,
comandos), `apps/web` (cliente HTTP, sesión, SSE, P-01, cambio de PIN),
`packages/shared`, migración `0001_hu01_auth`, `build.mjs`,
`pnpm-workspace.yaml`, `pnpm-lock.yaml` e imagen real
`localhost/mi-app:69e823f40ad7-sucio` (`sha256:42df4724…`).

**Pruebas propias** (todas en Podman rootless, sin modificar código ni tests;
scripts en el scratchpad de la sesión, `sec23/`):
(a) pila de integración de `compose.test.yaml` (BD, `migrate`,
`migrate-template`, `app`) y un script propio montado en `ro` dentro de
`runner-integration`, con `buildApp` en proceso sobre una BD clonada de
`app_template` (`montarApp({ bdAislada: true })`): ráfagas concurrentes de
login y de `currentPin` (SEC-038), centinela de PIN en peticiones válidas e
inválidas, `Cache-Control`, métodos y rutas no declarados, SSE tras la
inactividad y tope global de flujos; (b) suite unitaria (171/171) y de
seguridad (39/39) con los arneses del developer; (c) `parseTrustedProxies` y
`buildApp` con casos extra de SEC-029 en un contenedor sin red; (d)
`pnpm audit --prod` y `pnpm audit` (pnpm 12.21.0) en contenedor endurecido
con el repositorio en `ro`; (e) Trivy 0.76.2 (por digest) sobre `podman
save` de la imagen real con el fichero de EXC-01; (f) `readelf`/`nm` y
`grep` sobre la raíz exportada de la imagen (condiciones 3 y 4 de SEC-033);
(g) `find`/`realpath` de SEC-026 sobre el árbol actual.

**1. SEC-029, SEC-030, SEC-031 y SEC-032: VERIFICADOS.**
- SEC-029: `parseTrustedProxies` y `validateTrustedProxyList`
  (`apps/api/src/config.ts:97-129`) aplican las reglas 1–5 de §10.1;
  `buildApp` valida igual y pasa a Fastify el *array* o `false`
  (`apps/api/src/app.ts:68`, `:106`). Prueba propia: `" "`, `10.89.240.2 `,
  `010.89.240.2`, `fe80::1%eth0`, `[::1]`, `::/119`, `::ffff:10.0.0.0/104`,
  5 elementos, `1.2.3.4\n`, `0x0a.89.240.2`, `1e1.1.1.1` y dígitos no ASCII →
  `ConfigError` sin el valor en el mensaje; `::ffff:10.89.240.0/120` y 4
  elementos → arranca; `buildApp` con `['uniquelocal']`, `'uniquelocal'`,
  `true`, `['10.0.0.0/8']` y `[' 10.89.240.2']` → `ConfigError`. Ninguna
  lógica usa `request.host`, `hostname`, `protocol`, `ips` ni
  `X-Forwarded-*` (`grep` en `apps/api/src`). Faltan en los tests algunos de
  estos casos, entre ellos el de `buildApp` (SEC-045).
- SEC-030: la guarda solo omite `touch` con `x-activity === 'passive'` exacto
  (`apps/api/src/http/guard.ts:215`) y hace antes todas las comprobaciones de
  sesión; en la SPA solo `loadMe` (`GET /auth/me`) usa `{ passive: true }`
  (`apps/web/src/session/store.ts`) y ningún *handler* de gesto. Integración
  con variantes `Passive`, `PASSIVE`, `passive, x`, `passive;x` y lectura de
  `last_activity_at` en verde.
- SEC-031: la guarda responde `404 NOT_FOUND` con `request.is404` bajo
  `/api/` y en cualquier método que no sea `GET`/`HEAD`, antes del analizador
  de cuerpo y sin BD ni `Set-Cookie` (`guard.ts:142-147`); el `notFoundHandler`
  solo sirve la SPA con `GET`/`HEAD` fuera de `/api/` (`app.ts:224-233`).
  Prueba propia: `OPTIONS`/`PUT`/`GET` sobre `/api/v1/auth/login`, `TRACE /`,
  `POST /pedidos` → `404` JSON; suite de seguridad RS-18 en verde. Pendiente
  solo la documentación de §5/§5.2 (software-engineer, tarea 2.2c).
- SEC-032: al primer `401`, `session.revoked`, inactividad o *logout*,
  `end()`/`stopChannels()` hacen `abortAll()` (con número de generación que
  descarta respuestas tardías), `events.stop()` (cierra el `EventSource`, el
  vigilante y el reintento) y paran el temporizador antes de pasar a P-01
  (`apps/web/src/session/store.ts`, `api/client.ts`, `realtime/events.ts`);
  el *logout* por inactividad espera su respuesta antes de mostrar P-01; no
  hay `sendBeacon` ni `keepalive` en `apps/web`. El e2e de canales cerrados
  está en verde; falta el e2e con respuesta retrasada y login durante el
  retraso que pedía "Cómo verificar" (SEC-045, no impide verificar: el código
  cumple).

**2. `verifyPin`: el orden y las reglas están bien en secuencia, pero NO
resiste concurrencia (SEC-038, alta).** En secuencia cumple §7 y T-20:
límite por IP antes del hash, límite por sesión solo en `approval`, bloqueo
sin hash ni conteo, hash ficticio si el usuario no existe, contador del
usuario con la escala 5/10/15/20 en una transacción y revocación de todas
las sesiones al llegar a `locked_manual` (SEC-016, RS-16b). argon2id
`m=19456, t=2, p=1` con el *pepper* como `secret` (RS-08); el *pepper* se lee
de fichero, exige ≥ 32 bytes y sin él `main` no arranca; la comparación es
`crypto.timingSafeEqual` dentro de `argon2.verify` (argon2 0.45.2). Solo el
módulo `auth` recibe el hasher (`app.ts:125-132`, `commands/index.ts:47`;
RS-16c revisado a mano, sin test automático: SEC-045). **Pero** las
comprobaciones de IP y de bloqueo se hacen con datos leídos antes del hash y
los fallos se anotan después: con peticiones simultáneas todas pasan las
comprobaciones. Prueba propia (detalle en SEC-038): 300 logins simultáneos
desde una IP → 300 verificaciones argon2, ningún `429` ni `423`, y el PIN
correcto (el último de la ráfaga) → `200` con cookie aunque la cuenta ya
estaba en `locked_manual`; con 3000, 516 verificaciones en una ráfaga (el
diseño admite 10 por IP en 10 min y 5 por cuenta antes del bloqueo). Igual
con `currentPin`: el PIN provisional se cambió (`204`) en una cuenta ya en
`locked_manual`. Con la rejilla pública de nombres, cada ráfaga prueba ~5 %
de los PIN de 4 dígitos de un usuario: es la fuerza bruta que SEC-001 y
SEC-016 cerraron. **Bloquea la puerta.**

**3. Sesiones: CORRECTO, con un hueco en SSE (SEC-039, baja).** Cookie
`__Host-sid=…; Path=/; Secure; HttpOnly; SameSite=Strict`, sin `Domain` ni
`Max-Age` (comprobado en la respuesta real; RS-10, SEC-021); token de 256
bits de `randomBytes`, nuevo en cada login, en BD solo SHA-256 (RS-11);
caducidad absoluta `now + SESSION_MAX_HOURS` y por inactividad
`now >= last_activity_at + 15 min`, comprobadas en cada petición, con
exención solo para `kitchen` con flujo abierto (RS-12, RS-13); revocación
por *logout*, cambio del PIN provisional (resto de sesiones) y bloqueo
indefinido (todas), con `session.revoked` y cierre del flujo tras el
`COMMIT` (RS-14). El `401` lleva exactamente las formas de
`UnauthenticatedDetails` y, si la petición traía la cookie, el `Set-Cookie`
de borrado idéntico (`app.ts:201`). Desviación `revoked_reason`/
`expired_reason` (D-2.2-06 a): **aprobada**; hace el motivo del `401`
estable y registra `auth.session.expired` una vez, sin datos sensibles. Hueco:
una sesión caducada por inactividad deja su flujo SSE abierto y recibiendo
eventos hasta las 12 h (SEC-039).

**4. `Origin`/CSRF, denegación por defecto y RS-18: CORRECTO.** Una sola
guarda `onRequest` con el orden 404 → `internal` → `Origin` → público →
sesión → PIN provisional → permiso → `provisionalPinOnly` → actividad
(`guard.ts:138-216`). `Origin` exacto contra `PUBLIC_ORIGIN` en
`POST/PUT/PATCH/DELETE`, también en el login (RS-24); solo
`application/json` (resto `415`); sin `permission` → `403` (RS-17; además un
`onRoute` rechaza rutas con más de una declaración). La tabla de
`packages/shared/src/permissions.ts` coincide con `docs/permisos.md` §3.2.
Desviación "guarda en un solo hook": **aprobada** (el orden es el de §5 y no
deja huecos entre hooks). Solo `/healthz` y `/readyz` son `internal` (solo
`GET`, sin datos; Caddy los responde con `404`).

**5. Logs y métricas: CORRECTO.** Doble barrera: `redact` con las rutas fijas
(incluidos `confirmPin`, `__Host-sid`, `pin_hash`, `pepper`) y regla `/pin/i`
recursiva en `formatters.log`, `bindings` y el serializador de `err`
(`apps/api/src/logging/logger.ts`); no se registran cuerpos, cabeceras ni el
nombre de login. Centinela `908172` en `pin`, `extra.PIN`, JSON roto,
`text/plain`, número, nombre, PIN de 76 caracteres, *query string* y ruta
inexistente: **0** apariciones en logs y respuestas salvo cuando el propio
cliente lo manda como **nombre de una clave** desconocida (sale en
`issues[].path`; es dato elegido por quien envía, no un valor, y se acepta).
Métricas con etiquetas acotadas (plantilla de ruta, `not_found`, enums) y
series a 0 desde el arranque (RS-47). Ningún secreto llega a logs ni
respuestas: `app.started` solo lista nombres de variables; `ConfigError`
nunca incluye el valor.

**6. Cabeceras y CSP: CORRECTO en Caddy; `Cache-Control` incompleto
(SEC-041, baja).** `deploy/proxy/Caddyfile:23-36` tiene exactamente las de
RS-26; la SPA construida no tiene *scripts* ni estilos en línea
(`index.html` solo enlaza `/assets/*`) y el código no usa `style=`,
`innerHTML`, `dangerouslySetInnerHTML`, `eval` ni almacenamiento local, así
que la CSP estricta no rompe nada (los e2e pasan a través de Caddy). Falta
`Cache-Control: no-store` en la mayoría de respuestas de `/api` (RS-27).

**7. Dependencias: CORRECTO en producción; dos críticas en las de
desarrollo (SEC-044, baja en contexto).** `pnpm audit --prod`: 0
vulnerabilidades (85 dependencias). `pnpm audit` completo: `tinypool` 1.1.1
(2 críticas, GHSA-5gmw-xhrv-c9v3 y GHSA-85c8-ppgw-ccpr) y `vitest`/`@vitest/mocker`
3.2.7 (3 moderadas), solo en `tests/`. Lockfile: solo registro npm y enlaces
del *workspace*, 261 integridades `sha512`, sin `git+` ni *tarballs*.
`allowBuilds` limitado a `argon2` y `esbuild`. Desviación
`hoistWorkspacePackages: false`: **aprobada** (coherente con SEC-026: no
crea el enlace a `tests/` en `node_modules/.pnpm/node_modules`).

**8. Resto de desviaciones declaradas.** `role text + CHECK` en lugar de
`enum`: **aprobada** (mismo efecto, `CHECK` en BD y validación en servidor).
PIN de login y `currentPin` de 1–64 caracteres (`400 max_length` fuera):
**aprobada** (acota la entrada antes del hash; las reglas de composición solo
se aplican al crear un PIN). Cierre del flujo SSE más antiguo al abrir el
tercero de una sesión: **aprobado**, pero falta el tope global de 50 de
RS-23 (SEC-040). `/healthz` `503` con *lag* p99 > 1 s: **aprobado** (es lo
que pide `docs/logging.md` §8.1; no lo expone Caddy; un reinicio por
`HealthOnFailure=kill` vacía los límites en memoria, riesgo ya aceptado en
§6.1.5). `audit_log.entity_id` `text` y `was_lock_kind = none`: sin
implicaciones de seguridad. Migración 0001: privilegios de `app_rw`
exactamente los de `docs/permisos.md` §6 (sin `DELETE` en `users` ni
`audit_log`, sin `UPDATE` en `audit_log`, trigger de inmutabilidad también
para `TRUNCATE`), `app_backup` por los `DEFAULT PRIVILEGES` de
`10-roles.sh`. Comandos: el PIN inicial solo se lee de fichero, se valida con
las reglas de encargado antes del hash y nunca sale en `stderr` ni en logs.

**9. Imagen y build.** Trivy 0.76.2 sobre la imagen real: 0 críticas/altas
salvo las 2 de EXC-01 (*suppressed*); condiciones 3 y 4 de SEC-033 cumplidas
(ningún `.node` enlaza `libssl`/`libcrypto` ni importa símbolos QUIC; `dist`
sin `node:quic` ni `dgram`); `USER 1000:1000`, `HEALTHCHECK` en forma exec,
sin `.npmrc` ni `.env*`. La imagen probada se construyó **antes** del commit
y desde un árbol sucio (`69e823f40ad7-sucio`, etiqueta `revision` de
`69e823f`): es SEC-037 en la práctica; la imagen de la puerta debe
reconstruirse desde el commit final. Lleva además 10 binarios de `argon2` de
otras plataformas (SEC-046, baja). SEC-026: `find`/`realpath` sobre el árbol
actual sin enlaces fuera de la lista de permitidos. SEC-028: los e2e del
developer con `proxy` y `app` (imagen real) arrancan sin errores de IPAM.

**Otros hallazgos nuevos (baja):** SEC-042 (un `NUL` en el nombre de login
da `500` y log de error con traza), SEC-043 (límite por IP con clave IPv6
completa y expulsión de entradas bloqueadas), SEC-045 (faltan pruebas de
regresión y comprobaciones estáticas).

**Altos o críticos en esta revisión: SEC-038 (alta), abierto. Bloquea la
puerta de la Etapa 2** hasta que el developer lo corrija y Cybersecurity lo
verifique con la prueba de concurrencia.

---

### 6.9 Revisión 2.6 (2026-11-26): verificación de la entrega 2.5 (commit `0d7ca30`)

Alcance: el diff de `0d7ca30` (`verify-pin.ts`, `rate-limit.ts`,
`serialize.ts` nuevo, rutas de `auth.ts` y `system.ts`, `guard.ts`, `hub.ts`,
`session-policy.ts`, `app.ts`, `metrics.ts`; `packages/shared` (`api.ts`,
`api-constants.ts`, `zod-csp.ts`); `apps/web` (barra y menú "Gestión", P-01,
cambio de PIN, `PinField`, iconos)), D-2.5-01..05 y las imágenes que usa
TESTING (`app`, `db`, `proxy`).

**Pruebas** (Podman 5.7.0 rootless; sin modificar código ni tests del
repositorio): (a) imagen reconstruida con `sh deploy/app/construir.sh` desde
el árbol limpio (HEAD `0b3c9f1`, que respecto a `0d7ca30` solo cambia
`docs/`): `localhost/mi-app:0b3c9f111c63` =
`APP_IMAGE=localhost/mi-app@sha256:66fcdf09d0b3757c57318e0d370803554937fbedbdb3ba92ff008dcb68ed5b06`,
sin `-sucio`; (b) `sh tests/run.sh unit`, `security`, `integration` y `e2e`
con esa imagen; (c) prueba propia: fichero de integración temporal (copiado a
`tests/integration/api/`, ejecutado con `sh tests/run.sh integration
<filtro>` y **borrado al terminar**; copia en el scratchpad de la sesión) con
`montarApp` (BD real de TESTING y *hasher* espía): escenarios A, B, C y A2 de
SEC-038, variantes Unicode del nombre, SSE tras la inactividad, tope de 50
flujos, `Cache-Control` y caracteres de control; (d) `lower()` de la imagen
`db` (PostgreSQL 19, `initdb --locale=C.UTF-8`) en un contenedor efímero sin
red con UID 70; (e) Trivy 0.76.2 por digest sobre `podman save` de las tres
imágenes (UID 1000, `cap-drop ALL`, raíz `ro`, `.tar` en `ro`), con el
fichero de EXC-01 para `app`; (f) `pnpm audit` y `pnpm audit --prod` en
contenedor endurecido con el repositorio en `ro`; (g) inspección de la raíz
exportada de la imagen (`index.html`, *bundle*, `.node`, `readelf -d`).

**1. SEC-038: VERIFICADO.** Los tres puntos de "Cómo corregir" están, con
otra forma que cumple RS-05b:
- IP (y sesión en `approval`): reserva **síncrona** en
  `FailureWindow.tryReserve` (`rate-limit.ts:54-64`) antes del primer `await`
  (`verify-pin.ts:216`); rechaza si `fallos en la ventana + en curso ≥
  límite`. Cada reserva se cierra una sola vez, como fallo o liberada
  (`settle`, `verify-pin.ts:240-251`; el `finally` de `:323-326` la libera si
  hay un error inesperado). Las reservas en curso van fuera de `entries`, así
  que `prune` no las borra.
- Cuenta: cerrojo FIFO por clave (`KeyedSerializer`, `serialize.ts:10-33`) y
  `load()` dentro del turno (`verify-pin.ts:256`): cada intento ve el bloqueo
  que dejó el anterior. **Salvedad:** la clave es `name.toLowerCase()` de JS y
  no coincide siempre con `lower()` de PostgreSQL (SEC-047, baja).
- Acierto: `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE
  id = … AND NOT locked_manual AND (locked_until IS NULL OR locked_until <=
  now)` y `onSuccess` (el `INSERT` de la sesión, o el `pin_hash` nuevo y la
  revocación) en la **misma transacción** (`verify-pin.ts:286-297`); 0 filas
  → *rollback* y `423` (`:301-313`). Como la condición la evalúa PostgreSQL
  con el bloqueo de fila, también cubre un fallo simultáneo que llegue por
  otro carril (lo confirma el caso D2 de SEC-047).
- Semáforo explícito de 4 operaciones argon2 (`serialize.ts:40-63`), también
  en `hashNewPin`.
- Resultados: RS-05b **4/4 en verde** (junit de la suite `integration`).
  Prueba propia (entre paréntesis, la 2.3): **A** 300 logins desde una IP,
  contador 0, PIN correcto el último → **5** verificaciones (300), `401`×5,
  `423`×5, `429`×290, el correcto `429` (`200` con cookie), **0 sesiones**,
  contador 5. **B** 300 desde IP distintas, contador 19 → **1** verificación,
  `423`×299, el correcto `423`, 0 sesiones, `locked_manual`. **C** 300
  `currentPin` desde IP distintas, contador 19 → **1** verificación, todas
  `423`, **el PIN no cambia** (`204`). **A2** 3000 logins desde una IP →
  **10** verificaciones (516) y 2990 `429`.
- Pendiente, sin bloquear: (i) SEC-047; (ii) del punto 4 falta la cola
  acotada del semáforo con `503` (D-2.5-03 a): por IP la cola ya está
  acotada (≤ 10 en curso), pero con muchas direcciones (SEC-043) puede crecer;
  se decide con SEC-043 (punto 4 de esta sección); (iii) la atomicidad aún no
  está en `docs/arquitectura.md` §7 (D-2.5-03 a, software-engineer).

**2. T-45: CORREGIDO sin relajar la CSP.** La CSP de
`deploy/proxy/Caddyfile:27` no ha cambiado desde la Etapa 1 (último commit
que toca el fichero: `7cc2f97`); no hay `unsafe-eval`, `unsafe-inline` ni
`wasm-unsafe-eval` en `deploy/` ni en `apps/`, y la app no pone una CSP
propia. La causa desaparece con H-2.3-11: `apps/web` solo importa **tipos**
de `@mi-app/shared/api` y las constantes de `api-constants.ts`, así que el
*bundle* de la imagen (`/app/public/assets/index-ChIbHF-X.js`) ya no lleva el
código de análisis de zod ni la sonda `new Function("")` (0 apariciones de
`Function(`); solo queda `config({ jitless: true })` de `zod-csp.ts`, que se
aprueba como defensa por si zod vuelve al cliente. `index.html` sin
*scripts* ni estilos en línea. e2e: `HU-01-csp` 4/4 (Chromium y WebKit,
incluido el control que inyecta un *script* y comprueba que el vigilante lo
registra); con el vigilante de CSP en todos los e2e, ver punto 7.

**3. SEC-039, SEC-040, SEC-041 y SEC-042: VERIFICADOS** con prueba propia
(las regresiones automáticas están pedidas a testing en D-2.5-02):
- SEC-039: `markExpired` llama a `hub.expire` (`guard.ts:57-58`); el hub
  guarda la última actividad de cada sesión con flujo (la actualiza `touch`
  de la guarda, solo en peticiones que cuentan, SEC-030) y en cada `ping`
  cierra con `expired` los flujos de roles distintos de `kitchen` con ≥ 15
  min sin actividad (`IDLE_TIMEOUT_MS` común en `session-policy.ts`). Prueba:
  camarero con flujo, +15 min sin peticiones → cerrado en **1,8 s** sin
  ninguna petición REST; otro camarero con `GET /auth/me` a los 10 min →
  sigue abierto; barra → sigue abierta.
- SEC-040: `canAccept` antes del `hijack` (`system.ts`) y `open` justo
  después, sin `await` entre medias (sin carrera). Prueba: 25 sesiones × 2 =
  50 flujos; el 51.º de otra sesión → `503 SERVICE_UNAVAILABLE`,
  `Retry-After: 5`, `cache-control: no-store`; el 3.º de una sesión con 50
  abiertos → `200` (sustituye a su más antiguo). `sse.rejected` sin datos
  sensibles.
- SEC-041: `onSend` común (`app.ts:171-177`). Prueba: `200` y `401` de
  `/auth/me` (también con *query string*), `401`, `400` y `429` del login,
  `404` de `GET` y `POST` a rutas inexistentes, `403` sin `Origin`, `403` de
  `POST /auth/pin` sin PIN provisional, `204` de `/session/activity` y del
  *logout* y el `503` del flujo → todas con `no-store`. El flujo SSE conserva
  `no-cache, no-transform` (`hijack`).
- SEC-042: `apiText` (`packages/shared/src/api.ts`) rechaza C0 y DEL.
  Prueba: `\u0000`, `\u0007`, `\n` y `\u007f` en `name` → `400
  VALIDATION_FAILED` con `[{ path: ['name'], rule: 'format' }]` y 0 líneas de
  nivel `error`; `\u0085`, ` ` y `​` → `401` normal (sin `500`).
  Para la regla general de texto (D-2.5-03 c, software-engineer) se
  recomienda rechazar además C1 (U+0080–U+009F), los controles
  bidireccionales (U+202A–U+202E, U+2066–U+2069) y U+2028/U+2029 en los
  campos que se muestran a otras personas (nombres de la rejilla, notas,
  motivos) y normalizar a NFC al guardar. No es hallazgo nuevo: hoy solo el
  encargado crea nombres.

**4. SEC-043: se acepta el aplazamiento** hasta la decisión del
software-engineer (D-2.5-03 d). Es baja, la 2.5 no la empeora (las reservas
en curso no las toca `prune`) y depende de que haya IPv6 hasta Caddy.
Condiciones: decidir y corregir **antes de empezar HU-06** (las aprobaciones
usan el mismo límite por IP) y, en todo caso, antes de la puerta de la
Etapa 3; en la misma decisión, el tope de la cola del semáforo argon2 (punto
1 (ii)), porque con muchas direcciones es lo único que acota esa cola.

**5. Cambios de UX (H-2.3-01..11): sin hallazgos.** El menú "Gestión" filtra
por `me.permissions` solo para pintar; la autorización sigue en la guarda del
servidor (RS-17/RS-18 en verde). Iconos SVG en JSX, sin `innerHTML`.
`PinField` sigue con `type="password"`, `autocomplete="off"` y filtro a
dígitos; `inputmode="none"` y los 6 indicadores no muestran nada que no
mostraran ya los puntos del campo (la longitud ya era visible) y el contador
"N de 6 dígitos" solo lo oye el lector de pantalla. "Reintentar" de P-01 solo
repite `GET /auth/login-options` (sujeto al bloqueo por IP). La gestión del
foco no tiene efectos de seguridad. Estático de RS-25 en verde.

**6. D-2.5-01..05.** D-2.5-01 (localizador de testing) y D-2.5-04 (UX): sin
implicaciones de seguridad. D-2.5-02: hace falta para que SEC-039..SEC-042
sigan verificados en cada ejecución (testing, baja). D-2.5-03: (a) atomicidad
**aprobada** con la salvedad de SEC-047; (b) `503 SERVICE_UNAVAILABLE` con
`Retry-After: 5` **aprobado**; (c) ver punto 3; (d) ver punto 4; (e)
`session-policy.ts` compartido **aprobado**. D-2.5-05: los eventos nuevos
(`sse.rejected`; `auth.verify.locked` también en el acierto con la cuenta ya
bloqueada) solo llevan identificadores, rol y motivo: **aprobado**.

**7. Suites con la imagen `sha256:66fcdf09…`.** `unit` 177/177; `security`
73 pasan + 241 omitidos por alcance; `integration` 254 pasan (incluidos los
4 de RS-05b) + 244 omitidos; `e2e`: partes normales **73 pasan, 1 falla** y 2
omitidos hasta HU-02, `serie-pin` 5/5, `serie-red` 1/1. El fallo es WebKit,
`tests/e2e/HU-01-iniciar-sesion.e2e.ts:396` (CA-N06, barra a las 12 h):
vuelve a P-01 sin el banner del motivo y el vigilante anota una violación
`style-src-elem` (estilo en línea bloqueado en `https://toxiproxy:8443/`,
origen `?:5:30`, muestra vacía). Repetido aislado 8 veces (4 Chromium y 4
WebKit) → 8/8 en verde. No sale del código de la app (sin `<style>` ni
`style=` en `apps/web`, *bundle* e `index.html` sin estilos en línea) y la
CSP hace lo que debe (bloquea). Se trata como intermitencia de la pila e2e
(posiblemente T-46) y se pasa a testing; no es un hallazgo de seguridad.

**8. Dependencias e imágenes.** `pnpm audit --prod` y `pnpm audit`: 0
vulnerabilidades (Vitest 4.1.12 exacto, sin `tinypool` 1.x): **SEC-044
verificado**. Trivy 0.76.2 (DB del 2026-11-26), solo `HIGH,CRITICAL`:
- `app` (`sha256:66fcdf09…`, distroless Debian 13.8): las 2 de EXC-01 como
  *suppressed* y **una alta nueva con corrección**, `libzstd1` 1.5.7+dfsg-1,
  CVE-2026-124851 → **SEC-048**. Condiciones 3 y 4 de SEC-033 siguen
  cumpliéndose (`/nodejs/bin/node` solo enlaza libc, libm, libdl,
  libpthread, libstdc++, libgcc_s y libatomic; ningún `.node` enlaza `libssl`
  ni `libcrypto`). Siguen los 10 `.node` de `argon2` de otras plataformas
  (SEC-046).
- `db` (`postgres:19.0-alpine`, Alpine 3.24.4): `libxml2` (1 alta con
  corrección) y `/usr/local/bin/gosu` (Go 1.24.6: 1 crítica y 25 altas, todas
  con corrección en Go) → **SEC-049**.
- `proxy` (`caddy:2.11.9-alpine`): 2 altas en `/usr/bin/caddy`
  (`go-jose/v3` sin corrección y `x/net` con corrección) → **SEC-050**.
- Es el **primer escaneo** de `db` y `proxy`: hasta ahora solo se había
  escaneado la imagen de la app (§6.7, §6.8). El escaneo de SEC-034 debe
  cubrir todas las imágenes desplegables, no solo la de la app.
- La imagen de esta revisión se construyó desde el commit, sin `-sucio`
  (SEC-037 sigue abierto como control del script).

**Altos o críticos en esta revisión:** SEC-038 **verificado**. Quedan
abiertos **SEC-048, SEC-049 y SEC-050** (alta, infrastructure, imágenes),
que **bloquean la puerta de la Etapa 2** por la regla de imágenes sin
vulnerabilidades críticas/altas, hasta actualizar los digests o, solo para lo
que no tenga corrección, aprobar una excepción fechada. El código de HU-01 no
tiene altos ni críticos abiertos.

### 6.10 Revisión 2.9 (2026-11-26): imágenes y escaneo de la 2.7/2.1n (commit `0af1331`)

Entradas: commit `0af1331` (`deploy/app/Containerfile`, `deploy/app/construir.sh`,
`deploy/app/trivyignore.yaml`, `deploy/dev/Containerfile`,
`deploy/scan/escanear.sh`, `deploy/scan/trivyignore-db.yaml`,
`deploy/scan/trivyignore-proxy.yaml`, `compose.dev.yaml`, `compose.test.yaml`,
`docs/infraestructura.md` §8, §8.2 y §14.1).

**Pruebas propias (Podman 5.7.0 rootless, sin `sudo`).** (1) `sh
deploy/app/construir.sh` sobre el árbol limpio de `0af1331` →
`localhost/mi-app:0af133152b01`,
`APP_IMAGE=localhost/mi-app@sha256:72766f8e58dc1ffcf127e047dc0831d79f93dd77a7f1b256538f5de5a5acb40b`
(código 0). (2) Trivy 0.76.2 (mismo digest que §8 de infraestructura) con una
caché nueva en el scratchpad (BD del 2026-11-26 13:14 UTC), **sin
excepciones** y con todas las severidades, sobre `podman save` de las tres
imágenes. (3) Pruebas negativas de `escanear.sh` y de `construir.sh` (este en
un clon del repositorio en el scratchpad, con etiqueta propia). (4) `nm` y
`strings` de `/usr/local/bin/gosu` y `/usr/bin/caddy` extraídos con `podman
cp`. (5) secdb, APKINDEX y APKBUILD de Alpine 3.23 y 3.24, Debian Security
Tracker, avisos de OpenSSL, releases y `go.mod` de Caddy, política de CVE de
`gosu`, versiones de Node. (6) `APP_IMAGE=… sh tests/run.sh containers` con
la imagen limpia: TX-CONT-01 y TX-CMD-01 **PASAN**. `govulncheck
-mode=binary` no se pudo ejecutar (permiso denegado en esta sesión): la
prueba de que el código vulnerable no está es la tabla de símbolos (punto 4).
Contenedores, imágenes de prueba y clon borrados o limitados al scratchpad.

**1. Escaneo real (Trivy, sin excepciones, `HIGH,CRITICAL`).**

| Imagen | Referencia | SO | Críticas / altas | Cubiertas por |
|---|---|---|---|---|
| app | `localhost/mi-app@sha256:72766f8e…` (base `nodejs26-debian13@sha256:13e3ac17…`) | Debian 13.8 | 0 / 2: `libssl3t64` 3.5.9-1~deb13u1, CVE-2026-107494 y CVE-2026-124709, sin corrección | EXC-01 |
| db | `postgres:19.0-alpine3.23@sha256:40ad7e45…` | Alpine 3.23.8 | 1 / 25, todas en `usr/local/bin/gosu` (`stdlib` v1.24.6) | EXC-02, **pero `libxml2` vulnerable no aparece (punto 3)** |
| proxy | `caddy:2.11.9-alpine@sha256:003a9780…` | Alpine 3.24.4 | 0 / 2 en `usr/bin/caddy`: `go-jose/v3` v3.0.5 (CVE-2026-116587, sin corrección) y `x/net` v0.60.0 (CVE-2026-78661, corregida en 0.62.0) | EXC-03 |

Medias y bajas (informativo, no bloquean): app 41/18, db 37/7, proxy 14/4.
Con los ficheros de excepciones las tres dan **0 sin excepción**, igual que
el build. Los 26 CVE de `trivyignore-db.yaml` coinciden exactamente con los
que da Trivy.

**2. SEC-048: VERIFICADO.** La imagen lleva `libzstd1`
1.5.7+dfsg-1+deb13u1 (`/var/lib/dpkg/status.d`). CVE-2026-124851 ya no sale.
`libssl3t64` sigue en 3.5.9-1~deb13u1 y Debian 13.8, así que el `purl` de
EXC-01 no cambia.

**3. `alpine3.23` en `db`: NO ACEPTABLE. No corrige `libxml2`, solo lo oculta
al escáner (SEC-049 sigue abierto; SEC-051).** En la imagen, `libxml2` está en
**2.13.9-r1**, más antigua que la 2.13.9-r2 vulnerable de 3.24, no en la r3
corregida. El repositorio de Alpine 3.23 no tiene nada más nuevo (APKINDEX
de `v3.23/main`: 2.13.9-r1). Su APKBUILD solo lleva el parche de
CVE-2026-6732, mientras que 3.24-stable está en **2.13.9-r5** con
CVE-2026-86144 (r3), CVE-2026-0990, -0992, -86137…-86143 (r4) y
CVE-2026-0989, -11979, -1757 (r5). Para Alpine, Trivy solo conoce lo que la
secdb de la rama da por **corregido**: Alpine no registra "afectado sin
corrección", así que una rama que no ha portado el parche sale limpia. Con
la BD de hoy, la imagen 3.24 anterior (`8b0ff4cd…`) da CVE-2026-86144 HIGH
(revelación de información, SSRF o DoS por un análisis incorrecto), corregida
en r3; la 3.23 tiene el mismo código sin parche y da 0. El riesgo real sigue
siendo bajo: solo se llega con SQL arbitrario como `app_rw` a las funciones
XML (la app no las usa y no construye SQL a mano, RS-35). Pero es una alta
con corrección publicada en la rama actual: no admite excepción. Como
Alpine 3.23 sigue con soporte (EOL 2027-11-01), el problema no es la
caducidad sino que la rama va por detrás en las correcciones.

**4. EXC-02 (`gosu`, SEC-049): APROBADA como puente hasta el 2026-12-26, NO
PRORROGABLE. La solución definitiva es la imagen derivada sin `gosu`, y la
recomiendo ya.** La imagen derivada también resuelve `libxml2` (punto 3) en
el mismo paso.
- **Alcance:** solo los 26 CVE listados, solo la ruta `usr/local/bin/gosu` y
  solo `pkg:golang/stdlib@v1.24.6`. Probado: con `expired_at` pasado, con
  otra ruta o sin fichero, el escaneo falla (código 1).
- **Justificación: el código vulnerable no está en el binario.** `gosu`
  (1.20, Go 1.24.6, sin *strip*) enlaza solo `runtime`, `os`, `os/exec`,
  `syscall`, `fmt`, `reflect`, `strconv`, `time`, `io/fs`, `path/filepath`,
  `github.com/moby/sys/user` y `golang.org/x/sys/unix`. Tiene **0 símbolos**
  de `crypto/tls`, `crypto/x509`, `net`, `net/http`, `net/url`, `net/mail`,
  `mime`, `encoding/xml`, `encoding/asn1`, `html/template`, `x/net/idna` y
  `os.Root`, que son los paquetes de los 26 CVE (la crítica, CVE-2025-68121,
  está en `crypto/tls`). Trivy marca por versión de Go, no por código
  enlazado. Además, `gosu` no se ejecuta: `docker-entrypoint.sh:341-343` solo
  hace `exec gosu` si `id -u` = 0, y todos los `db` corren con `1000:1000`
  (TX-CONT-01 PASA hoy). No es *setuid* (`-rwxr-xr-x root:root`) y la imagen
  no tiene ningún binario *setuid*/*setgid*. Con `cap_drop: ALL` y
  `no-new-privileges` tampoco podría cambiar de usuario.
- **Por qué no se prorroga:** `gosu` 1.20 (2026-10-25) se compiló con Go
  1.24.6, y su `SECURITY.md` dice que no recompila por CVE de Go que no
  afectan al binario. Estas CVE no van a desaparecer al actualizar la imagen
  oficial, y una excepción que se renueva cada mes indefinidamente, con una
  crítica dentro, no es aceptable.
- **Condiciones (si falla una, la excepción decae):** (1) ningún `db` de
  DEV/TESTING/DEMO/PROD arranca como root ni con capacidades (`user:
  1000:1000`, `cap_drop: ALL`, `no-new-privileges`; en Quadlet `User=`,
  `DropCapability=ALL`, `NoNewPrivileges=true`); (2) ningún compose o Quadlet
  llama a `gosu` (`construir.sh` ya lo comprueba en los compose); (3) si
  cambia el digest de `db`, Infrastructure repite `nm` sobre `gosu` y lo deja
  en `docs/infraestructura.md` §8.2: si aparece un paquete afectado, decae su
  entrada; (4) no cubre nada del sistema operativo de la imagen.
- **Imagen derivada (antes del 2026-12-26 y en todo caso antes de DEMO):**
  `FROM postgres:19.0-alpine3.24@sha256:<actual>`, `apk upgrade --no-cache
  libxml2` (comprobar que queda ≥ 2.13.9-r3), `rm -f /usr/local/bin/gosu`,
  `USER 1000:1000` y `HEALTHCHECK`, construida en rootless por un script que
  la escanea con la misma política que la app y referenciada por digest en
  todos los compose y en Quadlet. Con ella EXC-02 se retira y SEC-049 se
  cierra.

**5. EXC-03 (Caddy, SEC-050): APROBADA hasta el 2026-12-26 o 7 días después
de que salga un Caddy corregido, lo que llegue antes. `xcaddy` no hace falta.**
- **No hay versión corregida publicada:** la última versión en GitHub es
  v2.11.9 (2026-11-05). En Docker Hub no hay 2.11.10, 2.12 ni beta (`latest`
  = 2.11.9, 2026-11-16). El `go.mod` de v2.11.9 lleva `x/net` v0.60.0 y
  `go-jose/v3` v3.0.5 (indirecta, por `smallstep/certificates` v0.30.2). El
  de `master` ya lleva `x/net` v0.62.0 y **no** lleva `go-jose/v3`, así que la
  próxima versión debería corregir las dos.
- **Alcance:** CVE-2026-116587 solo con
  `pkg:golang/github.com/go-jose/go-jose/v3@v3.0.5` y CVE-2026-78661 solo con
  `pkg:golang/golang.org/x/net@v0.60.0`, las dos solo en `usr/bin/caddy`.
  Probado: con otro `purl` o sin fichero, el escaneo falla.
- **Justificación:** el binario sí enlaza `go-jose/v3` (442 funciones, vía
  `smallstep/certificates`: `acmeserver`, provisioners) y `x/net/html` (129,
  usado por el módulo `templates`, p. ej. `funcStripHTML`). Pero la DoS de
  `go-jose` exige que Caddy analice un JWK del atacante. Eso solo pasa con
  `acme_server` (JWS de clientes ACME) o con provisioners configurados, y
  aquí no hay ninguno de los dos. El cliente ACME de PROD (`acmez`) tiene su
  propio JWS y no recibe JWK de la CA. `x/net/html` solo se usa con
  `templates`. El Caddyfile solo usa `tls`, `header`, `log`,
  `request_header`, `respond`, `reverse_proxy` y `redir`, y `reverse_proxy`
  no analiza cuerpos. La configuración es inmutable (`admin off`, Caddyfile
  montado `ro`).
- **Por qué no `xcaddy`:** supone una cadena de construcción propia (Go,
  resolución de módulos) que habría que mantener y escanear, y perder la
  imagen oficial. No compensa para una DoS que no es alcanzable con esta
  configuración y cuya corrección ya está en `master`.
- **Condiciones:** (1) el Caddyfile tiene `admin off` y no tiene
  `acme_server`, `templates` ni `markdown`; se usa la imagen oficial por
  digest, sin módulos añadidos; DEMO y PROD usan el mismo Caddyfile; (2)
  **comprobación automática en el build antes de la puerta de la Etapa 2
  (SEC-054)**. El fichero y §8.2 dicen que la hace `tests/run.sh containers`,
  y no es así. Hasta entonces Cybersecurity revisa cada cambio del Caddyfile
  (hoy cumple); (3) decae si un aviso amplía el alcance (p. ej. al cliente
  ACME o a TLS), si hay *exploit* público o si entra en KEV; (4) al salir el
  Caddy corregido, se actualiza el digest en ≤ 7 días y se retira la entrada.
  Solo se puede prorrogar una vez, 30 días, si en la caducidad no hay versión
  corregida y con una nueva revisión de Cybersecurity.

**6. EXC-01: SIGUE VIGENTE.** El Debian Security Tracker da las dos CVE como
`vulnerable` en trixie (3.5.9-1~deb13u1) y sin corrección en sid. OpenSSL
las clasifica **Low** (avisos del 2026-11-17 y del 2026-11-24) y las corrige en
3.5.10, que aún no ha salido (la última es 3.5.9, de 2026-09-29). Node
26.13.1 (2026-11-10, OpenSSL 3.5.9) sigue siendo la última de la rama 26. El
`purl` no cambia (`debian-13.8`). Las condiciones 3 y 4 las comprueba
`construir.sh` en cada build (`node_use_quic=false`, `dist` sin
`node:quic`/`dgram`, 10 `.node` sin `libssl`/`libcrypto` ni símbolos QUIC).
Cuando salga OpenSSL 3.5.10, hay que vigilar Debian y Node (condiciones 1 y
2). Siguen pendientes la revisión del 2026-12-08 y la ratificación humana.

**7. Escaneo en el build y controles (SEC-033..SEC-037).**

| Control | Prueba | Resultado |
|---|---|---|
| SEC-034: escaneo de app, db y proxy en `construir.sh` | build limpio: 3 escaneos y 3 informes JSON, `APP_IMAGE` impreso. Clon sin `deploy/app/trivyignore.yaml`: código 1, "La imagen NO se acepta", **sin `APP_IMAGE`**. `escanear.sh`: sin excepciones (db, proxy), con excepción caducada, con otra ruta o con otro `purl` → código 1; un fallo de Trivy da código 2. `--ignore-unfixed` no se usa. db y proxy se leen por digest de `compose.test.yaml` (si no son únicas, falla) y se comparan con DEV | **Verificado** (huecos en SEC-052 y SEC-053) |
| Contenedor de Trivy | `podman inspect` durante el escaneo: `User=1000:1000` (en el host, el usuario sin privilegios), `EffectiveCaps=[]`, `CapAdd=[]`, `no-new-privileges`, raíz `ro`, `Privileged=false`, red `pasta`; montajes: caché (rw), `.tar` (ro), excepciones (ro), informe (rw); **sin socket** de Podman/Docker; Trivy fijado por digest | **Cumple §3.4** |
| SEC-033 condiciones 3 y 4 | salida del build: `node_use_quic=false`, 10 `.node` sin `libssl`/`libcrypto` ni QUIC | Cumple (falla abierta sin binutils: SEC-053) |
| `pnpm audit --prod --audit-level high` | en el `Containerfile`; en el build limpio su capa vino de caché, así que **no se ejecutó**. Trivy analiza en cada build los `package.json` de `node_modules` (`node-pkg`): 0 | Cumple con matiz (SEC-053) |
| SEC-035 | `PNPM_INTEGRITY` = `dist.integrity` de `pnpm@12.21.0` en el registro; build con `--build-arg PNPM_INTEGRITY=sha512-AAAA` → falla en ese paso con el mensaje de SEC-035; mismo valor en `deploy/dev/Containerfile` | **Verificado** |
| SEC-036 | `.npmrc` señuelo con `_authToken` en `apps/api/` → el build falla con el mensaje de SEC-036 y el valor no aparece en el log (0 coincidencias); la comprobación final mira `.npmrc`, `.env*`, `*.pem` y `*.key` en `/app` | **Verificado** |
| SEC-037 | clon limpio → `0af133152b01`; `tsconfig` nuevo, `tests/package.json` cambiado, fichero nuevo en `apps/`, `.npmrc` en `apps/api/` y fichero en `packages/` → `-sucio`; el script sigue sin aceptar `--build-arg` | **Verificado** |
| ¿Se puede saltar el escaneo? | `TRIVY_IMAGE` se puede sobrescribir por entorno; `tests/run.sh` acepta cualquier `APP_IMAGE`; la app se escanea por etiqueta | SEC-052 (media) |
| Rechazo | `podman untag` sin nombre quita **todos** los nombres: la etiqueta `-rechazada` no existe (probado) | SEC-053 (baja) |

Notas sin hallazgo: la imagen buena es `localhost/mi-app:0af133152b01`
(`sha256:72766f8e…`), construida desde el commit, sin `-sucio`, y es la que
debe usarse para la puerta. En esta máquina las suites `integration` y `e2e`
las ejecutó infrastructure con la imagen `-sucio` (`377daf74…`), que tiene
otro ID; aquí solo se repitió `containers`. Para la puerta, testing debe
repetir `integration` y `e2e` con `sha256:72766f8e…`. Mientras probaba la lógica `-sucio`, por un fallo mío al
crear el clon, se ejecutaron en el repositorio real comandos de crear y
borrar ficheros temporales (`tsconfig.prueba.json`, `apps/api/src/zz.log`,
`apps/api/.env.local`) y un cambio de `tests/package.json` que se deshizo con
`git checkout`. `git status` quedó limpio y ningún fichero del proyecto hace
referencia a `apps/api/.env.local`.

**Altos o críticos en esta revisión:** SEC-048 **verificado**. SEC-050 queda
con riesgo aceptado (EXC-03, con la condición de SEC-054 antes de la puerta).
**SEC-049 sigue abierto (alta) y bloquea la puerta de la Etapa 2**: `gosu`
está cubierto por EXC-02, pero `libxml2` sigue vulnerable en `alpine3.23`
(punto 3). La salida es la imagen derivada sobre `alpine3.24` (punto 4), o
un `postgres:19.x-alpine3.24` oficial con `libxml2` ≥ 2.13.9-r3 cuando
exista. Las tres excepciones (EXC-01, EXC-02 y EXC-03) son excepciones a
`docs/reglas-equipo.md` §3.3: el Orquestador debe comunicárselas al humano
para que las ratifique en la puerta.

### 6.11 Revisión 2.10b (2026-11-26): imagen derivada de db y comprobaciones de la 2.10 (commit `cf84f81`)

Entradas: commit `cf84f81` (`deploy/db/Containerfile`, `deploy/db/construir.sh`,
`deploy/scan/comprobar-excepciones.sh`, `deploy/scan/escanear.sh`,
`deploy/app/construir.sh`, `deploy/app/Containerfile`, `deploy/dev/levantar.sh`,
`compose.dev.yaml`, `compose.test.yaml`, `docs/infraestructura.md` §8, §8.2 y
§14.1).

**Pruebas propias (Podman 5.7.0 rootless, sin `sudo`; todas en un clon y en
copias dentro del scratchpad, fuera del repositorio, con el directorio
comprobado antes de cada comando).** (1) Inspección de la imagen de
infrastructure `localhost/mi-app-db:19.0-alpine3.24` (`sha256:b5bd1672…`, ID
`8e81ed119360`) y de una construida por mí desde el `Containerfile` del clon
con otra etiqueta (`podman build --no-cache`). (2) Trivy 0.76.2 (mismo digest)
con una caché nueva en el scratchpad (BD del 2026-11-26 13:14 UTC), **sin
excepciones y con todas las severidades**, sobre las dos imágenes derivadas y
sobre la base `8e81a484…`. (3) Comparación de los paquetes instalados con el
`APKINDEX` de `v3.24/main` y `community`, la secdb de 3.24 y el historial de
`aports` (rama `3.24-stable`), en db y en proxy. (4) 12 mutaciones directas y
10 indirectas de `comprobar-excepciones.sh`, y `caddy adapt` (Caddy 2.11.9 por
digest, contenedor endurecido, `--network none`) sobre las que pasaban. (5)
Pruebas aisladas de SEC-053: bloque `readelf`/`nm` con un `PATH` sin binutils
y con `.node` falsos, `rechazar()`/`fallo()` sobre etiquetas de prueba, y caché
de Buildah con un `ARG` que cambia. (6) `escanear.sh` con `TRIVY_IMAGE` falso.
(7) Arranque de la imagen derivada endurecida (`--user 1000:1000`,
`--cap-drop=ALL`, `no-new-privileges`, `--read-only`, sin red): *healthy*,
`podman top` → HUSER 100999 (subuid, no root), `EffectiveCaps=[]`. Imágenes,
etiquetas y contenedores de prueba borrados por nombre; la imagen y el
registro de infrastructure no se tocaron.

**1. Imagen derivada de db: `gosu` y `libxml2` corregidos (SEC-049 y SEC-051
VERIFICADOS), pero quedan `zstd` y `libffi` atrasados que Trivy no ve
(SEC-055).**

| Comprobación | Imagen de infrastructure (`b5bd1672…`) | Mi build desde el clon |
|---|---|---|
| Base | `postgres:19.0-alpine3.24@sha256:8e81a484…` (índice; mismo ID `44b6eb1a…` que el manifiesto `8b0ff4cd…` de la 2.9) | igual |
| `/etc/alpine-release` | 3.24.4 | 3.24.4 |
| `libxml2` | 2.13.9-r5 (secdb: r3 CVE-2026-86144; r4 y r5 las demás) | 2.13.9-r5 |
| `/usr/local/bin/gosu`, `su-exec`, `su`, `sudo` | no existen | no existen |
| Binarios *setuid*/*setgid* | ninguno | ninguno |
| `Config.User` / `HEALTHCHECK` | `1000:1000` / `pg_isready` | igual |
| Trivy sin excepciones, todas las severidades | **0** (solo objetivo `alpine`; ya no hay `gobinary`) | **0** |
| Base `8e81a484…` (referencia) | 1 crítica y 26 altas en `gosu`, CVE-2026-86144 en `libxml2` r2, 31 medias | — |
| Paquetes por detrás del repositorio 3.24 | `libffi` 3.5.2-r1 (repo 3.8.1-r0), `zstd`/`zstd-libs` 1.5.7-r2 (repo 1.6.0-r1) | igual |

Las dos construcciones dan el mismo contenido (mismos 52 paquetes) con
distinto digest, como dice §8.2.
- `zstd`: el commit de `aports` `8a1928ad` (2026-11-24) es "main/zstd:
  **security upgrade** to 1.6.0", sin entrada en `secfixes`. El Debian Security
  Tracker da CVE-2026-124851 (la de SEC-048) como "Zstandard **1.5.1 through
  1.5.7**", corregida en v1.6.0 (commit `0c9d2975`). Trivy no la marca en
  Alpine porque la secdb de 3.24 no la registra. En db enlazan `libzstd`
  `postgres`, `pg_dump`, `pg_restore`, `pg_basebackup`, `pg_receivewal`,
  `pg_rewind`, `pg_verifybackup`, `pg_waldump`, `llvmjit.so` y `libcurl`.
  → **SEC-055 (alta)**.
- `libffi`: "security upgrade to 3.8.1" (`4dd2037b`, 2026-11-23). Los avisos de
  3.8.1 (17 GHSA) son medios o bajos, locales y de alta complejidad, y casi
  todos de otras arquitecturas. Solo lo enlazan `llvmjit.so`/`libLLVM`. No
  bloquea, pero se corrige con lo mismo que SEC-055.
- La regla de SEC-051 (solo la rama más reciente) es necesaria pero **no
  suficiente**: incluso en la rama actual, Alpine publica "security upgrades"
  sin anotar la CVE, y Trivy da 0. La comprobación que cierra el hueco funciona
  sin root: `apk --no-cache version -l '<'` como UID 1000, con raíz de solo
  lectura y red, lista exactamente los paquetes atrasados (probado en db y en
  proxy).

**2. Reproducibilidad e imagen local con `pull_policy: never`: aceptable para
DEV/TESTING, con condiciones para la puerta y para DEMO.**
- *No reproducible bit a bit:* no es un riesgo de seguridad en sí. Que cada
  build traiga los paquetes del día es lo que queremos (justo lo que falta con
  `zstd`). El riesgo es de **trazabilidad**: dos builds del mismo commit dan
  digests distintos, así que "lo probado" solo se puede identificar por
  digest. Por eso: (a) la puerta se aprueba con un digest de db concreto, que
  es el que debe constar en el registro de escaneo (SEC-052); (b) DEMO y PROD
  **no reconstruyen**: reciben esa misma imagen (`podman save`/`load` con
  sha256 comprobado, o un registro privado) y la referencian **por digest**
  (`localhost/mi-app-db@sha256:…`), como pedía §6.10 punto 4.
- *Etiqueta local mutable:* `compose.dev.yaml` y `compose.test.yaml` usan
  `localhost/mi-app-db:19.0-alpine3.24` sin digest. Cualquier `sh
  deploy/db/construir.sh` (lo lanza `levantar.sh` si falta la imagen) mueve la
  etiqueta a una imagen **sin escanear**, y `tests/run.sh` la usaría. En DEV no
  importa. En TESTING sí, porque es la ejecución de la puerta → requisito
  nuevo del punto 3 de SEC-052.
- *`pull_policy: never`:* es un control **positivo**: impide que Podman intente
  descargar `localhost/mi-app-db` de un registro (p. ej. algo escuchando en
  `localhost`). Si la imagen falta, el `up` falla cerrado. Sin hallazgo.
- `fallo()` de `deploy/db/construir.sh` crea `-rechazada` y quita la etiqueta.
  Como `podman build -t` ya la había movido, tras un fallo no queda ninguna
  imagen de db etiquetada y los compose fallan cerrados. Correcto.

**3. `comprobar-excepciones.sh` (SEC-054): las comprobaciones directas
funcionan, pero se puede esquivar por caminos indirectos (SEC-056).**

Mutaciones directas, todas **fallan** (código 1, mensaje claro): `templates`,
`acme_server`, `Markdown` en mayúsculas, `admin localhost:2019`, `admin`
duplicado, `import /srv/extra.caddy`, `command` en `proxy`, otro Caddyfile
montado, `gosu` en el `entrypoint` de `db`, imagen `localhost/caddy-mod`, sin
Caddyfile. `templates` dentro de un comentario pasa, como debe. El
Caddyfile actual cumple, y `caddy adapt` lo confirma: `admin.disabled=true`,
sin *handlers* `templates` ni `acme_server`.

Mutaciones indirectas, todas **pasan** (código 0):

| # | Mutación | ¿Efecto real? |
|---|---|---|
| M1 | otro servicio con la imagen de Caddy (`borde`), `command: caddy run --config /x/Caddyfile` y otro montaje | sí: solo se revisa un servicio que se llame `proxy` |
| M2 | renombrar `proxy` a `edge-proxy` y añadir `--resume` | sí |
| M3 | `CADDY_TLS: "internal\n\ttemplates\n\tacme_server"` en el `environment` del proxy, **sin tocar el Caddyfile** | **sí, probado con `caddy adapt`**: Caddy sustituye `{$VAR}` antes de analizar, así que la configuración resultante tiene los *handlers* `templates` y `acme_server` |
| M4 | quitar `admin off` de las opciones globales y ponerlo en un snippet que no se importa | **sí, probado**: `admin` queda sin valor, es decir, la API de administración activa en `localhost:2019` |
| M5 | montar `./otro:/etc:ro` en el proxy | sí: `/etc/caddy/Caddyfile` sería `./otro/caddy/Caddyfile` |
| M6 | `command` en un ancla YAML (`<<: [*hardening, *borde]`) | sí: el script lee el texto, no la configuración resuelta |
| M7 | `import security_headers*` (el nombre se usa como regex) | no (Caddy avisa "No files matching import glob pattern"), pero la comparación no es literal |
| M8 | `deploy/quadlet/proxy.container` con `Volume=` de otro Caddyfile | sí (solo se miran `Exec=`/`Entrypoint=`) |
| M9 | `env_file:` en el proxy | sí (vía M3) |
| M10 | otro digest de `docker.io/library/caddy` | no es un fallo del script: el escaneo de `construir.sh` lo cubre; EXC-03 se aprobó para el digest `003a9780…` |

Además, el comentario de `deploy/scan/trivyignore-proxy.yaml:10` sigue diciendo
que la comprobación está "PENDIENTE". Valoración: el objetivo de SEC-054 para
la puerta (que un cambio del Caddyfile que haga alcanzables `go-jose` o
`x/net/html` falle en el build) **se cumple**. Las vías indirectas exigen un
cambio deliberado del compose o del entorno, y Cybersecurity revisa cada
entrega. Las paso a **SEC-056 (media)**, con plazo antes de crear
`compose.demo.yaml`/Quadlet. EXC-03 sigue vigente.

**4. SEC-053: VERIFICADO.**
- `readelf`/`nm`: con un `PATH` sin binutils → "SEC-053: faltan readelf o nm",
  código 1. Un `.node` ELF que enlaza `libcrypto` → rechaza. Un ELF truncado →
  rechaza ("nm fallo"). Un nombre con espacios se lee bien (`while IFS= read
  -r`). Un PE falso (`MZ…`, como el prebuild `win32` de argon2) se cuenta y se
  omite. Omitirlo es correcto: Linux no puede cargar un PE ni un Mach-O.
- `-rechazada`: con dos etiquetas sobre el mismo ID, `rechazar()` crea
  `<etiqueta>-rechazada`, quita solo la original y conserva la otra. Una
  segunda vez sobre `-rechazada` no la duplica. `fallo()` de db, igual.
- `pnpm audit`: Buildah 1.42 (Podman 5.7.0) reutiliza la caché del `RUN` si el
  `ARG` no cambia y lo repite si cambia (probado). `construir.sh` pasa
  `AUDIT_NONCE=$(date +%s)-$$`, y la capa está en la etapa `build`, de la que
  copia la final (`COPY --from=build`), así que no se salta.

**5. SEC-052: puntos 1 y 2 VERIFICADOS; punto 3 pendiente, con requisitos
nuevos.**
- (1) `TRIVY_IMAGE=docker.io/library/alpine:3.24 sh deploy/scan/escanear.sh …`
  → usa `aquasec/trivy@sha256:8f6bb947…` y lo muestra. Queda un hueco de la
  misma clase: `TRIVY_CACHE_DIR` sí se respeta (probado), y en esa caché está
  la BD de vulnerabilidades. Una caché con una BD antigua o manipulada, con
  `NextUpdate` futuro, haría que Trivy no la actualizara. Además, el escaneo
  no muestra ni limita la antigüedad de la BD. Es baja, y va dentro de SEC-052.
- (2) La app se escanea como `"$REPO@$DIGEST"` (`construir.sh:183`) y la db
  por el digest de su etiqueta (`:167-168`). Correcto.
- (3) El registro `aprobadas/<digest>` se escribe, pero lo que hay hoy en esta
  máquina muestra que hoy no serviría para la puerta tal cual. El único
  registro es el de `19d162e3…`, que es la imagen
  `localhost/mi-app:41b104074c43-sucio`, y esa misma imagen tiene también la
  etiqueta `-rechazada`. Un rechazo no borra el registro. Builds de clones o
  de árboles `-sucio` (incluso con ficheros de excepciones cambiados)
  escriben en el mismo registro. Y el registro no comprueba que la db
  etiquetada siga siendo la escaneada. Detalle en SEC-052.

**6. Escaneo y estado de las otras imágenes.** El proxy (Caddy oficial, Alpine
3.24.4) tiene el mismo punto ciego: `zstd-libs` 1.5.7-r2 (solo lo usa
`curl`/`libcurl`, y nada ejecuta `curl`: el healthcheck usa el `wget` de
busybox), además de `libssl3`/`libcrypto3` 3.5.9-r0 y `zlib` 1.3.2-r1 (estas sí
las ve Trivy: medias y bajas) → SEC-055. App: sin cambios respecto a la 2.9
(EXC-01). El propio PostgreSQL (19.0, compilado desde el código fuente en la
imagen oficial) no lo analiza Trivy: hoy es la última versión (19.0, del
2026-11-19, según `versions.json`) y no tiene avisos propios → SEC-057 (baja).

**Altos o críticos en esta revisión:** SEC-049 **verificado** (EXC-02 retirada,
sin excepciones en db). SEC-050 sigue con riesgo aceptado (EXC-03; la
condición SEC-054 para la puerta se cumple). **Nuevo SEC-055 (alta): bloquea
la puerta de la Etapa 2** hasta que db y proxy lleven `zstd-libs` ≥ 1.6.0-r1
y el build compruebe que ningún paquete Alpine va por detrás de su rama. La
corrección es pequeña (una tarea de infrastructure). Después, testing debe
repetir `integration` y `e2e` con las imágenes resultantes (2.11).

### 6.12 Revisión 2.10d (2026-11-26): SEC-055, proxy derivado y registro de aprobadas (commit `46458cb`)

Entradas: commit `46458cb` (`deploy/db/Containerfile`, `deploy/db/construir.sh`,
`deploy/proxy/Containerfile`, `deploy/proxy/construir.sh`,
`deploy/app/construir.sh`, `deploy/scan/comprobar-excepciones.sh`,
`deploy/dev/levantar.sh`, `compose.test.yaml`, `docs/infraestructura.md` §8,
§8.2 y §14.1). Es el 3.er y último ciclo de retroceso de las imágenes de
HU-01 (`docs/estado.md`): lo que sigue indica, para cada punto, si bloquea la
puerta de la Etapa 2 o va antes de DEMO.

**Pruebas propias (Podman 5.7.0 rootless, sin `sudo`).** Todas fuera del
repositorio, en el scratchpad, con el directorio comprobado antes de cada
comando: (1) inspección de las imágenes de infrastructure (db
`sha256:99b42f80…`, proxy `sha256:db29498f…`, app `sha256:9be1188a…`) en
contenedores endurecidos (UID 1000, `--cap-drop=ALL`, `no-new-privileges`,
`--read-only`); (2) Trivy 0.76.2 (mismo digest `8f6bb947…`) con una caché
nueva (BD `UpdatedAt` 2026-11-26 13:14 UTC), **sin excepciones y con todas las
severidades**, sobre db, proxy, app y la base oficial de Caddy;
(3) `podman image diff` y capas del proxy frente a `caddy@sha256:003a9780…`,
`getcap`, `caddy version` y `caddy list-modules`; (4) arranque endurecido de db
y proxy (*healthy*, `podman top`, `/proc/1/status`); (5) un **clon del commit
`c39d1e9` y un almacén de Podman aislado** (`CONTAINERS_STORAGE_CONF` propio):
así los builds de prueba no movieron las etiquetas fijas
`localhost/mi-app-db:19.0-alpine3.24` ni `localhost/mi-app-proxy:2.11.9-alpine`
de infrastructure ni tocaron su registro (`SCAN_DIR` propio). Allí, 7
ejecuciones reales de `deploy/app/construir.sh` (T1–T6) y 2 de
`deploy/proxy/construir.sh` con el `Containerfile` mutado; (6) 22 mutaciones de
`comprobar-excepciones.sh` sobre copias del commit. Contenedores, imágenes,
almacenes y clones de prueba borrados al terminar; las imágenes y el registro
de infrastructure no se tocaron.

**1. SEC-055: VERIFICADO.**

| Comprobación | db `99b42f80…` | proxy `db29498f…` | Base oficial `caddy@003a9780…` (referencia) |
|---|---|---|---|
| `/etc/alpine-release` | 3.24.4 | 3.24.4 | 3.24.4 |
| `zstd-libs` (y `zstd`) | 1.6.0-r1 (y 1.6.0-r1) | 1.6.0-r1 | 1.5.7-r2 |
| `libxml2` / `libffi` | 2.13.9-r5 / 3.8.1-r0 | — | — |
| `libssl3`/`libcrypto3`, `zlib` | 3.5.9-r1, 1.4-r0 | 3.5.9-r1, 1.4-r0 | 3.5.9-r0, 1.3.2-r1 |
| `apk --no-cache version -l '<'` (UID 1000, raíz de solo lectura) | solo la cabecera, código 0 | solo la cabecera, código 0 | 4 atrasados (`libcrypto3`, `libssl3`, `zlib`, `zstd-libs`) |
| `gosu`, `su-exec`, `sudo`; binarios *setuid*/*setgid* | no existen; ninguno | no existen; ninguno | — |
| `Config.User` / `HEALTHCHECK` | `1000:1000` / `pg_isready` | `1000:1000` / en el compose (`wget` de busybox a `:9180`) | *(vacío = root)* / — |
| Trivy, sin excepciones, todas las severidades | **0** (solo objetivo `alpine`) | `alpine`: **0**; `usr/bin/caddy`: las 2 altas de EXC-03 + 7 medias + 1 desconocida | `alpine`: 7 medias y 4 bajas; `caddy`: igual |
| Arranque endurecido | *healthy*; `CapEff=0`, `NoNewPrivs=1`; `postgres` 19.0 enlaza `libzstd.so.1` 1.6.0 | *healthy* (`/health` 200); `CapEff=0`, `CapBnd=0`, `NoNewPrivs=1`; `:2019` cerrado | — |

App `9be1188a…`: sin cambios (solo las 2 altas de EXC-01 en `libssl3t64`).
`podman top` muestra HUSER = UID 1000 del host (los compose usan `keep-id`),
nunca root. Un build mío desde un clon limpio del commit (T1) da las mismas
versiones, el mismo `caddy` y Trivy OK en las tres. Las comprobaciones de
paquetes atrasados están en los dos sitios que pedía SEC-055: en el `RUN` de
cada `Containerfile` y otra vez en cada `construir.sh` sobre la imagen final,
como UID 1000 y con fallo cerrado si `apk` no lee el índice.

**2. Proxy derivado: correcto. EXC-03 sigue aplicando.**
- *Binario idéntico:* sha256 de `/usr/bin/caddy` = `a563843e…` en la oficial,
  en la derivada de infrastructure y en la mía. Las 5 capas de la base son las
  mismas (mismos digests) y hay una sola capa nueva. `podman image diff` frente
  a la base da 33 entradas, todas de `apk` (`libzstd`, `libz`, `libssl`,
  `libcrypto`, `engines-3`, `ossl-modules`, `/lib/apk/db`, certificados y
  `apk.log`), y **ninguna** en `/usr/bin/caddy`, `/etc/caddy`, `/config` ni
  `/data`. Iguales también `caddy version` (`v2.11.9 h1:bhZtcRKQ…`), los 137
  módulos, `getcap` (`cap_net_bind_service=p`, sin bit *effective*: SEC-009
  sigue verificado), `Entrypoint`/`Cmd`, `Env` y `/etc/apk/world`. En el clon,
  un `RUN cp /bin/busybox /usr/bin/caddy` lo **rechaza** `deploy/proxy/construir.sh`
  (sha256 distinto, etiqueta `-rechazada`).
- *De root a 1000:* es una mejora. La oficial no tiene `USER`, así que
  corre como root si alguien la lanza sin `--user`. La derivada fija
  `1000:1000`, y los compose ya fijaban `user: 1000:1000` y `keep-id`.
  `/usr/bin/caddy` pertenece a 1001:1001 (de la oficial), así que el proceso
  (UID 1000) no puede escribirlo, y además la raíz es de solo lectura. Sin
  hallazgo.
- *`curl`/`libcurl` 8.23.0-r0:* actualizados y sin avisos. Nada los ejecuta (el
  healthcheck usa el `wget` de busybox, que también está). Quitar `curl` (§3.2,
  "solo lo necesario") reduciría superficie y avisos futuros, pero
  `comprobar-excepciones.sh` prohíbe ahora `apk del`. Lo acepto así. Si algún
  día `curl` trae una alta sin corrección, se quita con un `apk del curl` literal
  que el script permita de forma explícita. Sin hallazgo.
- *EXC-03:* el binario es el mismo, tiene las mismas 2 altas (`go-jose/v3`
  v3.0.5 sin corrección, `x/net` v0.60.0) y no hay ningún Caddy posterior
  publicado: la última etiqueta de `docker.io/library/caddy` el 2026-11-26 sigue
  siendo `2.11.9`/`2.11.9-alpine`. El Caddyfile no cambia. La condición "imagen
  oficial por digest, sin módulos añadidos" pasa a ser "**derivada de la
  oficial por digest, con `/usr/bin/caddy` idéntico (sha256) y la misma
  configuración de arranque (`Entrypoint`/`Cmd`)**". La segunda mitad no la
  comprueba nada hoy (punto 3, M11). Hoy se cumple: `podman history` de
  `db29498f…` solo tiene el `RUN` de `apk upgrade`, dos `LABEL` y `USER`, y
  `Cmd` es el oficial. EXC-03 **sigue vigente** hasta el 2026-12-26 o 7 días
  después de un Caddy corregido. El comentario de
  `deploy/scan/trivyignore-proxy.yaml:8-12` sigue diciendo "imagen oficial por
  digest" y "PENDIENTE" (SEC-056 punto 7).

**3. `comprobar-excepciones.sh`: las reglas nuevas funcionan, pero el
`Containerfile` del proxy deja una vía nueva para esquivar EXC-03 (SEC-056,
M11–M12).**

Directas, todas **fallan** (código 1, mensaje claro): `COPY`, `ADD`, `apk add`
(también con opciones delante), segundo `FROM`, `CADDY_BASE` de otro
repositorio o sin digest, `FROM` literal, `RUN --mount`, `wget`, imagen oficial
en el compose, sin `pull_policy: never`, `construir.sh` sin `SHA_OFICIAL`, sin
`Containerfile`. Sin cambios pasa. Las 12 directas de la 2.10b siguen
fallando (las reglas del Caddyfile y de los compose no han cambiado).

Indirectas:

| # | Mutación (sobre copias del commit) | `comprobar-excepciones.sh` | Resto del build | ¿Efecto real? |
|---|---|---|---|---|
| I01/I02 | `CMD ["caddy","run","--resume"]` o `ENTRYPOINT [...]` en `deploy/proxy/Containerfile` | pasa | pasa (no se comparan `Cmd`/`Entrypoint`) | sí: el compose no define `command`, así que manda el de la imagen |
| **I07** | `RUN` que escribe `/usr/share/caddy/c.json` (`admin` en `0.0.0.0:2019`, *handler* `templates`) + `CMD ["caddy","run","--config","/usr/share/caddy/c.json"]` | pasa | **`deploy/proxy/construir.sh` la acepta** (sha256 = oficial, sin atrasados, USER 1000) | **sí, probado:** arrancada como en el compose (Caddyfile montado en `ro`, sin `command`), la API de administración responde en `:2019`, `templates` se ejecuta (`{{.RemoteIP}}` → `127.0.0.1`) y el Caddyfile montado se ignora. El healthcheck sigue en verde |
| I03 | `ENV CADDY_TLS=…` en el `Containerfile` | pasa | — | no por sí sola: el `environment` del compose la sustituye |
| I04 | `RUN cp /bin/busybox /usr/bin/caddy` | pasa | **rechaza** (sha256) | no |
| I05 | `USER root` al final | pasa | **rechaza** (`Config.User`) | no |
| I06 | neutralizar la comparación de sha256 en `deploy/proxy/construir.sh` y dejar las cadenas `sha256sum /usr/bin/caddy` y `SHA_OFICIAL` | pasa (solo hace `grep` de esas cadenas) | — | sí: con esto, I04 pasaría |
| I08 | `image: localhost/mi-app-proxy:otra` en el compose | pasa (acepta cualquier etiqueta) | **rechaza** (`construir.sh` exige `PROXY_TAG` exacto) | no |

Valoración: es la misma clase que SEC-056 (hace falta un cambio deliberado
del propio repositorio, en un fichero que revisa Cybersecurity) y hoy la
imagen cumple (punto 2). **Media, antes de DEMO; no bloquea la puerta de la
Etapa 2.** Lo añado a SEC-056 como M11 (`CMD`/`ENTRYPOINT`/`ENV`/otras
instrucciones en el `Containerfile`) y M12 (comprobación del script por
`grep`). Es una vía nueva porque, con la imagen oficial, `Cmd` no era nuestro.
La corrección buena está en la imagen, no en el texto: `deploy/proxy/construir.sh`
debe comparar `podman image inspect` de la derivada con la base
(`Entrypoint`, `Cmd`, `Env`, `WorkingDir`, `Volumes`, `ExposedPorts`,
`StopSignal`, `OnBuild`, `Shell`, iguales; solo pueden cambiar `User` y `Labels`),
y `comprobar-excepciones.sh` debe aceptar en el `Containerfile` solo una lista
cerrada de instrucciones (`ARG CADDY_BASE`, `FROM ${CADDY_BASE}`, `USER root`,
un `RUN`, `LABEL` y `USER 1000:1000`).

**4. Registro de aprobadas (SEC-052 punto 3): 3a y 3b funcionan, probados de
verdad, pero el registro sigue sin poder decir qué se aprobó.**

Ejecuciones reales de `deploy/app/construir.sh` en el clon, con almacén y
`SCAN_DIR` propios:

| # | Árbol | Etiqueta | Resultado | Registro `aprobadas/` |
|---|---|---|---|---|
| T1 | limpio | `c39d1e97588f` | aprobada, `68641536…` | **se crea**, con `etiqueta`, `commit`, `app`, `db`, `proxy`, `excepciones_sha256=697830f3…` |
| T2 | limpio, `PATH` sin `readelf`/`nm` | `c39d1e97588f` → `-rechazada` | rechazada, **mismo digest** `68641536…` (caché de Buildah) | **se borra** el de T1 → **3a VERIFICADO** |
| T3 | fichero nuevo `apps/api/NOTA-sec210d.txt` | `c39d1e97588f-sucio` | aprobada, `9a04679d…`, "AVISO: imagen -sucio…" | no se crea → **3b VERIFICADO** |
| T4 | solo cambios sin commit en `deploy/scan/comprobar-excepciones.sh` (`exit 0` al principio), `deploy/scan/trivyignore-proxy.yaml` (una excepción nueva no aprobada) y `compose.test.yaml` | `c39d1e97588f` (**sin `-sucio`**) | aprobada; la comprobación SEC-054 **no se ejecutó** (no aparece su línea) | **se reescribe** con `commit=c39d1e9…` y `excepciones_sha256=41cf15b1…`, que no es el del commit (`697830f3…`) |
| T5 | `apps/api/` sucio, etiqueta propia `prueba210d` | `prueba210d` | aprobada, **el mismo digest `9a04679d…` que T3 marcó `-sucio`** | **se crea**, con `commit=c39d1e9…` |
| T6 | igual que T3, con el registro de T5 presente | `c39d1e97588f-sucio` | aprobada, `9a04679d…` | **se borra** el de T5 → la rama `-sucio` también limpia, VERIFICADO |

Esto confirma la observación de infrastructure, con más alcance:
- *El registro `9be1188a…` de infrastructure (`commit=fb427fa`) no describe lo
  que se aprobó.* Lo dio el build de la 2.10c con cambios sin commit en
  `deploy/` y `compose.test.yaml`. Las tres imágenes llevan
  `org.opencontainers.image.revision=fb427fa…`, y la del proxy se construyó
  con un `deploy/proxy/Containerfile` que **no existe** en `fb427fa`
  (`git cat-file -e fb427fa:deploy/proxy/Containerfile` → no existe). Además
  `comprobar-excepciones.sh`, `deploy/db/Containerfile` y las comprobaciones
  que se ejecutaron eran las del árbol, no las del commit. Ese registro **no
  vale para la puerta**.
- *La lista de `-sucio` es correcta para lo que pretende SEC-037* (el
  contenido de la imagen de la app; T3 y T6 lo confirman), pero no para lo
  que decide la aprobación: las comprobaciones, las excepciones, los compose,
  el Caddyfile y los `Containerfile`/scripts de db y proxy. Y con una etiqueta
  propia ni siquiera se calcula (T5). Por eso no amplío SEC-037 (sigue
  verificado). Lo añado a **SEC-052 punto 3** como requisitos (e)–(h).
- *Queda en el registro real un resto de antes de 3a:* `aprobadas/19d162e3…`
  (la imagen `41b104074c43-sucio`, que tiene también la etiqueta
  `-rechazada`, y sin `etiqueta`/`commit`). `rechazar()` no actúa hacia atrás.
  Lo debe borrar infrastructure (yo no lo toco), y la comprobación debe
  rechazar registros sin `etiqueta`/`commit`.
- *Si Trivy rechaza db o proxy*, `rechazar()` solo renombra la app. Las
  etiquetas fijas `localhost/mi-app-db:19.0-alpine3.24` y
  `localhost/mi-app-proxy:2.11.9-alpine` se quedan en las imágenes rechazadas,
  y los compose las usarían. Es la misma clase que el requisito (c) (comprobar
  el digest actual contra `db=`/`proxy=` del registro), y lo añado ahí.

Severidad: **media (la de SEC-052), no bloquea la puerta de la Etapa 2.** Hoy
nada consulta el registro, así que con él no se acepta ninguna imagen. Lo que
sí se pierde es la trazabilidad de la puerta. **Condición para la puerta**
(procedimiento, 2.11): las imágenes con las que se ejecutan `containers`,
`integration` y `e2e` se construyen con `sh deploy/app/construir.sh` **sin
argumento**, desde el commit final y con `git status --porcelain` **vacío en
todo el árbol** (o desde un clon limpio). Sus tres digests (app, db y proxy) y
el contenido del registro se anotan en `docs/estado.md`. Plazo de los
requisitos (e)–(h): antes de DEMO, a la vez que el punto 3. Si la 2.11 ya
exige el registro en `tests/run.sh`, debe rechazar registros sin `etiqueta`
igual al commit corto, sin `commit` o sin `arbol_limpio=si` (requisito (e)).

**5. Resto del commit.** `deploy/dev/levantar.sh` construye el proxy si falta
(sin escanear, como la db en DEV: solo DEV/TESTING locales, cubierto por el
requisito (c) de SEC-052). `compose.test.yaml` usa la derivada con
`pull_policy: never` (control positivo, como en db). `docs/infraestructura.md`
§8, §8.2 y §14.1 describen bien lo hecho. El "probado con mutaciones" de §8.2
no incluye las de §6.12 punto 3.

**Altos o críticos en esta revisión:** **SEC-055 VERIFICADO**. Ninguno nuevo.
SEC-050 sigue con riesgo aceptado (EXC-03, vigente con la imagen derivada y
pendiente de ratificación humana). Lo nuevo es medio y va antes de DEMO:
M11–M12 en SEC-056 y los requisitos (e)–(h) en SEC-052. **No queda ningún
hallazgo crítico ni alto abierto que bloquee la puerta de la Etapa 2 para
HU-01.** Sí queda la condición de procedimiento del punto 4 (imágenes desde
el commit final y con el árbol limpio).

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
| RS-05b | [2.3, SEC-038] Los límites de RS-03, RS-05 y RS-16b se cumplen **también con peticiones simultáneas**: una IP nunca tiene más verificaciones en curso que los fallos que le quedan hasta el límite; una cuenta nunca supera el umbral del bloqueo siguiente por verificaciones simultáneas; un acierto con la cuenta ya bloqueada (`locked_until > now` o `locked_manual`) en el momento de anotarlo no crea sesión ni cambia el PIN | I: 50 logins simultáneos desde una IP con PIN erróneo → como mucho 10 llamadas al hasher y el resto `429`; 50 simultáneos a una cuenta desde IP distintas → como mucho 5 llamadas al hasher antes del `423`; ráfaga con el PIN correcto al final sobre una cuenta que llega a `locked_manual` → ese intento `423`, 0 sesiones abiertas; lo mismo con `currentPin` (el PIN no cambia); [2.6, SEC-047] 16 logins simultáneos a una cuenta con las variantes del nombre que PostgreSQL considera iguales (`i`/`İ` en un nombre con 4 `i`) desde IP distintas → como mucho 5 llamadas al hasher |
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
| Escaneo Trivy/Grype | imagen de herramientas no desplegable | imagen final aún no existe | Pendiente (Etapa 2, RS-39). [2.1m] Base distroless: 0 críticas, 2 altas con EXC-01 (SEC-033); escaneo dentro del build pendiente (SEC-034). [2.6] `app`: 1 alta nueva con corrección (SEC-048); primer escaneo de `db` (1 crítica, 26 altas, SEC-049) y `proxy` (2 altas, SEC-050): **bloquea** hasta actualizar los digests [2.9] Escaneo de app, db y proxy dentro de `construir.sh` (SEC-034 verificado; Trivy rootless, sin socket). app: SEC-048 verificado, solo EXC-01; proxy: EXC-03; db: `gosu` con EXC-02, pero `libxml2` sin corregir en `alpine3.23` (SEC-049, SEC-051): **bloquea** |

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

**Veredicto (2.1m):** imagen final de la app (`deploy/app/Containerfile`,
multietapa trixie-slim → distroless, `USER 1000:1000`, sin shell) y servicio
`commands` de `compose.test.yaml` revisados (§6.7): ninguno corre como root,
usa `--privileged`, monta el socket ni la red del host. Las 2 altas de la base
quedan con EXC-01 (SEC-033, ratificación humana pendiente); SEC-034 (media)
pide el escaneo dentro de `construir.sh`. Ningún motivo de bloqueo por la
regla de contenedores.

**Veredicto (2.9):** el contenedor de Trivy de `deploy/scan/escanear.sh`
corre con UID 1000, sin capacidades, con `no-new-privileges` y raíz `ro`,
sin `--privileged`, sin socket y sin la red del host; TX-CONT-01 PASA con la
imagen limpia `sha256:72766f8e…`. Ninguno corre como root. **Bloqueo por
imágenes:** `db` tiene una alta con corrección sin aplicar (`libxml2`,
SEC-049), que Trivy no ve en `alpine3.23` (SEC-051).

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
- Estado: **verificado** (documentos, 1.4c). `docs/arquitectura.md` §5 (aprobaciones, reconfirmación y cambio del PIN provisional por `verifyPin`), §5.1 (`POST /auth/pin` solo con `mustChangePin = true`, si no `403` sin verificar; `403 PIN_INVALID`, `423 LOCKED`, `423 ACCOUNT_LOCKED_MANUAL`, `429`), §7 (función única `verifyPin`, único componente con el hasher; límite por IP de todas las verificaciones; bloqueo sin hash ni conteo; contador del usuario cuyo PIN se verifica; revocación de todas las sesiones al llegar a `locked_manual` por cualquier vía), §13 y §15; ADR-005 revisión (c). Las cuatro propuestas están incorporadas y la revocación se amplió a todo bloqueo indefinido, que se acepta (§6.4). **Ya no bloquea la puerta.** Cambio de coherencia pendiente, no bloqueante: T-20 (opción A, §6.4) en `docs/arquitectura.md` §7 y ADR-005 (software-engineer). Resto aparte: SEC-025 (baja). En Etapa 2/3: RS-16b, RS-16c, RS-16d. **[2.3]** Implementación (`apps/api/src/modules/auth/verify-pin.ts`, `POST /auth/pin`): cumple en secuencia (límite por IP antes del hash, sin límite por sesión en `change` (T-20), bloqueo → `423` sin hash ni conteo, contador del usuario, revocación de todas las sesiones a los 20 fallos), pero **no con peticiones simultáneas**: la ráfaga de `currentPin` hace 300 verificaciones y cambia el PIN de una cuenta ya en `locked_manual` (SEC-038, alta). La verificación del código queda pendiente de SEC-038.

## SEC-017: `confirmPin` falta en las listas de redacción de logs
- Severidad: media
- Ubicación: docs/arquitectura.md:789-790 (redacción obligatoria: `pin`, `currentPin`, `newPin`, `managerApproval.pin`); docs/logging.md §4.1 (línea 236) y §4.3 (líneas 276-281)
- Descripción: `confirmPin` (SEC-007, PIN de 6 dígitos del encargado en anular cobros y Personal) es un campo nuevo de primer nivel del cuerpo y no está en ninguna de las listas de redacción de pino ni en la de "prohibido en cualquier log". La primera barrera (no registrar cuerpos) lo cubre, pero la redacción existe precisamente para cuando esa barrera falla (errores de validación, logs de depuración del Developer). Si se registra, es el PIN del encargado en claro (T-26).
- Responsable: monitoring (`docs/logging.md` §4.1 y §4.3) y software-engineer (`docs/arquitectura.md` §11)
- Cómo corregir: añadir `confirmPin` y `*.confirmPin` a la lista de §4.3 y a la tabla de §4.1 de `docs/logging.md`, y `confirmPin` a la lista de §11 de la arquitectura. Regla general recomendada: redactar cualquier clave que case con `/pin/i`.
- Cómo verificar: RS-29 (el PIN centinela se envía también como `confirmPin` en anular cobro, alta, reset y desbloqueo) y RS-31.
- Estado: **verificado** (documentos, 1.4c). `docs/logging.md` §4.1 (prohibido el valor de cualquier clave que case con `/pin/i`, `confirmPin` incluido), §4.3 (a) (`confirmPin` y `*.confirmPin` en las rutas fijas, cookie `__Host-sid`) y (b) (función recursiva por nombre de clave `/pin/i`, a cualquier profundidad, también en `err` y en los *bindings*, sin excepciones; `provisional_credential` en lugar de `must_change_pin`), §4.5 (centinela también como `confirmPin`, test unitario de la regla); `docs/arquitectura.md` §11 con la misma regla y remisión a logging. En Etapa 2/3: RS-29, RS-31 y el test de `docs/logging.md` §4.5. **[2.3] Verificado en código**: `apps/api/src/logging/logger.ts` (rutas fijas con `confirmPin`, `__Host-sid`, `pin_hash`, `pepper`; regla `/pin/i` recursiva en `formatters.log`, `bindings` y serializador de `err`); prueba propia con el centinela en 9 tipos de petición: 0 apariciones de valores (§6.8 punto 5).

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
- Estado: **verificado** (documentos, 1.4c). ADR-005 (sección "Decisión" y revisión (c)) y `docs/arquitectura.md` §7: `__Host-sid` con `HttpOnly; Secure; SameSite=Strict; Path=/`, sin `Domain` ni `Max-Age`/`Expires`; `docs/logging.md` §4.1 y §4.3 redactan `__Host-sid`. En Etapa 2/3: RS-10. **[2.3] Verificado en código y en respuesta real**: `Set-Cookie: __Host-sid=…; Path=/; Secure; HttpOnly; SameSite=Strict` (`apps/api/src/http/cookies.ts`), borrado idéntico en el `401` y el *logout*.

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
- Estado: **corregido** (diseño y DEV, 1.7q). Pasa a "verificado" cuando exista `tests/run.sh` con el requisito 5 de `docs/infraestructura.md` §7.1 y RS-45 se repita con el enlace plantado desde `deps` real (Etapa 2, testing/developer). No bloquea. **[2.3]** Comprobación manual sobre el árbol del commit `4460e09`: (a) sin enlaces simbólicos en `apps/`/`packages/` fuera de `node_modules`; (b) todos los de `apps/`, `packages/` y `node_modules/` resuelven dentro de la lista de permitidos. Sigue pendiente la verificación con `tests/run.sh` (no arranca por D-2.2-01/02).
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
- Estado: **corregido (infrastructure 2.1h; revisado en la 2.1m, §6.7 punto 4)**. `app` con IP fija `${TEST_APP_IP:-10.89.240.3}` en `proxy-app`, `proxy` en `${TEST_PROXY_IP:-10.89.240.2}` y `TRUSTED_PROXIES` solo esa IP; probado en una red `internal` `/29` en los dos órdenes de arranque (sin conflicto IPAM; una IP ocupada falla cerrado). Pasa a **verificado** con la primera ejecución de `tests/run.sh e2e` con la imagen real (`proxy` *healthy*, `podman inspect` con las dos IP, RS-06) y con el mismo esquema en `compose.demo.yaml`/Quadlet **[2.3] Confirmado con la imagen real**: los e2e del developer (perfil con `proxy` y `app`, imagen `69e823f40ad7-sucio`) arrancan sin errores de IPAM. Pasa a **verificado** en TESTING; queda el mismo esquema en `compose.demo.yaml` y Quadlet.

## SEC-029: `TRUSTED_PROXIES` admite CIDR sin límites ni validación estricta
- Severidad: media
- Ubicación: docs/arquitectura.md:1551 (§10.1, fila `TRUSTED_PROXIES`: "lista separada por comas de IP o CIDR") y :1388 (`trustProxy` solo para `proxy`)
- Descripción: el diseño acepta cualquier CIDR. Fastify pasa `trustProxy` a `proxy-addr`, que también admite nombres (`loopback`, `linklocal`, `uniquelocal` = 10/8, 172.16/12, 192.168/16) y que con un rango amplio confía en `X-Forwarded-For` de cualquier equipo o contenedor de ese rango. Un valor como `10.0.0.0/8`, `uniquelocal` o `0.0.0.0/0` (error de instalación o "arreglo" de SEC-028) deja que cualquiera de la red falsifique la IP de origen: se salta el límite de 10 fallos/10 min por IP del login, que es la defensa contra el rociado de PIN entre usuarios (SEC-001, §6.1.5), y puede bloquear a propósito la IP de otro dispositivo (SEC-003). Requiere un error de configuración, de ahí media y no alta.
- Responsable: software-engineer (`docs/arquitectura.md` §10.1) y developer (`config.ts`)
- Cómo corregir: en `parseSettings`, cada elemento debe ser una IPv4/IPv6 literal o un CIDR con prefijo **≥ /24** (IPv4) o **≥ /120** (IPv6); se rechazan (no arranca) `0.0.0.0/0`, `::/0`, nombres (`loopback`, `linklocal`, `uniquelocal`), `true`, números de saltos y elementos vacíos o con espacios; se pasa a Fastify un *array* ya validado, nunca la cadena original. En TESTING, DEMO y PROD el valor es la IP única de `proxy` (`/32`); un CIDR solo para una red dedicada `proxy`↔`app`. Documentarlo en §10.1 y en `docs/infraestructura.md` §6.
- Cómo verificar: unitario de `parseSettings` (como RS-13) con `10.0.0.0/8`, `uniquelocal`, `0.0.0.0/0`, `::/0`, `true`, `1`, `10.89.240.2,` → no arranca; `10.89.240.2` y `10.89.240.0/29` → arranca. RS-06 en integración: `X-Forwarded-For` desde una IP no listada se ignora.
- Estado: **verificado (código, 2.3)**. `apps/api/src/config.ts:97-129` y `apps/api/src/app.ts:68`, `:106`; unitario de `parseSettings` (88 casos) en verde y prueba propia con los casos extra de "Pasa a verificado" (incluido `buildApp` con `['uniquelocal']` → `ConfigError`) (§6.8 punto 1). Ninguna lógica usa `request.host`/`hostname`/`protocol`/`ips`. Los casos extra que faltan en `tests/unit/api/config.unit.test.ts` (`" "`, espacio final, `[::1]`, `::/119`, `::ffff:10.0.0.0/104`, `::ffff:10.89.240.0/120` aceptado y `buildApp` con `['uniquelocal']`) quedan en SEC-045 (testing, baja).

## SEC-030: Las peticiones automáticas del cliente cuentan como actividad para la inactividad de 15 min
- Severidad: baja
- Ubicación: docs/arquitectura.md:1246-1249 (§7, "cuenta como actividad cualquier petición REST con sesión válida salvo `POST /telemetry`") y :1121-1125 (§5, rutas de la SPA: los *snapshots* se piden "al recibir `hello`/reconexión")
- Descripción: con la regla actual, las peticiones que la app hace sin intervención del usuario (recarga del *snapshot* al recibir `hello`, al reconectar el SSE tras un corte o tras el aviso de 5 s sin `ping`) renuevan `last_activity_at`. Una tablet desatendida con Wi-Fi inestable puede así mantener viva una sesión de camarero o encargado más allá de 15 min sin interacción (hasta la caducidad de 12 h), y la comprobación del servidor deja de ser un respaldo fiable del temporizador del cliente (CA-F09). El temporizador del cliente sigue cerrando la pantalla, por eso es baja.
- Responsable: software-engineer (§7 y §9) y developer
- Cómo corregir: marcar las peticiones que no nacen de una acción del usuario (p. ej. cabecera `X-Activity: passive` en los *snapshots* por `hello`/reconexión y en cualquier recarga automática) y no actualizar `last_activity_at` con ellas (sí se comprueban caducidad e inactividad). Las acciones del usuario y `POST /session/activity` siguen contando como ahora. La cabecera solo puede **restar** actividad, nunca sumarla, así que no hace falta confiar en ella.
- Cómo verificar: integración con reloj falso: sesión de camarero, 14 min sin actividad, `GET` con `X-Activity: passive` → `200`; a los 15 min → `401` con `reason: idle`. E2E: tras un corte de red con la pantalla montada y sin tocar nada, la sesión se cierra a los 15 min de la última interacción.
- Estado: **verificado (código, 2.3)**. Guarda: `x-activity === 'passive'` exacto solo omite `touch` (`apps/api/src/http/guard.ts:215`) tras todas las comprobaciones; SPA: solo `GET /auth/me` usa `{ passive: true }` y ningún *handler* de gesto (`apps/web/src/session/store.ts`, `api/client.ts`); integración (`HU-01-sesion.int.test.ts`, variantes y lectura de `last_activity_at`) y e2e `serie-red` en verde (§6.8 punto 1).

## SEC-031: Las rutas inexistentes analizan el cuerpo y no siempre responden `404`
- Severidad: baja
- Ubicación: docs/arquitectura.md:995-1003 (§5, "Rutas inexistentes (T-40)": los hooks de guarda hacen `if (request.is404) return;` y responde el *not-found handler*) y :1243-1246 (§5.2, SPA para "cualquier `GET`")
- Descripción: con el diseño de T-40, Fastify ejecuta el analizador de cuerpo antes del *not-found handler*. Comprobado con Fastify 5.12.8 (`inject`, §6.6): `PATCH /api/v1/settings` con `Content-Type: application/json` y cuerpo `{bad` → `400 FST_ERR_CTP_INVALID_JSON_BODY`; con un cuerpo mayor que el límite → `413 FST_ERR_CTP_BODY_TOO_LARGE`; el *error handler* corre con `is404 = true`. RS-18 exige `404` idéntico para todos; además el servidor analiza JSON sin autenticar en rutas que no existen (acotado por los 64 KiB de RS-23, de ahí baja). Fuera de `/api/`, §5.2 limita la SPA a `GET`, pero el diseño no dice qué responde un `POST`/`PATCH` a una ruta inexistente fuera de `/api/`.
- Responsable: software-engineer (§5 y §5.2) y developer
- Cómo corregir: en el helper de las guardas, si `request.is404`, **responder** en el primer hook de guarda en vez de solo salir: bajo `/api/` (o con un método distinto de `GET`/`HEAD` en cualquier ruta) `return reply.code(404).send({ code: 'NOT_FOUND', message, requestId })` sin `details` ni `Set-Cookie`; con `GET`/`HEAD` fuera de `/api/`, salir y dejar que el *not-found handler* sirva `index.html`. El *not-found handler* mantiene el mismo `404` (lo usa `reply.callNotFound()`). Comprobado en el scratchpad que así JSON inválido, `Content-Type` desconocido y cuerpo > límite dan `404` sin tocar el analizador.
- Cómo verificar: RS-18 (casos de `404` añadidos en la 2.1k): `PATCH /api/v1/settings` con `{bad`, con `text/plain` y con 65 KiB, con y sin sesión → `404 NOT_FOUND` idéntico salvo `requestId`, sin `Set-Cookie` y sin consultas a la BD; `POST /pedidos` → `404` (no `index.html`); `GET /pedidos` → `index.html`.
- Estado: **verificado (código, 2.3)**. `apps/api/src/http/guard.ts:142-147` responde el `404` en la guarda antes del analizador de cuerpo, sin BD ni `Set-Cookie`; `app.ts:224-233` solo sirve la SPA con `GET`/`HEAD` fuera de `/api/`. Suite de seguridad RS-18 39/39 y prueba propia (`OPTIONS`, `PUT`, `GET` sobre `/api/v1/auth/login`, `TRACE /`, `POST /pedidos` → `404` JSON). Pendiente, no bloqueante: documentarlo en `docs/arquitectura.md` §5/§5.2 (software-engineer, 2.2c).

## SEC-032: El aborto al primer `401` no cubre todos los canales que pueden borrar la cookie de un login nuevo
- Severidad: baja
- Ubicación: docs/arquitectura.md:963-972 (§5, "Borrado de la cookie": "aborta sus peticiones en curso (`AbortController` del cliente HTTP)") y §6 (flujo SSE con `EventSource` y vigilante de 5 s)
- Descripción: el `Set-Cookie` de borrado del `401` no depende del valor de la cookie, así que cualquier respuesta `401` de la sesión vieja que el navegador procese después de un login nuevo borra la cookie nueva. El diseño lo cierra solo para el cliente HTTP (`AbortController`). Quedan fuera: el `EventSource` de `GET /events` y su reconexión forzada por el vigilante de 5 s (una petición de reconexión lanzada con la cookie vieja cuya respuesta llega tras el login), el envío de telemetría si usa `navigator.sendBeacon` o `fetch({ keepalive: true })` (no se pueden abortar de forma fiable) y los temporizadores de recarga que lancen peticiones nuevas entre el `401` y el login. Impacto solo de disponibilidad (el usuario vuelve a P-01 y repite el login; no hay mezcla de identidades), de ahí baja.
- Responsable: software-engineer (§5) y developer (`apps/web/src/api/`)
- Cómo corregir: al primer `401`, en este orden y antes de habilitar el login de P-01: (1) `abort()` de todas las peticiones del cliente HTTP; (2) `close()` del `EventSource` y cancelación del vigilante de 5 s y de los reintentos de reconexión; (3) cancelación de todos los temporizadores de recarga y de la cola de telemetría (que va por el cliente HTTP con `AbortController`, sin `sendBeacon` ni `keepalive`). Mientras P-01 está visible no sale ninguna petición con sesión. Documentarlo en §5 junto al borrado de la cookie.
- Cómo verificar: E2E con Toxiproxy (o retraso de red de Playwright): con la sesión caducada por inactividad, retrasar 3 s la respuesta de una petición en curso y de la reconexión SSE, hacer login nuevo durante el retraso y comprobar que la cookie nueva sigue presente y la siguiente petición da `200`. Revisión de código: ningún uso de `sendBeacon` ni `keepalive` en `apps/web/`.
- Estado: **verificado (código, 2.3)**. `end()`/`stopChannels()` → `abortAll()` con generación de sesión, `events.stop()` (cierra `EventSource`, vigilante y reintento) y fin del temporizador antes de P-01; el *logout* por inactividad espera su respuesta; sin `sendBeacon` ni `keepalive` en `apps/web` (`apps/web/src/session/store.ts`, `api/client.ts`, `realtime/events.ts`); e2e "Primer 401: no queda ningún canal de la sesión vieja" en verde (Chromium y WebKit). El e2e con respuesta retrasada y login durante el retraso queda en SEC-045 (testing, baja).

## SEC-033: CVE-2026-107494 y CVE-2026-124709 (QUIC de OpenSSL) en la base distroless — excepción EXC-01
- Severidad: baja (riesgo en nuestro contexto; el escáner las clasifica **altas**, CVSS 3.1 7.5 `A:H`)
- Ubicación: deploy/app/Containerfile:28 (`RUNTIME_IMAGE` = `gcr.io/distroless/nodejs26-debian13@sha256:b462e87a…`), paquete `libssl3t64` 3.5.9-1~deb13u1 (`/usr/lib/x86_64-linux-gnu/libssl.so.3`, `libcrypto.so.3`) y OpenSSL 3.5.9 estático dentro de `/nodejs/bin/node`; docs/infraestructura.md §8.1 (escaneo del 2026-11-24)
- Descripción: dos denegaciones de servicio por memoria en la pila QUIC de OpenSSL 3.5.9, sin corrección publicada en Debian (`affected`). Incumplen §3.3 ("sin críticas/altas") si no hay excepción. No son alcanzables en nuestra arquitectura (§6.7, punto 1): ningún ejecutable enlaza `libssl.so.3` del sistema, Node no la carga, la app solo habla TCP (Fastify detrás de Caddy, sin UDP), el Node de la imagen está compilado sin QUIC (`node_use_quic: false`, sin `node:quic`) y el HTTP/3 de Caddy es `quic-go`. El escáner no ve que el OpenSSL incluido en Node también tiene la pila QUIC (exporta `OSSL_QUIC_server_method`, `SSL_new_listener`, `SSL_set_quic_tls_cbs`): solo un módulo nativo podría usarla. Impacto máximo si llegara a ser alcanzable: caída del proceso `app` (sin pérdida de confidencialidad ni integridad).
- Responsable: infrastructure (fichero de excepciones, escaneo y actualización de digests), developer (condiciones 3 y 4), cybersecurity (revisión)
- Cómo corregir: **excepción EXC-01**, aprobada por Cybersecurity el 2026-11-24 (RS-39), pendiente de **ratificación humana** en la puerta de la Etapa 2 (es una excepción a `docs/reglas-equipo.md` §3.3; no acepta un riesgo alto).
  - Alcance: **solo** esos dos CVE, **solo** en `pkg:deb/debian/libssl3t64@3.5.9-1~deb13u1?arch=amd64&distro=debian-13.8`. No cubre otros CVE, otros paquetes ni otras versiones o arquitecturas (un `purl` distinto, p. ej. Debian 13.9 o `arm64`, vuelve a fallar y obliga a revisar: es lo que se busca).
  - Fechas: concedida 2026-11-24; **revisión** 2026-12-08; **caduca** 2026-12-24 (el escáner vuelve a fallar solo). Revisión obligatoria también antes de desplegar en DEMO (Etapa 4) y en PROD (Etapa 5).
  - **Queda invalidada** (la imagen vuelve a estar bloqueada hasta nueva decisión) si: (1) Debian o distroless publican una versión corregida (Trivy muestra *Fixed Version*): Infrastructure actualiza el digest en ≤ 7 días y retira la entrada; (2) Node publica una versión de seguridad que corrige estas CVE en su OpenSSL: actualizar Node en las dos etapas y en DEV en ≤ 7 días; (3) la app o una dependencia usa QUIC, HTTP/3 o UDP: `node:quic`, `--experimental-quic` (en `command`, `NODE_OPTIONS` o código), `dgram`, o cualquier escucha UDP en el contenedor; (4) algún ELF de la imagen (p. ej. un `.node` en `/app/node_modules`) tiene `NEEDED libssl.so.3`/`libcrypto.so.3` o importa `OSSL_QUIC_*`, `SSL_new_listener*` o `SSL_set_quic_tls_cbs`; (5) cambia la evaluación: pasan a críticas, hay *exploit* público o entran en el catálogo KEV, o el aviso amplía el alcance a TLS sobre TCP; (6) llega la fecha de caducidad sin revisión.
  - Implementación (Infrastructure): fichero `deploy/app/trivyignore.yaml` (probado con Trivy 0.76.2: con él sale `0` y lista las 2 como *suppressed*; sin él, con `expired_at` pasado o con otro `purl`, sale `1`):
    ```yaml
    vulnerabilities:
      - id: CVE-2026-107494
        purls: ["pkg:deb/debian/libssl3t64@3.5.9-1~deb13u1?arch=amd64&distro=debian-13.8"]
        expired_at: 2026-12-24
        statement: "SEC-033 / EXC-01: QUIC no alcanzable (docs/seguridad.md §6.7)"
      - id: CVE-2026-124709
        purls: ["pkg:deb/debian/libssl3t64@3.5.9-1~deb13u1?arch=amd64&distro=debian-13.8"]
        expired_at: 2026-12-24
        statement: "SEC-033 / EXC-01: QUIC no alcanzable (docs/seguridad.md §6.7)"
    ```
    Se usa con `--ignorefile deploy/app/trivyignore.yaml --show-suppressed --severity HIGH,CRITICAL --exit-code 1` (SEC-034). **Prohibido** `--ignore-unfixed`, ignorar por paquete entero o un `.trivyignore` sin `expired_at`: ocultarían futuras altas sin corrección. Cambiar el fichero requiere una entrada nueva o actualizada de Cybersecurity en este documento.
  - Comprobaciones de las condiciones 3 y 4 en cada build (las añade Infrastructure a `construir.sh` o a la suite `containers`): `node -p 'process.config.variables.node_use_quic'` en la imagen → `false`; `grep -rE "node:quic|experimental-quic|require\(['\"](node:)?dgram|from ['\"](node:)?dgram" /app/dist` sin resultados; ningún `.node` en `/app` con `NEEDED` de `libssl`/`libcrypto` ni símbolos `OSSL_QUIC_`/`SSL_new_listener`/`SSL_set_quic_tls_cbs` sin definir (`readelf -d`, `nm -D --undefined-only`, ejecutados fuera de la imagen sobre `podman export`, porque la distroless no tiene shell).
- Cómo verificar: (a) `construir.sh` con el fichero → escaneo `0` y 2 *suppressed* con el `statement`; sin el fichero → falla; (b) las comprobaciones de las condiciones 3 y 4 pasan sobre la imagen real; (c) el 2026-12-08 Cybersecurity revisa Trivy (DB actualizada), los avisos de Debian (`openssl`) y las versiones de seguridad de Node, y deja constancia aquí.
- Estado: abierto (riesgo aceptado con EXC-01 hasta el 2026-12-24; no bloquea; ratificación humana pendiente) **[2.3]** Imagen real `localhost/mi-app:69e823f40ad7-sucio` (`sha256:42df4724…`): Trivy 0.76.2 con el fichero de EXC-01 → 0 críticas/altas y 2 *suppressed*; condiciones 3 y 4 cumplidas (ningún `.node` de `argon2` con `NEEDED libssl`/`libcrypto` ni símbolos QUIC; `dist` sin `node:quic` ni `dgram`). **[2.6]** Imagen `0b3c9f111c63` (`sha256:66fcdf09…`): las 2 de EXC-01 siguen *suppressed* y las condiciones 3 y 4 se cumplen; aparece otra alta, con corrección, fuera de EXC-01 (`libzstd1`, SEC-048). Al actualizar el digest de la base para SEC-048, revisar si `libssl3t64` ya está corregido (condición 1). **[2.9]** Imagen `0af133152b01` (`sha256:72766f8e…`, base `13e3ac17…`, Debian 13.8, mismo `purl`): las 2 siguen *suppressed*. `construir.sh` comprueba las condiciones 3 y 4 en cada build (10 `.node`; falla abierta sin binutils, SEC-053). Condición 1: Debian sigue sin corrección (trixie `vulnerable`, sid sin corregir). OpenSSL las clasifica **Low** y las corrige en 3.5.10, que aún no ha salido. Condición 2: Node 26.13.1 sigue siendo la última. **EXC-01 vigente** (§6.10, punto 6). Revisión del 2026-12-08 y ratificación humana pendientes.

## SEC-034: El escaneo de la imagen no forma parte del build
- Severidad: media
- Ubicación: deploy/app/construir.sh:45-56 (construye e imprime `APP_IMAGE` sin escanear); docs/infraestructura.md §8 ("pendiente de integrar en la imagen final") y §15 (Trivy ejecutado a mano)
- Descripción: §3.3 y RS-39 exigen Trivy/Grype en **cada** build, sin críticas/altas salvo excepción escrita. Hoy `construir.sh` imprime la referencia por digest que se usa como `APP_IMAGE` en TESTING (y luego en DEMO/PROD) sin escanear: una imagen con una alta o crítica nueva (de la base o de `node_modules`) puede llegar a las suites y a la puerta sin que nadie lo vea, y EXC-01 (SEC-033) no se aplica de forma automática ni caduca sola. Tampoco se ejecuta `pnpm audit --prod` (RS-39).
- Responsable: infrastructure
- Cómo corregir: tras `podman build`, en `construir.sh`: (1) `podman save` a un fichero temporal en `$XDG_RUNTIME_DIR` (o el scratch del usuario) y Trivy por digest (el de §8) en contenedor rootless (`--user 1000:1000`, `--cap-drop=ALL`, `--security-opt=no-new-privileges`, `--read-only`, el `.tar` montado `ro`, caché de la DB en un directorio del usuario), **nunca** con el socket de Podman (§8 de este documento); `--severity HIGH,CRITICAL --exit-code 1 --ignorefile deploy/app/trivyignore.yaml --show-suppressed`, con el informe JSON guardado junto a la etiqueta; (2) `pnpm audit --prod --audit-level high` sobre el lockfile (en la etapa de construcción, que ya tiene red en `pnpm deploy`, o en el script); (3) las comprobaciones de las condiciones 3 y 4 de SEC-033; (4) si algo falla, el script sale con código ≠ 0, **no imprime `APP_IMAGE`** y borra la etiqueta (o la marca como `-rechazada`). Documentarlo en §8.1 y en `docs/infraestructura.md` §14.
- Cómo verificar: `sh deploy/app/construir.sh` con la imagen real → escaneo en la salida, 2 *suppressed* (EXC-01) y `APP_IMAGE`; con `deploy/app/trivyignore.yaml` renombrado → sale ≠ 0 y sin `APP_IMAGE`; `podman ps` durante el escaneo no muestra montajes del socket.
- Estado: verificado (2.9): `construir.sh` escanea app, db y proxy con `deploy/scan/escanear.sh` (Trivy por digest, rootless, sin socket) y, si algo falla, sale ≠ 0 sin `APP_IMAGE`. Probado sin el fichero de EXC-01 y con excepciones caducadas, con otra ruta o con otro `purl` (§6.10, punto 7). Quedan huecos en SEC-052 (media: `TRIVY_IMAGE` por entorno, nada después del build) y SEC-053 (baja). **[Estado anterior]** abierto (media, no bloquea; debe estar hecho antes de usar la primera imagen real para la puerta de la Etapa 2). **[2.6]** Sigue sin estar en `construir.sh` (2.1n en cola) y la imagen del escaneo manual tiene una alta nueva (SEC-048). Ampliación: el escaneo debe cubrir **todas las imágenes desplegables** de los compose (`app`, `db`, `proxy`), no solo la de la app: el primer escaneo de `db` y `proxy` (2.6) da SEC-049 y SEC-050.

## SEC-035: pnpm se instala en la etapa de construcción sin integridad fijada
- Severidad: baja
- Ubicación: deploy/app/Containerfile:44-47 (`npm install --global … "pnpm@${PNPM_VERSION}"` como root de construcción)
- Descripción: la versión está fijada, pero no el *hash*: `npm` confía en el `integrity` que le da el propio registro por la misma conexión TLS, y ejecuta los scripts de instalación del paquete como root de la etapa. pnpm es la herramienta que después instala y verifica todas las dependencias, así que una versión manipulada (registro, proxy o *mirror* comprometido) controla la imagen entera (T-20/T-21). El `npm` 11.20.0 de la base trae además `undici` 6.28.0 con CVE de validación de certificado (§6.7, punto 3). Probabilidad baja (npm no permite republicar una versión), de ahí baja. Las dependencias de la app sí están protegidas por las integridades de `pnpm-lock.yaml`.
- Responsable: infrastructure
- Cómo corregir: `ARG PNPM_INTEGRITY=sha512-…` (el `dist.integrity` de `pnpm@12.21.0`, obtenido una vez y revisado en el commit) y en el `RUN`: `npm pack "pnpm@${PNPM_VERSION}"`, comprobar el `sha512` del `.tgz` contra `PNPM_INTEGRITY` (falla el build si no coincide) e instalar desde el fichero con `npm install --global --ignore-scripts ./pnpm-*.tgz`. Mismo cambio en la imagen de herramientas de DEV (`deploy/dev/`), que también fija `PNPM_VERSION`. Al actualizar pnpm se actualizan los dos `ARG` juntos.
- Cómo verificar: build con `--build-arg PNPM_INTEGRITY=sha512-AAAA…` (valor erróneo) → falla en ese paso; con el valor correcto → construye y `pnpm --version` = 12.21.0.
- Estado: verificado (2.9): `PNPM_INTEGRITY` coincide con `dist.integrity` del registro; con un valor erróneo el build falla en ese paso; mismo cambio en `deploy/dev/Containerfile`. **[Estado anterior]** abierto (baja, no bloquea)

## SEC-036: `.npmrc` entra en el contexto de construcción sin comprobar que no lleva credenciales
- Severidad: baja
- Ubicación: deploy/app/containerignore:11 (`!.npmrc`); deploy/app/Containerfile:61 (`COPY . .` a la etapa `build`) y :87 (la comprobación de secretos solo mira `dist` y `public`, y no busca `.npmrc`)
- Descripción: `.npmrc` es el sitio habitual de los *tokens* de registro (`//registry…/:_authToken=…`, `_auth`, `_password`). Si el Developer o alguien de la máquina lo usa para un registro privado o pone ahí un *token*, entra en una capa de la etapa `build` (que queda en el almacén local y en la caché de capas) y se versiona en git. No llega a la imagen final (solo se copian `package.json`, `node_modules`, `dist` y `public`), de ahí baja. `docs/reglas-equipo.md` §1 y §3.2 prohíben secretos en el código y en la construcción.
- Responsable: infrastructure (Containerfile) y developer (contenido de `.npmrc`)
- Cómo corregir: (1) el `.npmrc` del repositorio solo lleva ajustes, nunca credenciales; (2) en la etapa `build`, justo después del `COPY`, fallar si algún `.npmrc` del contexto contiene `_authToken`, `_auth`, `_password`, `username` o `certfile`/`keyfile`; (3) ampliar la comprobación final a todo `/out/app` (no solo `dist` y `public`) y añadir `.npmrc` y `.env*` en cualquier nivel; (4) si algún día hace falta un registro privado, el *token* va con `podman build --secret id=npmrc,src=…` y `RUN --mount=type=secret,id=npmrc,target=/home/node/.npmrc`, nunca en el contexto ni en un *build arg*.
- Cómo verificar: build con un `.npmrc` señuelo que contenga `//registry.npmjs.org/:_authToken=FALSO` → falla con un mensaje que **no** muestra el valor; sin él → construye; `find` sobre `podman export` de la imagen final sin `.npmrc` ni `.env*`.
- Estado: verificado (2.9): `.npmrc` señuelo con `_authToken` → el build falla sin mostrar el valor; la comprobación final mira `.npmrc`, `.env*`, `*.pem` y `*.key` en `/app` (fuera de `node_modules`). **[Estado anterior]** abierto (baja, no bloquea)

## SEC-037: La etiqueta `-sucio` no cubre todo lo que entra en la imagen
- Severidad: baja
- Ubicación: deploy/app/construir.sh:39 (`git status --porcelain -- apps packages package.json pnpm-lock.yaml pnpm-workspace.yaml`)
- Descripción: el contexto también incluye `.npmrc`, `tsconfig*.json` y `tests/package.json` (containerignore), y ficheros ignorados por git dentro de `apps/`/`packages/` que el containerignore no excluye (git no los lista en `status`). Con cambios ahí, la imagen se etiqueta como el commit limpio y la etiqueta `org.opencontainers.image.revision` no describe su contenido: se pierde la trazabilidad de qué se probó en TESTING y se aprobó para DEMO/PROD (§3.8, T-21). Baja: el digest sigue siendo el identificador real.
- Responsable: infrastructure
- Cómo corregir: usar la misma lista que `containerignore` (`apps packages package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc 'tsconfig*.json' tests/package.json`) y añadir `--ignored=matching` para detectar ignorados dentro de esas rutas que no excluye el containerignore (o marcar `-sucio` si `git ls-files --others --ignored --exclude-standard -- apps packages` devuelve algo fuera de `node_modules`/`dist`/`.env*`). Mantener que el script no acepta `--build-arg` (las bases solo cambian editando el digest en el Containerfile).
- Cómo verificar: con un cambio sin commit en un `tsconfig*.json` de la raíz o en `tests/package.json` → etiqueta `<commit>-sucio`; sin cambios → `<commit>`.
- Estado: verificado (2.9). **[2.10d]** Sigue verificado en su alcance (el contenido de la imagen de la app: T3 y T6 de §6.12 dan `-sucio`). Que la lista no cubra `deploy/` ni los compose no lo reabre, porque eso no entra en la imagen de la app: es un problema del registro de aprobadas, y está en SEC-052 (e)–(g). Verificación de la 2.9: en un clon, con cambios en `tsconfig*`, `tests/package.json`, ficheros nuevos en `apps/` o `packages/` y `.npmrc` en `apps/api/` → `-sucio`; árbol limpio → `<commit>`. **[Estado anterior]** abierto (baja, no bloquea) **[2.3]** Ocurrió en la práctica: la imagen usada en las suites de la 2.2 es `69e823f40ad7-sucio` (etiqueta `revision` = `69e823f`), construida antes del commit `4460e09` desde un árbol con cambios. La imagen que se use para la puerta debe reconstruirse desde el commit final y sin `-sucio`.

## SEC-038: `verifyPin` no resiste peticiones simultáneas: se saltan el límite por IP y el bloqueo, y un acierto entra en una cuenta ya bloqueada
- Severidad: alta
- Ubicación: apps/api/src/modules/auth/verify-pin.ts:170 (límite por IP comprobado antes del hash), :193 (bloqueo comprobado con la fila leída por la ruta), :217 (hash), :218-227 (acierto: pone `failed_attempts = 0` y `locked_until = NULL` sin mirar el bloqueo actual) y :230-236 (el fallo se anota en IP y cuenta solo después del hash); apps/api/src/http/routes/auth.ts:83-91 y :126-140 (login: lee el usuario, verifica y crea la sesión sin volver a comprobar el bloqueo) y :225-262 (`POST /auth/pin`: igual con `currentPin`, y cambia el PIN); docs/arquitectura.md §7 (la secuencia de `verifyPin` no exige atomicidad)
- Descripción: las tres defensas contra la fuerza bruta del PIN (10 fallos/10 min por IP, escala 5/10/15/20 por cuenta y revocación en `locked_manual`, SEC-001 y SEC-016) son "comprobar y luego actuar": el límite por IP se consulta al entrar y el fallo se suma al terminar el hash (≈ 40 ms después); el bloqueo se mira en la fila que la ruta leyó **antes** de llamar a `verifyPin`. Todas las peticiones que llegan juntas pasan las comprobaciones y llegan al hash. Además, el acierto no comprueba si la cuenta se ha bloqueado entretanto: pone el contador a 0 y la ruta crea la sesión (o cambia el PIN). Prueba propia (app en proceso con `buildApp` y BD real de TESTING, Podman rootless, §6.8): (A) 300 logins simultáneos desde **una** IP contra un camarero con contador 0, el PIN correcto el último → 300 verificaciones argon2, 299 `401` y ningún `429` ni `423`, el último `200` con `Set-Cookie`; la cuenta acaba con `locked_manual = true` **y una sesión abierta**; (B) lo mismo con contador 19 (un fallo antes del bloqueo indefinido) → mismo resultado; (C) 300 `currentPin` simultáneos en `POST /auth/pin` desde una sesión con PIN provisional → 300 verificaciones, el PIN se cambia (`204`) aunque la cuenta queda en `locked_manual`; (A2) 3000 logins simultáneos → 516 verificaciones antes de que el límite por IP empiece a responder `429`. El diseño admite 10 verificaciones por IP en 10 min y 5 por cuenta antes del primer bloqueo. Con la rejilla pública de nombres (SEC-005), un dispositivo en la red del local prueba ~5 % de los PIN de 4 dígitos de un usuario por ráfaga (~1 min) y puede repetirlo con cada usuario; si acierta entra aunque la ráfaga haya bloqueado la cuenta, y en el camino deja bloqueadas de forma indefinida las cuentas atacadas (denegación de servicio, también del encargado). Requiere estar en la red del personal (SEC-002), por eso es alta y no crítica.
- Responsable: developer (`verify-pin.ts`, `rate-limit.ts`, rutas de `auth.ts`); software-engineer (añadir la exigencia de atomicidad a `docs/arquitectura.md` §7); testing (RS-05b)
- Cómo corregir: (1) **IP y sesión, reserva antes del hash**: en `FailureWindow`, un contador síncrono de verificaciones en curso por clave; `verifyPin` rechaza con `429` si `fallos en ventana + en curso ≥ límite`, reserva el hueco antes del primer `await` y lo libera al terminar (acierto) o lo convierte en fallo. Así una IP nunca tiene más verificaciones en vuelo que los fallos que le quedan. (2) **Cuenta, cobro antes del hash**: en vez de leer y luego contar, sumar el intento de forma atómica antes del hash, solo si la cuenta no está bloqueada: `UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = $1 AND NOT locked_manual AND (locked_until IS NULL OR locked_until <= $now) RETURNING failed_attempts` (0 filas → `423` con el estado leído en esa misma sentencia o en una relectura); aplicar la escala con el valor devuelto en la misma transacción (bloqueo y revocación) y, si el hash acierta, `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1 AND NOT locked_manual AND (locked_until IS NULL OR locked_until <= $now)`: 0 filas → la cuenta se bloqueó durante el hash → tratar como bloqueada (`423`), sin crear sesión ni cambiar el PIN. Alternativa equivalente: cerrojo por usuario en memoria (una sola instancia) que serialice las verificaciones de una misma cuenta, más la condición del acierto. Si el desarrollador elige otra forma, debe cumplir RS-05b. (3) **Crear la sesión y cambiar el PIN dentro de la misma condición**: en `POST /auth/login`, el `INSERT` de la sesión solo si el acierto anterior tocó una fila; en `POST /auth/pin`, el `UPDATE users SET pin_hash … WHERE id = $1 AND NOT locked_manual AND (locked_until IS NULL OR locked_until <= $now)` y comprobar que cambió una fila. (4) Defensa en profundidad: semáforo explícito de 4 verificaciones argon2 con cola acotada (p. ej. 32; llena → `503`) en lugar de depender del tamaño por defecto del *threadpool* de libuv (RS-08), para que una ráfaga no deje en espera sin límite ni bloquee DNS/`fs` del proceso. (5) El `approval` (HU-06) debe usar el mismo mecanismo desde el principio.
- Cómo verificar: RS-05b en integración (los cuatro casos, con *hasher* espía); repetir la prueba propia de §6.8 (escenarios A, B, C con N = 300 y A2 con N = 3000): A2 ≤ 10 verificaciones; A/B con el PIN correcto al final → `423`/`429` y 0 sesiones abiertas; C → el PIN no cambia. Revisión de código de los tres puntos.
- Estado: **verificado (2.6)**. Reserva síncrona de IP/sesión, cerrojo FIFO por cuenta con `load()` en el turno, acierto y sesión/cambio de PIN en la transacción condicionada y semáforo de 4 (§6.9 punto 1). RS-05b 4/4 en verde; prueba propia: A 5 verificaciones y el correcto `429` con 0 sesiones, B 1 verificación y el correcto `423` con 0 sesiones, C el PIN no cambia, A2 10 verificaciones de 3000. Salvedades que no bloquean: SEC-047 (clave del cerrojo, baja); cola acotada del semáforo pendiente con SEC-043 (D-2.5-03 a); atomicidad aún sin documentar en `docs/arquitectura.md` §7 (software-engineer).

## SEC-039: El flujo SSE de una sesión caducada por inactividad sigue abierto y recibiendo eventos
- Severidad: baja
- Ubicación: apps/api/src/realtime/hub.ts:200-209 (`ping()` solo cierra por caducidad absoluta); apps/api/src/http/guard.ts:48-63 (`markExpired` marca `expired_reason` y no cierra los flujos de esa sesión); docs/arquitectura.md §6 y §7 (no dicen qué pasa con el flujo al caducar por inactividad)
- Descripción: el flujo SSE no cuenta como actividad (RS-12), pero la inactividad solo se comprueba en peticiones REST. Prueba propia: camarero con flujo abierto, reloj +20 min → `GET /auth/me` da `401 idle` (y la fila queda con `expired_reason = idle`), pero el flujo sigue abierto y recibe `ping` cada 2 s; seguiría así hasta la caducidad absoluta (12 h). `docs/permisos.md` §5 dice que toda revocación y la caducidad cierran el flujo. La SPA cierra su propio `EventSource` al caducar (SEC-032), así que solo lo aprovecha un cliente que no sea la SPA y tenga la cookie (`HttpOnly`, difícil de obtener). Hoy solo circulan `hello`/`ping`; desde HU-02 serían pedidos, importes y cobros para una sesión ya caducada.
- Responsable: developer (`hub.ts`, `guard.ts`); software-engineer (documentarlo en §6/§7)
- Cómo corregir: (1) `markExpired` (y cualquier caducidad detectada) cierra los flujos de esa sesión tras escribir la fila (`hub.end` con motivo `expired`, sin `session.revoked` o con un evento propio si UX lo quiere); (2) el hub guarda en memoria la última actividad de cada sesión con flujo (actualizada por `touch` y por el login) y, en el `ping`, cierra los flujos de roles distintos de `kitchen` cuya sesión lleve ≥ 15 min sin actividad (la barra sigue exenta mientras tenga la cola abierta); o bien una consulta acotada cada 30–60 s de `last_activity_at` de las sesiones con flujo.
- Cómo verificar: integración con `FakeClock`: camarero con flujo, +15 min sin peticiones → el flujo se cierra en ≤ 1 ping (2 s) sin ninguna petición REST; con `GET /auth/me` → `401 idle` → el flujo se cierra en ≤ 1 s; barra con la cola abierta → no se cierra. Debe estar corregido antes de entregar HU-02.
- Estado: **verificado (2.6, prueba propia)**: camarero +15 min sin peticiones → flujo cerrado en 1,8 s; con actividad a los 10 min → abierto; barra → abierta (§6.9 punto 3). Pendiente: test de regresión (D-2.5-02, testing) y documentación en §6/§7 (D-2.5-03 e, software-engineer).

## SEC-040: Falta el tope global de 50 flujos SSE (RS-23)
- Severidad: baja
- Ubicación: apps/api/src/realtime/hub.ts:75-83 (`open()`: solo cierra el más antiguo de la misma sesión; no hay límite total)
- Descripción: RS-23 y `docs/permisos.md` §3.2 piden ≤ 2 flujos por sesión **y ≤ 50 en total**. Prueba propia: 30 sesiones de barra × 2 flujos → 60 flujos abiertos, ningún rechazo. Cada login crea una sesión nueva y una cuenta puede tener muchas, así que un empleado (o una cuenta comprometida) puede abrir flujos sin límite y agotar descriptores y memoria del único proceso `app` (denegación de servicio a todo el local).
- Responsable: developer
- Cómo corregir: en `open()`, si `conns.size ≥ 50` (constante con nombre, en `AppDeps` si Testing lo necesita) tras cerrar los sobrantes de la misma sesión, responder `503` con `Retry-After` antes de `hijack` (o desde la ruta antes de abrir el flujo) y registrar `sse.rejected` con `reason = global_limit`; métrica con la etiqueta correspondiente.
- Cómo verificar: integración: 51.º flujo de una sesión distinta → `503` y los 50 anteriores siguen abiertos; 3.er flujo de una sesión con 50 abiertos → se cierra su más antiguo y el nuevo entra.
- Estado: **verificado (2.6, prueba propia)**: 50 flujos abiertos; el 51.º de otra sesión → `503 SERVICE_UNAVAILABLE`, `Retry-After: 5`, `no-store`; el 3.º de una sesión con 50 → `200` (§6.9 punto 3). Pendiente: test de regresión (D-2.5-02, testing).

## SEC-041: `Cache-Control: no-store` solo en tres respuestas de `/api` (RS-27)
- Severidad: baja
- Ubicación: apps/api/src/http/errors.ts:51-60 (`sendError` sin `Cache-Control`); apps/api/src/http/routes/auth.ts:180 (`204` del *logout*), :266 (`204` de `POST /auth/pin`), :276 (`204` de `POST /session/activity`); solo llevan `no-store` `GET /auth/login-options`, `POST /auth/login` y `GET /auth/me`
- Descripción: RS-27 pide `Cache-Control: no-store` en todo `/api/*`. Prueba propia: `401`, `403`, `404` y `204` de `/api` salen sin la cabecera. Riesgo bajo hoy (no hay caché compartida y los errores no llevan datos), pero cada ruta nueva de HU-02..HU-08 tendría que acordarse de ponerla (pedidos, cobros e importes).
- Responsable: developer
- Cómo corregir: un `onSend` (o en el primer `onRequest`) que ponga `Cache-Control: no-store` en toda respuesta cuya ruta empiece por `/api/` salvo el flujo SSE (que mantiene `no-cache, no-transform`), en lugar de ponerla ruta a ruta.
- Cómo verificar: integración: `GET /auth/me` `200` y `401`, `POST /auth/logout` `204`, `POST /auth/login` `403`/`401`/`429`, `GET /api/v1/no-existe` `404` → todas con `cache-control: no-store`; `GET /events` con `no-cache, no-transform`.
- Estado: **verificado (2.6, prueba propia)**: `no-store` en `200`/`400`/`401`/`403`/`404`/`429`/`503`/`204` de `/api`; SSE con `no-cache, no-transform` (§6.9 punto 3). Pendiente: test de regresión (D-2.5-02, testing).

## SEC-042: Un carácter `NUL` en el nombre de login produce `500` y un log de error con traza
- Severidad: baja
- Ubicación: packages/shared/src/api.ts:35 (`name: z.string().min(1).max(30)` admite caracteres de control); apps/api/src/http/routes/auth.ts:83-87 (la consulta falla en PostgreSQL)
- Descripción: prueba propia: `POST /auth/login {"name":"a\u0000b","pin":"…"}` → `500 INTERNAL` y `http.request.unhandled_error` en nivel `error` con el mensaje de PostgreSQL (`invalid byte sequence for encoding "UTF8": 0x00`, `22021`) y 2 KiB de traza. No se calcula el hash ni se cuenta el intento, y no sale el PIN, pero cualquiera sin sesión puede generar `5xx` y líneas de error a voluntad (ruido en las alertas de errores y en los logs; las peticiones fallidas tampoco cuentan para el límite por IP).
- Responsable: developer (esquemas de `packages/shared`); software-engineer (regla general para campos de texto en §5)
- Cómo corregir: un esquema de texto común para todos los campos de texto de la API (`name`, y después notas, motivos, `customerRef`) que rechace caracteres de control (`/[\u0000-\u001F\u007F]/`) con `400 VALIDATION_FAILED` y `rule: 'format'`; normalizar a NFC si se compara por nombre.
- Cómo verificar: integración: login con `\u0000`, `\u0007` y `\n` en el nombre → `400` con `path: ['name']`, sin líneas de nivel `error` en el log.
- Estado: **verificado (2.6, prueba propia)**: `\u0000`, `\u0007`, `\n`, `\u007f` → `400` `rule: 'format'` en `name`, sin líneas `error` (§6.9 punto 3). Pendiente: test de regresión (D-2.5-02, testing) y regla general de texto (D-2.5-03 c, software-engineer; recomendaciones en §6.9 punto 3).

## SEC-043: El límite por IP usa la dirección IPv6 completa y expulsa entradas bloqueadas cuando se llena
- Severidad: baja
- Ubicación: apps/api/src/modules/auth/verify-pin.ts:170, :231 (clave = `clientIp` completa); apps/api/src/modules/auth/rate-limit.ts:55-66 (`prune`: con 10 000 claves borra las más antiguas aunque estén bloqueadas)
- Descripción: con IPv6, un equipo puede usar muchas direcciones de su `/64` (direcciones temporales) y cada una tiene su propio cupo de 10 fallos: el límite por IP, que es la defensa contra el rociado de PIN entre usuarios (§6.1.5), deja de servir. Además, si se llenan las 10 000 claves, `prune` borra también entradas bloqueadas, así que el atacante con muchas direcciones puede borrar su propio bloqueo. El bloqueo por cuenta sigue funcionando. Depende de que la red del local tenga IPv6 hasta Caddy y de que Caddy vea la dirección real (SEC-003), de ahí baja.
- Responsable: software-engineer (§7: clave del límite por IP) y developer
- Cómo corregir: clave del límite = IPv4 completa o prefijo `/64` de la IPv6 (normalizando las IPv4 mapeadas); en `prune`, no borrar nunca una entrada con `blockedUntil > now` (si sigue lleno, rechazar con `429` las claves nuevas mientras dure, o subir el tope).
- Cómo verificar: unitario de `FailureWindow`/clave: 10 fallos desde `2001:db8::1` y el 11.º desde `2001:db8::2` → `429`; con el mapa lleno de claves sin bloqueo, una clave bloqueada sigue bloqueada tras insertar 10 000 claves nuevas.
- Estado: abierto (baja, no bloquea). **[2.6]** Aplazamiento aceptado hasta la decisión del software-engineer (D-2.5-03 d), con condiciones: corregir antes de empezar HU-06 y, en todo caso, antes de la puerta de la Etapa 3, junto con el tope de la cola del semáforo argon2 (§6.9 punto 4).

## SEC-044: Dependencias de desarrollo con vulnerabilidades críticas (`tinypool` 1.1.1) y moderadas (`vitest` 3.2.7)
- Severidad: baja (en nuestro contexto; el aviso las clasifica críticas)
- Ubicación: pnpm-lock.yaml:1282, :2293 (`tinypool@1.1.1`, dependencia de `vitest`), tests/package.json:25 (`"vitest": "^3.2.0"`, resuelto a 3.2.7)
- Descripción: `pnpm audit` (sin `--prod`): `tinypool` GHSA-5gmw-xhrv-c9v3 y GHSA-85c8-ppgw-ccpr (*gadgets* de contaminación de prototipo que llevan a ejecución de código en las opciones del *worker* y de `run()`), corregidas en ≥ 2.1.2; `vitest`/`@vitest/mocker` GHSA-82fw-gwwq-j7x9 (lectura de ficheros por *redirect mock*) y GHSA-qxg6-89mg-rqv8 (registro de *mocks* sin autenticar), corregidas en ≥ 4.1.12. `pnpm audit --prod`: 0. No llegan a la imagen de la app (RS-39 solo exige `--prod`) y los ejecutores de tests corren endurecidos, sin red (unitario) y con el repositorio en `ro`; explotarlas exige una contaminación de prototipo previa en el proceso de tests o el servidor de *browser mode*/UI de Vitest, que no se usa. De ahí baja.
- Responsable: testing
- Cómo corregir: actualizar `vitest` a ≥ 4.1.12 (arrastra `tinypool` ≥ 2.1.2 y `@vitest/mocker` corregido) y fijar la versión exacta en `tests/package.json`; revisar a la vez D-2.2-01 (`--configLoader runner`), que puede cambiar con la versión mayor. No usar `vitest --ui` ni *browser mode* sin revisar.
- Cómo verificar: `pnpm audit` (sin `--prod`) en contenedor → sin críticas ni altas; suites unitaria, de integración y de seguridad en verde con la nueva versión.
- Estado: **verificado (2.6)**: `tests/package.json` con `"vitest": "4.1.12"` exacto; `pnpm audit` y `pnpm audit --prod` en contenedor → 0 vulnerabilidades; suites `unit`, `integration` y `security` en verde.

## SEC-045: Faltan pruebas de regresión y comprobaciones estáticas de seguridad de HU-01
- Severidad: baja
- Ubicación: tests/unit/api/config.unit.test.ts:112-167 (SEC-029); tests/e2e/HU-01-iniciar-sesion.e2e.ts:414 (SEC-032); sin test de concurrencia de `verifyPin`; sin test de RS-16c, RS-25 ni RS-35; ningún e2e comprueba la ausencia de violaciones de CSP (RS-26, parte E)
- Descripción: el código cumple (§6.8), pero estas propiedades no tienen test que avise si se rompen: (a) concurrencia de `verifyPin` (RS-05b, SEC-038); (b) casos de SEC-029 de "Pasa a verificado" que no están: `" "`, espacio final, `[::1]`, `::/119`, `::ffff:10.0.0.0/104`, `::ffff:10.89.240.0/120` aceptado y `buildApp` con `trustedProxies: ['uniquelocal']` → `ConfigError`; (c) SEC-032: e2e con la respuesta de una petición de la sesión vieja y la reconexión SSE retrasadas 3 s y login nuevo durante el retraso (la cookie nueva sigue y la siguiente petición da `200`); (d) RS-16c: test que falla si un módulo distinto del módulo `auth` importa `argon2` o recibe el `PinHasher`; (e) RS-25: regla que falla si `apps/web` usa `dangerouslySetInnerHTML`, `innerHTML`, `eval` o `new Function`; (f) RS-35: búsqueda de `sql.raw`/`sql.lit`/`sql.ref`/`sql.id` y concatenación en `apps/api`; (g) RS-26 E: los e2e a través de Caddy fallan con cualquier `securitypolicyviolation` o error de CSP en consola.
- Responsable: testing ((a)–(c), (g)); developer con testing ((d)–(f): ESLint o test estático en `tests/security/`)
- Cómo corregir: añadir los casos citados; (d)–(f) pueden ser un único test estático que recorra `apps/` con expresiones regulares (sin dependencias nuevas) dentro de la suite `security`.
- Cómo verificar: Cybersecurity revisa los tests; cada uno falla si se introduce a propósito el defecto (p. ej. quitar la reserva de SEC-038, `trustProxy: true`, un `innerHTML` de prueba en una rama local).
- Estado: **verificado (2.6)**: (a) RS-05b (4 tests; fallaban antes de la 2.5 y pasan con la corrección); (b) casos de SEC-029 en `tests/unit/api/config.unit.test.ts` (incluido `uniquelocal`); (c) `tests/e2e/HU-01-sec032-retraso.e2e.ts`; (d)–(f) `tests/security/estatico.sec.test.ts` con casos de control que inyectan cada defecto; (g) vigilante de CSP en `tests/support/e2e/base.ts` con su control en `HU-01-csp`. Las regresiones de SEC-039..SEC-042 y SEC-047 son tareas nuevas (D-2.5-02 y SEC-047), no de este hallazgo.

## SEC-046: La imagen final incluye binarios de `argon2` de otras plataformas
- Severidad: baja
- Ubicación: imagen `localhost/mi-app:69e823f40ad7-sucio`, `/app/node_modules/.pnpm/argon2@0.45.2/node_modules/argon2/prebuilds/` (10 ficheros `.node`: `win32-x64`, `darwin-arm64`, `freebsd-*`, `linux-arm*`, `linux-x64` musl); deploy/app/Containerfile (copia `node_modules` de `pnpm deploy` entero)
- Descripción: `docs/reglas-equipo.md` §3.2 pide que la imagen final contenga solo lo necesario; solo se usa `linux-x64/argon2.glibc.node`. Los demás no se cargan y no tienen vulnerabilidades conocidas (ninguno enlaza `libssl`), pero son código nativo de terceros sin uso que el escáner y las comprobaciones de SEC-033 tienen que revisar en cada build.
- Responsable: infrastructure
- Cómo corregir: en la etapa de construcción, tras `pnpm deploy`, borrar de `prebuilds/` todo lo que no sea la plataforma de la imagen (`linux-x64` glibc) y comprobar que la imagen arranca y verifica un PIN (smoke de `create-initial-manager` + login).
- Cómo verificar: `find /app -name '*.node'` sobre la raíz exportada → solo `linux-x64/argon2.glibc.node`; suites `containers` e integración en verde.
- Estado: abierto (baja, no bloquea). **[2.6]** Sigue en la imagen `0b3c9f111c63` (10 `.node` de `argon2`, solo se usa `linux-x64/argon2.glibc.node`).

## SEC-047: La clave del cerrojo por cuenta de `verifyPin` usa `toLowerCase()` de JavaScript y la búsqueda `lower()` de PostgreSQL: variantes del nombre esquivan la serialización
- Severidad: baja
- Ubicación: apps/api/src/http/routes/auth.ts:19-21 (`accountKey` = `name.toLowerCase()`), :93 (login), :242 (`POST /auth/pin`, con `s.name`), frente a :98 (`lower(name) = lower(${body.name})`) y apps/api/src/db/migrations/0001_hu01_auth.ts:22 (índice único sobre `lower(name)`); apps/api/src/modules/auth/serialize.ts:10-33
- Descripción: PostgreSQL y JavaScript no pasan a minúsculas igual. Comprobado con la imagen `db` (PostgreSQL 19, `C.UTF-8`): `lower('İris') = lower('Iris')` (U+0130 → `i`) y `lower('ΑΣ') = lower('Ασ')`; en JS, `'İris'.toLowerCase()` = `'i̇ris'` (`i` + U+0307) y `'ΑΣ'.toLowerCase()` = `'ας'`. Cada variante identifica la misma cuenta en la BD pero cae en un carril distinto del `KeyedSerializer`, así que sus verificaciones van en paralelo y vuelve, acotado, el "comprobar y luego actuar" de SEC-038 sobre el contador de la cuenta. Prueba propia (§6.9): usuario `iiii…` (4 `i` → 16 variantes con `i`/`İ`), 16 logins simultáneos con PIN erróneo desde IP distintas → **16 verificaciones** y contador 16 (RS-05b: ≤ 5); con contador 19, 15 variantes erróneas y el PIN correcto con otra variante → 16 verificaciones, contador 34 y `locked_manual`, y el acierto **sí** da `423` con 0 sesiones (la condición del `UPDATE` de SEC-038 sigue protegiendo). Efecto: una ráfaga hace tantos intentos como variantes tenga el nombre (2^k con k letras `i`, limitado también a 10 en curso por IP) en lugar de parar en el umbral; hasta el bloqueo indefinido caben unos 20 + (variantes − 1) intentos en vez de 20 (con 16 variantes, ~0,35 % de los PIN de 4 dígitos en vez de 0,2 %). No permite entrar en una cuenta bloqueada ni saltarse el límite por IP; de ahí baja.
- Responsable: developer; testing (caso nuevo de RS-05b)
- Cómo corregir: que la clave del cerrojo salga de la misma normalización que la búsqueda. Preferible: resolver el `id` antes del cerrojo con la misma condición (`SELECT id FROM users WHERE lower(name) = lower($1)`) y usar `user:<id>` como clave, y `user:<s.userId>` en `POST /auth/pin` (así login y cambio de PIN de la misma cuenta comparten carril); para un nombre que no existe, `unknown:` + el `lower()` calculado por PostgreSQL. `load()` sigue releyendo la fila en el turno. Alternativa: calcular la clave con `SELECT lower($1)` en PostgreSQL. No basta con `toLocaleLowerCase()` ni con normalizar a NFC en JS.
- Cómo verificar: integración (RS-05b ampliado): usuario con 4 `i` en el nombre, 16 logins simultáneos con las variantes `i`/`İ` desde IP distintas → ≤ 5 verificaciones y contador ≤ 5; un login y un `POST /auth/pin` simultáneos de la misma cuenta nunca verifican a la vez (espía del *hasher*).
- Estado: abierto (baja, no bloquea; corregir en el siguiente ciclo de HU-01 o, como tarde, antes de empezar HU-06)

## SEC-048: La imagen de la app tiene una vulnerabilidad alta con corrección en `libzstd1` (CVE-2026-124851)
- Severidad: alta (por `docs/reglas-equipo.md` §3.3 y RS-39: alta con versión corregida, no admite excepción; riesgo real bajo)
- Ubicación: deploy/app/Containerfile (`RUNTIME_IMAGE` = `gcr.io/distroless/nodejs26-debian13@sha256:b462e87a…`); imagen `localhost/mi-app:0b3c9f111c63` (`sha256:66fcdf09…`), paquete `libzstd1` 1.5.7+dfsg-1 (`/usr/lib/x86_64-linux-gnu/libzstd.so.1.5.7`)
- Descripción: Trivy 0.76.2 (DB del 2026-11-26) da CVE-2026-124851 (revelación de información por un búfer sin inicializar en Zstandard), HIGH, `fixed` en 1.5.7+dfsg-1+deb13u1. En la imagen solo la enlaza `libcrypto.so.3` del sistema, que no carga nadie (`node` lleva su propio OpenSSL y no enlaza `libzstd`; ningún `.node` enlaza `libcrypto`, SEC-033 condición 4), así que hoy no es alcanzable. Pero hay versión corregida y la política no admite altas corregibles (EXC-01 cubre solo las dos CVE de `libssl3t64`). En la 2.3 no salía: el aviso es posterior. Es lo que el escaneo en cada build (SEC-034) debe atrapar.
- Responsable: infrastructure
- Cómo corregir: actualizar `RUNTIME_IMAGE` al digest actual de `gcr.io/distroless/nodejs26-debian13` con `libzstd1` ≥ 1.5.7+dfsg-1+deb13u1 (y comprobar si ya trae `libssl3t64` corregido: en ese caso, retirar EXC-01 por su condición 1); actualizar `docs/infraestructura.md` §8; reconstruir desde el commit y repetir las comprobaciones 3 y 4 de SEC-033. Si el digest nuevo cambia la versión de Debian o el `purl` de `libssl3t64`, EXC-01 deja de aplicarse sola y la revisa Cybersecurity.
- Cómo verificar: Trivy con el fichero de EXC-01 sobre la imagen reconstruida → 0 críticas/altas (como mucho las 2 *suppressed*); suites `containers`, `integration` y `e2e` en verde con esa imagen.
- Estado: verificado (2.9): `libzstd1` 1.5.7+dfsg-1+deb13u1 en la base `13e3ac17…`; Trivy sobre `localhost/mi-app:0af133152b01` (`sha256:72766f8e…`): 0 críticas/altas salvo las 2 de EXC-01; condiciones 3 y 4 de SEC-033 cumplidas; TX-CONT-01 PASA. Falta que testing repita `integration` y `e2e` con esta imagen para la puerta. **[Estado anterior]** abierto (**alta, bloquea la puerta de la Etapa 2**)

## SEC-049: La imagen de PostgreSQL tiene una crítica y 26 altas (`gosu` y `libxml2`)
- Severidad: alta (el escáner: 1 crítica y 26 altas, todas con corrección; riesgo real bajo)
- Ubicación: compose.dev.yaml:95 y compose.test.yaml:108 (`docker.io/library/postgres:19.0-alpine@sha256:8b0ff4cd…`, Alpine 3.24.4); docs/infraestructura.md §8 (tabla de imágenes); dentro de la imagen: `libxml2` 2.13.9-r2 (CVE-2026-86144, HIGH, corregida en 2.13.9-r3) y `/usr/local/bin/gosu`, compilado con Go 1.24.6: CVE-2025-68121 (CRITICAL, `crypto/tls`) y 25 HIGH de la biblioteca estándar, corregidas en versiones posteriores de Go
- Descripción: primer escaneo de esta imagen (Trivy 0.76.2, §6.9 punto 8). Alcance real: `gosu` solo lo usa `docker-entrypoint.sh` cuando arranca como root para bajar a `postgres`; nuestros `db` corren con `user: 1000:1000`, `cap_drop: ALL` y `no-new-privileges`, así que no se ejecuta (y aunque se ejecutara no podría cambiar de usuario) y además no hace TLS. `libxml2` solo entra en las funciones XML de SQL (`xmlparse`, `xpath`…): hace falta ejecutar SQL arbitrario como `app_rw` (la app no las usa y no construye SQL a mano, RS-35). Aun así, son críticas/altas en una imagen desplegable y la regla de bloqueo se aplica.
- Responsable: infrastructure
- Cómo corregir: (1) actualizar a un digest actual de `postgres:19.x-alpine` (misma versión mayor, ADR-003) con `libxml2` ≥ 2.13.9-r3 en los dos compose y en `docs/infraestructura.md`, y volver a escanear; (2) si el `gosu` del digest nuevo sigue marcado, dos opciones: imagen derivada sin `/usr/local/bin/gosu` (el *entrypoint* no lo usa con UID no root; comprobar `initdb` y los scripts de `docker-entrypoint-initdb.d`), o pedir a Cybersecurity una excepción fechada **solo** para ese binario por versión, que se concedería si: ningún servicio `db` de DEV/TESTING/DEMO/PROD arranca como root, todos tienen `no-new-privileges` y `cap_drop: ALL` (comprobado con `podman-compose config`), ningún `command`/`entrypoint` llama a `gosu`, y revisión a los 30 días. Lo que tiene corrección (`libxml2`) no admite excepción.
- Cómo verificar: Trivy sobre `podman save` del digest nuevo → 0 críticas/altas (o solo las de `gosu` como *suppressed* con la excepción); `sh tests/run.sh integration` y `e2e` en verde con el digest nuevo.
- Estado: **verificado (2.10b)**: imagen derivada `localhost/mi-app-db:19.0-alpine3.24` (`deploy/db/Containerfile`, base `postgres:19.0-alpine3.24@sha256:8e81a484…`; imagen `sha256:b5bd1672…` y otra construida por Cybersecurity desde el clon): Alpine 3.24.4, `libxml2` 2.13.9-r5, sin `/usr/local/bin/gosu` ni binarios *setuid*, `USER 1000:1000`, `HEALTHCHECK`; Trivy 0 sin excepciones y con todas las severidades; arranca *healthy* endurecida (HUSER 100999). **EXC-02 retirada** (`trivyignore-db.yaml` borrado). Lo que falta en la imagen (`zstd`, `libffi`) es SEC-055 (§6.11 punto 1). **[Estado anterior]** abierto (**alta, bloquea la puerta de la Etapa 2**) **[2.9] Sigue abierto (alta, bloquea la puerta de la Etapa 2).** (a) `gosu`: riesgo aceptado con **EXC-02** hasta el 2026-12-26, no prorrogable (§6.10, punto 4): ninguno de los 26 CVE está en código que `gosu` enlace (`nm`) y `gosu` no se ejecuta. (b) `libxml2`: **no corregido**. `alpine3.23` trae 2.13.9-r1 sin los parches de CVE-2026-86144 y otras; Trivy da 0 solo porque la secdb de 3.23 no las registra (SEC-051). Corrección: imagen derivada de `postgres:19.0-alpine3.24@sha256:…` con `libxml2` ≥ 2.13.9-r3 (hoy r5 en el repositorio) y sin `/usr/local/bin/gosu`, `USER 1000:1000`, construida en rootless, escaneada y referenciada por digest en todos los entornos; con ella se retira EXC-02. Alternativa: un `postgres:19.x-alpine3.24` oficial que traiga `libxml2` ≥ r3 (hoy no existe), con EXC-02 como mucho hasta el 2026-12-26.

## SEC-050: La imagen de Caddy tiene dos vulnerabilidades altas (`go-jose` sin corrección y `x/net` con corrección)
- Severidad: alta (el escáner: 2 altas; riesgo real bajo con el Caddyfile actual)
- Ubicación: compose.test.yaml:275 (`docker.io/library/caddy:2.11.9-alpine@sha256:003a9780…`; la misma imagen está prevista para DEMO y PROD, docs/infraestructura.md §8); `/usr/bin/caddy`: `github.com/go-jose/go-jose/v3` v3.0.5 (CVE-2026-116587, HIGH, denegación de servicio con parámetros RSA manipulados en un JWK, `affected`, sin corrección) y `golang.org/x/net` v0.60.0 (CVE-2026-78661, HIGH, denegación de servicio en `x/net/html`, corregida en 0.62.0)
- Descripción: primer escaneo de esta imagen (§6.9 punto 8). Caddy es el borde: atiende a todos los dispositivos de la red del local. Con `deploy/proxy/Caddyfile` (`admin off`, sin `acme_server`, sin `templates` ni `markdown`) Caddy no analiza JWK enviados por clientes ni HTML de respuestas, y en PROD con ACME solo habla con la CA pública. Riesgo real bajo, pero son altas en la imagen más expuesta y la regla de bloqueo se aplica.
- Responsable: infrastructure
- Cómo corregir: (1) actualizar, por digest, a la última versión 2.x de Caddy cuyo binario lleve `x/net` ≥ 0.62.0 (y `go-jose` corregido, si ya existe), en `compose.test.yaml` y `docs/infraestructura.md`, y repetir los e2e (cabeceras de RS-26, SSE sin búfer, CA interna); (2) para lo que siga sin corrección (`go-jose`), pedir a Cybersecurity una excepción fechada por `purl` y versión; se concedería si el Caddyfile sigue sin `acme_server`, con `admin off` y sin módulos que analicen JWK de clientes, con caducidad a los 30 días o al salir la corrección, lo que llegue antes.
- Cómo verificar: Trivy sobre `podman save` del digest nuevo → 0 críticas/altas salvo las cubiertas por la excepción (*suppressed*); `sh tests/run.sh e2e` en verde.
- Estado: abierto (**riesgo aceptado con EXC-03** — **[2.10d]** sigue vigente con la imagen derivada `localhost/mi-app-proxy` (SEC-055): `/usr/bin/caddy` idéntico al oficial (`a563843e…`), mismas 2 altas, ningún Caddy posterior a 2.11.9 publicado el 2026-11-26; condición reescrita: derivada de la oficial por digest, con binario idéntico y la misma configuración de arranque (`Cmd`/`Entrypoint`, que hoy se cumple y aún no se comprueba: SEC-056 M11) —; **[2.10b]** la condición SEC-054 para la puerta se cumple: `comprobar-excepciones.sh` en el build, verificado; las vías indirectas son SEC-056, antes de DEMO; el `zstd-libs` de la imagen del proxy no lo cubre EXC-03: SEC-055 —; hasta el 2026-12-26 o 7 días después de que salga un Caddy 2.x con `x/net` ≥ 0.62.0 y sin `go-jose/v3` vulnerable; no bloquea mientras se cumplan sus condiciones; **SEC-054 antes de la puerta de la Etapa 2**; ratificación humana pendiente). **[2.9]** No hay Caddy corregido publicado (v2.11.9 es la última; `master` ya lleva `x/net` v0.62.0 y no lleva `go-jose/v3`); `xcaddy` no hace falta (§6.10, punto 5). **[Estado anterior]** abierto (**alta, bloquea la puerta de la Etapa 2**)

## SEC-051: La variante `alpine3.23` de PostgreSQL oculta al escáner las CVE de `libxml2` que no ha portado
- Severidad: media (la vulnerabilidad en sí cuenta en SEC-049, alta)
- Ubicación: compose.dev.yaml:95 y compose.test.yaml:108 (`postgres:19.0-alpine3.23@sha256:40ad7e45…`); docs/infraestructura.md §8 ("trae `libxml2` corregido: 0 altas en el sistema") y §8.2
- Descripción: para Alpine, Trivy solo conoce las CVE que la secdb de la rama da por **corregidas**. Alpine no registra "afectado sin corrección", así que una rama que no ha portado un parche sale limpia. Alpine 3.23 no ha portado ninguna corrección de `libxml2` de 2026 salvo CVE-2026-6732: su repositorio está en 2.13.9-r1, y 3.24 en 2.13.9-r5 (CVE-2026-86144 en r3; CVE-2026-0990, -0992, -86137…-86143 en r4; CVE-2026-0989, -11979, -1757 en r5). El 0 de Trivy en `alpine3.23` no significa que esté corregido. El cambio de la 2.7 no cierra el `libxml2` de SEC-049: lo esconde. Es una debilidad del método que afecta a cualquier imagen Alpine que no esté en la rama más reciente (§6.10, punto 3).
- Responsable: infrastructure
- Cómo corregir: (1) volver a la rama Alpine más reciente con soporte (hoy 3.24) en las imágenes Alpine desplegables y resolver SEC-049 sobre ella (imagen derivada con `libxml2` ≥ 2.13.9-r3, §6.10 punto 4); (2) añadir la regla a `docs/infraestructura.md` §8: imágenes Alpine desplegables solo sobre la rama más reciente. Bajar de rama exige aprobación de Cybersecurity con la comparación de `secfixes`/APKBUILD de los paquetes afectados entre ramas; (3) corregir §8 y §8.2 ("`libxml2` corregido").
- Cómo verificar: en la imagen de `db`, `cat /etc/alpine-release` = 3.24.x (o la rama más reciente) y `apk info -v | grep '^libxml2-'` ≥ 2.13.9-r3; Trivy con 0 HIGH/CRITICAL en el SO.
- Estado: **verificado (2.10b)**: db en Alpine 3.24.4 con `libxml2` 2.13.9-r5; `deploy/db/construir.sh` rechaza una rama que no sea 3.24.x; regla de rama más reciente en `docs/infraestructura.md` §8; §8/§8.2 corregidos. La regla es necesaria pero no suficiente: Alpine publica "security upgrades" sin anotarlas en `secfixes` también en la rama actual (`zstd` 1.6.0-r1) → **SEC-055**. **[Estado anterior]** abierto (media)

## SEC-052: El escaneo se puede sustituir o saltar: escáner configurable por entorno y ninguna comprobación después del build
- Severidad: media
- Ubicación: deploy/scan/escanear.sh:16 (`TRIVY_IMAGE=${TRIVY_IMAGE:-…}`); deploy/app/construir.sh:144 (`escanear app "$REPO:$ETIQUETA"`, por etiqueta); tests/run.sh (acepta cualquier `APP_IMAGE`)
- Descripción: (1) basta `TRIVY_IMAGE=<otra imagen>` en el entorno para que `construir.sh` "escanee" con otra imagen, por ejemplo una que siempre salga con 0, e imprima `APP_IMAGE` sin avisar. La variable no está documentada (§14.1 dice "Trivy fijado por digest") y no se valida. (2) El escaneo solo existe dentro de `construir.sh`. Una imagen hecha con `podman build` directo, o una rechazada (sigue en el almacén y se puede usar por digest), se acepta en `tests/run.sh` y llegaría igual a DEMO/PROD: ni las suites ni el despliegue comprueban que el digest tenga un escaneo aprobado y reciente. (3) La app se escanea por etiqueta y no por el digest que luego se imprime, así que un `podman tag` simultáneo haría escanear otra imagen. La probabilidad es baja (hace falta una acción del propio equipo o de un agente), pero es justo el control que sostiene la regla de imágenes sin críticas/altas en DEMO/PROD.
- Responsable: infrastructure (testing, para `tests/run.sh`)
- Cómo corregir: (1) quitar la variable o aceptarla solo si es `docker.io/aquasec/trivy@sha256:<64 hex>`, y mostrar en la salida la imagen usada; (2) escanear `"$REPO@$DIGEST"`; (3) al aprobar, guardar un registro (`$SCAN_DIR/aprobadas/<digest>` con la fecha, los digests de db/proxy y el sha256 de los ficheros de excepciones), y que el despliegue de DEMO/PROD y `tests/run.sh` (al menos en la ejecución de la puerta) rechacen un `APP_IMAGE` sin registro o con un escaneo de más de 7 días.
- Cómo verificar: `TRIVY_IMAGE=docker.io/library/alpine:3.24 sh deploy/app/construir.sh x` → falla; `APP_IMAGE=<digest sin registro> sh tests/run.sh containers` → falla con un mensaje claro; lo mismo en el despliegue de DEMO.
- Plazo: (1) y (2) en la próxima entrega de infrastructure; (3) antes del despliegue de DEMO (Etapa 4).
- Estado: abierto (media, no bloquea la puerta de la Etapa 2). **[2.10d]** (3a) **verificado con builds reales**: rechazo del mismo digest (`68641536…`, caché de Buildah) → `aprobadas/<digest>` borrado. (3b) **verificado**: un árbol con un fichero nuevo en `apps/` da `-sucio`, no se registra y borra un registro previo del mismo digest. Requisitos nuevos de la misma clase (§6.12 punto 4), **antes de DEMO**: (e) el registro solo se escribe si `git status --porcelain --untracked-files=all` está vacío en **todo** el árbol, sea cual sea la etiqueta (hoy, con `sh deploy/app/construir.sh <etiqueta>`, no se mira: T5 registró como aprobado el mismo digest `9a04679d…` que T3 había marcado `-sucio`); se guarda `arbol_limpio=si` y el `tree` del commit (`git rev-parse HEAD^{tree}`), y la comprobación rechaza registros sin `etiqueta`, sin `commit` o sin `arbol_limpio=si`; (f) lo mismo vale para lo que decide la aprobación y no entra en la imagen de la app: `deploy/` entero (comprobaciones, excepciones, `Containerfile` y scripts de db y proxy), `compose.*.yaml` y el Caddyfile (T4: con `comprobar-excepciones.sh` anulado por un `exit 0` sin commit y una excepción nueva, la imagen salió sin `-sucio` y se registró con `commit=c39d1e9…` y un `excepciones_sha256` distinto del del commit); (g) `deploy/db/construir.sh` y `deploy/proxy/construir.sh` ponen en `org.opencontainers.image.revision` `<commit>-sucio` si sus entradas tienen cambios sin commit (hoy la imagen del proxy registrada `db29498f…` dice `fb427fa…`, un commit en el que `deploy/proxy/Containerfile` no existe); (h) infrastructure borra el registro restante `aprobadas/19d162e3…` (imagen `-sucio` y `-rechazada`, sin `etiqueta`/`commit`), y el de `9be1188a…` (`commit=fb427fa`) no se usa para la puerta. Dentro de (c): si Trivy rechaza db o proxy, sus etiquetas fijas deben pasar también a `-rechazada` (hoy solo se renombra la app y los compose usarían la imagen rechazada). **Condición para la puerta de la Etapa 2 (procedimiento, 2.11):** imágenes construidas con `sh deploy/app/construir.sh` sin argumento, desde el commit final y con el árbol limpio, y sus tres digests anotados en `docs/estado.md`. **[2.10b]** (1) **verificado**: `escanear.sh:18-19` hace `unset TRIVY_IMAGE` y fija el digest; con `TRIVY_IMAGE=docker.io/library/alpine:3.24` escanea con `aquasec/trivy@sha256:8f6bb947…` y lo muestra. Resto bajo de la misma clase: `TRIVY_CACHE_DIR` (`escanear.sh:36`) sí se respeta, y esa caché tiene la BD de vulnerabilidades (una BD antigua o manipulada con `NextUpdate` futuro no se actualiza); el escaneo no muestra ni limita la antigüedad de la BD. Corrección: ignorar `TRIVY_CACHE_DIR` o aceptarla solo bajo `$XDG_CACHE_HOME`, mostrar `UpdatedAt` de la BD, rechazar si tiene más de 48 h y guardarla en el registro. (2) **verificado**: app por `"$REPO@$DIGEST"` (`construir.sh:183`) y db por el digest de su etiqueta (`:167-168`). (3) **pendiente, antes de DEMO** (recomendado ya en la 2.11 para la ejecución de la puerta). Requisitos además de los de arriba, a la vista del registro real de esta máquina (el único es el de `19d162e3…`, una imagen `-sucio` que tiene también la etiqueta `-rechazada`): (a) `rechazar()` borra `aprobadas/<digest>` si existe; (b) el registro incluye la etiqueta, el commit y el sha256 del Caddyfile y de los compose, y la comprobación rechaza `-sucio` y registros cuyo `excepciones_sha256` no coincida con los ficheros del commit; (c) `tests/run.sh` y el despliegue comprueban que el digest **actual** de `localhost/mi-app-db:19.0-alpine3.24` (y del proxy) es el `db=` del registro: hoy `sh deploy/db/construir.sh` (lo lanza `levantar.sh`) mueve la etiqueta a una imagen sin escanear; (d) `compose.demo.yaml` y Quadlet referencian db (y el proxy derivado de SEC-055) **por digest**, transportados sin reconstruir (§6.11 punto 2).

## SEC-053: Comprobaciones del build que fallan abiertas, no se repiten o informan mal
- Severidad: baja
- Ubicación: deploy/app/construir.sh:107-115 (`readelf`/`nm`), :70-76 (`rechazar`; `untag` en :73); deploy/app/Containerfile:87-91 (`pnpm audit` en un `RUN` que se guarda en caché)
- Descripción: (1) si `readelf` o `nm` no están en el host, `readelf … 2>/dev/null | grep -Eq` no encuentra nada y la condición 4 de EXC-01 **pasa sin comprobarse**. Lo mismo con rutas con espacios (`for f in $(find …)`). (2) `rechazar()` hace `podman untag "$REPO:$ETIQUETA"` sin nombre, y entonces Podman quita **todos** los nombres de la imagen. La etiqueta `-rechazada` no llega a existir (probado: la imagen queda como `<none>`), al contrario de lo que dicen el mensaje y §14.1. Si la imagen rechazada tiene el mismo ID que otra etiqueta (p. ej. al reconstruir el mismo commit después de que salga una alta nueva), también le quita esa. No deja nada aceptado, pero se pierde la trazabilidad. (3) `pnpm audit --prod` va en el mismo `RUN` que la instalación. Si esa capa está en caché (mismo lockfile y mismo código), no se ejecuta, así que no es "en cada build" (en el build limpio de la 2.9 vino de caché). Trivy lo cubre en parte, porque analiza en cada build los `package.json` de `node_modules`.
- Responsable: infrastructure
- Cómo corregir: (1) `command -v readelf >/dev/null && command -v nm >/dev/null || rechazar "faltan readelf/nm (binutils)"`, y recorrer los ficheros con `find … -exec` o `while IFS= read -r`; (2) crear `-rechazada` y luego quitar solo ese nombre: `podman untag "$REPO:$ETIQUETA" "$REPO:$ETIQUETA"`; (3) ejecutar `pnpm audit --prod --audit-level high` fuera de la caché: en `construir.sh` (contenedor endurecido con red, sobre el lockfile) o en un `RUN` propio con un `ARG` que cambie en cada build.
- Cómo verificar: con un `PATH` sin binutils → rechaza; tras un rechazo existe `localhost/mi-app:<etiqueta>-rechazada` y las demás etiquetas del mismo ID siguen; en dos builds seguidos, `pnpm audit` aparece ejecutado en los dos.
- Estado: **verificado (2.10b)**: (1) sin binutils en el `PATH` → "SEC-053: faltan readelf o nm"; `.node` ELF con `libcrypto` → rechaza; ELF truncado → rechaza ("nm fallo"); nombres con espacios bien leídos; prebuild PE (`win32`) contado y omitido, con razón (Linux no lo puede cargar). (2) `rechazar()` y `fallo()` de db crean `-rechazada`, quitan solo el nombre original y conservan las demás etiquetas del mismo ID. (3) `RUN` propio con `ARG AUDIT_NONCE=$(date +%s)-$$`: Buildah repite la capa al cambiar el valor (probado) y está en la etapa `build` que copia la final. **[Estado anterior]** abierto (baja)

## SEC-054: Las condiciones de EXC-03 (Caddyfile) no se comprueban de forma automática, aunque la excepción dice que sí
- Severidad: media
- Ubicación: deploy/scan/trivyignore-proxy.yaml (comentario original: "comprobado por tests/run.sh containers", corregido en la 2.9); docs/infraestructura.md §8.2 ("el `Caddyfile` tiene `admin off`…; lo comprueba…"); tests/containers/tx-cont-01.sh (no lee el Caddyfile)
- Descripción: según la excepción propuesta y §8.2, `tests/run.sh containers` comprueba que el Caddyfile tiene `admin off` y no tiene `acme_server`, `templates` ni `markdown`. No es así: TX-CONT-01 solo mira el endurecimiento de los contenedores y TX-CMD-01 los comandos. Hoy el Caddyfile cumple (revisado a mano en la 2.9). Pero un cambio futuro (p. ej. `templates` para una página de error, o `acme_server`) haría alcanzables `x/net/html` o `go-jose` sin que falle nada, y EXC-03 seguiría ocultando las dos altas. Para EXC-02 sí hay comprobación: `construir.sh` verifica que ningún compose llama a `gosu`, y TX-CONT-01 que `db` corre sin root, sin capacidades y con `no-new-privileges` (PASA). Falta lo mismo para DEMO y PROD cuando existan.
- Responsable: infrastructure
- Cómo corregir: en `construir.sh`, antes de escanear `proxy`, sobre `deploy/proxy/Caddyfile` sin comentarios: fallar si aparece `acme_server`, `templates` o `markdown`, si falta `admin off` o si hay otro `admin`. Fallar también si algún compose (y más adelante Quadlet) monta otro Caddyfile o arranca Caddy con otro `--config`, `--adapter` o `--resume`. Hacer lo mismo para EXC-02 en `compose.demo.yaml` y Quadlet cuando existan. Corregir §8.2.
- Cómo verificar: en un clon, un Caddyfile con `templates` → `construir.sh` rechaza; sin cambios → pasa.
- Plazo: **antes de la puerta de la Etapa 2**. Si para entonces no está, EXC-03 se considera no vigente y SEC-050 vuelve a bloquear.
- Estado: **verificado en su alcance (2.10b)**: `deploy/scan/comprobar-excepciones.sh`, ejecutado por `construir.sh` antes de escanear (`:171`), falla con las 12 mutaciones directas (`templates`, `acme_server`, `Markdown`, `admin` distinto o duplicado, `import` ajeno, `command`, otro Caddyfile, `gosu`, imagen no oficial, sin Caddyfile) y pasa sin cambios; `caddy adapt` confirma el Caddyfile actual. La condición de EXC-03 para la puerta se cumple. Las vías indirectas (entorno, nombre del servicio, anclas, `/etc`, snippet, Quadlet) son **SEC-056** (media, antes de DEMO). **[Estado anterior]** abierto (media)

## SEC-055: `zstd` vulnerable (CVE-2026-124851) en las imágenes Alpine de db y proxy: la corrección está en la rama 3.24 y Trivy no la ve
- Severidad: alta (CVE-2026-124851 es alta, la misma de SEC-048, y tiene corrección publicada en la rama actual; riesgo real bajo)
- Ubicación: deploy/db/Containerfile:23 (`apk upgrade --no-cache libxml2`: solo actualiza `libxml2`); imagen `localhost/mi-app-db:19.0-alpine3.24` (`sha256:b5bd1672…`): `zstd`/`zstd-libs` 1.5.7-r2 y `libffi` 3.5.2-r1; compose.test.yaml:279 (`caddy:2.11.9-alpine@sha256:003a9780…`): `zstd-libs` 1.5.7-r2; deploy/db/construir.sh y deploy/app/construir.sh (no comprueban paquetes atrasados); docs/infraestructura.md §8 y §8.2 ("Trivy 0 … sin excepciones")
- Descripción: CVE-2026-124851 (revelación de un búfer interno de 64 KiB a quien envía datos comprimidos y ve la salida) afecta a Zstandard 1.5.1–1.5.7 y se corrige en 1.6.0 (Debian Security Tracker; commit `0c9d2975`). Alpine 3.24 publicó `zstd` 1.6.0-r1 el 2026-11-24 como "security upgrade" (`aports` `8a1928ad`), **sin anotarla en `secfixes`**. Por eso Trivy, que en Alpine solo conoce lo que registra la secdb, da 0 en las dos imágenes. Es el mismo fallo de método de SEC-051, pero **dentro de la rama más reciente**: la regla "solo la última rama" no basta. `libffi` 3.8.1-r0 ("security upgrade", `4dd2037b`) también falta en db; sus avisos son medios o bajos y no bloquean por sí solos. Alcance real: en db, `libzstd` lo enlazan `postgres` (compresión de WAL y de copias en el servidor) y `pg_dump`/`pg_restore`/`pg_basebackup`/`pg_waldump`. No encuentro ningún camino por el que `app_rw` o un cliente hagan que el servidor descomprima datos zstd suyos y vean la salida (las copias de SEC-011 son nuestras). En el proxy solo lo enlaza `curl`/`libcurl`, que no se ejecuta (el healthcheck usa `wget`). Aun así es una alta con corrección publicada en imágenes desplegables: según §3.3 y la decisión de la 2.9 sobre `libxml2`, no admite excepción.
- Responsable: infrastructure
- Cómo corregir: (1) db: en `deploy/db/Containerfile`, `apk upgrade --no-cache` de **todos** los paquetes (mantener la comprobación de `LIBXML2_MIN`). (2) proxy: imagen derivada mínima `FROM docker.io/library/caddy:2.11.9-alpine@sha256:003a9780…` con `apk upgrade --no-cache` (y, si se quiere, `apk del curl`: no se usa), sin tocar `/usr/bin/caddy`. El build debe comprobar que el sha256 de `/usr/bin/caddy` es el de la imagen oficial, para que la condición "sin módulos añadidos" de EXC-03 siga siendo cierta. Se referencia como la de db, y se adapta la regla de imagen de `comprobar-excepciones.sh` y de `construir.sh` (`imagen_de … caddy`). (3) Comprobación general en los dos scripts de build, sobre **cada** imagen Alpine desplegable: `podman run --rm --user 1000:1000 --cap-drop=ALL --security-opt=no-new-privileges --read-only --tmpfs /tmp --entrypoint sh <imagen> -c "apk --no-cache version -l '<'"`. Debe salir con código 0 y sin ninguna línea aparte de la cabecera `Installed: Available:`. Si no, rechazar. Que falle cerrado si `apk` no puede descargar el índice. (4) `docs/infraestructura.md` §8/§8.2: el 0 de Trivy en Alpine no prueba nada sin la comprobación (3); añadir la regla.
- Cómo verificar: en db y proxy, `apk list -I zstd-libs` ≥ 1.6.0-r1 (y en db `libffi` ≥ 3.8.1-r0); la comprobación (3) solo imprime la cabecera; en un clon con `apk upgrade` quitado, el build rechaza la imagen; Trivy 0 sin excepción (proxy: solo las 2 de EXC-03); sha256 de `/usr/bin/caddy` igual al de la oficial; `sh tests/run.sh containers`, `integration` y `e2e` en verde con las imágenes nuevas.
- Plazo: **antes de la puerta de la Etapa 2**.
- Estado: **verificado (2.10d)**: db `localhost/mi-app-db@sha256:99b42f80…` (`zstd`/`zstd-libs` 1.6.0-r1, `libffi` 3.8.1-r0, `libxml2` 2.13.9-r5) y proxy derivado `localhost/mi-app-proxy@sha256:db29498f…` (`deploy/proxy/`, base `caddy:2.11.9-alpine@sha256:003a9780…`, `zstd-libs` 1.6.0-r1): `apk --no-cache version -l '<'` como UID 1000 solo con la cabecera; la comprobación va en el `RUN` de los dos `Containerfile` y otra vez en `deploy/db/construir.sh` y `deploy/proxy/construir.sh`, con fallo cerrado; `/usr/bin/caddy` con el sha256 oficial `a563843e…` (5 capas de la base intactas, `image diff` solo con ficheros de `apk`; un `cp` sobre el binario lo rechaza el build); Trivy con BD nueva, sin excepciones y con todas las severidades: db 0, proxy `alpine` 0 (`caddy`: solo EXC-03); arranque endurecido *healthy* sin root; build propio desde un clon limpio, igual (§6.12 puntos 1 y 2). **[Estado anterior]** abierto (**alta, bloquea la puerta de la Etapa 2**)

## SEC-056: `comprobar-excepciones.sh` se puede esquivar por el entorno, por el nombre del servicio, con anclas YAML o montando `/etc`
- Severidad: media
- Ubicación: deploy/scan/comprobar-excepciones.sh:28-46 (Caddyfile como texto: `admin off` en cualquier sitio; `import` comparado como regex), :49-71 (solo el servicio llamado exactamente `proxy`, leído como texto con 2 espacios de sangría; sin `environment`/`env_file`; montajes filtrados por `/etc/caddy|Caddyfile`), :73-78 (Quadlet: solo `Exec=`/`Entrypoint=`); deploy/scan/trivyignore-proxy.yaml:8-12 (comentarios "imagen oficial por digest" y "PENDIENTE" desfasados); **[2.10d]** deploy/scan/comprobar-excepciones.sh:51-69 (`Containerfile` del proxy: lista de prohibidos, sin `CMD`/`ENTRYPOINT`/`ENV`; `construir.sh` comprobado con `grep`), deploy/proxy/construir.sh:55-61 (no compara `Cmd`/`Entrypoint` con la base)
- Descripción: las mutaciones directas fallan como deben (§6.11 punto 3), pero estas pasan con código 0: otro servicio con la imagen de Caddy y su propio `--config` (M1); renombrar `proxy` (M2); `command` en un ancla YAML (M6); montar `./otro:/etc:ro` (M5); `Volume=` de otro Caddyfile en Quadlet (M8); `env_file` (M9). Y, probado con `caddy adapt` sobre Caddy 2.11.9: (M3) un valor de `CADDY_TLS` (o `SITE_ADDRESS`) con saltos de línea en el `environment` del proxy añade los *handlers* `templates` y `acme_server` **sin tocar el Caddyfile**, porque Caddy sustituye `{$VAR}` antes de analizar el fichero; (M4) con `admin off` dentro de un snippet que no se importa, en lugar de en las opciones globales, la API de administración queda activa. Con eso, EXC-03 seguiría ocultando las dos altas de Caddy con su condición incumplida. Hace falta un cambio deliberado del compose o del entorno, y hoy la configuración cumple, así que no bloquea la puerta de la Etapa 2. Pero la excepción se apoya en este control, y DEMO/PROD (otro compose, Quadlet, ficheros de entorno) son justo donde aparecerán estas variantes. **[2.10d]** Con la imagen derivada del proxy (SEC-055) aparece una vía más, porque ahora `Cmd` es nuestro: (M11) un `CMD`/`ENTRYPOINT` en `deploy/proxy/Containerfile` pasa `comprobar-excepciones.sh` y `deploy/proxy/construir.sh`; **probado** con un `RUN` que escribe un JSON (`admin` en `0.0.0.0:2019`, *handler* `templates`) y `CMD ["caddy","run","--config",…]`: arrancada como en el compose, con el Caddyfile montado, la API de administración responde en `:2019`, `templates` se ejecuta y el Caddyfile se ignora (healthcheck en verde). (M12) la exigencia de que `deploy/proxy/construir.sh` compare el sha256 es un `grep` de `sha256sum /usr/bin/caddy` y `SHA_OFICIAL`: se puede neutralizar la comparación dejando las cadenas. Hoy la imagen cumple (`Cmd` oficial; §6.12 punto 2).
- Responsable: infrastructure
- Cómo corregir: (1) comprobar la **configuración efectiva**: ejecutar `caddy adapt --config /etc/caddy/Caddyfile --adapter caddyfile` en un contenedor endurecido (imagen del proxy por digest, `--network none`, `--read-only`, UID 1000) con el Caddyfile y las variables de entorno **resueltas** de cada compose/Quadlet, y fallar si el JSON no tiene `admin.disabled=true` o contiene los *handlers* `templates`, `acme_server` o `markdown`, o la app `pki` con autoridades distintas de `local`. Se mantienen las comprobaciones de texto. (2) Leer los compose resueltos (`podman-compose -f <f> config` con todos los perfiles: resuelve anclas y `<<`), no el texto. Aplicar las reglas a **todo** servicio que use una imagen de Caddy o monte algo en `/etc`, `/etc/caddy`, `/config` o `/data`, y exigir que solo haya uno y que se llame `proxy`. (3) `environment` del proxy: solo las claves conocidas, con valores sin saltos de línea, `{`, `}` ni comillas (`SITE_ADDRESS` `^[a-z0-9.-]+(, ?[a-z0-9.-]+)*$`, `CADDY_TLS` `internal` o un correo, `PUBLIC_HTTPS_SUFFIX` vacío o `:[0-9]{2,5}`), y prohibir `env_file`. (4) Montajes: rechazar cualquier destino que sea `/etc` o un directorio que contenga `/etc/caddy`. (5) `import`: comparación literal con los nombres de snippet (`grep -F -x` o `awk`). (6) Quadlet: las mismas reglas sobre `Image=`, `Volume=`, `Environment=`, `EnvironmentFile=` y `Exec=`, cuando exista. (7) Corregir los comentarios de `trivyignore-proxy.yaml:8-12` (condición: derivada de la oficial por digest, con `/usr/bin/caddy` idéntico y la misma configuración de arranque; la comprobación ya existe). (8) **[2.10d]** En `deploy/proxy/construir.sh`, comparar `podman image inspect` de la derivada con la base: `Entrypoint`, `Cmd`, `Env`, `WorkingDir`, `Volumes`, `ExposedPorts`, `StopSignal`, `OnBuild` y `Shell` iguales (solo pueden cambiar `User` y `Labels`), y rechazar si no. (9) En `comprobar-excepciones.sh`, aceptar en `deploy/proxy/Containerfile` solo una lista cerrada (`ARG CADDY_BASE=…`, `FROM ${CADDY_BASE}`, `USER root`, un único `RUN`, `LABEL`, `USER 1000:1000`) en lugar de una lista de prohibidos, y quitar la comprobación por `grep` de `construir.sh` (la sustituye (8), que se ejecuta sobre la imagen real).
- Cómo verificar: las 10 mutaciones M1–M10 de §6.11 (en copias fuera del repositorio) fallan, salvo M10, que la cubre el escaneo; las 12 directas siguen fallando; sin cambios pasa. **[2.10d]** Además, en un clon y un almacén aislado, I01/I02/I07 de §6.12 (`CMD`/`ENTRYPOINT` en el `Containerfile`) fallan en `comprobar-excepciones.sh` o en `deploy/proxy/construir.sh`, y I06 (comparación neutralizada) ya no es posible con (8).
- Plazo: antes de crear `compose.demo.yaml` o Quadlet (Etapa 4). Hasta entonces, Cybersecurity revisa en cada entrega el servicio `proxy`, su entorno y el Caddyfile (hoy cumplen: `caddy adapt` da `admin.disabled=true`, sin `templates` ni `acme_server`).
- Estado: abierto (media, no bloquea la puerta de la Etapa 2). **[2.10d]** Sin cambios en M1–M10. Ampliado con M11–M12 (vía nueva por el `Containerfile` del proxy derivado, probada; §6.12 punto 3). Las 14 mutaciones directas nuevas del `Containerfile` y del compose fallan. Plazo igual: antes de `compose.demo.yaml`/Quadlet. Hasta entonces, Cybersecurity revisa también `deploy/proxy/Containerfile` y `podman image inspect` del proxy en cada entrega

## SEC-057: Trivy no analiza los binarios que no vienen de un paquete (PostgreSQL en db, Node en la distroless)
- Severidad: baja
- Ubicación: imagen de db: `/usr/local/bin/postgres` y herramientas (PostgreSQL 19.0 compilado desde el código fuente por la imagen oficial; solo `.postgresql-rundeps` virtual en apk); deploy/db/construir.sh (no comprueba la versión); docs/infraestructura.md §8 ("PostgreSQL 19.0 es una versión `.0`")
- Descripción: Trivy solo encuentra el objetivo `alpine` en la imagen de db. No sabe qué versión de PostgreSQL lleva, así que un aviso de PostgreSQL 19.x (en `postgresql.org/support/security`; el 2026-11-12 hubo varios de 8.8 para 15–18) **nunca** haría fallar el escaneo. Hoy no hay riesgo: 19.0 (2026-11-19) es la última versión de la rama y no tiene avisos. Pasa lo mismo con Node en la imagen de la app, que hasta ahora se ha vigilado a mano (SEC-033).
- Responsable: infrastructure
- Cómo corregir: en `deploy/db/construir.sh`, comparar `postgres --version` con `latestMinor` de la mayor 19 en `https://www.postgresql.org/versions.json`, y rechazar si va por detrás (y que falle cerrado si no se puede consultar). En la app, lo mismo con `node --version` frente a la última 26.x de `https://nodejs.org/dist/index.json`. Documentarlo en §14.1.
- Cómo verificar: con un `latestMinor` simulado mayor que el instalado, el build rechaza; con el real, pasa.
- Estado: abierto (baja)

---

### Resumen de la revisión 2.10d (Etapa 2, HU-01, 2026-11-26)
- **SEC-055 (alta): VERIFICADO.** db `localhost/mi-app-db@sha256:99b42f80…` y
  proxy `localhost/mi-app-proxy@sha256:db29498f…`: Alpine 3.24.4,
  `zstd-libs` 1.6.0-r1 (db también `zstd` 1.6.0-r1, `libffi` 3.8.1-r0,
  `libxml2` 2.13.9-r5), `apk --no-cache version -l '<'` solo con la cabecera,
  sin `gosu` ni *setuid*, `USER 1000:1000`. Trivy, con BD nueva, sin
  excepciones y con todas las severidades: db 0; proxy `alpine` 0 y solo las 2
  altas de EXC-03 en `caddy`; app solo EXC-01. Arrancan *healthy*
  endurecidas, sin root en el host. La comprobación de atrasados está en el
  build de las dos imágenes y vuelve a ejecutarse sobre la imagen final.
- **Proxy derivado: correcto.** `/usr/bin/caddy` idéntico al oficial
  (`a563843e…`), las 5 capas de la base intactas, `image diff` solo con
  ficheros de `apk`, mismos módulos, `getcap` y `Cmd`. Pasar de root a 1000 es
  una mejora. `curl` queda (actualizado y sin uso): aceptado. **EXC-03 sigue
  aplicando** (no hay Caddy posterior a 2.11.9), con la condición reescrita:
  derivada con binario idéntico y la misma configuración de arranque.
- **SEC-052 (media), punto 3:** (a) `rechazar()` borra el registro y (b)
  `-sucio` no se registra (y borra uno previo): **VERIFICADOS con builds
  reales** (mismo digest por caché). Pero el registro aún no dice qué se
  aprobó. Con una etiqueta propia se registra un árbol sucio (T5). Cambios sin
  commit en comprobaciones, excepciones o compose se registran como el commit
  limpio (T4, con `comprobar-excepciones.sh` anulado). El registro `9be1188a…`
  de infrastructure (`commit=fb427fa`) se hizo con un `deploy/proxy/Containerfile`
  que no existe en ese commit, y queda el resto `19d162e3…`. Requisitos nuevos
  (e)–(h) en SEC-052. **No amplía SEC-037**, que sigue verificado. **No bloquea;
  antes de DEMO.**
- **SEC-056 (media), ampliado con M11–M12:** un `CMD`/`ENTRYPOINT` en
  `deploy/proxy/Containerfile` pasa `comprobar-excepciones.sh` y
  `deploy/proxy/construir.sh`. **Probado:** el proxy arranca con la API de
  administración en `0.0.0.0:2019` y `templates` activo, e ignora el Caddyfile
  montado. La comprobación de sha256 del script se valida con un `grep`. Hoy la
  imagen cumple. **No bloquea; antes de DEMO.**
- **Altos o críticos abiertos que bloqueen la puerta de la Etapa 2 para HU-01:
  ninguno.** Riesgo aceptado: SEC-050 (EXC-03) y SEC-033 (EXC-01, baja).
  Abiertos que no bloquean: SEC-003 (media), SEC-052 y SEC-056 (media),
  SEC-025, SEC-043, SEC-046, SEC-047 y SEC-057 (baja).
- **Condición de procedimiento para la puerta (2.11):** construir con `sh
  deploy/app/construir.sh` sin argumento, desde el commit final y con `git
  status --porcelain` vacío en todo el árbol (o desde un clon limpio). Repetir
  `containers`, `integration` y `e2e` con esas imágenes y anotar en
  `docs/estado.md` los digests de app, db y proxy. Las imágenes y el registro
  actuales (`9be1188a…`, `commit=fb427fa`) **no valen para la puerta**.
- **El humano debe ratificar en la puerta:** **EXC-01** (app, `libssl3t64`
  CVE-2026-107494 y CVE-2026-124709, QUIC no alcanzable; hasta el 2026-12-24,
  revisión el 2026-12-08) y **EXC-03** (proxy, `go-jose/v3` CVE-2026-116587 y
  `x/net` CVE-2026-78661; hasta el 2026-12-26 o 7 días después de un Caddy
  corregido; ahora sobre la imagen derivada con binario idéntico). Además,
  conviene que dé por buenas dos condiciones de la 2.10b/2.10d: la puerta se
  aprueba con digests concretos de las tres imágenes, y DEMO/PROD reciben esas
  mismas imágenes por digest, sin reconstruir.
- Contenedores: ninguno corre como root, usa `--privileged` ni monta el socket
  o la red del host. Todas las pruebas se hicieron en Podman rootless, fuera del
  repositorio, con almacenes de imágenes aislados.

### Resumen de la revisión 2.10b (Etapa 2, HU-01, 2026-11-26; histórico, sustituido por el de 2.10d)
- **SEC-049 (alta): VERIFICADO.** La imagen derivada
  `localhost/mi-app-db:19.0-alpine3.24` (`sha256:b5bd1672…`, base
  `postgres:19.0-alpine3.24@sha256:8e81a484…`) trae Alpine 3.24.4 y `libxml2`
  2.13.9-r5, sin `gosu` ni binarios *setuid*, con `USER 1000:1000` y
  `HEALTHCHECK`. Trivy da 0 **sin excepciones** y con todas las severidades,
  también en una construcción mía desde el clon. **EXC-02 retirada.** Arranca
  sana endurecida y sin root en el host.
- **SEC-051 (media): VERIFICADO.** Rama 3.24 y regla en §8. El hueco que queda
  (actualizaciones de seguridad sin anotar, incluso en la rama actual) pasa a
  SEC-055.
- **SEC-052 (media): puntos 1 y 2 VERIFICADOS**, con un resto bajo
  (`TRIVY_CACHE_DIR` y antigüedad de la BD de Trivy). Punto 3 pendiente, con
  requisitos nuevos: borrar el registro al rechazar, no aceptar `-sucio` ni
  ficheros de excepciones distintos de los del commit, y comprobar el digest de
  la db etiquetada. **No bloquea la puerta de la Etapa 2.** Plazo: antes de
  DEMO. Recomiendo que la 2.11 lo exija ya en `tests/run.sh` para la ejecución
  de la puerta.
- **SEC-053 (baja): VERIFICADO.** `readelf`/`nm` fallan cerrados, los PE/Mach-O
  se omiten con razón, `-rechazada` es real y `pnpm audit` se ejecuta en cada
  build.
- **SEC-054 (media): VERIFICADO en su alcance.** Las 12 mutaciones directas
  fallan. La condición de EXC-03 para la puerta se cumple. Las vías indirectas
  pasan a **SEC-056**.
- Nuevos: **SEC-055 (alta, bloquea la puerta de la Etapa 2)**: `zstd-libs`
  1.5.7-r2 (CVE-2026-124851) en db y proxy, corregido en Alpine 3.24 el
  2026-11-24 y que Trivy no ve; en db también `libffi`. **SEC-056 (media,
  antes de DEMO)**: `comprobar-excepciones.sh` se esquiva por el entorno
  (probado: `templates`/`acme_server` sin tocar el Caddyfile), por `admin off`
  en un snippet, por el nombre del servicio, con anclas YAML o montando `/etc`.
  **SEC-057 (baja)**: Trivy no ve la versión de PostgreSQL ni la de Node.
- **Imagen local y no reproducible:** aceptable. `pull_policy: never` es un
  control positivo. Condiciones: la puerta se aprueba con digests concretos de
  db (y del proxy derivado) que consten en el registro de escaneo, y DEMO/PROD
  reciben esas mismas imágenes por digest, sin reconstruir.
- Abiertos que no bloquean: SEC-003 (media), SEC-025 (baja), SEC-033 (baja,
  EXC-01), SEC-043, SEC-046, SEC-047 y SEC-057 (baja), SEC-052 y SEC-056
  (media).
- **Bloquea la puerta de la Etapa 2:** solo **SEC-055**. Después, testing
  repite `integration` y `e2e` con las imágenes finales construidas desde el
  commit (2.11).
- Para la puerta, el humano debe ratificar **EXC-01** (app, `libssl3t64`,
  hasta el 2026-12-24, revisión el 2026-12-08) y **EXC-03** (Caddy, hasta el
  2026-12-26 o 7 días después de un Caddy corregido). EXC-02 ya no hace falta.
- Contenedores: ninguno corre como root, usa `--privileged` ni monta el socket
  o la red del host. Todas las pruebas se hicieron en Podman rootless, fuera del
  repositorio.

### Resumen de la revisión 2.9 (Etapa 2, HU-01, 2026-11-26; histórico, sustituido por el de 2.10b)
- **SEC-048 (alta): VERIFICADO.** La base distroless `13e3ac17…` trae
  `libzstd1` 1.5.7+dfsg-1+deb13u1. La imagen de la app
  (`localhost/mi-app:0af133152b01`, `sha256:72766f8e…`, construida desde el
  commit y sin `-sucio`) solo tiene las 2 altas de EXC-01.
- **SEC-049 (alta): SIGUE ABIERTO Y BLOQUEA LA PUERTA DE LA ETAPA 2.**
  `gosu` queda cubierto por **EXC-02**, aprobada como puente hasta el
  2026-12-26 y no prorrogable: el código vulnerable no está enlazado y
  `gosu` no se ejecuta. Pero `alpine3.23` **no corrige `libxml2`**: tiene
  2.13.9-r1 sin parches y Trivy no lo ve (SEC-051). Solución recomendada:
  imagen derivada de `postgres:19.0-alpine3.24` con `libxml2` ≥ 2.13.9-r3 y
  sin `gosu`, que cierra SEC-049 entero y retira EXC-02.
- **SEC-050 (alta): riesgo aceptado con EXC-03** hasta el 2026-12-26 o 7
  días después de que salga un Caddy corregido (`master` ya lleva `x/net`
  0.62.0 y no lleva `go-jose/v3`). Hoy no hay versión corregida publicada;
  `xcaddy` no hace falta. Condición: la comprobación automática del
  Caddyfile (SEC-054) debe estar antes de la puerta.
- **EXC-01 sigue vigente** (Debian sin corrección; OpenSSL lo corrige en
  3.5.10, sin publicar, y lo clasifica Low; Node 26.13.1 es la última).
  Revisión el 2026-12-08.
- **SEC-034, SEC-035, SEC-036 y SEC-037: VERIFICADOS** con pruebas
  negativas: el build rechaza la imagen y no imprime `APP_IMAGE`; la
  excepción caducada, con otra ruta o con otro `purl` falla; integridad de
  pnpm errónea y `.npmrc` señuelo fallan; la lógica `-sucio` cubre 5 casos.
  El contenedor de Trivy es rootless (UID 1000, sin capacidades,
  `no-new-privileges`, raíz `ro`, sin socket).
- Nuevos: **SEC-051** (media, `alpine3.23` oculta CVE al escáner),
  **SEC-052** (media, el escaneo se puede sustituir con `TRIVY_IMAGE` y nada
  después del build exige un escaneo aprobado; (3) antes de DEMO),
  **SEC-053** (baja, `readelf`/`nm` fallan abiertos, la etiqueta
  `-rechazada` no se crea y `pnpm audit` se queda en caché) y **SEC-054**
  (media, las condiciones de EXC-03 no se comprueban; antes de la puerta).
- Escaneo propio (Trivy 0.76.2, BD del 2026-11-26, sin excepciones):
  app 0 críticas / 2 altas (EXC-01); db 1 / 25 (`gosu`, EXC-02) más el
  `libxml2` que Trivy no ve; proxy 0 / 2 (EXC-03). Con los ficheros de
  excepciones: 0 sin excepción en las tres.
- Abiertos que no bloquean: SEC-003 (media), SEC-025 (baja), SEC-033 (baja,
  EXC-01), SEC-043, SEC-046, SEC-047 y SEC-053 (baja), SEC-051 y SEC-052
  (media), SEC-054 (media, condición de EXC-03 antes de la puerta).
- Para la puerta: el humano debe ratificar EXC-01, EXC-02 y EXC-03
  (excepciones a `docs/reglas-equipo.md` §3.3), y testing debe repetir
  `integration` y `e2e` con la imagen limpia `sha256:72766f8e…`, o con la
  que salga tras resolver SEC-049.
- Contenedores: ninguno corre como root, usa `--privileged` ni monta el
  socket o la red del host (TX-CONT-01 PASA con la imagen limpia). Todas las
  pruebas se hicieron en Podman rootless.

### Resumen de la revisión 2.6 (Etapa 2, HU-01, 2026-11-26; histórico, sustituido por el de 2.9)
- **SEC-038 (alta): VERIFICADO.** RS-05b 4/4 en verde y prueba propia de la
  2.3 repetida: 5 verificaciones de 300 desde una IP (antes 300), 10 de 3000
  (antes 516), el acierto al final de la ráfaga `429`/`423` con 0 sesiones y
  `currentPin` sin cambiar el PIN. El código de HU-01 ya no tiene altos ni
  críticos abiertos.
- **Altos o críticos abiertos: SEC-048, SEC-049 y SEC-050 (alta,
  infrastructure). Bloquean la puerta de la Etapa 2** (regla de imágenes sin
  críticas/altas): `libzstd1` en la base distroless de la app (con
  corrección), `libxml2` y `gosu` en `postgres:19.0-alpine` (1 crítica y 26
  altas, con corrección) y `go-jose`/`x/net` en `caddy:2.11.9-alpine`. Riesgo
  real bajo en los tres (no alcanzables con la configuración actual), pero
  hay que actualizar los digests; solo lo que no tenga corrección puede ir a
  excepción fechada (condiciones en cada hallazgo).
- **T-45: corregido sin relajar la CSP** (Caddyfile sin cambios, sin
  `unsafe-eval`; el *bundle* ya no lleva zod ni la sonda `new Function`).
- Verificados: SEC-039, SEC-040, SEC-041, SEC-042 (prueba propia; faltan sus
  regresiones automáticas, D-2.5-02), SEC-044 y SEC-045.
- SEC-043: aplazamiento aceptado hasta la decisión del software-engineer
  (D-2.5-03 d), antes de HU-06 y como tarde antes de la puerta de la Etapa 3,
  junto con la cola acotada del semáforo argon2.
- Nuevo: **SEC-047** (baja; developer + testing): la clave del cerrojo por
  cuenta (JS `toLowerCase()`) no coincide con `lower()` de PostgreSQL; 16
  variantes del nombre → 16 verificaciones en paralelo (no entra en cuentas
  bloqueadas).
- D-2.5-01..05: sin objeciones; aprobados el `503` + `Retry-After: 5` del tope
  de flujos, `session-policy.ts` y los eventos nuevos.
- Suites (imagen `sha256:66fcdf09…`, reconstruida desde el commit): `unit`
  177/177; `security` 73 + 241 omitidos; `integration` 254 + 244 omitidos
  (RS-05b 4/4); `e2e` 73 pasan, 1 intermitente en WebKit (CA-N06, 8/8 al
  repetirlo; se pasa a testing), 2 omitidos, `serie-pin` 5/5, `serie-red`
  1/1. `pnpm audit` (completo y `--prod`): 0.
- Abiertos que no bloquean: SEC-003 (media), SEC-025 (baja, HU-06), SEC-033
  (baja, con EXC-01), SEC-034 (media; ampliado a todas las imágenes),
  SEC-035..SEC-037, SEC-043, SEC-046 y SEC-047 (baja).
- Contenedores: ningún contenedor ni imagen corre como root, usa
  `--privileged`, monta el socket ni la red del host; todas las pruebas de
  esta revisión se hicieron en Podman rootless con `--cap-drop=ALL`,
  `no-new-privileges` y raíz de solo lectura.


### Resumen de la revisión 2.3 (Etapa 2, HU-01, 2026-11-25; histórico, sustituido por el de 2.6)
- **Altos o críticos abiertos: SEC-038 (alta). Bloquea la puerta de la
  Etapa 2.** `verifyPin` no resiste peticiones simultáneas: una ráfaga desde
  un solo dispositivo hace cientos de verificaciones de PIN (300 de 300; 516
  con 3000), sin `429` ni `423`, y un acierto entra (o cambia el PIN
  provisional) en una cuenta ya bloqueada de forma indefinida. Responsable:
  developer (software-engineer documenta la atomicidad en §7; testing añade
  RS-05b).
- **Verificados en código: SEC-029, SEC-030, SEC-031 y SEC-032** (§6.8 punto
  1), y SEC-017 y SEC-021. SEC-028 confirmado con la imagen real. SEC-016:
  correcto en secuencia, pendiente de SEC-038.
- Dictámenes (§6.8): sesiones, `Origin`/CSRF, denegación por defecto, matriz
  RS-18, redacción de logs (centinela: 0 valores en logs y respuestas),
  métricas, cabeceras y CSP de Caddy, secretos y migración 0001 correctos.
  Desviaciones del developer aprobadas: `revoked_reason`/`expired_reason`,
  `role text + CHECK`, PIN de 1–64, guarda en un solo hook, cierre del flujo
  SSE más antiguo (falta el tope global, SEC-040), `/healthz` `503`,
  `hoistWorkspacePackages: false`.
- Dependencias: `pnpm audit --prod` 0 vulnerabilidades; en desarrollo,
  `tinypool` 1.1.1 con 2 críticas y `vitest` 3.2.7 con 3 moderadas
  (SEC-044, baja en contexto). Imagen real: Trivy 0 críticas/altas salvo las
  2 de EXC-01; condiciones 3 y 4 de SEC-033 cumplidas. La imagen probada es
  `69e823f40ad7-sucio` (anterior al commit): la de la puerta debe
  reconstruirse desde el commit final (SEC-037).
- Nuevos: **SEC-038 (alta; developer)**, SEC-039 (baja; developer +
  software-engineer; antes de HU-02), SEC-040, SEC-041, SEC-042 (baja;
  developer), SEC-043 (baja; software-engineer + developer), SEC-044 (baja;
  testing), SEC-045 (baja; testing + developer), SEC-046 (baja;
  infrastructure).
- Abiertos que no bloquean: SEC-003 (media), SEC-025 (baja, HU-06),
  SEC-033 (baja, con EXC-01), SEC-034 (media, antes de la imagen de la
  puerta), SEC-035..SEC-037 y SEC-039..SEC-046 (baja).
- Contenedores: ningún contenedor ni la imagen final corre como root, usa
  `--privileged`, monta el socket ni la red del host; todas las pruebas de
  esta revisión se hicieron en Podman rootless con `--cap-drop=ALL`,
  `no-new-privileges`, raíz de solo lectura y el repositorio en `ro`.


### Resumen de la revisión 2.1m (Etapa 2, HU-01, 2026-11-24; histórico, sustituido por el de 2.3)
- **Altos o críticos abiertos: ninguno.** Las dos CVE altas de `libssl3t64`
  (CVE-2026-107494, CVE-2026-124709) no son alcanzables y quedan cubiertas
  por la excepción fechada **EXC-01** (SEC-033, riesgo residual bajo; revisión
  2026-12-08, caduca 2026-12-24). **Requiere ratificación humana** en la
  puerta de la Etapa 2 por ser una excepción a `docs/reglas-equipo.md` §3.3
  (no es la aceptación de un riesgo alto).
- Dictámenes (§6.7): imagen final (`deploy/app/`) y contrato §8.1 cumplen §3
  con condiciones; etapa Debian trixie aprobada (sus altas no llegan a la
  imagen final); servicio `commands` aprobado; **SEC-028 corregido** (2.1h,
  probado en red `/29`; verificación final con la imagen real).
- Nuevos: **SEC-033** (baja en contexto; infrastructure + developer:
  EXC-01 y sus comprobaciones), **SEC-034** (media; infrastructure: escaneo,
  `pnpm audit` y comprobaciones dentro de `construir.sh`, antes de la primera
  imagen real de la puerta), **SEC-035** (baja; infrastructure: integridad de
  pnpm), **SEC-036** (baja; infrastructure + developer: `.npmrc` sin
  credenciales), **SEC-037** (baja; infrastructure: etiqueta `-sucio`).
- Abiertos que no bloquean: SEC-003 (media), SEC-025 (baja), SEC-031 (baja),
  SEC-032 (baja), SEC-033 (baja, con EXC-01), SEC-034 (media), SEC-035,
  SEC-036, SEC-037 (baja).
- Corregidos pendientes de verificación con código o en un entorno
  posterior: SEC-026, SEC-028, SEC-029, SEC-030.
- Contenedores: ningún contenedor ni la imagen final corre como root, usa
  `--privileged`, monta el socket ni la red del host. Escaneo (RS-39): base
  distroless 0 críticas, 2 altas con EXC-01; falta el escaneo de la imagen
  real dentro del build (SEC-034).


### Resumen de la revisión 2.1k (Etapa 2, HU-01, 2026-11-24; histórico, sustituido por el de 2.1m)
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
