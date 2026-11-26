#!/bin/sh
# [TX-CONT-03] Registro de escaneo aprobado de las imágenes que se van a probar
# (SEC-052 punto 3 y requisitos (a)–(h), docs/seguridad.md §6.11 y §6.12;
# docs/infraestructura.md §14.1). Se ejecuta EN EL HOST con el usuario sin
# privilegios, ANTES de levantar la pila. Solo lee: no escribe ni borra nada.
#
# Uso: sh tests/containers/tx-cont-03.sh <APP_IMAGE por digest>
# Variables: SCAN_DIR (igual que deploy/app/construir.sh; por defecto
#   ${XDG_STATE_HOME:-$HOME/.local/state}/mi-app/escaneos).
#
# Comprueba, sobre $SCAN_DIR/aprobadas/<digest-app>, que `construir.sh` escribió al
# aprobar la imagen (el fichero se lee campo a campo; nunca se carga como código):
#   1. el registro existe (una imagen hecha con `podman build`, rechazada o
#      -sucio no lo tiene);
#   2. `app=` es exactamente APP_IMAGE;
#   3. `fecha` de hace como mucho 7 días (MAX_DIAS) y no futura;
#   4. `etiqueta` sin -sucio ni -rechazada e igual al commit corto de 12
#      caracteres; `commit` de 40 hex; y `arbol_limpio=si` (requisito (e));
#   5. el commit existe y es HEAD o un antecesor suyo;
#   6. `excepciones_sha256` coincide con el de los ficheros de excepciones EN EL
#      COMMIT registrado y con los del árbol de trabajo (requisito (b));
#   7. `db=` y `proxy=` son los digests que apuntan HOY las etiquetas
#      localhost/mi-app-db:19.0-alpine3.24 y localhost/mi-app-proxy:2.11.9-alpine
#      (requisito (c));
#   8. la imagen existe localmente y ninguno de sus nombres lleva -sucio ni
#      -rechazada.
# Sale con 0 si todo cumple; 1 si algo incumple (lista cada incumplimiento).
# Si construir.sh aún no escribe un campo exigido (p. ej. arbol_limpio, requisito
# (e)), cuenta como incumplimiento: no se debilita la comprobación.
set -eu

if [ "$(id -u)" -eq 0 ]; then
  echo "TX-CONT-03: ERROR: no ejecutar como root" >&2
  exit 1
fi
[ $# -eq 1 ] || { echo "uso: $0 <APP_IMAGE por digest>" >&2; exit 2; }
APP=$1
RAIZ=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P)
cd "$RAIZ"

MAX_DIAS=7
DB_ETIQUETA=localhost/mi-app-db:19.0-alpine3.24
PROXY_ETIQUETA=localhost/mi-app-proxy:2.11.9-alpine
SCAN_DIR=${SCAN_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/mi-app/escaneos}

FALLOS=0
fallo() { echo "  INCUMPLE: $*"; FALLOS=$((FALLOS + 1)); }
ok() { echo "  ok: $*"; }
campo() { grep -m1 "^$1=" "$REG" | cut -d= -f2- || true; }
hex64() { printf '%s' "$1" | grep -Eq '^[0-9a-f]{64}$'; }

echo "[TX-CONT-03] registro de escaneo aprobado (SEC-052), máximo $MAX_DIAS días"
echo "  APP_IMAGE=$APP"

case "$APP" in
  localhost/mi-app@sha256:*) DIGEST=${APP#localhost/mi-app@sha256:} ;;
  *) DIGEST="" ;;
esac
if ! hex64 "$DIGEST"; then
  fallo "APP_IMAGE no es localhost/mi-app@sha256:<64 hex> (la etiqueta no identifica lo probado)"
  echo "[TX-CONT-03] FALLA: $FALLOS incumplimientos"
  exit 1
fi

REG="$SCAN_DIR/aprobadas/$DIGEST"
# 1. Existe.
if [ ! -f "$REG" ]; then
  fallo "no hay registro de aprobada en $REG: la imagen no pasó por 'sh deploy/app/construir.sh' (o se rechazó, o es -sucio)"
  echo "[TX-CONT-03] FALLA: $FALLOS incumplimientos"
  exit 1
fi
ok "registro $REG"

# 2. app= coincide.
REG_APP=$(campo app)
if [ "$REG_APP" = "$APP" ]; then ok "app= coincide con APP_IMAGE"; else fallo "app='$REG_APP' (esperado $APP)"; fi

# 3. Fecha.
FECHA=$(campo fecha)
if printf '%s' "$FECHA" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$' && T_REG=$(date -u -d "$FECHA" +%s 2>/dev/null); then
  AHORA=$(date -u +%s)
  EDAD=$((AHORA - T_REG))
  if [ "$EDAD" -lt -300 ]; then
    fallo "fecha=$FECHA es futura"
  elif [ "$EDAD" -gt $((MAX_DIAS * 86400)) ]; then
    fallo "fecha=$FECHA: escaneo de hace $((EDAD / 86400)) días (máximo $MAX_DIAS): hay que volver a construir y escanear"
  else
    ok "fecha=$FECHA (hace $((EDAD / 3600)) h)"
  fi
