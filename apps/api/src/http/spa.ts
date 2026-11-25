// Servir la SPA (docs/arquitectura.md §5.2; docs/infraestructura.md §8.1 punto 6).
// Ficheros de /app/public cargados en memoria al arrancar (la SPA es pequeña):
// solo se sirve lo que existe en ese mapa (sin rutas del cliente en el disco,
// sin recorridos de directorio). Cualquier otro GET/HEAD fuera de /api/ →
// index.html con `Cache-Control: no-cache`; los assets con hash, caché larga.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

interface StaticFile {
  body: Buffer;
  type: string;
  cache: string;
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const MAX_FILES = 2000;

export interface Spa {
  /** Fichero estático exacto o index.html; `undefined` si no hay SPA construida. */
  resolve(pathname: string): StaticFile | undefined;
}

/** Carpeta `public/` junto a `dist/` (imagen) — en src/ no existe y la SPA no se sirve. */
export function defaultPublicDir(): string {
  return fileURLToPath(new URL('../public/', import.meta.url));
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p, { throwIfNoEntry: false });
    if (!st || st.isSymbolicLink()) continue;
    if (st.isDirectory()) walk(p, out);
    else if (st.isFile() && out.length < MAX_FILES) out.push(p);
  }
}

export function loadSpa(dir: string = defaultPublicDir()): Spa {
  const files = new Map<string, StaticFile>();
  if (existsSync(join(dir, 'index.html'))) {
    const list: string[] = [];
    walk(dir, list);
    for (const p of list) {
      const rel = '/' + relative(dir, p).split(sep).join('/');
      const type = TYPES[extname(p).toLowerCase()] ?? 'application/octet-stream';
      const hashed = rel.startsWith('/assets/');
      files.set(rel, { body: readFileSync(p), type, cache: hashed ? 'public, max-age=31536000, immutable' : 'no-cache' });
    }
  }
  const index = files.get('/index.html');
  return {
    resolve(pathname: string) {
      if (!index) return undefined;
      return files.get(pathname) ?? index;
    },
  };
}
