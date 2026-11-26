// RS-26 parte E (SEC-045 g): la SPA funciona a través de Caddy sin ninguna
// violación de la Content Security Policy. La comprobación general la hace el
// `test` de tests/support/e2e/base.ts en todos los e2e; aquí se prueba que (1)
// la CSP de RS-26 llega de verdad, (2) el recorrido de HU-01 no viola nada y
// (3) el vigilante detecta una violación provocada (si no detectara, los
// demás e2e no comprobarían nada).
import { expect, test } from '@playwright/test';
import { cerrarSemilla, sembrarUsuario } from '../support/e2e/semilla.ts';
import { BarraSuperior, PantallaLogin, TEXTOS } from '../support/e2e/pantallas.ts';
import { vigilarCsp } from '../support/e2e/base.ts';

test.afterAll(async () => {
  await cerrarSemilla();
});

test('[HU-01/CA-F01][RS-26] la respuesta de la SPA lleva la CSP de RS-26 y el recorrido login → barra → cerrar sesión no la viola', { tag: ['@HU-01', '@CA-F01'] }, async ({ page, context }) => {
  const csp = await vigilarCsp(context);
  const respuesta = await page.goto('/');
  const cabecera = respuesta?.headers()['content-security-policy'] ?? '';
  expect(cabecera, 'Content-Security-Policy de RS-26').toContain("default-src 'self'");
  expect(cabecera).toContain("script-src 'self'");
  expect(cabecera).toContain("object-src 'none'");
  expect(cabecera).toContain("frame-ancestors 'none'");
  expect(cabecera, 'sin unsafe-inline ni unsafe-eval').not.toMatch(/unsafe-(inline|eval)/);

  const u = await sembrarUsuario({ rol: 'waiter' });
  await new PantallaLogin(page).iniciarSesion(u);
  const barra = new BarraSuperior(page);
  await expect(barra.titulo('Pedidos')).toBeVisible();
  for (const ruta of ['/menu', '/personal', '/resumen', '/pedidos']) {
    await page.goto(ruta);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await barra.cerrarSesion().click();
  await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
  expect(csp.violaciones, 'violaciones de CSP').toEqual([]);
});

test('[HU-01/CA-F01][RS-26] control: un script en línea inyectado SÍ queda registrado como violación (el vigilante funciona)', { tag: ['@HU-01', '@CA-F01'] }, async ({ page, context }) => {
  const csp = await vigilarCsp(context);
  await page.goto('/');
  await page.evaluate(() => {
    const s = document.createElement('script');
    s.textContent = 'window.__inyectado = true';
    document.head.append(s);
  });
  await expect.poll(() => csp.violaciones.length, { message: 'violación registrada' }).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as unknown as { __inyectado?: boolean }).__inyectado)).toBeUndefined();
});
