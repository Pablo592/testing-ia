// Comprobaciones estáticas de seguridad sobre el código fuente (SEC-045 d, e, f):
// RS-16c (solo el módulo auth usa el hasher argon2id), RS-25 (sin sumideros de
// HTML/código en apps/web) y RS-35 (sin SQL armado con datos). Sin dependencias
// nuevas: un lector de ficheros y expresiones regulares sobre el código SIN
// comentarios. Se prueban a sí mismas con fragmentos sintéticos
// (tests/security/estatico.sec.test.ts): un detector que no detecta no sirve.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export interface Hallazgo {
  regla: string;
  fichero: string;
  linea: number;
  texto: string;
}

// --- Lectura del árbol ------------------------------------------------------

/** Ficheros .ts/.tsx/.js/.mjs/.html bajo `dir`, sin node_modules, dist ni enlaces simbólicos. */
export function codigoFuente(dir: string, raiz: string = dir): { ruta: string; rel: string }[] {
  const out: { ruta: string; rel: string }[] = [];
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === 'dist' || n === 'coverage') continue;
    const p = join(dir, n);
    const st = statSync(p, { throwIfNoEntry: false });
    if (!st) continue;
    if (st.isDirectory()) out.push(...codigoFuente(p, raiz));
    else if (/\.(ts|tsx|js|mjs|cjs|html)$/.test(n)) out.push({ ruta: p, rel: relative(raiz, p).split(sep).join('/') });
  }
  return out;
}

export function leer(ruta: string): string {
  return readFileSync(ruta, 'utf8');
}

// --- Comentarios ------------------------------------------------------------

/**
 * Sustituye los comentarios por espacios (conserva los saltos de línea, así que
 * los números de línea no cambian) sin tocar el contenido de cadenas ni de
 * plantillas. No entiende literales de expresión regular: un comentario o una
 * comilla dentro de una regex puede desajustarlo; el código del proyecto no
 * lo hace y el test falla alto (más hallazgos), no bajo, si pasara.
 */
