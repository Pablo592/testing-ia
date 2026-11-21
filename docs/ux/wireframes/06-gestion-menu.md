# P-09 Gestión del menú (HU-05) y P-12 Ajustes (HU-09, propuesta)

Solo encargado. Uso típico: TPV u ordenador (1440 px), también tablet. Navegable con teclado.

## Menú de gestión (desde "☰ Gestión" en la barra superior)

```
+--------------------------------+
| Gestión                        |
|  [▦ Cola de barra]             |
|  [☕ Menú]                      |
|  [👤 Personal]                  |
|  [€ Resumen del día]           |   <- 1 toque al resumen de hoy (HU-08)
|  [⚙ Ajustes]                   |   <- solo si se aprueba HU-09; 1 toque
+--------------------------------+
```
Panel lateral con opciones de 56 px de alto, icono + texto. Si el humano no aprueba HU-09, la opción "Ajustes" no existe y los valores se fijan en la instalación (supuesto 20).

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

## P-12 Ajustes [1.2b] — vinculada a HU-09 (PROPUESTA, pendiente de aprobación humana)

Solo encargado (el resto de roles recibe 403). Valores por defecto de una instalación nueva: 20 mesas y 10 min (supuestos 1, 11 y 20).

```
+--------------------------------------------------------------------------+
| Ajustes                                    Marta · Encargado [⎋ Cerrar]  |
+--------------------------------------------------------------------------+
|                                                                          |
|  Número de mesas (obligatorio)                                           |
|  [ 20        ]                                                           |
|  Número entero entre 1 y 99. Las mesas se numeran de 1 a este número.    |  <- ayuda con el rango
|                                                                          |
|  Aviso de pedido retrasado (obligatorio)                                 |
|  [ 10        ] minutos                                                   |
|  Número entero de minutos entre 1 y 60. La cola de barra marca           |
|  RETRASADO los pedidos que esperan más.                                  |
|                                                                          |
|                                         +------------------------------+ |
|                                         |       GUARDAR AJUSTES        | |  <- único primario
|                                         +------------------------------+ |
+--------------------------------------------------------------------------+
```
- Un único formulario con 2 campos, cada uno con etiqueta visible y asociada, `inputmode="numeric"` y teclado numérico en tablet (HU-09 UX).
- No se guarda campo a campo: un solo "Guardar ajustes". Mientras guarda: "Guardando…" deshabilitado.

### Errores (junto a su campo, con el rango; texto exacto de HU-09)
| Caso | Mensaje bajo el campo |
|---|---|
| Mesas fuera de 1-99, no entero o vacío | "⚠ El número de mesas debe ser un número entero entre 1 y 99" |
| Reducir mesas con una mesa > N con pedidos sin cobrar | "⚠ La mesa 23 tiene pedidos sin cobrar: cóbralos o cancélalos antes de reducir el número de mesas" (si son varias, se citan todas: "Las mesas 21 y 23 tienen…") + enlace "Ver pedidos" a P-02 |
| Umbral fuera de 1-60, no entero o vacío | "⚠ El aviso de retraso debe ser un número entero de minutos entre 1 y 60" |

Los errores siguen el patrón de §5.4 del design system: borde de 2 px `danger`, `aria-invalid`, `aria-describedby`, foco al primer campo erróneo y resumen arriba si hay dos. Un campo válido se guarda solo si el otro también lo es (no se guarda a medias), y así lo dice el resumen: "No se ha guardado nada. Corrige 1 campo."

### Estados
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto de los 2 campos |
| Guardando | "Guardando…" deshabilitado |
| Éxito | Toast "Ajustes guardados" (HU-09); los valores nuevos llegan a la toma de pedido en <= 5 s y a barra en <= 60 s |
| Error de servidor | Bloque de error: "No se han podido guardar los ajustes. Reintenta."; los valores escritos se conservan |
| Cambios sin guardar al salir | Diálogo "¿Salir sin guardar los ajustes?" [Seguir editando] [Salir sin guardar] |

Efecto en otras pantallas: P-03 adapta el tamaño de los botones de mesa a N para que se elija en 1 toque sin desplazar (ver `03-toma-pedido.md`). Los pedidos ya enviados conservan su mesa.

## Criterios cubiertos
| Historia | Criterio UX | Cómo |
|---|---|---|
| HU-05 | 1 formulario con <= 4 campos obligatorios | Nombre, categoría, precio, disponible |
| HU-05 | Errores con campo y corrección | Mensajes bajo el campo con el rango |
| HU-05 | Agotado en <= 2 toques desde la toma de pedido | Ver modo agotados en `03-toma-pedido.md` |
| HU-05 (no func.) | Etiquetas asociadas; teclado | Etiqueta visible por campo; reordenar con ↑/↓ |
| HU-05 | Borrar categoría con productos: indica cuántos | Diálogo con el número |
| HU-09 (propuesta) | "Ajustes" en 1 toque desde el menú del encargado | Opción del menú de gestión |
| HU-09 (propuesta) | 1 formulario, 2 campos, botón "Guardar" | P-12 |
| HU-09 (propuesta) | Error junto al campo con el rango válido | Tabla de errores |
| HU-09 (propuesta) | Mensaje "Ajustes guardados" | Toast |
| HU-02 / HU-03 | N de mesas y umbral configurables (HU-09 o supuesto 20) | P-12, o valores fijos si HU-09 no se aprueba |
