#!/bin/sh
# Construye la imagen final de la app (deploy/app/Containerfile) en rootless.
#
#   sh deploy/app/construir.sh            # etiqueta localhost/mi-app:<commit>[-sucio]
#   sh deploy/app/construir.sh <etiqueta> # etiqueta propia
#
# Al terminar imprime la referencia POR DIGEST que se usa como APP_IMAGE:
#   APP_IMAGE=localhost/mi-app@sha256:...
#   APP_IMAGE=localhost/mi-app@sha256:... sh tests/run.sh integration
# docs/infraestructura.md §8.1. Nunca con sudo; solo podman rootless.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P)
cd "$ROOT"

if [ "$(id -u)" -eq 0 ]; then
  echo "ERROR: no ejecutar como root" >&2; exit 1
fi
# docs/infraestructura.md §4.2: bus de systemd del propio usuario.
if [ -n "${XDG_RUNTIME_DIR:-}" ] && [ -S "$XDG_RUNTIME_DIR/bus" ]; then
  case "${DBUS_SESSION_BUS_ADDRESS:-}" in
    "unix:path=$XDG_RUNTIME_DIR/bus"*) ;;
    *) export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus" ;;
  esac
fi
if [ "$(podman info --format '{{.Host.Security.Rootless}}' 2>/dev/null)" != "true" ]; then
  echo "ERROR: podman no está en modo rootless" >&2; exit 1
fi
for f in package.json pnpm-lock.yaml pnpm-workspace.yaml apps/api/package.json apps/web/package.json; do
  [ -f "$f" ] || { echo "ERROR: falta $f (lo crea el Developer; contrato en docs/infraestructura.md §8.1)" >&2; exit 1; }
done

REPO=localhost/mi-app
if [ -n "${1:-}" ]; then
  ETIQUETA=$1
else
  ETIQUETA=$(git rev-parse --short=12 HEAD 2>/dev/null || echo sin-git)
  # Cambios sin commit en lo que entra en la imagen: se marca la etiqueta.
  if [ -n "$(git status --porcelain -- apps packages package.json pnpm-lock.yaml pnpm-workspace.yaml 2>/dev/null)" ]; then
    ETIQUETA="$ETIQUETA-sucio"
  fi
fi
REVISION=$(git rev-parse HEAD 2>/dev/null || echo desconocida)

podman build \
  --format docker \
  --pull=missing \
  --ignorefile deploy/app/containerignore \
  --label "org.opencontainers.image.revision=$REVISION" \
  -f deploy/app/Containerfile \
  -t "$REPO:$ETIQUETA" \
  .

DIGEST=$(podman image inspect --format '{{.Digest}}' "$REPO:$ETIQUETA")
echo "Imagen: $REPO:$ETIQUETA"
echo "APP_IMAGE=$REPO@$DIGEST"
