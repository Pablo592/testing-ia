# HU-08: Ver el resumen de ventas del día (cierre de caja)

Como **encargado**
quiero **ver al final de la jornada un resumen de lo cobrado por método de pago y de los productos vendidos**
para **cuadrar la caja y saber qué se vende más**.

> "Día" = día natural en hora de España peninsular (`Europe/Madrid`), de 00:00:00
> a 23:59:59 (supuesto 15 del README). Es el mismo criterio que el número
> correlativo de HU-02.

> IDs de criterio estables (ver [README](README.md#identificadores-de-los-criterios-cambio-2026-11-21)):
> no siguen necesariamente el orden de lectura, no se renumeran y un ID
> retirado no se reutiliza. Referencia completa: `HU-08/CA-F01`.

## Criterios de aceptación

### Funcionales
- **CA-F01** Dado el encargado en "Resumen del día", entonces ve para la fecha seleccionada (por defecto, hoy): número de pedidos cobrados, total cobrado, total en efectivo, total en tarjeta, número e importe de pedidos cancelados y número e importe de cobros anulados.
- **CA-F08** Dado un cobro, entonces cuenta en el resumen del día en que se registró el cobro, no del día en que se envió el pedido: un pedido enviado a las 23:50 y cobrado a las 00:05 cuenta en el día nuevo.
- **CA-F09** Dado un cobro anulado (HU-04), entonces no suma en el total cobrado, ni en el total en efectivo o tarjeta, ni en los productos vendidos de su día, y sí cuenta en "cobros anulados" (número e importe) del día en que se registró el cobro original.
- **CA-F10** Dado un pedido cuyo cobro se anuló y que se ha vuelto a cobrar, entonces solo el cobro vigente suma en los totales, en el día en que se registró ese nuevo cobro.
- **CA-F11** Dado un pedido cancelado, entonces cuenta en "pedidos cancelados" del día en que se canceló.
- **CA-F13** **[Cambio 2026-11-21, SEC-008]** Dado el resumen del día, entonces muestra el número e importe de pedidos cancelados y de cobros anulados agrupados por usuario que los realizó (y, si lo hubo, encargado que autorizó): una fila por cada combinación de usuario que canceló o anuló y encargado que autorizó la cancelación ("sin autorización" si no la necesitó), con los nombres de los usuarios en texto. **[Cambio 2026-11-23, 1.7d]** En las filas de cobros anulados, la columna del encargado que autorizó muestra "No aplica (encargado)", porque la anulación solo la hace un encargado y nadie más la autoriza (HU-04/CA-N03, CA-F23). En un día ya cerrado (CA-F05), el desglose incluye las mismas cancelaciones y anulaciones que las cifras del cierre guardado; los cobros anulados y los pedidos cancelados después del cierre van en la sección aparte de CA-F05, con el usuario que los hizo (y, en las cancelaciones, el encargado que autorizó), y no suman en el desglose.
- **CA-F14** **[Cambio 2026-11-21, SEC-008]** Dado el desglose por usuario de CA-F13, entonces la suma de sus filas coincide en número e importe con los totales de pedidos cancelados y de cobros anulados de CA-F01 para ese día.
- **CA-F02** Dado el resumen, entonces ve la lista de productos vendidos (de los cobros vigentes del día) con unidades e importe, ordenada de mayor a menor importe.
- **CA-F03** Dados pedidos con cobro "Abierto" al consultar el resumen, entonces se muestra el aviso "Hay N pedidos sin cobrar" con acceso a la lista.
- **CA-F04** Dado el encargado, cuando introduce el efectivo contado en caja, entonces el sistema muestra la diferencia respecto al total en efectivo esperado (positiva o negativa) y permite guardar el cierre con esa cifra.
- **CA-F05** Dado un día ya cerrado, cuando se consulta, entonces se muestran las cifras del cierre guardado; los cobros de ese día anulados después del cierre aparecen señalados por separado, sin cambiar las cifras guardadas. **[Cambio 2026-11-23, 1.7d, decisión del orquestador con el criterio del humano "menor carga"]** Lo mismo se aplica a los pedidos de ese día cancelados después del cierre: aparecen en esa sección aparte, con el usuario que los canceló y el encargado que autorizó ("sin autorización" si no la necesitó), sin cambiar las cifras guardadas.
- **CA-F06** Dado el selector de fecha, cuando el encargado elige cualquier día entre hoy y 90 días atrás (ambos incluidos), entonces puede consultar su resumen.
- **CA-F12** Dado el selector de fecha, cuando el encargado intenta elegir un día de hace más de 90 días, entonces no se puede seleccionar. (Los datos de esos días no se borran: 90 días es solo la ventana de consulta; ver supuesto 11 y pregunta 10 del README.)
- **CA-F07** Los totales del resumen coinciden al céntimo con la suma de los cobros vigentes (no anulados) registrados (HU-04) para ese día.

### UX (medibles)
- **CA-U01** El resumen del día actual se abre en 1 toque desde el menú del encargado.
- **CA-U02** Las cifras monetarias se muestran con 2 decimales y símbolo de euro; la diferencia de caja negativa se indica con signo "-" y texto "Falta", no solo con color.

### No funcionales
- **CA-N01** Seguridad: solo el encargado puede ver el resumen y guardar el cierre.
- **CA-N02** **[Cambio 2026-11-21, T-09]** Rendimiento: para un día con hasta 500 pedidos, la pantalla del resumen muestra todas sus cifras (incluido el desglose por usuario de CA-F13) en <= 2 s (p95) desde el toque que la abre o cambia la fecha, en las condiciones del supuesto 12.
- **CA-N03** Auditoría: el cierre guardado registra usuario, fecha/hora y efectivo contado, y no se puede modificar.
- **CA-N04** Conservación: en el MVP no se borra ningún pedido, cobro ni cierre por antigüedad.
- **CA-N05** Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README) [Cambio 2026-11-21].

Prioridad: baja (Could)

Dependencias: HU-01, HU-04 (y HU-06 para mostrar cancelaciones).

_Cambios 2026-11-21 (hallazgos del Software Engineer en `docs/estado.md`): se
define "día", cómo cuentan los cobros anulados y que 90 días es una ventana de
consulta, no un borrado (supuestos 11, 15 y 16 del README, a validar)._

_Cambios 2026-11-21 (tarea 1.1d: T-01, T-09, SEC-008): IDs estables;
cancelaciones y anulaciones por usuario; percentil y punto de medida del
rendimiento._

_Cambios 2026-11-23 (tarea 1.7d, interpretaciones de UX): CA-F13 precisa
"No aplica (encargado)" en las anulaciones y el desglose de un día cerrado.
CA-F05 amplía la sección aparte a los pedidos cancelados después del cierre
(decisión del orquestador del 2026-11-23 con el criterio del humano "menor
carga"). Mismos IDs, sin IDs nuevos ni retirados._
