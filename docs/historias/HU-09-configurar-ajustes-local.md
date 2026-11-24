# HU-09: Configurar los ajustes del local

> **PROPUESTA PARA EL HUMANO [Cambio 2026-11-21]:** historia nueva, no incluida
> todavía en el MVP aprobado. Nace del hallazgo del UX Designer "Configuración
> sin historia" (`docs/estado.md`). Prioridad propuesta: **media (Should)**. Si
> no se aprueba, el número de mesas y el umbral de retraso se fijan en la
> instalación (supuesto 20 del README) y solo se cambian reinstalando o
> mediante soporte técnico.

Como **encargado**
quiero **indicar cuántas mesas tiene el local y a partir de cuántos minutos un pedido se considera retrasado**
para **que la toma de pedidos muestre solo mis mesas reales y que barra vea como retrasados los pedidos que de verdad lo están**.

> IDs de criterio estables (ver [README](README.md#identificadores-de-los-criterios-cambio-2026-11-21)):
> no se renumeran y un ID retirado no se reutiliza. Referencia completa: `HU-09/CA-F02`.

## Criterios de aceptación

### Funcionales
- **CA-F01** Dado el encargado en "Ajustes", entonces ve el número de mesas y el umbral de pedido retrasado (en minutos) con sus valores actuales.
- **CA-F02** Dado un número de mesas entero entre 1 y 99 (ambos incluidos), cuando el encargado lo guarda, entonces la elección de mesa de la toma de pedido (HU-02/CA-F01) muestra exactamente las mesas 1 a N en todos los dispositivos, sin recargar, en <= 5 s (p95, condiciones del supuesto 12) **[Cambio 2026-11-21, T-02]**.
- **CA-F03** Dado un número de mesas fuera de 1-99, no entero o vacío, cuando intenta guardarlo, entonces no se guarda y se muestra "El número de mesas debe ser un número entero entre 1 y 99".
- **CA-F04** Dado un número de mesas N nuevo menor que el anterior, cuando alguna mesa mayor que N tiene un pedido con cobro "Abierto", entonces no se guarda y se muestra "La mesa X tiene pedidos sin cobrar: cóbralos o cancélalos antes de reducir el número de mesas".
- **CA-F05** Dado un umbral de retraso entero entre 1 y 60 minutos (ambos incluidos), cuando el encargado lo guarda, entonces la cola de barra (HU-03/CA-F06) aplica el nuevo umbral a todos los pedidos de la cola, sin recargar, en <= 60 s.
- **CA-F06** Dado un umbral fuera de 1-60, no entero o vacío, cuando intenta guardarlo, entonces no se guarda y se muestra "El aviso de retraso debe ser un número entero de minutos entre 1 y 60".
- **CA-F07** Dada una instalación nueva, entonces los valores iniciales son 20 mesas y 10 minutos (supuestos 1, 11 y 20).
- **CA-F08** Dados pedidos ya enviados a una mesa, entonces cambiar el número de mesas no modifica la mesa de esos pedidos.

### UX (medibles)
- **CA-U01** "Ajustes" se abre en 1 toque desde el menú del encargado.
- **CA-U02** Un único formulario con 2 campos y un botón "Guardar"; cada mensaje de error se muestra junto a su campo e indica el rango válido.
- **CA-U03** Tras guardar, mensaje "Ajustes guardados".

### No funcionales
- **CA-N01** Seguridad: solo el encargado puede ver y cambiar los ajustes (validado en el servidor; el resto de roles recibe 403).
- **CA-N02** Auditoría: cada cambio registra usuario, fecha/hora, valor anterior y valor nuevo.
- **CA-N03** Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README).

Prioridad: media (Should) — propuesta, pendiente de aprobación humana.

Dependencias: HU-01. (HU-02 y HU-03 usan sus valores; hasta que exista, se usan los valores de instalación del supuesto 20.)

_Los rangos 1-99 mesas y 1-60 minutos vienen de la propuesta de diseño P-12
(`docs/ux/wireframes/06-gestion-menu.md`) y son supuestos a validar (supuesto 20)._

_Cambios 2026-11-21 (tarea 1.1d: T-01, T-02): IDs estables; condiciones de
medida del plazo de 5 s de CA-F02 (supuesto 12)._
