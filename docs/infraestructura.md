# Infraestructura — Entornos con Podman rootless

> Responsable: Infrastructure. Entradas: `docs/reglas-equipo.md` §3,
> `docs/arquitectura.md` §3 y §10, ADR-001/002/003/007, `docs/seguridad.md`
> (§6.2, §6.3, §8, SEC-002/003/009/010/011/013/014/015/018/019/020/023/026/027), `docs/permisos.md` §6–7,
> `docs/logging.md` (§5, §6.5, §6.6, §7.0, §8.2) y `docs/testing.md` §7.
> Estado: **DEV listo y validado con un workspace de prueba** (todavía no hay
> código de la app). **TESTING en borrador** (`compose.test.yaml`; BD de test,
> roles y plantilla validados el 2026-11-24, §9.1 y §15). **Imagen final de la
> app definida** (`deploy/app/Containerfile`, §8.1; construida y probada con un
> workspace de prueba, falta el código real) y servicio de comandos de T-41 (§9.2). DEMO y PROD
> pendientes (Etapas 4 y 5), con las decisiones que ya condicionan su diseño en §10–§12.

## Índice
1. Requisitos de la máquina
2. Ficheros y estructura de carpetas esperada
3. DEV: servicios, puertos, redes y volúmenes
4. DEV: levantar, detener, destruir
5. Secretos
6. Contrato con el código (para el Developer)
7. Cumplimiento de la política §3.4 y excepciones
8. Imágenes y digests (8.1 imagen final de la app)
9. TESTING (`compose.test.yaml`, T-12; 9.2 servicio de comandos, T-41)
10. Logs y PostgreSQL (M-05, M-06, SEC-015, SEC-020)
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
    ├── db/testing/20-test-admin.sh  # SOLO TESTING: rol con CREATEDB y BD plantilla (T-28, §9.1)
    ├── proxy/Caddyfile           # TESTING, DEMO y PROD
    ├── app/
    │   ├── Containerfile         # imagen final multi-stage → distroless (TESTING, DEMO, PROD; §8.1)
    │   ├── containerignore       # lista de PERMITIDOS del contexto de construcción (--ignorefile)
    │   └── construir.sh          # construye en rootless e imprime APP_IMAGE por digest
    ├── quadlet/                  # (pendiente, Etapa 5) unidades de PROD
    ├── host/                     # (pendiente, Etapa 5) script y unidades del temporizador de métricas (§11.1)
    └── monitoring/               # (pendiente) stack de observabilidad; incluye alertmanager.yml.tmpl (§11.1)
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
pnpm-workspace.yaml     # packages: apps/*, packages/*, tests; allowBuilds (§6)
pnpm-lock.yaml          # obligatorio: deps y la imagen final instalan con --frozen-lockfile
apps/api/package.json   # scripts: dev, db:migrate, create-initial-manager (§6), build (§8.1)
apps/web/package.json   # scripts: dev (vite, acepta --host/--port/--strictPort), build (§8.1)
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
| `./` → `/workspace` | **ro** en los 5 servicios (`api`, `web`, `deps`, `migrate`, `init-manager`) | código fuente; todo lo que no está en la lista de abajo queda en solo lectura (raíz, `.git`, `.claude`, `CLAUDE.md`, `deploy/`, `docs/`, `tools/`, `tests/`, compose, ficheros nuevos de la raíz) | — |
| `./apps`, `./packages`, `./node_modules` → mismo sitio en **rw** (lista de permitidos, SEC-023, §7.1); además `./tests/node_modules` solo en `deps` (T-35) | solo `web`, `deps` | código de los paquetes, caché de Vite y dependencias instaladas; solo datos o código que corre dentro de contenedores, sin enlaces simbólicos que salgan de la lista (SEC-026) | — |
| tmpfs vacío → `/workspace/.secrets` (SEC-018) | los 5 servicios que montan `./` | nada: `ro`, modo 0000, 4 KiB, `notmpcopyup` | — |
| `./deploy/db/initdb` → `/docker-entrypoint-initdb.d` | `db`, ro | script de inicialización | — |
| `.secrets/dev/<nombre>` → `/run/secrets/<nombre>` | por servicio, ro | secretos (§5) | — |

`node_modules/` queda en el árbol del host (ignorado por git); contiene
binarios para Linux musl (Alpine) y código de terceros que escribe `deps`, así
que **no** se ejecuta `pnpm` ni `node` en el host ni se deja que el IDE cargue
código de ahí (ESLint, Prettier, Vitest, TypeScript del workspace): todo se
ejecuta en contenedores. Reglas y alternativas para el IDE en §7.1 (SEC-026).
Para crear un servicio o montaje nuevo se copia la tabla anterior, no un
montaje `rw` del proyecto entero (SEC-027).

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
(no root, rootless, cgroups v2) → secretos que falten → puntos de montaje
(`.secrets/`, `apps/`, `packages/`, `node_modules/`, `tests/node_modules/`) → **comprobación de
enlaces simbólicos** (SEC-026, §7.1) → imagen de herramientas si no existe →
`deps` → otra vez la comprobación de enlaces → `up -d db` → espera a `db`
*healthy* → `migrate` → `init-manager` → `up -d` (api, web).

### 4.1 Recarga en caliente
- `api`: `tsx watch` (o equivalente) detecta cambios a través del montaje de
  solo lectura y reinicia el proceso (probado con un servidor de prueba: el
  cambio se detecta en < 1 s).
- `web`: HMR de Vite por el puerto publicado 5173.

### 4.2 Aviso inocuo
`podman-compose` muestra `WARNING: unused networks: deps` cuando no se usa el
perfil `setup`: es normal (la red solo la usa `deps`).

**No es inocuo** (visto el 2026-11-24): `The cgroupv2 manager is set to systemd
but there is no systemd user session available` seguido de
`runc create failed: ... rootless needs no limits + no cgrouppath` al
arrancar cualquier servicio. Causa: la terminal hereda un
`DBUS_SESSION_BUS_ADDRESS` que apunta al bus de **otro** usuario (p. ej.
`/run/user/1001/bus` tras un cambio de usuario en el escritorio), Podman no
puede usar systemd, cae a `cgroupfs` y no puede aplicar los límites de
memoria/CPU. Arreglo, sin root: `export DBUS_SESSION_BUS_ADDRESS=unix:path=$XDG_RUNTIME_DIR/bus`
(o abrir una sesión nueva del usuario) y repetir. No se quitan los límites.

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
  `Secret=<nombre>,type=mount,uid=1000,gid=1000,mode=0400` con `podman secret`.
- **SEC-010 (resto), UID del secreto en PROD: 1000:1000.** El
  software-engineer fijó el 2026-11-23 (`docs/arquitectura.md` §10, ADR-001)
  que la imagen final de `app` usa **`USER 1000:1000`** (no el `nonroot`
  65532 de distroless). Por tanto: (1) `deploy/app/Containerfile` (creado
  por Infrastructure en la tarea 2.1l, §8.1)
  hace `COPY --chown=1000:1000` de `dist/` y de los `node_modules` de
  producción y declara `USER 1000:1000`; (2) las unidades Quadlet de `app` y
  `migrate` llevan `User=1000` y `Group=1000`, y compose `user: "1000:1000"`
  (ya está así en `compose.test.yaml`); (3) cada `Secret=` lleva
  `uid=1000,gid=1000,mode=0400`. `db` y `proxy` también corren como 1000, con
  el mismo `uid`/`gid`. Si algún día cambia el UID de una imagen, se cambian a
  la vez el `USER`, el `User=` y el `uid` del secreto. **Nunca** se resuelve
  un desajuste con `mode=0444` ni con otro modo legible por otros. Lo
  comprueba RS-38 en TESTING (el proceso lee su secreto; otro UID no).
- `TABLE_COUNT` (20) y `DELAY_THRESHOLD_MINUTES` (10) **no son secretos**: van
  como variables de entorno normales de `api` (DEV) y `app` (TESTING, DEMO,
  PROD) (§6). Ya no hay tabla `settings`: `migrate` no crea ninguna fila de
  ajustes.
- **SEC-018: los secretos solo llegan por `/run/secrets`.** Con `keep-id` el
  UID del contenedor es el usuario del host, dueño de `.secrets/dev/`; por eso
  todos los servicios que montan el proyecto llevan un tmpfs vacío (`ro`, modo
  0000) encima de `/workspace/.secrets` (§7). Importante: el tmpfs lleva
  `notmpcopyup`; sin esa opción Podman **copia** al tmpfs lo que había debajo,
  es decir, los secretos (comprobado: falló por falta de espacio al intentar
  copiarlos). Por eso se declara en la lista `tmpfs:` del servicio y no en la
  sintaxis larga de `volumes`, que en `podman-compose` 1.5 no admite esa
  opción. Requiere que `.secrets/` exista (lo crea `generar-secretos.sh`).
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
| `TABLE_COUNT`, `DELAY_THRESHOLD_MINUTES` | ✓ | | | `20`, `10` (no secretas; arquitectura §4.1; `config.ts` no arranca fuera de 1–99 / 1–60). Igual en `app` de TESTING/DEMO/PROD |
| `TZ` | ✓ | ✓ | ✓ | `UTC` (la fecha de negocio no depende de la zona del contenedor) |
| `PUBLIC_ORIGIN` (obligatoria) | ✓ | ✓ | ✓ | `http://localhost:5173` (origen de Vite; Vite reenvía `/api` sin cambiar `Origin`). TESTING: `https://toxiproxy:8443`. DEMO/PROD: el nombre del local, p. ej. `https://caja.local:8443` (Etapas 4–5) |
| `TRUSTED_PROXIES` | ✓ | ✓ | ✓ | vacía (no hay Caddy). TESTING: `10.89.240.2`, la IP fija de `proxy` en la red `proxy-app` (§9.1). DEMO/PROD: la IP de `proxy` en su red interna. Formato estricto (SEC-029), ver abajo |
| `METRICS_PORT` | ✓ | ✓ | ✓ | `9464` (no se publica en el host) |
| `SESSION_MAX_HOURS` | ✓ | ✓ | ✓ | `12` (entero 1–12; fuera de rango no arranca, RS-13). Igual en todos los entornos salvo que el cliente pida menos |
| `LOG_LEVEL` | ✓ | ✓ | ✓ | `debug` |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME` | ✓ | ✓ | ✓ | `db`, `5432`, `cafeteria` |
| `DATABASE_USER` | `app_rw` | `app_owner` | `app_rw` | |
| `DATABASE_PASSWORD_FILE` | ✓ | ✓ | ✓ | `/run/secrets/db_*_password` |
| `PIN_PEPPER_FILE` | ✓ | | ✓ | `/run/secrets/pin_pepper` |
| `INITIAL_MANAGER_NAME_FILE`, `INITIAL_MANAGER_PIN_FILE` | | | ✓ | `/run/secrets/initial_manager_*` |
| `API_PROXY_TARGET` (`web`) | | | | `http://api:3000` (sin prefijo `VITE_` para que no llegue al bundle) |

- `config.ts` lee los secretos desde los ficheros `*_FILE` (recortando el
  salto de línea final si lo hubiera) y falla al arrancar si faltan.
- Nombres y rangos: `docs/arquitectura.md` §10.1. `PUBLIC_ORIGIN`,
  `TRUSTED_PROXIES`, `METRICS_PORT` y `SESSION_MAX_HOURS` van en el ancla
  común (`x-api-env` en DEV, `x-app-env` en TESTING), así que también los
  reciben `migrate` e `init-manager`/`migrate-template`: §10.1 dice que
  `migrate` y los comandos no arrancan si falla `parseSettings`, y
  `PUBLIC_ORIGIN` no tiene valor por defecto. Son no secretas; si el
  software-engineer confirma que `migrate` no las valida, se pueden quitar de ahí.
- **Reglas de `TRUSTED_PROXIES` (SEC-029, `docs/arquitectura.md` §10.1).**
  `config.ts` valida el valor y, si no cumple, **no arranca** (`ConfigError`
  con `variable = 'TRUSTED_PROXIES'`, sin el valor; salida 1). Afecta
  también a `migrate` y a los comandos, porque reciben la variable por el ancla
  común. Al escribir el valor en compose o en Quadlet:
  1. Ausente o `""` = ninguna (DEV). Si no, se parte por `,` **sin recortar
     espacios**: nada de `"a, b"` ni comas sobrantes (`a,`, `,a`, `a,,b`).
  2. Entre 1 y 4 elementos.
  3. Cada elemento: IPv4 literal sin ceros a la izquierda (`10.89.240.2`, no
     `010.89.240.2`), IPv6 literal sin `%zona` ni corchetes, o CIDR con
     prefijo decimal sin ceros a la izquierda de **24–32** (IPv4) o
     **120–128** (IPv6; `::ffff:a.b.c.d/n` cuenta como IPv6).
  4. Prohibidos: nombres (`loopback`, `linklocal`, `uniquelocal`, nombres de
     host como `proxy`), `true`/`false`, números de saltos (`1`, `2`) y
     prefijos cortos (`0.0.0.0/0`, `10.0.0.0/8`, `fd00::/64`).
  5. Criterio de Infrastructure: siempre **la IP única** de `proxy` en una red
     dedicada `proxy`↔`app` con subred e IP fijas (como `proxy-app` en
     TESTING); un CIDR solo si esa red no tiene más contenedores que `proxy`
     y `app`. Nunca la subred de `backend` ni la de una red compartida.
  El valor de TESTING, `${TEST_PROXY_IP:-10.89.240.2}`, cumple (un IPv4
  literal). Si se cambia `TEST_PROXY_IP` para ejecuciones en paralelo, debe
  seguir siendo un IPv4 literal sin ceros a la izquierda.
