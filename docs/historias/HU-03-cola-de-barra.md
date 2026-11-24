# HU-03: Ver y preparar los pedidos en barra/cocina

Como **personal de barra/cocina**
quiero **ver en una pantalla la cola de pedidos pendientes en orden de llegada y marcar su avance**
para **preparar los pedidos en el orden correcto y avisar a sala cuando están listos**.

> Estados: el pedido tiene dos estados independientes, uno de **preparación**
> (Pendiente → En preparación → Listo → Servido) y otro de **cobro** (Abierto →
> Cobrado / Cancelado). Esta historia solo cambia el estado de preparación:
> barra lo lleva hasta "Listo" y sala marca "Servido" (supuesto 18). Ver el
> glosario en el [README](README.md#estados-del-pedido).

> IDs de criterio estables (ver [README](README.md#identificadores-de-los-criterios-cambio-2026-11-21)):
> no siguen necesariamente el orden de lectura, no se renumeran y un ID
> retirado no se reutiliza. Referencia completa: `HU-03/CA-F06`.

## Criterios de aceptación

### Funcionales
- **CA-F01** Dado un pedido enviado (HU-02), entonces aparece en la cola de barra con: número de pedido, mesa o nombre del cliente, hora de envío, minutos de espera (contados desde su hora de entrada en la cola, supuesto 24) **[Cambio 2026-11-21]**, productos con cantidad y notas.
- **CA-F23** **[Cambio 2026-11-21, supuesto 24]** Dado un pedido que vuelve a la cola desde "Listo" o "Servido" porque se le añaden productos (HU-06), entonces su tarjeta conserva el número de pedido y la hora de envío original y muestra además "AÑADIDO hh:mm" con la hora del añadido; su hora de entrada en la cola pasa a ser la del añadido.
- **CA-F24** **[Cambio 2026-11-21, supuesto 24]** Dado un pedido que **sigue** en la cola ("Pendiente" o "En preparación") cuando se le añaden o quitan productos, entonces su hora de entrada en la cola no cambia: conserva su posición y su cuenta de espera.
- **CA-F10** Dado un pedido con preparación "Pendiente" o "En preparación", entonces está en la cola de barra tanto si su estado de cobro es "Abierto" como si es "Cobrado" (p. ej. un pedido de mostrador cobrado al momento sigue en la cola hasta que se marca "Listo").
- **CA-F02** **[Cambio 2026-11-21, supuesto 24]** Dados varios pedidos en la cola, entonces se muestran ordenados por hora de entrada en la cola (la de envío, o la del añadido si el pedido volvió a la cola desde "Listo" o "Servido"), el más antiguo primero. Ejemplo: un pedido enviado a las 10:00, servido y ampliado a las 10:25 va detrás de uno enviado a las 10:20.
- **CA-F03** Dado un pedido con preparación "Pendiente", cuando barra pulsa "Empezar", entonces pasa a "En preparación".
- **CA-F04** Dado un pedido con preparación "En preparación", cuando barra pulsa "Listo", entonces pasa a "Listo" y desaparece de la cola de barra.
- **CA-F05** **[Cambio 2026-11-21]** Dado un pedido que barra acaba de cambiar con "Empezar" o "Listo", cuando barra pulsa "Deshacer" en los 30 s siguientes, entonces el pedido vuelve al estado anterior ("Empezar" deshecho: vuelve a "Pendiente"; "Listo" deshecho: vuelve a "En preparación" y a la cola), sin que cambie su estado de cobro. "Deshacer" se aplica solo a la última acción hecha en esa pantalla; a los 30 s deja de estar disponible.
- **CA-F11** **[Cambio 2026-11-21]** Dado un pedido "Listo" que sala ya ha marcado "Servido", entonces "Deshacer" de barra ya no está disponible para ese pedido.
- **CA-F12** Dado cualquier cambio de estado de preparación (Empezar, Listo, Servido, Deshacer), entonces el estado de cobro del pedido no cambia.
- **CA-F06** **[Cambio 2026-11-21, T-04]** Dado un pedido con preparación "Pendiente" o "En preparación" para el que han pasado N minutos o más desde su hora de entrada en la cola (supuesto 24: la de envío, o la del añadido si volvió a la cola desde "Listo" o "Servido"), entonces se resalta visualmente como retrasado, con icono y texto (no solo color), como máximo 60 s después de cumplirse los N minutos. Pasar de "Pendiente" a "En preparación" no reinicia la cuenta (p. ej. con N = 10, un pedido de 9 min en "Pendiente" y 2 min en "En preparación" está retrasado). N = 10, valor fijado en la instalación (supuesto 20) **[Cambio 2026-11-23, 1.1e: HU-09 fuera del MVP]**.
- **CA-F07** Dado un pedido modificado o cancelado (HU-06) mientras está en la cola, entonces la tarjeta se actualiza y muestra la etiqueta "MODIFICADO" o "CANCELADO" hasta que barra la confirme con un toque; un pedido cancelado sale de la cola al confirmar la etiqueta.
- **CA-F13** Dado un pedido con preparación "Listo" o "Servido" al que se añaden productos (HU-06), entonces vuelve a la cola con preparación "Pendiente" y las líneas nuevas marcadas "AÑADIDO".
- **CA-F08** Dada la pantalla de barra abierta, entonces los pedidos nuevos aparecen sin que nadie tenga que recargar la página.
- **CA-F09** Dado un pedido nuevo que llega, entonces suena un aviso sonoro (que se puede desactivar).
- **CA-F14** **[Cambio 2026-11-21, T-05]** Dada la cola abierta con el sonido activado, cuando el navegador impide reproducir el aviso (p. ej. tras recargar la página sin tocarla), entonces la cola muestra, en texto y sin tapar ningún pedido, "Sonido bloqueado" con un botón "Activar sonido" de al menos 60x60 px; el aviso se muestra en cuanto se detecta el bloqueo (al abrir la cola o al fallar un aviso) y sigue visible hasta que se reactiva. Un toque en "Activar sonido" lo quita y el siguiente pedido nuevo suena. Si barra ha desactivado el sonido a propósito, este aviso no se muestra.

#### Aviso y entrega en sala (camarero/cajero y encargado) [Cambio 2026-11-21, supuesto 18]
- **CA-F15** Dado un pedido que barra marca "Listo" (con cobro "Abierto" o "Cobrado"), entonces aparece en la sección "Listos para servir" de la pantalla "Pedidos" (HU-02), por delante de los demás pedidos, y los dispositivos de sala muestran el aviso "Pedido N (mesa X o cliente) está listo" sin recargar, en <= 2 s (p95, condiciones del supuesto 12).
- **CA-F16** Dado un pedido con preparación "Listo", cuando un camarero/cajero o el encargado pulsa "Servido" en su fila, entonces su preparación pasa a "Servido", sale de "Listos para servir" y su estado de cobro no cambia.
- **CA-F17** Dado un pedido "Servido" con cobro "Abierto", entonces sigue en la pantalla "Pedidos" (fuera de "Listos para servir") hasta que se cobra o se cancela.
- **CA-F18** Dado un pedido "Servido" con cobro "Cobrado", entonces sale de la pantalla "Pedidos" y solo se ve en "Cobrados hoy" (HU-04).
- **CA-F19** Dado un pedido marcado "Servido" por error, cuando quien lo marcó pulsa "Deshacer" en los 30 s siguientes, entonces vuelve a "Listo" y a "Listos para servir".
- **CA-F20** Dado un pedido con preparación distinta de "Listo", entonces la acción "Servido" no está disponible y el servidor rechaza cualquier intento de aplicarla.
- **CA-F21** Dado un pedido cobrado y "Listo" que nadie marca "Servido", entonces sigue en "Listos para servir" hasta el final del día en que se envió (00:00 `Europe/Madrid`, supuesto 15); a partir de entonces ya no aparece en la pantalla "Pedidos".
- **CA-F22** Dado el rol barra, entonces no puede marcar "Servido" (el servidor responde 403).

### UX (medibles)
- **CA-U01** **[Cambio 2026-11-21]** Legibilidad a 1,5 m: en la pantalla de barra instalada, la altura de las mayúsculas del nombre de producto, la cantidad, el número de pedido y la mesa o cliente es >= 7 mm (unos 16 minutos de arco a 1,5 m, mínimo de ISO 9241-303). Se verifica midiendo en la pantalla o calculando altura de mayúscula en px x tamaño de píxel en mm, a zoom 100 %. Con el supuesto 21 (pantalla de 24" FHD o mayor) equivale a texto de >= 36 px.
- **CA-U02** Cambiar el estado de un pedido requiere 1 toque; botones de al menos 60x60 px (uso con manos ocupadas o mojadas).
- **CA-U03** **[Cambio 2026-11-21]** Con la pantalla conectada, se ven al menos 6 pedidos a la vez sin desplazamiento en una pantalla de 1920x1080, cuando cada uno tiene hasta 5 líneas de producto (o hasta 4 líneas y 1 nota). Un pedido con más líneas se muestra completo: nunca se ocultan productos ni notas de un pedido en la cola.
- **CA-U04** Los estados se distinguen por texto y por color (no solo por color).
- **CA-U05** **[Cambio 2026-11-21]** Marcar "Servido" requiere 1 toque desde la fila del pedido en la pantalla "Pedidos".

### No funcionales
- **CA-N01** Rendimiento: un cambio de estado se refleja en los dispositivos de los camareros en <= 2 s (p95, condiciones del supuesto 12) **[Cambio 2026-11-21, T-02]**.
- **CA-N02** Fiabilidad: si la pantalla pierde la conexión, muestra un aviso visible "Sin conexión" en <= 5 s y, al recuperarla, se resincroniza sin intervención y sin perder pedidos.
- **CA-N03** Seguridad: el rol barra no puede ver importes ni cobrar.
- **CA-N04** Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README), incluido contraste >= 4,5:1.
- **CA-N05** **[Cambio 2026-11-21, T-05]** Pantalla encendida: con la cola abierta y visible, la pantalla de barra no se apaga ni se bloquea por inactividad del dispositivo durante al menos 30 minutos seguidos sin tocarla. Se verifica en el dispositivo de barra instalado (Etapa 3 con el hardware de referencia y Etapa 4).

Prioridad: alta (Must)

Dependencias: HU-01, HU-02.

_Cambios 2026-11-21 (hallazgo del Software Engineer en `docs/estado.md`): se
separan estado de preparación y de cobro (supuesto 14 del README, a validar)._

_Cambios 2026-11-21 (hallazgos del UX Designer en `docs/estado.md`): legibilidad
expresada en altura física (7 mm) y supuesto 21 de pantalla de 24"; límite de
líneas en el criterio de 6 pedidos; "Deshacer" también para "Empezar"; nuevo
estado de preparación "Servido" marcado por sala (supuesto 18, que cierra de
forma provisional la pregunta 13); accesibilidad en WCAG 2.2 AA; umbral de
retraso configurable en HU-09 (propuesta) o fijado en la instalación
(supuesto 20)._

_Cambios 2026-11-21 (tarea 1.1d: T-01, T-02, T-04, T-05): IDs estables; inicio
del cómputo de "retrasado" (supuesto 24); sonido bloqueado por el navegador
(CA-F14) y pantalla que no se apaga (CA-N05); condiciones de medida
(supuesto 12); orden y espera por hora de entrada en la cola cuando un pedido
vuelve desde "Listo"/"Servido" (CA-F02, CA-F23, CA-F24; hallazgo del Software
Engineer, `docs/arquitectura.md` §4.2)._

_Cambios 2026-11-23 (tarea 1.1e, decisión del humano): HU-09 queda fuera del
MVP; en CA-F06 el umbral N = 10 min es fijo en la instalación (supuesto 20).
Supuesto 18 ("Servido") confirmado por el humano. Las condiciones de medida del
supuesto 12 son vinculantes solo en TESTING._
