#!/bin/sh
# Punto de entrada único de las pruebas (docs/testing.md §7.3). Se ejecuta EN EL
# HOST con el usuario sin privilegios; todo pnpm/node/npx corre en contenedores
# efímeros de compose.test.yaml (docs/infraestructura.md §7.1 y §9).
#
# Uso:  sh tests/run.sh <suite> [filtro...]
#   El filtro (solo unit | integration | security | e2e | a11y | visual) se pasa tal
#   cual a Vitest/Playwright: p. ej. `sh tests/run.sh integration integration/api/HU-01-login`
#   o `sh tests/run.sh e2e HU-01-csp` o `sh tests/run.sh visual -g "P-01"`. Sin filtro se ejecuta toda la suite.
#   unit | integration | security | e2e | a11y | visual | perf | containers |
#   trazabilidad | all
#
# Variables (imágenes SIEMPRE por digest, repo@sha256:...):
#   APP_IMAGE         imagen de la app (deploy/app/Containerfile) — obligatoria
#                     para integration, security, e2e, a11y, visual, perf, containers.
#                     Se obtiene con `sh deploy/app/construir.sh`, que imprime
#                     APP_IMAGE=localhost/mi-app@sha256:<digest>; después
#                     `APP_IMAGE=… sh tests/run.sh <suite>`
#   TESTS_NODE_IMAGE  ejecutor Vitest; por defecto, la imagen de herramientas de
#                     DEV (localhost/mi-app-dev-tools) resuelta a su digest
#   PLAYWRIGHT_IMAGE  mcr.microsoft.com/playwright@sha256:... (misma versión que el lockfile).
#                     Por defecto, el digest verificado v1.65.1-noble (D-2.2-02).
#   TOXIPROXY_IMAGE   ghcr.io/shopify/toxiproxy@sha256:... (por defecto, 2.12.0 verificado)
#   K6_IMAGE          docker.io/grafana/k6@sha256:... (por defecto, la resuelta el 2026-11-25)
#   ZAP_IMAGE         sin valor por defecto: se pasa por digest cuando se usa (Etapa 3)
#   E2E_WORKERS       workers de Playwright en paralelo (por defecto 3; D-2.2-03)
#   APP_TZ            zona de app (por defecto UTC; segunda ejecución con America/New_York)
#   RONDAS            rondas de k6 (por defecto 3 en Etapa 2; 20 en Etapa 3)
#   GATE              1 = ejecución de PUERTA (SEC-052 punto 3, docs/seguridad.md §6.12):
#                     si APP_IMAGE no tiene un registro de escaneo aprobado vigente
#                     (tests/containers/tx-cont-03.sh: máximo 7 días, commit y
#                     etiqueta, árbol limpio, excepciones, digests de db y proxy), la
#                     ejecución se ABORTA con código 1 antes de levantar nada. Sin
#                     GATE (trabajo diario) el mismo informe sale como AVISO y la
#                     ejecución sigue. Obligatorio antes de DEMO. Cualquier otro
#                     valor distinto de vacío, 0 o 1 es un error.
#
# Requisitos de docs/infraestructura.md §7.1 que cumple este script:
#   1. `mkdir -p -m 0700 .secrets` antes de cualquier up/run.
#   2. No ejecuta, `source`a ni lee como configuración nada de tests/results,
#      tests/screenshots ni de la lista de permitidos de DEV (apps/, packages/,
#      node_modules/): solo crea carpetas y lista ficheros (find) para el resumen.
#   3. Vive en tests/, que ningún contenedor monta en escritura.
#   4. Orden de arranque de §9 (db → healthy → migrate → app/proxy → ejecutor),
#      secretos aleatorios por ejecución en $XDG_RUNTIME_DIR, borrados al
#      terminar; siempre podman-compose (nunca docker, podman compose ni sudo).
#   5. (SEC-026) comprobar_enlaces al empezar, antes de cualquier up/run, y otra
#      vez tras cada contenedor que escribe en el árbol, antes de leer resultados.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
cd "$ROOT"

