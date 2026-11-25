// Matriz rol → permisos (docs/permisos.md §3.2, revisión 1.4c; docs/arquitectura.md §7).
// La autoridad es el servidor: la UI usa esta misma tabla solo para ocultar opciones.
// Si difiere de docs/permisos.md, manda ese documento hasta que se corrijan los dos.
import type { Role } from './pin/index.ts';

export type { Role } from './pin/index.ts';

export const PERMISSIONS = [
  'session:self',
  'events:subscribe',
  'telemetry:write',
  'menu:read',
  'product:set_availability',
  'menu:manage',
  'order:create',
  'order:read',
  'order:modify',
  'order:cancel',
  'order:serve',
  'kitchen:read',
  'kitchen:transition',
  'payment:create',
  'payment:read',
  'payment:void',
  'approval:request',
  'approval:grant',
  'staff:read',
  'staff:manage',
  'staff:unlock',
  'reports:read',
  'reports:close',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const COMMON: readonly Permission[] = ['session:self', 'events:subscribe', 'telemetry:write', 'menu:read'];

export const PERMISSIONS_BY_ROLE: Readonly<Record<Role, readonly Permission[]>> = Object.freeze({
  waiter: Object.freeze([
    ...COMMON,
    'product:set_availability',
    'order:create',
    'order:read',
    'order:modify',
    'order:cancel',
    'order:serve',
    'payment:create',
    'payment:read',
    'approval:request',
  ] as Permission[]),
  kitchen: Object.freeze([...COMMON, 'kitchen:read', 'kitchen:transition'] as Permission[]),
  manager: Object.freeze([...PERMISSIONS] as Permission[]),
});

const SETS: Readonly<Record<Role, ReadonlySet<string>>> = {
  waiter: new Set(PERMISSIONS_BY_ROLE.waiter),
  kitchen: new Set(PERMISSIONS_BY_ROLE.kitchen),
  manager: new Set(PERMISSIONS_BY_ROLE.manager),
};

/** Denegación por defecto: un rol o un permiso desconocidos dan `false`. */
export function hasPermission(role: Role, permission: string): boolean {
  const set = Object.prototype.hasOwnProperty.call(SETS, role) ? SETS[role] : undefined;
  return set?.has(permission) ?? false;
}

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
