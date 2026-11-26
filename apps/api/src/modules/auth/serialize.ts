// Primitivas de concurrencia del módulo auth (SEC-038, RS-05b). Una sola
// instancia de `app` (docs/arquitectura.md §7): bastan en memoria.

/**
 * Serializa por clave, en orden de llegada (FIFO). Las verificaciones de PIN de
 * una misma cuenta se hacen de una en una: cada una lee el estado de bloqueo
 * que dejó la anterior, así una ráfaga nunca supera el umbral del bloqueo
 * siguiente (5/10/15/20).
 */
export class KeyedSerializer {
  private readonly tails = new Map<string, Promise<void>>();

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.tails.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const mine = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = prev.then(() => mine);
    this.tails.set(key, tail);
    try {
      await prev;
      return await fn();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }

  get size(): number {
    return this.tails.size;
  }
}

/**
 * Semáforo de N huecos (RS-08, SEC-038 punto 4): acota las operaciones argon2
 * simultáneas de forma explícita en lugar de depender del tamaño del
 * threadpool de libuv, que también usan DNS y `fs`.
 */
export class Semaphore {
  private free: number;
  private readonly waiting: (() => void)[] = [];

  constructor(size: number) {
    this.free = size;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.free > 0) this.free -= 1;
    else await new Promise<void>((resolve) => this.waiting.push(resolve));
    try {
      return await fn();
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.free += 1;
    }
  }

  get queued(): number {
    return this.waiting.length;
  }
}
