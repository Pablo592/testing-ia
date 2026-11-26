// Esquemas y DTOs de la API de HU-01 (docs/arquitectura.md §5, §5.1).
// Los usan el servidor (validación en el borde) y el cliente (tipos).
import { z } from 'zod';
import type { Permission } from './permissions.ts';
import type { Role } from './pin/index.ts';

import { REVOKED_REASONS, type RevokedReason } from './api-constants.ts';

export { API_PREFIX, SESSION_COOKIE, REVOKED_REASONS, type RevokedReason } from './api-constants.ts';

/** Formato único de error (§5). `message` es solo diagnóstico: la UI decide por `code`. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}


/** `details` del 401 UNAUTHENTICATED: exactamente estas formas (§5, 2.1i). */
export const UnauthenticatedDetails = z.union([
  z.object({ reason: z.enum(['idle', 'absolute']) }).strict(),
  z.object({ reason: z.literal('revoked'), revokedReason: z.enum(REVOKED_REASONS) }).strict(),
]);
export type UnauthenticatedDetails = z.infer<typeof UnauthenticatedDetails>;

/** Longitud máxima admitida en un campo de PIN recibido (se valida antes de cualquier hash). */
export const PIN_FIELD_MAX = 64;

/**
 * Texto recibido por la API (SEC-042): sin caracteres de control C0 ni DEL
 * (`NUL` rompe la consulta en PostgreSQL). Incidencia `rule: 'format'`.
 * Pendiente del software-engineer: regla general de texto en docs/arquitectura.md §5.
 */
export const NO_CONTROL_CHARS = /^[^\u0000-\u001F\u007F]*$/;
export function apiText(min: number, max: number) {
  return z.string().min(min).max(max).regex(NO_CONTROL_CHARS);
}

export const LoginBody = z
  .object({
    name: apiText(1, 30),
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
