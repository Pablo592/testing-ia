// Punto único de adaptación de la pantalla P-09 "Menú" (HU-05) y del API que usan
// los E2E para preparar datos (tests/README.md §7.6). Selectores por rol y texto
// accesible (docs/testing.md §4.4); `data-testid` solo donde no hay otra forma de
// distinguir entre filas repetidas (docs/ux/wireframes/06-gestion-menu.md).
import { expect, request, type APIRequestContext, type APIResponse, type Locator, type Page, type Route } from '@playwright/test';
import type { UsuarioE2E } from './semilla.ts';

export const RUTA_MENU = '/menu';

/** Textos exactos de docs/ux/wireframes/06-gestion-menu.md (salvo los marcados "propuesto", que no están en el wireframe). */
export const TEXTOS_MENU = {
  titulo: 'Menú',
  nuevaCategoria: 'Nueva categoría',
  nuevoProducto: 'Nuevo producto',
  guardarProducto: 'Guardar producto',
  guardarCategoria: 'Guardar categoría', // propuesto
  cancelar: 'Cancelar',
  etiquetaNombre: 'Nombre (obligatorio)',
  etiquetaCategoria: 'Categoría (obligatorio)',
  etiquetaPrecio: 'Precio con IVA incluido (obligatorio)',
  etiquetaDisponible: 'Disponible (obligatorio)',
  errorNombreProducto: 'Escribe un nombre de 1 a 40 caracteres.',
  errorNombreCategoria: /Escribe un nombre de 1 a 30 caracteres/, // propuesto
  errorPrecio: 'El precio debe estar entre 0,01 y 999,99 € con 2 decimales como máximo.',
  errorProductoRepetido: 'Ya existe un producto con ese nombre en esta categoría.',
  errorCategoriaRepetida: /Ya existe una categoría con ese nombre/, // propuesto
  ayudaPrecioEdicion: 'El nuevo precio se aplicará a los pedidos que se envíen a partir de ahora',
  toastProductoGuardado: 'Producto guardado',
  toastOrdenActualizado: 'Orden actualizado',
  vacio: 'Todavía no hay categorías. Crea la primera para empezar a añadir productos.',
  categoriaVacia: (nombre: string) => `${nombre} no tiene productos.`,
  cargando: 'Cargando menú…',
  guardando: 'Guardando…',
  agotado: 'AGOTADO',
  desactivado: 'DESACTIVADO',
  disponible: 'Disponible',
  desactivarTitulo: (nombre: string) => `¿Desactivar ${nombre}?`,
  desactivarCuerpo: 'Dejará de aparecer en la toma de pedido. Se conserva en el histórico.',
  borrarBloqueado: (nombre: string, n: number) => `No se puede borrar ${nombre}: tiene ${n} productos activos. Desactívalos o muévelos a otra categoría.`,
  entendido: 'Entendido',
  volver: 'Volver',
  desactivarProducto: 'Desactivar producto',
} as const;

