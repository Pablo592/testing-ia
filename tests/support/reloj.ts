// FakeClock: implementa el Clock inyectable de docs/arquitectura.md §12
// (`now(): Date`). Monótono: solo avanza.
export class FakeClock {
  private ms: number;

  constructor(inicio: string | Date = '2026-11-24T09:00:00.000Z') {
    this.ms = new Date(inicio).getTime();
  }

  now(): Date {
    return new Date(this.ms);
  }

  avanzar({ h = 0, min = 0, s = 0, ms = 0 }: { h?: number; min?: number; s?: number; ms?: number }): void {
    const delta = ((h * 60 + min) * 60 + s) * 1000 + ms;
    if (delta < 0) throw new Error('FakeClock solo avanza');
    this.ms += delta;
  }
}

export const MIN = 60;
export const HORA = 3600;