SUITE=${1:-}
[ "$#" -gt 0 ] && shift
case "$SUITE" in
  unit|integration|security|e2e|a11y|visual|perf|containers|trazabilidad|all) ;;
  *) echo "uso: sh tests/run.sh {unit|integration|security|e2e|a11y|visual|perf|containers|trazabilidad|all}" >&2; exit 2 ;;
esac

# --- Comprobación de enlaces simbólicos (SEC-026) ---------------------------
# Copia de comprobar_enlaces de deploy/dev/levantar.sh (probada, §15), ampliada a:
#  - tests/node_modules (si tests/ es paquete del workspace, lo escribe `deps`);
#  - tests/results y tests/screenshots (escribibles en TESTING): sin enlaces.
# No sigue ningún enlace: solo find (sin -L) y realpath -m para mostrar destinos.
comprobar_enlaces() {
  R=$(pwd -P)
  lista=""
  for d in apps packages node_modules tests/node_modules; do
    [ -e "$d" ] && lista="$lista $d"
  done
  fuente=""
  for d in apps packages; do
    [ -e "$d" ] && fuente="$fuente $d"
  done
  if [ -n "$fuente" ]; then
    # shellcheck disable=SC2086
    sospechosos=$(find $fuente \( -name node_modules -type d \) -prune -o -type l -print)
    if [ -n "$sospechosos" ]; then
      echo "ERROR (SEC-026): enlaces simbólicos en apps/ o packages/ (fuera de node_modules/):" >&2
      printf '%s\n' "$sospechosos" >&2
      echo "Revísalos sin abrirlos ni editarlos (ls -l) y bórralos antes de seguir." >&2
      exit 1
    fi
  fi
  if [ -n "$lista" ]; then
    # shellcheck disable=SC2086
    if ! destinos=$(find $lista -type l -exec realpath -m -- {} +); then
      echo "ERROR (SEC-026): no se pudo resolver algún enlace simbólico de la lista de permitidos" >&2
      exit 1
    fi
    if [ -n "$destinos" ]; then
      fuera=$(printf '%s\n' "$destinos" | while IFS= read -r d; do
        case $d in
          "$R"/apps/*|"$R"/packages/*|"$R"/node_modules/*|"$R"/tests/node_modules/*) ;;
          *) printf '%s\n' "$d" ;;
        esac
      done)
      if [ -n "$fuera" ]; then
        echo "ERROR (SEC-026): enlaces simbólicos que apuntan fuera de apps/, packages/ y node_modules/:" >&2
        # shellcheck disable=SC2086
        find $lista -type l -exec sh -c '
          R=$1; shift
          NL="
"
          for l; do
            d=$(realpath -m -- "$l")
            case $d in
              *"$NL"*) printf "  %s -> (destino con salto de línea)\n" "$l" ;;
              "$R"/apps/*|"$R"/packages/*|"$R"/node_modules/*|"$R"/tests/node_modules/*) ;;
              *) printf "  %s -> %s\n" "$l" "$d" ;;
            esac
          done' sh "$R" {} + >&2
        echo "Revísalos sin abrirlos ni editarlos (ls -l) y bórralos antes de seguir." >&2
        exit 1
      fi
    fi
  fi
  salida=$(find tests/results tests/screenshots -type l -print)
  if [ -n "$salida" ]; then
    echo "ERROR (SEC-026): enlaces simbólicos en tests/results o tests/screenshots (no se admite ninguno):" >&2
    printf '%s\n' "$salida" >&2
    exit 1
  fi
}

# --- 1. Política: nunca root, motor rootless --------------------------------
if [ "$(id -u)" -eq 0 ]; then
  echo "ERROR: no ejecutar como root" >&2; exit 1
fi
# docs/infraestructura.md §4.2: un DBUS_SESSION_BUS_ADDRESS heredado de otro
# usuario hace que Podman no pueda aplicar los límites de memoria/CPU. Se usa
# el bus del propio usuario (sin root y sin quitar los límites).
if [ -n "${XDG_RUNTIME_DIR:-}" ] && [ -S "$XDG_RUNTIME_DIR/bus" ]; then
  case "${DBUS_SESSION_BUS_ADDRESS:-}" in
    "unix:path=$XDG_RUNTIME_DIR/bus"*) ;;
    *) export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus" ;;
  esac
fi
if [ "$(podman info --format '{{.Host.Security.Rootless}}' 2>/dev/null)" != "true" ]; then
  echo "ERROR: podman no está en modo rootless" >&2; exit 1
fi
if [ "$(podman info --format '{{.Host.CgroupsVersion}}' 2>/dev/null)" != "v2" ]; then
  echo "ERROR: se necesita cgroups v2 para los límites de memoria/CPU" >&2; exit 1
fi

# Requisito 1: punto de montaje del tmpfs que tapa .secrets/ (SEC-018).
mkdir -p -m 0700 .secrets
# Carpetas de salida (únicas rutas en escritura desde los contenedores).
mkdir -p tests/results tests/screenshots/HU-01
# Requisito 5: antes de cualquier up/run.
comprobar_enlaces

# --- Registro de escaneo aprobado (SEC-052 punto 3) --------------------------
case "${GATE:-}" in
  ""|0|1) ;;
  *) echo "ERROR: GATE debe ser vacío, 0 o 1 (vale '$GATE')" >&2; exit 2 ;;
esac
# Estado que se anota en resumen.txt: no-aplica | PASA | AVISO (sin GATE) | FALLA (con GATE, aborta).
REGISTRO_ESTADO=${REGISTRO_ESTADO:-no-aplica}
verificar_registro() {
  # $1: fichero donde guardar el informe (opcional). Solo lee (tx-cont-03.sh);
  # no escribe ni borra nada del registro. Imprime el informe.
  if [ -n "${REGISTRO_VERIFICADO:-}" ]; then
    return 0
  fi
  # El código de salida se toma del script, no de tee.
  set +e
  salida_reg=$(sh tests/containers/tx-cont-03.sh "$APP_IMAGE" 2>&1)
  rc_reg=$?
  set -e
  printf '%s\n' "$salida_reg"
  [ -z "${1:-}" ] || printf '%s\n' "$salida_reg" > "$1"
  if [ "$rc_reg" -eq 0 ]; then
    REGISTRO_ESTADO=PASA
    return 0
  fi
  if [ "${GATE:-0}" = "1" ]; then
    REGISTRO_ESTADO=FALLA
    echo "ERROR (GATE=1, SEC-052): APP_IMAGE no tiene un registro de escaneo aprobado vigente." >&2
    echo "  Construya con 'sh deploy/app/construir.sh' (sin argumento, desde el commit final y con el árbol limpio)" >&2
    echo "  y use el APP_IMAGE que imprime. No se ejecuta ninguna suite." >&2
    return 1
  fi
  REGISTRO_ESTADO=AVISO
  echo "AVISO (SEC-052): APP_IMAGE NO tiene un registro de escaneo aprobado vigente (ver arriba)." >&2
  echo "  Vale para el trabajo diario; NO vale para la puerta: allí se ejecuta con GATE=1." >&2
  return 0
}

# --- all: una pila nueva por suite, en el orden de docs/testing.md §7.4 ------
if [ "$SUITE" = "all" ]; then
  rc=0
  # El registro se comprueba una sola vez para todas las suites (si falta APP_IMAGE,
  # 'containers' lo avisa como siempre).
  if [ -n "${APP_IMAGE:-}" ]; then
    verificar_registro || exit 1
    export REGISTRO_VERIFICADO=1 REGISTRO_ESTADO
  fi
  sh "$0" containers || { echo "containers falla: se detiene (la pila incumple la política)" >&2; exit 1; }
  for s in trazabilidad unit integration security e2e a11y visual perf; do
    sh "$0" "$s" || rc=1
  done
  exit $rc
fi

# --- Proyecto, resultados y secretos de esta ejecución ----------------------
ALEATORIO=$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
PROYECTO="mi-app-test-$(date +%Y%m%d-%H%M%S)-$ALEATORIO"
RESULTADOS="tests/results/$PROYECTO"
mkdir -p "$RESULTADOS"
RESULTS_DIR_CTR="/workspace/$RESULTADOS"

: "${XDG_RUNTIME_DIR:?Falta XDG_RUNTIME_DIR (tmpfs del usuario para los secretos de la ejecución)}"
TEST_SECRETS_DIR=$(mktemp -d -p "$XDG_RUNTIME_DIR" mi-app-test.XXXXXXXX)
chmod 0700 "$TEST_SECRETS_DIR"
export TEST_SECRETS_DIR
generar_secreto() {
  umask 077
  head -c 48 /dev/urandom | base64 | tr -d '/+=\n' | head -c 48 > "$TEST_SECRETS_DIR/$1"
}
# db_test_admin_password: rol test_admin, solo TESTING (T-28, docs/infraestructura.md
# §9.1). Sin ese fichero `db` no se crea y fallan todas las suites con BD.
for s in db_superuser_password db_owner_password db_app_password db_backup_password pin_pepper db_test_admin_password; do
  generar_secreto "$s"
done
# Encargado inicial de esta ejecución (T-41, humo TX-CMD-01 de la suite
# containers; docs/infraestructura.md §9.2). PIN de 6 dígitos que cumple las
# reglas de encargado: copia de pin_ok/random_pin de
# deploy/dev/generar-secretos.sh (no se ejecuta ni se carga ese fichero).
# Ficheros 0600 y nunca se imprimen.
pin_ok() {
  printf '%s\n' "$1" | awk '
    BEGIN { split("112233 147258 159753 696969 123321 654456 101010 202020 520520 789456 147369 258369 159357 000000", b, " "); for (i in b) bad[b[i]] = 1 }
    {
      p = $0
      if (length(p) != 6 || p !~ /^[0-9]+$/ || (p in bad)) { exit 1 }
      for (i = 1; i <= 6; i++) d[i] = substr(p, i, 1) + 0
      up = 1; dn = 1
      for (i = 2; i <= 6; i++) {
        up = (d[i] == d[i-1] + 1) ? up + 1 : 1
        dn = (d[i] == d[i-1] - 1) ? dn + 1 : 1
        if (up >= 4 || dn >= 4) exit 1
      }
      if (substr(p,1,2) == substr(p,3,2) && substr(p,3,2) == substr(p,5,2)) exit 1
      if (substr(p,1,3) == substr(p,4,3)) exit 1
      if (d[1] == d[2] && d[3] == d[4] && d[5] == d[6]) exit 1
      n = 0; for (i = 1; i <= 6; i++) if (!(d[i] in seen)) { seen[d[i]] = 1; n++ }
      if (n < 4) exit 1
      exit 0
    }'
}
random_pin() {
  while :; do
    pin=$(od -An -N8 -tu8 /dev/urandom | tr -d ' \n' | tail -c 6)
    [ "${#pin}" -eq 6 ] || continue
    if pin_ok "$pin"; then
      printf '%s' "$pin"
      return 0
    fi
  done
}
(
  umask 077
  random_pin > "$TEST_SECRETS_DIR/initial_manager_pin"
  printf 'Encargado-%s' "$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')" > "$TEST_SECRETS_DIR/initial_manager_name"
  chmod 0600 "$TEST_SECRETS_DIR/initial_manager_pin" "$TEST_SECRETS_DIR/initial_manager_name"
)

# --- Imágenes ---------------------------------------------------------------
NO_USADA="localhost/mi-app-imagen-no-usada@sha256:0000000000000000000000000000000000000000000000000000000000000000"
necesita_app() {
  case "$SUITE" in integration|security|e2e|a11y|visual|perf|containers) return 0 ;; *) return 1 ;; esac
}
if necesita_app && [ -z "${APP_IMAGE:-}" ]; then
  echo "ERROR: APP_IMAGE obligatoria para '$SUITE' (imagen final de deploy/app/Containerfile, por digest)." >&2
  rm -rf "$TEST_SECRETS_DIR"
  exit 1
fi
if [ -z "${TESTS_NODE_IMAGE:-}" ]; then
  DEV_TOOLS=localhost/mi-app-dev-tools:node26.13.1-pnpm12.21.0
  if DIGEST=$(podman image inspect --format '{{.Digest}}' "$DEV_TOOLS" 2>/dev/null) && [ -n "$DIGEST" ]; then
    TESTS_NODE_IMAGE="localhost/mi-app-dev-tools@$DIGEST"
  else
    echo "ERROR: TESTS_NODE_IMAGE sin definir y no existe $DEV_TOOLS (sh deploy/dev/levantar.sh la construye)." >&2
    rm -rf "$TEST_SECRETS_DIR"
    exit 1
  fi
fi
# D-2.2-02: digests verificados con `podman image inspect` (v1.65.1-noble = versión
# del lockfile; toxiproxy 2.12.0). Se pueden sustituir exportando la variable.
PLAYWRIGHT_IMAGE=${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright@sha256:766137e2d9caad4744187e53cdc89320ba6f2eb57cff097374020944b44dd0a9}
TOXIPROXY_IMAGE=${TOXIPROXY_IMAGE:-ghcr.io/shopify/toxiproxy@sha256:a3e244375123dad8849091bcc59775e188624d3f602db01901f9af855682fef8}
# k6 (usuario 12345, no root), resuelto el 2026-11-25 con `podman pull docker.io/grafana/k6:latest`.
K6_IMAGE=${K6_IMAGE:-docker.io/grafana/k6@sha256:70949facc324f13a8903d24ee5b817ff32aca02bda3458389611e6aa4b38a097}
for v in PLAYWRIGHT_IMAGE K6_IMAGE TOXIPROXY_IMAGE ZAP_IMAGE; do
  eval "actual=\${$v:-}"
  case "$SUITE:$v" in
    e2e:PLAYWRIGHT_IMAGE|a11y:PLAYWRIGHT_IMAGE|visual:PLAYWRIGHT_IMAGE|perf:PLAYWRIGHT_IMAGE|perf:K6_IMAGE|\
    e2e:TOXIPROXY_IMAGE|a11y:TOXIPROXY_IMAGE|visual:TOXIPROXY_IMAGE|perf:TOXIPROXY_IMAGE|containers:TOXIPROXY_IMAGE)
      if [ -z "$actual" ]; then
        echo "ERROR: $v obligatoria para '$SUITE' (por digest)." >&2
        rm -rf "$TEST_SECRETS_DIR"
        exit 1
      fi ;;
  esac
  # El compose interpola todo el fichero: las imágenes que esta suite no usa
  # llevan una referencia que nunca se descarga.
  [ -n "$actual" ] || eval "$v=\$NO_USADA"
done
APP_IMAGE=${APP_IMAGE:-$NO_USADA}
export APP_IMAGE TESTS_NODE_IMAGE PLAYWRIGHT_IMAGE K6_IMAGE TOXIPROXY_IMAGE ZAP_IMAGE
export TEST_RESULTS_DIR=./tests/results

PC="podman-compose -f compose.test.yaml -p $PROYECTO"
TODOS_PERFILES="--profile unit --profile integration --profile e2e --profile perf --profile security --profile setup --profile commands"

limpiar() {
  rc_limpiar=$?
  # shellcheck disable=SC2086
  $PC $TODOS_PERFILES down -v >/dev/null 2>&1 || true
  rm -rf "$TEST_SECRETS_DIR"
  # Fichero con PIN de usuarios efímeros de perf: nunca se deja en el árbol.
  rm -f "$RESULTADOS/k6-usuarios.json"
  exit $rc_limpiar
}
trap limpiar EXIT
trap 'exit 130' INT TERM HUP

esperar_sano() {
  # $1 servicio
  echo "Esperando a que $1 esté healthy..."
  podman wait --condition=healthy "${PROYECTO}_${1}_1" >/dev/null
}

levantar_bd_y_migrar() {
  # $1 perfil
  $PC --profile "$1" up -d db
  esperar_sano db
  # Código de salida real de las migraciones (no dentro del up: §4.3).
  migrar migrate
}

migrar() {
  # $1 servicio del perfil setup (migrate | migrate-template). Se comprueba su
  # código de salida de forma explícita: si falla, la suite no se ejecuta.
  set +e
  $PC --profile setup run --rm --no-deps "$1"
  rc_mig=$?
  set -e
  if [ "$rc_mig" -ne 0 ]; then
    echo "ERROR: '$1' terminó con código $rc_mig; no se ejecutan las pruebas." >&2
    exit 1
  fi
}

ejecutar() {
  # $1 perfil, $2 servicio, resto: comando
  perfil=$1; servicio=$2; shift 2
  set +e
  $PC --profile "$perfil" run --rm --no-deps \
    -e RESULTS_DIR="$RESULTS_DIR_CTR" -e CI=1 -e E2E_WORKERS="${E2E_WORKERS:-3}" -e E2E_PARTE="${E2E_PARTE:-}" \
    $RUN_ENV_EXTRA \
    "$servicio" "$@"
  rc_ej=$?
  set -e
  # Requisito 5: el contenedor ha escrito en tests/results y tests/screenshots.
  comprobar_enlaces
  return $rc_ej
}

# SEC-052 punto 3: antes de levantar nada, con la imagen ya validada.
if necesita_app; then
  verificar_registro "$RESULTADOS/tx-cont-03.txt" || exit 1
fi

RUN_ENV_EXTRA=""
PROYECTOS_E2E="--project=tablet-h --project=tablet-h-webkit --project=tablet-v --project=tpv --project=barra --project=escritorio --project=movil"
# D-2.2-02: el binario de Playwright está en tests/node_modules (paquete del
# workspace), no en /workspace; `npx` intentaría descargarlo y el ejecutor no
# tiene red. Se invoca su CLI directamente, sin resolución por PATH ni red.
PW="node tests/node_modules/@playwright/test/cli.js test -c tests/playwright.config.ts"
RC=0

case "$SUITE" in
  trazabilidad)
    ejecutar unit runner-unit node tests/tools/trazabilidad.ts || RC=$?
    ;;
  unit)
    ejecutar unit runner-unit pnpm --dir tests run test:unit "$@" || RC=$?
    ;;
  integration|security)
    levantar_bd_y_migrar integration
    # Plantilla app_template migrada (T-28, docs/infraestructura.md §9.1): cada
    # fichero de integración clona su BD desde ella con test_admin
    # (tests/support/bd-fichero.ts). Debe terminar antes de los tests: nadie
    # puede estar conectado a la plantilla durante CREATE DATABASE … TEMPLATE.
    migrar migrate-template
    $PC --profile integration up -d app
    esperar_sano app
    if [ "$SUITE" = "integration" ]; then
      ejecutar integration runner-integration pnpm --dir tests run test:integration "$@" || RC=$?
    else
      # Parte en proceso (matriz de autorización, RS-17/RS-18). Cabeceras, TLS
      # y ZAP (runner-security) se añaden en la Etapa 3.
      ejecutar integration runner-integration pnpm --dir tests run test:security "$@" || RC=$?
    fi
    ;;
  e2e|a11y|visual|perf|containers)
    levantar_bd_y_migrar e2e
    $PC --profile e2e up -d proxy toxiproxy
    esperar_sano app
    esperar_sano proxy
    case "$SUITE" in
      e2e)
        # Con filtro, las series sin tests que lo cumplan no son un error.
        SIN_TESTS=""
        [ "$#" -gt 0 ] && SIN_TESTS="--pass-with-no-tests"
        # shellcheck disable=SC2086
        E2E_PARTE=normales ejecutar e2e runner-e2e $PW $PROYECTOS_E2E $SIN_TESTS "$@" || RC=$?
        # Serie con PIN erróneo: un worker (presupuesto de fallos por IP, tests/README.md).
        E2E_PARTE=serie-pin ejecutar e2e runner-e2e $PW --project=serie-pin --workers=1 $SIN_TESTS "$@" || RC=$?
        # Serie con cortes de red (Toxiproxy es compartido: nada más en paralelo).
        E2E_PARTE=serie-red ejecutar e2e runner-e2e $PW --project=serie-red --workers=1 $SIN_TESTS "$@" || RC=$?
        ;;
      a11y) ejecutar e2e runner-e2e $PW --project=a11y "$@" || RC=$? ;;
      visual) ejecutar e2e runner-e2e $PW --project=visual --workers=1 "$@" || RC=$? ;;
      perf)
        # Semilla de 10 usuarios (Playwright, mismo acceso a BD que e2e, T-29) y k6.
        ejecutar e2e runner-e2e $PW --project=semilla-perf --workers=1 || RC=$?
        if [ "$RC" -eq 0 ]; then
          # k6 (Go) lee la CA de la ejecución de la variable de entorno del PROCESO
          # (SSL_CERT_FILE); `k6 run -e` solo fija __ENV del script.
          RUN_ENV_EXTRA="-e SSL_CERT_FILE=/caddy-data/caddy/pki/authorities/local/root.crt" ejecutar perf runner-perf run \
            -e K6_USERS_FILE="$RESULTS_DIR_CTR/k6-usuarios.json" \
            -e RONDAS="${RONDAS:-3}" \
            -e SSL_CERT_FILE=/caddy-data/caddy/pki/authorities/local/root.crt \
            --summary-export "$RESULTS_DIR_CTR/k6-resumen.json" \
            /workspace/tests/performance/k6/main.js || RC=$?
        fi
        ;;
      containers)
        sh tests/containers/tx-cont-01.sh "$PROYECTO" proxy | tee "$RESULTADOS/tx-cont-01.txt" || RC=1
        # tee oculta el código de salida del script: se vuelve a mirar el resultado.
        grep -q '^\[TX-CONT-01\] PASA' "$RESULTADOS/tx-cont-01.txt" || RC=1
        # T-41: humo de los comandos con la imagen real (servicio `commands`,
        # docs/infraestructura.md §9.2), después de migrate (BD sin encargados).
        sh tests/containers/tx-cmd-01.sh "$PROYECTO" | tee "$RESULTADOS/tx-cmd-01.txt" || RC=1
        grep -Eq '^\[TX-CMD-01\] (PASA|SKIP)' "$RESULTADOS/tx-cmd-01.txt" || RC=1
        # TX-CONT-02: condiciones de las excepciones (SEC-054) y de las imágenes
        # derivadas de db y proxy (SEC-049, SEC-055).
        sh tests/containers/tx-cont-02.sh "$PROYECTO" | tee "$RESULTADOS/tx-cont-02.txt" || RC=1
        grep -q '^\[TX-CONT-02\] PASA' "$RESULTADOS/tx-cont-02.txt" || RC=1
        ;;
    esac
    ;;
esac

{
  echo "suite=$SUITE proyecto=$PROYECTO resultado=$([ "$RC" -eq 0 ] && echo PASA || echo FALLA)"
  echo "APP_IMAGE=$APP_IMAGE"
  echo "TESTS_NODE_IMAGE=$TESTS_NODE_IMAGE"
  echo "PLAYWRIGHT_IMAGE=$PLAYWRIGHT_IMAGE"
  echo "registro_escaneo=$REGISTRO_ESTADO gate=${GATE:-0}"
  echo "fecha=$(date -u +%Y-%m-%dT%H:%M:%SZ) commit=$(git rev-parse --short HEAD 2>/dev/null || echo '-')"
} > "$RESULTADOS/resumen.txt"
cat "$RESULTADOS/resumen.txt"
exit $RC