export function sinComentarios(src: string, html = false): string {
  if (html) return src.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  let out = '';
  let i = 0;
  // Pila: 'codigo' | '`' (plantilla). Dentro de ${...} de una plantilla se vuelve a 'codigo' con llaves.
  const pila: { tipo: 'codigo' | 'plantilla'; llaves: number }[] = [{ tipo: 'codigo', llaves: 0 }];
  while (i < src.length) {
    const estado = pila[pila.length - 1];
    const c = src[i];
    const d = src[i + 1];
    if (estado.tipo === 'plantilla') {
      if (c === '\\') {
        out += c + (d ?? '');
        i += 2;
      } else if (c === '`') {
        pila.pop();
        out += c;
        i++;
      } else if (c === '$' && d === '{') {
        pila.push({ tipo: 'codigo', llaves: 0 });
        out += '${';
        i += 2;
      } else {
        out += c;
        i++;
      }
      continue;
    }
    if (c === '/' && d === '/') {
      while (i < src.length && src[i] !== '\n') {
        out += ' ';
        i++;
      }
    } else if (c === '/' && d === '*') {
      out += '  ';
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += '  ';
      i += 2;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
    } else if (c === '`') {
      pila.push({ tipo: 'plantilla', llaves: 0 });
      out += c;
      i++;
    } else if (c === '{') {
      estado.llaves++;
      out += c;
      i++;
    } else if (c === '}') {
      if (estado.llaves === 0 && pila.length > 1) pila.pop();
      else estado.llaves--;
      out += c;
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

function lineaDe(texto: string, indice: number): number {
  let n = 1;
  for (let i = 0; i < indice; i++) if (texto.charCodeAt(i) === 10) n++;
  return n;
}

function lineaTexto(texto: string, linea: number): string {
  return (texto.split('\n')[linea - 1] ?? '').trim().slice(0, 160);
}

function buscar(regla: string, fichero: string, codigo: string, re: RegExp): Hallazgo[] {
  const out: Hallazgo[] = [];
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  for (const m of codigo.matchAll(g)) {
    const linea = lineaDe(codigo, m.index ?? 0);
    out.push({ regla, fichero, linea, texto: lineaTexto(codigo, linea) });
  }
  return out;
}

// --- RS-25: sumideros de HTML y de código en apps/web -----------------------

const SUMIDEROS_WEB: RegExp[] = [
  /\bdangerouslySetInnerHTML\b/,
  /\binnerHTML\b/,
  /\bouterHTML\b/,
  /\binsertAdjacentHTML\b/,
  /\bdocument\s*\.\s*write(ln)?\s*\(/,
  /(?<![.\w$])eval\s*\(/,
  /(?:\.|\[\s*['"])eval\b/,
  /\bnew\s+Function\b/,
  /(?<![.\w$])Function\s*\(/,
  // setTimeout/setInterval con una cadena como código.
  /\bset(?:Timeout|Interval)\s*\(\s*['"`]/,
];

/** RS-25. `fichero` solo se usa para el informe. */
export function hallazgosRs25(fichero: string, src: string): Hallazgo[] {
  const codigo = sinComentarios(src, fichero.endsWith('.html'));
  return SUMIDEROS_WEB.flatMap((re) => buscar('RS-25', fichero, codigo, re));
}

// --- RS-16c: el hasher argon2id solo lo usa el módulo auth ------------------

export const RUTA_MODULO_AUTH = 'src/modules/auth/';
export const RUTA_HASHER = 'src/modules/auth/hasher.ts';
export const RUTA_VERIFY_PIN = 'src/modules/auth/verify-pin.ts';
/** Raíces de composición: reciben el hasher de fuera y solo se lo pasan a createAuthModule. */
export const RAICES_DE_COMPOSICION = ['src/app.ts', 'src/main.ts', 'src/commands/index.ts', 'src/commands/cli.ts'];

/** Rangos [inicio, fin) de los argumentos de `nombre(...)`, con paréntesis equilibrados. */
function rangosDeLlamada(codigo: string, nombre: string): [number, number][] {
  const out: [number, number][] = [];
  const re = new RegExp(`\\b${nombre}\\s*\\(`, 'g');
  for (const m of codigo.matchAll(re)) {
    const ini = (m.index ?? 0) + m[0].length - 1;
    let prof = 0;
    let fin = ini;
    for (let i = ini; i < codigo.length; i++) {
      if (codigo[i] === '(') prof++;
      else if (codigo[i] === ')' && --prof === 0) {
        fin = i + 1;
        break;
      }
    }
    out.push([ini, fin]);
  }
  return out;
}

/**
 * RS-16c sobre un fichero de apps/api (ruta relativa a apps/api, p. ej.
 * `src/http/guard.ts`):
 *  1. `argon2` solo se importa en `modules/auth/hasher.ts`.
 *  2. Fuera de `modules/auth/` y de las raíces de composición, ningún fichero
 *     nombra el hasher (`PinHasher`, `pinHasher`, `hasher`, `createPinHasher`).
 *  3. En las raíces de composición, el hasher solo se importa, se declara como
 *     tipo, se valida, se crea (`createPinHasher`) o se pasa a `createAuthModule`.
 *  4. Dentro de `modules/auth/`, solo `verify-pin.ts` llama a `.verify(`/`.hash(`
 *     del hasher.
 */
export function hallazgosRs16c(rel: string, src: string): Hallazgo[] {
  const codigo = sinComentarios(src);
  const out: Hallazgo[] = [];
  if (rel !== RUTA_HASHER) {
    out.push(...buscar('RS-16c', rel, codigo, /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)['"]argon2['"]/));
  }
  const nombraHasher = /pinhasher|hasher/i;
  const enAuth = rel.startsWith(RUTA_MODULO_AUTH);
  if (enAuth) {
    if (rel !== RUTA_VERIFY_PIN && rel !== RUTA_HASHER) {
      out.push(...buscar('RS-16c', rel, codigo, /\bhasher\s*\.\s*(?:verify|hash)\s*\(/));
    }
    return out;
  }
  if (!RAICES_DE_COMPOSICION.includes(rel)) {
    out.push(...buscar('RS-16c', rel, codigo, new RegExp(nombraHasher.source, 'i')));
    return out;
  }
  const llamadas = rangosDeLlamada(codigo, 'createAuthModule');
  let offset = 0;
  for (const linea of codigo.split('\n')) {
    const ini = offset;
    offset += linea.length + 1;
    const donde = linea.search(nombraHasher);
    if (donde < 0) continue;
    const pos = ini + donde;
    const permitida =
      /^\s*(?:import|export)\b.*hasher/i.test(linea) ||
      /^\s*pinHasher\??\s*:\s*PinHasher\s*[;,]?\s*$/.test(linea) ||
      /\bpinHasher\s*:\s*createPinHasher\s*\(/.test(linea) ||
      /\btypeof\s+deps\.pinHasher\b|!\s*deps\.pinHasher\b|\bConfigError\s*\(\s*['"]pinHasher['"]/.test(linea) ||
      llamadas.some(([a, b]) => pos >= a && pos < b);
    if (!permitida) out.push({ regla: 'RS-16c', fichero: rel, linea: lineaDe(codigo, ini), texto: lineaTexto(codigo, lineaDe(codigo, ini)) });
  }
  return out;
}

// --- RS-35: sin SQL armado con datos ---------------------------------------

const PALABRAS_SQL = /\b(?:select|insert\s+into|update|delete\s+from|where|drop|alter|truncate|create\s+(?:table|index|role|user))\b/i;

/**
 * RS-35 sobre un fichero de apps/api: `sql.raw|lit|ref|id|table|literal`,
 * `.raw(`, plantillas con `${}` y palabras SQL que no son la etiqueta `sql`, y
 * cadenas SQL concatenadas con `+`.
 */
export function hallazgosRs35(rel: string, src: string): Hallazgo[] {
  const codigo = sinComentarios(src);
  const out: Hallazgo[] = [];
  out.push(...buscar('RS-35', rel, codigo, /\bsql\s*\.\s*(?:raw|lit|ref|id|table|literal)\b/));
  out.push(...buscar('RS-35', rel, codigo, /\bsql\s*\[\s*['"](?:raw|lit|ref|id|table|literal)['"]\s*\]/));
  out.push(...buscar('RS-35', rel, codigo, /\.\s*raw\s*\(/));
  // Plantillas: etiquetadas con sql / sql<T> son parámetros; las demás con ${} y SQL, no.
  for (const m of codigo.matchAll(/(\bsql(?:\s*<[^`]*?>)?\s*)?`((?:[^`\\]|\\.)*)`/g)) {
    const etiquetada = m[1] !== undefined;
    const cuerpo = m[2] ?? '';
    if (!etiquetada && cuerpo.includes('${') && PALABRAS_SQL.test(cuerpo)) {
      const linea = lineaDe(codigo, m.index ?? 0);
      out.push({ regla: 'RS-35', fichero: rel, linea, texto: lineaTexto(codigo, linea) });
    }
  }
  // Concatenación: 'SELECT ... ' + x  /  x + ' WHERE ...'
  out.push(...buscar('RS-35', rel, codigo, new RegExp(`(['"])[^'"\\n]*${PALABRAS_SQL.source}[^'"\\n]*\\1\\s*\\+|\\+\\s*(['"])[^'"\\n]*${PALABRAS_SQL.source}[^'"\\n]*\\2`, 'i')));
  return out;
}

// --- ADR-006: los importes no pasan por coma flotante -----------------------

// `cents?` solo como palabra o sufijo (priceCents, cents): "porcentaje" y "centro" no son dinero.
const PALABRAS_DINERO = /cents?(?![a-z])|pric|prec|euro|eur\b|amount|import/i;

/**
 * ADR-006 (docs/arquitectura.md §8; HU-05/CA-F02, CA-F06): el precio que escribe
 * el encargado ("2,50") se convierte a céntimos parseando la CADENA, "nunca
 * `parseFloat(x) * 100`". Detecta `parseFloat` en cualquier fichero de
 * apps/api, apps/web y packages/shared, y `Math.round|floor|ceil|trunc(… * 100)`
 * en una línea que habla de dinero (céntimos, precio, euros, importe). Multiplicar
 * un ENTERO por 100 (`Number(entera) * 100 + Number(dec)`) es exacto y no se
 * señala; tampoco un porcentaje (`Math.round(parte / total * 100)`).
 */
export function hallazgosAdr006(fichero: string, src: string): Hallazgo[] {
  const codigo = sinComentarios(src);
  const out: Hallazgo[] = [];
  out.push(...buscar('ADR-006', fichero, codigo, /\bparseFloat\b/));
  for (const [i, linea] of codigo.split('\n').entries()) {
    if (/\bMath\s*\.\s*(?:round|floor|ceil|trunc)\s*\([^;]*\*\s*100\b/.test(linea) && PALABRAS_DINERO.test(linea)) {
      out.push({ regla: 'ADR-006', fichero, linea: i + 1, texto: linea.trim().slice(0, 160) });
    }
  }
  return out;
}

export function informe(h: Hallazgo[]): string {
  return h.map((x) => `${x.regla} ${x.fichero}:${x.linea}  ${x.texto}`).join('\n');
}
