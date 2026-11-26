// T-46 (2.8a): el motivo de la vuelta a P-01 no debe perderse cuando el flujo SSE
// y `GET /auth/me` descubren la caducidad a la vez. Es lo que ocurre cuando una
// tablet despierta tras haber caducado la sesión: el temporizador de caducidad
// (`tick`) pide `GET /auth/me` y el vigilante del flujo (`watchdog`, 5 s sin
// mensajes) reabre el `EventSource` en el mismo instante.
//
// Causa (intermitente en `HU-01-iniciar-sesion.e2e.ts` › CA-N06 con WebKit y carga):
// el `401` de `GET /events` lleva `Set-Cookie: __Host-sid=; Max-Age=0` y un
// `EventSource` no puede leer su cuerpo (`details.reason`). La SPA reacciona con
// otro `GET /auth/me` (`onRejected`) que ya sale SIN cookie: su `401` no trae
// `details`, `bannerFromDetails(undefined)` da `null` y `end(null)` vuelve a P-01
// sin banner, antes de que llegue la respuesta del primer `GET /auth/me`
// (la que sí lleva `reason: absolute`), que `abortAll()` descarta.
//
// Este test lo hace determinista: retiene 1,5 s la respuesta del PRIMER
// `GET /auth/me` posterior a la caducidad; el `401` del flujo llega antes. Debe
// mostrarse el banner "La sesión ha caducado por duración máxima…" sea cual sea
// el orden de las respuestas (HU-01/CA-N06; `wireframes/01-login.md` "Vuelta al
// inicio de sesión"). FALLA con el código actual (tarea 2.8b, `developer`);
// no vale una solución que suba el tiempo de espera del test.
import type { Page } from '@playwright/test';
import { expect, test } from '../support/e2e/base.ts';
import { caducarSesiones, cerrarSemilla, sembrarUsuario } from '../support/e2e/semilla.ts';
import { BANNER_POR_MOTIVO, entrarComo, PantallaLogin, TEXTOS } from '../support/e2e/pantallas.ts';

test.afterAll(async () => {
  await cerrarSemilla();
});

test('[HU-01/CA-N06][T-46] barra: si el flujo SSE recibe el 401 antes que GET /auth/me, la vuelta a P-01 conserva el banner de caducidad', { tag: ['@HU-01', '@CA-N06'] }, async ({ page }) => {
  const u = await sembrarUsuario({ rol: 'kitchen' });
  await page.clock.install();
  await entrarComo(page, u);

  // Desde aquí, el primer GET /auth/me llega tarde (1,5 s); el resto, y el flujo, sin retraso.
  let retenida = false;
  let primeraPendiente = false;
  await page.route('**/api/v1/auth/me', async (ruta) => {
    if (primeraPendiente && !retenida) {
      retenida = true;
      await new Promise((ok) => setTimeout(ok, 1500));
    }
    await ruta.continue().catch(() => undefined);
  });

  await page.clock.fastForward('11:45:30');
  await expect(page.getByText(/La sesión caduca a las \d{2}:\d{2}/)).toBeVisible();
  await caducarSesiones(u.id, -1);
  primeraPendiente = true;
  await page.clock.fastForward('15:00');

  await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
  await expect(new PantallaLogin(page).banner(TEXTOS.caducidadBanner), 'banner de caducidad tras volver a P-01').toBeVisible();
});

// T-48, decisión de la 2.8d (tests/README.md §5, "Banner de P-01 por motivo"): un `401`
// SIN `details` (la petición salió sin cookie porque el `401` del flujo SSE ya la borró y
// su cuerpo no se puede leer) decide el banner según lo que el cliente sabe:
//   - la caducidad absoluta de su sesión (`me.session.expiresAt`, con la hora del servidor)
//     ya ha pasado  -> banner "caducado por duración máxima" (el motivo es esa caducidad);
//   - la sesión sigue vigente -> SIN banner (no hay motivo que afirmar).
// Las dos pruebas son idénticas salvo el tiempo que avanza el reloj del navegador; el
// servidor real no interviene en el 401 (se simula sin `details` ni `Set-Cookie`).
async function sesionConAuthMeYEventosRechazados(page: Page, u: Awaited<ReturnType<typeof sembrarUsuario>>) {
  await page.clock.install();
  let rechazar = false;
  const sinDetalles = { status: 401, contentType: 'application/json', body: '{"error":{"code":"UNAUTHENTICATED","message":"Sesión no válida","requestId":"e2e"}}' };
  await page.route('**/api/v1/auth/me', (ruta) => (rechazar ? ruta.fulfill(sinDetalles) : ruta.continue()));
  await page.route('**/api/v1/events', (ruta) => (rechazar ? ruta.fulfill({ status: 401, body: '' }) : ruta.continue()));
  await entrarComo(page, u);
  rechazar = true;
}

test('[HU-01/CA-N06][T-48] 401 sin details con la caducidad absoluta ya pasada: banner de caducidad por duración máxima', { tag: ['@HU-01', '@CA-N06'] }, async ({ page }) => {
  const u = await sembrarUsuario({ rol: 'kitchen' });
  await sesionConAuthMeYEventosRechazados(page, u);
  await page.clock.fastForward('12:01:00'); // > 12 h desde el inicio de la sesión
  await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
  await expect(new PantallaLogin(page).banner(TEXTOS.caducidadBanner), 'banner de caducidad').toBeVisible();
});

test('[HU-01/CA-N06][T-48] 401 sin details con la sesión aún vigente: vuelve a P-01 sin ningún banner de motivo', { tag: ['@HU-01', '@CA-N06'] }, async ({ page }) => {
  const u = await sembrarUsuario({ rol: 'kitchen' });
  await sesionConAuthMeYEventosRechazados(page, u);
  await page.clock.fastForward('00:30'); // el flujo se reabre (vigilante) y recibe el 401; faltan ~11 h 59 min
  await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
  const login = new PantallaLogin(page);
  for (const [motivo, texto] of Object.entries(BANNER_POR_MOTIVO)) {
    if (texto) await expect(login.banner(texto), `sin banner "${motivo}"`).toHaveCount(0);
  }
});
