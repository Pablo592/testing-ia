// SEC-032 / SEC-045 (c): respuestas de la sesión vieja que llegan TARDE no
// pueden borrar la cookie de un login nuevo (docs/arquitectura.md §5). Se
// retienen 3 s dos peticiones de la sesión vieja que están en vuelo cuando
// llega el primer 401 (el latido POST /session/activity y la reconexión del
// flujo SSE); durante la retención el usuario inicia sesión de nuevo por la
// interfaz; después se entregan las respuestas retenidas tal como las daría el
// servidor para el token viejo (401 con la cookie de borrado). La cookie nueva
// tiene que seguir y la siguiente petición dar 200.
// Es lo que hace que la app aborte las peticiones y cierre el EventSource al
// primer 401 (abortAll/stopChannels): sin eso, esta entrega tardía borraría la
// cookie nueva. Complementa a "Primer 401: no queda ningún canal" (SEC-032).
import { expect, test } from '../support/e2e/base.ts';
import type { Route } from '@playwright/test';
import { cerrarSemilla, fabricarInactividad, sembrarUsuario } from '../support/e2e/semilla.ts';
import { BarraSuperior, entrarComo, PantallaLogin, TEXTOS } from '../support/e2e/pantallas.ts';

test.afterAll(async () => {
  await cerrarSemilla();
});

const COOKIE_BORRADA = '__Host-sid=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict';
const RETRASO_MS = 3000;

test('[HU-01/CA-F09][HU-01/CA-F08] SEC-032: respuesta del latido y reconexión SSE retrasadas 3 s con un login nuevo durante el retraso: la cookie nueva sigue y la siguiente petición da 200', { tag: ['@HU-01', '@CA-F09'] }, async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.clock.install();
  const u = await sembrarUsuario({ rol: 'waiter' });

  // Solo se retienen las peticiones de la sesión vieja que salen mientras `retener` es true.
  let retener = false;
  const retenidas: { ruta: string; route: Route }[] = [];
  await page.route(/\/api\/v1\/(?:events|session\/activity)(?:\?.*)?$/, async (route) => {
    if (!retener) return route.continue();
    retenidas.push({ ruta: new URL(route.request().url()).pathname, route });
  });

  await entrarComo(page, u);
  const barra = new BarraSuperior(page);

  // Pasan > 60 s sin peticiones activas (el latido sale al primer gesto) y, con `retener`,
  // el vigilante de 5 s del flujo SSE reabre el EventSource: esa reconexión queda en vuelo.
  await page.clock.fastForward('01:10');
  retener = true;
  await barra.usuario(u).click(); // pointerdown → POST /session/activity (retenido)
  await page.clock.fastForward('00:10'); // vigilante del SSE → reconexión (retenida)
  await expect.poll(() => retenidas.map((r) => r.ruta).sort(), { message: 'latido y reconexión SSE en vuelo' }).toEqual(
    expect.arrayContaining(['/api/v1/events', '/api/v1/session/activity']),
  );

  // La sesión vieja caduca en el servidor y su primer 401 llega con "Cerrar sesión".
  await fabricarInactividad(u.id, 16);
  const primer401 = page.waitForResponse((r) => r.url().includes('/api/v1/auth/logout') && r.status() === 401);
  await barra.cerrarSesion().click();
  await primer401;
  await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
  retener = false;

  // Login nuevo durante el retraso.
  const login = new PantallaLogin(page);
  await login.elegir(u);
  await login.enviarPin(u.pin);
  await expect(barra.titulo('Pedidos')).toBeVisible();
  const cookieNueva = (await context.cookies()).find((c) => c.name === '__Host-sid');
  expect(cookieNueva?.value, 'cookie de la sesión nueva').toBeTruthy();

  // A los 3 s de haberse retenido llegan las respuestas de la sesión vieja.
  await page.waitForTimeout(RETRASO_MS);
  const cuerpo = JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'No autenticado', requestId: '00000000-0000-4000-8000-000000000000', details: { reason: 'idle' } } });
  for (const { route } of retenidas) {
    // Si la app abortó la petición (lo esperado), la entrega falla o no tiene efecto.
    await route
      .fulfill({ status: 401, headers: { 'content-type': 'application/json', 'set-cookie': COOKIE_BORRADA, 'cache-control': 'no-store' }, body: cuerpo })
      .catch(() => undefined);
  }
  await page.waitForTimeout(1500);

  const despues = (await context.cookies()).find((c) => c.name === '__Host-sid');
  expect(despues?.value, 'la cookie nueva no se borra ni se cambia').toBe(cookieNueva?.value);
  await expect(barra.titulo('Pedidos')).toBeVisible();
  await expect(barra.usuario(u)).toBeVisible();
  await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toHaveCount(0);
  const me = await page.request.get('/api/v1/auth/me');
  expect(me.status(), 'la siguiente petición con la sesión nueva').toBe(200);
  expect((await me.json()).user.name).toBe(u.nombre);
});
