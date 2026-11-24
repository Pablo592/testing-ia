// HU-01/CA-N04 (WCAG 2.2 AA, contraste ≥ 4,5:1, etiquetas accesibles) y
// CA-U03 (error en texto). axe con las etiquetas de docs/testing.md §3: cero
// violaciones serious/critical; las moderate/minor se adjuntan al informe.
// Los estados de error y bloqueo se provocan con respuestas interceptadas o
// fabricadas en BD (sin gastar intentos reales de la IP de la suite).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { cerrarSemilla, fabricarBloqueo, sembrarUsuario } from '../support/e2e/semilla.ts';
import { BarraSuperior, CambioPin, entrarComo, PantallaLogin } from '../support/e2e/pantallas.ts';

test.afterAll(async () => {
  await cerrarSemilla();
});

async function auditar(page: Page, info: TestInfo, estado: string): Promise<void> {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const graves = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const leves = r.violations.filter((v) => !graves.includes(v));
  if (leves.length > 0) {
    await info.attach(`axe-leves-${estado}.json`, { body: JSON.stringify(leves, null, 2), contentType: 'application/json' });
  }
  expect(
    graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    `violaciones serious/critical en ${estado}`,
  ).toEqual([]);
}

function respuestaError(status: number, code: string, retry?: number) {
  return {
    status,
    headers: { 'content-type': 'application/json', ...(retry ? { 'retry-after': String(retry) } : {}) },
    body: JSON.stringify({ error: { code, message: code, requestId: 'x', ...(retry ? { details: { retryAfterSeconds: retry } } : {}) } }),
  };
}

test('[HU-01/CA-N04] P-01 paso 1 (rejilla de usuarios) sin violaciones serious/critical', { tag: ['@HU-01', '@CA-N04'] }, async ({ page }, info) => {
  await sembrarUsuario({ rol: 'waiter' });
  const login = new PantallaLogin(page);
  await login.abrir();
  await auditar(page, info, 'P-01-paso1');
});

test('[HU-01/CA-N04] P-01 paso 2 (PIN): campo con etiqueta accesible y teclado con nombres; sin violaciones', { tag: ['@HU-01', '@CA-N04'] }, async ({ page }, info) => {
  const u = await sembrarUsuario({ rol: 'manager' });
  const login = new PantallaLogin(page);
  await login.abrir();
  await login.elegir(u);
  await expect(page.getByLabel('PIN (6 dígitos)', { exact: true })).toBeVisible();
  for (const t of ['0', '1', '9', 'Borrar', 'Entrar']) await expect(login.tecla(t)).toBeVisible();
  await auditar(page, info, 'P-01-paso2');
});

test('[HU-01/CA-N04][HU-01/CA-U03] P-01 con error de credenciales: alerta anunciada (role=alert) y foco en el campo', { tag: ['@HU-01', '@CA-N04', '@CA-U03'] }, async ({ page }, info) => {
  const u = await sembrarUsuario({ rol: 'waiter' });
  await page.route('**/api/v1/auth/login', (r) => r.fulfill(respuestaError(401, 'INVALID_CREDENTIALS')));
  const login = new PantallaLogin(page);
  await login.abrir();
  await login.elegir(u);
  await login.enviarPin(u.pin);
  await expect(login.alerta()).toContainText('Usuario o PIN incorrectos');
  await expect(login.campoPin()).toBeFocused();
  await auditar(page, info, 'P-01-error');
});

test('[HU-01/CA-N04] P-01 con bloqueo temporal, indefinido y por dispositivo: sin violaciones', { tag: ['@HU-01', '@CA-N04'] }, async ({ page }, info) => {
  const temporal = await sembrarUsuario({ rol: 'waiter' });
  await fabricarBloqueo(temporal.id, { fallos: 5, segundos: 280 });
  const indefinido = await sembrarUsuario({ rol: 'manager' });
  await fabricarBloqueo(indefinido.id, { fallos: 20, indefinido: true });
  const login = new PantallaLogin(page);

  for (const [u, estado] of [[temporal, 'bloqueo-temporal'], [indefinido, 'bloqueo-indefinido']] as const) {
    await login.abrir();
    await login.elegir(u);
    await login.enviarPin(u.pin);
    await expect(login.alerta()).toBeVisible();
    await auditar(page, info, `P-01-${estado}`);
  }

  const otro = await sembrarUsuario({ rol: 'kitchen' });
  await page.route('**/api/v1/auth/login', (r) => r.fulfill(respuestaError(429, 'TOO_MANY_ATTEMPTS', 540)));
  await login.abrir();
  await login.elegir(otro);
  await login.enviarPin(otro.pin);
  await expect(login.alerta()).toBeVisible();
  await auditar(page, info, 'P-01-dispositivo');
});

test('[HU-01/CA-N04] cambio obligatorio del PIN sin violaciones', { tag: ['@HU-01', '@CA-N04'] }, async ({ page }, info) => {
  const u = await sembrarUsuario({ rol: 'manager', pinProvisional: true });
  await new PantallaLogin(page).iniciarSesion(u);
  await new CambioPin(page).visible();
  await auditar(page, info, 'P-01-cambio-pin');
});

test('[HU-01/CA-N04][HU-01/CA-U04] barra superior de "Pedidos" y "Cola" sin violaciones', { tag: ['@HU-01', '@CA-N04'] }, async ({ browser }, info) => {
  for (const rol of ['waiter', 'kitchen'] as const) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const u = await sembrarUsuario({ rol });
    await entrarComo(page, u);
    await expect(new BarraSuperior(page).usuario(u)).toBeVisible();
    await auditar(page, info, rol === 'waiter' ? 'P-02' : 'P-05');
    await ctx.close();
  }
});

test('[HU-01/CA-N04] P-01 se puede completar solo con teclado (Tab/Enter) y el foco es visible', { tag: ['@HU-01', '@CA-N04'] }, async ({ page }) => {
  const u = await sembrarUsuario({ rol: 'waiter' });
  const login = new PantallaLogin(page);
  await login.abrir();
  await login.tarjeta(u).focus();
  await page.keyboard.press('Enter');
  await expect(login.campoPin()).toBeVisible();
  for (const d of u.pin) {
    await login.tecla(d).focus();
    const contorno = await login.tecla(d).evaluate((el) => {
      const s = getComputedStyle(el);
      return s.outlineStyle !== 'none' && s.outlineWidth !== '0px' ? 'outline' : s.boxShadow !== 'none' ? 'shadow' : 'ninguno';
    });
    expect(contorno, `foco visible en la tecla ${d}`).not.toBe('ninguno');
    await page.keyboard.press('Enter');
  }
  await login.entrar().focus();
  await page.keyboard.press('Enter');
  await expect(new BarraSuperior(page).titulo('Pedidos')).toBeVisible();
});
