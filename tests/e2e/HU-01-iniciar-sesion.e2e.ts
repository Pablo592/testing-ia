// HU-01 E2E (proyectos tablet-h y tablet-h-webkit). Sin PIN erróneo: los
// fallos reales van en HU-01-errores.pin.e2e.ts (presupuesto por IP).
// Textos exactos: docs/ux/wireframes/01-login.md. Selectores: tests/support/e2e/pantallas.ts.
import { expect, test } from '@playwright/test';
import {
  caducarSesiones,
  cerrarSemilla,
  fabricarBloqueo,
  sembrarUsuario,
  sesionesActivas,
} from '../support/e2e/semilla.ts';
import { BarraSuperior, CambioPin, entrarComo, PantallaLogin, RUTAS, TEXTOS } from '../support/e2e/pantallas.ts';
import { pinAleatorio } from '../support/datos.ts';

test.afterAll(async () => {
  await cerrarSemilla();
});

test.describe('Destino y funciones por rol', () => {
  test('[HU-01/CA-F01][HU-01/CA-U04] camarero entra a "Pedidos" y no ve gestión de menú ni de usuarios', { tag: ['@HU-01', '@CA-F01', '@smoke'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'waiter' });
    await entrarComo(page, u);
    const barra = new BarraSuperior(page);
    await expect(page).toHaveURL(new RegExp(`${RUTAS.pedidos}$`));
    await expect(barra.usuario(u)).toBeVisible();
    await expect(barra.gestion()).toHaveCount(0);
    for (const t of ['Menú', 'Personal', 'Resumen del día', 'Gestión']) {
      await expect(page.getByRole('link', { name: t, exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: t, exact: true })).toHaveCount(0);
    }
  });

  test('[HU-01/CA-F02][HU-01/CA-U04] barra entra directamente a la cola y no tiene acciones de crear, cobrar ni cancelar', { tag: ['@HU-01', '@CA-F02'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'kitchen' });
    await entrarComo(page, u);
    await expect(page).toHaveURL(new RegExp(`${RUTAS.cola}$`));
    await expect(new BarraSuperior(page).usuario(u)).toBeVisible();
    for (const t of [/nuevo pedido/i, /^cobrar/i, /cancelar pedido/i, /gestión/i]) {
      await expect(page.getByRole('button', { name: t })).toHaveCount(0);
      await expect(page.getByRole('link', { name: t })).toHaveCount(0);
    }
  });

  test('[HU-01/CA-F03][HU-01/CA-U04] encargado entra a "Pedidos" y desde "Gestión" llega a cola, menú, personal y resumen', { tag: ['@HU-01', '@CA-F03'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'manager' });
    await entrarComo(page, u);
    const barra = new BarraSuperior(page);
    const destinos: [string, string][] = [
      ['Cola de barra', RUTAS.cola],
      ['Menú', RUTAS.menu],
      ['Personal', RUTAS.personal],
      ['Resumen del día', RUTAS.resumen],
    ];
    for (const [opcion, ruta] of destinos) {
      await barra.gestion().click();
      await barra.opcionGestion(opcion).click();
      await expect(page).toHaveURL(new RegExp(`${ruta}$`));
      await expect(page.getByText(TEXTOS.accesoDenegado)).toHaveCount(0);
      // CA-U04: nombre y rol visibles en todas las pantallas.
      await expect(barra.usuario(u)).toBeVisible();
    }
  });

  test('[HU-01/CA-F04][HU-01/CA-N02] por URL: camarero en menú, personal, resumen y cola, y barra en pedidos → "Acceso denegado"', { tag: ['@HU-01', '@CA-F04'] }, async ({ browser }) => {
    const casos: ['waiter' | 'kitchen', string[]][] = [
      ['waiter', [RUTAS.menu, RUTAS.personal, RUTAS.resumen, RUTAS.cola]],
      ['kitchen', [RUTAS.pedidos, RUTAS.menu, RUTAS.personal, RUTAS.resumen]],
    ];
    for (const [rol, rutas] of casos) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const u = await sembrarUsuario({ rol });
      await entrarComo(page, u);
      for (const ruta of rutas) {
        const peticionesApi: string[] = [];
        page.on('request', (r) => {
          if (r.url().includes('/api/v1/') && !/\/auth\/me|\/events|\/session\/activity|\/telemetry/.test(r.url())) peticionesApi.push(r.url());
        });
        await page.goto(ruta);
        await expect(page.getByText(TEXTOS.accesoDenegado)).toBeVisible();
        // No se cargan datos de la función denegada.
        expect(peticionesApi, ruta).toEqual([]);
        page.removeAllListeners('request');
      }
      await ctx.close();
    }
  });
});