- **`BUSINESS_TIMEZONE` retirada (2.1c):** la zona de negocio es una
  constante (`Europe/Madrid`) de `packages/shared`; `config.ts` no la lee.
- *Pepper* (`pin_pepper`): `config.ts` exige **≥ 32 bytes**.
  `generar-secretos.sh` lo crea con 48 bytes aleatorios (64 caracteres
  base64url) y se detiene si el que ya existe tiene menos de 32 (el de DEV
  actual tiene 43: vale). En TESTING, `tests/run.sh` genera 48 caracteres a
  partir de 48 bytes aleatorios (≥ 32; mínimo 48 en 200 pruebas).
- Scripts esperados: `apps/api`: `dev`, `db:migrate`, `create-initial-manager`
  (idempotente: no hace nada si ya hay un encargado); `apps/web`: `dev`.
- `GET /healthz` en `api` (lo usa el healthcheck). Raíz del sistema de
  ficheros de solo lectura: cualquier escritura fuera de `/tmp` fallará con
  `EROFS`; las cachés deben ir a `/tmp` (`HOME=/tmp`, `XDG_CACHE_HOME=/tmp/.cache`).
- pnpm bloquea los *scripts* de instalación de dependencias y, en pnpm 12
  (12.21.0, la fijada), **falla** con `ERR_PNPM_IGNORED_BUILDS` si alguno no
  está aprobado (comprobado en la 2.1l). El ajuste en pnpm 12 es `allowBuilds`
  en `pnpm-workspace.yaml` (ya **no** `onlyBuiltDependencies`), con los que
  los necesiten, p. ej.:
  ```yaml
  allowBuilds:
    argon2: true
    esbuild: true
  ```
  `argon2` trae binarios precompilados para musl (DEV) y glibc (imagen final);
  si alguno necesitara compilar, se avisa a Infrastructure.
- **Señales (imagen final):** en la distroless `node` es el PID 1 y Node, como
  PID 1, **no termina con `SIGTERM` si no hay manejador** (comprobado: el
  motor tuvo que matarlo con `SIGKILL` a los 10 s). `main.ts` debe registrar
  `SIGTERM` y `SIGINT` y cerrar ordenadamente (`app.close()`, que cierra el
  *pool*, el *hub* SSE y el servidor de métricas) y salir. Así `podman stop`,
  `down` y el reinicio de Quadlet no pierden 10 s ni cortan una transacción.
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
| Base por digest | `node:26.13.1-alpine@sha256:…`, `postgres:19.0-alpine@sha256:…` (imagen final: §8.1) | cumple |

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
2. **Partes del árbol del proyecto en escritura en `web` y `deps`** (SEC-018,
   SEC-023). La raíz del contenedor sigue en solo lectura y **el proyecto
   también** (`./:/workspace:ro`); encima solo se vuelve a montar en `rw` una
   lista de permitidos: `apps/`, `packages/` y `node_modules/` (y, solo en
   `deps`, `tests/node_modules/`, T-35). `deps` escribe
   ahí `node_modules/` (raíz y cada paquete del workspace, incluido `tests`) y Vite escribe su
   caché (`apps/web/node_modules/.vite`) y ficheros temporales junto a
   `apps/web/vite.config`. `api`, `migrate` e `init-manager` montan el
   proyecto entero en `ro`. Si el Developer mueve la caché de Vite a `/tmp`
   (`cacheDir`) y los temporales dejan de escribirse junto a `vite.config`,
   `web` podría quedarse solo con `node_modules/` o pasar a `ro`.
   Con esto todo lo que se ejecuta o se lee como instrucciones **en el host**
   queda en `ro` por defecto: `.git` (hooks, `core.hooksPath`,
   `core.fsmonitor`), `.claude`, `CLAUDE.md`, `deploy/`, `docs/`, `tools/`,
   `tests/` (con `tests/run.sh`), `.gitignore`, los `compose.*.yaml`, la
   configuración de la raíz (`package.json`, `tsconfig*.json`,
   `eslint.config.*`) y **cualquier fichero nuevo de la raíz** (`.envrc` de
   direnv, `.vscode/tasks.json`…), sin tener que acordarse de añadirlo a una
   lista. La regla y sus límites están en §7.1. Los 5 servicios que montan el
   proyecto llevan además `.secrets/` tapado (§5).
3. **`deps` tiene salida a internet** (registro npm) en su red `deps`; es el
   único servicio con ella y no tiene secretos.

En la construcción de la imagen, `npm install -g pnpm` se ejecuta como root
**solo en tiempo de construcción** (rootless, sin `sudo`); la ejecución es
siempre UID 1000. npm avisa de que omite los *scripts* de instalación de pnpm:
es inocuo (`pnpm --version` funciona).

### 7.1 Regla: nada que se ejecute en el host es escribible desde un contenedor (SEC-023)

Ningún fichero que se ejecute (o que una herramienta del host lea como
instrucciones) en la cuenta del usuario puede quedar escribible desde un
contenedor. El código de terceros que ejecutan `deps` (scripts de instalación)
y `web` (plugins de Vite) no debe poder salir del contenedor modificando algo
que luego corre en el host antes de que nadie mire `git diff`.

Cómo se aplica:
- **DEV, `web` y `deps`:** proyecto en `ro` + lista de permitidos en `rw`
  (`x-rw-apps`, `x-rw-packages`, `x-rw-node-modules` en `compose.dev.yaml`;
  `deps` además `x-rw-tests-node-modules`, solo `./tests/node_modules`, T-35).
  Es una lista de permitidos, no de prohibidos: lo que no está en ella queda
  en `ro`. Si falta un origen, `podman-compose` crea el directorio vacío en el
  host; `deploy/dev/levantar.sh` los crea antes con `mkdir -p`.
- **DEV, `api`, `migrate`, `init-manager`:** proyecto entero en `ro`.
- **TESTING:** proyecto en `ro`; solo `tests/results` (o `TEST_RESULTS_DIR`)
  y `tests/screenshots` en `rw` (§9).
- **Nunca** se añade a la lista de permitidos la raíz, `tests/` entero, ni una
  ruta que contenga scripts que se ejecuten en el host. Si `tests/` pasa a ser
  un paquete del workspace pnpm, se añade solo `./tests/node_modules` en `rw`.
  **Hecho (T-35, 2026-11-24):** `tests/` es `@mi-app/tests`; solo `deps` monta
  `./tests/node_modules` en `rw` (`web` no lo necesita). `tests/run.sh` y el
  resto de `tests/` siguen en `ro` (comprobado, §15).
  Al añadir `compose.demo.yaml` u otro fichero de entrada, va fuera de la lista.
- Toda ruta en `rw` es **solo datos o código que corre dentro de un
  contenedor**: el host no ejecuta nada de `apps/`, `packages/`,
  `node_modules/`, `tests/results` ni `tests/screenshots` (ni `node`/`pnpm`
  del host sobre el árbol). Riesgo residual aceptado: el
  código de `apps/` y `packages/` sigue siendo modificable por `web`/`deps`;
  solo se ejecuta dentro de contenedores y se revisa en `git diff`.
- **IDE y herramientas del host (SEC-026).** En el host no se usan extensiones
  ni herramientas que carguen o ejecuten código de `node_modules/`, `apps/` o
  `packages/`: ESLint, Prettier, Vitest/Jest, Playwright, el servidor de
  TypeScript con la "versión del workspace" o con `plugins` de un
  `apps/*/tsconfig.json`, y cualquier extensión que lea
  `vite.config`/`vitest.config`/`eslint.config`/`prettier.config` del árbol.
  Todas ejecutan ese código **en el host**, con la cuenta del usuario, y
  `node_modules/` lo escribe `deps` con scripts de terceros. Opciones
  permitidas, de más a menos recomendada:
  1. Abrir el proyecto en el IDE en **modo restringido / workspace no
     confiable** (VS Code: "Restricted Mode"; equivalentes en otros IDE),
     que desactiva esas extensiones y la versión de TypeScript del workspace.
     Formateo, lint y tests se lanzan con `podman-compose` en los contenedores
     (`... run --rm --no-deps deps pnpm lint`, etc.).
  2. IDE conectado a un contenedor (dev container o servidor remoto del IDE
     dentro de un contenedor con el mismo endurecimiento de §7 y la misma
     lista de permitidos): las extensiones corren dentro, no en el host. Si se
     añade, se documenta aquí y lo revisa Cybersecurity antes de usarlo.
  3. Si se usa TypeScript en el host para ver tipos, solo con la versión que
     trae el IDE (nunca "Use Workspace Version") y sin `plugins` de
     `tsconfig`.
  No se aceptan tareas automáticas del IDE (`.vscode/tasks.json`,
  `runOn: folderOpen`) ni formateo al guardar con un formateador del
  workspace.
- **Enlaces simbólicos (SEC-026).** `web` y `deps` pueden crear en la lista
  de permitidos enlaces a cualquier ruta (`apps/x -> ../tests/run.sh`,
  `node_modules/y -> /home/<usuario>/.ssh/…`). Dentro del contenedor no sirven
  de nada, pero en el host se resuelven contra los ficheros del usuario: si
  algo del host escribe en ese nombre, escribe en el destino; si lo lee, el
  contenido de un fichero privado entra en el contexto de un agente o en el
  repositorio. Reglas:
  - En `apps/` y `packages/`, fuera de los `node_modules/` reales, **no hay
    enlaces simbólicos**. Si algún día hace falta uno versionado, se revisa
    con Cybersecurity (aparece en `git diff` con modo `120000`) y se añade una
    excepción explícita a la comprobación, nunca un comodín.
  - En toda la lista (incluidos los `node_modules/`, que pnpm llena de
    enlaces, y `tests/node_modules/`), ningún enlace resuelve fuera de
    `apps/`, `packages/`, `node_modules/` o `tests/node_modules/`.
  - Comprobación (la misma en `levantar.sh` y en `tests/run.sh`), desde la
    raíz y sin seguir enlaces:
    ```sh
    # a) debe salir vacío; "-type d" en la poda: un enlace llamado
    #    node_modules no se poda y aparece
    find apps packages \( -name node_modules -type d \) -prune -o -type l -print
    # b) cada destino debe empezar por $(pwd -P)/apps/, /packages/, /node_modules/
    #    o /tests/node_modules/
    find apps packages node_modules tests/node_modules -type l -exec realpath -m -- {} +
    ```
    El `-path '*/node_modules' -prune` propuesto en SEC-026 no basta: poda
    también un **enlace** llamado `node_modules` (p. ej.
    `packages/p/node_modules -> ../../tests`) y no lo muestra.
  - `deploy/dev/levantar.sh` hace las dos comprobaciones (función
    `comprobar_enlaces`) antes de arrancar nada y otra vez justo después de
    `deps`, y se detiene con la lista de enlaces sospechosos (enlace →
    destino). Es una foto: `web` sigue corriendo y puede crear enlaces
    después. Por eso, además, los agentes y personas del host, antes de
    **escribir** un fichero de `apps/` o `packages/` con herramientas del
    host, comprueban que no es un enlace (`test -L <ruta>` → falso) ni lo es
    ninguna carpeta del camino; y antes de **leer** algo de `node_modules/`,
    que el destino real (`realpath`) está dentro de la lista.
  - Ningún enlace de la lista se borra ni se "arregla" siguiéndolo: se
    inspecciona con `ls -l` y se borra el enlace (`rm <enlace>`, sin `-r`).

**Script de pruebas del host (lo crean Testing o Developer en la Etapa 2).**
Ubicación: `tests/run.sh` (la de `docs/testing.md` §4.1 y §7.3), que ya no es
escribible desde ningún contenedor: `tests/` está fuera de la lista de
permitidos de DEV y en TESTING solo `tests/results` y `tests/screenshots` son
`rw`. También valdría `tools/run-tests.sh`. Requisitos obligatorios del script:
1. Antes de cualquier `up`/`run`: `mkdir -p -m 0700 .secrets` (desde la raíz
   del repositorio). Sin ese directorio el tmpfs que lo tapa no tiene punto de
   montaje dentro de un montaje `ro` y el contenedor no arranca (p. ej. en CI).
