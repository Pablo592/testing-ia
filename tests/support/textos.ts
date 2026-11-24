// Textos exactos de UX compartidos por unitarios y E2E (docs/ux/wireframes/01-login.md,
// "Reglas de PIN", tarea 2.1d). Si UX los cambia, solo se toca este fichero.
export const TEXTOS_REGLA_PIN: Readonly<Record<string, string>> = {
  digits_only: 'El PIN solo puede tener números del 0 al 9',
  length: 'El PIN debe tener de 4 a 6 dígitos',
  manager_length: 'El PIN de un encargado debe tener 6 dígitos',
  all_same: 'No uses el mismo dígito repetido',
  sequence: 'No uses secuencias como 1234 o 9876',
  repeated_block: 'No uses bloques repetidos como 1212',
  common: 'Ese PIN es demasiado común: elige otro',
};

export const TEXTO_REGLA_DESCONOCIDA = 'Ese PIN no es válido: elige otro';
