// Hub SSE de GET /api/v1/events (ADR-004; docs/arquitectura.md §6, §7).
// En memoria de la instancia (una sola réplica). HU-01: `hello`, `ping` cada
// 2 s, `session.revoked` + cierre del flujo, caducidad absoluta en el ping y
// la actividad de la barra con la cola abierta (escrituras acotadas, 2.1i).
import { randomUUID } from 'node:crypto';
import type { ServerResponse } from 'node:http';
import { sql } from 'kysely';
import type { Role } from '@mi-app/shared/pin';
import { businessDate } from '@mi-app/shared/business-date';
import type { RevokedReason } from '@mi-app/shared/api';
import type { Clock } from '../clock.ts';
import type { Db } from '../db/database.ts';
import type { Logger } from '../logging/logger.ts';
import type { AppMetrics } from '../metrics/metrics.ts';

export const PING_INTERVAL_MS = 2000;
/** docs/permisos.md §3.2: máx. 2 flujos por sesión (el más antiguo se cierra). */
export const MAX_STREAMS_PER_SESSION = 2;

type CloseReason = 'client_closed' | 'session_revoked' | 'role_changed' | 'write_error' | 'server_shutdown' | 'expired' | 'replaced';

interface Conn {
  id: string;
  sessionId: string;
  userId: string;
  role: Role;
  expiresAt: number;
  res: ServerResponse;
  openedAt: number;
  closed: boolean;
}

export interface StreamSession {
  sessionId: string;
  userId: string;
  role: Role;
  expiresAt: Date;
}

export interface HubDeps {
  db: Db;
  clock: Clock;
  log: Logger;
  metrics: AppMetrics;
  kitchenActivityIntervalMs: number;
}

export class Hub {
  private readonly conns = new Map<string, Conn>();
  /** Sesiones `kitchen` con flujo abierto → número de flujos abiertos. */
  private readonly kitchen = new Map<string, number>();
  private readonly pending = new Set<Promise<unknown>>();
  private readonly pingTimer: NodeJS.Timeout;
  private readonly kitchenTimer: NodeJS.Timeout;
  private stopped = false;
  private readonly deps: HubDeps;

  constructor(deps: HubDeps) {
    this.deps = deps;
    this.pingTimer = setInterval(() => this.ping(), PING_INTERVAL_MS);
    this.pingTimer.unref();
    this.kitchenTimer = setInterval(() => this.kitchenTick(), deps.kitchenActivityIntervalMs);
    this.kitchenTimer.unref();
  }

  /** La sesión de barra tiene la cola abierta (exenta de la inactividad, §7). */
  hasKitchenStream(sessionId: string): boolean {
    return (this.kitchen.get(sessionId) ?? 0) > 0;
  }

  get size(): number {
    return this.conns.size;
  }

