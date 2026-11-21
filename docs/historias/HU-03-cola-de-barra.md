# HU-03: Ver y preparar los pedidos en barra/cocina

Como **personal de barra/cocina**
quiero **ver en una pantalla la cola de pedidos pendientes en orden de llegada y marcar su avance**
para **preparar los pedidos en el orden correcto y avisar a sala cuando están listos**.

> Estados: el pedido tiene dos estados independientes, uno de **preparación**
> (Pendiente → En preparación → Listo → Servido) y otro de **cobro** (Abierto →
> Cobrado / Cancelado). Esta historia solo cambia el estado de preparación:
> barra lo lleva hasta "Listo" y sala marca "Servido" (supuesto 18). Ver el
> glosario en el [README](README.md#estados-del-pedido).

## Criterios de aceptación

### Funcionales
- Dado un pedido enviado (HU-02), entonces aparece en la cola de barra con: número de pedido, mesa o nombre del cliente, hora de envío, minutos de espera, productos con cantidad y notas.
- Dado un pedido con preparación "Pendiente" o "En preparación", entonces está en la cola de barra tanto si su estado de cobro es "Abierto" como si es "Cobrado" (p. ej. un pedido de mostrador cobrado al momento sigue en la cola hasta que se marca "Listo").
- Dados varios pedidos en la cola, entonces se muestran ordenados por hora de envío, el más antiguo primero.
- Dado un pedido con preparación "Pendiente", cuando barra pulsa "Empezar", entonces pasa a "En preparación".
- Dado un pedido con preparación "En preparación", cuando barra pulsa "Listo", entonces pasa a "Listo" y desaparece de la cola de barra.
- **[Cambio 2026-11-21]** Dado un pedido que barra acaba de cambiar con "Empezar" o "Listo", cuando barra pulsa "Deshacer" en los 30 s siguientes, entonces el pedido vuelve al estado anterior ("Empezar" deshecho: vuelve a "Pendiente"; "Listo" deshecho: vuelve a "En preparación" y a la cola), sin que cambie su estado de cobro. "Deshacer" se aplica solo a la última acción hecha en esa pantalla; a los 30 s deja de estar disponible.
- **[Cambio 2026-11-21]** Dado un pedido "Listo" que sala ya ha marcado "Servido", entonces "Deshacer" de barra ya no está disponible para ese pedido.
- Dado cualquier cambio de estado de preparación (Empezar, Listo, Servido, Deshacer), entonces el estado de cobro del pedido no cambia.
- Dado un pedido que lleva más de 10 minutos en "Pendiente" o "En preparación", entonces se resalta visualmente como retrasado (con icono y texto, no solo color). El umbral de 10 min lo configura el encargado (HU-09, propuesta; hasta que exista, valor fijado en la instalación, supuesto 20).
- Dado un pedido modificado o cancelado (HU-06) mientras está en la cola, entonces la tarjeta se actualiza y muestra la etiqueta "MODIFICADO" o "CANCELADO" hasta que barra la confirme con un toque; un pedido cancelado sale de la cola al confirmar la etiqueta.
- Dado un pedido con preparación "Listo" o "Servido" al que se añaden productos (HU-06), entonces vuelve a la cola con preparación "Pendiente" y las líneas nuevas marcadas "AÑADIDO".
- Dada la pantalla de barra abierta, entonces los pedidos nuevos aparecen sin que nadie tenga que recargar la página.
- Dado un pedido nuevo que llega, entonces suena un aviso sonoro (que se puede desactivar).

#### Aviso y entrega en sala (camarero/cajero y encargado) [Cambio 2026-11-21, supuesto 18]
- Dado un pedido que barra marca "Listo" (con cobro "Abierto" o "Cobrado"), entonces aparece en la sección "Listos para servir" de la pantalla "Pedidos" (HU-02), por delante de los demás pedidos, y los dispositivos de sala muestran el aviso "Pedido N (mesa X o cliente) está listo" sin recargar, en <= 2 s (p95).
- Dado un pedido con preparación "Listo", cuando un camarero/cajero o el encargado pulsa "Servido" en su fila, entonces su preparación pasa a "Servido", sale de "Listos para servir" y su estado de cobro no cambia.
- Dado un pedido "Servido" con cobro "Abierto", entonces sigue en la pantalla "Pedidos" (fuera de "Listos para servir") hasta que se cobra o se cancela.
- Dado un pedido "Servido" con cobro "Cobrado", entonces sale de la pantalla "Pedidos" y solo se ve en "Cobrados hoy" (HU-04).
- Dado un pedido marcado "Servido" por error, cuando quien lo marcó pulsa "Deshacer" en los 30 s siguientes, entonces vuelve a "Listo" y a "Listos para servir".
- Dado un pedido con preparación distinta de "Listo", entonces la acción "Servido" no está disponible y el servidor rechaza cualquier intento de aplicarla.
- Dado un pedido cobrado y "Listo" que nadie marca "Servido", entonces sigue en "Listos para servir" hasta el final del día en que se envió (00:00 `Europe/Madrid`, supuesto 15); a partir de entonces ya no aparece en la pantalla "Pedidos".
- Dado el rol barra, entonces no puede marcar "Servido" (el servidor responde 403).

### UX (medibles)
- **[Cambio 2026-11-21]** Legibilidad a 1,5 m: en la pantalla de barra instalada, la altura de las mayúsculas del nombre de producto, la cantidad, el número de pedido y la mesa o cliente es >= 7 mm (unos 16 minutos de arco a 1,5 m, mínimo de ISO 9241-303). Se verifica midiendo en la pantalla o calculando altura de mayúscula en px x tamaño de píxel en mm, a zoom 100 %. Con el supuesto 21 (pantalla de 24" FHD o mayor) equivale a texto de >= 36 px.
- Cambiar el estado de un pedido requiere 1 toque; botones de al menos 60x60 px (uso con manos ocupadas o mojadas).
- **[Cambio 2026-11-21]** Con la pantalla conectada, se ven al menos 6 pedidos a la vez sin desplazamiento en una pantalla de 1920x1080, cuando cada uno tiene hasta 5 líneas de producto (o hasta 4 líneas y 1 nota). Un pedido con más líneas se muestra completo: nunca se ocultan productos ni notas de un pedido en la cola.
- Los estados se distinguen por texto y por color (no solo por color).
- **[Cambio 2026-11-21]** Marcar "Servido" requiere 1 toque desde la fila del pedido en la pantalla "Pedidos".

### No funcionales
- Rendimiento: un cambio de estado se refleja en los dispositivos de los camareros en <= 2 s (p95).
- Fiabilidad: si la pantalla pierde la conexión, muestra un aviso visible "Sin conexión" en <= 5 s y, al recuperarla, se resincroniza sin intervención y sin perder pedidos.
- Seguridad: el rol barra no puede ver importes ni cobrar.
- Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README), incluido contraste >= 4,5:1.

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
