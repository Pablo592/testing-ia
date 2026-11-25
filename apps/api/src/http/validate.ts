// Validación del cuerpo con zod en `preValidation` (después de las guardas y
// del analizador de cuerpo, antes del handler; docs/arquitectura.md §5).
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ZodType } from 'zod';
import { issuesFromZod, ValidationError } from './errors.ts';

export function validateBody(schema: ZodType) {
  return async function preValidation(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const r = schema.safeParse(request.body);
    if (!r.success) throw new ValidationError(issuesFromZod(r.error, request.body));
    request.body = r.data;
  };
}
