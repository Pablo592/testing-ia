# HU-02: Tomar un pedido en mostrador o en mesa

Como **camarero/cajero**
quiero **registrar un pedido eligiendo productos del menú e indicando si es para mesa o para llevar/mostrador**
para **enviarlo a barra sin errores de transcripción y sin tener que ir a avisar en persona**.

> IDs de criterio estables (ver [README](README.md#identificadores-de-los-criterios-cambio-2026-11-21)):
> no siguen necesariamente el orden de lectura, no se renumeran y un ID
> retirado no se reutiliza. Referencia completa: `HU-02/CA-F07`.

## Criterios de aceptación

### Funcionales
- **CA-F01** Dado un camarero con sesión iniciada, cuando pulsa "Nuevo pedido", entonces debe elegir el tipo: "Mesa" (con número de mesa de 1 a N, donde N es el número de mesas fijado en la instalación, 20 por defecto: supuesto 20 **[Cambio 2026-11-23, 1.1e: HU-09 fuera del MVP]**) o "Mostrador/Para llevar" (con nombre o referencia opcional del cliente, máximo 30 caracteres).
- **CA-F02** Dado un pedido en edición, cuando toca un producto disponible del menú, entonces se añade con cantidad 1; si lo toca de nuevo, la cantidad pasa a 2, y así sucesivamente.
- **CA-F03** Dado un producto en el pedido, cuando pulsa "+" o "-", entonces la cantidad sube o baja en 1; al llegar a 0 la línea se elimina.
- **CA-F04** Dado un producto en el pedido, cuando añade una nota (máximo 100 caracteres, p. ej. "sin azúcar", "leche de avena"), entonces la nota se guarda en esa línea y se muestra en barra.
- **CA-F05** Dado un pedido con al menos una línea, entonces se muestra el total con IVA incluido, calculado como suma de (precio unitario x cantidad), con 2 decimales y símbolo de euro.
- **CA-F06** Dado un producto marcado como "no disponible" (HU-05), entonces aparece deshabilitado y no se puede añadir.
- **CA-F07** Dado un pedido con al menos una línea, cuando pulsa "Enviar a barra", entonces el pedido queda con preparación "Pendiente" y cobro "Abierto" (ver [estados](README.md#estados-del-pedido)), recibe un número correlativo del día y aparece en la cola de barra (HU-03).
- **CA-F12** Dado el primer pedido enviado en un día, entonces recibe el número 1; cada pedido enviado después ese mismo día recibe el número siguiente (2, 3, ...), sin huecos ni repeticiones aunque varios dispositivos envíen a la vez. Los pedidos cancelados conservan su número.
- **CA-F13** Dado que "día" es el día natural en hora de España peninsular (`Europe/Madrid`), cuando se envía un pedido a las 23:59:59, entonces recibe el número siguiente de ese día; cuando se envía el primer pedido a partir de las 00:00:00, entonces recibe el número 1 del día nuevo.
- **CA-F14** Dado un pedido enviado un día, entonces conserva su número y su fecha aunque se modifique o se cobre al día siguiente.
- **CA-F08** Dado un pedido sin líneas, cuando intenta enviarlo, entonces el botón "Enviar a barra" está deshabilitado.
- **CA-F09** Dado un pedido tipo "Mesa", cuando la mesa ya tiene otro pedido con cobro "Abierto", entonces el sistema avisa "La mesa X ya tiene un pedido abierto" y permite añadir el nuevo como pedido independiente de la misma mesa.
- **CA-F10** Dado un pedido enviado, entonces el precio de cada línea queda fijado con el precio vigente en el momento del envío, aunque luego cambie el menú.
- **CA-F11** Dado un pedido en edición no enviado, cuando el camarero pulsa "Descartar" y confirma, entonces el pedido no se guarda ni llega a barra.
- **CA-F15** Dado que se abre la toma de pedido, entonces se muestra seleccionada la primera categoría según el orden del menú (HU-05).

#### Lista "Pedidos" (pantalla principal de sala) [Cambio 2026-11-21]
- **CA-F16** Dado un camarero o encargado que inicia sesión (HU-01), entonces llega a la pantalla "Pedidos", que contiene la acción "Nuevo pedido".
- **CA-F17** Dada la pantalla "Pedidos", entonces muestra todos los pedidos del local (de cualquier camarero, supuesto 19) que cumplen alguna de estas condiciones: (a) cobro "Abierto", con cualquier estado de preparación y de cualquier fecha; (b) cobro "Cobrado" con preparación distinta de "Servido" y enviados ese mismo día (ver HU-03, supuesto 18).
- **CA-F18** Dado un pedido con cobro "Cancelado", o con cobro "Cobrado" y preparación "Servido", entonces no aparece en la pantalla "Pedidos" (los cobrados se consultan en "Cobrados hoy", HU-04).
- **CA-F19** Dado un pedido de la lista, entonces su fila muestra: número de pedido, mesa o nombre del cliente, hora de envío, estado de preparación en texto, la etiqueta "COBRADO" si su cobro es "Cobrado" y el total con IVA incluido.
- **CA-F20** Dada la lista, entonces los pedidos se ordenan por hora de envío, el más antiguo primero (HU-03 añade la sección "Listos para servir" delante).
- **CA-F21** Dada una mesa con 2 o más pedidos en la lista, entonces esos pedidos se muestran agrupados bajo la mesa.
- **CA-F22** Dado un pedido de la lista, cuando el camarero toca su fila, entonces abre el detalle del pedido (desde el que se modifica, cancela o cobra: HU-06 y HU-04).
- **CA-F23** Dado un pedido enviado, modificado, cobrado o cancelado desde otro dispositivo, entonces la lista se actualiza sin recargar la página en <= 2 s (p95, condiciones del supuesto 12).
- **CA-F24** Dado el rol barra, entonces no tiene acceso a la pantalla "Pedidos" (el servidor responde 403, HU-01).

### UX (medibles)
- **CA-U01** Un pedido de 3 productos sin notas, todos de la categoría que se muestra al abrir la toma de pedido, se puede enviar en <= 6 toques desde la pantalla "Pedidos": 1 "Nuevo pedido" + 1 para elegir tipo y mesa a la vez + 3 productos + 1 "Enviar a barra". Cada cambio de categoría necesario suma exactamente 1 toque (p. ej. 3 productos de 2 categorías distintas a la inicial: <= 8 toques). Se cumple en horizontal y en vertical (CA-N05); desplazar no cuenta como toque. [Cambio 2026-11-21]
- **CA-U06** Elegir el tipo de pedido y la mesa (o "Mostrador/Para llevar") requiere un único toque. [Cambio 2026-11-21]
- **CA-U02** Productos agrupados por categoría (HU-05); cambiar de categoría requiere 1 toque.
- **CA-U03** Botones de producto de al menos 44x44 px y con nombre y precio visibles.
- **CA-U04** Tras enviar, se muestra una confirmación con el número de pedido durante al menos 3 segundos y la pantalla vuelve a estado listo para un nuevo pedido.
- **CA-U05** **[Cambio 2026-11-21, T-03]** El total se actualiza en pantalla en <= 200 ms (p95) tras cada cambio (desde el toque hasta que el total nuevo se ve), medido en el dispositivo de referencia del supuesto 23.

### No funcionales
- **CA-N01** **[Cambio 2026-11-21, T-02]** Rendimiento: el pedido aparece en la cola de barra en <= 2 s desde que se pulsa "Enviar" (p95), en las condiciones del supuesto 12 (10 dispositivos conectados a la vez).
- **CA-N02** Fiabilidad: si se pierde la conexión al pulsar "Enviar", el sistema informa "No se ha podido enviar, reintenta" y no se pierde el contenido del pedido en edición; un reintento no crea pedidos duplicados.
- **CA-N03** Seguridad: precios y totales se calculan en el servidor; el cliente no puede imponer un precio.
- **CA-N04** Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README).
- **CA-N05** **[Cambio 2026-11-21, T-07]** Orientación: a 1280x800 y a 800x1280 CSS px (tablet de 10" en horizontal y vertical, supuesto 23), el flujo completo de esta historia se completa sin desplazamiento horizontal; el total del pedido y el botón "Enviar a barra" se ven sin desplazar; el resto de controles se alcanzan como mucho con desplazamiento vertical; y se mantienen los tamaños mínimos de CA-U03.

Prioridad: alta (Must)

Dependencias: HU-01 (sesión y rol), HU-05 (menú con productos y precios).

_Cambios 2026-11-21 (hallazgos del Software Engineer en `docs/estado.md`): se
define "día" para el número correlativo y se expresan los estados con las dos
dimensiones (supuestos 14 y 15 del README, a validar)._

_Cambios 2026-11-21 (hallazgos del UX Designer en `docs/estado.md`): se define
la lista "Pedidos" de sala (supuestos 18 y 19); se concreta la condición de los
6 toques (categoría inicial, tipo y mesa en 1 toque); accesibilidad unificada en
WCAG 2.2 AA; el número de mesas N se configura en HU-09 (propuesta) o, hasta que
exista, se fija en la instalación (supuesto 20)._

_Cambios 2026-11-21 (tarea 1.1d: T-01, T-02, T-03, T-07): IDs estables;
condiciones de medida (supuesto 12) y dispositivo de referencia (supuesto 23);
"uso posible en tablet de 10"" sustituido por CA-N05 (la accesibilidad queda
sola en CA-N04)._

_Cambios 2026-11-23 (tarea 1.1e, decisión del humano): HU-09 queda fuera del
MVP; en CA-F01 el número de mesas N es el fijado en la instalación (supuesto 20,
20 mesas). Las condiciones de medida del supuesto 12 son vinculantes solo en
TESTING._
