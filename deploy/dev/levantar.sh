#!/bin/sh
# Levanta DEV completo con un solo comando, en orden y parando al primer error:
#   secretos -> imagen de herramientas -> pnpm install -> db -> migraciones
#   -> encargado inicial -> api + web.
# Solo usa podman-compose (nunca docker / podman compose / sudo).
#
# Uso, desde cualquier carpeta:
#   sh deploy/dev/levantar.sh             # todo
#   sh deploy/dev/levantar.sh --sin-deps  # omite pnpm install (sin red)
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"
PROJECT="${DEV_PROJECT:-mi-app-dev}"
PC="podman-compose -p $PROJECT -f compose.dev.yaml"
IMAGE=localhost/mi-app-dev-tools:node26.13.1-pnpm12.21.0
SIN_DEPS=0
[ "${1:-}" = "--sin-deps" ] && SIN_DEPS=1

# 1. Comprobaciones de la política (§3.1): nunca root, motor rootless, cgroups v2.
if [ "$(id -u)" -eq 0 ]; then
  echo "ERROR: no ejecutar como root" >&2; exit 1
fi
if [ "$(podman info --format '{{.Host.Security.Rootless}}')" != "true" ]; then
  echo "ERROR: podman no está en modo rootless" >&2; exit 1
fi
if [ "$(podman info --format '{{.Host.CgroupsVersion}}')" != "v2" ]; then
  echo "ERROR: se necesita cgroups v2 para los límites de memoria/CPU" >&2; exit 1
fi

# 2. Secretos (solo crea los que falten).
sh deploy/dev/generar-secretos.sh
# Puntos de montaje: .secrets/ (tapado por un tmpfs) y la lista de permitidos
# en escritura de web/deps (SEC-023, docs/infraestructura.md §7.1).
mkdir -p -m 0700 .secrets
mkdir -p apps packages node_modules

# 3. Imagen de herramientas (formato docker para conservar el HEALTHCHECK).
if ! podman image exists "$IMAGE"; then
  BUILDAH_FORMAT=docker $PC --profile setup build deps
fi

# 4. Dependencias (requiere package.json y pnpm-lock.yaml en la raíz).
if [ "$SIN_DEPS" -eq 0 ]; then
  if [ ! -f pnpm-lock.yaml ]; then
    echo "ERROR: falta pnpm-lock.yaml en la raíz (lo crea el Developer)" >&2; exit 1
  fi
  $PC --profile setup run --rm --no-deps deps
fi

# 5. Base de datos, migraciones y encargado inicial (falla si el código de salida != 0).
# Los efímeros se ejecutan con --no-deps: así no recrean db ni dejan
# dependencias --requires hacia contenedores ya terminados.
$PC up -d db
echo "Esperando a que db esté healthy..."
podman wait --condition=healthy "${PROJECT}_db_1" >/dev/null
$PC --profile setup run --rm --no-deps migrate
$PC --profile setup run --rm --no-deps init-manager

# 6. Servicios de desarrollo.
$PC up -d
$PC ps
echo "DEV listo: web http://localhost:5173  ·  api http://localhost:3000/healthz"
