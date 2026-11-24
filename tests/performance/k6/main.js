// Punto de entrada de k6 en compose.test.yaml (runner-perf). Cada historia
// añade su escenario; de momento, HU-01/CA-N03.
export { options, default } from './HU-01-login.js';
