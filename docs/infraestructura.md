# Infraestructura — Entornos con Podman rootless

> Responsable: Infrastructure. Entradas: `docs/reglas-equipo.md` §3,
> `docs/arquitectura.md` §3 y §10, ADR-001/002/003/007, `docs/seguridad.md`
> (§6.2, §8, SEC-002/003/009/010/011/013/014/015), `docs/permisos.md` §6–7,
> `docs/logging.md` (§5, §6.5, §6.6, §8.2) y `docs/testing.md` §7.
> Estado: **DEV listo y validado con un workspace de prueba** (todavía no hay
> código de la app). **TESTING en borrador** (`compose.test.yaml`). DEMO y PROD
> pendientes (Etapas 4 y 5), con las decisiones que ya condicionan su diseño en §10–§12.

## Índice
1. Requisitos de la máquina
2. Ficheros y estructura de carpetas esperada
3. DEV: servicios, puertos, redes y volúmenes
4. DEV: levantar, detener, destruir
5. Secretos
6. Contrato con el código (para el Developer)
7. Cumplimiento de la política §3.4 y excepciones
8. Imágenes y digests
9. TESTING (`compose.test.yaml`, T-12)
10. Logs y PostgreSQL (M-05)
11. Observabilidad en DEMO/PROD (M-06, M-08)
12. Red, TLS e IP de origen (SEC-002, SEC-003, ADR-007)
13. Copias de seguridad (SEC-011)
14. Verificación de la sección 3.9
15. Qué se validó realmente y qué no

---

## 1. Requisitos de la máquina

| Requisito | Cómo comprobarlo | Valor en esta máquina (2026-11-21) |
|---|---|---|
| Podman **rootless** | `podman info --format '{{.Host.Security.Rootless}}'` | `true` (Podman 5.7.0) |
| cgroups v2 con `cpu`, `memory`, `pids` delegados al usuario | `podman info --format '{{.Host.CgroupsVersion}}'` y `cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.controllers` | `v2`; `cpu memory pids` |
| `podman-compose` | `podman-compose --version` | 1.5.0 |
| Sesión systemd de usuario (los healthchecks usan temporizadores de systemd) | `systemctl --user status` | sí |
| Red rootless | `podman info --format '{{.Host.NetworkBackend}}'` | netavark + pasta |

**Prohibido:** `sudo` con podman, `podman compose`, `docker compose`,
`docker-compose` y el comando `docker`. En esta máquina hay un demonio Docker
con root y esos comandos podrían usarlo (regla §3.1, amenaza T-47). Si Podman
rootless o cgroups v2 no están disponibles, se avisa al humano; no se buscan
alternativas con root. `deploy/dev/levantar.sh` comprueba las tres cosas y se
niega a seguir si `id -u` es 0.

## 2. Ficheros y estructura de carpetas esperada

Ficheros de Infrastructure:

```
mi-app/
├── compose.dev.yaml              # DEV (en la raíz: así lo piden las reglas del equipo)
├── compose.test.yaml             # TESTING (borrador, §9)
├── .gitignore                    # .secrets/, node_modules/, estado de Terraform
├── .secrets/dev/                 # secretos de DEV (0700/0600, ignorado por git)
└── deploy/
    ├── dev/
    │   ├── Containerfile         # imagen de herramientas de DEV (Node + pnpm)
    │   ├── generar-secretos.sh   # crea los secretos de DEV
    │   └── levantar.sh           # levanta DEV completo con un comando
    ├── db/initdb/10-roles.sh     # roles y BD (todos los entornos)
    ├── proxy/Caddyfile           # TESTING, DEMO y PROD
    ├── app/Containerfile         # (pendiente) imagen final multi-stage → distroless
    ├── quadlet/                  # (pendiente, Etapa 5) unidades de PROD
    └── monitoring/               # (pendiente) configuración del stack de observabilidad
```

`docs/arquitectura.md` §3 situaba los `compose.*.yaml` en `deploy/`; se dejan
en la raíz porque así lo fijan las reglas del equipo y los comandos de los demás
agentes (`podman-compose -f compose.dev.yaml ...`). Terraform de PROD irá en
`infra/` (arquitectura §3) o `terraform/`; se decide en la Etapa 5.

Estructura del código que **DEV espera** (la crea el Developer en la Etapa 2;
es la de `docs/arquitectura.md` §3, con los tests en `tests/` según
`docs/testing.md` §4.1):

```
package.json            # raíz del workspace pnpm; "packageManager": "pnpm@12.21.0"
pnpm-workspace.yaml     # packages: apps/*, packages/*
pnpm-lock.yaml          # obligatorio: deps instala con --frozen-lockfile
apps/api/package.json   # scripts: dev, db:migrate, create-initial-manager (§6)
apps/web/package.json   # script: dev (vite), acepta --host/--port/--strictPort
apps/web/vite.config.ts # proxy /api -> process.env.API_PROXY_TARGET
packages/shared/
tests/
```

## 3. DEV: servicios, puertos, redes y volúmenes

Según ADR-007 y la arquitectura §10, DEV **no tiene Caddy**: el navegador usa
`http://localhost`, que es contexto seguro (cookies `Secure`, Wake Lock).

