// Punto único de adaptación de las rutas, las formas de respuesta y los códigos
// de HU-05 (tests/README.md §7). Las aserciones de los tests de HU-05 no
// escriben rutas ni leen cuerpos "a mano": pasan por aquí, así que si el
// Software Engineer fija otra forma (docs/arquitectura.md §5.1 solo da las
// rutas), se ajusta este fichero sin tocar las aserciones.
import type { Ctx } from './app.ts';
import { pedir, sesion, type Resp } from './http.ts';
import { crearUsuario, nombreUnico, type Rol, type UsuarioPrueba } from './fixtures.ts';

export { clavesDeImporte, crearMenu200, type Menu200 } from './menu-puro.ts';

export interface ProductoMenu {
  id: string;
  name: string;
  available: boolean;
  /** Ausente para barra (RS-19). */
  priceCents?: number;
  /** Presente (siempre) en `GET /menu?includeInactive=true`. */
  active?: boolean;
}

export interface CategoriaMenu {
  id: string;
  name: string;
  products: ProductoMenu[];
}

/** Códigos de error de HU-05 (propuestos por Testing, pendientes de confirmar por el SE: tests/README.md §7). */
export const COD = {
  categoriaDuplicada: 'CATEGORY_NAME_TAKEN',
  productoDuplicado: 'PRODUCT_NAME_TAKEN',
  categoriaConProductos: 'CATEGORY_HAS_ACTIVE_PRODUCTS',
} as const;

export interface NuevoProducto {
  categoryId: string;
  name: string;
  priceCents: number;
  available?: boolean;
}

export interface CambioProducto {
  name?: string;
  categoryId?: string;
  priceCents?: number;
  active?: boolean;
}

export interface OrdenMenu {
  categories: string[];
  products: Record<string, string[]>;
}

/** Cliente de las rutas de HU-05 con la cookie de un usuario. */
export class ClienteMenu {
  constructor(
    readonly ctx: Ctx,
    readonly cookie: string,
  ) {}

  menu(opciones: { incluirInactivos?: boolean; pasiva?: boolean } = {}): Promise<Resp> {
    return pedir(this.ctx, {
      ruta: `/menu${opciones.incluirInactivos ? '?includeInactive=true' : ''}`,
      cookie: this.cookie,
      pasiva: opciones.pasiva,
    });
  }

  crearCategoria(cuerpo: unknown): Promise<Resp> {
    return pedir(this.ctx, { metodo: 'POST', ruta: '/categories', cookie: this.cookie, cuerpo });
  }

  renombrarCategoria(id: string, cuerpo: unknown): Promise<Resp> {
    return pedir(this.ctx, { metodo: 'PATCH', ruta: `/categories/${id}`, cookie: this.cookie, cuerpo });
  }

  borrarCategoria(id: string): Promise<Resp> {
    return pedir(this.ctx, { metodo: 'DELETE', ruta: `/categories/${id}`, cookie: this.cookie });
  }

  crearProducto(cuerpo: unknown): Promise<Resp> {
    return pedir(this.ctx, { metodo: 'POST', ruta: '/products', cookie: this.cookie, cuerpo });
  }

  editarProducto(id: string, cuerpo: unknown): Promise<Resp> {
    return pedir(this.ctx, { metodo: 'PATCH', ruta: `/products/${id}`, cookie: this.cookie, cuerpo });
  }

  disponibilidad(id: string, cuerpo: unknown): Promise<Resp> {
    return pedir(this.ctx, { metodo: 'PATCH', ruta: `/products/${id}/availability`, cookie: this.cookie, cuerpo });
  }

  ordenar(cuerpo: unknown): Promise<Resp> {
    return pedir(this.ctx, { metodo: 'PUT', ruta: '/menu/order', cookie: this.cookie, cuerpo });
  }

  // --- Atajos que exigen éxito (preparación de datos) -------------------------

  async categoria(nombre: string = nombreUnico('Cat')): Promise<string> {
    const r = await this.crearCategoria({ name: nombre });
    if (r.status !== 201) throw new Error(`no se pudo crear la categoría «${nombre}»: ${r.status} ${r.raw.slice(0, 200)}`);
    return idDe(r);
  }

  async producto(categoryId: string, nombre: string = nombreUnico('Prod'), priceCents = 150, available?: boolean): Promise<string> {
    const r = await this.crearProducto({ categoryId, name: nombre, priceCents, ...(available === undefined ? {} : { available }) });
    if (r.status !== 201) throw new Error(`no se pudo crear el producto «${nombre}»: ${r.status} ${r.raw.slice(0, 200)}`);
    return idDe(r);
  }

  async desactivar(id: string): Promise<void> {
    const r = await this.editarProducto(id, { active: false });
    if (r.status !== 200) throw new Error(`no se pudo desactivar el producto: ${r.status} ${r.raw.slice(0, 200)}`);
  }

