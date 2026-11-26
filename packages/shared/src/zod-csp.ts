// T-45 (RS-26 E): zod 4 sondea `new Function("")` para su JIT y, con la CSP
// estricta (sin 'unsafe-eval'), el navegador registra una violación en cada
// carga. En el cliente se desactiva el JIT antes de cualquier uso de zod.
// Debe ser el PRIMER import de apps/web/src/main.tsx. El servidor no lo usa.
import { config } from 'zod';

config({ jitless: true });
