// HU-01/CA-N03: respuesta al inicio de sesión ≤ 1 s (p95) con 10 inicios de
// sesión simultáneos (supuesto 12; docs/testing.md §5.6.1).
// 10 VU con usuarios distintos y PIN CORRECTO, a la vez (barrera por ronda),
// ≥ 20 rondas → ≥ 200 muestras. Sin logins inválidos: todos salen de la misma
// IP y el límite por dispositivo (CA-F11) devolvería 429 sin hash.
// Etapa 2: control rápido (RONDAS=3). Etapa 3: vinculante, con Toxiproxy
// (RTT +40 ms, jitter 20 ms, 1 % de pérdida) y menu-200.
//
// Entrada: K6_USERS_FILE, JSON [{ "name": "...", "pin": "..." }] con 10
// usuarios sembrados en esta ejecución (lo genera la semilla de perf, T-29).
import http from 'k6/http';
import exec from 'k6/execution';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const USUARIOS = JSON.parse(open(__ENV.K6_USERS_FILE));
const RONDAS = Number(__ENV.RONDAS || 20);
const BASE = __ENV.BASE_URL || 'https://toxiproxy:8443';
// k6 no tiene el global URL: el origen se extrae con una expresión regular.
const ORIGEN = BASE.replace(/^(https?:\/\/[^/]+).*$/, '$1');

const tiempoLogin = new Trend('hu01_login_ms', true);

export const options = {
  scenarios: {
    login_simultaneo: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: RONDAS,
      maxDuration: '10m',
    },
  },
  thresholds: {
    // CA-N03: p95 ≤ 1000 ms. Además, ninguna respuesta distinta de 200.
    hu01_login_ms: ['p(95)<=1000'],
    checks: ['rate==1.0'],
  },
};

// Barrera aproximada: las 10 VU lanzan cada ronda en el mismo múltiplo de 2 s
// del reloj (las rondas duran mucho menos de 2 s con 10 logins).
function esperarRonda() {
  const objetivo = Math.ceil((Date.now() + 1) / 2000) * 2000;
  sleep((objetivo - Date.now()) / 1000);
}

export default function () {
  const vu = exec.vu.idInTest - 1;
  const u = USUARIOS[vu % USUARIOS.length];
  esperarRonda();
  const r = http.post(`${BASE}/api/v1/auth/login`, JSON.stringify({ name: u.name, pin: u.pin }), {
    headers: { 'content-type': 'application/json', origin: ORIGEN },
    tags: { name: 'POST /auth/login' },
  });
  tiempoLogin.add(r.timings.duration);
  check(r, { 'login 200': (x) => x.status === 200 });
  // Cerrar la sesión para no acumular sesiones abiertas.
  const cookie = (r.headers['Set-Cookie'] || '').split(';')[0];
  if (cookie) http.post(`${BASE}/api/v1/auth/logout`, null, { headers: { cookie, origin: ORIGEN }, tags: { name: 'POST /auth/logout' } });
}
