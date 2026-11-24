// Punto único de adaptación a buildApp(deps) (tests/README.md §2).
// Compone la app en proceso con FakeClock, BD real, hasher espía y logs en
// memoria (docs/testing.md §5.2, T-10). Nada de esto existe en la imagen: son
// dependencias inyectadas, no endpoints de prueba.
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { buildApp } from '@mi-app/api/app';
import { createPinHasher } from '@mi-app/api/auth/hasher';
import { FakeClock } from './reloj.ts';
import { CapturaLogs } from './logs.ts';
import { bdAdmin, bdApp, type ConfigBd, variable } from './entorno.ts';

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
    hash: (pin) => h.hash(pin),
    verify: async (hash, pin) => {
      e.verificaciones += 1;
      return h.verify(hash, pin);
    },
  };
  return e;
}

export interface OpcionesApp {
  inicio?: string;
  /** BD propia creada desde la plantilla migrada (necesita el rol de T-28). */
  bdAislada?: boolean;
}

export async function montarApp(op: OpcionesApp = {}): Promise<Ctx> {
  const reloj = new FakeClock(op.inicio);
  const logs = new CapturaLogs();
  const rutas: RutaRegistrada[] = [];
  const hasher = espiar(hasherReal);

  let nombreBdAislada: string | undefined;
  let configBd = bdApp();
  if (op.bdAislada) {
    nombreBdAislada = `t_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const admin = new pg.Client(bdAdmin());
    await admin.connect();
    try {
      const plantilla = process.env.DATABASE_TEMPLATE ?? 'app_template';
      await admin.query(`CREATE DATABASE "${nombreBdAislada}" TEMPLATE "${plantilla}"`);
    } finally {
      await admin.end();
    }
    configBd = bdApp(nombreBdAislada);
  }

  const app = (await buildApp({
    clock: reloj,
    database: configBd,
    pinHasher: hasher,
    publicOrigin: ORIGEN,
    trustedProxies: [IP_PROXY],
    installation: { tableCount: 20, delayThresholdMinutes: 10 },
    logDestination: logs.stream,
    logLevel: 'info',
    onRoute: (r: RutaRegistrada) => {
      rutas.push({ method: r.method, url: r.url, config: r.config });
    },
  })) as unknown as AppFastify;
  await app.ready();

  const bd = new pg.Pool({ ...configBd, max: 2 });
  return {
    app,
    reloj,
    hasher,
    logs,
    rutas,
    bd,
    configBd,
    async escuchar() {
      return app.listen({ port: 0, host: '127.0.0.1' });
    },
    async cerrar() {
      await bd.end().catch(() => undefined);
      await app.close();
      if (nombreBdAislada) {
        const admin = new pg.Client(bdAdmin());
        await admin.connect();
        try {
          await admin.query(`DROP DATABASE IF EXISTS "${nombreBdAislada}" WITH (FORCE)`);
        } finally {
          await admin.end();
        }
      }
    },
  };
}

/** Dependencias para los comandos de host (createInitialManager, unlockUser). */
export function depsComando(ctx: Ctx) {
  return { clock: ctx.reloj, database: ctx.configBd, pinHasher: ctx.hasher, logDestination: ctx.logs.stream };
}

// Comprobación temprana con mensaje claro si falta la configuración del ejecutor.
export function comprobarEntorno(): void {
  variable('DATABASE_HOST');
  variable('DATABASE_APP_USER');
}
