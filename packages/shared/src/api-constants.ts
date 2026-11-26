// Constantes de la API sin dependencias (docs/arquitectura.md §5, §6). Las usa
// el cliente web sin arrastrar zod al bundle (H-2.3-11); `api.ts` las reexporta.

export const API_PREFIX = '/api/v1';
export const SESSION_COOKIE = '__Host-sid';

export const REVOKED_REASONS = ['logout', 'user_disabled', 'pin_reset', 'pin_changed', 'account_locked_manual'] as const;
export type RevokedReason = (typeof REVOKED_REASONS)[number];
