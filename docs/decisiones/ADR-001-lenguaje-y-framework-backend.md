# ADR-001: Lenguaje y framework del backend

- **Estado:** Propuesto (pendiente de la puerta de la Etapa 1)
- **Fecha:** 2026-11-21
- **Autor:** Software Engineer

## Contexto

Backend de un sistema de toma de pedidos para **un local**: ≤ 10 dispositivos a
la vez, ~500 pedidos/día, ~200 productos (README de historias). Operaciones CRUD
con reglas de negocio moderadas (estados del pedido, cobro, bloqueo de PIN) y
notificación en tiempo real a los dispositivos (ADR-004).

Tipo de carga: **E/S** (consultas a PostgreSQL y red Wi-Fi). Pico estimado: unas
pocas peticiones por segundo. La única operación con CPU apreciable es la
verificación del PIN con argon2id (decenas de ms, varias por minuto como mucho).
Requisitos de latencia: ≤ 1 s login/cobro, ≤ 2 s propagación (p95). Seguridad
relevante (sesiones, permisos, dinero), pero no de nivel "memoria crítica".

Hay un frontend web (ADR-002) que comparte reglas con el servidor: cálculo de
totales, reglas de PIN, estados del pedido, permisos y esquemas de la API.

## Opciones consideradas

| Criterio | TypeScript (Node.js + Fastify) | Go (net/http + chi) | Python (FastAPI) | Rust (axum) |
|---|---|---|---|---|
| Ajuste a carga E/S pequeña | Muy bueno | Muy bueno | Bueno | Sobrado |
| Rendimiento/memoria | Suficiente (~60–100 MB) | Mejor (~20 MB) | Suficiente | Mejor |
| Compartir tipos y reglas con el frontend | **Sí, mismo lenguaje** | No (duplicar o generar) | No | No (o vía WASM, complejo) |
| SSE / tiempo real | Nativo, simple | Nativo, simple | Posible (async) | Nativo |
| Velocidad de desarrollo | Alta | Alta | Alta | Menor |
| Ecosistema (validación, argon2, SQL tipado) | zod, argon2, Kysely | Bueno | Bueno | Bueno |
| Imagen final mínima | distroless nodejs (~50 MB) | scratch/distroless (~15 MB) | slim (~60 MB) | scratch (~10 MB) |
| Seguridad de memoria | Gestionada (GC) | Gestionada (GC) | Gestionada | Garantías en compilación |

**Rust**: la regla del equipo lo prefiere para CPU intensiva, alta concurrencia,
baja latencia, memoria escasa o seguridad crítica. Ninguna aplica: el cuello de
botella sería la BD/red, no el código, y 10 conexiones no son "alta
concurrencia". Su coste en velocidad de desarrollo no se compensa.

**Go** es una alternativa sólida (imagen más pequeña, menos memoria), pero
obliga a duplicar en dos lenguajes las reglas que el cliente también necesita
(total en ≤ 200 ms, validación de PIN, permisos para la UI, tipos de la API).

## Decisión

**TypeScript sobre Node.js (versión LTS activa) con Fastify**, como **monolito
modular de una sola instancia**.

- Fastify: validación de esquemas integrada, logger pino (JSON) incluido,
  buen soporte de SSE y de archivos estáticos.
- Paquete `packages/shared` con esquemas zod, dinero, permisos y máquina de
  estados, compartido con el frontend.
- Monolito modular (módulos `auth`, `menu`, `orders`, `payments`, `staff`,
  `reports`, `settings` —retirado en la revisión 2026-11-23—, `audit`) con DI
  manual por constructor.
- Versiones exactas fijadas en el lockfile de pnpm; la imagen base, por digest
  (Infrastructure).

## Consecuencias

- (+) Un solo lenguaje en todo el proyecto: menos contexto, reglas sin duplicar.
- (+) Arranque rápido de desarrollo; amplio conocimiento disponible.
- (−) Más memoria e imagen algo mayor que Go/Rust; irrelevante a esta escala.
- (−) El ecosistema npm tiene más dependencias transitivas: obliga a escaneo de
  dependencias (Trivy/Grype + `pnpm audit`) y a mantener pocas dependencias.
- (−) Node es monohilo: la verificación argon2 usa el pool de hilos de libuv
  (el paquete `argon2` es nativo y asíncrono), así que no bloquea el bucle.
- Si en el futuro un componente necesitara CPU intensiva, se podría extraer en
  Rust sin cambiar el resto (arquitectura mixta permitida).

## Revisión 2026-11-23 (tarea 1.3c)

La decisión (TypeScript + Node.js LTS + Fastify, monolito modular) **no
cambia**. Ajustes:

- **Módulos:** se retira `settings` (HU-09 fuera del MVP). Mesas y umbral de
  retraso son configuración de instalación de solo lectura en `config.ts`
  (`docs/arquitectura.md` §4.1).
- **UID de la imagen final (SEC-010, resto).**
  - Contexto: la imagen distroless trae el usuario `nonroot` (UID 65532),
    mientras que `docs/reglas-equipo.md` §3.4 fija `--user 1000:1000` y el
    diseño de PROD monta los secretos con `uid=1000`. Con UID distintos, el
    proceso no puede leer un secreto en modo 0400, y la salida fácil (0444)
    lo haría legible para cualquier proceso.
  - Opciones: (1) usar 65532 en imagen, ejecución y secretos; (2) **usar
    1000:1000** en todo.
  - Decisión: (2). La etapa final de la imagen de `app` (también `migrate`,
    `create-initial-manager` y `unlock-user`, que son la misma imagen) hace
    `COPY --chown=1000:1000` y declara `USER 1000:1000` numérico; se ejecuta
    con `--user 1000:1000`; los secretos se montan con
    `uid=1000,gid=1000,mode=0400`.
  - Motivo: coincide con la regla §3.4, con el Containerfile de DEV y con el
    diseño de secretos de Infrastructure; un único UID en todo el proyecto
    evita el desajuste que originó el hallazgo. 65532 también cumple
    "UID ≥ 1000", pero obligaría a una excepción a `--user 1000:1000`.
  - Consecuencias: (−) la distroless no tiene entrada en `/etc/passwd` para el
    UID 1000; Node no la necesita (la app no usa `os.userInfo()`; si una
    librería necesita `HOME`, `ENV HOME=/tmp`). (+) En rootless el UID 1000 del
    contenedor se mapea a un subuid del usuario de servicio, nunca a 0 en el
    host. Infrastructure lo aplica en el Containerfile, compose y Quadlet.
