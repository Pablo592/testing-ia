// Lectura del formato de exposición de Prometheus (docs/logging.md §6).

export interface Muestra {
  nombre: string;
  etiquetas: Record<string, string>;
  valor: number;
}

export function parsearMetricas(texto: string): Muestra[] {
  const out: Muestra[] = [];
  for (const linea of texto.split('\n')) {
    if (linea === '' || linea.startsWith('#')) continue;
    const m = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{(.*)\})?\s+(\S+)/.exec(linea);
    if (!m) continue;
    const etiquetas: Record<string, string> = {};
    if (m[3]) {
      for (const par of m[3].matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\.)*)"/g)) {
        etiquetas[par[1]] = par[2];
      }
    }
    out.push({ nombre: m[1], etiquetas, valor: Number(m[4]) });
  }
  return out;
}

/** Suma de las muestras de `nombre` cuyas etiquetas incluyen `filtro`; undefined si no hay ninguna serie. */
export function valorMetrica(texto: string, nombre: string, filtro: Record<string, string> = {}): number | undefined {
  const muestras = parsearMetricas(texto).filter(
    (m) => m.nombre === nombre && Object.entries(filtro).every(([k, v]) => m.etiquetas[k] === v),
  );
  if (muestras.length === 0) return undefined;
  return muestras.reduce((a, m) => a + m.valor, 0);
}
