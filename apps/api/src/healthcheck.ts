// HEALTHCHECK de la imagen (forma exec, sin shell): GET /healthz en local.
// Sale con 0 si responde 2xx en < 5 s; con 1 si no (docs/logging.md §8.1).
const port = process.env.PORT && /^[0-9]+$/.test(process.env.PORT) ? process.env.PORT : '3000';

try {
  const res = await fetch(`http://127.0.0.1:${port}/healthz`, { signal: AbortSignal.timeout(5000) });
  process.exitCode = res.ok ? 0 : 1;
} catch {
  process.exitCode = 1;
}