2. No ejecutar, `source`ar ni leer como configuración nada de `tests/results`,
   `tests/screenshots` ni de la lista de permitidos de DEV.
3. Vivir fuera de cualquier ruta en `rw` de un contenedor. Ningún servicio
   monta `tests/run.sh` en escritura.
4. El resto de §9 (orden de arranque, secretos por ejecución en
   `$XDG_RUNTIME_DIR`, `podman-compose` siempre).
5. (SEC-026) Al empezar, antes de cualquier `up`/`run`, y otra vez antes de
   leer resultados o tocar ficheros del árbol tras ejecutar contenedores que
   escriben en la lista: las dos comprobaciones de enlaces de arriba. Si (a)
   devuelve algo, o algún destino de (b) sale de `apps/`, `packages/` o
   `node_modules/`, o `realpath` falla (bucle de enlaces), el script se
   detiene con código distinto de 0 **sin seguir el enlace** (sin `cat`,
   `cp`, `>` ni `rm -r` sobre él). Lo más simple es copiar la función
   `comprobar_enlaces` de `deploy/dev/levantar.sh` (probada, §15). Si se
   prefiere no duplicarla, Testing/Developer puede proponer moverla a
   `tools/` (fuera de la lista de permitidos) y que la usen los dos scripts.
   En TESTING, `tests/results` y `tests/screenshots` también son `rw`: la
   misma comprobación (b) sobre ellas, sin enlaces permitidos, antes de que
   el script lea o publique un informe.

Cómo verificarlo (RS-45 ampliado): `podman-compose -f compose.dev.yaml
--profile setup run --rm --no-deps --entrypoint sh <web|deps> -c 'touch
/workspace/tests/run.sh'` → `Read-only file system`; el mismo `touch` en
`/workspace/apps/x` → correcto. Además (SEC-026): plantar desde `deps`
`ln -s ../tests/run.sh /workspace/apps/x` → `levantar.sh` y `tests/run.sh`
se detienen con error y `tests/run.sh` no cambia. Resultado de la prueba
real en §15.

## 8. Imágenes y digests

| Uso | Referencia | Entornos |
|---|---|---|
| Base de la imagen de herramientas de DEV | `docker.io/library/node:26.13.1-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5` (Node 26, LTS activa) | DEV |
| PostgreSQL | `docker.io/library/postgres:19.0-alpine@sha256:8b0ff4cdf221f0c53d7fcda681d3b461be725c492cd881c5ec9c0ad25023f188` (última mayor estable, ADR-003) | todos |
| Caddy | `docker.io/library/caddy:2.11.9-alpine@sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0` | TESTING, DEMO, PROD |
| pnpm | 12.21.0 (`ARG PNPM_VERSION`) | DEV (y etapa de construcción de la imagen final) |
| Etapa de construcción de la imagen final | `docker.io/library/node:26.13.1-trixie-slim@sha256:abe7e5a82b61a8ef67b315b85497c9e65173387ccf2f4a029248184b8e020be5` (Debian 13, glibc 2.41) | solo construcción |
| Etapa final de la imagen de la app | `gcr.io/distroless/nodejs26-debian13@sha256:b462e87a3db156aea160dd8a5306b85d02c3061ca0e3194fe0af81282a830ab0` (etiqueta `latest`; Node v26.13.1, glibc 2.41, sin shell) | TESTING, DEMO, PROD |
| Escáner (§3.3) | `docker.io/aquasec/trivy@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb` (0.76.2), en contenedor rootless sobre un `podman save` | construcción |

Los digests son del índice multi-arquitectura. Para actualizar: consultar el
digest nuevo del tag, cambiar la referencia, reconstruir y pasar el escaneo
(Trivy/Grype, pendiente de integrar en la imagen final, §3.3).

**Construir siempre con `BUILDAH_FORMAT=docker`**: con el formato OCI por
defecto, Podman descarta el `HEALTHCHECK` del Containerfile (avisa
`HEALTHCHECK is not supported for OCI image format`). Los servicios de compose
declaran además su healthcheck, así que funciona aunque se construya en OCI.

**PostgreSQL 19.0** es una versión `.0`. Si Cybersecurity o el SE prefieren
esperar a 19.1, el cambio es solo el digest (y un volumen de DEV nuevo).

### 8.1 Imagen final de la app (`deploy/app/Containerfile`, tarea 2.1l, T-41)

La **misma** imagen (mismo digest) para `app`, `migrate`, `migrate-template` y
`commands` en TESTING, y para DEMO y PROD (`docs/arquitectura.md` §10).

**Construir** (rootless, sin `sudo`, desde la raíz del repositorio; necesita red
para descargar dependencias):

| Acción | Comando |
|---|---|
| Construir | `sh deploy/app/construir.sh` (etiqueta `localhost/mi-app:<commit>`, con `-sucio` si hay cambios sin commit en `apps/`, `packages/` o los ficheros del workspace) |
| Con etiqueta propia | `sh deploy/app/construir.sh <etiqueta>` |
| Equivalente manual | `podman build --format docker --ignorefile deploy/app/containerignore -f deploy/app/Containerfile -t localhost/mi-app:<etiqueta> .` |
| Referencia por digest | la imprime el script: `APP_IMAGE=localhost/mi-app@sha256:…` (o `podman image inspect --format '{{.Digest}}' localhost/mi-app:<etiqueta>`) |
| Usarla en TESTING | `APP_IMAGE=localhost/mi-app@sha256:… sh tests/run.sh <suite>` |
| Borrar | `podman rmi localhost/mi-app:<etiqueta>` |

`--format docker` es obligatorio (si no, Podman descarta el `HEALTHCHECK`, §8)
y `--ignorefile deploy/app/containerignore` también: es una **lista de
permitidos** (`*` y luego `!package.json`, `!pnpm-lock.yaml`,
`!pnpm-workspace.yaml`, `!.npmrc`, `!tsconfig*.json`, `!apps/api`, `!apps/web`,
`!packages`, `!tests/package.json`; dentro, fuera `node_modules`, `dist`,
`.env*`, `*.pem`, `*.key`, `.secrets`). Así **nunca** entran en el contexto
`.secrets/`, `.git/`, `.claude/`, `docs/`, `deploy/` ni `tests/` (comprobado,
§15). Por eso se construye con el script y no con un `podman build .` a mano.

**Etapas:**
1. `build` (`node:26.13.1-trixie-slim`, por digest): pnpm 12.21.0 con `npm`
   como root (único paso con root, solo en construcción); el resto como UID
   1000. `pnpm fetch` (solo con el lockfile; capa cacheable) → copia del
   contexto → `pnpm install --offline --frozen-lockfile` **solo** de
   `@mi-app/api...` y `@mi-app/web...` (no de `tests/`) → `pnpm ... run build`
   en orden topológico (`packages/shared` antes que `apps/*`) → `pnpm --filter
   @mi-app/api deploy --prod /out/api` (dependencias de producción, sin
   `devDependencies`; `pnpm deploy` valida el lockfile contra las políticas
   de cadena de suministro de pnpm, por eso va con red). Después **comprueba
   el contrato** (abajo): si falta un punto de entrada, el build falla con el
   nombre del fichero.
2. Final (`distroless/nodejs26-debian13`, por digest): solo `/app` con
   `COPY --chown=1000:1000`, `USER 1000:1000`, `EXPOSE 3000 9464`,
   `HEALTHCHECK` y `CMD`.

**Por qué la etapa de construcción no es `-alpine`** (desviación de
`docs/arquitectura.md` §10, que dice `node:<LTS>-alpine` para compilar): la
etapa final es distroless (Debian, **glibc**). Un módulo nativo instalado en
Alpine (**musl**) puede no cargar en glibc, y `pnpm deploy` instala para la
libc de la etapa donde corre. Con `trixie-slim` la etapa de construcción
tiene la misma versión de Node (26.13.1, ABI 147) y la misma glibc (2.41)
que la final. DEV sigue en Alpine (no se despliega). Lo puede ratificar el
software-engineer; no cambia ningún ADR.

**Dentro de la imagen** (fijo):

| Ruta | Contenido |
|---|---|
| `/nodejs/bin/node` | **binario exacto de Node** (v26.13.1). También está en `PATH`, así que `node` funciona |
| `/app` | **`WORKDIR`** |
| `/app/package.json` | el `package.json` de `apps/api` (lo escribe `pnpm deploy`; conserva `"type"`) |
| `/app/node_modules` | dependencias de producción de `apps/api` (incluida `@mi-app/shared` si es dependencia, copiada por `pnpm deploy`) |
| `/app/dist` | salida del build de `apps/api` (`ARG API_DIST=apps/api/dist`) |
| `/app/public` | salida del build de `apps/web` (`ARG WEB_DIST=apps/web/dist`): la SPA |

- `ENTRYPOINT []` (se anula el `/nodejs/bin/node` de distroless) y
  `CMD ["/nodejs/bin/node", "dist/main.js"]`: el comando siempre es completo.
  `migrate`: `node dist/migrate.js`; comandos: `node dist/commands/<script>.js`.
- `HEALTHCHECK` (forma exec, sin shell): `/nodejs/bin/node dist/healthcheck.js`
  cada 15 s, *timeout* 5 s, `start-period` 30 s, 3 reintentos.
- `ENV NODE_ENV=production HOME=/tmp`; la raíz va en solo lectura con `/tmp`
  en tmpfs.
- **Comandos de operación** (T-41, `docs/arquitectura.md` §2.1), con el mismo
  usuario de la imagen (sin `-u`):
  ```
  podman exec <contenedor-app> /nodejs/bin/node dist/commands/unlock-user.js "Ana"
  podman exec <contenedor-app> /nodejs/bin/node dist/commands/create-initial-manager.js
  ```
  `create-initial-manager` necesita en el contenedor `PIN_PEPPER_FILE`,
  `INITIAL_MANAGER_NAME_FILE` e `INITIAL_MANAGER_PIN_FILE` (en `app` solo
  existe la primera): en DEMO/PROD se ejecuta como servicio efímero aparte con
  esos secretos (como `commands` en TESTING, §9.2, o un `.container` de
  Quadlet de una sola ejecución, Etapa 5), no con `exec` sobre `app`.
  Códigos de salida: `0` hecho/omitido, `2` `not_found`, `1` error.

**Contrato con el Developer (lo comprueba el propio build):**
1. Raíz del workspace: `package.json` (`"packageManager": "pnpm@12.21.0"`),
   `pnpm-workspace.yaml` (con `tests` en `packages` y `allowBuilds`, §6) y
   `pnpm-lock.yaml` al día (`--frozen-lockfile`).
2. `apps/api/package.json`: `"name": "@mi-app/api"`, script **`build`** que
   deja en `apps/api/dist/` **todo** lo que necesita en ejecución, con estos
   puntos de entrada (JavaScript ejecutable con `node`, sin `tsx` ni
   *loaders*):
   `dist/main.js`, `dist/migrate.js`, `dist/healthcheck.js`,
   `dist/commands/create-initial-manager.js`, `dist/commands/unlock-user.js`.
   Las migraciones, si se leen de disco, también dentro de `dist/`
   (ninguna ruta a `src/` ni fuera de `/app`).
3. Las dependencias de ejecución de `apps/api` en `dependencies` (lo de
   `devDependencies` no llega a la imagen: TypeScript, tsx, Vitest…).
4. `@mi-app/shared` en la imagen. Dos opciones válidas:
   (a) **recomendada**: el `build` de `apps/api` empaqueta su código y el de
   `@mi-app/shared` (esbuild/tsup, `--platform=node`, dependencias npm como
   *external*), y `@mi-app/shared` va en `devDependencies`; o
   (b) `@mi-app/shared` en `dependencies` y su `exports` resuelve a **JavaScript**
   compilado (p. ej. condición `"default": "./dist/pin.js"`, con su propio
   script `build`): Node no ejecuta `.ts` dentro de `node_modules`.
   Con (b) se probó el mecanismo con un workspace de prueba (§15).
5. `apps/web/package.json`: `"name": "@mi-app/web"`, script **`build`** (Vite)
   con salida en `apps/web/dist/` e `index.html` en su raíz.
6. La API sirve la SPA desde **`/app/public`**, calculado respecto al propio
   fichero (`new URL('../public/', import.meta.url)` desde `dist/main.js`, o
   una ruta equivalente), no desde `process.cwd()` ni `src/`.
7. `dist/healthcheck.js`: `GET http://127.0.0.1:${PORT:-3000}/healthz`, sale con
   `0` si es 2xx y `1` si no o si no responde en < 5 s; sin BD
   (`docs/logging.md` §8.1).
8. `main.ts` maneja `SIGTERM`/`SIGINT` (§6, "Señales").
9. Nada escribe fuera de `/tmp` en ejecución.
10. Si cambia una ruta de salida, se pasa por `--build-arg API_DIST=…`/
    `WEB_DIST=…` (pídelo a Infrastructure; no se edita el Containerfile en
    solitario).

