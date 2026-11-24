// HU-01/CA-F01, CA-F02, CA-F03, CA-N02; RS-18 (comparación con la tabla esperada, T-18).
// Oráculo: docs/permisos.md §3.2, escrito a mano (principio 2 de docs/testing.md).
// Si docs/permisos.md cambia, se cambia esta tabla y se anota la fecha.
// Revisado contra docs/permisos.md revisión 1.4c (2026-11-23).
import { describe, expect, test } from 'vitest';
import { hasPermission, PERMISSIONS_BY_ROLE } from '@mi-app/shared/permissions';

import { PERMISOS_ESPERADOS as ESPERADO, type Rol } from '../../support/oraculo-permisos.ts';

const TODOS = [...new Set(Object.values(ESPERADO).flat())].sort();

describe('[HU-01/CA-N02][RS-18] Matriz de permisos de packages/shared frente a docs/permisos.md §3', () => {
  for (const rol of Object.keys(ESPERADO) as Rol[]) {
    test(`[HU-01/CA-N02][RS-18] ${rol}: exactamente los permisos de docs/permisos.md`, () => {
      expect([...PERMISSIONS_BY_ROLE[rol]].sort()).toEqual([...ESPERADO[rol]].sort());
    });
  }

  test('[HU-01/CA-N02] hasPermission coincide con la tabla para cada rol × permiso', () => {
    for (const rol of Object.keys(ESPERADO) as Rol[]) {
      for (const p of TODOS) expect(hasPermission(rol, p), `${rol} × ${p}`).toBe(ESPERADO[rol].includes(p));
    }
  });

  test('[HU-01/CA-N02] no existe ningún permiso settings:* (HU-09 fuera del MVP)', () => {
    const todos = Object.values(PERMISSIONS_BY_ROLE).flat();
    expect(todos.filter((p) => p.startsWith('settings:'))).toEqual([]);
  });

  test('[HU-01/CA-N02] un permiso desconocido se deniega a todos los roles', () => {
    for (const rol of Object.keys(ESPERADO) as Rol[]) expect(hasPermission(rol, 'no:existe')).toBe(false);
  });
});

describe('Permisos por rol según HU-01', () => {
  test('[HU-01/CA-F01] el camarero no tiene gestión de menú ni de usuarios', () => {
    for (const p of ['menu:manage', 'staff:read', 'staff:manage', 'staff:unlock', 'reports:read', 'reports:close']) {
      expect(hasPermission('waiter', p), p).toBe(false);
    }
    expect(hasPermission('waiter', 'order:create')).toBe(true);
  });

  test('[HU-01/CA-F02] barra ve la cola y no puede crear, cobrar ni cancelar pedidos', () => {
    expect(hasPermission('kitchen', 'kitchen:read')).toBe(true);
    expect(hasPermission('kitchen', 'kitchen:transition')).toBe(true);
    for (const p of ['order:create', 'order:cancel', 'order:modify', 'payment:create', 'payment:read', 'payment:void', 'order:read', 'order:serve']) {
      expect(hasPermission('kitchen', p), p).toBe(false);
    }
  });

  test('[HU-01/CA-F03] el encargado tiene todas las funciones (pedidos, cola, cobro, menú, usuarios, resumen)', () => {
    for (const p of TODOS) expect(hasPermission('manager', p), p).toBe(true);
  });
});
