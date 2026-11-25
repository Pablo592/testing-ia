// Token de sesión opaco de 256 bits (ADR-005, RS-11). En la cookie viaja el
// token en base64url; en la BD solo su SHA-256.
import { createHash, randomBytes } from 'node:crypto';

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function tokenHash(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest();
}
