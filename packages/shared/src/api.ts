// Esquemas y DTOs de la API de HU-01 (docs/arquitectura.md §5, §5.1).
// Los usan el servidor (validación en el borde) y el cliente (tipos).
import { z } from 'zod';
import type { Permission } from './permissions.ts';
import type { Role } from './pin/index.ts';

export const API_PREFIX = '/api/v1';
export const SESSION_COOKIE = '__Host-sid';

/** Formato único de error (§5). `message` es solo diagnóstico: la UI decide por `code`. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}

export const REVOKED_REASONS = ['logout', 'user_disabled', 'pin_reset', 'pin_changed', 'account_locked_manual'] as const;
export type RevokedReason = (typeof REVOKED_REASONS)[number];

/** `details` del 401 UNAUTHENTICATED: exactamente estas formas (§5, 2.1i). */
export const UnauthenticatedDetails = z.union([
  z.object({ reason: z.enum(['idle', 'absolute']) }).strict(),
  z.object({ reason: z.literal('revoked'), revokedReason: z.enum(REVOKED_REASONS) }).strict(),
]);
export type UnauthenticatedDetails = z.infer<typeof UnauthenticatedDetails>;

/** Longitud máxima admitida en un campo de PIN recibido (se valida antes de cualquier hash). */
export const PIN_FIELD_MAX = 64;

export const LoginBody = z
  .object({
    name: z.string().min(1).max(30),
    pin: z.string().min(1).max(PIN_FIELD_MAX),
  })
  .strict();
export type LoginBody = z.infer<typeof LoginBody>;

/** `newPin` se valida además con `validatePin(newPin, rol)` (regla de PIN por rol). */
export const ChangePinBody = z
  .object({
    currentPin: z.string().min(1).max(PIN_FIELD_MAX),
    newPin: z.string().max(PIN_FIELD_MAX),
  })
  .strict();
export type ChangePinBody = z.infer<typeof ChangePinBody>;

/** Rutas sin cuerpo: se admite ninguno o `{}`. */
export const EmptyBody = z.object({}).strict().optional();

export interface LoginOption {
  name: string;
  role: Role;
}

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  mustChangePin: boolean;
}

export interface LoginResponse {
  user: SessionUser;
}

export interface LocalConfig {
  tableCount?: number;
  delayThresholdMinutes?: number;
}

export interface MeResponse {
  user: SessionUser;
  permissions: Permission[];
  session: { expiresAt: string };
  serverTime: string;
  businessDate: string;
  localConfig: LocalConfig;
}

/** Eventos SSE de HU-01 (§6). */
export interface HelloEvent {
  serverTime: string;
  businessDate: string;
}
export interface SessionRevokedEvent {
  reason: RevokedReason;
  emittedAt: string;
}
