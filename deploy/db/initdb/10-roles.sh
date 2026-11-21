#!/bin/sh
# Inicialización de la BD (solo se ejecuta la primera vez, con el volumen vacío).
# La ejecuta el entrypoint oficial de postgres como UID 1000 (no root).
#
# Crea los dos roles de ADR-003 y la base de datos de la aplicación:
#   - app_owner: propietario de la BD y del esquema public (DDL; lo usa migrate).
#   - app_rw:    solo CONNECT + USAGE; los permisos DML sobre las tablas los
#                concede la propia migración (Developer), ADR-003.
# Las contraseñas se leen de archivos de secreto montados en /run/secrets; no
# pasan por variables de entorno ni por la línea de comandos (se leen dentro de
# psql con \set ... `cat ...`).
set -eu

: "${APP_DB_NAME:?Falta APP_DB_NAME}"

for f in /run/secrets/db_owner_password /run/secrets/db_app_password; do
  if [ ! -s "$f" ]; then
    echo "10-roles.sh: falta el secreto $f" >&2
    exit 1
  fi
done

psql -v ON_ERROR_STOP=1 -v dbname="$APP_DB_NAME" \
     --username "$POSTGRES_USER" --dbname postgres <<'SQL'
\set owner_pw `cat /run/secrets/db_owner_password`
\set app_pw `cat /run/secrets/db_app_password`
CREATE ROLE app_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'owner_pw';
CREATE ROLE app_rw    LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'app_pw';
\unset owner_pw
\unset app_pw
CREATE DATABASE :"dbname" OWNER app_owner;
REVOKE ALL ON DATABASE :"dbname" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"dbname" TO app_rw;
\connect :"dbname"
ALTER SCHEMA public OWNER TO app_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_rw;
SQL

echo "10-roles.sh: roles app_owner/app_rw y BD ${APP_DB_NAME} creados"
