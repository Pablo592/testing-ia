#!/bin/sh
# [TX-CONT-01] Política rootless de los contenedores de un proyecto de compose
# (docs/testing.md §5.8; docs/reglas-equipo.md §3.4 y §3.9; RS-36, RS-37, RS-38).
# Se ejecuta EN EL HOST con el usuario sin privilegios, con la pila en marcha.
# No monta ni usa el socket de Podman dentro de ningún contenedor.
#
# Uso: sh tests/containers/tx-cont-01.sh <proyecto> [servicio-publicado ...]
#   <proyecto>            nombre de proyecto de podman-compose (-p)
#   servicio-publicado    servicios que pueden publicar puertos (por defecto: proxy)
# Sale con 0 si todo cumple; 1 si algo incumple (lista cada incumplimiento).
set -eu

if [ "$(id -u)" -eq 0 ]; then
  echo "TX-CONT-01: ERROR: no ejecutar como root" >&2
  exit 1
fi
[ $# -ge 1 ] || { echo "uso: $0 <proyecto> [servicio-publicado ...]" >&2; exit 2; }
PROYECTO=$1; shift
PUBLICADOS=${*:-proxy}

FALLOS=0
fallo() { echo "  INCUMPLE: $*"; FALLOS=$((FALLOS + 1)); }
ok() { echo "  ok: $*"; }

echo "[TX-CONT-01] proyecto $PROYECTO"

# 1. Motor rootless (RS-36).
if [ "$(podman info --format '{{.Host.Security.Rootless}}' 2>/dev/null)" = "true" ]; then
  ok "podman rootless"
else
  fallo "podman no está en modo rootless"
fi

CONTENEDORES=$(podman ps -a --filter "label=io.podman.compose.project=$PROYECTO" --format '{{.Names}}')
if [ -z "$CONTENEDORES" ]; then
  fallo "no hay contenedores del proyecto $PROYECTO"
fi

for C in $CONTENEDORES; do
  SERVICIO=$(podman inspect --format '{{index .Config.Labels "io.podman.compose.service"}}' "$C")
  ESTADO=$(podman inspect --format '{{.State.Status}}' "$C")
  echo "- $C (servicio $SERVICIO, $ESTADO)"

  # Usuario de la imagen/ejecución distinto de root.
  USUARIO=$(podman inspect --format '{{.Config.User}}' "$C")
  case "$USUARIO" in
    ""|0|0:*|root|root:*) fallo "$C: Config.User='$USUARIO' (vacío o root)" ;;
    *) ok "Config.User=$USUARIO" ;;
  esac

  # Procesos: ningún usuario root dentro ni UID 0 en el host.
  if [ "$ESTADO" = "running" ]; then
    # Columnas: USER HUSER (una línea de cabecera).
    MALOS=$(podman top "$C" user huser 2>/dev/null | tail -n +2 | awk '$1=="root" || $1=="0" || $2=="0" || $2=="root"')
    if [ -n "$MALOS" ]; then
      fallo "$C: procesos con UID 0: $(echo "$MALOS" | tr '\n' ';')"
    else
      ok "procesos sin UID 0 (podman top user huser)"
    fi
  fi

  # Capacidades: ninguna efectiva ni añadida.
  CAPS=$(podman inspect --format '{{.EffectiveCaps}}' "$C")
  case "$CAPS" in "[]"|"<no value>"|"") ok "sin capacidades efectivas" ;; *) fallo "$C: EffectiveCaps=$CAPS" ;; esac
  CAPADD=$(podman inspect --format '{{.HostConfig.CapAdd}}' "$C")
  case "$CAPADD" in "[]"|"<no value>"|"") ;; *) fallo "$C: CapAdd=$CAPADD" ;; esac

  SECOPT=$(podman inspect --format '{{.HostConfig.SecurityOpt}}' "$C")
  case "$SECOPT" in *no-new-privileges*) ok "no-new-privileges" ;; *) fallo "$C: sin no-new-privileges ($SECOPT)" ;; esac

  [ "$(podman inspect --format '{{.HostConfig.ReadonlyRootfs}}' "$C")" = "true" ] && ok "raíz de solo lectura" || fallo "$C: raíz escribible"
  [ "$(podman inspect --format '{{.HostConfig.Privileged}}' "$C")" = "false" ] || fallo "$C: --privileged"

  RED=$(podman inspect --format '{{.HostConfig.NetworkMode}}' "$C")
  [ "$RED" != "host" ] || fallo "$C: network_mode host"

  MEM=$(podman inspect --format '{{.HostConfig.Memory}}' "$C")
  CPU=$(podman inspect --format '{{.HostConfig.NanoCpus}} {{.HostConfig.CpuQuota}}' "$C")
  [ "${MEM:-0}" != "0" ] && ok "límite de memoria $MEM" || fallo "$C: sin límite de memoria"
  [ "$CPU" != "0 0" ] && ok "límite de CPU ($CPU)" || fallo "$C: sin límite de CPU"

  # Montajes prohibidos: sockets del motor y directorios del sistema.
  for M in $(podman inspect --format '{{range .Mounts}}{{.Source}} {{end}}' "$C"); do
    case "$M" in
      *.sock|*/docker.sock|*/podman.sock) fallo "$C: monta un socket ($M)" ;;
      /|/etc|/etc/*|/var|/var/run|/var/run/*|/run/podman*|/proc|/proc/*|/sys|/sys/*|/dev|/dev/*) fallo "$C: monta un directorio del sistema ($M)" ;;
    esac
  done

  # Puertos publicados: solo los servicios permitidos y > 1024.
  PUERTOS=$(podman inspect --format '{{range $p, $b := .HostConfig.PortBindings}}{{range $b}}{{.HostPort}} {{end}}{{end}}' "$C")
  if [ -n "$(echo "$PUERTOS" | tr -d ' ')" ]; then
    case " $PUBLICADOS " in
      *" $SERVICIO "*)
        for P in $PUERTOS; do [ "$P" -gt 1024 ] || fallo "$C: puerto publicado $P ≤ 1024"; done
        ok "publica $PUERTOS" ;;
      *) fallo "$C: publica puertos ($PUERTOS) y no está en la lista ($PUBLICADOS)" ;;
    esac
  fi

  # Healthcheck (si el contenedor lo tiene) en estado healthy.
  if [ "$ESTADO" = "running" ]; then
    SALUD=$(podman inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$C" 2>/dev/null || true)
    if [ -n "$SALUD" ] && [ "$SALUD" != "healthy" ]; then fallo "$C: salud=$SALUD"; fi
  fi
done

if [ "$FALLOS" -gt 0 ]; then
  echo "[TX-CONT-01] FALLA: $FALLOS incumplimientos"
  exit 1
fi
echo "[TX-CONT-01] PASA"
