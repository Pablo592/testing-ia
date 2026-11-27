// HU-05/CA-N03 (informativo): lectura de `GET /menu` con el menú `menu-200` (200
// productos en 20 categorías) por 10 dispositivos a la vez. No es un criterio de
// tiempo de HU-05 ni de la lista cerrada de CA-N03 (que exige HU-02/CA-N01, CA-U05,
// CA-F23, CA-N05 y HU-05/CA-F04, medidos con otras herramientas): da la línea base
// del menú completo para HU-02 (la toma de pedidos lo carga al abrir y cada vez
// que llega `menu.changed`). No tiene umbral de tiempo; el resultado de aprobación
// es el de `checks` (el menú llega entero, con precio exacto y sin importes para barra).
//
// Entrada: K6_USERS_FILE (los 10 usuarios de la semilla de perf: 6 camareros, 2 barra,
// 2 encargados). El menú lo crea el arnés `tests/performance/HU-05-agotado.arnes.ts`,
// que se ejecuta antes (tests/run.sh perf). Si no hay menu-200, los `checks` fallan.
import http from 'k6/http';
import exec from 'k6/execution';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const USUARIOS = JSON.parse(open(__ENV.K6_USERS_FILE));
const RONDAS = Number(__ENV.RONDAS || 20);
const BASE = __ENV.BASE_URL || 'https://toxiproxy:8443';
const ORIGEN = BASE.replace(/^(https?:\/\/[^/]+).*$/, '$1');

const tiempo = new Trend('hu05_menu_get_ms', true);
const tamano = new Trend('hu05_menu_get_bytes');

export const options = {
  scenarios: {
    menu_200: { executor: 'per-vu-iterations', vus: 10, iterations: RONDAS, maxDuration: '10m' },
  },
  thresholds: {
    // Solo corrección: ningún `check` falla. El p95 de `hu05_menu_get_ms` se informa, no se exige.
    checks: ['rate==1.0'],
  },
};

// Sesión por VU (el módulo se evalúa una vez por VU): un login y muchas lecturas.
let cookie = '';

function esperarRonda() {
  const objetivo = Math.ceil((Date.now() + 1) / 2000) * 2000;
  sleep((objetivo - Date.now()) / 1000);
}

export default function () {
  const vu = exec.vu.idInTest - 1;
  const u = USUARIOS[vu % USUARIOS.length];
  if (!cookie) {
    const l = http.post(`${BASE}/api/v1/auth/login`, JSON.stringify({ name: u.name, pin: u.pin }), {
      headers: { 'content-type': 'application/json', origin: ORIGEN },
      tags: { name: 'POST /auth/login' },
    });
    check(l, { 'login 200': (x) => x.status === 200 });
    cookie = (l.headers['Set-Cookie'] || '').split(';')[0];
  }
  esperarRonda();
  const r = http.get(`${BASE}/api/v1/menu`, { headers: { cookie, 'x-activity': 'passive' }, tags: { name: 'GET /menu' } });
  tiempo.add(r.timings.duration);
  tamano.add(r.body.length);
  let menu = null;
  try {
    menu = r.json();
  } catch (e) {
    menu = null;
  }
  const categorias = (menu && menu.categories) || [];
  const productos = categorias.reduce((n, c) => n + c.products.length, 0);
  // El rol "barra" (índices 6 y 7 de la semilla) no recibe ninguna clave de importe (RS-19).
  const esBarra = vu === 6 || vu === 7;
  check(r, {
    'menu 200': (x) => x.status === 200,
    'menu-200: 20 categorías y 200 productos': () => categorias.length >= 20 && productos >= 200,
    // Con respuesta 200 y menú no vacío: un 404 o un menú vacío no pasan estas dos por «no tener nada que mirar».
    'barra sin importes (RS-19)': (x) => x.status === 200 && categorias.length > 0 && (!esBarra || !/priceCents|price_cents/.test(x.body)),
    'camarero y encargado con priceCents entero': (x) => x.status === 200 && categorias.length > 0 && (esBarra || categorias.every((c) => c.products.every((p) => Number.isInteger(p.priceCents)))),
  });
}
