# ADR-004: Mecanismo de tiempo real

- **Estado:** Propuesto (pendiente de la puerta de la Etapa 1)
- **Fecha:** 2026-11-21
- **Autor:** Software Engineer

## Contexto

Requisitos:
- Pedido nuevo visible en barra en ≤ 2 s p95 con 10 dispositivos (HU-02).
- Cambio de estado visible en camareros en ≤ 2 s (HU-03); modificaciones en
  ≤ 2 s (HU-06); "agotado" en todos los dispositivos en ≤ 5 s (HU-05).
- Sin recargar la página (HU-03); aviso "Sin conexión" en ≤ 5 s y
  resincronización automática sin perder pedidos (HU-03).
- Cierre de sesión forzado en ≤ 1 min al desactivar un usuario (HU-07).
- Barra no debe recibir importes (HU-03).

El flujo de datos en tiempo real es **solo del servidor al cliente**; las
acciones del usuario ya van por HTTP (REST). Una sola instancia de backend
(ADR-001).

## Opciones consideradas

1. **Sondeo periódico (polling cada 1 s):** lo más simple, pero 10 dispositivos
   × 1 petición/s constantes, latencia media de 0,5 s añadida y ruido en logs y
   en el cálculo de inactividad.
2. **WebSocket:** bidireccional; no lo necesitamos. Requiere gestionar
   reconexión, latido y autenticación del canal a mano, y el proxy debe hacer
   *upgrade*.
3. **Server-Sent Events (SSE):** HTTP normal de larga duración, unidireccional,
   reconexión automática nativa (`EventSource`), envía la cookie de sesión al ser
   del mismo origen, compatible con HTTP/2 y con Caddy sin configuración especial.
4. **Servicio externo (broker MQTT, Redis pub/sub, Firebase):** un componente
   más que operar para 10 clientes. YAGNI.

## Decisión

**SSE** en `GET /api/v1/events`, con **resincronización por snapshot**:

- Bus de eventos **en memoria** en el proceso de `app`; los servicios publican
  después del `COMMIT`. El hub mantiene las conexiones abiertas con su sesión y
  rol, y serializa cada evento según el rol (barra: sin importes).
- Eventos: `hello`, `order.created`, `order.updated`, `product.updated`,
  `menu.changed`, `settings.updated` (retirado en la revisión 2026-11-23),
  `session.updated`, `session.revoked`,
  `ping` (cada 2 s, con `serverTime`). Detalle en `docs/arquitectura.md` §6.
- El cliente tiene un vigilante: sin ningún mensaje en 5 s → "Sin conexión" y
  reconexión. Tras `hello`, pide el snapshot completo por REST y lo sustituye.
  Cada evento de pedido lleva `version`; se ignoran los de versión ≤ a la local.
- No se implementa `Last-Event-ID` ni historial de eventos: el estado abierto
  completo es pequeño y el snapshot es más simple y fiable.
- Al desactivar un usuario o cambiar su rol, el hub envía `session.revoked` /
  `session.updated` y cierra el flujo de esa sesión al instante.

## Consecuencias

- (+) Sin dependencias nuevas ni servicios extra; el proxy solo reenvía HTTP.
- (+) La reconexión + snapshot cubre caídas de Wi-Fi, reinicios de `app` y
  eventos perdidos con un único mecanismo.
- (−) Limitado a **una instancia** de `app`. Si algún día hay varias, se
  sustituye el bus en memoria por `LISTEN/NOTIFY` de PostgreSQL (la interfaz del
  bus no cambia).
- (−) En HTTP/1.1 los navegadores limitan a 6 conexiones por origen; se evita
  sirviendo por HTTP/2 desde Caddy y usando un único flujo por pestaña.
- (−) Los `ping` cada 2 s no deben contar como actividad del usuario para la
  inactividad de 15 min (ver ADR-005); el flujo SSE se excluye de ese cálculo.
- El proxy no debe almacenar en búfer `text/event-stream` (Caddy lo vacía
  inmediatamente por defecto; Infrastructure lo verifica).

## Revisión 2026-11-21 (tarea 1.3b)

La decisión (SSE + snapshot) **no cambia**. Se amplía el contrato:
- Nuevos eventos `payment.created` y `payment.voided` (solo W y M) para
  "Cobrados hoy" (HU-04). `order.updated` lleva un campo `change`
  (`prep_ready`, `served`, `requeued`, `paid`, …) con el que el cliente decide
  avisos y sonido; los cambios de cobro no se envían a barra.
- Destinatarios por rol y por tipo de cambio en `docs/arquitectura.md` §6
  (barra recibe `served` para retirar "Deshacer Listo"; `settings.updated` va
  filtrado por rol).
- Todos los eventos de dominio llevan `emittedAt` (hallazgo M-03) para medir la
  propagación extremo a extremo en el cliente.
- `hello` y `ping` llevan `businessDate`: el cliente recarga la lista de sala al
  cambiar el día (HU-03, cobrados sin servir), sin temporizador en servidor.

## Revisión 2026-11-23 (tarea 1.3c)

La decisión (SSE + snapshot) **no cambia**. Se **retira el evento
`settings.updated`** (HU-09 fuera del MVP): mesas y umbral de retraso solo
cambian con un reinicio de `app` por soporte técnico, y tras la reconexión el
cliente vuelve a leer `GET /auth/me` (con `localConfig`) junto con su snapshot
(`docs/arquitectura.md` §6). No hace falta un evento para un valor que no
cambia con la aplicación en marcha.