function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class PantallaMenu {
  constructor(readonly page: Page) {}

  async abrir(): Promise<void> {
    await this.page.goto(RUTA_MENU);
    await expect(this.page.getByRole('heading', { level: 1, name: TEXTOS_MENU.titulo, exact: true })).toBeVisible();
  }

  categoria(id: string): Locator {
    return this.page.getByTestId(`categoria-${id}`);
  }

  producto(id: string): Locator {
    return this.page.getByTestId(`producto-${id}`);
  }

  /** Botón de la fila que selecciona la categoría (su nombre accesible empieza por el nombre de la categoría, p. ej. "Cafés (8)"). */
  async elegirCategoria(id: string, nombre: string): Promise<void> {
    const boton = this.categoria(id).getByRole('button', { name: new RegExp(`^${escapar(nombre)}`) });
    await boton.click();
    await expect(boton).toHaveAttribute('aria-current', 'true');
  }

  /** Botones de acción por nombre accesible completo (`aria-label` del wireframe: "Subir Cafés"). */
  accion(accion: 'Subir' | 'Bajar' | 'Editar' | 'Borrar', nombre: string): Locator {
    return this.page.getByRole('button', { name: `${accion} ${nombre}`, exact: true });
  }

  /** [⋯] de un producto: menú con "Marcar agotado" / "Marcar disponible", "Desactivar" y "Activar". */
  masAcciones(nombre: string): Locator {
    return this.page.getByRole('button', { name: `Más acciones de ${nombre}`, exact: true });
  }

  async elegirAccionDeProducto(nombre: string, opcion: 'Marcar agotado' | 'Marcar disponible' | 'Desactivar' | 'Activar'): Promise<void> {
    await this.masAcciones(nombre).click();
    await this.page.getByRole('menuitem', { name: opcion, exact: true }).click();
  }

  dialogo(nombre: string | RegExp): Locator {
    return this.page.getByRole('dialog', { name: nombre });
  }

  toast(texto: string): Locator {
    return this.page.getByRole('status').filter({ hasText: texto });
  }

  /** Orden en que aparecen las categorías en la pantalla (por `data-testid="categoria-<id>"`). */
  async ordenCategorias(): Promise<string[]> {
    const ids = await this.page.locator('[data-testid^="categoria-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('categoria-'.length)));
    return ids;
  }

  /** Orden de los productos de la categoría elegida (por `data-testid="producto-<id>"`). */
  async ordenProductos(): Promise<string[]> {
    return this.page.locator('[data-testid^="producto-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('producto-'.length)));
  }
}

/** Formulario de producto (diálogo "Nuevo producto" / "Editar producto"). */
export class FormularioProducto {
  constructor(readonly dialogo: Locator) {}

  nombre(): Locator {
    return this.dialogo.getByLabel(TEXTOS_MENU.etiquetaNombre, { exact: true });
  }

  categoria(): Locator {
    return this.dialogo.getByLabel(TEXTOS_MENU.etiquetaCategoria, { exact: true });
  }

  precio(): Locator {
    return this.dialogo.getByLabel(TEXTOS_MENU.etiquetaPrecio, { exact: true });
  }

  disponible(): Locator {
    return this.dialogo.getByRole('radio', { name: 'Disponible', exact: true });
  }

  agotado(): Locator {
    return this.dialogo.getByRole('radio', { name: 'Agotado', exact: true });
  }

  guardar(): Locator {
    return this.dialogo.getByRole('button', { name: /^Guardar producto$|^Guardando…$/ });
  }

  /** Rellena y guarda. `precio` se escribe como lo teclea el encargado ("2,50"). */
  async rellenar(o: { nombre?: string; categoria?: string; precio?: string; agotado?: boolean }): Promise<void> {
    if (o.nombre !== undefined) await this.nombre().fill(o.nombre);
    if (o.categoria !== undefined) await this.categoria().selectOption({ label: o.categoria });
    if (o.precio !== undefined) await this.precio().fill(o.precio);
    if (o.agotado) await this.agotado().check();
  }

  async enviar(): Promise<void> {
    await this.guardar().click();
  }

  /** Mensaje de error de un campo: lo que lee el lector de pantalla al enfocar el campo (aria-describedby). */
  async errorDe(campo: Locator, texto: string | RegExp): Promise<void> {
    await expect(campo).toHaveAttribute('aria-invalid', 'true');
    await expect(campo).toHaveAccessibleDescription(texto);
  }
}

// --- API para preparar datos (un API por usuario, con su propia cookie) ------------

export interface CategoriaApi {
  id: string;
  name: string;
  products: { id: string; name: string; available: boolean; priceCents?: number; active?: boolean }[];
}

export class ApiMenu {
  constructor(
    readonly req: APIRequestContext,
    readonly origen: string,
  ) {}

  private cabeceras(): Record<string, string> {
    return { origin: this.origen };
  }

  private async ok<T>(r: APIResponse, que: string): Promise<T> {
    if (!r.ok()) throw new Error(`${que}: ${r.status()} ${(await r.text()).slice(0, 300)}`);
    const t = await r.text();
    return (t === '' ? undefined : JSON.parse(t)) as T;
  }

  async menu(incluirInactivos = false): Promise<CategoriaApi[]> {
    const r = await this.req.get(`/api/v1/menu${incluirInactivos ? '?includeInactive=true' : ''}`);
    return (await this.ok<{ categories: CategoriaApi[] }>(r, 'GET /menu')).categories;
  }

  async categoria(name: string): Promise<string> {
    const b = await this.ok<{ id?: string; category?: { id: string } }>(await this.req.post('/api/v1/categories', { data: { name }, headers: this.cabeceras() }), `crear categoría ${name}`);
    return (b.id ?? b.category!.id) as string;
  }

  async producto(categoryId: string, name: string, priceCents: number, available = true): Promise<string> {
    const b = await this.ok<{ id?: string; product?: { id: string } }>(
      await this.req.post('/api/v1/products', { data: { categoryId, name, priceCents, available }, headers: this.cabeceras() }),
      `crear producto ${name}`,
    );
    return (b.id ?? b.product!.id) as string;
  }

  async editar(id: string, data: Record<string, unknown>): Promise<void> {
    await this.ok(await this.req.patch(`/api/v1/products/${id}`, { data, headers: this.cabeceras() }), `editar producto ${id}`);
  }

  async disponibilidad(id: string, available: boolean): Promise<void> {
    await this.ok(await this.req.patch(`/api/v1/products/${id}/availability`, { data: { available }, headers: this.cabeceras() }), `disponibilidad de ${id}`);
  }

  async borrarCategoria(id: string): Promise<number> {
    return (await this.req.delete(`/api/v1/categories/${id}`, { headers: this.cabeceras() })).status();
  }

  async cerrar(): Promise<void> {
    await this.req.dispose();
  }
}

/** Inicia sesión por la API (cookie propia, independiente de la del navegador) y devuelve el cliente. */
export async function apiComo(u: Pick<UsuarioE2E, 'nombre' | 'pin'>): Promise<ApiMenu> {
  const baseURL = process.env.BASE_URL ?? 'https://toxiproxy:8443';
  const origen = new URL(baseURL).origin;
  const req = await request.newContext({ baseURL });
  const r = await req.post('/api/v1/auth/login', { data: { name: u.nombre, pin: u.pin }, headers: { origin: origen } });
  if (!r.ok()) {
    const t = (await r.text()).slice(0, 200);
    await req.dispose();
    throw new Error(`login por API de ${u.nombre}: ${r.status()} ${t}`);
  }
  return new ApiMenu(req, origen);
}

// --- Datos fijos para estados y capturas (respuestas interceptadas de GET /menu) ---

export interface ProductoFijo {
  id: string;
  name: string;
  priceCents: number;
  available: boolean;
  active: boolean;
}
export interface CategoriaFija {
  id: string;
  name: string;
  products: ProductoFijo[];
}

const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** Los datos del wireframe 06: Cafés (Moca agotado, Descafeinado desactivado), Infusiones, Zumos, Bollería. */
export function menuDelWireframe(): CategoriaFija[] {
  const p = (n: number, name: string, priceCents: number, o: { available?: boolean; active?: boolean } = {}): ProductoFijo => ({
    id: uuid(100 + n),
    name,
    priceCents,
    available: o.available ?? true,
    active: o.active ?? true,
  });
  return [
    {
      id: uuid(1),
      name: 'Cafés',
      products: [
        p(1, 'Café solo', 130),
        p(2, 'Café con leche', 160),
        p(3, 'Moca', 250, { available: false }),
        p(4, 'Descafeinado', 140, { active: false }),
        p(5, 'Cortado', 140),
        p(6, 'Capuchino', 220),
        p(7, 'Americano', 150),
        p(8, 'Café bombón', 180),
      ],
    },
    { id: uuid(2), name: 'Infusiones', products: [p(11, 'Té verde', 150), p(12, 'Manzanilla', 140), p(13, 'Poleo menta', 140), p(14, 'Rooibos', 160), p(15, 'Té negro', 150)] },
    { id: uuid(3), name: 'Zumos', products: [p(21, 'Naranja natural', 280), p(22, 'Piña', 260), p(23, 'Manzana', 260), p(24, 'Tomate', 250)] },
    { id: uuid(4), name: 'Bollería', products: [p(31, 'Cruasán', 180), p(32, 'Napolitana', 200), p(33, 'Ensaimada', 190), p(34, 'Magdalena', 120), p(35, 'Palmera', 210), p(36, 'Donut', 160)] },
  ];
}

/**
 * Intercepta `GET /api/v1/menu` (con o sin `includeInactive`) con los datos dados.
 * Para estados y capturas: no toca las demás rutas (las escrituras llegan al servidor real).
 */
export async function interceptarMenu(page: Page, categorias: CategoriaFija[] | ((route: Route) => Promise<void>)): Promise<void> {
  await page.route(/\/api\/v1\/menu(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    if (typeof categorias === 'function') return categorias(route);
    return route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: JSON.stringify({ categories: categorias }),
    });
  });
}
