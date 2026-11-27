// Historias empezadas en la Etapa 2 (orden de docs/historias/README.md:
// HU-01, HU-05, HU-02, HU-03, HU-04, HU-06, HU-07, HU-08).
// Testing añade la historia al empezarla (tarea "testing escribe los tests").
// Los casos que necesitan rutas de una historia posterior se ejecutan cuando
// esa historia está en la lista. No sirve para saltarse tests que fallan: un
// test de una historia en la lista se ejecuta siempre.
export const HISTORIAS_EN_ALCANCE: readonly string[] = ['HU-01', 'HU-05'];

export function enAlcance(...historias: string[]): boolean {
  return historias.every((h) => HISTORIAS_EN_ALCANCE.includes(h));
}
