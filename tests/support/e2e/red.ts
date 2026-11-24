// Cortes de red con Toxiproxy (docs/testing.md §8.4). El proxy "app" es
// compartido por todos los navegadores: solo se usa desde el proyecto
// `serie-red` (un worker, sin otros proyectos en paralelo; tests/run.sh).
const API = process.env.TOXIPROXY_API ?? 'http://toxiproxy:8474';

async function activar(enabled: boolean): Promise<void> {
  const r = await fetch(`${API}/proxies/app`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  if (!r.ok) throw new Error(`Toxiproxy: no se pudo ${enabled ? 'activar' : 'cortar'} el proxy (${r.status})`);
}

/** Corta todas las conexiones hacia la app (las abiertas se cierran) durante `ms`. */
export async function cortarRed(ms: number): Promise<void> {
  await activar(false);
  try {
    await new Promise((ok) => setTimeout(ok, ms));
  } finally {
    await activar(true);
  }
}

export async function restaurarRed(): Promise<void> {
  await activar(true);
}
