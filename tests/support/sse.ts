// Cliente SSE de prueba (docs/testing.md §3): sobre fetch de Node (undici),
// parsea text/event-stream y permite esperar eventos y el cierre del flujo.

export interface EventoSse {
  event: string;
  data: unknown;
  llegada: number; // performance.now()
}

export interface ClienteSse {
  status: number;
  /** Cabeceras de la respuesta (SEC-040/SEC-041: Retry-After, Cache-Control). */
  headers: Headers;
  eventos: EventoSse[];
  esperar(nombre: string, ms: number): Promise<EventoSse>;
  /** Resuelve con el instante (performance.now()) en que el servidor cierra el flujo. */
  esperarCierre(ms: number): Promise<number>;
  cerrar(): void;
}

export async function abrirSse(base: string, cookie: string | undefined, ruta = '/api/v1/events'): Promise<ClienteSse> {
  const ctl = new AbortController();
  const res = await fetch(base + ruta, {
    headers: { accept: 'text/event-stream', ...(cookie ? { cookie } : {}) },
    signal: ctl.signal,
  });
  const eventos: EventoSse[] = [];
  const esperas: { nombre: string; ok: (e: EventoSse) => void }[] = [];
  let cerradoEn: number | undefined;
  const esperasCierre: ((t: number) => void)[] = [];

  const terminar = () => {
    cerradoEn ??= performance.now();
    esperasCierre.splice(0).forEach((f) => f(cerradoEn as number));
  };

  if (res.status === 200 && res.body) {
    void (async () => {
      const lector = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      try {
        for (;;) {
          const { done, value } = await lector.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const bloque = buf.slice(0, i);
            buf = buf.slice(i + 2);
            let event = 'message';
            const datos: string[] = [];
            for (const l of bloque.split('\n')) {
              if (l.startsWith('event:')) event = l.slice(6).trim();
              else if (l.startsWith('data:')) datos.push(l.slice(5).trimStart());
            }
            if (datos.length === 0 && event === 'message') continue;
            let data: unknown = datos.join('\n');
            try {
              data = JSON.parse(data as string);
            } catch {
              /* texto */
            }
            const ev = { event, data, llegada: performance.now() };
            eventos.push(ev);
            for (let k = esperas.length - 1; k >= 0; k--) {
              if (esperas[k].nombre === event) esperas.splice(k, 1)[0].ok(ev);
            }
          }
        }
      } catch {
        /* abortado o cortado */
      }
      terminar();
    })();
  } else {
    terminar();
  }

  return {
    status: res.status,
    headers: res.headers,
    eventos,
    esperar(nombre, ms) {
      const ya = eventos.find((e) => e.event === nombre);
      if (ya) return Promise.resolve(ya);
      return new Promise((ok, mal) => {
        const t = setTimeout(() => mal(new Error(`SSE: no llegó "${nombre}" en ${ms} ms`)), ms);
        esperas.push({ nombre, ok: (e) => (clearTimeout(t), ok(e)) });
      });
    },
    esperarCierre(ms) {
      if (cerradoEn !== undefined) return Promise.resolve(cerradoEn);
      return new Promise((ok, mal) => {
        const t = setTimeout(() => mal(new Error(`SSE: el servidor no cerró el flujo en ${ms} ms`)), ms);
        esperasCierre.push((x) => (clearTimeout(t), ok(x)));
      });
    },
    cerrar() {
      ctl.abort();
    },
  };
}
