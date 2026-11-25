// Cookie de sesión `__Host-sid` (SEC-021, RS-10): HttpOnly; Secure;
// SameSite=Strict; Path=/, sin Domain ni Max-Age/Expires al crearla.
// Borrado idéntico en todo 401 de una petición que la traía y en el logout (2.1i).
import { SESSION_COOKIE } from '@mi-app/shared/api';

export const COOKIE_CLEAR = `${SESSION_COOKIE}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`;

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict`;
}

/**
 * Valor de `__Host-sid` en la cabecera Cookie. `present` es true aunque el
 * valor esté vacío o mal formado (decide si el 401 debe borrarla).
 */
export function readSessionCookie(header: string | string[] | undefined): { present: boolean; value: string } {
  const raw = Array.isArray(header) ? header.join('; ') : header;
  if (!raw) return { present: false, value: '' };
  for (const part of raw.split(';')) {
    const p = part.trim();
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    if (p.slice(0, eq).trim() === SESSION_COOKIE) return { present: true, value: p.slice(eq + 1).trim() };
  }
  return { present: false, value: '' };
}
