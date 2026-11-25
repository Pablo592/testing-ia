// Build de @mi-app/api (docs/infraestructura.md §8.1, contrato punto 2 y 4a):
// empaqueta con esbuild el código de la API y de @mi-app/shared en dist/; las
// dependencias npm de "dependencies" quedan como external (las copia pnpm deploy).
import { readFileSync, rmSync } from 'node:fs';
import { build } from 'esbuild';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
rmSync(new URL('./dist', import.meta.url), { recursive: true, force: true });

await build({
  entryPoints: {
    main: 'src/main.ts',
    migrate: 'src/migrate.ts',
    healthcheck: 'src/healthcheck.ts',
    'commands/create-initial-manager': 'src/bin/create-initial-manager.ts',
    'commands/unlock-user': 'src/bin/unlock-user.ts',
  },
  outdir: 'dist',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'node',
  target: 'node26',
  sourcemap: false,
  legalComments: 'none',
  chunkNames: 'chunks/[name]-[hash]',
  external: Object.keys(pkg.dependencies ?? {}),
  logLevel: 'info',
});
