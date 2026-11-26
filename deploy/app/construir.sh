#!/bin/sh
# Construye la imagen final de la app (deploy/app/Containerfile) en rootless.
#
#   sh deploy/app/construir.sh            # etiqueta localhost/mi-app:<commit>[-sucio]
#   sh deploy/app/construir.sh <etiqueta> # etiqueta propia
#
# Despues de construir (SEC-034, docs/infraestructura.md §14.1):
#   1. comprobaciones de SEC-033 (condiciones 3 y 4) sobre la imagen real;
#   2. construye la imagen de db (deploy/db/construir.sh: postgres 19.0-alpine3.24
#      por digest, libxml2 >= r3, sin gosu, sin paquetes atrasados; SEC-049/051/055)
#      y la del proxy (deploy/proxy/construir.sh: caddy:2.11.9-alpine por digest
#      + apk upgrade, /usr/bin/caddy identico al oficial; SEC-055/EXC-03) y las comprueba;
#   3. comprueba las condiciones de EXC-03 y EXC-02 (SEC-054,
#      deploy/scan/comprobar-excepciones.sh: Caddyfile y compose);
#   4. Trivy sobre TODAS las imagenes desplegables (app y db por digest, proxy)
#      con las excepciones fechadas (deploy/app/trivyignore.yaml,
#      deploy/scan/trivyignore-proxy.yaml); Trivy fijo, no cambia por entorno (SEC-052);
#   (pnpm audit --prod: build-arg AUDIT_NONCE, se ejecuta en CADA build, SEC-053;
#   las comprobaciones de .npmrc/pnpm estan en el Containerfile.)
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
  --build-arg "APP_VERSION=$ETIQUETA" \
  --build-arg "AUDIT_NONCE=$(date +%s)-$$" \
  -f deploy/app/Containerfile \
  -t "$REPO:$ETIQUETA" \
  .

DIGEST=$(podman image inspect --format '{{.Digest}}' "$REPO:$ETIQUETA")
echo "Imagen: $REPO:$ETIQUETA ($DIGEST)"

