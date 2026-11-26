// HU-01 E2E (proyectos tablet-h y tablet-h-webkit). Sin PIN erróneo: los
// fallos reales van en HU-01-errores.pin.e2e.ts (presupuesto por IP).
// Textos exactos: docs/ux/wireframes/01-login.md. Selectores: tests/support/e2e/pantallas.ts.
import { expect, test, vigilarCsp } from '../support/e2e/base.ts';
import {
  caducarSesiones,
  cerrarSemilla,
  fabricarBloqueo,
  fabricarInactividad,
  sembrarUsuario,
  sesionesActivas,
} from '../support/e2e/semilla.ts';
import {
  AccesoDenegado,
  BANNER_POR_MOTIVO,
  BarraSuperior,
  CambioPin,
  enlaceInicio,
  entrarComo,
  PantallaLogin,
  RUTAS,
  TEXTOS,
  TITULO_RUTA,
} from '../support/e2e/pantallas.ts';
import { enAlcance } from '../support/alcance.ts';
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
    const destinos: [string, string, string, boolean][] = [
      ['Cola de barra', RUTAS.cola, TITULO_RUTA.cola, false],
      ['Menú', RUTAS.menu, TITULO_RUTA.menu, !enAlcance('HU-05')],
      ['Personal', RUTAS.personal, TITULO_RUTA.personal, !enAlcance('HU-07')],
      ['Resumen del día', RUTAS.resumen, TITULO_RUTA.resumen, !enAlcance('HU-08')],
    ];
    for (const [opcion, ruta, titulo, vacia] of destinos) {
      await barra.gestion().click();
      await barra.opcionGestion(opcion).click();
      await expect(page).toHaveURL(new RegExp(`${ruta}$`));
      await expect(barra.titulo(titulo)).toBeVisible();
      await expect(page.getByText(TEXTOS.accesoDenegado)).toHaveCount(0);
      // Pantallas vacías de HU-01 hasta que llegue su historia (wireframe 10).
      if (vacia) await expect(page.getByText(TEXTOS.pantallaVacia, { exact: true })).toBeVisible();
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
      const csp = await vigilarCsp(ctx);
      const page = await ctx.newPage();
      const u = await sembrarUsuario({ rol });
      await entrarComo(page, u);
      for (const ruta of rutas) {
        const peticionesApi: string[] = [];
        page.on('request', (r) => {
          if (r.url().includes('/api/v1/') && !/\/auth\/me|\/events|\/session\/activity|\/telemetry/.test(r.url())) peticionesApi.push(r.url());
        });
        await page.goto(ruta);
        const denegado = new AccesoDenegado(page);
        await denegado.comprobar(rol);
        // La URL no cambia y la barra superior sigue con nombre y rol (CA-U04).
        await expect(page).toHaveURL(new RegExp(`${ruta}$`));
        await expect(new BarraSuperior(page).usuario(u)).toBeVisible();
        // No se cargan datos de la función denegada.
        expect(peticionesApi, ruta).toEqual([]);
        page.removeAllListeners('request');
      }
      // El enlace lleva al inicio del rol.
      const denegado = new AccesoDenegado(page);
      await denegado.enlace(rol).click();
      await expect(page).toHaveURL(new RegExp(`${enlaceInicio(rol)[1]}$`));
      await expect(denegado.titulo()).toHaveCount(0);
      expect(csp.violaciones, 'violaciones de CSP (RS-26 E)').toEqual([]);
      await ctx.close();
    }
  });

  test('[HU-01/CA-F04] un 403 FORBIDDEN de la API en una pantalla montada la sustituye por "Acceso denegado" y recarga /auth/me', { tag: ['@HU-01', '@CA-F04'] }, async ({ page }) => {
    // P-02 pide su snapshot (GET /orders/floor) al montarse desde HU-02 (docs/arquitectura.md §5.2, §6).
    test.skip(!enAlcance('HU-02'), 'P-02 no pide datos hasta HU-02 (tests/support/alcance.ts)');
    const u = await sembrarUsuario({ rol: 'waiter' });
    await entrarComo(page, u);
    await page.route('**/api/v1/orders/floor', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'FORBIDDEN', message: 'x', requestId: 'r' } }),
      }),
    );
    const recargaMe = page.waitForRequest((r) => r.url().endsWith('/api/v1/auth/me'));
    await page.goto(RUTAS.pedidos);
    await new AccesoDenegado(page).comprobar('waiter');
    await recargaMe;
    await expect(page).toHaveURL(new RegExp(`${RUTAS.pedidos}$`));
  });

  test('[HU-01/CA-F04] otros 403 (PIN_CHANGE_REQUIRED) no muestran "Acceso denegado"', { tag: ['@HU-01', '@CA-F04'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'waiter', pinProvisional: true });
    await new PantallaLogin(page).iniciarSesion(u);
    await new CambioPin(page).visible();
    await page.goto(RUTAS.pedidos);
    await expect(page.getByText(TEXTOS.accesoDenegado)).toHaveCount(0);
  });
});

