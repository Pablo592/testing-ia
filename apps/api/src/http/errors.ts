// Formato único de error (docs/arquitectura.md §5): un solo sitio que construye
// el cuerpo y traduce las incidencias de zod al catálogo de reglas.
// Nunca se repite en `message` ni en `details` un valor recibido (RS-31).
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ZodError } from 'zod';
import type { ApiError } from '@mi-app/shared/api';

export type IssuePath = (string | number)[];
export interface Issue {
  path: IssuePath;
  rule: string;
}

/** Error que el manejador global convierte en la respuesta de su `status`. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;
  readonly headers: Record<string, string> | undefined;
  constructor(status: number, code: string, message: string, details?: Record<string, unknown>, headers?: Record<string, string>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers;
  }
}

export class ValidationError extends HttpError {
  constructor(issues: Issue[]) {
    super(400, 'VALIDATION_FAILED', 'Datos no válidos', { issues });
  }
}

export const MESSAGES = {
  NOT_FOUND: 'No encontrado',
  UNAUTHENTICATED: 'Sesión no válida',
  FORBIDDEN: 'Acceso denegado',
  ORIGIN_NOT_ALLOWED: 'Origen no permitido',
  PIN_CHANGE_REQUIRED: 'Tienes que cambiar tu PIN',
  UNSUPPORTED_MEDIA_TYPE: 'Tipo de contenido no admitido',
  PAYLOAD_TOO_LARGE: 'Cuerpo demasiado grande',
  INTERNAL: 'Error interno',
} as const;

export function errorBody(request: FastifyRequest, code: string, message: string, details?: Record<string, unknown>): ApiError {
  return { error: { code, message, requestId: request.id, ...(details === undefined ? {} : { details }) } };
}

export function sendError(
  request: FastifyRequest,
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): FastifyReply {
  return reply.code(status).type('application/json; charset=utf-8').send(errorBody(request, code, message, details));
}

/** `423`/`429` con `details.retryAfterSeconds` y la cabecera Retry-After (mismo valor). */
export function retryError(status: 423 | 429, code: string, message: string, retryAfterSeconds: number): HttpError {
  return new HttpError(status, code, message, { retryAfterSeconds }, { 'retry-after': String(retryAfterSeconds) });
}

function valueAt(input: unknown, path: readonly PropertyKey[]): unknown {
  let v: unknown = input;
  for (const k of path) {
    if (v === null || typeof v !== 'object') return undefined;
    v = (v as Record<PropertyKey, unknown>)[k];
  }
  return v;
}

function toPath(path: readonly PropertyKey[]): IssuePath {
  return path.map((p) => (typeof p === 'number' ? p : String(p)));
}

/** Traductor único zod → `{ path, rule }` (§5). */
export function issuesFromZod(error: ZodError, input: unknown): Issue[] {
  const out: Issue[] = [];
  for (const issue of error.issues) {
    const path = issue.path;
    switch (issue.code) {
      case 'invalid_type':
        out.push({ path: toPath(path), rule: valueAt(input, path) === undefined ? 'required' : 'type' });
        break;
      case 'too_small':
        out.push({ path: toPath(path), rule: issue.origin === 'number' || issue.origin === 'bigint' ? 'min' : 'min_length' });
        break;
      case 'too_big':
        out.push({ path: toPath(path), rule: issue.origin === 'number' || issue.origin === 'bigint' ? 'max' : 'max_length' });
        break;
      case 'unrecognized_keys':
        for (const k of issue.keys) out.push({ path: [...toPath(path), k], rule: 'not_allowed' });
        break;
      case 'invalid_value':
        out.push({ path: toPath(path), rule: 'enum' });
        break;
      case 'invalid_union':
        out.push({ path: toPath(path), rule: 'type' });
        break;
      default:
        out.push({ path: toPath(path), rule: 'format' });
    }
  }
  return out;
}
