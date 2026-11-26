#!/bin/sh
# Construye la imagen de db (deploy/db/Containerfile) en rootless y comprueba
# su contenido (SEC-049, SEC-051).
#
#   sh deploy/db/construir.sh
#
# Etiqueta fija, la que usan los compose: localhost/mi-app-db:19.0-alpine3.24.
# Comprueba sobre la imagen real: Alpine 3.24.x, libxml2 >= 2.13.9-r3, ningun paquete
# atrasado (`apk --no-cache version -l '<'`, SEC-055), sin
# /usr/local/bin/gosu, USER 1000:1000 y HEALTHCHECK. Si algo falla: codigo != 0.
# No escanea: lo hace deploy/app/construir.sh (que llama a este script).
# Imprime DB_IMAGE=localhost/mi-app-db@sha256:... Nunca sudo ni docker.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P)
cd "$ROOT"

[ "$(id -u)" -ne 0 ] || { echo "ERROR: no ejecutar como root" >&2; exit 1; }
if [ -n "${XDG_RUNTIME_DIR:-}" ] && [ -S "$XDG_RUNTIME_DIR/bus" ]; then
  export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"
fi
[ "$(podman info --format '{{.Host.Security.Rootless}}' 2>/dev/null)" = "true" ] \
  || { echo "ERROR: podman no esta en modo rootless" >&2; exit 1; }

IMAGEN=localhost/mi-app-db:19.0-alpine3.24
# Sin --build-arg del usuario: la base y la version minima salen del Containerfile.
podman build --format docker --pull=missing --no-cache \
  --label "org.opencontainers.image.revision=$(git rev-parse HEAD 2>/dev/null || echo desconocida)" \
  -f deploy/db/Containerfile -t "$IMAGEN" deploy/db

fallo() {
  echo "ERROR: $1 (la imagen $IMAGEN NO se acepta; etiqueta ${IMAGEN}-rechazada)" >&2
  podman tag "$IMAGEN" "${IMAGEN}-rechazada" 2>/dev/null && podman untag "$IMAGEN" "$IMAGEN" 2>/dev/null || true
  exit 1
}
RUN="podman run --rm --user 1000:1000 --cap-drop=ALL --security-opt=no-new-privileges --read-only --network none --memory=128m --entrypoint sh $IMAGEN -c"
# SEC-055: apk necesita red (indice) y /tmp para la comprobacion de atrasados.
RUN_RED="podman run --rm --user 1000:1000 --cap-drop=ALL --security-opt=no-new-privileges --read-only --tmpfs /tmp --memory=128m --entrypoint sh $IMAGEN -c"
REL=$($RUN 'cat /etc/alpine-release') || fallo "no se pudo ejecutar la imagen"
LIBXML=$($RUN "apk list -I libxml2 | sed 's/ .*//'") || fallo "no se pudo leer libxml2"
case $REL in 3.24.*) ;; *) fallo "Alpine $REL: solo la rama mas reciente (3.24, SEC-051)";; esac
V=${LIBXML#libxml2-}
OK=$($RUN "apk version -t '$V' 2.13.9-r3") || fallo "no se pudo comparar libxml2"
[ "$OK" != "<" ] || fallo "libxml2 $V < 2.13.9-r3 (SEC-049)"
# SEC-055: ningun paquete atrasado (solo la cabecera); falla cerrado si apk no lee el indice.
ATRAS=$($RUN_RED "apk --no-cache version -l '<'") || fallo "apk no pudo comprobar los paquetes atrasados (SEC-055)"
[ "$(printf '%s\n' "$ATRAS" | grep -c .)" -le 1 ] || fallo "paquetes atrasados (SEC-055): $(printf '%s' "$ATRAS" | tr '\n' ' ')"
ZSTD=$($RUN "apk list -I zstd-libs | sed 's/ .*//'") || fallo "no se pudo leer zstd-libs"
FFI=$($RUN "apk list -I libffi | sed 's/ .*//'") || fallo "no se pudo leer libffi"
$RUN 'test ! -e /usr/local/bin/gosu' || fallo "gosu sigue en la imagen (SEC-049)"
[ "$(podman image inspect --format '{{.Config.User}}' "$IMAGEN")" = "1000:1000" ] || fallo "USER distinto de 1000:1000"
[ -n "$(podman image inspect --format '{{.Config.Healthcheck}}' "$IMAGEN" | grep -v '^<nil>$')" ] || fallo "sin HEALTHCHECK"

DIGEST=$(podman image inspect --format '{{.Digest}}' "$IMAGEN")
echo "db: Alpine $REL, $LIBXML, $ZSTD, $FFI, sin paquetes atrasados, sin gosu, USER 1000:1000"
echo "Imagen: $IMAGEN ($DIGEST)"
echo "DB_IMAGE=localhost/mi-app-db@$DIGEST"
