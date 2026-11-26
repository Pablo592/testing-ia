// Arnés de revisión UX 2.3: SPA real (dist) + API simulada en memoria + Playwright.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PW = '/workspace/tests/node_modules/@playwright/test/index.mjs';
const AXE = '/workspace/tests/node_modules/@axe-core/playwright/dist/index.mjs';
const { chromium } = await import(PW);
let AxeBuilder;
try { AxeBuilder = (await import(AXE)).default; } catch (e) { console.log('axe import fail', e.message); }

const DIST = '/dist';
const OUT = '/out';
fs.mkdirSync(OUT, { recursive: true });

const ROLE_PERMS = {
  waiter: ['session:self','events:subscribe','telemetry:write','menu:read','order:read','order:create'],
  kitchen: ['session:self','events:subscribe','telemetry:write','menu:read','kitchen:read','kitchen:transition'],
  manager: ['session:self','events:subscribe','telemetry:write','menu:read','order:read','kitchen:read','menu:manage','staff:read','reports:read','order:create'],
};

// Estado de la API simulada (se reconfigura en cada escenario).
let S;
function reset() {
  S = {
    options: { status: 200, body: [
      { name: 'Lucía', role: 'waiter' }, { name: 'Javi', role: 'kitchen' }, { name: 'Marta', role: 'manager' },
      { name: 'Pedro', role: 'waiter' }, { name: 'Ana María', role: 'manager' } ] },
    optionsDelay: 0,
    login: () => ({ status: 401, body: err('INVALID_CREDENTIALS') }),
    loginDelay: 0,
    me: null,                 // objeto MeResponse o null → 401 sin details
    meDetails: undefined,
    pin: () => ({ status: 204 }),
    log: [],
  };
}
function err(code, details) { return { error: { code, message: code, requestId: 'x', ...(details ? { details } : {}) } }; }
function meOf(role, name, { must = false, expiresInMin = 600 } = {}) {
  return {
    user: { id: 'u1', name, role, mustChangePin: must },
    permissions: ROLE_PERMS[role],
    session: { expiresAt: new Date(Date.now() + expiresInMin * 60000).toISOString() },
    serverTime: new Date().toISOString(), businessDate: '2026-11-25', localConfig: {},
  };
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/v1/')) {
    const p = url.pathname.slice('/api/v1'.length);
    S.log.push(`${req.method} ${p}`);
    let raw = ''; for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : undefined;
    const send = (r) => {
      const h = { 'content-type': 'application/json', 'cache-control': 'no-store' };
      if (r.retry) h['retry-after'] = String(r.retry);
      res.writeHead(r.status, h); res.end(r.body ? JSON.stringify(r.body) : '');
    };
    if (p === '/auth/login-options') {
      if (S.optionsDelay) await new Promise((r) => setTimeout(r, S.optionsDelay));
      return send(S.options);
    }
    if (p === '/auth/login') {
      if (S.loginDelay) await new Promise((r) => setTimeout(r, S.loginDelay));
      return send(S.login(body));
    }
    if (p === '/auth/me') return send(S.me ? { status: 200, body: S.me } : { status: 401, body: err('UNAUTHENTICATED', S.meDetails) });
    if (p === '/auth/pin') return send(S.pin(body));
    if (p === '/auth/logout') { S.me = null; return send({ status: 204 }); }
    if (p === '/session/activity') return send({ status: 204 });
    if (p === '/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
      res.write(`event: hello\ndata: ${JSON.stringify({ serverTime: new Date().toISOString(), businessDate: '2026-11-25' })}\n\n`);
      const t = setInterval(() => res.write('event: ping\ndata: {}\n\n'), 2000);
      req.on('close', () => clearInterval(t));
      return;
    }
    return send({ status: 404, body: err('NOT_FOUND') });
  }
  let f = path.join(DIST, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(5173, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:5173';

const browser = await chromium.launch({ chromiumSandbox: false, args: ['--no-sandbox'] });
const VPS = { m375: { width: 375, height: 812 }, t768: { width: 768, height: 1024 }, t1280: { width: 1280, height: 800 }, w1440: { width: 1440, height: 900 } };

async function newPage(vp, opts = {}) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'es-ES', hasTouch: vp.width < 1000, ...opts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  return page;
}
const shot = async (page, name) => { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); };
const results = { axe: {}, notes: [] };
async function axe(page, name) {
  if (!AxeBuilder) return;
  const r = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze();
  results.axe[name] = r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 4), help: v.help }));
}
const note = (k, v) => { results.notes.push({ k, v }); console.log('NOTE', k, JSON.stringify(v)); };
const active = (page) => page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''}[${(a.textContent || '').trim().slice(0, 30)}]` : 'null'; });

async function loginFlow(page, userName, pin, role = 'waiter') {
  S.login = () => { S.me = meOf(role, userName); return { status: 200, body: { user: S.me.user } }; };
  await page.goto(BASE + '/');
  await page.getByRole('button', { name: new RegExp(userName) }).click();
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: 'Entrar' }).click();
}

// ---------- 1. P-01 en todos los tamaños ----------
for (const [vn, vp] of Object.entries(VPS)) {
  reset();
  let page = await newPage(vp);
  await page.goto(BASE + '/'); await page.getByRole('heading', { name: '¿Quién eres?' }).waitFor();
  await page.waitForSelector('.user-grid');
  await shot(page, `P01-paso1-${vn}`);
  if (vn === 'm375' || vn === 't1280') await axe(page, `P01-paso1-${vn}`);
  // Escribir mi usuario
  await page.getByRole('button', { name: 'Escribir mi usuario' }).click();
  await shot(page, `P01-escribir-${vn}`);
  if (vn === 't1280') await axe(page, 'P01-escribir');
  await page.close();

  // paso 2 waiter y manager
  reset(); page = await newPage(vp);
  await page.goto(BASE + '/'); await page.getByRole('button', { name: /Lucía/ }).click();
  note(`foco tras elegir usuario ${vn}`, await active(page));
  await shot(page, `P01-paso2-${vn}`);
  for (const d of '12') await page.getByRole('button', { name: d, exact: true }).click();
  await shot(page, `P01-paso2-2digitos-${vn}`);
  if (vn === 't1280' || vn === 'm375') await axe(page, `P01-paso2-${vn}`);
  await page.getByRole('button', { name: /Cambiar de usuario/ }).click();
  await page.getByRole('button', { name: /Marta/ }).click();
  await shot(page, `P01-paso2-encargado-${vn}`);
  await page.close();

  // error credenciales
  reset(); page = await newPage(vp);
  await page.goto(BASE + '/'); await page.getByRole('button', { name: /Lucía/ }).click();
  for (const d of '4821') await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByText('Usuario o PIN incorrectos').waitFor();
  note(`foco tras error credenciales ${vn}`, await active(page));
  await shot(page, `P01-error-${vn}`);
  if (vn === 't1280') await axe(page, 'P01-error');
  await page.close();

  // bloqueo temporal / indefinido / dispositivo / desactivado / red
  for (const [k, resp] of Object.entries({
    temporal: { status: 423, body: err('LOCKED', { retryAfterSeconds: 284 }), retry: 284 },
    indefinido: { status: 423, body: err('ACCOUNT_LOCKED_MANUAL') },
    dispositivo: { status: 429, body: err('TOO_MANY_ATTEMPTS', { retryAfterSeconds: 540 }), retry: 540 },
    desactivado: { status: 403, body: err('USER_DISABLED') },
    red: { status: 503, body: err('UNAVAILABLE') },
  })) {
    reset(); S.login = () => resp; page = await newPage(vp);
    await page.goto(BASE + '/'); await page.getByRole('button', { name: k === 'indefinido' ? /Marta/ : /Lucía/ }).click();
    for (const d of k === 'indefinido' ? '482159' : '4821') await page.getByRole('button', { name: d, exact: true }).click();
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForTimeout(500);
    note(`foco tras ${k} ${vn}`, await active(page));
    await shot(page, `P01-${k}-${vn}`);
    if (vn === 't1280') await axe(page, `P01-${k}`);
    if (k === 'dispositivo') {
      await page.getByRole('button', { name: /Cambiar de usuario/ }).click();
      await shot(page, `P01-dispositivo-paso1-${vn}`);
    }
    await page.close();
  }

  // banners por motivo en paso 1
  for (const [k, det] of Object.entries({
    idle: { reason: 'idle' }, absolute: { reason: 'absolute' },
    pinreset: { reason: 'revoked', revokedReason: 'pin_reset' }, locked: { reason: 'revoked', revokedReason: 'account_locked_manual' },
    disabled: { reason: 'revoked', revokedReason: 'user_disabled' },
  })) {
    if (!(vn === 't1280' || vn === 'm375') && k !== 'idle') continue;
    reset(); S.meDetails = det; page = await newPage(vp);
    await page.goto(BASE + '/pedidos'); await page.getByRole('heading', { name: '¿Quién eres?' }).waitFor();
    await shot(page, `P01-banner-${k}-${vn}`);
    if (k === 'idle' && vn === 't1280') await axe(page, 'P01-banner');
    await page.close();
  }

  // vacío / cargando / error de carga
  if (vn === 't1280' || vn === 'm375') {
    reset(); S.options = { status: 200, body: [] }; page = await newPage(vp);
    await page.goto(BASE + '/'); await page.getByText('Todavía no hay usuarios').waitFor(); await shot(page, `P01-vacio-${vn}`);
    if (vn === 't1280') await axe(page, 'P01-vacio');
    await page.close();
    reset(); S.optionsDelay = 4000; page = await newPage(vp);
    await page.goto(BASE + '/'); await page.waitForTimeout(600); await shot(page, `P01-cargando-${vn}`); await page.close();
    reset(); S.options = { status: 503, body: err('UNAVAILABLE') }; page = await newPage(vp);
    await page.goto(BASE + '/'); await page.getByText('No se ha podido conectar').waitFor(); await shot(page, `P01-errorcarga-${vn}`); await page.close();
  }
}

// ---------- 2. Pantallas con sesión ----------
const SCEN = [
  ['waiter', 'Lucía', '/pedidos'], ['kitchen', 'Javi', '/cola'], ['manager', 'Marta', '/pedidos'],
];
for (const [vn, vp] of Object.entries(VPS)) {
  for (const [role, name, route] of SCEN) {
    reset(); S.me = meOf(role, name); const page = await newPage(vp);
    await page.goto(BASE + route); await page.getByRole('heading', { level: 1 }).waitFor();
    note(`foco al cargar ${route} ${role} ${vn}`, await active(page));
    await shot(page, `S-${role}-${route.slice(1)}-${vn}`);
    if (vn === 't1280' || vn === 'm375') await axe(page, `S-${role}-${route.slice(1)}-${vn}`);
    if (role === 'manager') {
      await page.getByRole('button', { name: /Gestión/ }).click();
      await shot(page, `S-manager-menu-abierto-${vn}`);
      if (vn === 't1280' || vn === 'm375') await axe(page, `S-manager-menu-${vn}`);
      await page.getByRole('link', { name: 'Resumen del día' }).click();
      await page.waitForTimeout(200);
      note(`foco tras navegar a Resumen ${vn}`, await active(page));
      await shot(page, `S-manager-resumen-${vn}`);
    }
    await page.close();
  }
  // acceso denegado
  for (const [role, name, route] of [['waiter', 'Lucía', '/menu'], ['kitchen', 'Javi', '/pedidos'], ['manager', 'Marta', '/pedidos']]) {
    if (role === 'manager') continue;
    reset(); S.me = meOf(role, name); const page = await newPage(vp);
    await page.goto(BASE + route); await page.getByRole('heading', { name: 'Acceso denegado' }).waitFor();
    note(`foco en acceso denegado ${role} ${vn}`, await active(page));
    await shot(page, `S-denegado-${role}-${vn}`);
    if (vn === 't1280' || vn === 'm375') await axe(page, `S-denegado-${role}-${vn}`);
    await page.close();
  }
}

// ---------- 3. Cambio obligatorio del PIN ----------
async function pinSteps(page, digits) { for (const d of digits) await page.getByRole('button', { name: d, exact: true }).click(); }
for (const [vn, vp] of Object.entries(VPS)) {
  for (const role of ['manager', 'waiter']) {
    if (role === 'waiter' && !(vn === 't1280' || vn === 'm375')) continue;
    reset(); S.me = meOf(role, role === 'manager' ? 'Marta' : 'Lucía', { must: true }); const page = await newPage(vp);
    await page.goto(BASE + '/pedidos'); await page.getByRole('heading', { name: 'Cambia tu PIN' }).waitFor();
    note(`foco cambio pin ${role} ${vn}`, await active(page));
    await shot(page, `C-paso1-${role}-${vn}`);
    if (vn === 't1280' || vn === 'm375') await axe(page, `C-paso1-${role}-${vn}`);
    const cur = role === 'manager' ? '123456' : '1234';
    await pinSteps(page, cur); await page.getByRole('button', { name: 'Siguiente' }).click();
    note(`foco tras paso1→2 ${role} ${vn}`, await active(page));
    await shot(page, `C-paso2-${role}-${vn}`);
    if (vn === 't1280') await axe(page, `C-paso2-${role}`);
    // regla incumplida
    await pinSteps(page, '111111'); await page.getByRole('button', { name: 'Siguiente' }).click();
    await shot(page, `C-regla-${role}-${vn}`);
    await pinSteps(page, '739204'); await page.getByRole('button', { name: 'Siguiente' }).click();
    await shot(page, `C-paso3-${role}-${vn}`);
    await pinSteps(page, '739205'); await page.getByRole('button', { name: 'Guardar PIN' }).click();
    await page.waitForTimeout(200); await shot(page, `C-nocoincide-${role}-${vn}`);
    await page.close();
  }
  if (vn === 't1280' || vn === 'm375') {
    for (const [k, resp] of Object.entries({
      p403: { status: 403, body: err('PIN_INVALID') },
      p423: { status: 423, body: err('LOCKED', { retryAfterSeconds: 284 }) },
      p429: { status: 429, body: err('TOO_MANY_ATTEMPTS', { retryAfterSeconds: 540 }) },
      p503: { status: 503, body: err('UNAVAILABLE') },
    })) {
      reset(); S.me = meOf('manager', 'Marta', { must: true }); S.pin = () => resp; const page = await newPage(vp);
      await page.goto(BASE + '/pedidos'); await page.getByRole('heading', { name: 'Cambia tu PIN' }).waitFor();
      await pinSteps(page, '123456'); await page.getByRole('button', { name: 'Siguiente' }).click();
      await pinSteps(page, '739204'); await page.getByRole('button', { name: 'Siguiente' }).click();
      await pinSteps(page, '739204'); await page.getByRole('button', { name: 'Guardar PIN' }).click();
      await page.waitForTimeout(400);
      note(`foco tras ${k} ${vn}`, await active(page));
      await shot(page, `C-${k}-${vn}`);
      if (vn === 't1280' && k === 'p423') await axe(page, 'C-p423');
      await page.close();
    }
  }
}

// ---------- 4. Avisos de sesión (reloj simulado) ----------
for (const vn of ['t1280', 'm375']) {
  reset(); S.me = meOf('waiter', 'Lucía'); const page = await newPage(VPS[vn]);
  await page.clock.install(); await page.goto(BASE + '/pedidos'); await page.getByRole('heading', { name: 'Pedidos' }).waitFor();
  await page.clock.runFor(14 * 60000 + 2000);
  await page.getByText('Tu sesión se cerrará en 60 s').waitFor();
  await shot(page, `A-idle-aviso-${vn}`);
  if (vn === 't1280') await axe(page, 'A-idle-aviso');
  await page.getByRole('button', { name: 'Seguir conectado' }).click();
  await page.clock.runFor(2000);
  note(`foco tras Seguir conectado ${vn}`, await active(page));
  // cierre real por inactividad
  await page.clock.runFor(16 * 60000);
  await page.getByRole('heading', { name: '¿Quién eres?' }).waitFor();
  note(`foco tras cierre por inactividad ${vn}`, await active(page));
  await shot(page, `A-idle-cierre-${vn}`);
  await page.close();

  reset(); S.me = meOf('kitchen', 'Javi', { expiresInMin: 12 }); const p2 = await newPage(VPS[vn]);
  await p2.clock.install(); await p2.goto(BASE + '/cola'); await p2.getByRole('heading', { name: 'Cola' }).waitFor();
  await p2.clock.runFor(2000);
  await p2.getByText(/La sesión caduca a las/).waitFor();
  await shot(p2, `A-caducidad-aviso-${vn}`);
  if (vn === 't1280') await axe(p2, 'A-caducidad-aviso');
  await p2.close();

  // Teclado y barra con el aviso de caducidad + manager
  reset(); S.me = meOf('manager', 'Marta', { expiresInMin: 12 }); const p3 = await newPage(VPS[vn]);
  await p3.clock.install(); await p3.goto(BASE + '/pedidos'); await p3.clock.runFor(2000); await p3.getByText(/La sesión caduca/).waitFor();
  await shot(p3, `A-caducidad-manager-${vn}`); await p3.close();
}

// ---------- 5. Teclado: orden de tabulación y foco visible ----------
{
  reset(); const page = await newPage(VPS.t1280);
  await page.goto(BASE + '/'); await page.waitForSelector('.user-grid');
  const order = [];
  for (let i = 0; i < 9; i++) { await page.keyboard.press('Tab'); order.push(await active(page)); }
  note('tab paso 1', order);
  await page.keyboard.press('Tab'); // seguir
  await shot(page, 'K-foco-paso1');
  await page.keyboard.press('Shift+Tab');
  await page.getByRole('button', { name: /Lucía/ }).focus(); await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const o2 = [await active(page)];
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); o2.push(await active(page)); }
  note('tab paso 2', o2);
  // escribir con teclado físico
  await page.getByLabel(/PIN/).focus();
  await page.keyboard.type('12a3');
  note('valor tras teclear 12a3', await page.getByLabel(/PIN/).inputValue());
  await shot(page, 'K-foco-pin');
  await page.keyboard.press('Tab'); await shot(page, 'K-foco-tecla');
  const ao = await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { outline: cs.outline, offset: cs.outlineOffset }; });
  note('foco tecla estilo', ao);
  await page.close();
}

// ---------- 6. Medidas: objetivos táctiles, reflow 320, zoom, texto ----------
for (const [vn, vp] of [['m375', VPS.m375], ['t768', VPS.t768], ['t1280', VPS.t1280], ['m320', { width: 320, height: 568 }]]) {
  reset(); let page = await newPage(vp);
  await page.goto(BASE + '/'); await page.waitForSelector('.user-grid');
  await page.getByRole('button', { name: /Lucía/ }).click();
  const meas = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('button, a, input').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width) out.push({ el: (e.textContent || e.id || e.tagName).trim().slice(0, 18), w: Math.round(r.width), h: Math.round(r.height) }); });
    return { small: out.filter((o) => o.w < 44 || o.h < 44), keys: out.filter((o) => /^[0-9]$|Borrar|Entrar/.test(o.el)).map((o) => `${o.el}:${o.w}x${o.h}`).slice(0, 12), scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, scrollH: document.documentElement.scrollHeight, clientH: document.documentElement.clientHeight };
  });
  note(`medidas paso 2 ${vn}`, meas);
  await shot(page, `M-paso2-${vn}`);
  await page.close();
  reset(); S.me = meOf('manager', 'Marta', { must: true }); page = await newPage(vp);
  await page.goto(BASE + '/pedidos'); await page.getByRole('heading', { name: 'Cambia tu PIN' }).waitFor();
  const m2 = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, scrollH: document.documentElement.scrollHeight, clientH: document.documentElement.clientHeight, kp: document.querySelector('.keypad')?.getBoundingClientRect().bottom, action: [...document.querySelectorAll('button')].filter(b=>/Siguiente|Guardar/.test(b.textContent)).map(b=>Math.round(b.getBoundingClientRect().bottom)) }));
  note(`medidas cambio pin ${vn}`, m2);
  await page.close();
}

// Peso del bundle y peticiones al arrancar P-01
{
  reset(); const page = await newPage(VPS.t1280);
  const reqs = []; page.on('response', (r) => reqs.push(`${r.status()} ${new URL(r.url()).pathname} ${r.headers()['content-length'] ?? ''}`));
  await page.goto(BASE + '/'); await page.waitForSelector('.user-grid');
  const perf = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const p = performance.getEntriesByType('paint').map((e) => `${e.name}:${Math.round(e.startTime)}`); return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), paint: p }; });
  note('perf P-01 (local, sin red)', { perf, reqs });
  await page.close();
}

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
await browser.close(); server.close();
console.log('FIN');
