# ADR-008: Concurrencia e idempotencia de operaciones

- **Estado:** Propuesto (pendiente de la puerta de la Etapa 1)
- **Fecha:** 2026-11-21
- **Autor:** Software Engineer

## Contexto

- HU-02: si se pierde la conexión al enviar, un reintento **no crea pedidos
  duplicados**.
- HU-04: un pedido no se puede cobrar dos veces, ni por doble toque ni por
  reintento de red.
- HU-06: si dos dispositivos modifican el mismo pedido a la vez, ningún cambio
  se pierde en silencio; el segundo recibe aviso y ve la versión actual.
- HU-03: barra y camareros cambian el mismo pedido (preparación vs. líneas).

## Opciones consideradas

1. **Cabecera `Idempotency-Key` + tabla de respuestas guardadas:** genérico pero
   requiere una tabla y caducidad de claves.
2. **IDs generados por el cliente** (UUID) para lo que se crea (pedido, líneas,
   cobro): el propio id es la clave de idempotencia; `INSERT … ON CONFLICT`.
3. **Bloqueo pesimista** de pedidos durante la edición: bloqueos colgados si una
   tablet se queda sin batería; mala experiencia.
4. **Control optimista con `version`:** sin bloqueos; conflicto detectado al
   guardar.

## Decisión

- **Creación idempotente por id de cliente (opción 2):** el cliente genera un
  UUID para el pedido, cada línea y cada cobro antes de enviarlos, y lo reutiliza
  en los reintentos. Si el recurso ya existe y es del mismo usuario y contenido
  equivalente, el servidor responde `200` con el existente; si el id existe con
  otro contenido, `409`.
- **Doble cobro imposible en BD:** índice único parcial
  `payment_orders (order_id) WHERE NOT voided`, cobro en una transacción con
  `SELECT … FOR UPDATE` de los pedidos y comprobación de `expectedTotalCents`.
- **Modificaciones de líneas y cancelación (opción 4):** `orders.version`;
  la petición incluye `expectedVersion`; `UPDATE … WHERE version = $expected`.
  Si no coincide → `409 ORDER_VERSION_CONFLICT` con el pedido actual.
- **Transiciones de preparación (barra):** validadas contra el estado actual
  (máquina de estados), no contra la versión, para que barra no reciba conflictos
  por cambios de líneas que no le afectan. Incrementan `version` igualmente
  para el orden de eventos SSE (ADR-004).

## Consecuencias

- (+) Sin tablas extra ni bloqueos; reintentos seguros por diseño.
- (+) La BD es la última barrera ante errores de lógica en el cobro.
- (−) El cliente debe conservar los ids del borrador hasta recibir confirmación
  (se guardan con el borrador en `localStorage`).
- (−) Un camarero puede recibir `409` si barra o un compañero tocó el pedido
  justo antes; la UI debe mostrar el aviso y la versión nueva (UX).

## Revisión 2026-11-21 (tarea 1.3b)

La decisión **no cambia**; se extiende a los estados nuevos:
- **"Servido" y los "Deshacer"** son transiciones de preparación: se validan
  con la máquina de estados bajo `SELECT … FOR UPDATE` del pedido, no con
  `expectedVersion`. Cada pedido guarda `prep_last_action`, `prep_changed_at` y
  `prep_changed_by`; un "Deshacer" solo vale si deshace la última acción, en
  ≤ 30 s (tolerancia de servidor 32 s) y, para "Servido", si lo pide quien lo
  marcó. Si barra deshace "Listo" a la vez que sala marca "Servido", el bloqueo
  serializa ambas y la segunda recibe `409`.
- **Vuelta a la cola** (añadir a un pedido Listo/Servido) se decide en la misma
  transacción que añade las líneas.
- **Anulación del cobro completo:** una transacción con bloqueo del cobro y de
  todos sus pedidos; segunda anulación → `409 PAYMENT_ALREADY_VOIDED`.
- **Ajustes (HU-09):** `PATCH /settings` con `expectedVersion` y `FOR UPDATE`;
  la creación de pedidos de mesa lee `table_count` con `FOR SHARE`.