| Servicio | Tipo | Imagen | Qué hace | Puerto en el host | Redes |
|---|---|---|---|---|---|
| `db` | permanente | `postgres:19.0-alpine` por digest | PostgreSQL; inicializa roles y BD con `deploy/db/initdb/10-roles.sh` | **ninguno** | `backend` |
| `api` | permanente | `mi-app-dev-tools` | `pnpm --dir apps/api run dev` (Fastify en modo watch) | `127.0.0.1:3000` | `backend`, `frontend` |
| `web` | permanente | `mi-app-dev-tools` | `pnpm --dir apps/web run dev` (Vite + HMR; proxy de `/api` a `api:3000`) | `127.0.0.1:5173` | `frontend` |
| `deps` | efímero (perfil `setup`) | `mi-app-dev-tools` | `pnpm install --frozen-lockfile` | — | `deps` (única con salida a internet) |
| `migrate` | efímero (perfil `setup`) | `mi-app-dev-tools` | `pnpm --dir apps/api run db:migrate` con `app_owner` | — | `backend` |
| `init-manager` | efímero (perfil `setup`) | `mi-app-dev-tools` | `pnpm --dir apps/api run create-initial-manager` con `app_rw` | — | `backend` |

- URL de trabajo: **http://localhost:5173** (SPA). API directa:
  http://localhost:3000/healthz. Los puertos se publican **solo en
  127.0.0.1** (SEC-013): nadie de la red local llega al servidor de Vite ni a
  la API. Probar con tablets reales se hace en TESTING/DEMO (con HTTPS), no en DEV.
- Red `backend`: `internal: true` (sin salida a internet; `db` no es
  alcanzable desde `frontend` ni desde el host). Comprobado (§15).
- Acceso a la BD sin publicar puertos:
  `podman-compose -f compose.dev.yaml exec db psql -U app_owner -d cafeteria`
  (por el socket local dentro del contenedor, con el usuario de la imagen).

| Volumen / montaje | Dónde | Contenido | Se borra con |
|---|---|---|---|
| `mi-app-dev_pgdata` (volumen) | `db:/var/lib/postgresql` | datos de PostgreSQL 19 (`PGDATA=/var/lib/postgresql/19/docker`) | `down -v` |
| `mi-app-dev_pnpm-store` (volumen) | `deps:/pnpm-store` | caché de paquetes de pnpm | `down -v` (con `--profile setup`) |
| `./` → `/workspace` | `api`, `migrate`, `init-manager`: **ro**; `web`, `deps`: rw | código fuente | — |
| `./deploy/db/initdb` → `/docker-entrypoint-initdb.d` | `db`, ro | script de inicialización | — |
| `.secrets/dev/<nombre>` → `/run/secrets/<nombre>` | por servicio, ro | secretos (§5) | — |

`node_modules/` queda en el árbol del host (ignorado por git) para que el IDE
vea los tipos; contiene binarios para Linux musl (Alpine), así que **no** se
ejecuta `pnpm` en el host: todo se ejecuta en contenedores.

Límites (cgroups v2): `db` 1 CPU / 512 MB / 200 pids; `api` 1,5 CPU / 768 MB;
`web` 1,5 CPU / 1 GB; `deps` 2 CPU / 2 GB; `migrate` e `init-manager` 1 CPU / 512 MB.
Logs: `k8s-file` con `max-size: 10mb` (`docs/logging.md` §5.2).

## 4. DEV: levantar, detener, destruir

Todos los comandos desde la raíz del proyecto, con el usuario normal (sin `sudo`).

| Acción | Comando |
|---|---|
| **Levantar todo la primera vez** (o tras cambiar dependencias/migraciones) | `sh deploy/dev/levantar.sh` |
| Igual, sin red (sin `pnpm install`) | `sh deploy/dev/levantar.sh --sin-deps` |
| Levantar el día a día | `podman-compose -f compose.dev.yaml up -d` |
| Estado | `podman-compose -f compose.dev.yaml ps` |
| Logs (JSON) | `podman-compose -f compose.dev.yaml logs -f api` o `podman logs -f mi-app-dev_api_1 \| jq` |
| Instalar dependencias | `podman-compose -f compose.dev.yaml --profile setup run --rm --no-deps deps` |
| Aplicar migraciones | `podman-compose -f compose.dev.yaml --profile setup run --rm --no-deps migrate` |
| Crear el encargado inicial | `podman-compose -f compose.dev.yaml --profile setup run --rm --no-deps init-manager` |
| Reconstruir la imagen de herramientas | `BUILDAH_FORMAT=docker podman-compose -f compose.dev.yaml --profile setup build deps` |
| **Detener** (conserva datos) | `podman-compose -f compose.dev.yaml down` |
| **Destruir** (borra BD y caché de pnpm) | `podman-compose -f compose.dev.yaml --profile setup down -v` |
| Reiniciar la BD de DEV (p. ej. tras `generar-secretos.sh --force`) | destruir y volver a `sh deploy/dev/levantar.sh` |

`levantar.sh` hace, en orden y parando al primer error: comprobaciones
(no root, rootless, cgroups v2) → secretos que falten → imagen de herramientas
si no existe → `deps` → `up -d db` → espera a `db` *healthy* → `migrate` →
`init-manager` → `up -d` (api, web).

### 4.1 Recarga en caliente
- `api`: `tsx watch` (o equivalente) detecta cambios a través del montaje de
  solo lectura y reinicia el proceso (probado con un servidor de prueba: el
  cambio se detecta en < 1 s).
- `web`: HMR de Vite por el puerto publicado 5173.

