// HU-01 E2E con PIN erróneo real (proyecto serie-pin, un worker, en serie).
// Gasta 4 fallos de la IP de la suite (presupuesto en tests/README.md).
// Los bloqueos largos se fabrican en BD (docs/testing.md §5.3).
import { expect, test } from '../support/e2e/base.ts';
import { cerrarSemilla, fabricarBloqueo, fabricarFallos, sembrarUsuario } from '../support/e2e/semilla.ts';
import { BarraSuperior, CambioPin, entrarComo, ETIQUETAS_CAMBIO_PIN, PantallaLogin, TEXTOS } from '../support/e2e/pantallas.ts';
import { junto } from '../support/e2e/medidas.ts';
import { pinAleatorio, pinIncorrecto } from '../support/datos.ts';

test.describe.configure({ mode: 'serial' });

test.afterAll(async () => {
  await cerrarSemilla();
});

test('[HU-01/CA-F05][HU-01/CA-U03] PIN incorrecto: "Usuario o PIN incorrectos" en texto junto al campo y el PIN se vacía (1 fallo)', { tag: ['@HU-01', '@CA-F05', '@CA-U03'] }, async ({ page }) => {
  const u = await sembrarUsuario({ rol: 'waiter' });
  const login = new PantallaLogin(page);
  await login.abrir();
  await login.elegir(u);
  await login.enviarPin(pinIncorrecto(u.pin));

  const alerta = login.alerta();
  await expect(alerta).toHaveText(new RegExp(TEXTOS.credenciales));
  // En texto (no solo color): el texto está en el árbol de accesibilidad.
  await expect(page.getByText(TEXTOS.credenciales)).toBeVisible();
  // Junto al campo.
  await junto(login.campoPin(), alerta);
  // PIN vaciado y "Entrar" deshabilitado hasta volver a escribirlo; el foco vuelve al campo.
  await expect(login.campoPin()).toHaveValue('');
  await expect(login.entrar()).toBeDisabled();
  // No se dice cuántos intentos quedan.
  await expect(page.getByText(/intentos? (restantes|quedan)|te quedan/i)).toHaveCount(0);
  // Reintento con el correcto: entra.
  await login.enviarPin(u.pin);
  await expect(new BarraSuperior(page).titulo('Pedidos')).toBeVisible();
});

test('[HU-01/CA-F05] usuario inexistente: el mismo mensaje "Usuario o PIN incorrectos" (1 fallo)', { tag: ['@HU-01', '@CA-F05'] }, async ({ page }) => {
  const login = new PantallaLogin(page);
  await login.abrir();
  await login.escribirUsuario(`Nadie ${Date.now().toString(36)}`);
  await login.enviarPin(pinAleatorio('waiter'));
  await expect(login.alerta()).toHaveText(new RegExp(TEXTOS.credenciales));
});

test('[HU-01/CA-F12] (b) el fallo que activa el bloqueo da el mensaje normal; (c) el siguiente, aunque el PIN sea correcto, "Cuenta bloqueada. Espera 5 min" (1 fallo)', { tag: ['@HU-01', '@CA-F12'] }, async ({ page }) => {
  // Sesión con PIN provisional: el PIN actual se vuelve a pedir en esta sesión.
  const u = await sembrarUsuario({ rol: 'manager', pinProvisional: true });
  const login = new PantallaLogin(page);
  await login.iniciarSesion(u);
  const cambio = new CambioPin(page);
  await cambio.visible();
  await fabricarFallos(u.id, 4);

  await cambio.cambiar(pinIncorrecto(u.pin), pinAleatorio('manager'));
  await expect(page.getByRole('alert')).toContainText(TEXTOS.pinActualMal);

  // Ya bloqueada 5 min: con el PIN correcto se rechaza sin comprobarlo.
  await cambio.cambiar(u.pin, pinAleatorio('manager'));
  await expect(page.getByRole('alert')).toContainText(TEXTOS.cuentaBloqueadaEspera(5));
  // (a) la sesión sigue: no vuelve al inicio de sesión.
  await cambio.visible();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled();
});

test('[HU-01/CA-F12] (c) bloqueo temporal fabricado con la sesión abierta: "Cuenta bloqueada. Espera X min" junto al campo; la sesión sigue (0 fallos)', { tag: ['@HU-01', '@CA-F12'] }, async ({ page }) => {
  const u = await sembrarUsuario({ rol: 'waiter', pinProvisional: true });
  const login = new PantallaLogin(page);
  await login.iniciarSesion(u);
  const cambio = new CambioPin(page);
  await cambio.visible();
  await fabricarBloqueo(u.id, { fallos: 10, segundos: 14 * 60 + 10 });
  await cambio.cambiar(u.pin, pinAleatorio('waiter'));
  const alerta = page.getByRole('alert');
  await expect(alerta).toContainText(TEXTOS.cuentaBloqueadaEspera(15));
  // T-30 (docs/ux/wireframes/01-login.md, 2.1d): "No se ha cambiado el PIN.",
  // los tres PIN vaciados y teclado y "Guardar PIN" deshabilitados durante la cuenta atrás.
  await expect(alerta).toContainText(TEXTOS.noSeHaCambiado);
  // La pantalla se queda en el paso del "Guardar PIN" (paso 3): el campo de ese paso (D-2.5-01)
  // está vacío. Los de los pasos 1 y 2 no se muestran en esta pantalla, así que se comprueba
  // además que ningún campo de PIN de la pantalla conserva valor (RS-29b: los tres PIN se vacían).
  await expect(cambio.campo(ETIQUETAS_CAMBIO_PIN.paso3)).toHaveValue('');
  for (const campo of await page.locator('input[type="password"]').all()) await expect(campo).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Guardar PIN' })).toBeDisabled();
  for (const d of ['0', '5', '9']) await expect(login.tecla(d)).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled();
  await cambio.visible();
});

test('[HU-01/CA-F13][RS-14] bloqueo indefinido desde otro dispositivo: la cola de barra abierta vuelve al login en ≤ 1 s y, al entrar, "Cuenta bloqueada…" (1 fallo)', { tag: ['@HU-01', '@CA-F13'] }, async ({ page, request }) => {
  const u = await sembrarUsuario({ rol: 'kitchen' });
  await entrarComo(page, u);
  // 19 fallos acumulados (fabricados tras el acierto del login).
  await fabricarFallos(u.id, 19);

  // 20.º fallo desde "otro dispositivo" (otro contexto HTTP del ejecutor).
  const t0 = Date.now();
  const r = await request.post('/api/v1/auth/login', {
    data: { name: u.nombre, pin: pinIncorrecto(u.pin) },
    headers: { origin: new URL(page.url()).origin },
  });
  expect(r.status()).toBe(401);

  await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible({ timeout: 1000 });
  expect(Date.now() - t0).toBeLessThanOrEqual(1500); // 1 s del criterio + latencia de la propia petición
  await expect(page.getByText(TEXTOS.bloqueoIndefinido)).toBeVisible();
  // Banner del motivo (reason de session.revoked = account_locked_manual), role="status".
  await expect(new PantallaLogin(page).banner(TEXTOS.bloqueoIndefinido)).toBeVisible();
  // La pantalla no conserva datos de la cola.
  await expect(page.getByRole('heading', { level: 1, name: 'Cola' })).toHaveCount(0);

  const login = new PantallaLogin(page);
  await login.elegir(u);
  await login.enviarPin(u.pin);
  await expect(login.alerta()).toContainText(TEXTOS.bloqueoIndefinido);
});