**Escaneo (§3.3), resultado de la prueba del 2026-11-24** (Trivy 0.76.2 sobre la
imagen construida con el workspace de prueba; la parte del sistema base es la
misma que tendrá la real): 0 críticas; **2 altas en `libssl3t64`
3.5.9-1~deb13u1 de la base distroless** (CVE-2026-107494 y CVE-2026-124709,
denegación de servicio en QUIC), **sin versión corregida** en Debian
("affected"). Node no carga esa biblioteca (usa su OpenSSL 3.5.9 incluido;
comprobado en `/proc/self/maps`) y la app no usa QUIC. Sin decidir: aceptar
con justificación (fichero de excepciones del escáner con fecha de revisión)
o esperar a una base corregida. **Decide Cybersecurity** (hallazgo anotado
para el Orquestador). El escaneo de la imagen real se repite en cada build
con el mismo comando de §15.

## 9. TESTING (`compose.test.yaml`, T-12)

Borrador que cumple `docs/testing.md` §7.1; `podman-compose ... config` lo
valida con todos los perfiles. La imagen final de la app ya está definida
(§8.1; falta el código del Developer para construirla de verdad); las de los
ejecutores las fija Testing.

| Requisito §7.1 | Cómo se cumple |
|---|---|
| Mismas imágenes que DEMO | `APP_IMAGE` obligatoria (por digest); `db` y `proxy` con digest fijo |
| Ejecutores sin root ni capacidades | todos con `x-hardening` (UID 1000, `cap_drop: ALL`, `no-new-privileges`, `read_only`, `tmpfs /tmp`, `HOME=/tmp`, límites) |
| Red interna, sin host ni sockets | redes `backend` y `edge`, **ambas `internal`** (sin salida a internet); `runner-unit` con `network_mode: none` |
| `db` en tmpfs | `/var/lib/postgresql` en tmpfs de 512 MB (probado: inicializa y queda *healthy* con raíz de solo lectura); `fsync=off` |
| `proxy` con `tls internal` y CA confiada | la CA se genera en cada ejecución en el volumen `caddy-data`; los ejecutores lo montan en `ro` y usan `NODE_EXTRA_CA_CERTS`; `runner-e2e` la añade además al almacén del sistema **de su contenedor** para WebKit (T-34, §9.1) |
| BD de integración aislada por fichero (§9.2 de testing) | rol `test_admin` con `CREATEDB` y BD `app_template` migrada, **solo en TESTING** (T-28, §9.1) |
| E2E siembra y fabrica estado en BD | `runner-e2e` en la red `db-seed` (solo `db`) con `app_rw` y el *pepper* de la ejecución (T-29, §9.1) |
| Toxiproxy entre ejecutores y `proxy` | servicio `toxiproxy` (perfiles `e2e`, `perf`); Caddy sirve los nombres `proxy` y `toxiproxy` |
| Perfiles por suite | `unit`, `integration`, `e2e`, `perf`, `security` (+ `setup` para `migrate` y `migrate-template`, + `commands` para el servicio de comandos de T-41, §9.2) |
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
7. **SEC-018 en los ejecutores:** el repositorio ya se monta en `ro` (no
   pueden escribir `.git` ni `.claude`), y `x-runner` tapa `.secrets/` con un
   tmpfs vacío (`ro`, 0000, `notmpcopyup`), porque en una máquina de
   desarrollo `.secrets/dev/` está dentro del checkout. **Petición a Testing:**
   `tests/run.sh` debe hacer `mkdir -p -m 0700 .secrets` antes del `up`: si el
   directorio no existe (p. ej. en CI) el punto de montaje no se puede crear
   dentro de un montaje `ro` y el contenedor no arranca. Los secretos de la
   ejecución solo llegan por `/run/secrets` desde `TEST_SECRETS_DIR`.

### 9.1 Acceso a la BD de los ejecutores (T-28, T-29) y CA en WebKit (T-34) — 2026-11-24

**Qué recibe cada contenedor en TESTING** (además de lo de §5 para `db`, `migrate` y `app`):

| Contenedor | Redes | Rol de BD | Secretos (`/run/secrets`) | Variables |
|---|---|---|---|---|
| `db` | `backend`, `db-seed` | — (inicializa) | los 4 de §5 + `db_test_admin_password` | `MI_APP_ENTORNO=testing`, `APP_TEMPLATE_DB=app_template` |
| `migrate` | `backend` | `app_owner` | `db_owner_password` | `DATABASE_NAME=cafeteria` |
| `migrate-template` (nuevo, perfil `setup`) | `backend` | `app_owner` | `db_owner_password` | `DATABASE_NAME=app_template` (misma imagen y comando que `migrate`) |
| `runner-integration` | `backend` | `app_rw` + `test_admin` | `db_app_password`, `db_test_admin_password` (**ya no** `db_owner_password`) | `DATABASE_HOST/PORT/NAME`, `DATABASE_APP_USER=app_rw`, `DATABASE_APP_PASSWORD_FILE`, `DATABASE_ADMIN_USER=test_admin`, `DATABASE_ADMIN_PASSWORD_FILE`, `DATABASE_TEMPLATE=app_template` |
| `runner-e2e` (también la semilla de k6) | `edge`, `db-seed` | `app_rw` | `db_app_password`, `pin_pepper` | `DATABASE_HOST/PORT/NAME`, `DATABASE_APP_USER`, `DATABASE_APP_PASSWORD_FILE`, `PIN_PEPPER_FILE`, `TOXIPROXY_API`, `SSL_CERT_FILE` |
| `runner-perf` (k6), `runner-unit`, `runner-security`, `zap` | sin cambios | ninguno | ninguno | sin cambios |
| `app` | `backend`, `proxy-app` (IP fija `10.89.240.3`, SEC-028) | `app_rw` | `db_app_password`, `pin_pepper` | §6 (con `PUBLIC_ORIGIN=https://toxiproxy:8443`, `TRUSTED_PROXIES=10.89.240.2`) |
| `proxy` | `proxy-app` (IP fija `10.89.240.2`), `edge` | — | — | sin cambios; **ya no está en `backend`** (no llega a `db`) |

**Red `proxy-app` y `TRUSTED_PROXIES` (2.1b2).** `app` solo acepta
`X-Forwarded-For` de la IP de `proxy`. Para que esa IP sea conocida, `proxy`
y `app` comparten una red `internal` propia con subred fija
(`TEST_PROXY_APP_SUBNET`, por defecto `10.89.240.0/29`) y `proxy` tiene IP
fija (`TEST_PROXY_IP`, por defecto `10.89.240.2`); `TRUSTED_PROXIES` es esa
IP sola, no la subred. `app` también tiene IP fija en esa red
(`TEST_APP_IP`, por defecto `10.89.240.3`; SEC-028, ver abajo). El resto de contenedores llega a `app` por `backend`
(p. ej. `runner-integration` con `API_URL`) y no es de confianza. Dos
ejecuciones **en paralelo** necesitan valores distintos de esas tres
variables (`TEST_PROXY_APP_SUBNET`, `TEST_PROXY_IP`, `TEST_APP_IP`; las dos IP
distintas entre sí y dentro de la subred); si no, Podman rechaza la segunda red (falla, no se mezclan).
`tests/run.sh` ejecuta las suites en serie, así que hoy no hace falta.
Comprobado: `proxy` arranca con `10.89.240.2` en `proxy-app` (interna,
`10.89.240.0/29`) y otra IP en `edge`.

**SEC-028 (2.1h): IP fija también para `app`.** `proxy` depende de `app`, así
que `app` se crea antes; sin IP fija, Podman le daba la primera libre de la
subred (`.2`, la reservada para `proxy`) y `proxy` fallaba con
`IPAM error: requested ip address … is already allocated`. Ahora `app` tiene
`ipv4_address: ${TEST_APP_IP:-10.89.240.3}` en `proxy-app`; `TRUSTED_PROXIES`
sigue siendo solo la IP de `proxy`. La `/29` deja `.2`–`.6` utilizables; no
hay más contenedores en esa red.

Validado el 2026-11-24, rootless (Podman 5.7.0, `podman-compose` 1.5.0,
cgroups v2, con `DBUS_SESSION_BUS_ADDRESS` del propio usuario, §4.2), con
secretos aleatorios en `$XDG_RUNTIME_DIR` (borrados al final) y, como no hay
imagen de la app, un sustituto de `app` (la imagen `node` fijada por digest
con un servidor HTTP mínimo en `:3000` y *healthcheck*, mediante un override
fuera del repositorio; las redes, IP, variables y endurecimiento son los de
`compose.test.yaml`):
- `podman-compose -f compose.test.yaml --profile e2e config`: `app` con
  `proxy-app: ipv4_address 10.89.240.3`, `proxy` con `10.89.240.2`,
  `TRUSTED_PROXIES=10.89.240.2`; con `TEST_PROXY_IP=10.89.240.4
  TEST_APP_IP=10.89.240.5` se propagan los dos (y `TRUSTED_PROXIES`).
- Orden real (`up -d proxy`, que arranca `db` → `app` → `proxy`) y paso a
  paso `db`, `app`, `proxy` con `--no-deps`: los tres *healthy*, `app` en
  `10.89.240.3` y `proxy` en `10.89.240.2`, sin error de IPAM.
- Orden inverso (`proxy` primero y luego `app`, con `--no-deps`): los dos
  *healthy* con las mismas IP.
- Desde `proxy`, `wget http://app:3000` responde en los dos órdenes.
- `podman top`: ningún proceso con UID 0 en el host.
- Limpieza con `down -v` de cada proyecto de prueba: sin contenedores, redes
  ni volúmenes restantes; `mi-app-dev_db_1` sin tocar.

**`PUBLIC_ORIGIN` en TESTING** es un único origen: `https://toxiproxy:8443`
(el `BASE_URL` de los navegadores). Una petición que modifica estado enviada
a `DIRECT_URL` (`https://proxy:8443`) con `Origin: https://proxy:8443` se
rechazará (RS-24). Es lo correcto; Testing lo tiene en cuenta.

Variables con los nombres de `tests/README.md` §6.

**T-28: rol `test_admin` y plantilla `app_template`.**
- Los crea `deploy/db/testing/20-test-admin.sh`, que **solo** monta
  `compose.test.yaml`. `db` monta ahora dos **ficheros** sueltos en
  `/docker-entrypoint-initdb.d/` (el mismo `10-roles.sh` de todos los entornos
  y este) en lugar del directorio; con la raíz en solo lectura funciona
  (comprobado: el entrypoint ejecuta los dos en orden). DEV no cambia; DEMO
  y PROD montarán solo `10-roles.sh` (o el directorio `deploy/db/initdb/`,
  que no contiene el script de TESTING).
- Doble condición para que no se active por error: `MI_APP_ENTORNO=testing`
  (solo en `compose.test.yaml`) **y** el secreto `db_test_admin_password`. Si
  falta cualquiera, el script sale con error y `db` no llega a *healthy*.
- `test_admin`: `LOGIN NOSUPERUSER CREATEDB NOCREATEROLE NOREPLICATION
  NOBYPASSRLS CONNECTION LIMIT 4`; no es miembro de ningún rol ni recibe
  `CONNECT` en `cafeteria` ni en `app_template`; se conecta a la BD `postgres`.
  Puede crear BD (clonando la plantilla), y borrar **las suyas**. No puede
  leer tablas de la app (ni en las BD que crea: el esquema `public` y las
  tablas son de `app_owner`), crear roles, cambiar contraseñas ni darse otros
  roles (comprobado, §15).
- `app_template`: propiedad de `app_owner`, mismos permisos que `cafeteria`
  (`REVOKE ALL … FROM PUBLIC`, `CONNECT` y `USAGE` para `app_rw`) e
  `IS_TEMPLATE true` (así `test_admin` puede clonarla sin ser su propietario).
  La migra `migrate-template` con las mismas migraciones que `cafeteria`; no
  tiene usuarios ni ajustes, así que sirve para RS-09 (BD sin encargados).
- La BD clonada (`t_<x>`) es de `test_admin`, con el esquema y los `GRANT` de
  la plantilla: `app_rw` lee y escribe lo que la migración le concede y no
  puede hacer DDL (comprobado). Como toda BD nueva, tiene `CONNECT`/`TEMP`
  para `PUBLIC` (los permisos de BD no se copian de la plantilla); es efímera
  y solo existe en TESTING.
- **`DROP DATABASE … WITH (FORCE)` no puede cerrar conexiones de `app_rw`**
  (`permission denied to terminate process`; `test_admin` no tiene
  `pg_signal_backend`, a propósito). Con todas las conexiones cerradas antes
  (`tests/support/app.ts` cierra el pool y la app antes de borrar) funciona.
  Si un test deja una conexión abierta, el `DROP` falla: es una señal útil,
  no se le da más privilegio.