test.describe('Banner de P-01 por el motivo del 401 (sin evento SSE)', () => {
  test('[HU-01/CA-F09] sesión caducada por inactividad mientras la pantalla estaba apagada: al recargar, P-01 con "Sesión cerrada por inactividad."', { tag: ['@HU-01', '@CA-F09'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'waiter' });
    await entrarComo(page, u);
    await fabricarInactividad(u.id, 16);
    await page.reload();
    const login = new PantallaLogin(page);
    await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
    await expect(login.banner(BANNER_POR_MOTIVO.idle!)).toBeVisible();
    // Desaparece al elegir un usuario.
    await login.elegir(u);
    await expect(page.getByText(TEXTOS.inactividadBanner)).toHaveCount(0);
  });

  test('[HU-01/CA-F08] tras cerrar sesión (revokedReason logout) no hay banner, tampoco al recargar', { tag: ['@HU-01', '@CA-F08'] }, async ({ page }) => {
    const u = await sembrarUsuario({ rol: 'waiter' });
    await entrarComo(page, u);
    await new BarraSuperior(page).cerrarSesion().click();
    await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
    await expect(page.getByText(TEXTOS.cualquierBanner)).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
    await expect(page.getByText(TEXTOS.cualquierBanner)).toHaveCount(0);
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
    await expect(new PantallaLogin(page).banner(TEXTOS.caducidadBanner)).toBeVisible();
  });
});

// SEC-032 (docs/seguridad.md, 2.1k): al primer 401 la app cierra el
// EventSource y sus reconexiones, para los temporizadores y no envía nada por
// sendBeacon ni fetch({ keepalive }), para que ninguna respuesta tardía de la
// sesión vieja borre la cookie de un login nuevo (docs/arquitectura.md §5).
test.describe('Primer 401: no queda ningún canal de la sesión vieja (SEC-032)', () => {
  test('[HU-01/CA-F09][HU-01/CA-F08] tras el 401 idle: EventSource cerrado, sin sendBeacon ni keepalive y sin peticiones con sesión mientras se ve P-01', { tag: ['@HU-01', '@CA-F09'] }, async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>;
      const fuentes: EventSource[] = [];
      w.__fuentes = fuentes;
      w.__beacons = 0;
      w.__keepalive = 0;
      const Original = window.EventSource;
      window.EventSource = class extends Original {
        constructor(url: string | URL, init?: EventSourceInit) {
          super(url, init);
          fuentes.push(this);
        }
      } as typeof EventSource;
      const beacon = navigator.sendBeacon?.bind(navigator);
      navigator.sendBeacon = (url: string | URL, datos?: BodyInit | null) => {
        w.__beacons = (w.__beacons as number) + 1;
        return beacon ? beacon(url, datos) : false;
      };
      const original = window.fetch.bind(window);
      window.fetch = (entrada: RequestInfo | URL, opciones?: RequestInit) => {
        if (opciones?.keepalive || (entrada instanceof Request && entrada.keepalive)) w.__keepalive = (w.__keepalive as number) + 1;
        return original(entrada, opciones);
      };
    });
    const u = await sembrarUsuario({ rol: 'waiter' });
    await entrarComo(page, u);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __fuentes: EventSource[] }).__fuentes.length), { message: 'la layout abre /events' }).toBeGreaterThan(0);

    // La sesión caduca en el servidor; la siguiente acción del usuario recibe el primer 401.
    await fabricarInactividad(u.id, 16);
    const primer401 = page.waitForResponse((r) => r.url().includes('/api/v1/') && r.status() === 401);
    await new BarraSuperior(page).cerrarSesion().click();
    await primer401;
    await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();

    // Desde aquí, ninguna petición con sesión (sí las públicas de P-01).
    const conSesion: string[] = [];
    page.on('request', (r) => {
      const ruta = new URL(r.url()).pathname;
      if (ruta.startsWith('/api/') && ruta !== '/api/v1/auth/login-options' && ruta !== '/api/v1/auth/login') conSesion.push(`${r.method()} ${ruta}`);
    });
    // Más que el vigilante de 5 s del SSE y que el latido de actividad.
    await page.waitForTimeout(8000);
    expect(conSesion).toEqual([]);
    const estado = await page.evaluate(() => {
      const w = window as unknown as { __fuentes: EventSource[]; __beacons: number; __keepalive: number };
      return { abiertas: w.__fuentes.filter((f) => f.readyState !== EventSource.CLOSED).length, beacons: w.__beacons, keepalive: w.__keepalive };
    });
    expect(estado).toEqual({ abiertas: 0, beacons: 0, keepalive: 0 });
  });
});

// RS-18 / SEC-031 por la pila real (Caddy + app): la SPA solo responde a GET.
test.describe('Rutas de la SPA y métodos que no son GET (RS-18, SEC-031)', () => {
  test('[HU-01/CA-F04] GET /pedidos → index.html; POST/PATCH /pedidos y /api/v1/settings → 404 sin index.html ni Set-Cookie', { tag: ['@HU-01', '@CA-F04'] }, async ({ request, baseURL }) => {
    const spa = await request.get(RUTAS.pedidos);
    expect(spa.status()).toBe(200);
    expect(spa.headers()['content-type']).toMatch(/text\/html/);
    const origin = new URL(baseURL!).origin;
    for (const [metodo, ruta] of [['POST', RUTAS.pedidos], ['PATCH', RUTAS.cola], ['POST', '/no-existe'], ['PATCH', '/api/v1/settings']] as const) {
      const r = await request.fetch(ruta, { method: metodo, headers: { origin, 'content-type': 'application/json' }, data: '{bad' });
      expect(r.status(), `${metodo} ${ruta}`).toBe(404);
      expect(r.headers()['content-type'] ?? '', `${metodo} ${ruta}`).not.toMatch(/text\/html/);
      expect(r.headers()['set-cookie'], `${metodo} ${ruta}`).toBeUndefined();
    }
  });
});
