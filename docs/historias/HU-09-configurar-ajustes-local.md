# HU-09: Configurar los ajustes del local

> **FUERA DEL MVP: descartada por el humano el 2026-11-23 [Cambio 2026-11-23, 1.1e].**
> No se diseña, implementa ni prueba en el MVP, y sus criterios no se validan en
> la Etapa 3. Se aplica el supuesto 20 del README: 20 mesas y aviso de retraso a
> los 10 min, fijados en la instalación; solo cambian reinstalando o mediante
> soporte técnico. El texto se conserva como referencia por si se recupera más
> adelante; sus IDs no se reutilizan.
>
> _Origen (2026-11-21): propuesta del PO a partir del hallazgo del UX Designer
> "Configuración sin historia" (`docs/estado.md`), con prioridad propuesta media
> (Should)._

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

Prioridad: fuera del MVP (descartada por el humano el 2026-11-23). ~~media (Should) — propuesta, pendiente de aprobación humana.~~

Dependencias: HU-01. Ninguna historia del MVP depende de esta: HU-02/CA-F01 y HU-03/CA-F06 usan los valores fijos del supuesto 20.

_Los rangos 1-99 mesas y 1-60 minutos vienen de la propuesta de diseño P-12
(`docs/ux/wireframes/06-gestion-menu.md`) y son supuestos a validar (supuesto 20)._

_Cambios 2026-11-21 (tarea 1.1d: T-01, T-02): IDs estables; condiciones de
medida del plazo de 5 s de CA-F02 (supuesto 12)._

_Cambios 2026-11-23 (tarea 1.1e, decisión del humano): historia fuera del MVP.
P-12 (Ajustes) y la pregunta sobre reconfirmar el PIN del encargado en esta
historia (SEC-007) quedan sin efecto._
