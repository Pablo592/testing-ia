// Punto único de adaptación a buildApp(deps) (tests/README.md §2).
// Compone la app en proceso con FakeClock, BD real, hasher espía y logs en
// memoria (docs/testing.md §5.2, T-10). Nada de esto existe en la imagen: son
// dependencias inyectadas, no endpoints de prueba.
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { buildApp } from '@mi-app/api/app';
import { createPinHasher } from '@mi-app/api/auth/hasher';
import { FakeClock } from './reloj.ts';
import { CapturaLogs } from './logs.ts';
import { bdApp, type ConfigBd, variable } from './entorno.ts';
import { borrarBd, crearBdDesdePlantilla, fijarSearchPathDeBd, nombreBdPrueba } from './bd-admin.ts';

export const ORIGEN = 'https://cafe.test';
/** IP del proxy de confianza en las pruebas en proceso (trustedProxies). */
export const IP_PROXY = '10.89.0.2';

export interface PinHasher {
  hash(pin: string): Promise<string>;
  verify(hash: string, pin: string): Promise<boolean>;
}

export interface HasherEspia extends PinHasher {
  /** Número de veces que se ha calculado una verificación argon2id. */
  verificaciones: number;
  /** Número de hashes nuevos calculados (hashNewPin, docs/arquitectura.md §2.1). */
  hashes: number;
}

interface RespuestaInject {
  statusCode: number;
  headers: Record<string, string | string[] | number | undefined>;
  body: string;
}

export interface AppFastify {
  inject(opts: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    payload?: string;
    remoteAddress?: string;
  }): Promise<RespuestaInject>;
  listen(opts: { port: number; host: string }): Promise<string>;
  close(): Promise<void>;
  ready(): Promise<unknown>;
  metricsText(): Promise<string>;
  hasRoute(opts: { method: string; url: string }): boolean;
  /** API de Fastify para registrar una ruta (solo la usa RS-17, denegación por defecto). */
  route(opts: { method: string; url: string; config?: unknown; handler: () => unknown }): unknown;
}

export interface RutaRegistrada {
  method: string | string[];
  url: string;
  config?: unknown;
}

export interface Ctx {
  app: AppFastify;
  reloj: FakeClock;
  hasher: HasherEspia;
  logs: CapturaLogs;
  rutas: RutaRegistrada[];
  bd: pg.Pool;
  configBd: ConfigBd;
  /** Arranca el servidor HTTP real (para SSE) y devuelve la URL base. */
  escuchar(): Promise<string>;
  cerrar(): Promise<void>;
}

// Un pepper aleatorio por proceso de pruebas: los constructores de datos y la
// app en proceso usan el mismo hasher, así que los PIN sembrados son válidos.
const PEPPER = randomBytes(32);
const hasherReal: PinHasher = createPinHasher({ pepper: PEPPER });

export function hasherDePrueba(): PinHasher {
  return hasherReal;
}

function espiar(h: PinHasher): HasherEspia {
  const e: HasherEspia = {
    verificaciones: 0,
    hashes: 0,
    hash: (pin) => {
      e.hashes += 1;
      return h.hash(pin);
    },
    verify: async (hash, pin) => {
      e.verificaciones += 1;
      return h.verify(hash, pin);
    },
  };
  return e;
}

export interface OpcionesApp {
  inicio?: string;
  /**
   * BD propia de ESTE test, clonada de la plantilla migrada (T-28). Por
   * defecto la app usa la BD del fichero (tests/support/bd-fichero.ts), que
   * comparten los tests del fichero; esta opción es para los casos que
   * necesitan una BD sin ningún usuario (RS-09).
   */
  bdAislada?: boolean;
  /** AppDeps.sessionMaxHours (docs/arquitectura.md §2.1, §10.1). Sin valor: el por defecto (12). */
  sessionMaxHours?: number;
  /**
   * AppDeps.kitchenActivityIntervalMs (docs/arquitectura.md §2.1, §7, T-43):
   * periodo del temporizador del hub para la barra. Sin valor: el por
   * defecto (60 000 ms), que en un test nunca llega a dispararse.
   */
  kitchenActivityIntervalMs?: number;
  /**
   * Solo con `bdAislada`: antes de crear la app, test_admin (dueño del clon)
   * ejecuta `ALTER DATABASE … SET search_path = <valor>` (defensa de
   * docs/arquitectura.md §2.1, 2.1i: el pool fija search_path=public).
   */
  searchPathDeBd?: string;
  /**
   * Se llama con la instancia antes de `ready()`. Solo para RS-17: añadir una
   * ruta sin declaración y comprobar la denegación por defecto. Nada de esto
   * existe en la imagen.
   */
  antesDeReady?: (app: AppFastify) => void;
}

