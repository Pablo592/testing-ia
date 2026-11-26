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
import { expect, test } from '../support/e2e/base.ts';
import { caducarSesiones, cerrarSemilla, sembrarUsuario } from '../support/e2e/semilla.ts';
import { entrarComo, PantallaLogin, TEXTOS } from '../support/e2e/pantallas.ts';

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
