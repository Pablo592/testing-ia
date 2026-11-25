// Reloj inyectable (docs/arquitectura.md §12): la lógica de negocio nunca usa
// new Date()/Date.now() ni now() de SQL; main.ts compone con SystemClock y
// los tests con un FakeClock.
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};