### 4.2 Aviso inocuo
`podman-compose` muestra `WARNING: unused networks: deps` cuando no se usa el
perfil `setup`: es normal (la red solo la usa `deps`).

### 4.3 Por qué los efímeros van en un perfil y no en `depends_on`
`podman-compose` traduce `depends_on` a `podman --requires`, y Podman **vuelve
a arrancar** los contenedores requeridos que estén parados cada vez que arranca
el dependiente. Con `migrate` o `deps` como dependencias de `api`, se
reejecutan en paralelo con el arranque y falló de forma intermitente
(`container state improper`; reproducido). Además, `service_completed_successfully`
en `podman-compose` 1.5.0 solo espera a que el contenedor pare: **no comprueba
el código de salida**. Por eso los efímeros se ejecutan con `run --rm --no-deps`
(el código de salida real llega al script) y los servicios permanentes solo
dependen de `db` *healthy*. Esto afecta también a TESTING (§9).

## 5. Secretos

- Generación: `sh deploy/dev/generar-secretos.sh` (solo crea los que falten;
  `--force` los regenera todos y obliga a destruir la BD de DEV). Escribe en
  `.secrets/dev/` con `umask 077` (directorio 0700, ficheros 0600); nunca los
  imprime. `.gitignore` excluye `.secrets/`. **Nunca** se copian a `docs/` ni
  al código; las contraseñas de DEV son distintas de las de cualquier otro
  entorno (SEC-013).
- Inyección (SEC-010): **siempre como fichero** en `/run/secrets/<nombre>`
  (montaje de solo lectura), con la ruta en una variable `*_FILE`. Ningún
  secreto va en variables de entorno (comprobado: `podman inspect` no muestra
  ningún valor, solo `POSTGRES_PASSWORD_FILE=/run/secrets/...`). En DEV son
  ficheros fuera del repositorio versionado montados por `podman-compose`;
  dentro del contenedor tienen modo 0600, propietario UID 1000 (el usuario del
  contenedor gracias a `keep-id`) y montaje `ro`. En PROD (Quadlet) se usará
  `Secret=<nombre>,type=mount,mode=0400,uid=1000,gid=1000` con `podman secret`.
- Reparto por contenedor (`docs/permisos.md` §7):

| Secreto (`.secrets/dev/`) | `db` | `migrate` | `init-manager` | `api` |
|---|---|---|---|---|
| `db_superuser_password` | ✓ (solo init) | | | |
| `db_owner_password` (`app_owner`) | ✓ (solo init) | ✓ | | |
| `db_app_password` (`app_rw`) | ✓ (solo init) | | ✓ | ✓ |
| `db_backup_password` (`app_backup`) | ✓ (solo init) | | | |
| `pin_pepper` | | | ✓ | ✓ |
| `initial_manager_name`, `initial_manager_pin` | | | ✓ | |

- PIN provisional del encargado (SEC-014): 6 dígitos generados con
  `/dev/urandom` y filtrados con las reglas de `docs/seguridad.md` §6.1.2 (sin
  todos iguales, sin 4+ consecutivos ascendentes/descendentes en cualquier
  posición, sin bloques repetidos, sin `aabbcc`, ≥ 4 dígitos distintos y fuera
  de una lista de PIN frecuentes). Prueba: 1 000 PIN generados, 0 rechazados por
  las reglas, 998 distintos. La validación definitiva la hace
  `create-initial-manager` con la función de `packages/shared`. Para verlo:
  `cat .secrets/dev/initial_manager_pin`.

## 6. Contrato con el código (para el Developer)

Lo que DEV inyecta y espera. Si el Developer necesita otros nombres, se
cambian en `compose.dev.yaml` (pídelo a Infrastructure; no se edita en solitario).

| Variable | `api` | `migrate` | `init-manager` | Valor DEV |
|---|---|---|---|---|
| `NODE_ENV` | ✓ | ✓ | ✓ | `development` |
| `HOST`, `PORT` | ✓ | | | `0.0.0.0`, `3000` |
| `TZ` | ✓ | ✓ | ✓ | `UTC` (la fecha de negocio no depende de la zona del contenedor) |
| `BUSINESS_TIMEZONE` | ✓ | ✓ | ✓ | `Europe/Madrid` |
| `LOG_LEVEL` | ✓ | ✓ | ✓ | `debug` |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME` | ✓ | ✓ | ✓ | `db`, `5432`, `cafeteria` |
| `DATABASE_USER` | `app_rw` | `app_owner` | `app_rw` | |
| `DATABASE_PASSWORD_FILE` | ✓ | ✓ | ✓ | `/run/secrets/db_*_password` |
| `PIN_PEPPER_FILE` | ✓ | | ✓ | `/run/secrets/pin_pepper` |
| `INITIAL_MANAGER_NAME_FILE`, `INITIAL_MANAGER_PIN_FILE` | | | ✓ | `/run/secrets/initial_manager_*` |
| `API_PROXY_TARGET` (`web`) | | | | `http://api:3000` (sin prefijo `VITE_` para que no llegue al bundle) |

- `config.ts` lee los secretos desde los ficheros `*_FILE` (recortando el
  salto de línea final si lo hubiera) y falla al arrancar si faltan.
- Scripts esperados: `apps/api`: `dev`, `db:migrate`, `create-initial-manager`
  (idempotente: no hace nada si ya hay un encargado); `apps/web`: `dev`.
