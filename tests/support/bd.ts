// Lectura y fabricación de estado en la BD de pruebas (docs/testing.md §8.1).
// Único sitio con nombres de columna de sessions/users (riesgo residual de §8.1).
import type pg from 'pg';

export interface FilaUsuario {
  id: string;
  name: string;
  role: string;
  pin_hash: string;
  pin_digits: number;
  must_change_pin: boolean;
  active: boolean;
  failed_attempts: number;
  locked_until: Date | null;
  locked_manual: boolean;
}

export interface FilaSesion {
  id: string;
  token_hash: Buffer;
  user_id: string;
  created_at: Date;
  last_activity_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}

export async function usuario(bd: pg.Pool, id: string): Promise<FilaUsuario> {
  const r = await bd.query<FilaUsuario>(
    `SELECT id, name, role, pin_hash, pin_digits, must_change_pin, active,
            failed_attempts, locked_until, locked_manual
       FROM users WHERE id = $1`,
    [id],
  );
  if (r.rowCount !== 1) throw new Error(`usuario ${id} no encontrado`);
  return r.rows[0];
}

export async function usuarioPorNombre(bd: pg.Pool, nombre: string): Promise<FilaUsuario | undefined> {
  const r = await bd.query<FilaUsuario>(
    `SELECT id, name, role, pin_hash, pin_digits, must_change_pin, active,
            failed_attempts, locked_until, locked_manual
       FROM users WHERE lower(name) = lower($1)`,
    [nombre],
  );
  return r.rows[0];
}

export async function sesionesDe(bd: pg.Pool, userId: string): Promise<FilaSesion[]> {
  const r = await bd.query<FilaSesion>(
    `SELECT id, token_hash, user_id, created_at, last_activity_at, expires_at, revoked_at
       FROM sessions WHERE user_id = $1 ORDER BY created_at`,
    [userId],
  );
  return r.rows;
}

export async function fabricarBloqueo(
  bd: pg.Pool,
  userId: string,
  o: { fallos: number; hasta?: Date | null; indefinido?: boolean },
): Promise<void> {
  await bd.query(
    `UPDATE users SET failed_attempts = $2, locked_until = $3, locked_manual = $4 WHERE id = $1`,
    [userId, o.fallos, o.hasta ?? null, o.indefinido ?? false],
  );
}

export async function fabricarDesactivado(bd: pg.Pool, userId: string): Promise<void> {
  await bd.query(`UPDATE users SET active = false WHERE id = $1`, [userId]);
}

/** ¿Aparece el texto en alguna columna de texto/bytea de estas tablas? (RS-11) */
export async function textoEnTablas(bd: pg.Pool, texto: string, tablas: string[]): Promise<string[]> {
  const encontrados: string[] = [];
  for (const t of tablas) {
    const r = await bd.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM ${t} x WHERE x::text LIKE '%' || $1 || '%'`,
      [texto],
    );
    if (Number(r.rows[0].n) > 0) encontrados.push(t);
  }
  return encontrados;
}

/**
 * Huella del contenido de las tablas de negocio que existan (para "sin efecto
 * en BD" en los 403). `sessions` se excluye: una petición rechazada puede
 * actualizar la actividad de la sesión.
 */
export async function huella(bd: pg.Pool): Promise<string> {
  const tablas = [
    'users',
    'categories',
    'products',
    'daily_counters',
    'orders',
    'order_lines',
    'payments',
    'payment_orders',
    'cash_closings',
    'audit_log',
  ];
  const partes: string[] = [];
  for (const t of tablas) {
    const existe = await bd.query<{ r: string | null }>(`SELECT to_regclass($1)::text AS r`, [t]);
    if (!existe.rows[0].r) continue;
    const h = await bd.query<{ h: string }>(
      `SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) AS h FROM ${t} x`,
    );
    partes.push(`${t}:${h.rows[0].h}`);
  }
  return partes.join(';');
}
