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

# Comprobación de enlaces simbólicos en la lista de permitidos en escritura
# (SEC-026, docs/infraestructura.md §7.1). web y deps pueden crear enlaces en
# apps/, packages/ y node_modules/ hacia cualquier ruta; en el host se
# resolverían contra los ficheros del usuario. Se detiene si:
#  a) hay algún enlace en apps/ o packages/ fuera de los node_modules/ reales
#     ("-type d" en la poda: un enlace llamado node_modules no se poda y se
#     detecta, porque find no sigue enlaces);
#  b) algún enlace de apps/, packages/, node_modules/ o tests/node_modules/
#     (incluidos los de pnpm) resuelve fuera de esas cuatro carpetas (p. ej. a
#     tests/run.sh o a ~/.ssh). tests/node_modules lo escribe deps (T-35).
# Nombres con salto de línea: como mucho dan un falso positivo, nunca un
# falso negativo. Si realpath falla (p. ej. un bucle de enlaces), también se
# detiene.
comprobar_enlaces() {
  R=$(pwd -P)
  sospechosos=$(find apps packages \( -name node_modules -type d \) -prune -o -type l -print)
  if [ -n "$sospechosos" ]; then
    echo "ERROR (SEC-026): enlaces simbólicos en apps/ o packages/ (fuera de node_modules/):" >&2
    printf '%s\n' "$sospechosos" >&2
    echo "Revísalos sin abrirlos ni editarlos (ls -l) y bórralos antes de seguir." >&2
    exit 1
  fi
  if ! destinos=$(find apps packages node_modules tests/node_modules -type l -exec realpath -m -- {} +); then
    echo "ERROR (SEC-026): no se pudo resolver algún enlace simbólico de la lista de permitidos" >&2
    exit 1
  fi
  [ -z "$destinos" ] && return 0
  fuera=$(printf '%s\n' "$destinos" | while IFS= read -r d; do
    case $d in
      "$R"/apps/*|"$R"/packages/*|"$R"/node_modules/*|"$R"/tests/node_modules/*) ;;
      *) printf '%s\n' "$d" ;;
    esac
  done)
  if [ -n "$fuera" ]; then
    echo "ERROR (SEC-026): enlaces simbólicos que apuntan fuera de apps/, packages/, node_modules/ y tests/node_modules/:" >&2
    # Camino lento, solo si hay error: enlace -> destino, uno a uno.
    find apps packages node_modules tests/node_modules -type l -exec sh -c '
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
}

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
mkdir -p apps packages node_modules tests/node_modules
comprobar_enlaces

# 3. Imagen de herramientas (formato docker para conservar el HEALTHCHECK).
if ! podman image exists "$IMAGE"; then
  BUILDAH_FORMAT=docker $PC --profile setup build deps
fi

# 3b. Imagen de db (derivada, SEC-049): local, no se descarga; se construye si falta.
if ! podman image exists localhost/mi-app-db:19.0-alpine3.24; then
  sh deploy/db/construir.sh
fi

# 4. Dependencias (requiere package.json y pnpm-lock.yaml en la raíz).
if [ "$SIN_DEPS" -eq 0 ]; then
  if [ ! -f pnpm-lock.yaml ]; then
    echo "ERROR: falta pnpm-lock.yaml en la raíz (lo crea el Developer)" >&2; exit 1
  fi
  $PC --profile setup run --rm --no-deps deps
  # deps acaba de ejecutar scripts de terceros con escritura en la lista.
  comprobar_enlaces
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
