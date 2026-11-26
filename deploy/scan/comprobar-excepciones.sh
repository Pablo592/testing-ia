#!/bin/sh
# Comprueba las CONDICIONES de las excepciones de seguridad que se apoyan en la
# configuracion (SEC-054; docs/infraestructura.md §8.2). Lo llama construir.sh
# antes de escanear; falla (codigo 1) con un mensaje claro por cada incumplimiento.
#
#   sh deploy/scan/comprobar-excepciones.sh [raiz-del-proyecto]
#
# EXC-03 (Caddy, SEC-050): el Caddyfile no tiene acme_server, templates ni
#   markdown, tiene exactamente un "admin off" y ninguna otra directiva admin;
#   ningun compose monta otro fichero en /etc/caddy, ni arranca Caddy con
#   command/entrypoint (--config, --adapter, --resume...), y la imagen del proxy es
#   la derivada minima localhost/mi-app-proxy:<version> (pull_policy: never) cuya
#   base (deploy/proxy/Containerfile) es la oficial caddy:<version> por digest, con
#   un solo FROM y sin COPY/ADD/xcaddy/apk add. Que /usr/bin/caddy sea identico
#   al oficial (sha256) lo comprueba deploy/proxy/construir.sh al construir
#   (SEC-055); aqui se exige que el script siga haciendolo.
# EXC-02 retirada (SEC-049): la imagen de db no lleva gosu; aqui ademas ningun
#   compose lo llama.
# Los compose que no existan (DEMO, antes de la Etapa 4) se omiten; Quadlet
# (deploy/quadlet/, PROD) se revisa si existe.
set -eu
RAIZ=$(CDPATH= cd -- "${1:-$(dirname -- "$0")/../..}" && pwd -P)
cd "$RAIZ"
FALLOS=0
mal() { echo "ERROR (SEC-054): $1" >&2; FALLOS=$((FALLOS+1)); }
# Sin comentarios (lineas "#..." y " #..." al final).
sin_comentarios() { sed -e 's/^[[:space:]]*#.*$//' -e 's/[[:space:]]#.*$//' "$1"; }

CF=deploy/proxy/Caddyfile
if [ ! -f "$CF" ]; then
  mal "falta $CF"
else
  LIMPIO=$(sin_comentarios "$CF")
  if printf '%s\n' "$LIMPIO" | grep -Eiq '(^|[^[:alnum:]_])(acme_server|templates|markdown)([^[:alnum:]_]|$)'; then
    mal "$CF usa acme_server, templates o markdown (condicion 1 de EXC-03)"
  fi
  NADMIN=$(printf '%s\n' "$LIMPIO" | grep -Eic '^[[:space:]]*admin([[:space:]]|$)' || true)
  NOFF=$(printf '%s\n' "$LIMPIO" | grep -Ec '^[[:space:]]*admin[[:space:]]+off[[:space:]]*$' || true)
  if [ "$NADMIN" != 1 ] || [ "$NOFF" != 1 ]; then
    mal "$CF debe tener exactamente un 'admin off' y ninguna otra directiva admin (encontradas: $NADMIN admin, $NOFF admin off)"
  fi
  if printf '%s\n' "$LIMPIO" | grep -Eq '^[[:space:]]*import[[:space:]]+[^( ]' ; then
    # Solo se permite importar los snippets "(nombre)" definidos en el propio fichero.
    for n in $(printf '%s\n' "$LIMPIO" | sed -n 's/^[[:space:]]*import[[:space:]]\{1,\}\([^[:space:]]*\).*/\1/p'); do
      printf '%s\n' "$LIMPIO" | grep -Eq "^\\($n\\)[[:space:]]*\\{" \
        || mal "$CF importa '$n', que no es un snippet definido en el propio fichero"
    done
  fi
fi

# Imagen derivada del proxy (SEC-055): base oficial por digest y sin nada que cambie caddy.
PF=deploy/proxy/Containerfile
if [ ! -f "$PF" ]; then
  mal "falta $PF (imagen derivada del proxy)"
