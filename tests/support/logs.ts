// Captura de los logs de pino de una instancia de buildApp (destino en memoria).
import { Writable } from 'node:stream';

export type Registro = Record<string, unknown> & { event?: string; level?: string | number; msg?: string };

export class CapturaLogs {
  readonly lineas: string[] = [];
  readonly invalidas: string[] = [];
  private resto = '';

  readonly stream = new Writable({
    write: (chunk: Buffer | string, _enc, cb) => {
      this.resto += chunk.toString();
      let i: number;
      while ((i = this.resto.indexOf('\n')) >= 0) {
        const linea = this.resto.slice(0, i);
        this.resto = this.resto.slice(i + 1);
        if (linea.trim() !== '') this.lineas.push(linea);
      }
      cb();
    },
  });

  get registros(): Registro[] {
    const out: Registro[] = [];
    for (const l of this.lineas) {
      try {
        out.push(JSON.parse(l) as Registro);
      } catch {
        if (!this.invalidas.includes(l)) this.invalidas.push(l);
      }
    }
    return out;
  }

  eventos(nombre: string): Registro[] {
    return this.registros.filter((r) => r.event === nombre);
  }

  texto(): string {
    return this.lineas.join('\n') + this.resto;
  }

  /** Claves cuyo nombre casa con /pin/i y cuyo valor no es "[REDACTED]" (docs/logging.md §4.3 b). */
  clavesPinSinRedactar(): string[] {
    const malas: string[] = [];
    const visitar = (v: unknown, ruta: string, prof: number): void => {
      if (prof > 12 || v === null || typeof v !== 'object') return;
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        const r = `${ruta}.${k}`;
        if (/pin/i.test(k) && val !== '[REDACTED]') malas.push(r);
        visitar(val, r, prof + 1);
      }
    };
    this.registros.forEach((reg, i) => visitar(reg, `linea${i}`, 0));
    return malas;
  }
}