/** Dependencias de buildApp con los valores de prueba (para los tests que la llaman directamente). */
export function depsApp(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    clock: new FakeClock(),
    database: bdApp(),
    pinHasher: hasherReal,
    publicOrigin: ORIGEN,
    trustedProxies: [IP_PROXY],
    installation: { tableCount: 20, delayThresholdMinutes: 10 },
    logDestination: new CapturaLogs().stream,
    ...extra,
  };
}

export async function montarApp(op: OpcionesApp = {}): Promise<Ctx> {
  const reloj = new FakeClock(op.inicio);
  const logs = new CapturaLogs();
  const rutas: RutaRegistrada[] = [];
  const hasher = espiar(hasherReal);

  let nombreBdAislada: string | undefined;
  let configBd = bdApp();
  if (op.bdAislada) {
    nombreBdAislada = nombreBdPrueba('a');
    await crearBdDesdePlantilla(nombreBdAislada);
    configBd = bdApp(nombreBdAislada);
    if (op.searchPathDeBd !== undefined) {
      try {
        await fijarSearchPathDeBd(nombreBdAislada, op.searchPathDeBd);
      } catch (e) {
        await borrarBd(nombreBdAislada).catch(() => undefined);
        throw e;
      }
    }
  } else if (op.searchPathDeBd !== undefined) {
    throw new Error('searchPathDeBd solo se admite con bdAislada (no se toca la BD del fichero)');
  }

  let app: AppFastify | undefined;
  let bd: pg.Pool | undefined;
  // Orden de cierre obligatorio: pools de app_rw → app (cierra su pool en
  // onClose) → DROP de la BD aislada (falla si queda una conexión de app_rw).
  const cerrar = async () => {
    await bd?.end().catch(() => undefined);
    await app?.close();
    if (nombreBdAislada) await borrarBd(nombreBdAislada);
  };

  try {
    app = (await buildApp({
      clock: reloj,
      database: configBd,
      pinHasher: hasher,
      publicOrigin: ORIGEN,
      trustedProxies: [IP_PROXY],
      installation: { tableCount: 20, delayThresholdMinutes: 10 },
      ...(op.sessionMaxHours === undefined ? {} : { sessionMaxHours: op.sessionMaxHours }),
      ...(op.kitchenActivityIntervalMs === undefined ? {} : { kitchenActivityIntervalMs: op.kitchenActivityIntervalMs }),
      logDestination: logs.stream,
      logLevel: 'info',
      onRoute: (r: RutaRegistrada) => {
        rutas.push({ method: r.method, url: r.url, config: r.config });
      },
    })) as unknown as AppFastify;
    op.antesDeReady?.(app);
    await app.ready();
    // Los constructores de datos fijan también search_path=public en la
    // conexión: así no dependen de un ALTER DATABASE … SET (searchPathDeBd).
    bd = new pg.Pool({ ...configBd, max: 2, options: '-c search_path=public' });
  } catch (e) {
    await cerrar().catch(() => undefined);
    throw e;
  }

  const appLista = app!;
  const bdLista = bd!;
  return {
    app: appLista,
    reloj,
    hasher,
    logs,
    rutas,
    bd: bdLista,
    configBd,
    async escuchar() {
      return appLista.listen({ port: 0, host: '127.0.0.1' });
    },
    cerrar,
  };
}

/**
 * CommandDeps de createInitialManager y unlockUser (docs/arquitectura.md §2.1).
 * unlockUser acepta el mismo objeto (su tipo es un Pick de este). El pool del
 * comando usa poolMax de configBd (4) y lo cierra el propio comando.
 */
export function depsComando(ctx: Ctx) {
  return { clock: ctx.reloj, database: ctx.configBd, pinHasher: ctx.hasher, logDestination: ctx.logs.stream };
}

// Comprobación temprana con mensaje claro si falta la configuración del ejecutor.
export function comprobarEntorno(): void {
  variable('DATABASE_HOST');
  variable('DATABASE_APP_USER');
}
