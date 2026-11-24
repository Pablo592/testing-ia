// Constructores de datos de integración. Hasta HU-07 (POST /staff) los usuarios
// se insertan en BD con el hash de createPinHasher (tests/README.md §4).
import { randomUUID } from 'node:crypto';
import { hasherDePrueba, type Ctx } from './app.ts';
import { nombreUnico, pinAleatorio, type Rol } from './datos.ts';

export { nombreUnico, pinAleatorio, pinIncorrecto, ROL_TEXTO, type Rol } from './datos.ts';

export interface UsuarioPrueba {
  id: string;
  nombre: string;
  rol: Rol;
  pin: string;
}

export interface OpcionesUsuario {
  rol: Rol;
  nombre?: string;
  pin?: string;
  activo?: boolean;
  pinProvisional?: boolean;
  fallos?: number;
  bloqueadoHasta?: Date | null;
  bloqueoIndefinido?: boolean;
}

export async function crearUsuario(ctx: Pick<Ctx, 'bd' | 'reloj'>, o: OpcionesUsuario): Promise<UsuarioPrueba> {
  const id = randomUUID();
  const nombre = o.nombre ?? nombreUnico(o.rol.slice(0, 1));
  const pin = o.pin ?? pinAleatorio(o.rol);
  const hash = await hasherDePrueba().hash(pin);
  const ahora = ctx.reloj.now();
  await ctx.bd.query(
    `INSERT INTO users (id, name, role, pin_hash, pin_digits, must_change_pin, active,
                        failed_attempts, locked_until, locked_manual, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
    [
      id,
      nombre,
      o.rol,
      hash,
      pin.length,
      o.pinProvisional ?? false,
      o.activo ?? true,
      o.fallos ?? 0,
      o.bloqueadoHasta ?? null,
      o.bloqueoIndefinido ?? false,
      ahora,
    ],
  );
  return { id, nombre, rol: o.rol, pin };
}
