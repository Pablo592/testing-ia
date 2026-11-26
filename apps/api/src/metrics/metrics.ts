// Métricas Prometheus de una instancia de buildApp (docs/logging.md §6;
// docs/arquitectura.md §2.1). Registro PROPIO de la instancia: dos instancias
// en el mismo proceso no se mezclan. Los contadores de las alertas existen a 0
// desde el arranque para cada combinación de sus etiquetas (RS-47).
import { Counter, Gauge, Histogram, Registry } from 'prom-client';
import { PERMISSIONS } from '@mi-app/shared/permissions';
import { ROLES } from '@mi-app/shared/pin';

export const PURPOSES = ['login', 'approval', 'confirm', 'change'] as const;
export type Purpose = (typeof PURPOSES)[number];
export const VERIFY_RESULTS = ['success', 'invalid', 'locked', 'rate_limited_ip', 'rate_limited_session'] as const;
export type VerifyResult = (typeof VERIFY_RESULTS)[number];
export const LOGIN_RESULTS = ['success', 'bad_pin', 'unknown_user', 'locked', 'disabled', 'ip_rate_limited'] as const;
export type LoginResult = (typeof LOGIN_RESULTS)[number];
export const SESSION_END_REASONS = ['logout', 'idle', 'absolute', 'user_disabled', 'pin_reset', 'pin_changed', 'account_locked_manual'] as const;
export type SessionEndReason = (typeof SESSION_END_REASONS)[number];
export const PIN_CHANGE_REJECTIONS = ['wrong_current', 'rule_violation', 'not_provisional'] as const;
export type PinChangeRejection = (typeof PIN_CHANGE_REJECTIONS)[number];
export const INVALID_SESSION_REASONS = ['not_found', 'revoked', 'expired'] as const;

export interface AppMetrics {
  registry: Registry;
  loginAttempts: Counter<'result'>;
  verifications: Counter<'purpose' | 'result'>;
  lockouts: Counter<'kind' | 'purpose' | 'target_role'>;
  sessionsRevokedOnLock: Counter<string>;
  sessionsEnded: Counter<'reason'>;
  pinChangeRejected: Counter<'reason'>;
  invalidSession: Counter<'reason'>;
  authzDenied: Counter<'permission'>;
  csrfRejected: Counter<string>;
  staffPrivilegeChanges: Counter<'kind' | 'new_role'>;
  paymentsVoided: Counter<string>;
  httpRequests: Counter<'method' | 'route' | 'status_class' | 'status'>;
  httpDuration: Histogram<'method' | 'route'>;
  httpInFlight: Gauge<string>;
  sseClients: Gauge<'role'>;
  sseConnections: Counter<'role'>;
  sseDisconnections: Counter<'role' | 'reason'>;
  sseRejected: Counter<'reason'>;
}

