// HU-01/CA-F09: la barra con la cola abierta no caduca por inactividad, y un
// corte breve de red no la saca (docs/arquitectura.md §7, T-37: el hub SSE
// escribe last_activity_at al cerrarse el flujo). Proyecto serie-red: corta
// el proxy de Toxiproxy, compartido, así que va solo y en serie.
// SEC-030 (docs/arquitectura.md §6, §7, 2.1i): lo que la app pide sola al
// recibir `hello` tras la reconexión (GET /auth/me y los snapshots de la
// pantalla montada) lleva `X-Activity: passive`; las acciones del usuario y
// POST /session/activity, nunca.
import { expect, test } from '../support/e2e/base.ts';
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

test('[HU-01/CA-F09] barra sin tocar nada 20 min con la cola abierta: tras un corte de red de 3 s se reconecta, sigue dentro y las recargas por hello son pasivas', { tag: ['@HU-01', '@CA-F09'] }, async ({ page }) => {
  const u = await sembrarUsuario({ rol: 'kitchen' });
  await entrarComo(page, u);
  const barra = new BarraSuperior(page);
  // Última petición hace 20 min (la cola abierta no es actividad): sin la
  // escritura al cerrarse el flujo, la reconexión daría 401 reason idle.
  await fabricarInactividad(u.id, 20);
  // Peticiones de la app a la API desde el corte (las de page.request del test no pasan por aquí).
  const vistas: { metodo: string; ruta: string; actividad: string | undefined }[] = [];
  let registrar = true;
  page.on('request', (req) => {
    const ruta = new URL(req.url()).pathname;
    if (!registrar || !ruta.startsWith('/api/v1/') || ruta === '/api/v1/events') return;
    const fila = { metodo: req.method(), ruta, actividad: undefined as string | undefined };
    vistas.push(fila);
    void req.allHeaders().then((h) => {
      fila.actividad = h['x-activity'];
    });
  });
  await cortarRed(3000);
  // Reconecta sola (el vigilante fuerza la reconexión, docs/arquitectura.md §6).
  await expect(barra.titulo('Cola')).toBeVisible();
  await expect.poll(async () => (await page.request.get('/api/v1/auth/me')).status(), { timeout: 15_000 }).toBe(200);
  await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toHaveCount(0);
  await expect(page.getByText(TEXTOS.cualquierBanner)).toHaveCount(0);
  await expect(barra.usuario(u)).toBeVisible();

  // Tras hello: recarga de /auth/me (y snapshots, si la pantalla los pide), todas pasivas.
  await expect.poll(() => vistas.some((v) => v.metodo === 'GET' && v.ruta === '/api/v1/auth/me'), { timeout: 10_000 }).toBe(true);
  registrar = false;
  await expect.poll(() => vistas.every((v) => v.metodo !== 'GET' || v.actividad !== undefined)).toBe(true);
  for (const v of vistas.filter((x) => x.metodo === 'GET')) expect(v.actividad, `${v.metodo} ${v.ruta}`).toBe('passive');
  for (const v of vistas.filter((x) => x.ruta === '/api/v1/session/activity')) expect(v.actividad, 'POST /session/activity nunca es pasivo').toBeUndefined();

  // Una acción del usuario no va marcada como pasiva.
  const logout = page.waitForRequest((r) => r.method() === 'POST' && new URL(r.url()).pathname === '/api/v1/auth/logout');
  await barra.cerrarSesion().click();
  expect((await (await logout).allHeaders())['x-activity']).toBeUndefined();
  await expect(page.getByRole('heading', { name: TEXTOS.quienEres })).toBeVisible();
});
