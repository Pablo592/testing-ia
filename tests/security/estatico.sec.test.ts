// SEC-045 (d), (e), (f): comprobaciones estáticas de seguridad sobre el código.
//   RS-16c  solo el módulo auth (verifyPin) usa o recibe el hasher argon2id
//   RS-25   sin dangerouslySetInnerHTML, innerHTML, eval ni new Function en apps/web
//   RS-35   sin sql.raw/lit/ref/id ni SQL concatenado con datos en apps/api
// Sin BD ni red: leen el código del repositorio (montado en solo lectura).
// Cada regla tiene además pruebas con fragmentos sintéticos que muestran que el
// detector detecta el defecto (y no se queja de comentarios ni de código
// correcto): "Cómo verificar" de SEC-045.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  codigoFuente,
  hallazgosRs16c,
  hallazgosRs25,
  hallazgosRs35,
  informe,
  leer,
  RAICES_DE_COMPOSICION,
  RUTA_HASHER,
  sinComentarios,
  type Hallazgo,
} from '../support/estatico.ts';

const API = fileURLToPath(new URL('../../apps/api/', import.meta.url));
const WEB = fileURLToPath(new URL('../../apps/web/', import.meta.url));

const fuentesApi = existsSync(API) ? codigoFuente(`${API}src`, API) : [];
const fuentesWeb = existsSync(WEB) ? [...codigoFuente(`${WEB}src`, WEB), ...(existsSync(`${WEB}index.html`) ? [{ ruta: `${WEB}index.html`, rel: 'index.html' }] : [])] : [];

function recorrer(fuentes: { ruta: string; rel: string }[], regla: (rel: string, src: string) => Hallazgo[]): Hallazgo[] {
  return fuentes.flatMap((f) => regla(f.rel, leer(f.ruta)));
}

describe('el código existe (si no, las reglas no comprobarían nada)', () => {
  test('[HU-01/CA-F06][RS-16c] hay fuentes de apps/api y apps/web que revisar', () => {
    expect(fuentesApi.length, 'ficheros de apps/api/src').toBeGreaterThan(10);
    expect(fuentesWeb.length, 'ficheros de apps/web/src').toBeGreaterThan(5);
    expect(fuentesApi.map((f) => f.rel)).toContain(RUTA_HASHER);
    for (const raiz of RAICES_DE_COMPOSICION) expect(fuentesApi.map((f) => f.rel), `raíz de composición ${raiz}`).toContain(raiz);
  });
});

describe('RS-16c: solo el módulo auth usa el hasher argon2id', () => {
  test('[HU-01/CA-F06][RS-16c] ningún módulo de apps/api distinto de auth importa argon2 ni recibe el PinHasher', () => {
    const h = recorrer(fuentesApi, hallazgosRs16c);
    expect(h, `\n${informe(h)}`).toEqual([]);
  });

  test('[HU-01/CA-F06][RS-16c] ningún otro paquete (apps/web, packages/shared) importa argon2', () => {
    const otros = [
      ...fuentesWeb,
      ...codigoFuente(fileURLToPath(new URL('../../packages/shared/src', import.meta.url)), fileURLToPath(new URL('../../packages/shared/', import.meta.url))),
    ];
    const h = otros.flatMap((f) => hallazgosRs16c(`otro/${f.rel}`, leer(f.ruta)).filter((x) => /argon2/.test(x.texto)));
    expect(h, `\n${informe(h)}`).toEqual([]);
  });

  describe('el detector detecta el defecto', () => {
    test('importar argon2 fuera de hasher.ts', () => {
      expect(hallazgosRs16c('src/http/guard.ts', "import argon2 from 'argon2';\n")).toHaveLength(1);
      expect(hallazgosRs16c('src/modules/auth/rate-limit.ts', "const a = await import('argon2');\n")).toHaveLength(1);
      expect(hallazgosRs16c('src/realtime/hub.ts', 'const a = require("argon2");\n')).toHaveLength(1);
      expect(hallazgosRs16c(RUTA_HASHER, "import argon2 from 'argon2';\n")).toEqual([]);
    });
    test('un módulo que no es auth recibe o nombra el hasher', () => {
      expect(hallazgosRs16c('src/http/routes/auth.ts', 'const { pinHasher } = ctx;\n').length).toBeGreaterThan(0);
      expect(hallazgosRs16c('src/realtime/hub.ts', "import type { PinHasher } from '../modules/auth/hasher.ts';\n").length).toBeGreaterThan(0);
      expect(hallazgosRs16c('src/http/context.ts', 'interface Ctx { hasher: unknown }\n').length).toBeGreaterThan(0);
    });
    test('una raíz de composición pasa el hasher a algo que no es createAuthModule', () => {
      const mal = "const hub = new Hub({ db, hasher: deps.pinHasher });\nconst auth = createAuthModule({ db, hasher: deps.pinHasher });\n";
      const h = hallazgosRs16c('src/app.ts', mal);
      expect(h.map((x) => x.linea)).toEqual([1]);
    });
    test('otro fichero del módulo auth llama a hasher.verify/hash', () => {
      expect(hallazgosRs16c('src/modules/auth/tokens.ts', 'const ok = await hasher.verify(h, p);\n')).toHaveLength(1);
      expect(hallazgosRs16c('src/modules/auth/verify-pin.ts', 'const ok = await hasher.verify(h, p);\n')).toEqual([]);
    });
    test('lo permitido no da falsos positivos', () => {
      const bien = [
        "import type { PinHasher } from './modules/auth/hasher.ts';",
        "export type { PinHasher } from './modules/auth/hasher.ts';",
        'interface AppDeps {',
        '  pinHasher: PinHasher;',
        '}',
        "if (!deps.pinHasher || typeof deps.pinHasher.verify !== 'function') {",
        "  throw new ConfigError('pinHasher', 'debe tener hash() y verify()');",
        '}',
        'const auth = createAuthModule({',
        '  db,',
        '  hasher: deps.pinHasher,',
        '});',
        '// el pinHasher solo lo recibe auth',
      ].join('\n');
      expect(hallazgosRs16c('src/app.ts', bien)).toEqual([]);
    });
  });
});

