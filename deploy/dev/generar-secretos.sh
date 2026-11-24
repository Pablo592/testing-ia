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

# Pepper de PIN: 48 bytes aleatorios -> 64 caracteres. config.ts exige un
# contenido >= 32 bytes (docs/arquitectura.md §10.1); se comprueba abajo.
random_pepper() {
  head -c 48 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n'
}

# PIN provisional de 6 dígitos que cumple las reglas de docs/seguridad.md
# §6.1.2 (SEC-014): no todos iguales; sin 4+ dígitos consecutivos ascendentes o
# descendentes en cualquier posición; no formado por un bloque repetido
# (121212, 123123); no "aabbcc"; al menos 4 dígitos distintos (descarta la
# mayoría de PIN frecuentes) y fuera de una lista de PIN frecuentes de 6 dígitos.
# Cuando exista la función de reglas de packages/shared, la validación
# definitiva la hace create-initial-manager (que rechaza el PIN si no cumple).
pin_ok() {
  printf '%s\n' "$1" | awk '
    BEGIN { split("112233 147258 159753 696969 123321 654456 101010 202020 520520 789456 147369 258369 159357 000000", b, " "); for (i in b) bad[b[i]] = 1 }
    {
      p = $0
      if (length(p) != 6 || p !~ /^[0-9]+$/ || (p in bad)) { exit 1 }
      for (i = 1; i <= 6; i++) d[i] = substr(p, i, 1) + 0
      up = 1; dn = 1
      for (i = 2; i <= 6; i++) {
        up = (d[i] == d[i-1] + 1) ? up + 1 : 1
        dn = (d[i] == d[i-1] - 1) ? dn + 1 : 1
        if (up >= 4 || dn >= 4) exit 1
      }
      if (substr(p,1,2) == substr(p,3,2) && substr(p,3,2) == substr(p,5,2)) exit 1
      if (substr(p,1,3) == substr(p,4,3)) exit 1
      if (d[1] == d[2] && d[3] == d[4] && d[5] == d[6]) exit 1
      n = 0; for (i = 1; i <= 6; i++) if (!(d[i] in seen)) { seen[d[i]] = 1; n++ }
      if (n < 4) exit 1
      exit 0
    }'
}

random_pin() {
  while :; do
    pin=$(od -An -N8 -tu8 /dev/urandom | tr -d ' \n' | tail -c 6)
    [ "${#pin}" -eq 6 ] || continue
    if pin_ok "$pin"; then
      printf '%s' "$pin"
      return 0
    fi
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
write_secret db_backup_password    random_b64
write_secret pin_pepper            random_pepper
write_secret initial_manager_name  manager_name
write_secret initial_manager_pin   random_pin
# Un pepper conservado de antes puede ser más corto: se detiene sin mostrarlo.
# (El de 32 bytes en base64url de versiones anteriores tiene 43 y vale.)
if [ "$(wc -c < "$DIR/pin_pepper")" -lt 32 ]; then
  echo "ERROR: .secrets/dev/pin_pepper tiene menos de 32 bytes (config.ts no arrancará)." >&2
  echo "Bórralo y vuelve a ejecutar este script (invalida los PIN guardados en la BD de DEV)." >&2
  exit 1
fi
echo "Listo. Para ver el PIN provisional del encargado: cat .secrets/dev/initial_manager_pin"
