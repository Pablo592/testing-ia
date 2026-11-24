# HU-05: Gestionar el menú

Como **encargado**
quiero **crear, editar y desactivar productos y categorías del menú, y marcar productos como agotados**
para **que los camareros solo puedan pedir lo que realmente se sirve y al precio correcto**.

> IDs de criterio estables (ver [README](README.md#identificadores-de-los-criterios-cambio-2026-11-21)):
> no se renumeran y un ID retirado no se reutiliza. Referencia completa: `HU-05/CA-F04`.

## Criterios de aceptación

### Funcionales
- **CA-F01** Dado el encargado en "Menú", cuando crea una categoría con nombre (1 a 30 caracteres, único), entonces aparece en la pantalla de toma de pedidos.
- **CA-F02** Dado el encargado, cuando crea un producto con nombre (1 a 40 caracteres), categoría y precio con IVA incluido (mayor que 0 y hasta 999,99 €, máx. 2 decimales), entonces el producto aparece en su categoría en la toma de pedidos.
- **CA-F03** Dado un producto, cuando el encargado cambia su precio, entonces el nuevo precio se aplica a los pedidos enviados a partir de ese momento; los pedidos ya enviados conservan su precio (HU-02).
- **CA-F04** Dado un producto, cuando cualquier camarero o el encargado lo marca como "Agotado", entonces aparece deshabilitado en la toma de pedidos en todos los dispositivos en <= 5 s (p95, condiciones del supuesto 12) **[Cambio 2026-11-21, T-02]**; al marcarlo "Disponible" vuelve a poder pedirse.
- **CA-F05** Dado un producto, cuando el encargado lo desactiva, entonces deja de aparecer en la toma de pedidos pero se conserva en el histórico de pedidos y ventas.
- **CA-F06** Dado un producto con datos inválidos (nombre vacío, precio 0 o negativo, más de 2 decimales), cuando intenta guardarlo, entonces no se guarda y se indica qué campo corregir y el rango válido.
- **CA-F07** Dado un nombre de producto ya existente en la misma categoría, cuando intenta guardarlo, entonces se muestra "Ya existe un producto con ese nombre en esta categoría".
- **CA-F08** Dada una categoría con productos activos, cuando el encargado intenta borrarla, entonces el sistema no lo permite y muestra cuántos productos activos contiene.
- **CA-F09** Dado el encargado, cuando cambia el orden de categorías o productos, entonces el nuevo orden se refleja en la toma de pedidos.

### UX (medibles)
- **CA-U01** Crear un producto requiere 1 formulario con <= 4 campos obligatorios (nombre, categoría, precio, disponible).
- **CA-U02** Marcar un producto como agotado: <= 2 toques desde la pantalla de toma de pedidos.
- **CA-U03** Los mensajes de error indican el campo y cómo corregirlo (p. ej. "El precio debe estar entre 0,01 y 999,99 €").

### No funcionales
- **CA-N01** Seguridad: solo el encargado puede crear, editar, desactivar, reordenar o cambiar precios; marcar "Agotado/Disponible" está permitido también al camarero. Validado en servidor.
- **CA-N02** Auditoría: los cambios de precio quedan registrados con usuario, fecha, precio anterior y nuevo.
- **CA-N03** **[Cambio 2026-11-21, T-06]** Capacidad: con un menú de 200 productos en 20 categorías se siguen cumpliendo **estos criterios, y solo estos (lista cerrada) [Cambio 2026-11-23, T-17]**: HU-02/CA-N01 (en barra en <= 2 s p95), HU-02/CA-U05 (total en <= 200 ms), HU-02/CA-F23 (lista en <= 2 s p95), HU-02/CA-N05 (a 1280x800 y 800x1280 sin desplazamiento horizontal, con las 20 categorías) y CA-F04 de esta historia. Los demás criterios de HU-02 se verifican con el menú que elija Testing.
- **CA-N04** Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README) [Cambio 2026-11-21]; formularios con etiquetas asociadas a cada campo; navegable con teclado (reordenar incluido, sin depender de arrastrar).

Prioridad: alta (Must)

Dependencias: HU-01. (HU-02 depende de esta.)

_Cambios 2026-11-21 (tarea 1.1d: T-01, T-02, T-06): IDs estables; "sin
degradar" sustituido por los criterios concretos de HU-02; percentil del
criterio de agotado._

_Cambios 2026-11-23 (tarea 1.1f: T-17): CA-N03 pasa a lista cerrada y añade
HU-02/CA-N05 (con 20 categorías es donde el tamaño del menú puede romper la
vista de tablet). Sustituye a la lectura amplia I-06 de Testing._
