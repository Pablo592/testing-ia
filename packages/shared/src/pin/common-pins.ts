// Lista de PIN prohibidos (docs/seguridad.md §6.1.2; docs/arquitectura.md §7).
// Versionada: la mantiene Cybersecurity. Fuentes: estudios públicos de
// frecuencia de PIN de 4 dígitos (fechas, patrones de teclado, repeticiones) y
// los ejemplos citados por la política. Las entradas de 6 dígitos son patrones
// (menos de 4 dígitos distintos o patrones de teclado conocidos), coherentes
// con el filtro del generador de PIN de DEV y de TESTING
// (deploy/dev/generar-secretos.sh, tests/run.sh): un PIN que acepta ese
// filtro nunca está en esta lista.
// Algunas entradas también las cubre otra regla (todos iguales, secuencia,
// bloque repetido): da igual, la regla que se informa es la primera que falla.
export const COMMON_PINS_VERSION = '2026-11-24.1';

const CUATRO = [
  // Repeticiones y secuencias (también las cubren otras reglas).
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1234', '4321', '0123', '3210', '2345', '5432', '6789', '9876',
  '1212', '1313', '1414', '2121', '2323', '6969', '1010', '2020', '0101', '1122',
  '1100', '1001', '0011', '1221', '2112', '1133', '1144', '7711', '1123', '1233',
  // Patrones del teclado numérico (columnas, filas, diagonales, esquinas).
  '2580', '0852', '1470', '0741', '3690', '0963', '1478', '8741', '1357', '7531',
  '2468', '8642', '1593', '3579', '9753', '7410', '8520', '9630', '1236', '1379',
  '1397', '2589', '5852', '1478', '3214', '1230',
  // Fechas, años y números populares.
  '1004', '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008',
  '2009', '2010', '2011', '2012', '1980', '1981', '1982', '1983', '1984', '1985',
  '1986', '1987', '1988', '1989', '1990', '1991', '1992', '1993', '1994', '1995',
  '1996', '1997', '1998', '1999', '0007', '0070', '0420', '0911', '1225', '1201',
  '1231', '0214', '1024', '4200', '5150', '1066', '1776', '1492', '7007', '2525',
  '5683', '1369', '0258', '1020', '1210', '3112', '0110', '1101', '0001', '1000',
];

const SEIS = [
  '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777',
  '888888', '999999', '112233', '147258', '159753', '696969', '123321', '654456',
  '101010', '202020', '520520', '789456', '147369', '258369', '159357', '121212',
  '123123', '131313', '112211', '110011', '100100', '100001', '111222', '222111',
  '007007', '112112', '121121', '211211', '001001', '010101', '202202', '123456',
  '654321', '111000', '000111', '232323', '343434', '454545', '565656', '696996',
  '969696', '101101',
];

export const COMMON_PINS: ReadonlySet<string> = new Set([...CUATRO, ...SEIS]);
