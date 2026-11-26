#!/bin/sh
# Construye la imagen final de la app (deploy/app/Containerfile) en rootless.
#
#   sh deploy/app/construir.sh            # etiqueta localhost/mi-app:<commit>[-sucio]
#   sh deploy/app/construir.sh <etiqueta> # etiqueta propia
#
# Despues de construir (SEC-034, docs/infraestructura.md §14.1):
#   1. comprobaciones de SEC-033 (condiciones 3 y 4) sobre la imagen real;
#   2. Trivy sobre TODAS las imagenes desplegables (app, db, proxy) con las
#      excepciones fechadas (deploy/app/trivyignore.yaml, deploy/scan/*);
#   (pnpm audit --prod y las comprobaciones de .npmrc/pnpm estan en el Containerfile.)
# Si algo falla: codigo != 0, NO imprime APP_IMAGE y la etiqueta pasa a -rechazada.
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
  # Cambios sin commit en TODO lo que entra en la imagen (misma lista que
  # deploy/app/containerignore, SEC-037) o ficheros ignorados por git dentro de
  # apps/ y packages/ que el containerignore no excluye (SEC-037).
  SUCIO=$(git status --porcelain -- apps packages package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc 'tsconfig*.json' tests/package.json deploy/app/Containerfile deploy/app/containerignore 2>/dev/null || true)
  IGNORADOS=$(git ls-files --others --ignored --exclude-standard -- apps packages 2>/dev/null \
    | grep -vE '(^|/)(node_modules|dist|\.vite|\.turbo|coverage|\.secrets)(/|$)|\.tsbuildinfo$|(^|/)\.env($|\.)|\.(secret|pem|key)$' || true)
  if [ -n "$SUCIO" ] || [ -n "$IGNORADOS" ]; then
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
echo "Imagen: $REPO:$ETIQUETA ($DIGEST)"

# --- Verificacion (SEC-034). Cualquier fallo: etiqueta -rechazada y sin APP_IMAGE.
rechazar() {
  echo "ERROR: $1" >&2
  podman tag "$REPO:$ETIQUETA" "$REPO:${ETIQUETA%-rechazada}-rechazada" 2>/dev/null || true
  podman untag "$REPO:$ETIQUETA" 2>/dev/null || true
  echo "La imagen NO se acepta (etiqueta $REPO:${ETIQUETA%-rechazada}-rechazada); no hay APP_IMAGE." >&2
  exit 1
}
BASE=${XDG_RUNTIME_DIR:-/tmp}
TMP=$(mktemp -d "$BASE/mi-app-build.XXXXXX")
trap 'rm -rf "$TMP"' EXIT INT TERM
SCAN_DIR=${SCAN_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/mi-app/escaneos}
mkdir -p "$SCAN_DIR"

# 1) SEC-033 condicion 3 y 4, sobre la imagen real. La distroless no tiene shell:
#    node se ejecuta en un contenedor endurecido y el contenido se exporta
#    (podman create + export) para inspeccionarlo FUERA de la imagen.
QUIC=$(podman run --rm --user 1000:1000 --cap-drop=ALL --security-opt=no-new-privileges \
  --read-only --network none --memory=256m "$REPO:$ETIQUETA" \
  /nodejs/bin/node -p 'process.config.variables.node_use_quic' 2>/dev/null || echo error)
[ "$QUIC" = "false" ] || rechazar "SEC-033: node_use_quic = '$QUIC' (debe ser false)"
CID=$(podman create "$REPO:$ETIQUETA")
podman export "$CID" > "$TMP/imagen-fs.tar" || { podman rm "$CID" >/dev/null; rechazar "no se pudo exportar la imagen"; }
podman rm "$CID" >/dev/null
mkdir "$TMP/fs"
tar -xf "$TMP/imagen-fs.tar" -C "$TMP/fs" app 2>/dev/null || rechazar "la imagen no tiene /app"
rm -f "$TMP/imagen-fs.tar"
if grep -rEq "node:quic|experimental-quic|require\(['\"](node:)?dgram|from ['\"](node:)?dgram" "$TMP/fs/app/dist"; then
  rechazar "SEC-033 condicion 3: /app/dist usa node:quic, --experimental-quic o dgram"
