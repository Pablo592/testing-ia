#!/usr/bin/env python3
"""Hook de Claude Code: registra la actividad de los agentes para el dashboard.

Recibe el evento en JSON por stdin y añade una línea resumida a
.claude/actividad/eventos.jsonl. Nunca bloquea ni falla la sesión.
"""
import json
import os
import sys
from datetime import datetime

MAX = 240  # longitud máxima de los textos registrados


def corto(texto, n=MAX):
    texto = " ".join(str(texto).split())
    return texto if len(texto) <= n else texto[: n - 1] + "…"


def relativo(ruta, raiz):
    try:
        if ruta and os.path.isabs(ruta) and ruta.startswith(raiz):
            return os.path.relpath(ruta, raiz)
    except Exception:
        pass
    return ruta


def resumen(evento, datos, raiz):
    ti = datos.get("tool_input") or {}
    herramienta = datos.get("tool_name") or ""

    if evento in ("PreToolUse", "PostToolUseFailure", "PermissionRequest"):
        if herramienta == "Bash":
            texto = ti.get("description") or ""
            cmd = ti.get("command") or ""
            return corto(f"{texto} — $ {cmd}" if texto else f"$ {cmd}")
        if herramienta in ("Read", "Write", "Edit", "NotebookEdit"):
            return relativo(ti.get("file_path") or ti.get("notebook_path") or "", raiz)
        if herramienta in ("Glob", "Grep"):
            return corto(f"{ti.get('pattern', '')} {ti.get('path', '') or ''}".strip())
        if herramienta in ("Agent", "Task"):
            return corto(f"→ {ti.get('subagent_type', '?')}: {ti.get('description', '')}")
        if herramienta == "WebFetch":
            return corto(ti.get("url", ""))
        if herramienta == "WebSearch":
            return corto(ti.get("query", ""))
        if evento == "PostToolUseFailure":
            return corto(datos.get("error") or json.dumps(ti, ensure_ascii=False))
        return corto(json.dumps(ti, ensure_ascii=False))

    if evento == "UserPromptSubmit":
        return corto(datos.get("prompt", ""))
    if evento == "SubagentStop":
        return corto(datos.get("last_assistant_message", ""), 400)
    if evento == "Notification":
        return corto(datos.get("message", ""))
    return ""


def main():
    try:
        datos = json.load(sys.stdin)
    except Exception:
        return

    raiz = os.environ.get("CLAUDE_PROJECT_DIR") or datos.get("cwd") or os.getcwd()
    evento = datos.get("hook_event_name", "")

    registro = {
        "ts": datetime.now().isoformat(timespec="seconds"),
        "evento": evento,
        "agente": datos.get("agent_type") or "orquestador",
        "agent_id": datos.get("agent_id"),
        "sesion": (datos.get("session_id") or "")[:8],
        "herramienta": datos.get("tool_name"),
        "detalle": resumen(evento, datos, raiz),
    }

    carpeta = os.path.join(raiz, ".claude", "actividad")
    os.makedirs(carpeta, mode=0o700, exist_ok=True)
    ruta = os.path.join(carpeta, "eventos.jsonl")
    linea = (json.dumps(registro, ensure_ascii=False) + "\n").encode("utf-8")
    # O_APPEND: cada línea se escribe de una vez, aunque haya agentes en paralelo.
    fd = os.open(ruta, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    try:
        os.write(fd, linea)
    finally:
        os.close(fd)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass  # el registro nunca debe interrumpir el trabajo de los agentes
    sys.exit(0)