- `CREATE DATABASE … TEMPLATE` exige que nadie esté conectado a la plantilla:
  `migrate-template` termina antes de los tests y nada más se conecta a ella.
- Ya **no** se da `app_owner` (DDL) a `runner-integration` (mínimo privilegio;
  ningún test usa `DATABASE_USER`).
- Límite de conexiones de `app_rw` (20, igual en todos los entornos): lo
  comparten `app`, la app en proceso de cada test y los *pools* de los
  constructores (`max: 2`). Con los ficheros en serie alcanza; si Testing
  activa ficheros en paralelo y aparecen `too many connections for role`, se
  revisa (no se sube el límite sin hablarlo con Cybersecurity).

**T-29: `runner-e2e` llega a la BD.**
- Red nueva `db-seed` (`internal: true`) con **solo** `db` y `runner-e2e`: el
  ejecutor llega a `db:5432` pero no a `app:3000` (que sigue solo en
  `backend`), así no puede saltarse `proxy`/Toxiproxy hacia la app.
- Rol `app_rw` (el de la app), contraseña `db_app_password` de la ejecución y
  `pin_pepper` de la ejecución (el mismo que `app`, para que los PIN sembrados
  valgan). Ambos aleatorios por ejecución, en `TEST_SECRETS_DIR`, borrados al
  final; el *pepper* solo lo reciben `app` y este contenedor efímero.
- La semilla de k6 la hace `runner-e2e` (`--project=semilla-perf`, como ya
  hace `tests/run.sh`); `runner-perf` (k6) **no** recibe BD ni *pepper*.

**T-34: WebKit sin `ignoreHTTPSErrors` (propuesta implementada, pendiente de
probar con la imagen real de Playwright).**
- La CA se genera en cada ejecución, así que no se puede instalar al construir
  la imagen. Se instala **en el almacén del contenedor efímero** al arrancar:
  `runner-e2e` tiene un tmpfs en `/etc/ssl/certs` (con copia del contenido de
  la imagen, `rw,nosuid,nodev,noexec,size=8m,U`) y un `entrypoint` de `sh` que
  escribe `/etc/ssl/certs/ca-certificates.crt` = bundle de la imagen + CA de
  la ejecución y hace `exec` del comando (el de `tests/run.sh` llega como
  argumentos; no hay que cambiar `run.sh`). Sin root, sin capacidades, raíz
  en solo lectura (solo ese tmpfs es escribible), nada se escribe en el host
  ni en la imagen, se pierde al terminar. `SSL_CERT_FILE` apunta al mismo
  fichero.
- Si falta la CA o el bundle, avisa (`AVISO … T-34`) y sigue: Chromium no
  depende de esto (sigue con la fijación SPKI de `global-setup.ts`).
- Probado el mecanismo (no WebKit): en un contenedor con el mismo
  endurecimiento, el bundle queda con todos los certificados de la imagen más
  la CA y el resto de la raíz sigue en `EROFS` (§15). **No probado:** que el
  WebKit de Playwright (GnuTLS/glib-networking) lea ese fichero; no hay imagen
  de Playwright en la máquina. Testing lo comprueba con la primera ejecución
  e2e: si `tablet-h-webkit` sigue fallando por certificado, se deja fuera
  hasta que decida Cybersecurity (nunca `ignoreHTTPSErrors` sin su decisión).
- El tmpfs sobre `/etc/ssl/certs` es del contenedor, no un directorio del
  host: no entra en la prohibición de §3.4 de montar directorios del sistema.
  Lo revisa Cybersecurity. El *sandbox* de Chromium (§7.2) no cambia.

**Cambios que necesita `tests/run.sh` (Testing; Infrastructure no lo edita):**
1. Generar también `db_test_admin_password` en `TEST_SECRETS_DIR` (lista de
   `generar_secreto`). Sin ese fichero `db` no se crea (`statfs
   …/db_test_admin_password: no such file or directory`, comprobado): fallan
   **todas** las suites con BD hasta que `run.sh` lo genere.
2. En `integration`/`security`, después de `migrate`:
   `$PC --profile setup run --rm --no-deps migrate-template` (código de
   salida real, como `migrate`).
3. Nada más: el `entrypoint` de `runner-e2e` respeta el comando que pasa
   `ejecutar`, y las variables de §9.1 ya están en el compose.

### 9.2 Servicio efímero de comandos `commands` (T-41, tarea 2.1l)

Para que la suite `containers` compruebe los códigos de salida reales de los
envoltorios de la imagen (`docs/arquitectura.md` §2.1, §17.1):

| Campo | Valor |
|---|---|
| Servicio / perfil | `commands`, perfil **`commands`** (propio: ningún `up` de otra suite lo arranca; `run.sh` lo incluye en su `down -v` solo si añade `--profile commands` a `TODOS_PERFILES`) |
| Imagen | `${APP_IMAGE}`: la misma que `app` |
| Comando por defecto | `node dist/commands/create-initial-manager.js`; para `unlock-user` se pasa el comando completo |
| Endurecimiento | `x-hardening`: UID 1000, `cap_drop: ALL`, `no-new-privileges`, raíz `ro`, `/tmp` tmpfs `noexec`, límites 1 CPU / 256 MB / 100 pids, sin *healthcheck*, `restart: "no"` |
| Red | solo `backend` (llega a `db`; no está en `proxy-app` ni en `edge`) |
| Rol de BD | `app_rw` |
| Secretos | `db_app_password`, `pin_pepper`, `initial_manager_name`, `initial_manager_pin` (todos de `TEST_SECRETS_DIR`) |
| Variables | ancla `x-app-env` (incluidas `PUBLIC_ORIGIN`, `TRUSTED_PROXIES`, `METRICS_PORT`, `SESSION_MAX_HOURS`: `parseSettings` también corre en los comandos) + `DATABASE_USER`, `DATABASE_PASSWORD_FILE`, `PIN_PEPPER_FILE`, `INITIAL_MANAGER_NAME_FILE`, `INITIAL_MANAGER_PIN_FILE` |

Uso (con `db` *healthy* y `migrate` hecho; `run --rm --no-deps` devuelve el
código de salida del proceso, §4.3):

```
P="podman-compose -f compose.test.yaml -p <proyecto>"
$P --profile commands run --rm --no-deps commands                                              # create-initial-manager: 0 (created), 0 otra vez (skipped)
$P --profile commands run --rm --no-deps commands node dist/commands/unlock-user.js encargado  # 0 (unlocked)
$P --profile commands run --rm --no-deps commands node dist/commands/unlock-user.js no-existe  # 2 (not_found)
$P --profile commands run --rm --no-deps commands node dist/commands/unlock-user.js            # 1 (uso)
$P --profile commands run --rm --no-deps commands node dist/commands/create-initial-manager.js sobra  # 1 (argumento de más)
```

Lo que tiene que hacer **Testing** en `tests/run.sh` (Infrastructure no lo edita):
1. Generar en `TEST_SECRETS_DIR` `initial_manager_name` (p. ej. un nombre fijo
   de 1–30 caracteres) e `initial_manager_pin`: un **PIN de 6 dígitos que
   cumpla las reglas de encargado** (si no, `create-initial-manager` sale con
   `1` y no se puede probar el `0`). Sirve la función `random_pin`/`pin_ok` de
   `deploy/dev/generar-secretos.sh` (mismo filtro de §5) o la propia
   `validatePin` desde la imagen de tests. Ficheros `0600`, sin imprimirlos.
   Sin ellos solo falla `commands` (`statfs …/initial_manager_pin: no such
   file or directory`); el resto de suites no los necesita (comprobado).
2. Añadir `--profile commands` a `TODOS_PERFILES` (limpieza del `trap`).
3. En la suite `containers` (que ya levanta `db` y hace `migrate`), ejecutar
   los comandos de arriba con `set +e`, comparar cada código con el esperado y
   comprobar que la salida (stdout + stderr) **no contiene el PIN** del fichero
   (`grep -F -f` sobre el fichero del PIN, sin mostrarlo). Orden sugerido:
   `create` → `0`; `create` otra vez → `0` (`skipped`); `unlock` del encargado
   → `0`; `unlock` inexistente → `2`; `unlock` sin argumento → `1`.
4. `APP_IMAGE` por digest, como ya exige `run.sh`:
   `APP_IMAGE=localhost/mi-app@sha256:… sh tests/run.sh containers` (el valor lo
   imprime `sh deploy/app/construir.sh`, §8.1).

## 10. Logs y PostgreSQL (M-05, M-06, SEC-015, SEC-020)

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
- **SEC-020:** cada bloque `psql` de `10-roles.sh` hace además
  `SET pg_stat_statements.track_utility = off` (las sentencias de utilidad,
  como `CREATE ROLE … PASSWORD`, no se guardan en `pg_stat_statements`, que el
  rol `monitoring` puede leer con `pg_read_all_stats`), y al final del script
  se ejecuta `SELECT pg_stat_statements_reset()` en la BD de la app (vacía la
  memoria y el fichero que se conserva entre reinicios). Prueba real
  (2026-11-23, RS-44) sobre una BD **efímera** (proyecto `sec020probe`,
  volumen nuevo destruido al terminar; `mi-app-dev_pgdata` no se tocó), con el
  rol `monitoring` activado y contraseñas comparadas con `grep -F -f` sin
  imprimirlas:

  | | Script anterior | Script con SEC-020 |
  |---|---|---|
  | Contraseñas en `pg_stat_statements` tras inicializar | **4** (las 4 de `CREATE ROLE`) | 0 |
  | Sentencias `CREATE ROLE` guardadas | 4 | 0 |
  | Contraseñas en ficheros `pg_stat*` del volumen | 1 | 0 |
  | Contraseñas en los logs de `db` | 0 | 0 |
  | Lo mismo tras parar y arrancar `db` | — | 0 / 0 / 0 / 0 |

- **Volumen de DEV existente:** `mi-app-dev_pgdata` se inicializó con el
  script anterior y conserva **3** sentencias `CREATE ROLE` con contraseña en
  `pg_stat_statements` (solo las ve `postgres`; en DEV no hay rol
  `monitoring`). No se ha tocado. Para limpiarlo sin reinicializar la BD:
  `podman-compose -f compose.dev.yaml exec db psql -U postgres -d cafeteria -c 'SELECT pg_stat_statements_reset()'`
  (lo decide el Orquestador/humano). Alternativa: regenerar los secretos de DEV
  y recrear el volumen.
- Nota para Monitoring: con `log_connections=on`, el healthcheck por TCP
  (`pg_isready` cada 10 s) deja una línea `connection received` cada 10 s.
  Si molesta, se puede pasar el healthcheck al socket local en DEMO/PROD.

**Log driver por entorno (unificado con §11.1, M-06 opción B, decisión del
humano 2026-11-23; igual que `docs/logging.md` §5.2):**

| Entorno | Log driver de los contenedores | Tamaño | Lectura |
|---|---|---|---|
| DEV | `k8s-file` (fichero de Podman por defecto) | `max-size` 10 MB | `podman logs` |
| TESTING | `k8s-file` | 20 MB; los logs se guardan como artefacto | `podman logs` |
| DEMO | `k8s-file` con `path` en el directorio dedicado de logs (§11.1) | 100 MB | `podman logs`, Loki 7 días |
| PROD | `k8s-file` con `path` en el directorio dedicado de logs (§11.1): Quadlet `LogDriver=k8s-file`, `LogOpt=path=%h/mi-app/logs/<servicio>.log`, `LogOpt=max-size=100mb` | 100 MB | `podman logs`, Loki 30 días (90 `security`) |

En **ningún** entorno los contenedores escriben en journald (se retira el
`LogDriver=journald` que figuraba antes para PROD). journald del host solo
guarda los mensajes de las **unidades** systemd del usuario (arranque/parada
de los servicios Quadlet, temporizador de métricas, copias), que no contienen
datos de la aplicación. Configuración del host (cloud-init, Etapa 5; es
configuración del sistema, no de un contenedor):

- `/etc/systemd/journald.conf.d/mi-app.conf`: `Storage=persistent`,
  `SystemMaxUse=1G`, `MaxRetentionSec=30day` (retención de M-07; los logs de
  aplicación tienen su retención en Loki).
- `loginctl enable-linger <usuario-de-servicio>`.
- Lectura de los mensajes de las unidades, sin root:
  `journalctl --user -u app.service` (muestra arranques, paradas y fallos de
  la unidad, **no** las líneas de la app; esas, con `podman logs app` o Loki).
- El usuario de servicio **no** pertenece a `systemd-journal`, `adm` ni
  `wheel`.

## 11. Observabilidad en DEMO/PROD (M-06, M-08)

Solo diseño; **no se despliega nada** en esta etapa. Implementación en la
Etapa 5 (DEMO en la Etapa 4), con revisión de Cybersecurity del script, las
unidades y los Quadlet de Alloy y `node_exporter`.

### 11.1 M-06 opción B (decidida): logs y métricas sin excepción a §3.4

