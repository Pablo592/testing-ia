#!/bin/sh
# Inicialización de la BD (solo se ejecuta la primera vez, con el volumen vacío).
# La ejecuta el entrypoint oficial de postgres como UID 1000 (no root).
# Misma configuración en DEV, TESTING, DEMO y PROD (se monta en solo lectura).
#
# Roles (ADR-003, docs/permisos.md §6):
#   - app_owner:  propietario de la BD y del esquema public (DDL; solo migrate). 2 conexiones.
#   - app_rw:     CONNECT + USAGE; el DML por tabla lo concede cada migración. 20 conexiones.
#   - app_backup: solo lectura para pg_dump (SEC-011). 2 conexiones.
#   - monitoring: pg_monitor para postgres_exporter, solo si se monta su secreto (M-05). 2 conexiones.
#
# Secretos: se leen de ficheros en /run/secrets dentro de psql (\set ... `cat`),
# nunca por variables de entorno ni línea de comandos. SEC-015: cada sesión
# desactiva el registro de sentencias, incluido el de sentencias con error, para
# que una contraseña nunca llegue al log del servidor.
set -eu

: "${APP_DB_NAME:?Falta APP_DB_NAME}"

for f in /run/secrets/db_owner_password /run/secrets/db_app_password /run/secrets/db_backup_password; do
  if [ ! -s "$f" ]; then
    echo "10-roles.sh: falta el secreto $f" >&2
    exit 1
  fi
done

ATTRS="LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS"

psql -v ON_ERROR_STOP=1 -v dbname="$APP_DB_NAME" -v attrs="$ATTRS" \
     --username "$POSTGRES_USER" --dbname postgres <<'SQL'
SET log_statement = 'none';
SET log_min_error_statement = 'panic';
SET log_min_duration_statement = -1;
\set owner_pw `cat /run/secrets/db_owner_password`
\set app_pw `cat /run/secrets/db_app_password`
\set backup_pw `cat /run/secrets/db_backup_password`
CREATE ROLE app_owner  :attrs CONNECTION LIMIT 2  PASSWORD :'owner_pw';
CREATE ROLE app_rw     :attrs CONNECTION LIMIT 20 PASSWORD :'app_pw';
CREATE ROLE app_backup :attrs CONNECTION LIMIT 2  PASSWORD :'backup_pw';
\unset owner_pw
\unset app_pw
\unset backup_pw
CREATE DATABASE :"dbname" OWNER app_owner;
REVOKE ALL ON DATABASE :"dbname" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"dbname" TO app_rw, app_backup;
\connect :"dbname"
ALTER SCHEMA public OWNER TO app_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_rw, app_backup;
-- app_backup lee todo lo que cree app_owner en el futuro (solo SELECT).
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public GRANT SELECT ON TABLES TO app_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public GRANT SELECT ON SEQUENCES TO app_backup;
-- Consultas normalizadas sin valores (docs/logging.md §5.4). Requiere
-- shared_preload_libraries=pg_stat_statements en el comando del contenedor.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SQL

# Rol de métricas (M-05). Solo si el entorno monta el secreto (DEMO/PROD con monitorización).
if [ -s /run/secrets/db_monitor_password ]; then
  psql -v ON_ERROR_STOP=1 -v dbname="$APP_DB_NAME" -v attrs="$ATTRS" \
       --username "$POSTGRES_USER" --dbname postgres <<'SQL'
SET log_statement = 'none';
SET log_min_error_statement = 'panic';
SET log_min_duration_statement = -1;
\set mon_pw `cat /run/secrets/db_monitor_password`
CREATE ROLE monitoring :attrs CONNECTION LIMIT 2 PASSWORD :'mon_pw';
\unset mon_pw
GRANT pg_monitor TO monitoring;
GRANT CONNECT ON DATABASE :"dbname" TO monitoring;
SQL
  echo "10-roles.sh: rol monitoring (pg_monitor) creado"
fi

echo "10-roles.sh: roles app_owner/app_rw/app_backup y BD ${APP_DB_NAME} creados"