test.describe('Inicio de sesión en dos pasos', () => {
  test('[HU-01/CA-U01] dos pasos: elegir usuario (1 toque) → PIN + "Entrar"; sin pantallas intermedias', { tag: ['@HU-01', '@CA-U01'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'waiter' });
    const login = new PantallaLogin(page);
    await login.abrir();
    // Paso 1
    await login.elegir(u);
    // Paso 2, en la misma pantalla y sin más toques: saludo, campo y teclado.
    await expect(page.getByText(`Hola, ${u.nombre} (${u.rolTexto})`)).toBeVisible();
    await expect(login.campoPin()).toBeVisible();
    await expect(login.entrar()).toBeDisabled();
    await login.enviarPin(u.pin);
    await expect(new BarraSuperior(page).titulo('Pedidos')).toBeVisible();
  });

  test('[HU-01/CA-N01] la etiqueta del PIN dice "(6 dígitos)" para el encargado y "(4 a 6 dígitos)" para el resto; "Entrar" se habilita con el mínimo', { tag: ['@HU-01', '@CA-N01'] }, async ({ page }) => {
    const m = await sembrarUsuario({ rol: 'manager' });
    const w = await sembrarUsuario({ rol: 'waiter', pin: pinAleatorio('waiter', 4) });
    const login = new PantallaLogin(page);
    await login.abrir();
    await login.elegir(m);
    await expect(page.getByLabel('PIN (6 dígitos)', { exact: true })).toBeVisible();
    await login.teclear(m.pin.slice(0, 5));
    await expect(login.entrar()).toBeDisabled();
    await login.teclear(m.pin.slice(5));
    await expect(login.entrar()).toBeEnabled();

    await page.getByRole('button', { name: 'Cambiar de usuario' }).click();
    await login.elegir(w);
    await expect(page.getByLabel('PIN (4 a 6 dígitos)', { exact: true })).toBeVisible();
    await login.teclear(w.pin.slice(0, 3));
    await expect(login.entrar()).toBeDisabled();
    await login.teclear(w.pin.slice(3));
    await expect(login.entrar()).toBeEnabled();
  });

  test('[HU-01/CA-N01][RS-29b] el PIN se muestra como puntos y no queda en el almacenamiento del navegador', { tag: ['@HU-01', '@CA-N01'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'waiter' });
    const login = new PantallaLogin(page);
    await login.abrir();
    await login.elegir(u);
    await login.teclear(u.pin);
    await expect(login.campoPin()).toHaveAttribute('type', 'password');
    await expect(page.getByText(u.pin, { exact: true })).toHaveCount(0);
    await login.entrar().click();
    await expect(new BarraSuperior(page).titulo('Pedidos')).toBeVisible();
    const almacenado = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(almacenado).not.toContain(u.pin);
  });

  test('[HU-01/CA-F07] usuario desactivado con PIN correcto → "Usuario desactivado, contacta con el encargado"', { tag: ['@HU-01', '@CA-F07'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'waiter', activo: false });
    const login = new PantallaLogin(page);
    await login.abrir();
    // No aparece en la rejilla: se escribe el usuario.
    await expect(login.tarjeta(u)).toHaveCount(0);
    await login.escribirUsuario(u.nombre);
    await login.enviarPin(u.pin);
    await expect(login.alerta()).toContainText(TEXTOS.desactivado);
    await expect(page).toHaveURL(new RegExp(`${RUTAS.login}$`));
  });
});

