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
  inactividadBanner: 'Sesión cerrada por inactividad.',
  caducidadBanner: 'La sesión ha caducado (12 h). Vuelve a entrar con tu PIN.',
  accesoDenegado: /acceso denegado/i,
} as const;

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