**Decisión del humano (2026-11-23): opción B.** No se monta
`/var/log/journal`, ni `/proc`, `/sys`, ni el almacenamiento de Podman
(`~/.local/share/containers`), ni el socket de Podman en ningún contenedor.
Se descartan la opción A (excepción a §3.4) y la C (Alloy fuera de
contenedor). Aplica las 7 condiciones de Cybersecurity (`docs/seguridad.md`
§6.3) y lo que fija Monitoring en `docs/logging.md` §5.2, §5.3, §5.5, §6.5 y §7.0.

**Directorios del usuario de servicio** (los crea el aprovisionamiento como
ese usuario, nunca como root):

| Ruta | Modo | Contenido | Quién lo monta |
|---|---|---|---|
| `~/mi-app/logs/` | 0750 | un fichero `k8s-file` por servicio (`<servicio>.log`) | Alloy, **solo** este directorio, `ro` (condición 6) |
| `~/mi-app/metrics/` | 0750, ficheros 0640 | `.prom` del temporizador y de las copias (`backup_last_success_timestamp_seconds`, §13) | `node_exporter`, **solo** este directorio, `ro` (condición 4) |
| `~/mi-app/state/` | 0700, ficheros 0600 | fichero de estado del temporizador (acumulado de OOM) | nadie (solo el script) |
| `~/.local/libexec/mi-app/metricas-host.sh` | 0750, del usuario de servicio | script versionado en `deploy/host/metricas-host.sh` | — |
| `~/.config/systemd/user/mi-app-metricas.{service,timer}` | 0640 | unidades versionadas en `deploy/host/` | — |

Ninguno es escribible por otro usuario (condición 1).

**Logs (condición 6, `docs/logging.md` §5.5).**
- Todos los Quadlet: `LogDriver=k8s-file`, `LogOpt=path=%h/mi-app/logs/<servicio>.log`,
  `LogOpt=max-size=100mb`. Rotación: Podman **trunca** el fichero al llegar a
  `max-size` (no hay ficheros numerados); Alloy detecta el truncado y sigue.
  Con ~10 MB/día de `app`, 100 MB dan 7–10 días de margen si Loki cae; las
  alertas `LogShippingFailing`/`LogIngestionStopped` avisan antes.
- Alloy en contenedor con todo §3.4 (UID 1000, `cap-drop=ALL`,
  `no-new-privileges`, `ReadOnly=true`, `/tmp` tmpfs, límites, red interna),
  monta `~/mi-app/logs` en `ro` y nada más del host; sus posiciones van a un
  volumen propio. `stage.cri` + `stage.json`, etiquetas `service`, `env`,
  `level`, `category`. La redacción de `docs/logging.md` §4 sigue aplicando
  (SEC-017).

**Temporizador de métricas del host (condiciones 1, 2, 3 y 5;
`docs/logging.md` §6.5).**
- Unidad **de usuario** (`systemctl --user`), nunca de sistema, root ni
  `sudo`. `mi-app-metricas.timer`: `OnBootSec=30s`, `OnUnitActiveSec=15s`,
  `AccuracySec=1s`. `mi-app-metricas.service`: `Type=oneshot`,
  `NoNewPrivileges=yes`, `UMask=0027`, `TimeoutStartSec=30`,
  `RestrictAddressFamilies=AF_UNIX` (sin red: no necesita IP; `AF_UNIX` lo usa
  `podman`), `Environment=TZ=UTC`.
- El script **solo lee**; lista cerrada de comandos: `podman stats --no-stream
  --format`, `podman ps --format`, `podman inspect --format` con
  `{{.State.Health.Status}}`, `{{.State.OOMKilled}}` y `{{.RestartCount}}`
  (nunca el `inspect` completo), `systemctl --user show <unidad> -p
  NRestarts,Result,ActiveState`, `df -P` sobre rutas fijas (`containers_storage`,
  `pgdata`, `logs`, `metrics`) y `TZ=Europe/Madrid date +%H%M` para el horario.
  Prohibidos `podman exec/run/rm/kill`, `podman healthcheck run`,
  `podman events`, `podman secret inspect --showsecret` y `sudo`.
  Pendientes de aprobación de Cybersecurity (los pide Monitoring):
  `date` (horario), `/proc/loadavg` + `/proc/meminfo` y `timedatectl show`;
  si no se aprueban, se quitan sus métricas.
- Salida: lista cerrada de métricas de `docs/logging.md` §6.5 con etiquetas
  `name`/`unit`/`mount`/`status` (nunca imagen, comando, variables ni
  montajes), incluidas **`business_hours_open`** (1 de 07:00 a 21:00
  `Europe/Madrid`) y **`business_minutes_since_open`** (minutos desde las
  07:00, 0 fuera de horario), que se calculan en el host porque Prometheus no
  conoce zonas horarias. Escritura atómica: fichero temporal en
  `~/mi-app/metrics/` + `mv` a `host.prom` (0640).
- **Fichero de estado** `~/mi-app/state/metricas.state` (0600): acumula
  `container_oom_kills_total` por contenedor (`Result=oom-kill` de la unidad y
  `OOMKilled`), porque con Quadlet el contenedor se recrea y Podman pone sus
  contadores a 0. Se escribe también de forma atómica; si se corrompe, el
  script lo reinicia a 0 (el contador de Prometheus lo trata como reinicio).
- Sus mensajes van al diario del usuario (30 días, §10) y no contienen
  secretos. Si deja de escribir, salta `HostMetricsStale` (§7.1 de logging).
- Nota técnica para Cybersecurity: con `NoNewPrivileges=yes`, `podman` no
  puede ejecutar `newuidmap`/`newgidmap` (setuid) para **crear** el espacio de
  usuarios rootless; solo se une al que ya existe (proceso de pausa creado por
  los servicios Quadlet). Si ese espacio no existe, el script falla de forma
  segura (no escribe métricas) y avisa `HostMetricsStale`. Se acepta: no se
  relaja `NoNewPrivileges`. Se comprueba en DEMO.

**`node_exporter` (condición 4).** Contenedor con todo §3.4, argumentos
`--collector.disable-defaults --collector.textfile
--collector.textfile.directory=/textfile`, monta **solo** `~/mi-app/metrics`
en `/textfile:ro` (sin `/proc`, `/sys` ni `/`), sin puertos publicados, solo
en la red interna de Prometheus.

**Redes del stack de monitorización.**
- `monitoring` (`Internal=true`): Prometheus, Loki, Alloy, Grafana,
  `node_exporter`, `postgres_exporter`, Alertmanager; `app` y `db` se unen solo
  para que Prometheus/exportadores los lean (`app:9464`, `db:5432` con el rol
  `monitoring`).
- `alert-egress` (no interna): **solo Alertmanager** (`docs/logging.md` §7.0).
  Es el único contenedor del stack con salida, y solo a **SMTP submission
  587 con TLS** (`smtp_require_tls: true`). Como las redes rootless no filtran
  por puerto, el filtro se aplica en el host: nftables (cloud-init) en la
  cadena `output`, para el UID del usuario de servicio
  (`meta skuid <usuario>`): permitido `tcp dport 587` hacia el servidor SMTP,
  DNS al resolvedor configurado y conexiones ya establecidas; el resto,
  denegado. La salida 443 del usuario de servicio solo se abre durante un
  despliegue (`podman pull` por digest) y, si PROD es VM con ACME, para
  Caddy (topología B). En la VM, el grupo de seguridad de Terraform aplica la
  misma salida. Cybersecurity lo valida; se prueba en DEMO (un `curl` a un
  puerto distinto de 587 desde Alertmanager debe fallar).
- **Configuración de Alertmanager:** el fichero final se **genera en el
  despliegue** a partir de la plantilla versionada
  `deploy/monitoring/alertmanager.yml.tmpl` (la crea Monitoring con
  Infrastructure en la Etapa 2/5), sustituyendo los marcadores `${SMTP_HOST}`,
  `${ALERT_FROM}`, `${SMTP_USER}`, `${ALERT_TO_*}` con valores que no se
  versionan ni se escriben en `docs/` (las direcciones son datos personales).
  El fichero generado queda fuera del repositorio, en el `$HOME` del usuario
  de servicio (0640), montado en `ro` en el contenedor. La contraseña SMTP es
  un `podman secret` (`alertmanager_smtp_password`,
  `type=mount,uid=1000,gid=1000,mode=0400`), leída con
  `smtp_auth_password_file`.

**Coste aceptado de B:** los logs de los contenedores no están en journald
(`journalctl --user` no los muestra; se leen con `podman logs` o en Loki) y,
si Loki está caído tanto tiempo que el fichero llega a `max-size`, se pierden
líneas (mitigado con 100 MB y alertas).

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

### 11.3 DEMO: duración y retención de Loki (T-22)

**Duración prevista de DEMO (Etapa 4):** desde el despliegue hasta que el
humano aprueba la puerta de la Etapa 4; **entre 3 y 5 días laborables**
(despliegue y smoke, 3–5 pruebas de usabilidad, ajustes, documentación en
`docs/especificacion/`). **No se garantiza** que dure 7 días + 2 h, y no se
alarga a propósito para esperar a la retención de 7 días.

**Retención de Loki desplegada en DEMO (opción b de T-22, la de menor carga):**
`limits_config.retention_period: 24h` (el mínimo de Loki, igual al periodo del
índice), sin `retention_stream`, sin `max_query_lookback` y con el mismo
`compactor` que PROD (`retention_enabled: true`, `retention_delete_delay: 2h`,
`compaction_interval` por defecto, 10 min). Es solo configuración: la imagen
de Loki es la misma (mismo digest) que en PROD. Prometheus en DEMO sigue con
7 días (no afecta a T-22).

Por qué esta opción: con 168 h, la opción (a) exige mantener DEMO más de 7
días con logs; con 24 h basta el tiempo que DEMO dura de todas formas, no hay
que fabricar logs antiguos (`reject_old_samples_max_age` no interviene) y la
comprobación (`TX-MON-01`) usa la misma evidencia que la opción (a) (métrica
del compactor + *chunks* borrados + consulta de control), así que la prueba es
la fuerte, no la de "consulta vacía".

Calendario mínimo dentro de DEMO:
- **T0:** despliegue de DEMO con la pila de monitorización y tráfico real
  desde el principio (smoke de Testing). Testing anota T0 y el recuento
  inicial de *chunks* del volumen de Loki.
- **No antes de T0 + 30 h:** `TX-MON-01`. 30 h = 24 h de retención + hasta
  2 h de edad máxima de un *chunk* (`max_chunk_age` por defecto: un *chunk*
  vence cuando vence su **última** línea) + 2 h de `retention_delete_delay` +
  ciclos de compactación y margen. Por eso la puerta de la Etapa 4 no se pide
  antes de T0 + 30 h; con la duración prevista (3–5 días) no añade espera.
- Recuento de *chunks*, sin root: `podman unshare find "$(podman volume inspect <volumen de loki> --format '{{.Mountpoint}}')/chunks" -type f | wc -l`
  (o el tamaño con `du -s`), antes y después de la ejecución del compactor.

Coste aceptado: en DEMO los logs solo se guardan 24 h. Las pruebas de
usabilidad se analizan con las métricas de UX (Prometheus, 7 días) y las
notas de las sesiones; si UX necesita líneas de log de una sesión, se exportan
desde Grafana/Loki **el mismo día** (sin datos personales, `docs/logging.md`
§4). PROD mantiene 30/90 días y allí solo se comprueba la configuración
desplegada en el smoke (`docs/testing.md` §5.10).

**Qué debe hacer Monitoring en `docs/logging.md` §6.6** (para cerrar T-22):
1. Tabla y viñeta de DEMO: Loki **24 h** (`retention_period: 24h`, sin
   `retention_stream`, mismo `compactor` que PROD, sin `max_query_lookback`);
   Prometheus 7 días sin cambios.
2. Sustituir "Testing comprueba en DEMO que el compactor borra (consulta de un
   intervalo ya vencido sin resultados)" por: comprobación `TX-MON-01`
   (`docs/testing.md` §5.10) con métrica de última ejecución correcta de la
   retención del compactor, *chunks* del intervalo vencido eliminados del
   volumen y consulta de control con datos, **no antes de T0 + 30 h**
   (este apartado).
3. Añadir que en PROD no se espera al vencimiento: solo se comprueba la
   configuración desplegada (720 h + `retention_stream` 2160 h para
   `category="security"`).

Testing ajusta `TX-MON-01` a 24 h ("intervalo vencido" = más de 24 h + 2 h
atrás, y "no antes de T0 + 30 h" en lugar de "DEMO más de 7 días + 2 h").

## 12. Red, TLS e IP de origen (SEC-002, SEC-003, ADR-007)

Cybersecurity ya decidió el fondo (`docs/seguridad.md` §6.2); aquí está cómo
se aplica en cada entorno.

