// Hash del PIN: argon2id + pepper (ADR-005, docs/seguridad.md §6.1; RS-08).
// Parámetros de OWASP (m = 19 MiB, t = 2, p = 1): ≈ 30–60 ms por verificación
// en el hardware previsto, muy por debajo del p95 de 1 s de HU-01/CA-N03.
// El pepper es un secreto montado como fichero; nunca va a la BD ni a la imagen.
// Solo lo recibe el módulo auth (verifyPin y hashNewPin, docs/arquitectura.md §2.1).
import argon2 from 'argon2';

export interface PinHasher {
  hash(pin: string): Promise<string>;
  verify(hash: string, pin: string): Promise<boolean>;
}

export const ARGON2_PARAMS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

/**
 * Hash argon2id ficticio con los mismos parámetros (de un valor aleatorio
 * descartado). Se verifica contra él cuando el usuario no existe, para que el
 * tiempo sea el de una verificación real (RS-07). No es un secreto.
 */
export const DUMMY_PIN_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$0Nxa+RH2Z2177fVAkir9Ww$6AXIfmf56uYOFPvxgsyWu8XTLpsYsXgs4yYIbLRmMU0';

export function createPinHasher(opts: { pepper: Buffer | string }): PinHasher {
  const secret = Buffer.isBuffer(opts.pepper) ? Buffer.from(opts.pepper) : Buffer.from(opts.pepper, 'utf8');
  if (secret.length === 0) throw new Error('createPinHasher: pepper vacío');
  return {
    async hash(pin: string): Promise<string> {
      return argon2.hash(pin, { type: argon2.argon2id, ...ARGON2_PARAMS, secret });
    },
    async verify(hash: string, pin: string): Promise<boolean> {
      try {
        return await argon2.verify(hash, pin, { secret });
      } catch {
        // Hash mal formado en BD: se trata como PIN incorrecto.
        return false;
      }
    },
  };
}
