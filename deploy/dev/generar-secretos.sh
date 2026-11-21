#!/bin/sh
# Genera los secretos de DEV en .secrets/dev/ (ignorado por git, permisos 0600).
# Nunca escribe secretos en la salida estándar ni en docs/.
#
# Uso (desde la raíz del proyecto):
#   sh deploy/dev/generar-secretos.sh           # crea los que falten
#   sh deploy/dev/generar-secretos.sh --force   # regenera TODOS (ver aviso)
#
# Aviso: las contraseñas de BD solo se aplican al inicializar un volumen vacío.
# Si se regeneran con --force hay que borrar el volumen de datos de DEV
# (ver docs/infraestructura.md, "Reiniciar la BD de DEV").
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
DIR="$ROOT/.secrets/dev"
FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

umask 077
mkdir -p "$DIR"
chmod 700 "$ROOT/.secrets" "$DIR"

# 32 bytes aleatorios en base64url sin relleno (seguros en URLs de conexión).
random_b64() {
  head -c 32 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n'
}

# PIN provisional de 6 dígitos que cumple las reglas básicas de HU-01:
# no todos iguales y no secuencia ascendente/descendente.
random_pin() {
  while :; do
    pin=$(od -An -N8 -tu8 /dev/urandom | tr -d ' \n' | tail -c 6)
    [ "${#pin}" -eq 6 ] || continue
    case "$pin" in
      000000|111111|222222|333333|444444|555555|666666|777777|888888|999999) continue ;;
      012345|123456|234567|345678|456789|987654|876543|765432|654321|543210) continue ;;
    esac
    printf '%s' "$pin"
    return 0
  done
}

write_secret() { # nombre generador
  f="$DIR/$1"
  if [ -s "$f" ] && [ "$FORCE" -eq 0 ]; then
    echo "  = $1 (ya existe, se conserva)"
    return 0
  fi
  tmp="$f.tmp.$$"
  "$2" > "$tmp"
  chmod 600 "$tmp"
  mv "$tmp" "$f"
  echo "  + $1"
}

manager_name() { printf '%s' "encargado"; }

echo "Secretos de DEV en $DIR"
write_secret db_superuser_password random_b64
write_secret db_owner_password     random_b64
write_secret db_app_password       random_b64
write_secret pin_pepper            random_b64
write_secret initial_manager_name  manager_name
write_secret initial_manager_pin   random_pin
echo "Listo. Para ver el PIN provisional del encargado: cat .secrets/dev/initial_manager_pin"