else
  PL=$(sin_comentarios "$PF")
  printf '%s\n' "$PL" | grep -Eq '^ARG CADDY_BASE=docker\.io/library/caddy:[^[:space:]@]+@sha256:[0-9a-f]{64}[[:space:]]*$' \
    || mal "$PF: ARG CADDY_BASE no es docker.io/library/caddy:<version>@sha256:<digest> (base oficial por digest)"
  [ "$(printf '%s\n' "$PL" | grep -Eic '^[[:space:]]*FROM[[:space:]]')" = 1 ] \
    && printf '%s\n' "$PL" | grep -Eq '^FROM \$\{CADDY_BASE\}[[:space:]]*$' \
    || mal "$PF: debe tener un unico FROM \${CADDY_BASE}"
  if printf '%s\n' "$PL" | grep -Eiq '(^|[^[:alnum:]_])(COPY|ADD|xcaddy|add-package|remove-package|curl|wget)([^[:alnum:]_]|$)|apk[[:space:]]+(--[a-z-]+[[:space:]]+)*(add|del)|--mount|--from'; then
    mal "$PF: COPY/ADD/xcaddy/apk add o descargas: podria cambiar /usr/bin/caddy (condicion 'sin modulos anadidos' de EXC-03)"
  fi
  PS=deploy/proxy/construir.sh
  if [ ! -f "$PS" ] || ! grep -q 'sha256sum /usr/bin/caddy' "$PS" || ! grep -q 'SHA_OFICIAL' "$PS"; then
    mal "$PS no compara el sha256 de /usr/bin/caddy con la imagen oficial (condicion de EXC-03)"
  fi
fi

for C in compose.*.yaml; do
  [ -f "$C" ] || continue
  LIMPIO=$(sin_comentarios "$C")
  if printf '%s\n' "$LIMPIO" | grep -Eiq 'gosu'; then
    mal "$C llama a gosu (condicion 2 de EXC-02)"
  fi
  # Bloque del servicio proxy (2 espacios de sangria hasta el siguiente servicio).
  BLOQUE=$(printf '%s\n' "$LIMPIO" | awk '/^  proxy:[[:space:]]*$/{d=1;next} d&&/^  [A-Za-z0-9_-]+:/{d=0} d{print}')
  if [ -n "$BLOQUE" ]; then
    if printf '%s\n' "$BLOQUE" | grep -Eq '^[[:space:]]+(command|entrypoint):'; then
      mal "$C: el servicio proxy define command/entrypoint (otro --config/--adapter/--resume; condicion de EXC-03)"
    fi
    printf '%s\n' "$BLOQUE" | grep -Eq '^[[:space:]]+image:[[:space:]]*localhost/mi-app-proxy:[A-Za-z0-9._-]+[[:space:]]*$' \
      || mal "$C: la imagen del proxy no es localhost/mi-app-proxy:<version> (la derivada de deploy/proxy/Containerfile; SEC-055)"
    printf '%s\n' "$BLOQUE" | grep -Eq '^[[:space:]]+pull_policy:[[:space:]]*never[[:space:]]*$' \
      || mal "$C: el proxy no tiene pull_policy: never (la imagen derivada es local)"
    for m in $(printf '%s\n' "$BLOQUE" | grep -E '/etc/caddy|Caddyfile' | sed -e 's/^[[:space:]]*-[[:space:]]*//' -e 's/"//g' -e "s/'//g" | tr -d ' '); do
      [ "$m" = "./deploy/proxy/Caddyfile:/etc/caddy/Caddyfile:ro" ] \
        || mal "$C: el proxy monta '$m' (solo ./deploy/proxy/Caddyfile:/etc/caddy/Caddyfile:ro)"
    done
    printf '%s\n' "$BLOQUE" | grep -q '/etc/caddy/Caddyfile:ro' \
      || mal "$C: el proxy no monta ./deploy/proxy/Caddyfile en /etc/caddy/Caddyfile:ro"
  fi
done

# Quadlet (PROD), cuando exista.
if [ -d deploy/quadlet ]; then
  if grep -rEiq 'gosu' deploy/quadlet; then mal "deploy/quadlet llama a gosu"; fi
  if grep -rEq '^[[:space:]]*(Exec|Entrypoint)=.*(--config|--adapter|--resume|caddy)' deploy/quadlet; then
    mal "deploy/quadlet arranca Caddy con otra configuracion"
  fi
fi

if [ "$FALLOS" -ne 0 ]; then
  echo "Condiciones de excepcion incumplidas: $FALLOS (EXC-03 y/o EXC-02 decaen; SEC-050/SEC-049 vuelven a bloquear)" >&2
  exit 1
fi
echo "SEC-054: Caddyfile (sin acme_server/templates/markdown, admin off) y compose (proxy sin command/entrypoint, un solo Caddyfile, sin gosu): OK"