- `GET /healthz` en `api` (lo usa el healthcheck). Raíz del sistema de
  ficheros de solo lectura: cualquier escritura fuera de `/tmp` fallará con
  `EROFS`; las cachés deben ir a `/tmp` (`HOME=/tmp`, `XDG_CACHE_HOME=/tmp/.cache`).
- pnpm 10+ bloquea los *scripts* de instalación de dependencias: el Developer
  debe listar en `pnpm-workspace.yaml` (`onlyBuiltDependencies`) las que los
  necesiten (p. ej. `argon2`, `esbuild`). `argon2` trae binarios precompilados
  para musl; si alguno necesitara compilar, se avisa a Infrastructure.
- Vite: usar una versión parcheada (CVE de lectura de ficheros del servidor de
  desarrollo, SEC-013); `server.host` lo pasa compose por argumentos.

## 7. Cumplimiento de la política §3.4 y excepciones

Aplicado a **todos** los servicios de DEV con un bloque común (`x-hardening`):

| Regla §3.4 | Equivalente en compose | Estado DEV |
|---|---|---|
| `--user 1000:1000` | `user: "1000:1000"` + `userns_mode: keep-id:uid=1000,gid=1000` | cumple; en el host todos los procesos son el UID del usuario (1000), nunca 0 |
| `--cap-drop=ALL` | `cap_drop: [ALL]`, sin `cap_add` | cumple; `CapEff` = 0 |
| `--security-opt=no-new-privileges` | `security_opt: [no-new-privileges]` | cumple; `NoNewPrivs: 1` |
| `--read-only --tmpfs /tmp` | `read_only: true` + `tmpfs` (`/tmp` `noexec,nosuid,nodev`; en `db` también `/run/postgresql` modo 0700) | cumple en todos |
| `--memory`, `--cpus` | `deploy.resources.limits` (`memory`, `cpus`, `pids`) | cumple |
| Sin `--privileged`, sin socket, sin `network=host`, sin directorios del sistema | redes bridge propias; solo se monta el proyecto, sus secretos y volúmenes con nombre | cumple |
| Imagen con `USER` ≥ 1000 y `HEALTHCHECK` | `USER 1000:1000` y `HEALTHCHECK` en el Containerfile; además en compose | cumple |
| Base por digest | `node:26.13.1-alpine@sha256:…`, `postgres:19.0-alpine@sha256:…` | cumple |

`userns_mode: keep-id` hace que el UID 1000 del contenedor sea el usuario del
host (sin privilegios). Así el código y los secretos (0600) se leen sin `chmod`
ni root, y lo que escriben `web`/`deps` en el árbol queda a nombre del usuario.
No da ningún privilegio: el usuario del contenedor ya es el del host.

**Excepciones (solo DEV, justificadas):**

1. **Imagen de herramientas en lugar de la imagen final.** DEV usa
   `mi-app-dev-tools` (Node + pnpm + shell de Alpine, una sola etapa) para la
   recarga en caliente, como prevé la arquitectura §10. No es mínima ni
   multi-stage y **nunca se despliega**. TESTING, DEMO y PROD usan la misma
   imagen final (`deploy/app/Containerfile`, distroless), la misma de `db`
   (idéntico digest) y la de Caddy. La regla "mismas imágenes en todos los
   entornos" se cumple para `db` en DEV y para todas desde TESTING.
2. **Código montado en lectura/escritura en `web` y `deps`.** No es la raíz del
   contenedor (que sigue en solo lectura) sino el árbol del proyecto: `deps`
   escribe `node_modules/` y Vite escribe su caché (`node_modules/.vite`) y
   ficheros temporales junto a `vite.config`. `api`, `migrate` e
   `init-manager` lo montan en solo lectura. Si el Developer mueve la caché de
   Vite a `/tmp` (`cacheDir`), `web` podría pasar a `ro`.
3. **`deps` tiene salida a internet** (registro npm) en su red `deps`; es el
   único servicio con ella y no tiene secretos.

En la construcción de la imagen, `npm install -g pnpm` se ejecuta como root
**solo en tiempo de construcción** (rootless, sin `sudo`); la ejecución es
siempre UID 1000. npm avisa de que omite los *scripts* de instalación de pnpm:
es inocuo (`pnpm --version` funciona).

## 8. Imágenes y digests

| Uso | Referencia | Entornos |
|---|---|---|
| Base de la imagen de herramientas de DEV | `docker.io/library/node:26.13.1-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5` (Node 26, LTS activa) | DEV |
| PostgreSQL | `docker.io/library/postgres:19.0-alpine@sha256:8b0ff4cdf221f0c53d7fcda681d3b461be725c492cd881c5ec9c0ad25023f188` (última mayor estable, ADR-003) | todos |
| Caddy | `docker.io/library/caddy:2.11.9-alpine@sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0` | TESTING, DEMO, PROD |
| pnpm | 12.21.0 (`ARG PNPM_VERSION`) | DEV (y etapa de construcción de la imagen final) |

Los digests son del índice multi-arquitectura. Para actualizar: consultar el
digest nuevo del tag, cambiar la referencia, reconstruir y pasar el escaneo
(Trivy/Grype, pendiente de integrar en la imagen final, §3.3).

**Construir siempre con `BUILDAH_FORMAT=docker`**: con el formato OCI por
defecto, Podman descarta el `HEALTHCHECK` del Containerfile (avisa
`HEALTHCHECK is not supported for OCI image format`). Los servicios de compose
declaran además su healthcheck, así que funciona aunque se construya en OCI.