| Entorno | Acceso | TLS | Puertos del host |
|---|---|---|---|
| DEV | solo `localhost` | ninguno (contexto seguro) | `127.0.0.1:5173`, `127.0.0.1:3000` |
| TESTING | solo red interna de la ejecución | `tls internal`, CA por ejecución | ninguno |
| DEMO | red del personal del local | `tls internal` (CA de DEMO, distinta de la de PROD) | 8080/8443 tal cual (ADR-007 opción a) |
| PROD | red del personal (o VM con WireGuard por dispositivo, §12.1 B1) | `tls internal` en el local, ACME si es VM con dominio | 80/443 (§12.3) |

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
- **B. VM en la nube.** 80/443 cerrados a internet; SSH igual que en A. Sin
  IP fija ni VPN, Cybersecurity no aprueba PROD en VM. Problema (SEC-019): el
  límite de fallos de login va **por IP** (`docs/seguridad.md` §6.1.5) y, si
  todos los dispositivos llegan a la VM con la misma IP, ese límite es de
  **todo el local**: 10 fallos sumados en 10 min (o un empleado que los
  provoque a propósito) dejan a todo el personal 10 min sin iniciar sesión ni
  autorizar, y HU-01/CA-F11 ("desde este dispositivo") no se cumple.
  Variantes, de preferida a menos preferida:
  - **B1 (la única que se propone para PROD en VM): WireGuard con un *peer*
    por dispositivo.** Cada tablet, móvil o PC de barra tiene su propia clave
    y su IP de túnel fija (p. ej. `10.66.0.0/24`, una `/32` por
    dispositivo, `AllowedIPs` de cada *peer* limitado a esa `/32`). La VM
    solo abre UDP del puerto de WireGuard a internet (grupo de seguridad de
    Terraform); 80/443 solo se aceptan desde la interfaz `wg0`. Caddy recibe
    la conexión con la IP de túnel del dispositivo (activación por socket,
    §12.5) y `app` la usa para el límite por IP: "dispositivo" = IP de túnel,
    como en la topología A. El servidor WireGuard es configuración del host
    (cloud-init, kernel), no un contenedor. Alta/baja de un dispositivo =
    añadir/quitar su *peer* (un dispositivo perdido se revoca quitando su
    clave). Requiere instalar el cliente WireGuard en cada dispositivo.
    Verificación (RS-06): dos dispositivos aparecen con IP distinta en los
    logs de `app`, y 10 fallos desde uno no bloquean al otro.
  - **B2: lista blanca de la IP pública fija del local** (o WireGuard de
    sitio a sitio desde el router, que también hace NAT). Todos los
    dispositivos comparten IP: el límite por IP pasa a ser de todo el local.
    **Solo se puede usar con la aprobación expresa del humano en la Etapa 5**,
    que acepta ese riesgo de bloqueo colectivo; queda registrado en
    `docs/estado.md` y sigue la alerta de `429` (`LoginIpRateLimited`,
    `docs/seguridad.md` §6.1.7). Sin esa aprobación, la topología B se
    despliega solo como B1.
  - Si PROD usa la topología A, SEC-019 no aplica.
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
  las copias cifradas (§13). Instalación en los dispositivos: §12.6.
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

### 12.6 Manual de instalación: CA interna en los dispositivos

Sin la CA instalada el navegador muestra un aviso de certificado y, aunque se
acepte, no hay contexto seguro fiable: fallan las cookies `Secure`, el Wake
Lock y el sonido de la cola (HU-03/CA-N05). Se hace una vez por dispositivo y
entorno: **la CA de DEMO y la de PROD son distintas** (§12).

1. **Exportar** la CA raíz en el servidor (§12.2) y anotar su huella:
   `openssl x509 -in ca-cafeteria.crt -noout -subject -fingerprint -sha256`.
   El fichero es público (solo el certificado); la clave privada no sale del
   volumen `/data` de Caddy.
2. **Llevarla al dispositivo** por cable USB, AirDrop o una carpeta compartida
   de la red del personal. No por correo ni mensajería, ni desde una URL de la
   propia app.
3. **Instalarla y confiar en ella** (en la pantalla que muestra la huella,
   comprobar que coincide con la del paso 1):
   - **Android 11 o superior (Chrome):** Ajustes → Seguridad y privacidad →
     Más ajustes de seguridad → Cifrado y credenciales → Instalar un
     certificado → **Certificado de CA** → "Instalar de todas formas" → elegir
     `ca-cafeteria.crt`. Exige que el dispositivo tenga bloqueo de pantalla.
     Los nombres de los menús cambian algo según el fabricante. Usar Chrome:
     Firefox para Android no usa las CA del sistema por defecto.
   - **iPad (Safari):** abrir el fichero → "Perfil descargado" → Ajustes →
     General → VPN y gestión de dispositivos → instalar el perfil. Después,
     **paso que suele olvidarse:** Ajustes → General → Información → Ajustes
     de confianza de certificados → activar la confianza total para la CA.
   - **PC de barra con Windows (Chrome/Edge):** doble clic en el `.crt` →
     Instalar certificado → **Usuario actual** → "Colocar todos los
     certificados en el siguiente almacén" → Entidades de certificación raíz
     de confianza. No hace falta administrador.
   - **PC de barra con Linux (Chromium/Chrome), sin root:**
     `certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "CA cafeteria" -i ca-cafeteria.crt`
     (paquete `libnss3-tools`) con el usuario que abre el navegador.
4. **Comprobar:** abrir `https://<nombre del servidor>` (DEMO:
   `https://<nombre>:8443`) sin ningún aviso y con el candado normal.
5. **Al pasar a PROD** se instala la CA de PROD y se **borra la de DEMO** de
   cada dispositivo (en los mismos menús: "Credenciales de usuario" en
   Android, eliminar el perfil en iPad, `certmgr.msc` en Windows,
   `certutil -D -n "CA cafeteria"` en Linux). Si se pierde el volumen `/data`
   de Caddy y no se restaura de la copia (§13), Caddy crea otra CA y hay que
   repetir este apartado en todos los dispositivos.

La CA solo se instala en dispositivos del local: un dispositivo que confía en
ella aceptaría cualquier nombre que firme esa CA; por eso su clave privada
está solo en `/data` y en las copias cifradas.

### 12.7 Manual de instalación: pantalla de barra en modo kiosco

Objetivo (HU-03/CA-N05): la cola (P-05) a pantalla completa, sin barra del
navegador, y la pantalla siempre encendida. La app ya pide el Wake Lock al
abrir la cola y avisa "La pantalla puede apagarse" si no lo consigue; el
sistema operativo se configura además para no apagar la pantalla, porque el
navegador suelta el Wake Lock si la pestaña deja de estar visible.

Requisitos previos: CA instalada (§12.6) y usuario del sistema **sin
privilegios de administrador** dedicado a la pantalla.

- **PC con Windows o Linux (Chrome/Chromium/Edge):** lanzar el navegador con
  `--kiosk` y un perfil propio:
  `chrome --kiosk --user-data-dir=<carpeta del perfil de barra> https://<nombre del servidor>/`
  (en Linux, `chromium --kiosk ...`; en Edge, `msedge --kiosk https://... --edge-kiosk-type=fullscreen`).
  Arranque automático: acceso directo con ese comando en `shell:startup`
  (Windows) o un `.desktop` en `~/.config/autostart/` (Linux). Energía:
  pantalla y suspensión en "Nunca". Para salir del kiosco: `Alt+F4`. No
  añadir opciones que desactiven protecciones del navegador
  (`--disable-web-security`, `--ignore-certificate-errors`, etc.).
- **Tablet Android:** Chrome a pantalla completa con "Añadir a pantalla de
  inicio" si la app publica un manifiesto con `display: fullscreen` o
  `standalone` (decisión del Developer/UX; si no lo hay, queda la barra de
  direcciones). Bloquear la tablet en esa app con **Fijar aplicación**
  (Ajustes → Seguridad → Fijar aplicación). Con el cargador siempre puesto:
  Opciones de desarrollador → **Pantalla activa** (no se apaga mientras
  carga), o Ajustes → Pantalla → Tiempo de espera al máximo.
- **iPad:** "Añadir a pantalla de inicio" desde Safari y **Acceso guiado**
  (Ajustes → Accesibilidad → Acceso guiado) para fijar la app; Ajustes →
  Pantalla y brillo → Bloqueo automático → Nunca.

Después de cada arranque o recarga: iniciar sesión con la cuenta de barra
(suele contar como gesto y activa el sonido) o tocar **"Activar sonido"** si
aparece (HU-03/CA-F14). La sesión caduca a las 12 h (HU-01/CA-N06): hay que
volver a entrar al empezar cada turno. Comprobación en el dispositivo real
(CA-N05): la cola abierta ≥ 30 min sin tocarla y la pantalla sigue encendida.

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

Validado en esta máquina el **2026-11-24 (tarea 2.1l, imagen final y T-41)**,
sin `sudo`, Podman 5.7.0 rootless, cgroups v2, `podman-compose` 1.5.0 (con
`DBUS_SESSION_BUS_ADDRESS` del propio usuario, §4.2). **Todavía no hay código
de la app** (`apps/` y `packages/` vacíos): `sh deploy/app/construir.sh` sobre
el repositorio se detiene con `ERROR: falta package.json`. Todo lo demás se
probó con un **workspace de prueba en el scratchpad** (fuera del repo):
`@mi-app/shared` (JS, sin empaquetar, opción (b) de §8.1), `@mi-app/api` con
`argon2` (nativo) y `typescript` como `devDependency`, `@mi-app/web` con un
`build` que escribe `dist/index.html`, `tests/package.json`, un `.secrets/`,
`docs/` y un `apps/api/.env` de señuelo, y el lockfile generado con pnpm
12.21.0. Con el `Containerfile` y el `containerignore` reales:
- `podman build --format docker --ignorefile deploy/app/containerignore -f
  deploy/app/Containerfile`: correcto. Las dos bases se descargaron por
  digest. Primero falló con `ERR_PNPM_IGNORED_BUILDS` usando
  `onlyBuiltDependencies`; con `allowBuilds: { argon2: true }` funciona (§6).
  `pnpm deploy --offline` falla (`ERR_PNPM_NO_OFFLINE_META`, la comprobación
  de políticas de pnpm necesita metadatos), así que `deploy` va con red.
- Contexto: en la etapa de construcción **no** están `.secrets/`, `docs/`,
  `deploy/`, `apps/api/.env` ni `node_modules/` del host. `/app/node_modules`
  tiene `argon2` y `@mi-app/shared`, y **no** `typescript`.
- Imagen: `User 1000:1000`, `WorkingDir /app`, `Entrypoint` vacío,
  `Cmd ["/nodejs/bin/node","dist/main.js"]`, `HEALTHCHECK` conservado
  (`/nodejs/bin/node dist/healthcheck.js`, 15 s/5 s/30 s/3), puertos 3000 y
  9464, 183 MB.
- `podman run` con `--user 1000:1000 --cap-drop ALL --security-opt
  no-new-privileges --read-only --tmpfs /tmp --memory --cpus`: llega a
  *healthy*; `argon2` (nativo) carga y calcula en la distroless (glibc);
  `@mi-app/shared` se resuelve desde `node_modules`; `podman top`: UID del
  host 100999 (subuid), nunca 0. **`SIGTERM` no detuvo** el servidor de
  prueba (sin manejador; Node como PID 1): de ahí el punto 8 del contrato (§8.1).
- `sh deploy/app/construir.sh <etiqueta>` (copiado al workspace de prueba):
  construye, conserva el `HEALTHCHECK` y la etiqueta `revision`, e imprime
  `APP_IMAGE=localhost/mi-app@sha256:…`.
- `compose.test.yaml`: `config` correcto en los 7 perfiles (`unit`,
  `integration`, `e2e`, `perf`, `security`, `setup`, `commands`). Con la
  imagen de prueba por digest y secretos aleatorios en `$XDG_RUNTIME_DIR`
  (borrados al final), `--profile commands run --rm --no-deps commands …`
  devuelve el código del proceso: `create` → 0; `create sobra` → 1;
  `unlock-user.js Ana` → 0; `… Nadie` → 2; sin argumento → 1; con
  `/nodejs/bin/node` en vez de `node` → 0. Dentro: UID/GID 1000, `CapEff` 0,
  `NoNewPrivs` 1, `/app` y `/` en `EROFS`, `/run/secrets` con solo sus 4
  secretos (modo 0600), `cwd` `/app`, `execPath` `/nodejs/bin/node`.
- Sin los ficheros `initial_manager_*`: `--profile setup run migrate` funciona;
  solo `commands` falla (`statfs … no such file or directory`).
- Trivy 0.76.2 en contenedor rootless (UID 1000, `cap-drop ALL`, raíz `ro`)
  sobre `podman save` de la imagen de prueba: 0 críticas, 2 altas en la base
  (`libssl3t64`, sin corrección; §8.1, decide Cybersecurity); `node-pkg`
  limpios.