  open(res: ServerResponse, s: StreamSession, requestId: string): void {
    const now = this.deps.clock.now();
    // Máximo de flujos por sesión: se cierra el más antiguo (reconexiones).
    const same = [...this.conns.values()].filter((c) => c.sessionId === s.sessionId).sort((a, b) => a.openedAt - b.openedAt);
    while (same.length >= MAX_STREAMS_PER_SESSION) {
      const old = same.shift();
      if (old) this.end(old, 'replaced');
    }
    const conn: Conn = {
      id: randomUUID(),
      sessionId: s.sessionId,
      userId: s.userId,
      role: s.role,
      expiresAt: s.expiresAt.getTime(),
      res,
      openedAt: performance.now(),
      closed: false,
    };
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
      'x-request-id': requestId,
    });
    this.conns.set(conn.id, conn);
    if (conn.role === 'kitchen') this.kitchen.set(conn.sessionId, (this.kitchen.get(conn.sessionId) ?? 0) + 1);
    res.on('close', () => this.onClosed(conn, 'client_closed'));
    res.on('error', () => this.onClosed(conn, 'write_error'));
    this.send(conn, 'hello', { serverTime: now.toISOString(), businessDate: businessDate(now) });
    this.deps.metrics.sseConnections.inc({ role: conn.role });
    this.deps.metrics.sseClients.set({ role: conn.role }, this.countRole(conn.role));
    this.deps.log.info(
      {
        event: 'sse.connected',
        category: 'realtime',
        sse_conn_id: conn.id,
        session_id: conn.sessionId,
        user_id: conn.userId,
        role: conn.role,
        clients_total: this.conns.size,
      },
      'Flujo SSE abierto',
    );
  }

  /** Envía `session.revoked` y cierra los flujos de esas sesiones. Devuelve cuántos cerró. */
  revoke(sessionIds: readonly string[], reason: RevokedReason): number {
    if (sessionIds.length === 0) return 0;
    const set = new Set(sessionIds);
    const emittedAt = this.deps.clock.now().toISOString();
    let closed = 0;
    for (const c of [...this.conns.values()]) {
      if (!set.has(c.sessionId)) continue;
      this.send(c, 'session.revoked', { reason, emittedAt });
      this.end(c, 'session_revoked');
      closed += 1;
    }
    return closed;
  }

  /** Cierre ordenado (preClose): termina los flujos y espera las escrituras pendientes. */
  async close(): Promise<void> {
    if (this.stopped) return;
    clearInterval(this.pingTimer);
    clearInterval(this.kitchenTimer);
    for (const c of [...this.conns.values()]) this.end(c, 'server_shutdown');
    this.stopped = true;
    await Promise.allSettled([...this.pending]);
  }

  private countRole(role: Role): number {
    let n = 0;
    for (const c of this.conns.values()) if (c.role === role) n += 1;
    return n;
  }

  private send(c: Conn, event: string, data: unknown): void {
    if (c.closed) return;
    try {
      c.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      this.end(c, 'write_error');
    }
  }

  private end(c: Conn, reason: CloseReason): void {
    if (c.closed) return;
    this.onClosed(c, reason);
    try {
      c.res.end();
    } catch {
      /* ya cerrado */
    }
  }

  private onClosed(c: Conn, reason: CloseReason): void {
    if (c.closed) return;
    c.closed = true;
    this.conns.delete(c.id);
    this.deps.metrics.sseDisconnections.inc({ role: c.role, reason });
    this.deps.metrics.sseClients.set({ role: c.role }, this.countRole(c.role));
    this.deps.log.info(
      {
        event: 'sse.disconnected',
        category: 'realtime',
        sse_conn_id: c.id,
        role: c.role,
        reason,
        connected_s: Math.round((performance.now() - c.openedAt) / 1000),
        clients_total: this.conns.size,
      },
      'Flujo SSE cerrado',
    );
    if (c.role !== 'kitchen') return;
    const n = (this.kitchen.get(c.sessionId) ?? 1) - 1;
    if (n > 0) {
      this.kitchen.set(c.sessionId, n);
      return;
    }
    // Último flujo de esa sesión: sale de la lista en este mismo paso síncrono
    // y la inactividad cuenta desde el cierre de la cola (§7, escritura a).
    this.kitchen.delete(c.sessionId);
    this.writeKitchenActivity([c.sessionId]);
  }

  private ping(): void {
    const now = this.deps.clock.now();
    const nowMs = now.getTime();
    const data = { serverTime: now.toISOString(), businessDate: businessDate(now) };
    for (const c of [...this.conns.values()]) {
      // Caducidad absoluta: se cierra en el primer ping tras expires_at (§7).
      if (nowMs >= c.expiresAt) this.end(c, 'expired');
      else this.send(c, 'ping', data);
    }
  }

  private kitchenTick(): void {
    if (this.kitchen.size === 0) return;
    this.writeKitchenActivity([...this.kitchen.keys()]);
  }

  /** Escritura acotada del hub (§7, 2.1i): hora del Clock, solo barra viva y no revocada. */
  private writeKitchenActivity(ids: string[]): void {
    if (this.stopped || ids.length === 0) return;
    const now = this.deps.clock.now();
    const p = sql`
      UPDATE sessions s SET last_activity_at = GREATEST(s.last_activity_at, ${now})
      FROM users u
      WHERE s.id = ANY(${ids}::uuid[]) AND u.id = s.user_id
        AND u.role = 'kitchen' AND u.active
        AND s.revoked_at IS NULL AND s.expired_reason IS NULL AND s.expires_at > ${now}`
      .execute(this.deps.db)
      .catch((err: unknown) => {
        this.deps.log.error({ event: 'db.query.failed', category: 'system', query: 'sessions.touchKitchen', err }, 'Fallo al registrar la actividad de barra');
      })
      .finally(() => this.pending.delete(p));
    this.pending.add(p);
  }
}