describe('RS-25: sin sumideros de HTML ni de código en apps/web', () => {
  test('[HU-01/CA-F01][RS-25] apps/web no usa dangerouslySetInnerHTML, innerHTML, eval ni new Function', () => {
    const h = recorrer(fuentesWeb, hallazgosRs25);
    expect(h, `\n${informe(h)}`).toEqual([]);
  });

  describe('el detector detecta el defecto', () => {
    test.each([
      ['dangerouslySetInnerHTML', 'return <div dangerouslySetInnerHTML={{ __html: nota }} />;'],
      ['innerHTML', 'el.innerHTML = nota;'],
      ['outerHTML', 'el.outerHTML = nota;'],
      ['insertAdjacentHTML', "el.insertAdjacentHTML('beforeend', nota);"],
      ['document.write', 'document.write(nota);'],
      ['eval', 'const r = eval(codigo);'],
      ['window.eval', 'window.eval(codigo);'],
      ['new Function', "const f = new Function('a', 'return a');"],
      ['Function()', "const f = Function('return 1');"],
      ['setTimeout con cadena', "setTimeout('alert(1)', 10);"],
    ])('%s', (_n, linea) => {
      expect(hallazgosRs25('src/x.tsx', `${linea}\n`).length, linea).toBeGreaterThan(0);
    });

    test('también en index.html fuera de comentarios', () => {
      expect(hallazgosRs25('index.html', '<script>document.body.innerHTML = location.hash</script>')).toHaveLength(1);
      expect(hallazgosRs25('index.html', '<!-- el.innerHTML = x -->\n<div id="root"></div>')).toEqual([]);
    });

    test('lo correcto y los comentarios no dan falsos positivos', () => {
      const bien = [
        '// nunca innerHTML ni eval(): React escapa el texto',
        '/* dangerouslySetInnerHTML está prohibido */',
        'const evaluar = (x) => x;',
        "const retrieval = 'retrieval(1)';",
        "const url = 'https://x.test/a//b';",
        'return <p>{nota}</p>;',
        'const f = (a) => Function_name(a);',
        'el.textContent = nota;',
      ].join('\n');
      expect(hallazgosRs25('src/x.tsx', bien), informe(hallazgosRs25('src/x.tsx', bien))).toEqual([]);
    });
  });
});

describe('RS-35: sin SQL armado con datos de entrada en apps/api', () => {
  test('[HU-01/CA-F05][RS-35] apps/api no usa sql.raw/lit/ref/id ni concatena SQL', () => {
    const h = recorrer(fuentesApi, hallazgosRs35);
    expect(h, `\n${informe(h)}`).toEqual([]);
  });

  describe('el detector detecta el defecto', () => {
    test.each([
      ['sql.raw', 'const q = sql.raw(`SELECT ${x}`);'],
      ['sql.lit', 'const q = sql.lit(x);'],
      ['sql.ref', 'const q = sql.ref(columna);'],
      ['sql.id', 'const q = sql.id(tabla);'],
      ['sql.table', 'const q = sql.table(tabla);'],
      ['sql["raw"]', "const q = sql['raw'](x);"],
      ['.raw()', 'await db.raw(consulta);'],
      ['plantilla sin etiqueta', 'await pool.query(`SELECT * FROM users WHERE name = ${nombre}`);'],
      ['concatenación', "await pool.query('SELECT * FROM users WHERE name = ' + nombre);"],
      ['concatenación por la derecha', "const q = nombre + ' WHERE id = 1';"],
    ])('%s', (_n, linea) => {
      expect(hallazgosRs35('src/x.ts', `${linea}\n`).length, linea).toBeGreaterThan(0);
    });

    test('lo correcto y los comentarios no dan falsos positivos', () => {
      const bien = [
        '// no usar sql.raw ni concatenar: SELECT ... WHERE x = ' + "'" + 'a' + "'",
        '/* sql.lit(x) está prohibido */',
        '.where(sql`lower(name)`, \'=\', sql`lower(${body.name})`)',
        '.set({ failed_attempts: sql<number>`failed_attempts + 1`, updated_at: now })',
        'await sql`SELECT pg_advisory_xact_lock(${INITIAL_MANAGER_LOCK})`.execute(trx);',
        'const mensaje = `Hola ${nombre}, el pedido fue actualizado`;',
        "log.info({ event: 'auth.verify.failed' }, 'Fallo de verificación');",
        'const sql2 = sql.val(valor);',
      ].join('\n');
      expect(hallazgosRs35('src/x.ts', bien), informe(hallazgosRs35('src/x.ts', bien))).toEqual([]);
    });
  });
});

describe('sinComentarios', () => {
  test('quita comentarios, conserva cadenas y números de línea', () => {
    const src = "const u = 'http://x.test'; // innerHTML\n/* eval(\n) */ const t = `a // b ${x}`;\n";
    const r = sinComentarios(src);
    expect(r.split('\n')).toHaveLength(src.split('\n').length);
    expect(r).toContain("'http://x.test'");
    expect(r).toContain('`a // b ${x}`');
    expect(r).not.toContain('innerHTML');
    expect(r).not.toContain('eval');
  });
});