- Limpieza: borradas las imágenes de prueba, sus capas intermedias, la de
  Trivy y la red del proyecto de prueba; quedan las dos bases fijadas
  (`node:26.13.1-trixie-slim`, `distroless/nodejs26-debian13`) para el build
  real. `mi-app-dev_db_1` sin tocar.
- **No validado:** el build con el código real del Developer (salidas de
  `build`, empaquetado de `@mi-app/shared`, migraciones en `dist/`, Vite
  real), `create-initial-manager`/`unlock-user` reales contra la BD, RS-38
  con la imagen real, y el escaneo de la imagen real.

Validado en esta máquina el **2026-11-24 (tarea 2.1b, T-28 / T-29 / T-34 /
T-35)**, sin `sudo`, Podman 5.7.0 rootless, cgroups v2, `podman-compose` 1.5.0
(con `DBUS_SESSION_BUS_ADDRESS` del propio usuario, §4.2). Sin imagen de la app
ni de Playwright: no se ejecutó ningún test ni nada de `node_modules/`,
`apps/` o `packages/`.
- `podman-compose -f compose.test.yaml` con los 6 perfiles `config`: correcto
  (imágenes con una referencia ficticia por digest).
- BD de TESTING real (proyecto `mi-app-test-t28probe`, secretos aleatorios en
  `$XDG_RUNTIME_DIR`, borrados al terminar): `db` *healthy* con la raíz en
  solo lectura y los dos ficheros de init montados sueltos; el entrypoint
  ejecuta `10-roles.sh` y luego `20-test-admin.sh`. `podman top`: procesos con
  el UID del usuario (nunca 0). Redes `backend` y `db-seed`, las dos `internal`.
- Roles (`pg_roles`): `app_owner`/`app_rw`/`app_backup` sin cambios;
  `test_admin` con solo `CREATEDB`, 4 conexiones, sin pertenencia a otros
  roles. `app_template`: de `app_owner`, `IS_TEMPLATE`, ACL igual que
  `cafeteria` (sin `app_backup`).
- Con contenedores cliente endurecidos (UID 1000, `cap-drop=ALL`,
  `no-new-privileges`, raíz `ro`, límites):
  - una "migración" simulada como `app_owner` en `app_template` (tabla +
    `GRANT` a `app_rw`); `test_admin` hace `CREATE DATABASE t_prueba1
    TEMPLATE app_template` (propietario `test_admin`); `app_rw` inserta y lee
    en la clonada y **no** puede crear tablas; `DROP … WITH (FORCE)` sin
    conexiones abiertas: correcto;
  - `test_admin`: sin `CONNECT` en `cafeteria` ni en `app_template`, no ve
    las tablas de la clonada, no puede `CREATE ROLE`, `ALTER ROLE app_rw
    PASSWORD` ni `GRANT app_owner TO test_admin`; `app_rw` no puede `CREATE
    DATABASE`;
  - con una conexión de `app_rw` abierta, `DROP … WITH (FORCE)` falla
    (`permission denied to terminate process`), y funciona al cerrarla;
  - `app_rw` desde la red `db-seed` (la de `runner-e2e`) conecta a `db`.
- SEC-015/SEC-020 con el script nuevo: las 5 contraseñas de la ejecución
  aparecen **0** veces en los logs de `db` y en `pg_stat_statements`; 0
  sentencias `CREATE ROLE` guardadas.
- Sin `db_test_admin_password` en `TEST_SECRETS_DIR`, `db` no se crea
  (`statfs … no such file or directory`).
- T-34, mecanismo: con la imagen `node:26.13.1-alpine` y el mismo
  endurecimiento y tmpfs de `runner-e2e` (`/etc/ssl/certs`, copia del
  contenido, `U`), el script del `entrypoint` deja el bundle con los 118
  certificados de la imagen + la CA (119), el fichero es del UID 1000 y
  `/etc/ssl` y `/usr` siguen en `Read-only file system`.
- T-35: `podman-compose -f compose.dev.yaml --profile setup config`:
  `./tests/node_modules` en `rw` **solo** en `deps`. Contenedor `deps` real
  (UID 1000): `touch /workspace/tests/node_modules/x` correcto,
  `touch /workspace/tests/run.sh` y `tests/nuevo` → `Read-only file system`,
  `.secrets` → `Permission denied`. `comprobar_enlaces` nueva (copiada de
  `levantar.sh`, árbol de prueba en el scratchpad): pasa con enlaces tipo
  pnpm en `tests/node_modules` (`@mi-app/api -> ../../../apps/api`,
  `pg -> ../../node_modules/.pnpm/pg`) y con un enlace de `node_modules/` a
  `tests/node_modules/`; se detiene con `tests/node_modules/malo -> ../run.sh`,
  con un destino absoluto fuera y con un bucle; si falta `tests/node_modules`
  también se detiene (por eso `levantar.sh` lo crea antes).
- **No validado:** migraciones reales en `app_template` y la suite de
  integración (no hay imagen de la app); `runner-e2e` real (no hay imagen de
  Playwright): ni el `entrypoint` con `pwuser`/UID 1000 en Ubuntu ni que
  WebKit use el bundle; `tests/run.sh` con los cambios que se piden a Testing
  (§9.1).

Validado en esta máquina el **2026-11-24 (tarea 1.7n, SEC-026 / SEC-027)**,
sin `sudo`, sin construir imágenes ni arrancar contenedores:
- Función `comprobar_enlaces` de `deploy/dev/levantar.sh` con `/bin/sh` y GNU
  find sobre un árbol de prueba en el scratchpad (fuera del repo):
  - se detiene con `apps/x -> ../tests/run.sh`, con un **enlace llamado**
    `packages/p/node_modules -> ../../tests` (que `-path '*/node_modules'
    -prune` no habría mostrado), con `node_modules/evil -> /etc/passwd`, con
    `packages/p/node_modules/t -> ../../../tests`, con un destino absoluto
    con `..` que sale del árbol, con un destino que contiene un salto de línea
    y con un bucle de enlaces (`realpath` falla);
  - pasa con enlaces tipo pnpm (`apps/web/node_modules/a ->
    ../../../node_modules/.pnpm/a`, `node_modules/p -> ../packages/p`) y con
    la lista vacía; 5 000 enlaces legítimos en 0,4 s;
  - falso positivo conocido e inocuo: un enlace a la propia carpeta `apps`
    (sin barra final) se rechaza.
- `sh deploy/dev/levantar.sh` real con `apps/x -> ../tests/run.sh` plantado:
  secretos conservados, error SEC-026 y salida 1 **antes** de construir o
  arrancar nada. Con `node_modules/evil -> /etc/hostname` y `--sin-deps`:
  igual, mostrando `enlace -> destino`. Después se borraron los enlaces y
  `apps/`, `packages/`, `node_modules/` (vacíos); `git status` solo muestra
  el cambio del script; `podman ps -a` solo `mi-app-dev_db_1` (detenido).
- §3 (tabla de volúmenes) contrastada con `podman-compose -f compose.dev.yaml
  --profile setup config`: `./:/workspace:ro` en los 5 servicios y
  `./apps`, `./packages`, `./node_modules` en `rw` solo en `web` y `deps`.
- No probado: plantar el enlace **desde** `deps` con el contenedor real y
  `pnpm install` real (no hay código de la app); queda para RS-45 en la
  Etapa 2, igual que `tests/run.sh` (aún no existe).

Validado en esta máquina el **2026-11-24 (tarea 1.7c, SEC-023 / RS-45
ampliado)**, sin `sudo` y sin coste, con `podman-compose` 1.5.0 y Podman 5.7.0
rootless (`rootless: true`, cgroups `v2`):
- `podman-compose -f compose.dev.yaml config` (sin perfil y con
  `--profile setup`): correcto. Volúmenes resultantes de `web` y `deps`:
  `./:/workspace:ro` + `./apps`, `./packages`, `./node_modules` en `rw`
  (`deps` además `pnpm-store`); `api` solo `./:/workspace:ro`.
- `podman-compose -f compose.dev.yaml --profile setup run --rm --no-deps
  --entrypoint sh <web|deps> ...`, proceso con UID 1000, con los
  directorios de la lista creados antes con `mkdir -p` (como `levantar.sh`):
  - `touch /workspace/tests/run.sh` (fichero inexistente) → `Read-only file
    system` en `web` y en `deps`. Con un `tests/run.sh` temporal existente en
    el host, `echo ... >> /workspace/tests/run.sh` → `Read-only file system`
    en los dos y el fichero del host quedó intacto (luego se borró).
  - `touch` en `CLAUDE.md`, `.envrc` (fichero nuevo de la raíz),
    `deploy/dev/levantar.sh`, `.git/hooks/pre-commit`, `compose.dev.yaml` y
    `tests/results/x` → `Read-only file system` en los dos.
  - `touch /workspace/apps/x`, `/workspace/packages/x` y
    `/workspace/node_modules/x` → correcto en los dos (borrados después).
  - `/workspace/.secrets` → `Permission denied` (sigue tapado).
  - `/proc/mounts`: `/workspace ro`, `/workspace/.secrets ro`,
    `/workspace/{apps,packages,node_modules} rw`.
- Incidencia del entorno, no del compose: la primera ejecución falló con
  `runc create failed ... rootless needs no limits` porque la terminal
  heredaba `DBUS_SESSION_BUS_ADDRESS` del bus de otro usuario (§4.2). Con
  `DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus` funcionó sin tocar
  límites ni usar root. Al borrar cada contenedor Podman registró
  `rootless netns: kill network process: permission denied` (mismo origen,
  sin contenedores huérfanos: `podman ps -a` solo muestra `mi-app-dev_db_1`).
- Después de la prueba se borraron `apps/`, `packages/` y `node_modules/`
  (vacíos; los vuelve a crear `levantar.sh`).
- No probado aún: `pnpm install` real y Vite real escribiendo solo dentro de
  la lista (no hay código de la app); si Vite o pnpm necesitan escribir en
  otra ruta, fallará con `Read-only file system` y se decide entonces (§7.1).

Validado en esta máquina el **2026-11-23 (tarea 1.5b)**, sin `sudo` y sin coste:
- **SEC-018**, con los compose reales y `podman-compose ... run --rm --no-deps`
  sobre `api`, `web`, `deps`, `migrate`, `init-manager` (DEV) y `runner-unit`
  (TESTING, con la imagen de herramientas en lugar de la de Testing): en todos,
  listar, leer o crear en `/workspace/.secrets` → denegado; escribir en
  `.git/`, `.git/hooks/`, `.claude/`, `.claude/hooks/`, `deploy/`, `docs/`,
  `tools/` y abrir en escritura `.claude/settings.json`, `.git/config`,
  `CLAUDE.md`, `.gitignore`, `compose.dev.yaml` → denegado; `web` y `deps`
  siguen escribiendo en el resto del árbol; cada servicio ve en
  `/run/secrets` solo los suyos (§5). Control: el mismo contenedor sin estos
  montajes lee los secretos y escribe en `.git/hooks`. Montaje comprobado en
  `/proc/mounts`: `tmpfs /workspace/.secrets ro,…,size=4k,mode=000`. Sin
  `notmpcopyup`, Podman intentó copiar los secretos al tmpfs.
- **SEC-020** (§10): RS-44 sobre BD efímera, antes 4 contraseñas en
  `pg_stat_statements`, después 0 (también tras reiniciar `db`) y 0 en logs.
- `podman-compose config` de `compose.dev.yaml` (perfil `setup`) y de
  `compose.test.yaml` (todos los perfiles): correctos.

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
- M-06 B (§11.1): temporizador, `node_exporter`, Alloy, red `alert-egress`
  con nftables por `skuid`, `RestrictAddressFamilies` en unidad de usuario y
  `NoNewPrivileges` con `podman` rootless: solo diseño, se prueba en DEMO.
- SEC-019 (WireGuard por dispositivo): solo diseño.
- Manual de dispositivos (§12.6 CA, §12.7 kiosco): redactado, no probado en
  tablets ni en la pantalla de barra reales; se recorre en la Etapa 4 con los
  dispositivos del local y se corrigen los nombres de menú que cambien.
- Retención de Loki de 24 h en DEMO (§11.3): solo diseño hasta la Etapa 4.
- SEC-018 con el código real (Vite escribiendo su caché, `pnpm install`
  real) y con las imágenes reales de Playwright/k6/ZAP.
- Escaneo de vulnerabilidades de imágenes.

Estado al terminar (2026-11-23): la pila DEV de esta máquina está
**detenida**. Queda el volumen `mi-app-dev_pgdata` ya inicializado con los
secretos actuales de `.secrets/dev/` (si se regeneran con `--force`, destruir
con `down -v`); conserva 3 sentencias con contraseña en `pg_stat_statements`
(ver §10 para limpiarlo). Queda también `mi-app-dev_pnpm-store`, vacío (lo
crearon las pruebas de `deps`; es el volumen de caché previsto).
