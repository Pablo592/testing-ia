#!/bin/sh
# [TX-CMD-01] Humo de los comandos de la imagen real (docs/arquitectura.md
# §2.1, T-41; docs/infraestructura.md §9.2; docs/testing.md §5.8):
# create-initial-manager y unlock-user salen con 0 / 2 / 1 y ninguna salida
# (stdout + stderr) contiene el PIN. La lógica ya está probada en proceso
# (tests/integration/api/HU-01-comandos-cli.int.test.ts); aquí solo se
# comprueba el envoltorio de la imagen.
#
# Se ejecuta EN EL HOST con el usuario sin privilegios, con db healthy y
# migrate hecho (BD sin encargados). Lo llama tests/run.sh en la suite
# containers. Si el servicio no existe en compose.test.yaml, sale con 0 y
# "SKIP" explícito (no debería ocurrir desde la 2.1l).
#
# Uso: sh tests/containers/tx-cmd-01.sh <proyecto>
# Variables: TEST_SECRETS_DIR (initial_manager_name e initial_manager_pin, de run.sh).
set -eu

if [ "$(id -u)" -eq 0 ]; then
  echo "TX-CMD-01: ERROR: no ejecutar como root" >&2
  exit 1
fi
[ $# -ge 1 ] || { echo "uso: $0 <proyecto>" >&2; exit 2; }
PROYECTO=$1
SERVICIO=commands

if ! grep -Eq "^  ${SERVICIO}:[[:space:]]*$" compose.test.yaml; then
  echo "[TX-CMD-01] SKIP: no existe el servicio '$SERVICIO' en compose.test.yaml (T-41)"
  exit 0
fi
: "${TEST_SECRETS_DIR:?Falta TEST_SECRETS_DIR}"
PIN=$(cat "$TEST_SECRETS_DIR/initial_manager_pin")
NOMBRE=$(cat "$TEST_SECRETS_DIR/initial_manager_name")
[ -n "$PIN" ] && [ -n "$NOMBRE" ] || { echo "[TX-CMD-01] FALLA: faltan initial_manager_name/pin" ; exit 1; }

PC="podman-compose -f compose.test.yaml -p $PROYECTO"
FALLOS=0
SALIDA=$(mktemp -p "$TEST_SECRETS_DIR" tx-cmd.XXXXXXXX)
trap 'rm -f "$SALIDA"' EXIT

# $1 código esperado, $2 descripción, resto: comando del contenedor (vacío = el por defecto)
caso() {
  esperado=$1; que=$2; shift 2
  set +e
  $PC --profile commands run --rm --no-deps "$SERVICIO" "$@" >"$SALIDA" 2>&1
  rc=$?
  set -e
  if [ "$rc" -ne "$esperado" ]; then
    echo "  INCUMPLE: $que: código $rc, esperado $esperado"
    FALLOS=$((FALLOS + 1))
  else
    echo "  ok: $que → $rc"
  fi
  # Nunca se imprime la salida (podría contener el PIN): solo se busca en ella.
  if grep -qF -- "$PIN" "$SALIDA"; then
    echo "  INCUMPLE: $que: la salida contiene el PIN"
    FALLOS=$((FALLOS + 1))
  fi
}

INEXISTENTE="no-existe-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')"

echo "[TX-CMD-01] proyecto $PROYECTO, servicio $SERVICIO"
caso 0 "create-initial-manager (BD sin encargados → created)"
caso 0 "create-initial-manager otra vez (skipped)"
caso 1 "create-initial-manager con un argumento de más" node dist/commands/create-initial-manager.js sobra
caso 0 "unlock-user del encargado inicial (unlocked)" node dist/commands/unlock-user.js "$NOMBRE"
caso 2 "unlock-user de un nombre que no existe (not_found)" node dist/commands/unlock-user.js "$INEXISTENTE"
caso 1 "unlock-user sin argumentos (uso)" node dist/commands/unlock-user.js

if [ "$FALLOS" -gt 0 ]; then
  echo "[TX-CMD-01] FALLA: $FALLOS incumplimientos"
  exit 1
fi
echo "[TX-CMD-01] PASA"
