// Preparación global de Playwright:
// 1. Toxiproxy: proxy toxiproxy:8443 → proxy:8443 (docs/testing.md §8.4).
// 2. Clave pública del certificado del proxy, verificado contra la CA de esta
//    ejecución (NODE_EXTRA_CA_CERTS), para que Chromium confíe solo en él.
import { createHash, X509Certificate } from 'node:crypto';
import { connect } from 'node:tls';

async function configurarToxiproxy(): Promise<void> {
  const api = process.env.TOXIPROXY_API ?? 'http://toxiproxy:8474';
  const existe = await fetch(`${api}/proxies/app`).then((r) => r.ok).catch(() => false);
  if (existe) return;
  const r = await fetch(`${api}/proxies`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'app', listen: '0.0.0.0:8443', upstream: 'proxy:8443', enabled: true }),
  });
  if (!r.ok && r.status !== 409) throw new Error(`Toxiproxy: no se pudo crear el proxy (${r.status})`);
}

function spkiDelProxy(host: string, port: number, servername: string): Promise<string> {
  return new Promise((ok, mal) => {
    // rejectUnauthorized: true (por defecto): si no lo firma la CA de la ejecución, falla.
    const s = connect({ host, port, servername }, () => {
      const der = s.getPeerCertificate(false).raw;
      const cert = new X509Certificate(der);
      const spki = cert.publicKey.export({ type: 'spki', format: 'der' });
      s.end();
      ok(createHash('sha256').update(spki).digest('base64'));
    });
    s.on('error', mal);
  });
}

export default async function globalSetup(): Promise<void> {
  const base = new URL(process.env.BASE_URL ?? 'https://toxiproxy:8443');
  if (base.hostname === 'toxiproxy') await configurarToxiproxy();
  if (!process.env.E2E_SPKI_PIN) {
    const port = Number(base.port || 443);
    process.env.E2E_SPKI_PIN = await spkiDelProxy(base.hostname, port, base.hostname);
  }
}