export function createMetrics(): AppMetrics {
  const registry = new Registry();
  const registers = [registry];

  const loginAttempts = new Counter({
    name: 'auth_login_attempts_total',
    help: 'Intentos de POST /auth/login por resultado',
    labelNames: ['result'],
    registers,
  });
  const verifications = new Counter({
    name: 'auth_verifications_total',
    help: 'Llamadas a verifyPin por uso y resultado',
    labelNames: ['purpose', 'result'],
    registers,
  });
  const lockouts = new Counter({
    name: 'auth_lockouts_total',
    help: 'Bloqueos de cuenta activados',
    labelNames: ['kind', 'purpose', 'target_role'],
    registers,
  });
  const sessionsRevokedOnLock = new Counter({
    name: 'auth_sessions_revoked_on_lock_total',
    help: 'Sesiones revocadas por bloqueo indefinido',
    registers,
  });
  const sessionsEnded = new Counter({
    name: 'auth_sessions_ended_total',
    help: 'Sesiones terminadas por motivo',
    labelNames: ['reason'],
    registers,
  });
  const pinChangeRejected = new Counter({
    name: 'auth_pin_change_rejected_total',
    help: 'Cambios de PIN rechazados por motivo',
    labelNames: ['reason'],
    registers,
  });
  const invalidSession = new Counter({
    name: 'auth_invalid_session_total',
    help: 'Cookies de sesión que no corresponden a una sesión válida',
    labelNames: ['reason'],
    registers,
  });
  const authzDenied = new Counter({
    name: 'authz_denied_total',
    help: 'Respuestas 403 FORBIDDEN por permiso',
    labelNames: ['permission'],
    registers,
  });
  const csrfRejected = new Counter({ name: 'csrf_rejected_total', help: 'Peticiones rechazadas por Origin', registers });
  const staffPrivilegeChanges = new Counter({
    name: 'staff_privilege_changes_total',
    help: 'Cambios de privilegios del personal',
    labelNames: ['kind', 'new_role'],
    registers,
  });
  const paymentsVoided = new Counter({ name: 'payments_voided_total', help: 'Cobros anulados', registers });
  const httpRequests = new Counter({
    name: 'http_requests_total',
    help: 'Peticiones HTTP',
    labelNames: ['method', 'route', 'status_class', 'status'],
    registers,
  });
  const httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duración de las peticiones HTTP',
    labelNames: ['method', 'route'],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers,
  });
  const httpInFlight = new Gauge({ name: 'http_requests_in_flight', help: 'Peticiones en curso', registers });
  const sseClients = new Gauge({ name: 'sse_clients_connected', help: 'Flujos SSE abiertos', labelNames: ['role'], registers });
  const sseConnections = new Counter({ name: 'sse_connections_total', help: 'Conexiones SSE', labelNames: ['role'], registers });
  const sseDisconnections = new Counter({
    name: 'sse_disconnections_total',
    help: 'Desconexiones SSE',
    labelNames: ['role', 'reason'],
    registers,
  });
  /** SEC-040: flujos rechazados antes de abrirse (tope global de RS-23). */
  const sseRejected = new Counter({ name: 'sse_rejected_total', help: 'Flujos SSE rechazados', labelNames: ['reason'], registers });

  // RS-47: series a 0 desde el arranque.
  for (const result of LOGIN_RESULTS) loginAttempts.inc({ result }, 0);
  for (const purpose of PURPOSES) for (const result of VERIFY_RESULTS) verifications.inc({ purpose, result }, 0);
  for (const kind of ['temporary', 'manual']) {
    for (const purpose of PURPOSES) for (const target_role of ROLES) lockouts.inc({ kind, purpose, target_role }, 0);
  }
  sessionsRevokedOnLock.inc(0);
  for (const reason of SESSION_END_REASONS) sessionsEnded.inc({ reason }, 0);
  for (const reason of PIN_CHANGE_REJECTIONS) pinChangeRejected.inc({ reason }, 0);
  for (const reason of INVALID_SESSION_REASONS) invalidSession.inc({ reason }, 0);
  for (const permission of PERMISSIONS) authzDenied.inc({ permission }, 0);
  authzDenied.inc({ permission: 'none' }, 0);
  csrfRejected.inc(0);
  for (const new_role of ROLES) staffPrivilegeChanges.inc({ kind: 'role_changed', new_role }, 0);
  staffPrivilegeChanges.inc({ kind: 'deactivated', new_role: 'none' }, 0);
  staffPrivilegeChanges.inc({ kind: 'pin_reset', new_role: 'none' }, 0);
  staffPrivilegeChanges.inc({ kind: 'initial_manager', new_role: 'manager' }, 0);
  paymentsVoided.inc(0);
  for (const role of ROLES) sseClients.set({ role }, 0);
  sseRejected.inc({ reason: 'global_limit' }, 0);

  return {
    registry,
    loginAttempts,
    verifications,
    lockouts,
    sessionsRevokedOnLock,
    sessionsEnded,
    pinChangeRejected,
    invalidSession,
    authzDenied,
    csrfRejected,
    staffPrivilegeChanges,
    paymentsVoided,
    httpRequests,
    httpDuration,
    httpInFlight,
    sseClients,
    sseConnections,
    sseDisconnections,
    sseRejected,
  };
}
