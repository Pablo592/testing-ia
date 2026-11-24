// HU-01/CA-F09: la barra con la cola abierta no caduca por inactividad, y un
// corte breve de red no la saca (docs/arquitectura.md §7, T-37: el hub SSE
// escribe last_activity_at al cerrarse el flujo). Proyecto serie-red: corta
// el proxy de Toxiproxy, compartido, así que va solo y en serie.
import { expect, test } from '@playwright/test';
import { cerrarSemilla, fabricarInactividad, sembrarUsuario } from '../support/e2e/semilla.ts';
import { BarraSuperior, entrarComo, TEXTOS } from '../support/e2e/pantallas.ts';
import { cortarRed, restaurarRed } from '../support/e2e/red.ts';

test.describe.configure({ mode: 'serial' });

test.afterEach(async () => {
  await restaurarRed();
});
test.afterAll(async () => {
  await cerrarSemilla();
});

test('[HU-01/CA-F09] barra sin tocar nada 20 min con la cola abierta: tras un corte de red de 3 s se reconecta y sigue dentro', { tag: ['@HU-01', '@CA-F09'] }, async ({ page }) => {
  const u = await sembrarUsuario({ rol: 'kitchen' });
  await entrarComo(page, u);
  const barra = new BarraSuperior(page);
  // Última petición hace 20 min (la cola abierta no es actividad): sin la
  // escritura al cerrarse el flujo, la reconexión daría 401 reason idle.
  await fabricarInactividad(u.id, 20);
  await cortarRed(3000);
  // Reconecta sola (el vigilante fuerza la reconexión, docs/arquitectura.md §6).
  await expect(barra.titulo('Cola')).toBeVisible();
  await expect.poll(async () => (await page.request.get('/api/v1/auth/me')).status(), { timeout: 15_000 }).toBe(200);
  await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toHaveCount(0);
  await expect(page.getByText(TEXTOS.cualquierBanner)).toHaveCount(0);
  await expect(barra.usuario(u)).toBeVisible();
});
