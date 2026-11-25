// Tipos de las tablas para Kysely (docs/arquitectura.md §4.1). Solo las de HU-01;
// cada historia añade las suyas con su migración.
import type { ColumnType, Generated } from 'kysely';
import type { Role } from '@mi-app/shared/pin';
import type { RevokedReason } from '@mi-app/shared/api';

type Timestamp = ColumnType<Date, Date, Date>;

export interface UsersTable {
  id: string;
  name: string;
  role: Role;
  pin_hash: string;
  pin_digits: number;
  must_change_pin: boolean;
  active: boolean;
  failed_attempts: number;
  locked_until: Date | null;
  locked_manual: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SessionsTable {
  id: string;
  token_hash: Buffer;
  user_id: string;
  created_at: Timestamp;
  last_activity_at: Timestamp;
  expires_at: Timestamp;
  revoked_at: Date | null;
  /** Motivo de la revocación (para `details.revokedReason` del 401). */
  revoked_reason: RevokedReason | null;
  /** Primera caducidad detectada (`idle` | `absolute`): el 401 la repite y el evento se registra una vez. */
  expired_reason: 'idle' | 'absolute' | null;
  user_agent: string | null;
}

export interface AuditLogTable {
  id: Generated<string>;
  at: Timestamp;
  actor_id: string | null;
  authorized_by: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: ColumnType<unknown, string, string>;
}

export interface SchemaMigrationsTable {
  name: string;
  applied_at: Timestamp;
}

export interface Database {
  users: UsersTable;
  sessions: SessionsTable;
  audit_log: AuditLogTable;
  schema_migrations: SchemaMigrationsTable;
}
