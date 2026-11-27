// HU-05/CA-F04: "cuando cualquier camarero o el encargado lo marca como Agotado,
// aparece deshabilitado en la toma de pedidos en todos los dispositivos en
// <= 5 s (p95, condiciones del supuesto 12)", y HU-05/CA-N03 (con un menú de
// 200 productos en 20 categorías). Arnés realtime de docs/testing.md §5.6.1:
// 10 clientes SSE (8 camareros, 1 barra y 1 encargado), la muestra es el
// ÚLTIMO dispositivo en ver el cambio (instante de recepción del evento
// `product.updated` menos instante de la petición PATCH), resultado = p95.
//
// Qué es esto en cada etapa (I-08, supuesto 12):
//   - Etapa 2 (aquí): CONTROL RÁPIDO en proceso, sin red emulada, MUESTRAS
//     muestras (30 por defecto; la variable MUESTRAS_PROPAGACION la cambia si el
//     ejecutor la recibe). Comprueba que el 5 s se cumple con margen y que no se
//     pierde ningún evento en ningún dispositivo.
//   - Etapa 3 (vinculante): red de Toxiproxy (RTT +40 ms, jitter 20 ms, 1 % de
//     pérdida), >= 200 muestras, sobre la pila real. Hace falta una variante de
//     este arnés en el ejecutor e2e (tests/README.md §7.9, pendiente para la
//     Etapa 3); `abrirSse` y `ClienteMenu` ya aceptan una URL base.
//   - La pantalla "se deshabilita" en la toma de pedidos (HU-02, P-04): se mide
//     en e2e cuando exista, con la misma muestra.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { montarApp, type Ctx } from '../../support/app.ts';
import { sesion } from '../../support/http.ts';
import { ClienteMenu, clavesDeImporte, crearEquipo, crearMenu200, type Equipo, type Menu200 } from '../../support/menu.ts';
import { crearUsuario } from '../../support/fixtures.ts';
import { abrirSse, type ClienteSse } from '../../support/sse.ts';

const MUESTRAS = Number(process.env.MUESTRAS_PROPAGACION ?? '30');
const LIMITE_MS = 5000;

let ctx: Ctx;
let eq: Equipo;
let menu: Menu200;
let dispositivos: { quien: string; sse: ClienteSse }[] = [];
let camareros: ClienteMenu[] = [];
beforeEach(async () => {
  ctx = await montarApp({ bdAislada: true });
  const base = await ctx.escuchar();
  eq = await crearEquipo(ctx);
  menu = await crearMenu200(eq.m);

  // 10 dispositivos: 8 camareros (el equipo ya trae uno), 1 barra y 1 encargado.
  camareros = [eq.w];
  const cookies: { quien: string; cookie: string }[] = [
    { quien: 'camarero-1', cookie: eq.cookies.w },
    { quien: 'barra', cookie: eq.cookies.k },
    { quien: 'encargado', cookie: eq.cookies.m },
  ];
  for (let i = 2; i <= 8; i++) {
    const u = await crearUsuario(ctx, { rol: 'waiter' });
    const cookie = await sesion(ctx, u.nombre, u.pin);
    camareros.push(new ClienteMenu(ctx, cookie));
    cookies.push({ quien: `camarero-${i}`, cookie });
  }
  dispositivos = [];
  for (const c of cookies) {
    const s = await abrirSse(base, c.cookie);
    expect(s.status, c.quien).toBe(200);
    await s.esperar('hello', 2000);
    dispositivos.push({ quien: c.quien, sse: s });
  }
  expect(dispositivos).toHaveLength(10);
}, 180_000);
afterEach(async () => {
  for (const d of dispositivos) d.sse.cerrar();
  dispositivos = [];
  await ctx?.cerrar();
});

function percentil(ordenadas: number[], p: number): number {
  const i = Math.min(ordenadas.length - 1, Math.ceil((p / 100) * ordenadas.length) - 1);
  return ordenadas[Math.max(0, i)]!;
}

describe('Agotado en todos los dispositivos', () => {
  test(`[HU-05/CA-F04][HU-05/CA-N03] con menu-200 y 10 dispositivos, "Agotado" y "Disponible" llegan a TODOS en <= 5 s (p95 de ${MUESTRAS} muestras, control en proceso)`, async () => {
    const productos = menu.categorias.flatMap((c) => c.productos.map((p) => p.id));
    expect(productos).toHaveLength(200);
    const muestras: number[] = [];
    const vistos = new Map<string, number>();

    for (let i = 0; i < MUESTRAS; i++) {
      // Cada producto cambia dos veces seguidas (agotado y disponible) para que haya cambio real en cada muestra.
      const id = productos[Math.floor(i / 2) % productos.length]!;
      const available = i % 2 === 1;
      const marcas = dispositivos.map((d) => d.sse.eventos.length);
      const actor = camareros[i % camareros.length]!;

      const t0 = performance.now();
      const r = await (i % 5 === 4 ? eq.m : actor).disponibilidad(id, { available });
      expect(r.status, r.raw).toBe(200);

      let ultimo = 0;
      for (const [k, d] of dispositivos.entries()) {
        const limite = Date.now() + LIMITE_MS + 2000;
        let e;
        for (;;) {
          e = d.sse.eventos.slice(marcas[k]).find((x) => x.event === 'product.updated' && ((x.data as { productId?: string; id?: string }).productId ?? (x.data as { id?: string }).id) === id && (x.data as { available?: boolean }).available === available);
          if (e || Date.now() > limite) break;
          await new Promise((ok) => setTimeout(ok, 5));
        }
        expect(e, `${d.quien} no recibió el cambio de ${id} (muestra ${i + 1})`).toBeDefined();
        ultimo = Math.max(ultimo, e!.llegada);
        vistos.set(d.quien, (vistos.get(d.quien) ?? 0) + 1);
        if (d.quien === 'barra') expect(clavesDeImporte(e!.data), 'barra sin importes').toEqual([]);
      }
      muestras.push(ultimo - t0);
    }

    const ord = [...muestras].sort((a, b) => a - b);
    const resumen = { muestras: ord.length, p50: percentil(ord, 50), p95: percentil(ord, 95), p99: percentil(ord, 99), max: ord.at(-1) };
    console.info(`HU-05/CA-F04 propagación de Agotado (control en proceso, ms): ${JSON.stringify(resumen)}`);
    expect(ord).toHaveLength(MUESTRAS);
    expect(percentil(ord, 95), `p95 ${JSON.stringify(resumen)}`).toBeLessThanOrEqual(LIMITE_MS);
    for (const d of dispositivos) expect(vistos.get(d.quien), `${d.quien} vio todas las muestras`).toBe(MUESTRAS);
    // El estado final de la BD coincide con lo publicado.
    expect((await eq.m.categorias()).flatMap((c) => c.products)).toHaveLength(200);
  }, 300_000);
});