fi
if grep -rEq "node:quic|experimental-quic" "$TMP/fs/app/package.json"; then
  rechazar "SEC-033 condicion 3: package.json menciona QUIC"
fi
# SEC-036: ningun .npmrc ni .env* en /app (fuera de node_modules lo comprueba tambien el Containerfile).
if find "$TMP/fs/app" \( -name .npmrc -o -name '.env' -o -name '.env.*' \) -not -path '*/node_modules/*' | grep -q .; then
  rechazar "SEC-036: .npmrc o .env* en /app"
fi
NODOS=0
for f in $(find "$TMP/fs/app" -name '*.node' -type f 2>/dev/null); do
  NODOS=$((NODOS+1))
  if readelf -d "$f" 2>/dev/null | grep -Eq 'NEEDED.*(libssl|libcrypto)'; then
    rechazar "SEC-033 condicion 4: $f enlaza libssl/libcrypto"
  fi
  if nm -D --undefined-only "$f" 2>/dev/null | grep -Eq 'OSSL_QUIC_|SSL_new_listener|SSL_set_quic_tls_cbs'; then
    rechazar "SEC-033 condicion 4: $f importa simbolos QUIC de OpenSSL"
  fi
done
echo "SEC-033: node_use_quic=false; dist sin node:quic/dgram; $NODOS modulo(s) .node sin libssl/libcrypto ni simbolos QUIC"
rm -rf "$TMP/fs"

# 2) Trivy sobre TODAS las imagenes desplegables (app, db, proxy). db y proxy se
#    leen de compose.test.yaml (misma referencia por digest en DEV/TESTING/DEMO/PROD).
imagen_de() { # imagen_de <fichero> <repo>
  sed -n "s#^ *image: *\(docker.io/library/$2:[^ ]*@sha256:[0-9a-f]\{64\}\) *\$#\1#p" "$1" | sort -u
}
DB_IMAGE=$(imagen_de compose.test.yaml postgres)
PROXY_IMAGE=$(imagen_de compose.test.yaml caddy)
[ "$(printf '%s\n' "$DB_IMAGE" | grep -c .)" = 1 ] || rechazar "compose.test.yaml: debe haber una sola imagen postgres por digest"
[ "$(printf '%s\n' "$PROXY_IMAGE" | grep -c .)" = 1 ] || rechazar "compose.test.yaml: debe haber una sola imagen caddy por digest"
for c in compose.dev.yaml compose.demo.yaml; do
  [ -f "$c" ] || continue
  [ "$(imagen_de "$c" postgres)" = "$DB_IMAGE" ] || rechazar "$c: la imagen de db no coincide con compose.test.yaml"
done
if grep -n 'gosu' compose.*.yaml 2>/dev/null | grep -v '^[^:]*:[0-9]*: *#' | grep -q .; then
  rechazar "SEC-049: un compose llama a gosu"
fi

ESCANEO=0
escanear() { # escanear <nombre> <imagen> [excepciones]
  if sh deploy/scan/escanear.sh "$2" "${3:-}" "$SCAN_DIR/$ETIQUETA-$1.json"; then
    echo "Trivy $1: OK (informe: $SCAN_DIR/$ETIQUETA-$1.json)"
  else
    echo "Trivy $1: FALLA" >&2; ESCANEO=1
  fi
}
escanear app "$REPO:$ETIQUETA" deploy/app/trivyignore.yaml
escanear db "$DB_IMAGE" deploy/scan/trivyignore-db.yaml
escanear proxy "$PROXY_IMAGE" deploy/scan/trivyignore-proxy.yaml
[ "$ESCANEO" -eq 0 ] || rechazar "Trivy: HIGH/CRITICAL sin excepcion vigente en app, db o proxy (SEC-034)"

echo "Imagen: $REPO:$ETIQUETA"
echo "APP_IMAGE=$REPO@$DIGEST"