**PostgreSQL 19.0** es una versión `.0`. Si Cybersecurity o el SE prefieren
esperar a 19.1, el cambio es solo el digest (y un volumen de DEV nuevo).

## 9. TESTING (`compose.test.yaml`, T-12)

Borrador que cumple `docs/testing.md` §7.1; `podman-compose ... config` lo
valida con todos los perfiles. **No se puede levantar todavía**: faltan la
imagen final de la app y las imágenes de los ejecutores.

| Requisito §7.1 | Cómo se cumple |
|---|---|
| Mismas imágenes que DEMO | `APP_IMAGE` obligatoria (por digest); `db` y `proxy` con digest fijo |
| Ejecutores sin root ni capacidades | todos con `x-hardening` (UID 1000, `cap_drop: ALL`, `no-new-privileges`, `read_only`, `tmpfs /tmp`, `HOME=/tmp`, límites) |
| Red interna, sin host ni sockets | redes `backend` y `edge`, **ambas `internal`** (sin salida a internet); `runner-unit` con `network_mode: none` |
| `db` en tmpfs | `/var/lib/postgresql` en tmpfs de 512 MB (probado: inicializa y queda *healthy* con raíz de solo lectura); `fsync=off` |
| `proxy` con `tls internal` y CA confiada | la CA se genera en cada ejecución en el volumen `caddy-data`; los ejecutores lo montan en `ro` y usan `NODE_EXTRA_CA_CERTS` |
| Toxiproxy entre ejecutores y `proxy` | servicio `toxiproxy` (perfiles `e2e`, `perf`); Caddy sirve los nombres `proxy` y `toxiproxy` |
| Perfiles por suite | `unit`, `integration`, `e2e`, `perf`, `security` (+ `setup` para `migrate`) |
| Secretos aleatorios por ejecución | ficheros en `TEST_SECRETS_DIR` (ver nota) |
| Salida escribible sin montar el repo en escritura | repo en `ro`; solo `tests/results` (o `TEST_RESULTS_DIR`) y `tests/screenshots` en rw, con `keep-id` |
| `TZ=UTC` y ejecución con otra zona | `TZ: ${APP_TZ:-UTC}` en `app`; `APP_TZ=America/New_York` para la segunda ejecución |
| Chromium sin `--ipc=host` | `shm_size: 1g`, `ipc: private` |

Notas y cambios que se piden a Testing (respuesta a T-12):
1. **Orden de arranque** (por §4.3): `tests/run.sh` debe hacer
   `up -d db` → `podman wait --condition=healthy <proyecto>_db_1` →
   `--profile setup run --rm --no-deps migrate` (y comprobar su código) →
   `--profile <suite> up --abort-on-container-exit --exit-code-from runner-<suite>`.
   Con `migrate` dentro del `up`, `--abort-on-container-exit` pararía todo en
   cuanto `migrate` terminara.
2. **Secretos por ejecución como ficheros, no `podman secret`.** Los secretos
   externos de `podman-compose` deben llamarse igual que en el compose, así que
   dos ejecuciones en paralelo chocarían. Propuesta: `run.sh` crea
   `TEST_SECRETS_DIR=$(mktemp -d -p "$XDG_RUNTIME_DIR")` (tmpfs del usuario,
   0700), genera los ficheros con `/dev/urandom` y lo borra en el `trap`. Mismo
   efecto (aleatorios, fuera del repo, borrados al final).
3. Ejecutores con **UID 1000** también en Playwright/k6/ZAP (no `pwuser`/`k6`):
   así leen la CA del volumen de Caddy y escriben en `tests/results` con
   `keep-id`. Pendiente de probar con las imágenes reales.
4. El volumen `caddy-data` que montan los ejecutores contiene también la clave
   de la CA de esa ejecución: aceptable porque la CA es efímera y solo existe
   en TESTING. En DEMO/PROD nunca se monta en otro contenedor.
5. Los comandos de los ejecutores (`pnpm run test:unit`, etc.) son
   provisionales: los fija Testing.
6. Sandbox de Chromium (§7.2): sin cambios de Infrastructure; la decisión
   `chromiumSandbox: false` sigue siendo de Cybersecurity.

## 10. Logs y PostgreSQL (M-05)

Aplicado en `compose.dev.yaml` y `compose.test.yaml` (servirá igual para DEMO/PROD):

- PostgreSQL arranca con `log_parameter_max_length=0`,
  `log_parameter_max_length_on_error=0`, `log_statement=none`,
  `log_error_verbosity=terse`, `log_min_duration_statement=200ms`,
  `log_line_prefix='%m [%p] %q%u@%d '`, `log_lock_waits`, `log_checkpoints`,
  `log_autovacuum_min_duration=1s`, `log_connections=on`, salida a stderr y
  `shared_preload_libraries=pg_stat_statements` (`docs/logging.md` §5.4).
  Comprobado con `SHOW` dentro del contenedor.
- `10-roles.sh` crea la extensión `pg_stat_statements` y, si el entorno monta
  `db_monitor_password`, el rol `monitoring` con `pg_monitor` (2 conexiones).
- SEC-015: cada sesión de `10-roles.sh` hace `SET log_statement='none'`,
  `SET log_min_error_statement='panic'` y `SET log_min_duration_statement=-1`.
  Prueba: se forzó el error `role "app_owner" already exists` ejecutando el
  script dos veces y se buscaron las contraseñas de `.secrets/dev/` en los
  logs de `db`: **0 coincidencias** (sin la línea `STATEMENT`).
