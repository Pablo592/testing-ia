# ADR-006: Representación de importes monetarios

- **Estado:** Propuesto (pendiente de la puerta de la Etapa 1)
- **Fecha:** 2026-11-21
- **Autor:** Software Engineer

## Contexto

Importes en euros, IVA incluido, máx. 2 decimales, precio entre 0,01 y 999,99 €
(HU-05). Totales = Σ precio × cantidad (HU-02); cambio = entregado − total
(HU-04); el resumen diario debe cuadrar al céntimo con los cobros (HU-08).
HU-04 exige explícitamente "sin errores de redondeo de coma flotante". No hay
desglose de IVA ni descuentos en el MVP (no hay divisiones).

## Opciones consideradas

1. **`number` de coma flotante en euros:** `0.1 + 0.2 ≠ 0.3`. Descartada.
2. **Decimal de precisión arbitraria** (`NUMERIC(8,2)` en BD + librería decimal
   en TS): correcto, pero añade una dependencia y conversiones (el driver `pg`
   devuelve `NUMERIC` como cadena) en ambos lados.
3. **Entero en céntimos** (`integer` en BD, `number` entero en TS): exacto para
   sumas, restas y multiplicación por cantidades enteras; sin dependencias.

## Decisión

**Entero de céntimos** en todas las capas: BD (`integer` con `CHECK`), API
(campos con sufijo `Cents`), dominio y cliente.

- Entrada del usuario ("2,50", "2.5") → céntimos parseando la **cadena** (regex
  de hasta 2 decimales), nunca `parseFloat(x) * 100`.
- Salida con una única función `formatCents(cents)` en `packages/shared`
  (formato es-ES: "1.234,50 €"), construida con aritmética entera.
- Validación zod `z.number().int()` en todos los campos `*Cents`.
- Límites (revisión 2026-11-21, SEC-006): sin límites explícitos, una línea
  con `quantity` 32 767 desbordaría `integer`. Se fijan en BD y zod:
  `quantity` 1–99 (`CHECK`), como mucho **100 líneas no eliminadas** por pedido
  (`422 ORDER_TOO_MANY_LINES`) → total por pedido ≤ 99 × 99 999 × 100 =
  989 990 100 < 2³¹ − 1. Un cobro de varios pedidos ("Cobrar mesa") podría
  superar 2³¹ − 1 en teoría: el servicio suma en `number` (exacto hasta 2⁵³) y
  rechaza con `422 PAYMENT_AMOUNT_TOO_HIGH` si supera el máximo de `integer`
  (inalcanzable en la práctica); `tenderedCents` ≤ 10 000 000 (100 000 €).
  Los `SUM()` de HU-08 devuelven `bigint` en PostgreSQL (sin desbordamiento) y
  se convierten a `number` en el repositorio.

## Consecuencias

- (+) Exactitud garantizada sin librerías; agregados SQL exactos.
- (−) Hay que recordar la convención; se mitiga con el sufijo `Cents`, tipos
  marcados (`type Cents = number & { __brand: 'Cents' }`) y tests de las
  funciones de parseo y formato.
- Si en el futuro se desglosa IVA (pregunta 12 del README) habrá divisiones y
  redondeo: se necesitará un nuevo ADR con la regla de redondeo (por línea o por
  total) que dicte la normativa.
