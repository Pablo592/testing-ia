// Trazabilidad criterio → test (docs/testing.md §4.3). Se ejecuta en un
// contenedor (`sh tests/run.sh trazabilidad`), nunca en el host.
// Lee los IDs de las propias historias y los títulos de los tests; falla si un
// criterio de una historia en alcance no tiene test ni verificación manual
// registrada, o si un test cita un criterio que no existe o está retirado.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const TESTS = fileURLToPath(new URL('..', import.meta.url));
const RAIZ = join(TESTS, '..');
const HISTORIAS = join(RAIZ, 'docs', 'historias');

function ficheros(dir: string, re: RegExp, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === 'results' || n === 'screenshots') continue;
    const p = join(dir, n);
    const st = statSync(p, { throwIfNoEntry: false });
    if (!st || st.isSymbolicLink()) continue;
    if (st.isDirectory()) ficheros(p, re, out);
    else if (re.test(n)) out.push(p);
  }
  return out;
}

// 1. Criterios de las historias.
const vigentes = new Map<string, string>(); // "HU-01/CA-F01" -> resumen
const retirados = new Set<string>();
for (const f of readdirSync(HISTORIAS).filter((n) => /^HU-\d\d-.*\.md$/.test(n))) {
  const hu = f.slice(0, 5);
  for (const linea of readFileSync(join(HISTORIAS, f), 'utf8').split('\n')) {
    const m = /^- \*\*(CA-[FUN]\d\d)\*\*(.*)$/.exec(linea);
    if (!m) continue;
    const id = `${hu}/${m[1]}`;
    if (/\[Retirado/.test(m[2])) retirados.add(id);
    else vigentes.set(id, m[2].trim().slice(0, 80));
  }
}

// 2. Historias en alcance (tests/support/alcance.ts).
const alcanceTxt = readFileSync(join(TESTS, 'support', 'alcance.ts'), 'utf8');
const lista = /HISTORIAS_EN_ALCANCE[^=]*=\s*\[([^\]]*)\]/.exec(alcanceTxt);
const enAlcance = new Set((lista?.[1] ?? '').match(/HU-\d\d/g) ?? []);

// 3. IDs citados por los tests.
const citados = new Map<string, Set<string>>(); // id -> ficheros
const reId = /\[(HU-\d\d\/CA-[FUN]\d\d)\]/g;
for (const f of ficheros(TESTS, /\.(ts|js)$/)) {
  if (f.includes(`${join('tools', '')}`)) continue;
  const txt = readFileSync(f, 'utf8');
  for (const m of txt.matchAll(reId)) {
    if (!citados.has(m[1])) citados.set(m[1], new Set());
    citados.get(m[1])!.add(relative(TESTS, f));
  }
}

// 4. Verificaciones manuales registradas.
const manuales = JSON.parse(readFileSync(join(TESTS, 'tools', 'manuales.json'), 'utf8')) as Record<string, string>;

const errores: string[] = [];
const informe: string[] = [];
for (const id of citados.keys()) {
  if (retirados.has(id)) errores.push(`${id}: citado por un test pero está RETIRADO (${[...citados.get(id)!].join(', ')})`);
  else if (!vigentes.has(id)) errores.push(`${id}: citado por un test pero no existe en docs/historias (${[...citados.get(id)!].join(', ')})`);
}
for (const hu of [...enAlcance].sort()) {
  const ids = [...vigentes.keys()].filter((id) => id.startsWith(hu + '/')).sort();
  let cubiertos = 0;
  for (const id of ids) {
    const fs = citados.get(id);
    const manual = manuales[id];
    if (fs) cubiertos += 1;
    else if (manual) cubiertos += 1;
    else errores.push(`${id}: sin test ni verificación manual registrada (${vigentes.get(id)})`);
    informe.push(`${id}\t${fs ? [...fs].sort().join(', ') : '—'}${manual ? '\t[manual] ' + manual.slice(0, 60) : ''}`);
  }
  informe.unshift(`${hu}: ${cubiertos}/${ids.length} criterios con test o verificación manual`);
}

const salida = [...informe, '', ...(errores.length ? ['ERRORES:', ...errores] : ['Sin errores.'])].join('\n');
console.log(salida);
const dir = process.env.RESULTS_DIR;
if (dir) writeFileSync(join(dir, 'trazabilidad.txt'), salida + '\n');
process.exit(errores.length ? 1 : 0);