- Nota para Monitoring: con `log_connections=on`, el healthcheck por TCP
  (`pg_isready` cada 10 s) deja una línea `connection received` cada 10 s.
  Si molesta, se puede pasar el healthcheck al socket local en DEMO/PROD.
- DEV/TESTING: log driver `k8s-file` con `max-size` 10 MB / 20 MB.
- **PROD** (para el aprovisionamiento, Etapa 5): journald persistente con
  `/etc/systemd/journald.conf.d/mi-app.conf` (`Storage=persistent`,
  `SystemMaxUse=1G`, `MaxRetentionSec=30day`), `loginctl enable-linger
  <usuario>` y `LogDriver=journald` en las unidades Quadlet (por defecto).
  Lectura sin root: `journalctl --user -u app.service -o cat`. Lo aplica
  cloud-init al crear el host; es configuración del sistema, no de un contenedor.

## 11. Observabilidad en DEMO/PROD (M-06, M-08)

Solo diseño; **no se despliega nada** en esta etapa.

### 11.1 M-06: leer logs y métricas sin violar §3.4

No se aplica ninguna excepción. Alternativas, de preferida a menos preferida:

| Opción | Logs | Métricas de contenedores | ¿Excepción a §3.4? |
|---|---|---|---|
| **B (propuesta)** | `k8s-file` en PROD con `log_opt path=` a un **directorio dedicado** del usuario de servicio (p. ej. `~/mi-app/logs/<servicio>.log`) y `max-size`; Alloy monta **solo ese directorio** en `ro` | temporizador systemd **del usuario** (en el host, fuera de contenedores; usa `podman stats --no-stream`, `systemctl --user show -p NRestarts,Result`, `df`) que escribe un `.prom` en un directorio dedicado; `node_exporter` con **solo** el colector `textfile` lo monta en `ro` | **No** |
| A | journald; Alloy monta `/var/log/journal` en `ro` | igual que B | **Sí** (directorio del sistema) |
| C | Alloy como servicio systemd del usuario (sin contenedor) leyendo `journalctl --user` | igual que B | No viola §3.4, pero rompe "contenedores en todo el ciclo de vida" |

- Propuesta de Infrastructure, coincide con Cybersecurity: **opción B**.
  Mejora sobre la (b) original de Monitoring: con `log_opt path` no hace
  falta montar el almacenamiento de Podman (`~/.local/share/containers`), que
  expondría la configuración de todos los contenedores.
- Coste de B: los logs de los contenedores no están en journald
  (`journalctl --user` no los muestra; se leen con `podman logs` o en
  Loki), y si Loki está caído cuando el fichero rota se pueden perder líneas.
  Mitigación: `max-size` amplio (100 MB) y alerta de Alloy sin enviar.
- Cybersecurity debe validar que el temporizador del host (que ejecuta
  `podman` como el usuario de servicio) es aceptable: necesita `podman` y no
  puede ir en un contenedor sin el socket.
- **Decisión final: humano** (puerta de la Etapa 1). Si eligiera A, sería una
  excepción a §3.4 que se registra en un ADR con Cybersecurity.

### 11.2 M-08: recursos y acceso a Grafana

| Componente | Memoria orientativa |
|---|---|
| `app` | 256–512 MB |
| `db` | 512 MB–1 GB |
| `proxy` (Caddy) | 128 MB |
| Stack de monitorización (Prometheus, Alertmanager, Loki, Alloy, Grafana, exportadores) | ≈ 1 GB |
| Sistema + margen | ≈ 1 GB |

Tamaño mínimo del host de PROD/DEMO: **2 vCPU, 4 GB de RAM, 40 GB de disco**
(BD + 30 días de logs/métricas + copias locales temporales). Se concreta en el
`terraform plan` de la Etapa 5.

Grafana: **solo en `127.0.0.1` del host** (`PublishPort=127.0.0.1:3001:3000`)
y acceso del humano por túnel SSH (`ssh -L 3001:127.0.0.1:3001 <usuario>@<host>`).
No añade superficie en la red del local ni otra contraseña expuesta. La
alternativa (detrás de Caddy con autenticación) queda descartada salvo que el
humano lo pida. Prometheus, Loki y Alertmanager no se publican.

## 12. Red, TLS e IP de origen (SEC-002, SEC-003, ADR-007)

Cybersecurity ya decidió el fondo (`docs/seguridad.md` §6.2); aquí está cómo
se aplica en cada entorno.

| Entorno | Acceso | TLS | Puertos del host |
|---|---|---|---|
| DEV | solo `localhost` | ninguno (contexto seguro) | `127.0.0.1:5173`, `127.0.0.1:3000` |
| TESTING | solo red interna de la ejecución | `tls internal`, CA por ejecución | ninguno |
| DEMO | red del personal del local | `tls internal` (CA de DEMO, distinta de la de PROD) | 8080/8443 tal cual (ADR-007 opción a) |
| PROD | red del personal (o VM con lista blanca/WireGuard) | `tls internal` en el local, ACME si es VM con dominio | 80/443 (§12.3) |

### 12.1 Requisito previo de PROD (SEC-002, bloqueante)
El login **nunca** debe ser alcanzable desde internet ni desde la Wi-Fi de
clientes. Antes de desplegar PROD se elige y se comprueba una de estas
topologías:

