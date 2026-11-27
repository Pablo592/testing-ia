// HU-05/CA-F04 y HU-05/CA-N03 sobre la PILA REAL (proxy -> app -> db, a través de
// Toxiproxy), con el menú `menu-200` y 10 dispositivos conectados (docs/testing.md
// §5.6.1: "Arnés realtime"; I-08). Mide, para cada cambio, el tiempo hasta que el
// ÚLTIMO de los 10 dispositivos recibe `product.updated` con el nuevo valor
// (instante de recepción del evento menos instante de la petición PATCH) y
// comprueba que el p95 es <= 5000 ms y que ningún dispositivo pierde ningún evento.
//
// Es el hermano del control en proceso (tests/integration/realtime/HU-05-agotado-
// propagacion.int.test.ts): el mismo escenario, pero por la red real de la pila.
// Se ejecuta como proyecto `arnes-perf` de Playwright (sin navegador: solo `fetch`
// de Node y el cliente SSE de tests/support/sse.ts) desde `sh tests/run.sh perf`,
// porque ese ejecutor tiene acceso a la BD (semilla de usuarios) y a la CA de la
// ejecución. Un solo worker: Toxiproxy es compartido.
//
//   MUESTRAS_PROPAGACION  número de cambios medidos (30 en Etapa 2; >= 200 en la
//                         Etapa 3, §5.6.1).
//   RED_EMULADA=1         (Etapa 3) añade al proxy `app` de Toxiproxy la latencia del
//                         supuesto 12: RTT +40 ms (20 ms por sentido) y jitter de 20 ms.
//                         LIMITACIÓN: Toxiproxy trabaja sobre TCP y no puede emular el 1 %
//                         de pérdida del supuesto 12 (no hay toxic de pérdida de paquetes);
//                         la pérdida de segmentos la oculta TCP con retransmisiones. Ver
//                         hallazgo T-52 de docs/testing.md §14.10.
//
// Resultado: tests/results/<ejecución>/propagacion-agotado.json (muestras, p50, p95,
// p99 y máximo, y la red usada) y una línea en la salida.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { variable } from '../support/entorno.ts';
import { cerrarSemilla, sembrarUsuario, type UsuarioE2E } from '../support/e2e/semilla.ts';
import { clavesDeImporte, crearMenu200, percentil } from '../support/menu-puro.ts';
import { abrirSse, type ClienteSse } from '../support/sse.ts';

const BASE = process.env.BASE_URL ?? 'https://toxiproxy:8443';
const ORIGEN = new URL(BASE).origin;
const TOXIPROXY = process.env.TOXIPROXY_API ?? 'http://toxiproxy:8474';
const MUESTRAS = Number(process.env.MUESTRAS_PROPAGACION || '30');
const RED_EMULADA = process.env.RED_EMULADA === '1';
const LIMITE_MS = 5000;

