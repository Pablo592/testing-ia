// BD efímeras de integración (docs/testing.md §9.2; docs/infraestructura.md
// §9.1, T-28): clon de app_template con test_admin y borrado al terminar.
//
// `DROP DATABASE … WITH (FORCE)` no puede cerrar conexiones de app_rw
// (test_admin no tiene pg_signal_backend, a propósito): antes de borrar hay que
// cerrar todos los pools (el de la app en proceso, en app.close(), y los de los
// constructores de datos). Si queda una conexión abierta, el DROP falla y el
// test lo informa: es una fuga de conexiones, no un fallo de infraestructura.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { bdAdmin, plantilla } from './entorno.ts';

function nombreSeguro(n: string): string {
  if (!/^t_[a-z0-9_]{1,40}$/.test(n)) throw new Error(`nombre de BD de prueba no válido: ${n}`);
  return n;
}

export function nombreBdPrueba(prefijo = ''): string {
  const p = prefijo.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20);
  return nombreSeguro(`t_${p}${p ? '_' : ''}${randomUUID().replace(/-/g, '').slice(0, 12)}`);
}

async function conAdmin<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client(bdAdmin());
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

export async function crearBdDesdePlantilla(nombre: string): Promise<void> {
  await conAdmin((c) => c.query(`CREATE DATABASE "${nombreSeguro(nombre)}" TEMPLATE "${plantilla()}"`));
}

export async function borrarBd(nombre: string): Promise<void> {
  // Tras `pool.end()` el cliente cierra su socket, pero el proceso del servidor
  // tarda unos milisegundos en salir; un DROP en ese instante ve una sesión de
  // app_rw que test_admin no puede terminar ("permission denied to terminate
  // process"). Se reintenta unos segundos: una fuga real de conexiones sigue
  // fallando (T-44).
  const INTENTOS = 20;
  let ultimo: Error | undefined;
  for (let i = 0; i < INTENTOS; i++) {
    try {
      await conAdmin((c) => c.query(`DROP DATABASE IF EXISTS "${nombreSeguro(nombre)}" WITH (FORCE)`));
      return;
    } catch (e) {
      ultimo = e as Error;
      if (!/permission denied to terminate|being accessed by other users/i.test(ultimo.message)) break;
      await new Promise((ok) => setTimeout(ok, 250));
    }
  }
  throw new Error(
    `No se pudo borrar la BD de prueba ${nombre}: ¿queda abierta una conexión de app_rw ` +
      `(pool sin cerrar o app sin close())? ${ultimo?.message ?? ''}`,
  );
}

/**
 * `ALTER DATABASE <clon> SET search_path = <valor>` con test_admin, dueño del
 * clon (lo creó él). Afecta solo a las conexiones que se abran después. El
 * valor es un identificador simple (se valida: no se interpola nada más).
 */
export async function fijarSearchPathDeBd(nombre: string, valor: string): Promise<void> {
  if (!/^[a-z_][a-z0-9_]{0,40}$/.test(valor)) throw new Error(`search_path de prueba no válido: ${valor}`);
  await conAdmin((c) => c.query(`ALTER DATABASE "${nombreSeguro(nombre)}" SET search_path = ${valor}`));
}