test.describe('Bloqueos (fabricados en BD, sin gastar intentos)', () => {
  test('[HU-01/CA-F06] bloqueo temporal: tiempo restante en minutos, teclado deshabilitado y se rehabilita al acabar', { tag: ['@HU-01', '@CA-F06'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'waiter' });
    await fabricarBloqueo(u.id, { fallos: 5, segundos: 270 });
    await page.clock.install();
    const login = new PantallaLogin(page);
    await login.abrir();
    await login.elegir(u);
    await login.enviarPin(u.pin); // PIN correcto: el servidor responde 423 sin contarlo
    await expect(login.alerta()).toContainText(TEXTOS.bloqueoTemporal(5));
    await expect(login.tecla('1')).toBeDisabled();
    await expect(login.entrar()).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Cambiar de usuario' })).toBeEnabled();
    // Cuenta atrás: al llegar a 0 el bloque desaparece y el teclado se habilita solo.
    await page.clock.fastForward('04:31');
    await expect(page.getByText(/Demasiados intentos fallidos/)).toHaveCount(0);
    await expect(login.tecla('1')).toBeEnabled();
  });

  test('[HU-01/CA-F06] bloqueo de 60 min: "en 58 min" con 57 min 30 s restantes (minutos hacia arriba, I-03)', { tag: ['@HU-01', '@CA-F06'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'kitchen' });
    await fabricarBloqueo(u.id, { fallos: 15, segundos: 57 * 60 + 30 });
    const login = new PantallaLogin(page);
    await login.abrir();
    await login.elegir(u);
    await login.enviarPin(u.pin);
    await expect(login.alerta()).toContainText(TEXTOS.bloqueoTemporal(58));
  });

  test('[HU-01/CA-F06][HU-01/CA-F13] bloqueo indefinido: "Cuenta bloqueada. Pide al encargado que la desbloquee." y teclado oculto', { tag: ['@HU-01', '@CA-F06'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'waiter' });
    await fabricarBloqueo(u.id, { fallos: 20, indefinido: true });
    const login = new PantallaLogin(page);
    await login.abrir();
    await login.elegir(u);
    await login.enviarPin(u.pin);
    await expect(login.alerta()).toContainText(TEXTOS.bloqueoIndefinido);
    await expect(login.tecla('1')).toBeHidden();
    await expect(page.getByText(TEXTOS.soporte)).toHaveCount(0);
  });

  test('[HU-01/CA-F06] bloqueo indefinido de un encargado: añade "Si no hay otro encargado, contacta con el soporte técnico."', { tag: ['@HU-01', '@CA-F06'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'manager' });
    await fabricarBloqueo(u.id, { fallos: 20, indefinido: true });
    const login = new PantallaLogin(page);
    await login.abrir();
    await login.elegir(u);
    await login.enviarPin(u.pin);
    await expect(login.alerta()).toContainText(TEXTOS.bloqueoIndefinido);
    await expect(page.getByText(TEXTOS.soporte)).toBeVisible();
  });

  test('[HU-01/CA-F11] 429 del dispositivo: mensaje con los minutos en el paso 2 y banner en el paso 1 (respuesta interceptada)', { tag: ['@HU-01', '@CA-F11'] }, async ({ page }) => {
    // La regla del servidor se prueba en integración (HU-01-dispositivo.int.test.ts);
    // aquí solo la presentación, sin gastar el límite real de la IP de la suite.
    const u = await sembrarUsuario({ rol: 'waiter' });
    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill({
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': '540' },
        body: JSON.stringify({ error: { code: 'TOO_MANY_ATTEMPTS', message: 'Demasiados intentos', requestId: 'x', details: { retryAfterSeconds: 540 } } }),
      }),
    );
    const login = new PantallaLogin(page);
    await login.abrir();
    await login.elegir(u);
    await login.enviarPin(u.pin);
    await expect(login.alerta()).toContainText(TEXTOS.dispositivo(9));
    await expect(login.tecla('1')).toBeDisabled();
    await page.getByRole('button', { name: 'Cambiar de usuario' }).click();
    await expect(page.getByText(TEXTOS.dispositivo(9))).toBeVisible();
  });
});

test.describe('Cambio obligatorio del PIN provisional (dependencia de HU-01)', () => {
  test('[HU-07/CA-F04][HU-01/CA-U04] con PIN provisional solo puede cambiarlo; tras guardarlo entra a "Pedidos"', { tag: ['@HU-01'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'manager', pinProvisional: true });
    const login = new PantallaLogin(page);
    await login.iniciarSesion(u);
    const cambio = new CambioPin(page);
    await cambio.visible();
    await expect(new BarraSuperior(page).usuario(u)).toBeVisible();
    // Por URL no se llega a otra pantalla.
    await page.goto(RUTAS.pedidos);
    await cambio.visible();
    await cambio.cambiar(u.pin, pinAleatorio('manager'));
    await expect(page.getByText('PIN cambiado')).toBeVisible();
    await expect(new BarraSuperior(page).titulo('Pedidos')).toBeVisible();
  });
});

