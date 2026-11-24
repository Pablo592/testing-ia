// Punto único de adaptación de selectores y rutas de la SPA (tests/README.md §5).
// Selectores por rol y texto accesible (docs/testing.md §4.4).
import { expect, type Locator, type Page } from '@playwright/test';
import type { UsuarioE2E } from './semilla.ts';

export const RUTAS = {
  login: '/',
  pedidos: '/pedidos',
  cola: '/cola',
  menu: '/menu',
  personal: '/personal',
  resumen: '/resumen',
} as const;

export const TEXTOS = {
  quienEres: '¿Quién eres?',
  credenciales: 'Usuario o PIN incorrectos',
  desactivado: 'Usuario desactivado, contacta con el encargado',
  bloqueoTemporal: (min: number) => `Demasiados intentos fallidos. Podrás volver a intentarlo en ${min} min.`,
  bloqueoIndefinido: 'Cuenta bloqueada. Pide al encargado que la desbloquee.',
  soporte: 'Si no hay otro encargado, contacta con el soporte técnico.',
  dispositivo: (min: number) => `Demasiados intentos desde este dispositivo. Espera ${min} min.`,
  cuentaBloqueadaEspera: (min: number) => `Cuenta bloqueada. Espera ${min} min`,
  pinActualMal: 'El PIN actual no es correcto.',
  inactividadAviso: 'Tu sesión se cerrará en 60 s por inactividad',
  pinCambiado: 'PIN cambiado',
  noSeHaCambiado: 'No se ha cambiado el PIN.',
  /** Pantallas vacías de HU-01 (docs/ux/wireframes/10-acceso-denegado.md). */
  pantallaVacia: 'Esta pantalla todavía no está disponible.',
  // Banners de P-01 por motivo (docs/ux/wireframes/01-login.md, "Vuelta al
  // inicio de sesión", 2.1d). Los elige el motivo del servidor, nunca el message.
  inactividadBanner: 'Sesión cerrada por inactividad.',
  caducidadBanner: 'La sesión ha caducado por duración máxima. Vuelve a entrar con tu PIN.',
  /** Patrón para comprobar que NO aparece ningún banner de motivo. */
  cualquierBanner: /Sesión cerrada por inactividad|La sesión ha caducado|La sesión se ha cerrado|ha restablecido tu PIN|Has cambiado tu PIN|Usuario desactivado|Cuenta bloqueada\. Pide/,
  // "Acceso denegado" (docs/ux/wireframes/10-acceso-denegado.md, 2.1d).
  accesoDenegado: /acceso denegado/i,
  accesoDenegadoTitulo: 'Acceso denegado',
  accesoDenegadoTexto: 'No tienes permiso para ver esta pantalla.',
  accesoDenegadoAyuda: 'Si la necesitas, pide al encargado que revise tu rol.',
  accesoDenegadoDocumento: 'Acceso denegado · Café · Toma de pedidos',
} as const;

/** Banner de P-01 por motivo del 401 / session.revoked. `null` = sin banner. */
export const BANNER_POR_MOTIVO: Record<string, string | null> = {
  idle: TEXTOS.inactividadBanner,
  absolute: TEXTOS.caducidadBanner,
  user_disabled: 'Usuario desactivado, contacta con el encargado.',
  pin_reset: 'El encargado ha restablecido tu PIN: entra con el PIN provisional.',
  pin_changed: 'Has cambiado tu PIN en otro dispositivo: vuelve a entrar.',
  account_locked_manual: TEXTOS.bloqueoIndefinido,
  logout: null,
  sin_detalles: null,
  desconocido: 'La sesión se ha cerrado. Vuelve a entrar con tu PIN.',
};

/** Enlace de "Acceso denegado" según el rol: [nombre accesible, ruta]. */
export function enlaceInicio(rol: 'waiter' | 'kitchen' | 'manager'): [string, string] {
  return rol === 'kitchen' ? ['Ir a la cola', RUTAS.cola] : ['Ir a Pedidos', RUTAS.pedidos];
}

/** h1 de cada ruta de primer nivel (wireframes 02, 04, 06, 08, 09). */
export const TITULO_RUTA: Record<keyof typeof RUTAS, string> = {
  login: '',
  pedidos: 'Pedidos',
  cola: 'Cola',
  menu: 'Menú',
  personal: 'Personal',
  resumen: 'Resumen del día',
};

