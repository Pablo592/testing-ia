// HU-01: usuarios, sesiones y auditoría (docs/arquitectura.md §4.1).
// Se ejecuta con app_owner (DDL). app_rw recibe solo el DML necesario:
// sin DELETE en users ni en audit_log; audit_log además inmutable por trigger.
export const name = '0001_hu01_auth';

export const sql = `
CREATE TABLE users (
  id              uuid PRIMARY KEY,
  name            varchar(30) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 30),
  role            text NOT NULL CHECK (role IN ('waiter', 'kitchen', 'manager')),
  pin_hash        text NOT NULL,
  pin_digits      smallint NOT NULL CHECK (pin_digits BETWEEN 4 AND 6),
  must_change_pin boolean NOT NULL DEFAULT true,
  active          boolean NOT NULL DEFAULT true,
  failed_attempts smallint NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until    timestamptz NULL,
  locked_manual   boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
-- Nombre único sin distinguir mayúsculas (login por lower(name)).
CREATE UNIQUE INDEX users_name_lower_key ON users (lower(name));
CREATE INDEX users_role_idx ON users (role);

CREATE TABLE sessions (
  id               uuid PRIMARY KEY,
  token_hash       bytea NOT NULL UNIQUE,
  user_id          uuid NOT NULL REFERENCES users (id),
  created_at       timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL,
  expires_at       timestamptz NOT NULL,
  revoked_at       timestamptz NULL,
  revoked_reason   text NULL CHECK (revoked_reason IN ('logout', 'user_disabled', 'pin_reset', 'pin_changed', 'account_locked_manual')),
  expired_reason   text NULL CHECK (expired_reason IN ('idle', 'absolute')),
  user_agent       varchar(200) NULL
);
-- Sesiones abiertas de un usuario (revocación de todas al bloquear o cambiar el PIN).
CREATE INDEX sessions_user_open_idx ON sessions (user_id) WHERE revoked_at IS NULL;

CREATE TABLE audit_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at            timestamptz NOT NULL,
  actor_id      uuid NULL REFERENCES users (id),
  authorized_by uuid NULL REFERENCES users (id),
  action        text NOT NULL,
  entity_type   text NOT NULL,
  entity_id     text NULL,
  details       jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id);
CREATE INDEX audit_log_at_idx ON audit_log (at);

CREATE FUNCTION audit_log_immutable() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log es inmutable';
END
$$;
CREATE TRIGGER audit_log_no_update_delete BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_immutable();

GRANT SELECT, INSERT, UPDATE ON users TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO app_rw;
GRANT SELECT, INSERT ON audit_log TO app_rw;
GRANT USAGE ON SEQUENCE audit_log_id_seq TO app_rw;
`;