  /** Menú (lo que ve el encargado, con inactivos) ya validado como 200. */
  async categorias(opciones: { incluirInactivos?: boolean } = {}): Promise<CategoriaMenu[]> {
    const r = await this.menu(opciones);
    if (r.status !== 200) throw new Error(`GET /menu: ${r.status} ${r.raw.slice(0, 200)}`);
    return categoriasDe(r);
  }
}

/** Id de la entidad creada o actualizada, tanto si la respuesta es el recurso como si lo envuelve (`{category}`, `{product}`). */
export function idDe(r: Resp): string {
  const b = r.body as Record<string, unknown> | undefined;
  const candidato = b?.id ?? (b?.category as { id?: unknown } | undefined)?.id ?? (b?.product as { id?: unknown } | undefined)?.id;
  if (typeof candidato !== 'string') throw new Error(`la respuesta no trae el id (${r.status}): ${r.raw.slice(0, 200)}`);
  return candidato;
}

export function categoriasDe(r: Resp): CategoriaMenu[] {
  const c = (r.body as { categories?: unknown } | undefined)?.categories;
  if (!Array.isArray(c)) throw new Error(`la respuesta no trae "categories" (${r.status}): ${r.raw.slice(0, 200)}`);
  return c as CategoriaMenu[];
}

/** Todos los productos del menú, en el orden de lectura (categoría y posición). */
export function productosDe(categorias: CategoriaMenu[]): ProductoMenu[] {
  return categorias.flatMap((c) => c.products);
}

export function buscarProducto(categorias: CategoriaMenu[], id: string): ProductoMenu | undefined {
  return productosDe(categorias).find((p) => p.id === id);
}

export function nombresDe(categorias: CategoriaMenu[]): string[] {
  return categorias.map((c) => c.name);
}

export interface Equipo {
  encargado: UsuarioPrueba;
  camarero: UsuarioPrueba;
  barra: UsuarioPrueba;
  m: ClienteMenu;
  w: ClienteMenu;
  k: ClienteMenu;
  cookies: { m: string; w: string; k: string };
}

/** Un encargado, un camarero y una barra con sesión abierta. */
export async function crearEquipo(ctx: Ctx): Promise<Equipo> {
  const roles: Record<'encargado' | 'camarero' | 'barra', Rol> = { encargado: 'manager', camarero: 'waiter', barra: 'kitchen' };
  const encargado = await crearUsuario(ctx, { rol: roles.encargado });
  const camarero = await crearUsuario(ctx, { rol: roles.camarero });
  const barra = await crearUsuario(ctx, { rol: roles.barra });
  const cm = await sesion(ctx, encargado.nombre, encargado.pin);
  const cw = await sesion(ctx, camarero.nombre, camarero.pin);
  const ck = await sesion(ctx, barra.nombre, barra.pin);
  return {
    encargado,
    camarero,
    barra,
    m: new ClienteMenu(ctx, cm),
    w: new ClienteMenu(ctx, cw),
    k: new ClienteMenu(ctx, ck),
    cookies: { m: cm, w: cw, k: ck },
  };
}

/** Lecturas directas de las tablas de HU-05 (columnas de docs/arquitectura.md §4.1). */
export interface FilaCategoria {
  id: string;
  name: string;
  position: number;
  archived_at: Date | null;
}
export interface FilaProducto {
  id: string;
  category_id: string;
  name: string;
  price_cents: number;
  available: boolean;
  active: boolean;
  position: number;
}

export async function filaCategoria(ctx: Pick<Ctx, 'bd'>, id: string): Promise<FilaCategoria | undefined> {
  const r = await ctx.bd.query<FilaCategoria>(`SELECT id, name, position, archived_at FROM categories WHERE id = $1`, [id]);
  return r.rows[0];
}

export async function filaProducto(ctx: Pick<Ctx, 'bd'>, id: string): Promise<FilaProducto | undefined> {
  const r = await ctx.bd.query<FilaProducto>(
    `SELECT id, category_id, name, price_cents, available, active, position FROM products WHERE id = $1`,
    [id],
  );
  return r.rows[0];
}

export async function contarFilas(ctx: Pick<Ctx, 'bd'>, tabla: 'categories' | 'products'): Promise<number> {
  const r = await ctx.bd.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${tabla}`);
  return Number(r.rows[0]!.n);
}

/** Filas de auditoría de un producto (acción `price.changed`, §4.1). */
export interface FilaAuditoria {
  at: Date;
  actor_id: string | null;
  authorized_by: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
}
export async function auditoriaDe(ctx: Pick<Ctx, 'bd'>, entityId: string, accion?: string): Promise<FilaAuditoria[]> {
  const r = await ctx.bd.query<FilaAuditoria>(
    `SELECT at, actor_id, authorized_by, action, entity_type, entity_id, details
       FROM audit_log WHERE entity_id = $1 ${accion ? 'AND action = $2' : ''} ORDER BY id`,
    accion ? [entityId, accion] : [entityId],
  );
  return r.rows;
}