else
  fallo "fecha='$FECHA' ausente o con formato no válido"
fi

# 4. Etiqueta, commit y árbol limpio (requisito (e)).
ETIQUETA=$(campo etiqueta)
COMMIT=$(campo commit)
if [ -z "$ETIQUETA" ]; then
  fallo "el registro no tiene 'etiqueta' (registro anterior a SEC-052 3a/3b)"
else
  case "$ETIQUETA" in
    *-sucio*|*-rechazada*) fallo "etiqueta=$ETIQUETA (-sucio o -rechazada no vale para la puerta)" ;;
    *) ok "etiqueta=$ETIQUETA" ;;
  esac
fi
if printf '%s' "$COMMIT" | grep -Eq '^[0-9a-f]{40}$'; then
  ok "commit=$COMMIT"
  if [ -n "$ETIQUETA" ] && [ "$ETIQUETA" != "$(printf '%s' "$COMMIT" | cut -c1-12)" ]; then
    fallo "etiqueta=$ETIQUETA no es el commit corto (12) de commit=$COMMIT (etiqueta propia)"
  fi
else
  fallo "commit='$COMMIT' ausente o no es de 40 hex"
fi
LIMPIO=$(campo arbol_limpio)
if [ "$LIMPIO" = "si" ]; then
  ok "arbol_limpio=si"
else
  fallo "arbol_limpio='${LIMPIO:-(ausente)}' (esperado 'si'; requisito (e) de SEC-052: lo escribe construir.sh con el árbol entero limpio)"
fi

# 5 y 6. El commit existe, es HEAD o antecesor; y las excepciones.
if printf '%s' "$COMMIT" | grep -Eq '^[0-9a-f]{40}$' && git cat-file -e "$COMMIT^{commit}" 2>/dev/null; then
  if git merge-base --is-ancestor "$COMMIT" HEAD 2>/dev/null; then
    if [ "$(git rev-parse HEAD)" = "$COMMIT" ]; then
      ok "el commit del registro es HEAD"
    else
      ok "el commit del registro es antecesor de HEAD ($(git rev-list --count "$COMMIT..HEAD") commits después)"
    fi
  else
    fallo "el commit $COMMIT no es HEAD ni un antecesor de HEAD"
  fi
  EXC=$(campo excepciones_sha256)
  EXC_COMMIT=$( { git show "$COMMIT:deploy/app/trivyignore.yaml"; git show "$COMMIT:deploy/scan/trivyignore-proxy.yaml"; } 2>/dev/null | sha256sum | cut -d' ' -f1)
  EXC_TREE=$(cat deploy/app/trivyignore.yaml deploy/scan/trivyignore-proxy.yaml | sha256sum | cut -d' ' -f1)
  if [ "$EXC" = "$EXC_COMMIT" ]; then ok "excepciones_sha256 coincide con los ficheros del commit"; else fallo "excepciones_sha256=${EXC:-(ausente)} no coincide con el del commit ($EXC_COMMIT)"; fi
  if [ "$EXC" = "$EXC_TREE" ]; then ok "excepciones_sha256 coincide con los ficheros actuales"; else fallo "las excepciones cambiaron tras la aprobación (registro ${EXC:-(ausente)}, actuales $EXC_TREE)"; fi
else
  fallo "el commit '$COMMIT' no existe en este repositorio"
fi

# 7. db y proxy: el digest actual de la etiqueta es el escaneado (requisito (c)).
comprobar_derivada() {
  # $1 campo (db|proxy), $2 repo sin etiqueta, $3 etiqueta fija
  esperado=$(campo "$1")
  actual=$(podman image inspect --format '{{.Digest}}' "$3" 2>/dev/null || true)
  if [ -z "$actual" ]; then
    fallo "$1: no existe la imagen $3"
  elif [ "$esperado" = "$2@$actual" ]; then
    ok "$1: $3 apunta al digest escaneado (${actual#sha256:})"
  else
    fallo "$1: $3 apunta a $actual, pero el registro dice '${esperado:-(ausente)}' (etiqueta movida a una imagen sin escanear)"
  fi
}
comprobar_derivada db localhost/mi-app-db "$DB_ETIQUETA"
comprobar_derivada proxy localhost/mi-app-proxy "$PROXY_ETIQUETA"

# 8. La imagen existe y no tiene nombres de rechazo.
if podman image exists "$APP" 2>/dev/null; then
  NOMBRES=$(podman image inspect --format '{{range .RepoTags}}{{.}} {{end}}' "$APP" 2>/dev/null || true)
  case "$NOMBRES" in
    *-sucio*|*-rechazada*) fallo "la imagen tiene nombres de rechazo o -sucio: $NOMBRES" ;;
    *) ok "imagen presente (nombres: ${NOMBRES:-ninguno})" ;;
  esac
else
  fallo "la imagen $APP no existe en el almacén local"
fi

if [ "$FALLOS" -gt 0 ]; then
  echo "[TX-CONT-03] FALLA: $FALLOS incumplimientos"
  exit 1
fi
echo "[TX-CONT-03] PASA"
