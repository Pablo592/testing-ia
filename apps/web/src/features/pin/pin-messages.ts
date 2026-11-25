// Tabla PinRule → texto de la app (docs/ux/wireframes/01-login.md, "Reglas de PIN";
// docs/arquitectura.md §3.1, T-42). Función total: una regla desconocida
// devuelve el texto genérico, nunca vacío.
const MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  digits_only: 'El PIN solo puede tener números del 0 al 9',
  length: 'El PIN debe tener de 4 a 6 dígitos',
  manager_length: 'El PIN de un encargado debe tener 6 dígitos',
  all_same: 'No uses el mismo dígito repetido',
  sequence: 'No uses secuencias como 1234 o 9876',
  repeated_block: 'No uses bloques repetidos como 1212',
  common: 'Ese PIN es demasiado común: elige otro',
});

export const UNKNOWN_RULE_MESSAGE = 'Ese PIN no es válido: elige otro';

export function pinRuleMessage(rule: string): string {
  return Object.prototype.hasOwnProperty.call(MESSAGES, rule) ? (MESSAGES[rule] as string) : UNKNOWN_RULE_MESSAGE;
}

/** Ayuda bajo el campo al crear o cambiar un PIN. */
export function pinRuleHelp(isManager: boolean): string {
  const resto = 'No vale: el mismo dígito repetido (1111), secuencias de 4 o más (1234, 9876), bloques repetidos (1212) ni los PIN más comunes.';
  return isManager ? `Exactamente 6 dígitos. ${resto}` : `De 4 a 6 dígitos. ${resto}`;
}
