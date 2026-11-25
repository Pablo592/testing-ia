// Comandos de operación (docs/arquitectura.md §2.1; HU-01 encargado inicial,
// HU-01/CA-F06 desbloqueo por el operador). Actor `system` en auditoría
// (actor_id nulo). Nunca registran ni devuelven el PIN.
import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import type { PinRule } from '@mi-app/shared/pin';
import { systemClock, type Clock } from '../clock.ts';
import type { DatabaseDeps } from '../config.ts';
import { createDb } from '../db/database.ts';
import { createLogger } from '../logging/logger.ts';
import { createMetrics } from '../metrics/metrics.ts';
import type { PinHasher } from '../modules/auth/hasher.ts';
import { createAuthModule } from '../modules/auth/verify-pin.ts';

export interface CommandDeps {
  clock: Clock;
  database: DatabaseDeps;
  pinHasher: PinHasher;
  logDestination?: NodeJS.WritableStream;
}

/** El PIN provisional no cumple las reglas de encargado. El mensaje nunca contiene el PIN. */
export class InvalidPinError extends Error {
  readonly rule: PinRule;
  constructor(rule: PinRule) {
    super(`El PIN provisional no cumple las reglas de PIN de encargado (regla: ${rule})`);
    this.name = 'InvalidPinError';
    this.rule = rule;
  }
}

export class InvalidNameError extends Error {
  constructor() {
    super('El nombre del encargado inicial debe tener entre 1 y 30 caracteres');
    this.name = 'InvalidNameError';
  }
}

/** Cerrojo consultivo de la creación del encargado inicial (dos ejecuciones a la vez). */
export const INITIAL_MANAGER_LOCK = 7_318_401_002;
const COMMAND_POOL_MAX = 4;

export async function createInitialManager(deps: CommandDeps, input: { name: string; pin: string }): Promise<'created' | 'skipped'> {
  const log = createLogger({ destination: deps.logDestination, service: 'app' });
  const handle = createDb(deps.database, log, COMMAND_POOL_MAX);
  // Solo el módulo auth recibe el hasher: hashNewPin valida las reglas antes del hash.
  const auth = createAuthModule({
    db: handle.db,
    hasher: deps.pinHasher,
    clock: deps.clock,
    log,
    metrics: createMetrics(),
    onSessionsRevoked: () => 0,
  });
  try {
    return await handle.db.transaction().execute(async (trx) => {
      await sql`SELECT pg_advisory_xact_lock(${INITIAL_MANAGER_LOCK})`.execute(trx);
      const existing = await trx.selectFrom('users').select('id').where('role', '=', 'manager').limit(1).executeTakeFirst();
      if (existing) {
        log.info({ event: 'staff.initial_manager.skipped', category: 'security' }, 'Ya existe un encargado: no se crea ninguno');
        return 'skipped' as const;
      }
      const hashed = await auth.hashNewPin(input.pin, 'manager');
      if (!hashed.ok) throw new InvalidPinError(hashed.rule);
      const name = input.name.trim();
      if (name.length < 1 || name.length > 30) throw new InvalidNameError();
      const now = deps.clock.now();
      const id = randomUUID();
      await trx
        .insertInto('users')
        .values({
          id,
          name,
          role: 'manager',
          pin_hash: hashed.hash,
          pin_digits: input.pin.length,
          must_change_pin: true,
          active: true,
          failed_attempts: 0,
          locked_until: null,
          locked_manual: false,
          created_at: now,
          updated_at: now,
        })
        .execute();
      await trx
        .insertInto('audit_log')
        .values({
          at: now,
          actor_id: null,
          authorized_by: null,
          action: 'user.created',
          entity_type: 'user',
          entity_id: id,
          details: JSON.stringify({ role: 'manager', initial_manager: true }),
        })
        .execute();
      log.warn({ event: 'staff.initial_manager.created', category: 'security', target_user_id: id }, 'Encargado inicial creado');
      return 'created' as const;
    });
  } finally {
    auth.stop();
    await handle.destroy();
  }
}

export async function unlockUser(deps: Pick<CommandDeps, 'clock' | 'database' | 'logDestination'>, name: string): Promise<'unlocked' | 'not_found'> {
  const log = createLogger({ destination: deps.logDestination, service: 'app' });
  const handle = createDb(deps.database, log, COMMAND_POOL_MAX);
  const clock = deps.clock ?? systemClock;
  try {
    return await handle.db.transaction().execute(async (trx) => {
      const user = await trx
        .selectFrom('users')
        .select(['id', 'locked_until', 'locked_manual'])
        .where(sql`lower(name)`, '=', sql`lower(${name})`)
        .forUpdate()
        .executeTakeFirst();
      if (!user) return 'not_found' as const;
      const now = clock.now();
      const wasLockKind = user.locked_manual ? 'manual' : user.locked_until && user.locked_until.getTime() > now.getTime() ? 'temporary' : 'none';
      await trx
        .updateTable('users')
        .set({ failed_attempts: 0, locked_until: null, locked_manual: false, updated_at: now })
        .where('id', '=', user.id)
        .execute();
      await trx
        .insertInto('audit_log')
        .values({
          at: now,
          actor_id: null,
          authorized_by: null,
          action: 'user.unlocked',
          entity_type: 'user',
          entity_id: user.id,
          details: JSON.stringify({ was_lock_kind: wasLockKind }),
        })
        .execute();
      log.info(
        { event: 'staff.unlocked', category: 'security', target_user_id: user.id, was_lock_kind: wasLockKind, by_user_id: 'system' },
        'Usuario desbloqueado por el operador',
      );
      return 'unlocked' as const;
    });
  } finally {
    await handle.destroy();
  }
}