async function api(cookie: string | undefined, metodo: string, ruta: string, cuerpo?: unknown): Promise<{ status: number; body: any; set: string[] }> {
  const r = await fetch(`${BASE}/api/v1${ruta}`, {
    method: metodo,
    headers: { origin: ORIGEN, ...(cookie ? { cookie } : {}), ...(cuerpo === undefined ? {} : { 'content-type': 'application/json' }) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let body: unknown;
  try {
    body = texto === '' ? undefined : JSON.parse(texto);
  } catch {
    body = texto;
  }
  return { status: r.status, body, set: r.headers.getSetCookie() };
}

async function entrar(u: UsuarioE2E): Promise<string> {
  const r = await api(undefined, 'POST', '/auth/login', { name: u.nombre, pin: u.pin });
  const cookie = r.set.map((c) => c.split(';')[0]!).find((c) => c.startsWith('__Host-sid='));
  if (r.status !== 200 || !cookie) throw new Error(`login de ${u.nombre}: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return cookie;
}

async function toxic(accion: 'poner' | 'quitar'): Promise<void> {
  const defs = [
    { name: 'hu05-rtt-bajada', type: 'latency', stream: 'downstream', toxicity: 1, attributes: { latency: 20, jitter: 20 } },
    { name: 'hu05-rtt-subida', type: 'latency', stream: 'upstream', toxicity: 1, attributes: { latency: 20, jitter: 0 } },
  ];
  for (const d of defs) {
    const r =
      accion === 'poner'
        ? await fetch(`${TOXIPROXY}/proxies/app/toxics`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) })
        : await fetch(`${TOXIPROXY}/proxies/app/toxics/${d.name}`, { method: 'DELETE' });
    if (!r.ok && !(accion === 'quitar' && r.status === 404)) throw new Error(`Toxiproxy (${accion} ${d.name}): ${r.status}`);
  }
}

test.afterAll(async () => {
  await cerrarSemilla();
});

test(`[HU-05/CA-F04][HU-05/CA-N03] pila real, menu-200 y 10 dispositivos: "Agotado" y "Disponible" llegan al último dispositivo en <= 5 s (p95 de ${MUESTRAS} muestras${RED_EMULADA ? ', con la latencia del supuesto 12' : ''})`, async () => {
  test.setTimeout(900_000);

  // 10 dispositivos: 8 camareros, 1 barra y 1 encargado (el encargado crea el menú-200 por la API).
  const camareros = await Promise.all(Array.from({ length: 8 }, () => sembrarUsuario({ rol: 'waiter' })));
  const barra = await sembrarUsuario({ rol: 'kitchen' });
  const encargado = await sembrarUsuario({ rol: 'manager' });
  const dispositivos: { quien: string; cookie: string; sse?: ClienteSse }[] = [];
  for (const [i, u] of camareros.entries()) dispositivos.push({ quien: `camarero-${i + 1}`, cookie: await entrar(u) });
  dispositivos.push({ quien: 'barra', cookie: await entrar(barra) });
  dispositivos.push({ quien: 'encargado', cookie: await entrar(encargado) });
  const cm = dispositivos.at(-1)!.cookie;

  const crear = async (ruta: string, cuerpo: unknown): Promise<string> => {
    const r = await api(cm, 'POST', ruta, cuerpo);
    if (r.status !== 201) throw new Error(`POST ${ruta}: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    return (r.body.id ?? r.body.category?.id ?? r.body.product?.id) as string;
  };
  const menu = await crearMenu200({
    categoria: (name) => crear('/categories', { name }),
    producto: (categoryId, name, priceCents) => crear('/products', { categoryId, name, priceCents }),
  });
  const productos = menu.categorias.flatMap((c) => c.productos.map((p) => p.id));
  expect(productos).toHaveLength(200);

  try {
    if (RED_EMULADA) await toxic('poner');
    for (const d of dispositivos) {
      d.sse = await abrirSse(BASE, d.cookie);
      expect(d.sse.status, d.quien).toBe(200);
      await d.sse.esperar('hello', 5000);
    }

    const muestras: number[] = [];
    const vistos = new Map<string, number>();
    for (let i = 0; i < MUESTRAS; i++) {
      // Cada producto cambia dos veces seguidas (agotado y disponible): hay cambio real en cada muestra.
      const id = productos[Math.floor(i / 2) % productos.length]!;
      const available = i % 2 === 1;
      const marcas = dispositivos.map((d) => d.sse!.eventos.length);
      const actor = i % 5 === 4 ? dispositivos.at(-1)! : dispositivos[i % 8]!;

      const t0 = performance.now();
      const r = await api(actor.cookie, 'PATCH', `/products/${id}/availability`, { available });
      expect(r.status, JSON.stringify(r.body)).toBe(200);

      let ultimo = 0;
      for (const [k, d] of dispositivos.entries()) {
        const limite = Date.now() + LIMITE_MS + 3000;
        let e;
        for (;;) {
          e = d.sse!.eventos
            .slice(marcas[k])
            .find((x) => x.event === 'product.updated' && ((x.data as { productId?: string; id?: string }).productId ?? (x.data as { id?: string }).id) === id && (x.data as { available?: boolean }).available === available);
          if (e || Date.now() > limite) break;
          await new Promise((ok) => setTimeout(ok, 5));
        }
        expect(e, `${d.quien} no recibió el cambio de ${id} (muestra ${i + 1})`).toBeDefined();
        ultimo = Math.max(ultimo, e!.llegada);
        vistos.set(d.quien, (vistos.get(d.quien) ?? 0) + 1);
        if (d.quien === 'barra') expect(clavesDeImporte(e!.data), 'barra sin importes (RS-19)').toEqual([]);
      }
      muestras.push(ultimo - t0);
    }

    const ord = [...muestras].sort((a, b) => a - b);
    const resumen = {
      criterio: 'HU-05/CA-F04',
      muestras: ord.length,
      dispositivos: dispositivos.length,
      productos: productos.length,
      red: RED_EMULADA ? 'Toxiproxy: latencia 20 ms por sentido, jitter 20 ms (sin pérdida de paquetes)' : 'sin emular (Etapa 2: control rápido)',
      p50_ms: Math.round(percentil(ord, 50)),
      p95_ms: Math.round(percentil(ord, 95)),
      p99_ms: Math.round(percentil(ord, 99)),
      max_ms: Math.round(ord.at(-1)!),
      limite_ms: LIMITE_MS,
    };
    console.info(`HU-05/CA-F04 propagación de Agotado (pila real): ${JSON.stringify(resumen)}`);
    writeFileSync(join(variable('RESULTS_DIR'), 'propagacion-agotado.json'), JSON.stringify(resumen, null, 2));
    expect(ord).toHaveLength(MUESTRAS);
    expect(percentil(ord, 95), `p95 ${JSON.stringify(resumen)}`).toBeLessThanOrEqual(LIMITE_MS);
    for (const d of dispositivos) expect(vistos.get(d.quien), `${d.quien} vio todas las muestras`).toBe(MUESTRAS);
  } finally {
    for (const d of dispositivos) d.sse?.cerrar();
    if (RED_EMULADA) await toxic('quitar');
  }
});
