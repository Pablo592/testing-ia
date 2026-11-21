# Wireframes — índice y cobertura de criterios UX

Formato: ASCII en Markdown (se lee en cualquier editor). Son wireframes de **estructura y comportamiento**: los colores, tamaños y componentes salen de `../design-system.md`, y los flujos y el recuento de toques, de `../flujos.md`.
Estado: **pendiente de aprobación humana de la dirección visual** antes de programar.

| ID | Archivo | Pantalla | Historias | Prioridad |
|---|---|---|---|---|
| P-01 | `01-login.md` | Inicio de sesión (usuario + PIN) | HU-01, HU-07 (PIN provisional) | Must |
| P-02 | `02-pedidos.md` | Pedidos: inicio de sala | HU-02, HU-03, HU-04 | Must |
| P-03, P-04 | `03-toma-pedido.md` | Mesa/mostrador y toma de pedido (+ modo agotados) | HU-02, HU-05, HU-06 | Must |
| P-05 | `04-cola-barra.md` | Cola de barra/cocina | HU-03, HU-06 | Must |
| P-06, P-07 | `05-cobro.md` | Cobro y ticket (+ anulación) | HU-04 | Must |
| P-09, P-12 | `06-gestion-menu.md` | Menú y ajustes | HU-05, HU-03 (umbral) | Must |
| P-08 | `07-modificar-cancelar.md` | Detalle, modificar y cancelar | HU-06 | Should |
| P-10 | `08-personal.md` | Personal | HU-07 | Should |
| P-11 | `09-resumen-dia.md` | Resumen del día | HU-08 | Could |

## Matriz: criterio UX de la historia -> pantalla

| Historia | Criterio UX (medible) | Pantalla | Cómo se cumple |
|---|---|---|---|
| HU-01 | Inicio de sesión en <= 2 pasos | P-01 | Usuario -> PIN + Entrar |
| HU-01 | Teclado numérico con botones >= 44x44 | P-01, P-08 (autorización) | 72x72 px |
| HU-01 | Error junto al campo, en texto; PIN vaciado | P-01 | Bloque bajo el campo + vaciado |
| HU-01 | Nombre y rol visibles en todas las pantallas | Todas | Barra superior (design-system §5.11) |
| HU-02 | <= 6 toques para 3 productos | P-02 -> P-03 -> P-04 | 1 + 1 + 3 + 1 (ver supuestos en flujos §3) |
| HU-02 | Cambiar de categoría en 1 toque | P-04 | Pestañas siempre visibles |
| HU-02 | Producto >= 44x44 con nombre y precio | P-04 | 120x88 px |
| HU-02 | Confirmación >= 3 s con número; pantalla lista | P-02 | Toast de 5 s, no bloqueante |
| HU-02 | Total en <= 200 ms | P-04 | Cálculo inmediato para mostrarlo (lo verifica Testing) |
| HU-03 | Texto >= 18 px a 1,5 m | P-05 | 36/40 px (ver design-system §2.1) |
| HU-03 | 1 toque, botón >= 60x60 | P-05 | 72 px de alto |
| HU-03 | >= 6 pedidos sin desplazar a 1920x1080 | P-05 | Rejilla 3x2, hasta 5 líneas por pedido |
| HU-03 | Estados por texto y color | P-05, P-02 | Insignia: texto + icono + color + borde |
| HU-04 | Tarjeta en <= 3 toques | P-02/P-08 -> P-06 | Cobrar, Tarjeta, Confirmar |
| HU-04 | Efectivo en <= 4 toques + importe; botones rápidos | P-06 | Exacto/5/10/20/50 |
| HU-04 | Cambio >= 32 px | P-06 | 40 px |
| HU-04 | Total y método visibles antes de confirmar; "Pedido N cobrado" | P-06, P-02 | En la etiqueta del botón; toast |
| HU-05 | 1 formulario con <= 4 campos obligatorios | P-09 | Nombre, categoría, precio, disponible |
| HU-05 | Agotado en <= 2 toques desde la toma | P-04 | Modo agotados |
| HU-05 | Errores con campo y corrección | P-09 | Mensajes con rango |
| HU-06 | Cancelar Pendiente en <= 3 toques | P-08 | Cancelar, motivo, Cancelar pedido |
| HU-06 | Diálogo con número e importe | P-08 | Cabecera del diálogo |
| HU-06 | AÑADIDO / ELIMINADO en texto | P-04, P-05, P-08 | Etiquetas + tachado |
| HU-07 | Alta en 1 formulario de 3 campos | P-10 | Nombre, rol, PIN |
| HU-07 | Lista con nombre, rol y estado en texto | P-10 | Tabla |
| HU-08 | Resumen en 1 toque desde el menú del encargado | Gestión -> P-11 | Opción directa |
| HU-08 | 2 decimales + €; diferencia negativa con "-" y "Falta" | P-11 | Formato + texto |

Estados vacío / cargando / error / éxito: cada wireframe tiene su tabla "Estados".
Ambigüedades encontradas: reportadas en `docs/estado.md` (responsable: product-owner).