# --- Verificacion (SEC-034). Cualquier fallo: etiqueta -rechazada y sin APP_IMAGE.
rechazar() {
  echo "ERROR: $1" >&2
  RECH="$REPO:${ETIQUETA%-rechazada}-rechazada"
  # SEC-052 punto 3a: una imagen rechazada no puede quedar en el registro de aprobadas.
  [ -z "${DIGEST:-}" ] || rm -f "${SCAN_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/mi-app/escaneos}/aprobadas/${DIGEST#sha256:}"
  # SEC-053: crear la etiqueta -rechazada y quitar SOLO el nombre original
  # (`podman untag <img>` sin nombre quita todos los nombres de la imagen).
  if podman tag "$REPO:$ETIQUETA" "$RECH" 2>/dev/null; then
    [ "$REPO:$ETIQUETA" = "$RECH" ] || podman untag "$REPO:$ETIQUETA" "$REPO:$ETIQUETA" 2>/dev/null || true
    podman image exists "$RECH" || echo "AVISO: no se pudo crear $RECH" >&2
  fi
  echo "La imagen NO se acepta (etiqueta $RECH); no hay APP_IMAGE." >&2
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
# SEC-053: sin readelf o nm la condicion 4 no se puede comprobar: se rechaza (no pasa en silencio).
command -v readelf >/dev/null 2>&1 && command -v nm >/dev/null 2>&1 \
  || rechazar "SEC-053: faltan readelf o nm (binutils): no se puede comprobar SEC-033 condicion 4"
NODOS=0
NOELF=0
find "$TMP/fs/app" -name '*.node' -type f > "$TMP/nodos.txt"
while IFS= read -r f; do
  [ -n "$f" ] || continue
  NODOS=$((NODOS+1))
  # Solo se inspeccionan los ELF (los que carga Linux). Los prebuilds de otros
  # sistemas (win32 PE, darwin Mach-O) no se cargan aqui y readelf no los lee.
  if [ "$(head -c 4 "$f" | od -An -tx1 | tr -d ' \n')" != "7f454c46" ]; then
    NOELF=$((NOELF+1)); continue
  fi
  # Fallo cerrado: si readelf o nm fallan sobre un .node, se rechaza.
  SALIDA=$(readelf -d "$f" 2>&1) || rechazar "SEC-053: readelf fallo sobre $f"
  if printf '%s\n' "$SALIDA" | grep -Eq 'NEEDED.*(libssl|libcrypto)'; then
    rechazar "SEC-033 condicion 4: $f enlaza libssl/libcrypto"
  fi
  SALIDA=$(nm -D --undefined-only "$f" 2>&1) || rechazar "SEC-053: nm fallo sobre $f"
  if printf '%s\n' "$SALIDA" | grep -Eq 'OSSL_QUIC_|SSL_new_listener|SSL_set_quic_tls_cbs'; then
    rechazar "SEC-033 condicion 4: $f importa simbolos QUIC de OpenSSL"
  fi
done < "$TMP/nodos.txt"
echo "SEC-033: node_use_quic=false; dist sin node:quic/dgram; $NODOS modulo(s) .node ($NOELF no ELF omitidos) sin libssl/libcrypto ni simbolos QUIC"
rm -rf "$TMP/fs"

# 2) Imagen de db (SEC-049, SEC-051, SEC-055): derivada de postgres:19.0-alpine3.24 por
#    digest, libxml2 >= r3, sin gosu. Etiqueta fija en los compose; se comprueba
#    que DEV, TESTING y DEMO usan la misma y se escanea por digest.
DB_TAG=localhost/mi-app-db:19.0-alpine3.24
db_de() { sed -n 's#^ *image: *\(localhost/mi-app-db:[^ ]*\) *$#\1#p' "$1" | sort -u; }
[ "$(db_de compose.test.yaml)" = "$DB_TAG" ] || rechazar "compose.test.yaml: la imagen de db debe ser $DB_TAG (una sola)"
for c in compose.dev.yaml compose.demo.yaml; do
  [ -f "$c" ] || continue
  [ "$(db_de "$c")" = "$DB_TAG" ] || rechazar "$c: la imagen de db no coincide con compose.test.yaml ($DB_TAG)"
done
PROXY_TAG=localhost/mi-app-proxy:2.11.9-alpine
proxy_de() { sed -n 's#^ *image: *\(localhost/mi-app-proxy:[^ ]*\) *$#\1#p' "$1" | sort -u; }
[ "$(proxy_de compose.test.yaml)" = "$PROXY_TAG" ] || rechazar "compose.test.yaml: la imagen del proxy debe ser $PROXY_TAG (una sola, derivada: SEC-055)"
for c in compose.dev.yaml compose.demo.yaml; do
  [ -f "$c" ] || continue
  P=$(proxy_de "$c")
  [ -z "$P" ] || [ "$P" = "$PROXY_TAG" ] || rechazar "$c: la imagen del proxy no coincide con compose.test.yaml ($PROXY_TAG)"
done
sh deploy/db/construir.sh > "$TMP/db.log" 2>&1 || { cat "$TMP/db.log" >&2; rechazar "deploy/db/construir.sh fallo (SEC-049, SEC-051)"; }
tail -3 "$TMP/db.log"
DB_DIGEST=$(podman image inspect --format '{{.Digest}}' "$DB_TAG")
DB_IMAGE=localhost/mi-app-db@$DB_DIGEST
# Imagen del proxy (SEC-055): derivada minima de caddy:2.11.9-alpine por digest, con
# /usr/bin/caddy identico al oficial (EXC-03) y sin paquetes atrasados.
sh deploy/proxy/construir.sh > "$TMP/proxy.log" 2>&1 || { cat "$TMP/proxy.log" >&2; rechazar "deploy/proxy/construir.sh fallo (SEC-055, EXC-03)"; }
tail -3 "$TMP/proxy.log"
PROXY_DIGEST=$(podman image inspect --format '{{.Digest}}' "$PROXY_TAG")
PROXY_IMAGE=localhost/mi-app-proxy@$PROXY_DIGEST

# 3) SEC-054: condiciones de EXC-03 (Caddyfile, compose del proxy) y EXC-02 (gosu).
sh deploy/scan/comprobar-excepciones.sh || rechazar "SEC-054: condicion de una excepcion incumplida"

# 4) Trivy sobre TODAS las imagenes desplegables. La app por DIGEST (no por
#    etiqueta, SEC-052): se escanea lo que se imprime como APP_IMAGE.
ESCANEO=0
escanear() { # escanear <nombre> <imagen> [excepciones]
  if sh deploy/scan/escanear.sh "$2" "${3:-}" "$SCAN_DIR/$ETIQUETA-$1.json"; then
    echo "Trivy $1: OK (informe: $SCAN_DIR/$ETIQUETA-$1.json)"
  else
    echo "Trivy $1: FALLA" >&2; ESCANEO=1
  fi
}
escanear app "$REPO@$DIGEST" deploy/app/trivyignore.yaml
escanear db "$DB_IMAGE"
escanear proxy "$PROXY_IMAGE" deploy/scan/trivyignore-proxy.yaml
[ "$ESCANEO" -eq 0 ] || rechazar "Trivy: HIGH/CRITICAL sin excepcion vigente en app, db o proxy (SEC-034)"

# Registro de escaneo aprobado (SEC-052 punto 3). Hoy solo se escribe: la
# comprobacion en tests/run.sh y en el despliegue de DEMO/PROD esta pendiente
# (docs/infraestructura.md §14.1). Una imagen -sucio (cambios sin commit) NO se
# registra como aprobada (SEC-052 punto 3b) y se borra un registro previo.
case $ETIQUETA in
  *-sucio*)
    rm -f "$SCAN_DIR/aprobadas/${DIGEST#sha256:}"
    echo "AVISO: imagen -sucio (cambios sin commit): no se registra como aprobada (SEC-052)" >&2 ;;
  *)
    mkdir -p "$SCAN_DIR/aprobadas"
    {
      echo "fecha=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
      echo "etiqueta=$ETIQUETA"
      echo "commit=$REVISION"
      echo "app=$REPO@$DIGEST"
      echo "db=$DB_IMAGE"
      echo "proxy=$PROXY_IMAGE"
      echo "excepciones_sha256=$(cat deploy/app/trivyignore.yaml deploy/scan/trivyignore-proxy.yaml | sha256sum | cut -d' ' -f1)"
    } > "$SCAN_DIR/aprobadas/${DIGEST#sha256:}" ;;
esac

echo "Imagen: $REPO:$ETIQUETA"
echo "APP_IMAGE=$REPO@$DIGEST"