- **A. Servidor en el local (recomendada).** Servidor conectado a la red del
  personal. Wi-Fi del personal separada (SSID/VLAN propia, WPA2-AES o WPA3,
  contraseña no compartida con clientes); Wi-Fi de clientes con aislamiento y
  sin ruta a la red del personal (lo configura el cliente en su router;
  Infrastructure lo documenta en `docs/especificacion/` en la Etapa 4).
  Cortafuegos del host (nftables, aplicado por el aprovisionamiento): 80/443
  solo desde la subred del personal; SSH solo con clave, sin `root`, desde la
  subred de administración; todo lo demás cerrado.
- **B. VM en la nube.** Grupo de seguridad de Terraform con 80/443 **solo**
  desde la IP pública fija del local, o túnel WireGuard local↔VM con 80/443
  cerrados a internet. SSH igual que en A. Sin IP fija ni VPN, Cybersecurity no
  aprueba PROD en VM.
- Verificación (RS-41): `nmap`/`curl` desde internet y desde la Wi-Fi de
  clientes sin respuesta en 80/443/8080/8443; desde la red del personal, sí.

### 12.2 TLS
- `deploy/proxy/Caddyfile` (común a TESTING/DEMO/PROD; validado con
  `caddy validate`): `admin off`, puertos 8080/8443 dentro del contenedor,
  cabeceras de RS-26, logs JSON a stdout, `X-Request-Id` generado por Caddy
  (M-04), 404 en `/healthz`, `/readyz` y `/metrics`, `flush_interval -1` para
  SSE, sitio interno `:9180/health` para el healthcheck, redirección 308 de
  HTTP a HTTPS con el puerto público correcto (`PUBLIC_HTTPS_SUFFIX`: vacío en
  PROD, `:8443` en DEMO/TESTING; probado).
- Con `tls internal`: la CA raíz se exporta sin root con
  `podman run --rm -v <proyecto>_caddy-data:/data:ro <imagen caddy por digest> cat /data/caddy/pki/authorities/local/root.crt > ca-cafeteria.crt`
  y se instala **solo** en los dispositivos del local. Nombre del servidor
  fijo (DNS del router o IP fija). El volumen `/data` (clave de la CA) entra en
  las copias cifradas (§13). Procedimiento detallado: Etapa 4.
- Pendiente de revisión de Cybersecurity: la redirección usa el `Host` que
  envía el cliente; solo afecta a ese cliente, pero se puede limitar a los
  nombres de `SITE_ADDRESS` si se prefiere.

### 12.3 Puertos 80/443 en PROD
Según `docs/seguridad.md` §6.2 d: host dedicado → `net.ipv4.ip_unprivileged_port_start=80`
(exactamente 80) en `/etc/sysctl.d/`, aplicado por cloud-init al crear el host.
Si no es dedicado → no se toca el sysctl; redirección nftables 80→8080 y 443→8443
creada por el aprovisionamiento. Los contenedores nunca tienen capacidades.

