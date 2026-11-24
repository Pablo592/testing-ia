# ADR-003: Base de datos

- **Estado:** Propuesto (pendiente de la puerta de la Etapa 1)
- **Fecha:** 2026-11-21
- **Autor:** Software Engineer

## Contexto

- **Estructura:** claramente relacional: usuarios, categorías, productos,
  pedidos con líneas, cobros que cubren uno o varios pedidos, cierres de caja,
  auditoría.
- **Transacciones ACID imprescindibles:** número correlativo del día sin
  duplicados (HU-02), cobro sin duplicar (HU-04), recálculo de total junto con
  las líneas, cambios concurrentes sin pérdidas (HU-06), auditoría inmutable.
- **Volumen:** ~500 pedidos/día (≈ 180 000/año), ~200 productos, ≤ 15 usuarios.
  Lecturas y escrituras de pocas por segundo. Agregados diarios (HU-08) en ≤ 2 s.
- **Escalabilidad:** no se necesita más allá de un nodo.
- **Operación:** contenedor rootless, copias de seguridad sencillas, coste cero.

## Opciones consideradas

| Criterio | PostgreSQL | SQLite | MySQL/MariaDB | MongoDB |
|---|---|---|---|---|
| Modelo relacional + restricciones (CHECK, índices únicos parciales) | Completo | Casi completo | Parcial (sin índices parciales) | No relacional |
| ACID y concurrencia de escritura | Sí, MVCC | Sí, pero un único escritor | Sí | Limitado a documento/transacciones multi-doc |
| Roles y permisos por tabla (auditoría sin DELETE) | Sí | No | Sí | Sí |
| Operación en contenedor | Imagen oficial, conocida | Fichero embebido (sin contenedor) | Imagen oficial | Imagen oficial |
| `LISTEN/NOTIFY` (si un día hay varias instancias) | Sí | No | No | Change streams (réplica) |
| Coste | Libre | Libre | Libre | Libre (SSPL) |

**SQLite** sería suficiente en volumen y es aún más simple de operar, pero no
permite separar permisos por rol de BD (la auditoría "no se puede borrar" de
HU-04/HU-05/HU-07 quedaría solo en la aplicación) y su único escritor obliga a
cuidar los bloqueos con varios dispositivos escribiendo. **PostgreSQL** es la
opción por defecto del equipo y no hay razón concreta para apartarse.

## Decisión

**PostgreSQL** (última versión mayor estable, imagen oficial alpine fijada por
digest), en su propio contenedor con volumen persistente.

- Acceso desde Node con **Kysely** (constructor de SQL tipado, sin ORM) sobre el
  driver `pg`. Consultas siempre parametrizadas.
- Migraciones versionadas con el migrador de Kysely, aplicadas por el contenedor
  efímero `migrate`.
- Dos roles: `app_owner` (DDL) y `app_rw` (DML, **sin `UPDATE/DELETE`** en
  `audit_log`, `payments` salvo columnas de anulación, `payment_orders` salvo
  `voided`, `cash_closings`). Trigger que rechaza `UPDATE/DELETE` en `audit_log`.
- Importes en `integer` (céntimos, ADR-006); fechas en `timestamptz`; fecha de
  negocio = día natural en `Europe/Madrid`, **calculada en la aplicación** con
  el `Clock` inyectado y pasada como parámetro (revisión 2026-11-21, hallazgo
  T-10); la lógica de negocio no usa `now()` de SQL.
- Sin purga: 90 días es la ventana de consulta (HU-08), no de borrado.

## Consecuencias

- (+) Integridad garantizada por la BD (doble cobro imposible por índice único
  parcial, precios válidos por `CHECK`), no solo por el código.
- (+) Agregados de HU-08 con `SUM`/`GROUP BY` sobre pocos miles de filas: ms.
- (−) Un contenedor más que operar (copias de seguridad, actualizaciones):
  responsabilidad de Infrastructure (`pg_dump` diario mínimo).
- (−) La imagen oficial arranca como root por defecto: se ejecutará con
  `--user` ≥ 1000 y el volumen de datos propiedad de ese UID (detalle en
  `docs/infraestructura.md`).

## Revisión 2026-11-21 (tarea 1.3b)

La elección (PostgreSQL + Kysely) **no cambia**. Ajustes del modelo por los
cambios del PO, que refuerzan la necesidad de ACID:
- Preparación con cuatro estados (`served` añadido) y cobro como dimensiones
  separadas; la anulación de un "Cobrar mesa" reabre varios pedidos en una sola
  transacción.
- Tabla `settings` de una fila con `CHECK` de rangos (1–99 mesas, 1–60 min);
  sus cambios se auditan en `audit_log` (HU-09, solo si el humano la aprueba).
- Fecha de negocio desde el `Clock` (T-10), ver `docs/arquitectura.md` §4.

## Revisión 2026-11-23 (tarea 1.3c)

La elección (PostgreSQL + Kysely) **no cambia**. HU-09 queda fuera del MVP
(decisión del humano): **se retira la tabla `settings`** de la revisión
anterior, con su auditoría (`settings.changed`) y el bloqueo `FOR SHARE` al
crear pedidos de mesa. Número de mesas (20) y umbral de retraso (10 min) son
configuración de instalación de solo lectura, leída por `config.ts` de
variables de entorno con rangos 1–99 y 1–60 (supuesto 20,
`docs/arquitectura.md` §4.1). Mantener una tabla de una fila sin ninguna ruta
que la escriba sería YAGNI. `orders.table_number` conserva un `CHECK` de 1–99;
el límite real (≤ `TABLE_COUNT`) lo valida el servicio.
