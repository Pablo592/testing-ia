# P-09 Gestión del menú (HU-05) y P-12 Ajustes

Solo encargado. Uso típico: TPV u ordenador (1440 px), también tablet. Navegable con teclado.

## Menú de gestión (desde "☰ Gestión" en la barra superior)

```
+--------------------------------+
| Gestión                        |
|  [▦ Cola de barra]             |
|  [☕ Menú]                      |
|  [👤 Personal]                  |
|  [€ Resumen del día]           |   <- 1 toque al resumen de hoy (HU-08)
|  [⚙ Ajustes]                   |
+--------------------------------+
```
Panel lateral con opciones de 56 px de alto, icono + texto.

## P-09 Menú (1440x900)

```
+-------------------------------------------------------------------------------------------------+
| Menú                                                   Marta · Encargado   [⎋ Cerrar sesión]    |
+-------------------------------------------------------------------------------------------------+
| Categorías            [+ Nueva categoría] | Cafés · 8 productos               [ + NUEVO PRODUCTO ] |  <- único primario
| +---------------------------------------+ | +---------------------------------------------------+ |
| | Cafés (8)         [↑] [↓] [✎] [🗑]   | | | Nombre          Precio   Estado        Acciones    | |
| | Infusiones (5)    [↑] [↓] [✎] [🗑]   | | | Café solo       1,30 €   Disponible   [↑][↓][✎][⋯]| |
| | Zumos (4)         [↑] [↓] [✎] [🗑]   | | | Café con leche  1,60 €   Disponible   [↑][↓][✎][⋯]| |
| | Bollería (6)      [↑] [↓] [✎] [🗑]   | | | Moca            2,50 €   [⚠ AGOTADO]  [↑][↓][✎][⋯]| |
| +---------------------------------------+ | | Descafeinado    1,40 €   [DESACTIVADO][↑][↓][✎][⋯]| |
|   también se reordena arrastrando ⠿;      | +---------------------------------------------------+ |
|   ↑/↓ es la alternativa accesible         |   [⋯] = Marcar agotado / Desactivar / Activar          |
+-------------------------------------------+-----------------------------------------------------+
```
Iconos de acción con texto accesible (`aria-label="Subir Cafés"`) y tooltip; en tablet se muestran con texto ("Subir", "Bajar", "Editar"). Objetivos de 48 px.

## Formulario de producto (diálogo o panel lateral)

```
+--------------------------------------------------+
| Nuevo producto                            [× ]   |
|                                                  |
| Nombre (obligatorio)                             |
| [ Café con leche                         ] 14/40 |
|                                                  |
| Categoría (obligatorio)                          |
| [ Cafés                                ▼ ]       |
|                                                  |
| Precio con IVA incluido (obligatorio)            |
| [ 0                                    € ]       |
| ⚠ El precio debe estar entre 0,01 y 999,99 €     |  <- error: borde danger 2 px +
|   con 2 decimales como máximo.                   |     icono + texto, aria-describedby
|                                                  |
| Disponible (obligatorio)                         |
| (●) Disponible   ( ) Agotado                     |  <- por defecto "Disponible"
|                                                  |
| [Cancelar]                   [ GUARDAR PRODUCTO ]|
+--------------------------------------------------+
```
Errores de validación posibles (en el campo, con la corrección):
- "Escribe un nombre de 1 a 40 caracteres."
- "Ya existe un producto con ese nombre en esta categoría."
- "El precio debe estar entre 0,01 y 999,99 € con 2 decimales como máximo."

Editar precio: en el mismo formulario, ayuda bajo el campo "El nuevo precio se aplicará a los pedidos que se envíen a partir de ahora".

Borrar una categoría con productos activos: diálogo informativo "No se puede borrar Cafés: tiene 8 productos activos. Desactívalos o muévelos a otra categoría." [Entendido].
Desactivar un producto: diálogo "¿Desactivar Moca? Dejará de aparecer en la toma de pedido. Se conserva en el histórico." [Volver] [Desactivar producto].

## Estados
| Estado | Qué se ve |
|---|---|
| Vacío | "Todavía no hay categorías. Crea la primera para empezar a añadir productos." + "Nueva categoría" como primario |
| Categoría vacía | "Cafés no tiene productos." + "Nuevo producto" |
| Cargando | Esqueleto de lista |
| Guardando | "Guardando…" en el botón |
| Error de servidor | Bloque de error en el formulario; los datos escritos no se pierden |
| Éxito | Toast "Producto guardado" / "Orden actualizado" |

## P-12 Ajustes (ligero; necesario para HU-02 y HU-03)

```
| Ajustes                                                  |
| Número de mesas (obligatorio)   [ 20 ]  Entre 1 y 99     |
| Aviso de pedido retrasado       [ 10 ] minutos (1-60)    |
|                                      [ GUARDAR AJUSTES ] |
```
El rango 1-99 de mesas y el de 1-60 min son supuestos de diseño: hay que confirmarlos con el PO.

## Criterios cubiertos
| Historia | Criterio UX | Cómo |
|---|---|---|
| HU-05 | 1 formulario con <= 4 campos obligatorios | Nombre, categoría, precio, disponible |
| HU-05 | Errores con campo y corrección | Mensajes bajo el campo con el rango |
| HU-05 | Agotado en <= 2 toques desde la toma de pedido | Ver modo agotados en `03-toma-pedido.md` |
| HU-05 (no func.) | Etiquetas asociadas; teclado | Etiqueta visible por campo; reordenar con ↑/↓ |
| HU-05 | Borrar categoría con productos: indica cuántos | Diálogo con el número |
| HU-03 | Umbral de retraso configurable | P-12 |
