# HU-05: Gestionar el menú

Como **encargado**
quiero **crear, editar y desactivar productos y categorías del menú, y marcar productos como agotados**
para **que los camareros solo puedan pedir lo que realmente se sirve y al precio correcto**.

## Criterios de aceptación

### Funcionales
- Dado el encargado en "Menú", cuando crea una categoría con nombre (1 a 30 caracteres, único), entonces aparece en la pantalla de toma de pedidos.
- Dado el encargado, cuando crea un producto con nombre (1 a 40 caracteres), categoría y precio con IVA incluido (mayor que 0 y hasta 999,99 €, máx. 2 decimales), entonces el producto aparece en su categoría en la toma de pedidos.
- Dado un producto, cuando el encargado cambia su precio, entonces el nuevo precio se aplica a los pedidos enviados a partir de ese momento; los pedidos ya enviados conservan su precio (HU-02).
- Dado un producto, cuando cualquier camarero o el encargado lo marca como "Agotado", entonces aparece deshabilitado en la toma de pedidos en todos los dispositivos en <= 5 s; al marcarlo "Disponible" vuelve a poder pedirse.
- Dado un producto, cuando el encargado lo desactiva, entonces deja de aparecer en la toma de pedidos pero se conserva en el histórico de pedidos y ventas.
- Dado un producto con datos inválidos (nombre vacío, precio 0 o negativo, más de 2 decimales), cuando intenta guardarlo, entonces no se guarda y se indica qué campo corregir y el rango válido.
- Dado un nombre de producto ya existente en la misma categoría, cuando intenta guardarlo, entonces se muestra "Ya existe un producto con ese nombre en esta categoría".
- Dada una categoría con productos activos, cuando el encargado intenta borrarla, entonces el sistema no lo permite y muestra cuántos productos activos contiene.
- Dado el encargado, cuando cambia el orden de categorías o productos, entonces el nuevo orden se refleja en la toma de pedidos.

### UX (medibles)
- Crear un producto requiere 1 formulario con <= 4 campos obligatorios (nombre, categoría, precio, disponible).
- Marcar un producto como agotado: <= 2 toques desde la pantalla de toma de pedidos.
- Los mensajes de error indican el campo y cómo corregirlo (p. ej. "El precio debe estar entre 0,01 y 999,99 €").

### No funcionales
- Seguridad: solo el encargado puede crear, editar, desactivar, reordenar o cambiar precios; marcar "Agotado/Disponible" está permitido también al camarero. Validado en servidor.
- Auditoría: los cambios de precio quedan registrados con usuario, fecha, precio anterior y nuevo.
- Capacidad: soporta al menos 200 productos y 20 categorías sin degradar los tiempos de HU-02.
- Accesibilidad: cumple WCAG 2.2 nivel AA (criterio común del README) [Cambio 2026-11-21]; formularios con etiquetas asociadas a cada campo; navegable con teclado (reordenar incluido, sin depender de arrastrar).

Prioridad: alta (Must)

Dependencias: HU-01. (HU-02 depende de esta.)