### 12.4 SEC-009: Caddy sin capacidades
Probado con la imagen oficial por digest: `getcap /usr/bin/caddy` →
`cap_net_bind_service=p` (solo *permitted*, sin bit *effective*), así que con
`--user 1000:1000 --cap-drop=ALL --security-opt=no-new-privileges --read-only`
el `execve` funciona y Caddy arranca y sirve: `CapPrm` = `CapEff` = 0,
`NoNewPrivs: 1`, proceso con el UID del usuario en el host. **No hace falta
imagen derivada ni añadir capacidades**; ADR-007 ("imagen oficial sin
modificar") se mantiene.

### 12.5 SEC-003: conservar la IP real del dispositivo
- Prueba en esta máquina (Podman 5.7, red bridge rootless): con `-p` sobre una
  red bridge, el reenvío lo hace `rootlessport` y el servidor del contenedor
  ve una **IP interna** (`10.89.0.x`), no la del cliente. Esto rompería el
  límite por IP. Con `--network pasta`, el reenvío lo hace pasta, que conserva
  la IP de origen de los clientes de la LAN (desde el propio host se ve una
  dirección de enlace local, por eso la prueba definitiva necesita un segundo
  dispositivo).
- Propuesta para DEMO/PROD (una de las dos, se valida en DEMO con dos
  dispositivos reales, RS-06):
  1. **PROD con Quadlet: activación por socket de systemd** (preferida).
     Una unidad `.socket` del usuario escucha en 80/443 en el host y entrega
     el descriptor a Caddy (Caddy ≥ 2.9 admite `bind fd/3`). La conexión no
     pasa por ningún reenviador: Caddy ve la IP real y sigue en la red
     interna junto a `app`.
  2. **Caddy en `network_mode: pasta`** publicando 8080/8443, y `app`
     publicada solo en `127.0.0.1:3000` del host, alcanzable desde Caddy por
     `host.containers.internal`. Más simple en compose (DEMO), pero `app`
     queda escuchando en el loopback del host.
- En todos los casos Caddy no confía en `X-Forwarded-For` entrante (sin
  `trusted_proxies`) y la app (`trustProxy`) solo confía en la IP de `proxy`
  en la red interna (Developer, Etapa 2).

## 13. Copias de seguridad (SEC-011)

Diseño para DEMO/PROD (se implementa con Quadlet en la Etapa 5; prueba de
restauración en DEMO):
- Rol `app_backup` (ya creado por `10-roles.sh`: solo `CONNECT`, `USAGE` y,
  por privilegios por defecto, `SELECT` en tablas y secuencias que cree
  `app_owner`; 2 conexiones).
- Temporizador systemd del usuario de servicio, diario: contenedor efímero con
  la imagen de `postgres` (mismo digest), endurecido como el resto, ejecuta
  `pg_dump -Fc` como `app_backup` y cifra la salida con **age** usando solo la
  **clave pública** (la privada nunca está en el host). Copia fuera del host.
  Incluye el volumen `/data` de Caddy (clave de la CA), también cifrado.
- El *pepper* **no** entra en las copias: lo custodia el dueño en un sitio
  distinto (p. ej. su gestor de contraseñas). Si se pierde, todos los PIN dejan
  de valer (habría que restablecerlos).
- Métrica `backup_last_success_timestamp_seconds` al `.prom` de §11.1.

## 14. Verificación de la sección 3.9

Con DEV levantado (`mi-app-dev_<servicio>_1`):

```sh
# 1. Motor rootless
podman info --format '{{.Host.Security.Rootless}}'          # true

# 2. Ningún proceso con UID 0 en el host
for c in mi-app-dev_db_1 mi-app-dev_api_1 mi-app-dev_web_1; do
  podman top "$c" huser,user
  for p in $(podman top "$c" hpid | tail -n +2); do grep '^Uid:' /proc/$p/status; done
done                                                        # nunca root / 0

# 3. Endurecimiento de cada contenedor
podman inspect <ctr> --format 'user={{.Config.User}} ro={{.HostConfig.ReadonlyRootfs}} capadd={{.HostConfig.CapAdd}} effcaps={{.EffectiveCaps}} secopt={{.HostConfig.SecurityOpt}} mem={{.HostConfig.Memory}} cpus={{.HostConfig.NanoCpus}} priv={{.HostConfig.Privileged}} net={{.HostConfig.NetworkMode}}'
podman exec <ctr> grep -E 'CapEff|NoNewPrivs' /proc/1/status  # 0000000000000000 / 1
podman inspect <ctr> --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} {{end}}'   # sin sockets ni /etc,/var,/proc

# 4. Secretos fuera de las variables de entorno
podman inspect <ctr> --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -i 'pass\|pepper'  # solo *_FILE

# 5. Puertos solo en 127.0.0.1 (RS-40)
ss -ltn | grep -E ':3000|:5173'                             # 127.0.0.1 únicamente

# 6. db aislada
podman run --rm --network mi-app-dev_frontend <imagen postgres por digest> pg_isready -h db -t 2   # no response
```

El escaneo de imágenes (Trivy/Grype) se integra con la imagen final de la app
(Etapa 2); la imagen de herramientas de DEV no se despliega.

## 15. Qué se validó realmente y qué no

Validado en esta máquina (2026-11-21), sin `sudo` y sin coste:
- `podman info`: `rootless: true`, cgroups v2 con `cpu memory pids`.
- `podman-compose -f compose.dev.yaml config` y `compose.test.yaml config`
  (todos los perfiles, con variables de prueba): correctos.
- Imagen de herramientas construida rootless (`USER 1000:1000`, `HEALTHCHECK`
  conservado con `BUILDAH_FORMAT=docker`; Node 26.13.1, pnpm 12.21.0).
- Flujo completo de `levantar.sh` sobre un **workspace de prueba** (copia del
  compose con servidores Node mínimos en el scratchpad, no en el repo):
  `deps` → `db` → `migrate` → `init-manager` → `api` + `web`, todos *healthy*;
  un fallo de `migrate` (salida 3) detiene el script con código 3; recarga en
  caliente de `api` con el código en solo lectura; proxy `web` → `api`.
- `db` real: roles `app_owner` (2), `app_rw` (20), `app_backup` (2),
  privilegios por defecto de `app_backup`, `pg_stat_statements`, parámetros de
  log, `app_rw` sin `CREATE` en `public`, contraseña errónea rechazada, red
  `backend` sin salida a internet, `db` inalcanzable desde `frontend`.
- Política: UID 1000 en el host para todos los procesos, `CapEff` 0,
  `NoNewPrivs` 1, raíz de solo lectura, límites aplicados, secretos solo como
  fichero, puertos solo en `127.0.0.1`.
- SEC-015 (0 contraseñas en el log tras forzar el error), SEC-014 (1 000 PIN),
  SEC-009 (Caddy sin capacidades), Caddyfile (`caddy validate` y redirecciones).
- `db` de `compose.test.yaml` sobre tmpfs.

No validado:
- Nada con el código real de la app (no existe): scripts `dev`, `db:migrate`,
  `create-initial-manager`, Vite real, `argon2` en musl.
- `compose.test.yaml` completo (faltan imágenes de app y ejecutores),
  Playwright sin root, Toxiproxy.
- Conservación de la IP de origen desde otro dispositivo de la LAN (SEC-003).
- DEMO, PROD, Quadlet, Terraform, cortafuegos, copias: solo diseño.
- Escaneo de vulnerabilidades de imágenes.

Estado al terminar: la pila DEV de esta máquina está **detenida**. Queda el
volumen `mi-app-dev_pgdata` ya inicializado con los secretos actuales de
`.secrets/dev/` (si se regeneran con `--force`, destruir con `down -v`).
