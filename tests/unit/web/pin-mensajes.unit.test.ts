// HU-01/CA-N01, HU-07/CA-F06: tabla PinRule → texto de la app
// (docs/ux/wireframes/01-login.md, "Reglas de PIN", 2.1d). Debe ser total:
// toda regla tiene texto propio y una desconocida cae en el genérico, nunca en
// blanco. Subruta fijada en docs/arquitectura.md §3.1 (2.1i, T-42):
// @mi-app/web/pin-messages → pinRuleMessage(rule: string): string
// (apps/web/src/features/pin/pin-messages.ts).
import { expect, test } from 'vitest';
import { pinRuleMessage } from '@mi-app/web/pin-messages';
import { TEXTOS_REGLA_PIN, TEXTO_REGLA_DESCONOCIDA } from '../../support/textos.ts';

test.each(Object.entries(TEXTOS_REGLA_PIN))('[HU-01/CA-N01] regla "%s" → "%s"', (regla, texto) => {
  expect(pinRuleMessage(regla)).toBe(texto);
});

test.each([['otra_regla'], [''], ['DIGITS_ONLY']])('[HU-01/CA-N01] regla desconocida "%s" → texto genérico', (regla) => {
  expect(pinRuleMessage(regla)).toBe(TEXTO_REGLA_DESCONOCIDA);
});
