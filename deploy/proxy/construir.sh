#!/bin/sh
# Construye la imagen del proxy (deploy/proxy/Containerfile) en rootless y
# comprueba su contenido (SEC-055, EXC-03).
#
#   sh deploy/proxy/construir.sh
#
# Etiqueta fija, la que usan los compose: localhost/mi-app-proxy:2.11.9-alpine.
# Comprueba sobre la imagen real: Alpine 3.24.x, ningun paquete atrasado
# (`apk --no-cache version -l '<'` como UID 1000, raiz de solo lectura; falla
# cerrado si apk no puede leer el indice), zstd-libs >= 1.6.0-r1, USER 1000:1000 y
# /usr/bin/caddy con el MISMO sha256 que el de la imagen oficial por digest
# (EXC-03: sin modulos anadidos). Si algo falla: codigo != 0 y etiqueta -rechazada.
# No escanea: lo hace deploy/app/construir.sh (que llama a este script).
# Imprime PROXY_IMAGE=localhost/mi-app-proxy@sha256:... Nunca sudo ni docker.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P)
cd "$ROOT"

[ "$(id -u)" -ne 0 ] || { echo "ERROR: no ejecutar como root" >&2; exit 1; }
if [ -n "${XDG_RUNTIME_DIR:-}" ] && [ -S "$XDG_RUNTIME_DIR/bus" ]; then
  export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"
fi
[ "$(podman info --format '{{.Host.Security.Rootless}}' 2>/dev/null)" = "true" ] \
  || { echo "ERROR: podman no esta en modo rootless" >&2; exit 1; }

# SEC-052 (g): la etiqueta `revision` lleva -sucio si las entradas de esta imagen
# (deploy/proxy/) tienen cambios sin commit (tambien ficheros nuevos).
REVISION=$(git rev-parse HEAD 2>/dev/null || echo desconocida)
if [ -n "$(git status --porcelain --untracked-files=all -- deploy/proxy 2>/dev/null || echo fallo)" ]; then
  REVISION="$REVISION-sucio"
fi
IMAGEN=localhost/mi-app-proxy:2.11.9-alpine
# La base sale del Containerfile (sin --build-arg del usuario): se lee de ahi.
BASE=$(sed -n 's/^ARG CADDY_BASE=\(.*\)$/\1/p' deploy/proxy/Containerfile)
case $BASE in
  docker.io/library/caddy:*@sha256:????????????????????????????????????????????????????????????????) ;;
  *) echo "ERROR: CADDY_BASE no es docker.io/library/caddy:<version>@sha256:<digest>" >&2; exit 1 ;;
esac
podman build --format docker --pull=missing --no-cache \
  --label "org.opencontainers.image.revision=$REVISION" \
  -f deploy/proxy/Containerfile -t "$IMAGEN" deploy/proxy

fallo() {
  echo "ERROR: $1 (la imagen $IMAGEN NO se acepta; etiqueta ${IMAGEN}-rechazada)" >&2
  podman tag "$IMAGEN" "${IMAGEN}-rechazada" 2>/dev/null && podman untag "$IMAGEN" "$IMAGEN" 2>/dev/null || true
  exit 1
}
RUNOPTS="--rm --user 1000:1000 --cap-drop=ALL --security-opt=no-new-privileges --read-only --tmpfs /tmp --memory=128m --entrypoint sh"
# shellcheck disable=SC2086
RUN="podman run $RUNOPTS $IMAGEN -c"
REL=$($RUN 'cat /etc/alpine-release') || fallo "no se pudo ejecutar la imagen"
case $REL in 3.24.*) ;; *) fallo "Alpine $REL: solo la rama mas reciente (3.24, SEC-051)";; esac
ZSTD=$($RUN "apk list -I zstd-libs | sed 's/ .*//'") || fallo "no se pudo leer zstd-libs"
V=${ZSTD#zstd-libs-}
OK=$($RUN "apk version -t '$V' 1.6.0-r1") || fallo "no se pudo comparar zstd-libs"
[ -n "$OK" ] && [ "$OK" != "<" ] || fallo "zstd-libs $V < 1.6.0-r1 (SEC-055)"
# SEC-055: ningun paquete atrasado (solo la cabecera). Falla cerrado.
ATRAS=$($RUN "apk --no-cache version -l '<'") || fallo "apk no pudo comprobar los paquetes atrasados"
[ "$(printf '%s\n' "$ATRAS" | grep -c .)" -le 1 ] || fallo "paquetes atrasados (SEC-055): $(printf '%s' "$ATRAS" | tr '\n' ' ')"
# EXC-03: /usr/bin/caddy identico al de la imagen oficial por digest.
SHA_NUEVA=$($RUN 'sha256sum /usr/bin/caddy' | cut -d' ' -f1) || fallo "no se pudo leer /usr/bin/caddy"
SHA_OFICIAL=$(podman run $RUNOPTS "$BASE" -c 'sha256sum /usr/bin/caddy' | cut -d' ' -f1) \
  || fallo "no se pudo leer /usr/bin/caddy de la imagen oficial"
[ -n "$SHA_NUEVA" ] && [ "$SHA_NUEVA" = "$SHA_OFICIAL" ] \
  || fallo "/usr/bin/caddy ($SHA_NUEVA) no es identico al de la imagen oficial ($SHA_OFICIAL; EXC-03)"
[ "$(podman image inspect --format '{{.Config.User}}' "$IMAGEN")" = "1000:1000" ] || fallo "USER distinto de 1000:1000"

DIGEST=$(podman image inspect --format '{{.Digest}}' "$IMAGEN")
echo "proxy: Alpine $REL, $ZSTD, sin paquetes atrasados, caddy sha256 $SHA_NUEVA (= oficial), USER 1000:1000"
echo "Imagen: $IMAGEN ($DIGEST)"
echo "PROXY_IMAGE=localhost/mi-app-proxy@$DIGEST"
