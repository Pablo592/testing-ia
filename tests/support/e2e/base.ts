// `test` de Playwright para los e2e a través de Caddy (RS-26, parte E, SEC-045 g):
// cada test falla si el navegador registra CUALQUIER violación de la Content
// Security Policy: evento `securitypolicyviolation` en cualquier página del
// contexto (sobrevive a las navegaciones: se envía al test por un binding) o un
// mensaje de consola de CSP ("Refused to ...", "Content Security Policy").
// Los tests que crean su propio contexto con `browser.newContext()` no pasan
// por aquí: usan `abrirContextoConCsp` si quieren la misma comprobación.
import { expect, test as base, type BrowserContext } from '@playwright/test';

export { expect };

const MENSAJE_CSP = /content security policy|refused to (?:load|execute|apply|connect|frame|create a worker|send|navigate|run|evaluate)/i;

interface VigilanteCsp {
  violaciones: string[];
}

/** Instala el vigilante en un contexto (también el de `browser.newContext()`). */
export async function vigilarCsp(context: BrowserContext): Promise<VigilanteCsp> {
  const v: VigilanteCsp = { violaciones: [] };
  await context.exposeBinding('__reportarCsp', (_origen, texto: string) => {
    v.violaciones.push(`evento securitypolicyviolation: ${texto}`);
  });
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      const informar = (window as unknown as { __reportarCsp?: (t: string) => void }).__reportarCsp;
      informar?.(`${e.violatedDirective} bloqueó ${e.blockedURI || '(inline)'} en ${e.documentURI} (origen ${e.sourceFile || '?'}:${e.lineNumber}:${e.columnNumber}, muestra ${JSON.stringify((e.sample || '').slice(0, 80))})`);
    });
  });
  const escuchar = (page: import('@playwright/test').Page): void => {
    page.on('console', (m) => {
      if (MENSAJE_CSP.test(m.text())) v.violaciones.push(`consola (${m.type()}): ${m.text().slice(0, 300)}`);
    });
    page.on('pageerror', (e) => {
      if (MENSAJE_CSP.test(e.message)) v.violaciones.push(`pageerror: ${e.message.slice(0, 300)}`);
    });
  };
  context.pages().forEach(escuchar);
  context.on('page', escuchar);
  return v;
}

export const test = base.extend({
  context: async ({ context }, use) => {
    const v = await vigilarCsp(context);
    await use(context);
    expect(v.violaciones, 'violaciones de CSP durante el test (RS-26 E)').toEqual([]);
  },
});
