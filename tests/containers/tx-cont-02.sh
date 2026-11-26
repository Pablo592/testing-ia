#!/bin/sh
# [TX-CONT-02] Condiciones de las excepciones de seguridad y de las imágenes
# derivadas de db y proxy (docs/testing.md §5.8; SEC-054, SEC-049, SEC-055;
# docs/infraestructura.md §8.2). Se ejecuta EN EL HOST con el usuario sin
# privilegios, con la pila en marcha (después de TX-CONT-01).
#
# Uso: sh tests/containers/tx-cont-02.sh <proyecto>
# Comprueba:
#   1. `sh deploy/scan/comprobar-excepciones.sh` sale con 0 (Caddyfile, compose,
#      Containerfile del proxy: condiciones de EXC-03 y EXC-02 retirada).
#   2. compose.test.yaml usa la db derivada localhost/mi-app-db:19.0-alpine3.24
#      y el proxy derivado localhost/mi-app-proxy:2.11.9-alpine, y los
#      contenedores en marcha salen de esas etiquetas.
#   3. La imagen de db y la del proxy tienen USER 1000 (no root).
#   4. La db en ejecución no contiene /usr/local/bin/gosu (SEC-049); se mira como
#      el usuario del contenedor, sin exec como root (reglas §3.5).
# Sale con 0 si todo cumple; 1 si algo incumple.
set -eu

if [ "$(id -u)" -eq 0 ]; then
  echo "TX-CONT-02: ERROR: no ejecutar como root" >&2
  exit 1
fi
[ $# -ge 1 ] || { echo "uso: $0 <proyecto>" >&2; exit 2; }
PROYECTO=$1
RAIZ=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P)
cd "$RAIZ"

DB_ETIQUETA=localhost/mi-app-db:19.0-alpine3.24
PROXY_ETIQUETA=localhost/mi-app-proxy:2.11.9-alpine

FALLOS=0
fallo() { echo "  INCUMPLE: $*"; FALLOS=$((FALLOS + 1)); }
ok() { echo "  ok: $*"; }

echo "[TX-CONT-02] proyecto $PROYECTO"

# 1. Condiciones de las excepciones (SEC-054). Se ejecuta el script del
#    repositorio tal cual; su salida se muestra solo si falla.
SALIDA=$(sh deploy/scan/comprobar-excepciones.sh 2>&1) && RC=0 || RC=$?
if [ "$RC" -eq 0 ]; then
  ok "comprobar-excepciones.sh sale con 0"
else
  fallo "comprobar-excepciones.sh salió con $RC (esperado 0)"
  printf '%s\n' "$SALIDA" | sed 's/^/      | /'
fi

# 2. compose.test.yaml: etiquetas exactas, una sola vez cada una y sin otra
#    imagen para esos servicios (db y proxy).
lineas_image() {
  # $1 servicio; imprime las líneas `image:` del bloque del servicio (sin comentarios).
  awk -v s="$1" '
    /^  [A-Za-z0-9_-]+:[[:space:]]*$/ { en = ($1 == s ":") ; next }
    /^[A-Za-z]/ { en = 0 }
    en && $1 == "image:" { sub(/^[[:space:]]*image:[[:space:]]*/, ""); sub(/[[:space:]]+#.*$/, ""); gsub(/"/, ""); print }
  ' compose.test.yaml
}
for par in "db:$DB_ETIQUETA" "proxy:$PROXY_ETIQUETA"; do
  svc=${par%%:*}; esperada=${par#*:}
  actual=$(lineas_image "$svc")
  if [ "$actual" = "$esperada" ]; then
    ok "compose.test.yaml: $svc usa $esperada"
  else
    fallo "compose.test.yaml: $svc usa '${actual:-(nada)}' (esperado $esperada)"
  fi
done

# Contenedores en marcha de este proyecto: la imagen real es la etiqueta fija.
for par in "db:$DB_ETIQUETA" "proxy:$PROXY_ETIQUETA"; do
  svc=${par%%:*}; esperada=${par#*:}
  C="${PROYECTO}_${svc}_1"
  if ! podman container exists "$C" 2>/dev/null; then
    fallo "no existe el contenedor $C"
    continue
  fi
  nombre=$(podman inspect --format '{{.ImageName}}' "$C")
  if [ "$nombre" = "$esperada" ]; then
    ok "$C se creó desde $esperada"
  else
    fallo "$C se creó desde '$nombre' (esperado $esperada)"
  fi
  # La imagen del contenedor es la que apunta hoy la etiqueta (no una antigua).
  id_cont=$(podman inspect --format '{{.Image}}' "$C")
  id_etiq=$(podman image inspect --format '{{.Id}}' "$esperada" 2>/dev/null || true)
  if [ -n "$id_etiq" ] && [ "$id_cont" = "$id_etiq" ]; then
    ok "$C usa la imagen actual de la etiqueta (${id_cont%"${id_cont#????????????}"})"
  else
    fallo "$C usa la imagen $id_cont, y la etiqueta apunta a ${id_etiq:-(nada)}"
  fi
  # 3. USER de la imagen.
  usuario=$(podman image inspect --format '{{.Config.User}}' "$esperada" 2>/dev/null || true)
  case "$usuario" in
    1000|1000:1000) ok "$esperada: USER $usuario" ;;
    *) fallo "$esperada: Config.User='$usuario' (esperado 1000 o 1000:1000)" ;;
  esac
done

# 4. Sin gosu en la db en ejecución (SEC-049): como el usuario del contenedor.
CDB="${PROYECTO}_db_1"
if podman container exists "$CDB" 2>/dev/null && [ "$(podman inspect --format '{{.State.Status}}' "$CDB")" = "running" ]; then
  HALLADO=$(podman exec "$CDB" sh -c 'ls /usr/local/bin/gosu 2>/dev/null; command -v gosu 2>/dev/null; true')
  if [ -z "$HALLADO" ]; then
    ok "db: no existe /usr/local/bin/gosu ni gosu en el PATH"
  else
    fallo "db: existe gosu ($(printf '%s' "$HALLADO" | tr '\n' ' '))"
  fi
  [ "$(podman exec "$CDB" id -u)" != "0" ] && ok "db: el exec corrió sin ser root" || fallo "db: exec como UID 0"
else
  fallo "el contenedor $CDB no está en marcha: no se puede comprobar gosu"
fi
# La misma comprobación sobre la imagen (sin contenedor), por si la db no corre.
if podman run --rm --user 1000:1000 --cap-drop=ALL --security-opt=no-new-privileges --read-only \
     --network none --pull=never --entrypoint /bin/sh "$DB_ETIQUETA" -c 'test ! -e /usr/local/bin/gosu' >/dev/null 2>&1; then
  ok "imagen $DB_ETIQUETA: /usr/local/bin/gosu no existe"
else
  fallo "imagen $DB_ETIQUETA: existe /usr/local/bin/gosu (o no se pudo comprobar)"
fi

if [ "$FALLOS" -gt 0 ]; then
  echo "[TX-CONT-02] FALLA: $FALLOS incumplimientos"
  exit 1
fi
echo "[TX-CONT-02] PASA"