function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class PantallaLogin {
  constructor(readonly page: Page) {}

  async abrir(): Promise<void> {
    await this.page.goto(RUTAS.login);
    await expect(this.page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
  }

  tarjeta(u: Pick<UsuarioE2E, 'nombre'>): Locator {
    return this.page.getByRole('button', { name: new RegExp(escapar(u.nombre)) });
  }

  async elegir(u: Pick<UsuarioE2E, 'nombre'>): Promise<void> {
    await this.tarjeta(u).click();
  }

  async escribirUsuario(nombre: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Escribir mi usuario' }).click();
    await this.page.getByLabel('Usuario', { exact: true }).fill(nombre);
    await this.page.getByRole('button', { name: 'Continuar' }).click();
  }

  campoPin(): Locator {
    return this.page.getByLabel(/^PIN \((4 a 6|6) dígitos\)$/);
  }

  tecla(t: string): Locator {
    return this.page.getByRole('button', { name: t, exact: true });
  }

  entrar(): Locator {
    return this.page.getByRole('button', { name: 'Entrar', exact: true });
  }

  async teclear(pin: string): Promise<void> {
    for (const d of pin) await this.tecla(d).click();
  }

  async enviarPin(pin: string): Promise<void> {
    await this.teclear(pin);
    await this.entrar().click();
  }

  async iniciarSesion(u: Pick<UsuarioE2E, 'nombre' | 'pin'>): Promise<void> {
    await this.abrir();
    await this.elegir(u);
    await this.enviarPin(u.pin);
  }

  alerta(): Locator {
    return this.page.getByRole('alert');
  }

  /** Banner de motivo del paso 1 (role="status"). */
  banner(texto: string): Locator {
    return this.page.getByRole('status').filter({ hasText: texto });
  }
}

/** Estado "Acceso denegado" de la layout (la URL no cambia). */
export class AccesoDenegado {
  constructor(readonly page: Page) {}

  titulo(): Locator {
    return this.page.getByRole('heading', { level: 1, name: TEXTOS.accesoDenegadoTitulo });
  }

  async comprobar(rol: 'waiter' | 'kitchen' | 'manager'): Promise<void> {
    await expect(this.titulo()).toBeVisible();
    // Único elemento visible con ese texto (no se repite en el contenido ni en aria-live).
    await expect(this.page.getByText(TEXTOS.accesoDenegado).filter({ visible: true })).toHaveCount(1);
    await expect(this.page.getByText(TEXTOS.accesoDenegadoTexto, { exact: true })).toBeVisible();
    await expect(this.page.getByText(TEXTOS.accesoDenegadoAyuda, { exact: true })).toBeVisible();
    await expect(this.page).toHaveTitle(TEXTOS.accesoDenegadoDocumento);
    await expect(this.titulo()).toBeFocused();
    const [nombre] = enlaceInicio(rol);
    await expect(this.enlace(rol)).toBeVisible();
    await expect(this.page.getByRole('button', { name: nombre, exact: true })).toHaveCount(0);
  }

  enlace(rol: 'waiter' | 'kitchen' | 'manager'): Locator {
    return this.page.getByRole('link', { name: enlaceInicio(rol)[0], exact: true });
  }
}

export class CambioPin {
  constructor(readonly page: Page) {}
  private login = (p: Page) => new PantallaLogin(p);

  async visible(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Cambia tu PIN' })).toBeVisible();
  }

  /** Pasos 1-3 y "Guardar PIN". */
  async cambiar(actual: string, nuevo: string): Promise<void> {
    const l = this.login(this.page);
    await l.teclear(actual);
    await this.page.getByRole('button', { name: 'Siguiente' }).click();
    await l.teclear(nuevo);
    await this.page.getByRole('button', { name: 'Siguiente' }).click();
    await l.teclear(nuevo);
    await this.page.getByRole('button', { name: 'Guardar PIN' }).click();
  }
}

export class BarraSuperior {
  constructor(readonly page: Page) {}

  titulo(texto: string): Locator {
    return this.page.getByRole('heading', { level: 1, name: texto });
  }

  usuario(u: Pick<UsuarioE2E, 'nombre' | 'rolTexto'>): Locator {
    return this.page.getByText(`${u.nombre} · ${u.rolTexto}`, { exact: true });
  }

  cerrarSesion(): Locator {
    return this.page.getByRole('button', { name: 'Cerrar sesión' });
  }

  gestion(): Locator {
    return this.page.getByRole('button', { name: 'Gestión' });
  }

  opcionGestion(nombre: string): Locator {
    return this.page.getByRole('menuitem', { name: nombre, exact: true }).or(this.page.getByRole('link', { name: nombre, exact: true }));
  }
}

/** Inicia sesión por la UI y espera la pantalla de destino del rol. */
export async function entrarComo(page: Page, u: UsuarioE2E): Promise<void> {
  const login = new PantallaLogin(page);
  await login.iniciarSesion(u);
  const barra = new BarraSuperior(page);
  await expect(barra.titulo(u.rol === 'kitchen' ? 'Cola' : 'Pedidos')).toBeVisible();
}
