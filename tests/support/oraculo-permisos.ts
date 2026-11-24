// Oráculo de permisos por rol: docs/permisos.md §3.2, escrito a mano
// (principio 2 de docs/testing.md; T-18). Lo usan el unitario de la matriz y
// las pruebas de GET /auth/me. Revisado contra docs/permisos.md revisión 1.4c.
export type Rol = 'waiter' | 'kitchen' | 'manager';

const COMUNES = ['session:self', 'events:subscribe', 'telemetry:write', 'menu:read'];

export const PERMISOS_ESPERADOS: Record<Rol, string[]> = {
  waiter: [
    ...COMUNES,
    'product:set_availability',
    'order:read',
    'order:serve',
    'order:create',
    'order:modify',
    'order:cancel',
    'payment:create',
    'payment:read',
    'approval:request',
  ],
  kitchen: [...COMUNES, 'kitchen:read', 'kitchen:transition'],
  manager: [
    ...COMUNES,
    'product:set_availability',
    'menu:manage',
    'order:read',
    'order:serve',
    'order:create',
    'order:modify',
    'order:cancel',
    'kitchen:read',
    'kitchen:transition',
    'payment:create',
    'payment:read',
    'payment:void',
    'staff:read',
    'staff:manage',
    'staff:unlock',
    'approval:request',
    'approval:grant',
    'reports:read',
    'reports:close',
  ],
};

