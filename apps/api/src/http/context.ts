// Dependencias compartidas por los plugins HTTP de una instancia de buildApp.
import type { FastifyRequest } from 'fastify';
import type { Permission } from '@mi-app/shared/permissions';
import type { Role } from '@mi-app/shared/pin';
import type { Clock } from '../clock.ts';
import type { Db } from '../db/database.ts';
import type { Logger } from '../logging/logger.ts';
import type { AppMetrics } from '../metrics/metrics.ts';
import type { AuthModule } from '../modules/auth/verify-pin.ts';
import type { Hub } from '../realtime/hub.ts';

export interface AuthSession {
  id: string;
  userId: string;
  name: string;
  role: Role;
  mustChangePin: boolean;
  createdAt: Date;
  expiresAt: Date;
}

export interface AppContext {
  db: Db;
  clock: Clock;
  auth: AuthModule;
  hub: Hub;
  metrics: AppMetrics;
  log: Logger;
  publicOrigin: string;
  sessionMaxHours: number;
  installation: { tableCount: number; delayThresholdMinutes: number };
}

/**
 * `config` de cada ruta: EXACTAMENTE uno de `permission`, `public` o
 * `internal` (docs/arquitectura.md §2.1). Sin ninguno → 403 (denegación por defecto).
 */
export interface RouteAuthConfig {
  permission?: Permission;
  public?: true;
  internal?: true;
  /** Permitida con PIN provisional (`/auth/me`, `/auth/pin`, `/auth/logout`, RS-15). */
  allowProvisional?: true;
  /** Solo con PIN provisional: si no, 403 FORBIDDEN en el hook de permiso (T-39). */
  provisionalPinOnly?: true;
  /** `false`: la petición no cuenta como actividad (flujo SSE, telemetría). */
  activity?: false;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthSession | null;
    hadSessionCookie: boolean;
  }
  interface FastifyContextConfig extends RouteAuthConfig {}
  interface FastifyInstance {
    metricsText(): Promise<string>;
  }
}

/** IP del dispositivo (Fastify ya aplica trustProxy); sin el prefijo IPv4 mapeado. */
export function clientIp(request: FastifyRequest): string {
  const ip = request.ip ?? '';
  return ip.startsWith('::ffff:') && ip.includes('.') ? ip.slice(7) : ip;
}

/** Familia de agente reducida (docs/logging.md §4.2); nunca el User-Agent completo. */
export function uaFamily(request: FastifyRequest): string {
  const ua = String(request.headers['user-agent'] ?? '').toLowerCase();
  const os = /android/.test(ua) ? 'android' : /iphone|ipad|ipod/.test(ua) ? 'ios' : /mobile/.test(ua) ? 'mobile' : 'desktop';
  if (/firefox\//.test(ua)) return `firefox-${os}`;
  if (/edg\//.test(ua)) return `edge-${os}`;
  if (/chrome\/|crios\//.test(ua)) return `chrome-${os}`;
  if (/safari\//.test(ua)) return `safari-${os}`;
  return 'other';
}
