#!/bin/sh
# Escanea UNA imagen con Trivy (SEC-034, docs/infraestructura.md §14.1).
#
#   sh deploy/scan/escanear.sh <imagen> [excepciones.yaml] [informe.json]
#
# - La imagen puede ser una etiqueta local o repo@sha256:...; se exporta con
#   `podman save` (nunca se monta el socket de Podman) a $XDG_RUNTIME_DIR y se
#   escanea con Trivy FIJADO POR DIGEST en un contenedor rootless endurecido
#   (UID 1000, sin capacidades, raiz de solo lectura, .tar montado en ro).
# - Falla (codigo 1) con cualquier HIGH/CRITICAL no cubierta por una excepcion
#   fechada del fichero de excepciones indicado (la app: deploy/app/trivyignore.yaml;
#   db y proxy: deploy/scan/trivyignore-<db|proxy>.yaml). Prohibido --ignore-unfixed (SEC-033).
# - Las excepciones se muestran (--show-suppressed).
set -eu

# SEC-052: el escaner NO se puede cambiar por entorno. Se ignora cualquier TRIVY_IMAGE
# heredado; para actualizar Trivy se cambia este digest (y docs/infraestructura.md §8).
unset TRIVY_IMAGE
TRIVY_IMAGE=docker.io/aquasec/trivy@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P)
IMG=${1:?uso: escanear.sh <imagen> [ficheroexcepciones.yaml] [informe.json]}
IGNORE=${2:-}
INFORME=${3:-}

[ "$(id -u)" -ne 0 ] || { echo "ERROR: no ejecutar como root" >&2; exit 1; }
if [ -n "${XDG_RUNTIME_DIR:-}" ] && [ -S "$XDG_RUNTIME_DIR/bus" ]; then
  export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"
fi
[ "$(podman info --format '{{.Host.Security.Rootless}}' 2>/dev/null)" = "true" ] \
  || { echo "ERROR: podman no esta en modo rootless" >&2; exit 1; }

BASE=${XDG_RUNTIME_DIR:-/tmp}
TMP=$(mktemp -d "$BASE/mi-app-scan.XXXXXX")
trap 'rm -rf "$TMP"' EXIT INT TERM
CACHE=${TRIVY_CACHE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/mi-app-trivy}
mkdir -p "$CACHE"
chmod 700 "$TMP"

podman save --format docker-archive -o "$TMP/imagen.tar" "$IMG" 2>/dev/null
# Excepciones fechadas: fichero indicado (por imagen). Sin fichero = ninguna.
if [ -n "$IGNORE" ]; then
  cp "$IGNORE" "$TMP/ignore.yaml"
else
  printf 'vulnerabilities: []\n' > "$TMP/ignore.yaml"
fi
touch "$TMP/informe.json"; chmod 666 "$TMP/informe.json"

trivy() { # trivy <formato> <salida|-> <codigo-de-salida>
  podman run --rm --user 1000:1000 --cap-drop=ALL --security-opt=no-new-privileges \
    --read-only --tmpfs /tmp --memory=2g --cpus=2 --userns=keep-id \
    -e HOME=/tmp -e TRIVY_CACHE_DIR=/cache \
    -v "$CACHE:/cache:rw" \
    -v "$TMP/imagen.tar:/in/imagen.tar:ro" \
    -v "$TMP/ignore.yaml:/in/ignore.yaml:ro" \
    -v "$TMP/informe.json:/out/informe.json:rw" \
    "$TRIVY_IMAGE" image --input /in/imagen.tar \
    --severity HIGH,CRITICAL --exit-code "$3" \
    --ignorefile /in/ignore.yaml --show-suppressed \
    --format "$1" ${2:+--output "$2"} --quiet
}
# Informe JSON (sin fallar) y tabla legible con el codigo de salida que cuenta.
trivy json /out/informe.json 0 || { echo "ERROR: Trivy fallo" >&2; exit 2; }
if [ -n "$INFORME" ]; then cp "$TMP/informe.json" "$INFORME"; fi
echo "== Trivy: $IMG (escaner: $TRIVY_IMAGE)"
set +e
trivy table "" 1
RC=$?
set -e
[ $RC -le 1 ] || { echo "ERROR: Trivy fallo (codigo $RC)" >&2; exit 2; }
if [ $RC -eq 0 ]; then echo "Trivy: 0 HIGH/CRITICAL sin excepcion ($IMG)"; fi
exit $RC
