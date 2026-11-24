// Datos de E2E contra la pila real (SystemClock). Hasta HU-07 no hay alta de
// usuarios por API: se insertan en la BD de la ejecución con el hash del mismo
// *pepper* que la app (PIN_PEPPER_FILE). Los tiempos pasados se fabrican en BD
// (docs/testing.md §8.1). Requisitos del ejecutor: hallazgo T-29.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createPinHasher } from '@mi-app/api/auth/hasher';
import { bdApp, secreto } from '../entorno.ts';
import { nombreUnico, pinAleatorio, ROL_TEXTO, type Rol } from '../datos.ts';

export interface UsuarioE2E {
  id: string;
  nombre: string;
  rol: Rol;
  rolTexto: string;
  pin: string;
}

let pool: pg.Pool | undefined;
let hasher: ReturnType<typeof createPinHasher> | undefined;

function bd(): pg.Pool {
  pool ??= new pg.Pool({ ...bdApp(), max: 2 });
  return pool;
}
function h() {
  hasher ??= createPinHasher({ pepper: secreto('PIN_PEPPER_FILE') });
  return hasher;
}

export async function cerrarSemilla(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

export async function sembrarUsuario(o: {
  rol: Rol;
  nombre?: string;
  pin?: string;
  activo?: boolean;
  pinProvisional?: boolean;
}): Promise<UsuarioE2E> {
  const id = randomUUID();
  // Nombres legibles en la rejilla, únicos por ejecución.
  const nombre = o.nombre ?? nombreUnico(ROL_TEXTO[o.rol].slice(0, 3) + ' ');
  const pin = o.pin ?? pinAleatorio(o.rol);
  await bd().query(
    `INSERT INTO users (id, name, role, pin_hash, pin_digits, must_change_pin, active,
                        failed_attempts, locked_until, locked_manual, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NULL, false, now(), now())`,
    [id, nombre, o.rol, await h().hash(pin), pin.length, o.pinProvisional ?? false, o.activo ?? true],
  );
  return { id, nombre, rol: o.rol, rolTexto: ROL_TEXTO[o.rol], pin };
}

/** Usuario fijo (para capturas): lo crea si no existe y devuelve su PIN actual (lo restablece). */
export async function usuarioFijo(nombre: string, rol: Rol): Promise<UsuarioE2E> {
  const pin = pinAleatorio(rol);
  const r = await bd().query<{ id: string }>(
    `INSERT INTO users (id, name, role, pin_hash, pin_digits, must_change_pin, active,
                        failed_attempts, locked_until, locked_manual, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, false, true, 0, NULL, false, now(), now())
     ON CONFLICT ((lower(name))) DO UPDATE
       SET pin_hash = EXCLUDED.pin_hash, pin_digits = EXCLUDED.pin_digits, role = EXCLUDED.role,
           failed_attempts = 0, locked_until = NULL, locked_manual = false, active = true
     RETURNING id`,
    [randomUUID(), nombre, rol, await h().hash(pin), pin.length],
  );
  return { id: r.rows[0].id, nombre, rol, rolTexto: ROL_TEXTO[rol], pin };
}

export async function fabricarBloqueo(
  userId: string,
  o: { fallos: number; segundos?: number; indefinido?: boolean },
): Promise<void> {
  await bd().query(
    `UPDATE users SET failed_attempts = $2,
            locked_until = CASE WHEN $3::int IS NULL THEN NULL ELSE now() + make_interval(secs => $3::int) END,
            locked_manual = $4
      WHERE id = $1`,
    [userId, o.fallos, o.segundos ?? null, o.indefinido ?? false],
  );
}

export async function fabricarFallos(userId: string, fallos: number): Promise<void> {
  await bd().query(`UPDATE users SET failed_attempts = $2 WHERE id = $1`, [userId, fallos]);
}

/** Adelanta la caducidad absoluta de todas las sesiones abiertas del usuario (CA-N06). */
export async function caducarSesiones(userId: string, segundosDesdeAhora: number): Promise<void> {
  await bd().query(
    `UPDATE sessions SET expires_at = now() + make_interval(secs => $2::int)
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId, segundosDesdeAhora],
  );
}

export async function sesionesActivas(userId: string): Promise<number> {
  const r = await bd().query<{ n: string }>(
    `SELECT count(*)::text AS n FROM sessions WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [userId],
  );
  return Number(r.rows[0].n);
}

/**
 * Lleva `last_activity_at` de las sesiones abiertas del usuario `minutos` al
 * pasado (la pila real usa SystemClock). Con ≥ 15 min, la siguiente petición
 * recibe 401 UNAUTHENTICATED con reason idle (docs/arquitectura.md §7).
 */
export async function fabricarInactividad(userId: string, minutos: number): Promise<void> {
  await bd().query(
    `UPDATE sessions SET last_activity_at = now() - make_interval(mins => $2::int)
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId, minutos],
  );
}
