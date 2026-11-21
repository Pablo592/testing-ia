# P-11 Resumen del día (HU-08, Could) — ligero

```
+---------------------------------------------------------------------------------+
| Resumen del día                               Marta · Encargado  [⎋ Cerrar sesión] |
+---------------------------------------------------------------------------------+
| Fecha: [ Hoy, 21/11/2026 ▼ ]  (últimos 90 días)                                 |
| ⚠ Hay 3 pedidos sin cobrar · [Ver pedidos]                                      |
|                                                                                 |
| +--------------+ +--------------+ +--------------+ +--------------+             |
| | Pedidos      | | Total        | | Efectivo     | | Tarjeta      |             |
| | cobrados     | | cobrado      | |              | |              |             |
| |   142        | |  1.284,50 €  | |   612,30 €   | |   672,20 €   |             |
| +--------------+ +--------------+ +--------------+ +--------------+             |
| Cancelados: 4 (18,60 €) · Cobros anulados: 1 (7,40 €)                           |
|                                                                                 |
| Cierre de caja                                                                  |
| Efectivo contado (obligatorio)  [ 609,80 € ]                                    |
| Diferencia: −2,50 € · Falta                <- signo + texto, no solo color       |
|                                                       [ GUARDAR CIERRE ]        |
|                                                                                 |
| Productos vendidos (de mayor a menor importe)                                   |
| Producto           Unidades   Importe                                           |
| Café con leche        210     336,00 €                                          |
| ...                                                                             |
+---------------------------------------------------------------------------------+
```
Diferencia: "Falta 2,50 €" (−), "Sobra 1,00 €" (+) o "Cuadra (0,00 €)". Guardar cierre: diálogo "El cierre no se podrá modificar" [Volver] [Guardar cierre].
Día cerrado: el campo pasa a solo lectura ("Cerrado por Marta a las 23:10") y los cobros anulados después del cierre se muestran en una sección aparte "Anulados tras el cierre".
Estados: vacío ("No hubo ventas este día"), cargando (esqueleto de cifras), error + reintentar.

| Historia | Criterio UX | Cómo |
|---|---|---|
| HU-08 | 1 toque desde el menú del encargado | "Resumen del día" en Gestión, abre hoy |
| HU-08 | 2 decimales + €; negativo con "-" y "Falta" | Formato es-ES y texto de diferencia |
