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
- Límites: el mayor pedido razonable (cientos de líneas × 999,99 €) queda muy
  por debajo de 2³¹ − 1 céntimos (≈ 21 millones de €).

## Consecuencias

- (+) Exactitud garantizada sin librerías; agregados SQL exactos.
- (−) Hay que recordar la convención; se mitiga con el sufijo `Cents`, tipos
  marcados (`type Cents = number & { __brand: 'Cents' }`) y tests de las
  funciones de parseo y formato.
- Si en el futuro se desglosa IVA (pregunta 12 del README) habrá divisiones y
  redondeo: se necesitará un nuevo ADR con la regla de redondeo (por línea o por
  total) que dicte la normativa.