test.describe('Cierre de sesión', () => {
  test('[HU-01/CA-F08][RS-14] "Cerrar sesión" vuelve al inicio de sesión, sin banner, y la sesión anterior deja de valer', { tag: ['@HU-01', '@CA-F08', '@smoke'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'waiter' });
    await entrarComo(page, u);
    const cookies = await page.context().cookies();
    const sid = cookies.find((c) => c.name === '__Host-sid');
    expect(sid, 'cookie de sesión').toBeDefined();
    expect(sid!.httpOnly).toBe(true);
    expect(sid!.secure).toBe(true);
    expect(sid!.sameSite).toBe('Strict');

    await new BarraSuperior(page).cerrarSesion().click();
    await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
    await expect(page.getByText(/Sesión cerrada|caducado|bloqueada/)).toHaveCount(0);
    // Volver atrás o ir por URL no recupera la sesión.
    await page.goBack();
    await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
    await page.goto(RUTAS.pedidos);
    await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
    // La cookie anterior, reutilizada, recibe 401.
    const r = await page.request.get('/api/v1/auth/me', { headers: { cookie: `__Host-sid=${sid!.value}` } });
    expect(r.status()).toBe(401);
    expect(await sesionesActivas(u.id)).toBe(0);
  });
});

test.describe('Cierre automático', () => {
  test('[HU-01/CA-F09] camarero: aviso a los 14 min y, a los 15 min sin tocar nada, vuelta al login con "Sesión cerrada por inactividad."', { tag: ['@HU-01', '@CA-F09'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'waiter' });
    await page.clock.install();
    await entrarComo(page, u);
    await page.clock.fastForward('14:00');
    await expect(page.getByText(TEXTOS.inactividadAviso)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Seguir conectado' })).toBeVisible();
    await page.clock.fastForward('01:01');
    await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
    await expect(page.getByText(TEXTOS.inactividadBanner)).toBeVisible();
  });

  test('[HU-01/CA-F09] "Seguir conectado" en el aviso mantiene la sesión', { tag: ['@HU-01', '@CA-F09'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'waiter' });
    await page.clock.install();
    await entrarComo(page, u);
    await page.clock.fastForward('14:00');
    await page.getByRole('button', { name: 'Seguir conectado' }).click();
    await page.clock.fastForward('02:00');
    await expect(new BarraSuperior(page).titulo('Pedidos')).toBeVisible();
    await expect(page.getByText(TEXTOS.inactividadAviso)).toHaveCount(0);
  });

  test('[HU-01/CA-F09] encargado con la cola de barra abierta también se cierra por inactividad', { tag: ['@HU-01', '@CA-F09'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'manager' });
    await page.clock.install();
    await entrarComo(page, u);
    const barra = new BarraSuperior(page);
    await barra.gestion().click();
    await barra.opcionGestion('Cola de barra').click();
    await expect(barra.titulo('Cola')).toBeVisible();
    await page.clock.fastForward('15:01');
    await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
    await expect(page.getByText(TEXTOS.inactividadBanner)).toBeVisible();
  });

  test('[HU-01/CA-F09] barra con la cola abierta 30 min sin tocarla: sigue en la cola, sin aviso', { tag: ['@HU-01', '@CA-F09'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'kitchen' });
    await page.clock.install();
    await entrarComo(page, u);
    await page.clock.fastForward('30:00');
    await expect(new BarraSuperior(page).titulo('Cola')).toBeVisible();
    await expect(page.getByText(TEXTOS.inactividadAviso)).toHaveCount(0);
  });

  test('[HU-01/CA-N06] barra: aviso 15 min antes de las 12 h y, al caducar, vuelta al login con su motivo', { tag: ['@HU-01', '@CA-N06'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'kitchen' });
    await page.clock.install();
    await entrarComo(page, u);
    await page.clock.fastForward('11:45:30');
    await expect(page.getByText(/La sesión caduca a las \d{2}:\d{2}/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Volver a entrar' })).toBeVisible();
    // El servidor también la da por caducada (la pila real usa su reloj).
    await caducarSesiones(u.id, -1);
    await page.clock.fastForward('15:00');
    await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
    await expect(page.getByText(TEXTOS.caducidadBanner)).toBeVisible();
  });
});
