#!/usr/bin/env python3
"""Dashboard del equipo de agentes.

Uso:  python3 tools/dashboard/servidor.py [puerto]     (por defecto 8765)
Abre: http://127.0.0.1:8765

Solo escucha en 127.0.0.1 (no es accesible desde otras máquinas), corre con tu
usuario normal y solo LEE archivos del proyecto. No necesita dependencias.
"""
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

RAIZ = Path(__file__).resolve().parents[2]
EVENTOS = RAIZ / ".claude" / "actividad" / "eventos.jsonl"
ESTADO = RAIZ / "docs" / "estado.md"
DOCS = RAIZ / "docs"
HTML = Path(__file__).with_name("index.html")
MAX_EVENTOS = 1000


def leer_eventos(desde):
    if not EVENTOS.exists():
        return {"total": 0, "reinicio": desde > 0, "eventos": []}
    lineas = EVENTOS.read_text(encoding="utf-8", errors="replace").splitlines()
    total = len(lineas)
    reinicio = desde > total  # el archivo se vació o se reemplazó
    if reinicio:
        desde = 0
    nuevas = lineas[desde:]
    if len(nuevas) > MAX_EVENTOS:
        nuevas = nuevas[-MAX_EVENTOS:]
    eventos = []
    for linea in nuevas:
        try:
            eventos.append(json.loads(linea))
        except json.JSONDecodeError:
            pass
    return {"total": total, "reinicio": reinicio, "eventos": eventos}


def leer_estado():
    estado = ESTADO.read_text(encoding="utf-8", errors="replace") if ESTADO.exists() else ""
    archivos = []
    if DOCS.exists():
        for p in DOCS.rglob("*"):
            if p.is_file() and p.name != ".gitkeep":
                st = p.stat()
                archivos.append({
                    "ruta": str(p.relative_to(RAIZ)),
                    "mtime": st.st_mtime,
                    "bytes": st.st_size,
                })
    archivos.sort(key=lambda a: a["mtime"], reverse=True)
    return {"proyecto": RAIZ.name, "estado": estado, "archivos": archivos[:40]}


class Manejador(BaseHTTPRequestHandler):
    def _enviar(self, codigo, cuerpo, tipo):
        datos = cuerpo.encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(datos)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(datos)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/":
            self._enviar(200, HTML.read_text(encoding="utf-8"), "text/html; charset=utf-8")
        elif url.path == "/api/eventos":
            try:
                desde = max(0, int(parse_qs(url.query).get("desde", ["0"])[0]))
            except ValueError:
                desde = 0
            self._enviar(200, json.dumps(leer_eventos(desde), ensure_ascii=False),
                         "application/json; charset=utf-8")
        elif url.path == "/api/estado":
            self._enviar(200, json.dumps(leer_estado(), ensure_ascii=False),
                         "application/json; charset=utf-8")
        else:
            self._enviar(404, "No encontrado", "text/plain; charset=utf-8")

    def log_message(self, *args):
        pass  # sin ruido en la terminal


def main():
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    servidor = ThreadingHTTPServer(("127.0.0.1", puerto), Manejador)
    print(f"Dashboard de agentes: http://127.0.0.1:{puerto}  (Ctrl+C para salir)")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
