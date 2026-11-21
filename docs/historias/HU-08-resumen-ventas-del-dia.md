# HU-08: Ver el resumen de ventas del día (cierre de caja)

Como **encargado**
quiero **ver al final de la jornada un resumen de lo cobrado por método de pago y de los productos vendidos**
para **cuadrar la caja y saber qué se vende más**.

> "Día" = día natural en hora de España peninsular (`Europe/Madrid`), de 00:00:00
> a 23:59:59 (supuesto 15 del README). Es el mismo criterio que el número
> correlativo de HU-02.

## Criterios de aceptación

### Funcionales
- Dado el encargado en "Resumen del día", entonces ve para la fecha seleccionada (por defecto, hoy): número de pedidos cobrados, total cobrado, total en efectivo, total en tarjeta, número e importe de pedidos cancelados y número e importe de cobros anulados.
- Dado un cobro, entonces cuenta en el resumen del día en que se registró el cobro, no del día en que se envió el pedido: un pedido enviado a las 23:50 y cobrado a las 00:05 cuenta en el día nuevo.
- Dado un cobro anulado (HU-04), entonces no suma en el total cobrado, ni en el total en efectivo o tarjeta, ni en los productos vendidos de su día, y sí cuenta en "cobros anulados" (número e importe) del día en que se registró el cobro original.
- Dado un pedido cuyo cobro se anuló y que se ha vuelto a cobrar, entonces solo el cobro vigente suma en los totales, en el día en que se registró ese nuevo cobro.
- Dado un pedido cancelado, entonces cuenta en "pedidos cancelados" del día en que se canceló.
- Dado el resumen, entonces ve la lista de productos vendidos (de los cobros vigentes del día) con unidades e importe, ordenada de mayor a menor importe.
- Dados pedidos con cobro "Abierto" al consultar el resumen, entonces se muestra el aviso "Hay N pedidos sin cobrar" con acceso a la lista.
- Dado el encargado, cuando introduce el efectivo contado en caja, entonces el sistema muestra la diferencia respecto al total en efectivo esperado (positiva o negativa) y permite guardar el cierre con esa cifra.
- Dado un día ya cerrado, cuando se consulta, entonces se muestran las cifras del cierre guardado; los cobros de ese día anulados después del cierre aparecen señalados por separado, sin cambiar las cifras guardadas.
- Dado el selector de fecha, cuando el encargado elige cualquier día entre hoy y 90 días atrás (ambos incluidos), entonces puede consultar su resumen.
- Dado el selector de fecha, cuando el encargado intenta elegir un día de hace más de 90 días, entonces no se puede seleccionar. (Los datos de esos días no se borran: 90 días es solo la ventana de consulta; ver supuesto 11 y pregunta 10 del README.)
- Los totales del resumen coinciden al céntimo con la suma de los cobros vigentes (no anulados) registrados (HU-04) para ese día.

### UX (medibles)
- El resumen del día actual se abre en 1 toque desde el menú del encargado.
- Las cifras monetarias se muestran con 2 decimales y símbolo de euro; la diferencia de caja negativa se indica con signo "-" y texto "Falta", no solo con color.

### No funcionales
- Seguridad: solo el encargado puede ver el resumen y guardar el cierre.
- Rendimiento: el resumen de un día con hasta 500 pedidos se genera en <= 2 s.
- Auditoría: el cierre guardado registra usuario, fecha/hora y efectivo contado, y no se puede modificar.
- Conservación: en el MVP no se borra ningún pedido, cobro ni cierre por antigüedad.
- Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README) [Cambio 2026-11-21].

Prioridad: baja (Could)

Dependencias: HU-01, HU-04 (y HU-06 para mostrar cancelaciones).

_Cambios 2026-11-21 (hallazgos del Software Engineer en `docs/estado.md`): se
define "día", cómo cuentan los cobros anulados y que 90 días es una ventana de
consulta, no un borrado (supuestos 11, 15 y 16 del README, a validar)._
