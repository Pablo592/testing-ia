// Piezas de HU-05 sin dependencias de Vitest ni de la app en proceso, para que las
// compartan los tests de integración (tests/support/menu.ts), el arnés de
// rendimiento y los E2E (que corren en el ejecutor de Playwright).

/** Quien puede crear categorías y productos: el cliente de integración (`ClienteMenu`) y el de E2E (`ApiMenu`). */
export interface ConstructorMenu {
  categoria(nombre: string): Promise<string>;
  producto(categoryId: string, nombre: string, priceCents: number): Promise<string>;
}

/** Menú "menu-200" de docs/testing.md §9.1: 20 categorías de 10 productos, con nombres de 30 y 40 caracteres y precios de 0,01 a 999,99 €. */
export interface Menu200 {
  categorias: { id: string; nombre: string; productos: { id: string; nombre: string; centimos: number }[] }[];
}

export async function crearMenu200(c: ConstructorMenu, prefijo = 'm200'): Promise<Menu200> {
  const out: Menu200 = { categorias: [] };
  for (let i = 0; i < 20; i++) {
    // Algunas categorías de exactamente 30 caracteres (el límite de HU-05/CA-F01).
    const base = `${prefijo} cat ${String(i + 1).padStart(2, '0')} `;
    const nombre = i % 4 === 0 ? base.padEnd(30, 'x') : base.trim();
    const id = await c.categoria(nombre);
    const productos: { id: string; nombre: string; centimos: number }[] = [];
    for (let j = 0; j < 10; j++) {
      const pBase = `${prefijo} p ${String(i + 1).padStart(2, '0')}-${String(j + 1).padStart(2, '0')} `;
      const pNombre = j === 9 ? pBase.padEnd(40, 'y') : pBase.trim();
      const centimos = j === 0 ? 1 : j === 9 ? 99_999 : 10 + ((i * 10 + j) * 37) % 9000;
      productos.push({ id: await c.producto(id, pNombre, centimos), nombre: pNombre, centimos });
    }
    out.categorias.push({ id, nombre, productos });
  }
  return out;
}

/** Claves cuyo nombre casa con la prohibición de RS-19 para barra (docs/seguridad.md §7), a cualquier profundidad. */
export function clavesDeImporte(valor: unknown, ruta = '$'): string[] {
  const malas: string[] = [];
  if (valor === null || typeof valor !== 'object') return malas;
  if (Array.isArray(valor)) {
    valor.forEach((v, i) => malas.push(...clavesDeImporte(v, `${ruta}[${i}]`)));
    return malas;
  }
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
    if (/cents|price|total|amount|tendered|change/i.test(k)) malas.push(`${ruta}.${k}`);
    malas.push(...clavesDeImporte(v, `${ruta}.${k}`));
  }
  return malas;
}

/** Percentil `p` (0–100) por el método del rango más próximo, sobre una lista YA ORDENADA. */
export function percentil(ordenadas: number[], p: number): number {
  const i = Math.min(ordenadas.length - 1, Math.ceil((p / 100) * ordenadas.length) - 1);
  return ordenadas[Math.max(0, i)]!;
}
