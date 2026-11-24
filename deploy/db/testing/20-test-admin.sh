#!/bin/sh
# SOLO TESTING (T-28, docs/infraestructura.md §9.1). Nunca se monta en DEV,
# DEMO ni PROD: compose.test.yaml lo monta como fichero suelto en
# /docker-entrypoint-initdb.d/20-test-admin.sh, después de 10-roles.sh.
# Lo ejecuta el entrypoint oficial de postgres, como UID 1000, una sola vez
# (BD en tmpfs: en cada ejecución de tests).
#
# Crea:
#   - test_admin:   rol de la ejecución con CREATEDB (y nada más) para que el
#                   ejecutor de integración cree y borre BD aisladas a partir de
#                   la plantilla (docs/testing.md §9.2, RS-09). 4 conexiones.
#                   NOSUPERUSER NOCREATEROLE NOREPLICATION NOBYPASSRLS; no es
#                   miembro de ningún rol; sin CONNECT en cafeteria ni en la
#                   plantilla (para clonar no le hace falta).
#   - app_template: BD plantilla, propiedad de app_owner y con los mismos
#                   permisos que cafeteria (10-roles.sh). La migra el servicio
#                   efímero migrate-template. IS_TEMPLATE true: cualquier rol
#                   con CREATEDB puede clonarla sin ser su propietario.
#
# Dos condiciones, para que no se active por error fuera de TESTING:
#   MI_APP_ENTORNO=testing (solo lo fija compose.test.yaml) y el secreto
#   /run/secrets/db_test_admin_password (aleatorio por ejecución, tests/run.sh).
# Secretos y registro: mismas medidas que 10-roles.sh (SEC-015, SEC-020).
set -eu

if [ "${MI_APP_ENTORNO:-}" != "testing" ]; then
  echo "20-test-admin.sh: MI_APP_ENTORNO no es 'testing'; este script solo es de TESTING" >&2
  exit 1
fi
if [ ! -s /run/secrets/db_test_admin_password ]; then
  echo "20-test-admin.sh: falta el secreto /run/secrets/db_test_admin_password" >&2
  exit 1
fi
: "${APP_DB_NAME:?Falta APP_DB_NAME}"
TEMPLATE_DB=${APP_TEMPLATE_DB:-app_template}

psql -v ON_ERROR_STOP=1 -v tpl="$TEMPLATE_DB" \
     --username "$POSTGRES_USER" --dbname postgres <<'SQL'
SET log_statement = 'none';
SET log_min_error_statement = 'panic';
SET log_min_duration_statement = -1;
SET pg_stat_statements.track_utility = off;
\set adm_pw `cat /run/secrets/db_test_admin_password`
CREATE ROLE test_admin LOGIN NOSUPERUSER CREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  CONNECTION LIMIT 4 PASSWORD :'adm_pw';
\unset adm_pw
CREATE DATABASE :"tpl" OWNER app_owner;
REVOKE ALL ON DATABASE :"tpl" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"tpl" TO app_rw;
ALTER DATABASE :"tpl" IS_TEMPLATE true;
\connect :"tpl"
ALTER SCHEMA public OWNER TO app_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_rw;
SQL

psql -v ON_ERROR_STOP=1 -q --username "$POSTGRES_USER" --dbname "$APP_DB_NAME" \
     -c 'SELECT pg_stat_statements_reset();' >/dev/null

echo "20-test-admin.sh: rol test_admin (CREATEDB) y plantilla ${TEMPLATE_DB} creados (solo TESTING)"
