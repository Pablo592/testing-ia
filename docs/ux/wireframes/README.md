# Wireframes — índice y cobertura de criterios UX

Formato: ASCII en Markdown (se lee en cualquier editor). Son wireframes de **estructura y comportamiento**: los colores, tamaños y componentes salen de `../design-system.md`, y los flujos y el recuento de toques, de `../flujos.md`.
Estado: **pendiente de aprobación humana de la dirección visual** antes de programar.
Última actualización: tarea 1.2b (2026-11-21), con las historias HU-01..HU-09 tras la ronda 1.1c del PO y la política de PIN de Cybersecurity (`docs/seguridad.md` §6.1, §6.3, SEC-007).

| ID | Archivo | Pantalla | Historias | Prioridad |
|---|---|---|---|---|
| P-01 | `01-login.md` | Inicio de sesión (usuario + PIN, bloqueos, reglas de PIN) | HU-01, HU-07 (PIN provisional) | Must |
| P-02 | `02-pedidos.md` | Pedidos: inicio de sala ("Pedidos activos" y "Cobrados hoy") | HU-02, HU-03, HU-04 | Must |
| P-03, P-04 | `03-toma-pedido.md` | Mesa/mostrador y toma de pedido (+ modo agotados) | HU-02, HU-05, HU-06, HU-09 (N mesas) | Must |
| P-05 | `04-cola-barra.md` | Cola de barra/cocina | HU-03, HU-06 | Must |
| P-06, P-07 | `05-cobro.md` | Cobro y ticket (+ anulación con PIN) | HU-04 | Must |
| P-09 | `06-gestion-menu.md` | Menú | HU-05 | Must |
| P-12 | `06-gestion-menu.md` (§ P-12) | Ajustes del local | **HU-09 (propuesta, no aprobada)** | Should (propuesta) |
| P-08 | `07-modificar-cancelar.md` | Detalle, modificar y cancelar (+ autorización del encargado) | HU-06 | Should |
| P-10 | `08-personal.md` | Personal (+ desbloqueo, reconfirmación) | HU-07 | Should |
| P-11 | `09-resumen-dia.md` | Resumen del día | HU-08 | Could |

## Matriz: criterio UX de la historia -> pantalla

Los marcados [1.2b] son nuevos o han cambiado en esta ronda.

| Historia | Criterio UX (medible) | Pantalla | Cómo se cumple |
|---|---|---|---|
| Todas | WCAG 2.2 AA (criterio común del README) [1.2b] | Todas | Contrastes verificados (design-system §1.3), objetivos >= 48 px (2.5.8), foco no tapado por toasts ni pies fijos (2.4.11), alternativa a arrastrar con Subir/Bajar (2.5.7) |
| HU-01 | Inicio de sesión en <= 2 pasos | P-01 | Usuario -> PIN + Entrar |
| HU-01 | Teclado numérico con botones >= 44x44 | P-01, P-07, P-08, P-10 | 72x72 px |
| HU-01 | Error junto al campo, en texto; PIN vaciado | P-01 | Bloque bajo el campo + vaciado |
| HU-01 | Bloqueo progresivo con tiempo restante; bloqueo indefinido; bloqueo por dispositivo [1.2b] | P-01 | "Mensajes de bloqueo" con los textos de SEC-001 |
| HU-01 | Nombre y rol visibles en todas las pantallas | Todas | Barra superior (design-system §5.11) |
| HU-02 | <= 6 toques para 3 productos de la categoría inicial; +1 por cambio de categoría | P-02 -> P-03 -> P-04 | 1 + 1 + 3 + 1 (flujos §3) |
| HU-02 | Tipo y mesa en 1 toque [1.2b] | P-03 | Rejilla única, adaptable a N = 1-99 sin desplazar |
| HU-02 | Cambiar de categoría en 1 toque | P-04 | Pestañas siempre visibles |
| HU-02 | Producto >= 44x44 con nombre y precio | P-04 | 120x88 px |
| HU-02 | Confirmación >= 3 s con número; pantalla lista | P-02 | Toast de 5 s, no bloqueante |
| HU-02 | Total en <= 200 ms | P-04 | Cálculo inmediato para mostrarlo (lo verifica Testing) |
| HU-02 | Lista "Pedidos": qué entra, campos de la fila (con COBRADO), orden, agrupación por mesa [1.2b] | P-02 | Tabla "Qué entra en la lista" + fila |
| HU-03 | Mayúsculas >= 7 mm a 1,5 m en 24" FHD (producto, cantidad, número, mesa/cliente) [1.2b] | P-05 | 38 px (7,26 mm) y 40 px (7,64 mm) con la fuente más desfavorable (design-system §2.1) |
| HU-03 | 1 toque, botón >= 60x60 | P-05 | 72 px de alto |
| HU-03 | >= 6 pedidos sin desplazar a 1920x1080, con hasta 5 líneas (o 4 + 1 nota), conectada [1.2b] | P-05 | Rejilla 3x2, presupuesto de alto en el wireframe |
| HU-03 | Estados por texto y color | P-05, P-02 | Insignia: texto + icono + color + borde |
| HU-03 | Deshacer "Empezar" y "Listo" en 30 s, solo la última acción [1.2b] | P-05 | Zona Deshacer de la barra superior |
| HU-03 | "Servido" en 1 toque desde la fila [1.2b] | P-02 | Botón "Servido" en filas LISTO |
| HU-03 | Deshacer "Servido" en 30 s [1.2b] | P-02 | Toast con acción y cuenta atrás |
| HU-03 | Estado "Servido" distinguible (no solo color) [1.2b] | P-02 | Insignia SERVIDO de contorno + doble check (design-system §1.2) |
| HU-04 | Tarjeta en <= 3 toques | P-02/P-08 -> P-06 | Cobrar, Tarjeta, Confirmar |
| HU-04 | Efectivo en <= 4 toques + importe; botones rápidos | P-06 | Exacto/5/10/20/50 |
| HU-04 | Cambio >= 32 px | P-06 | 40 px |
| HU-04 | Total y método visibles antes de confirmar; "Pedido N cobrado" | P-06, P-02 | En la etiqueta del botón; toast |
| HU-04 | "Cobrados hoy" en 1 toque, con "ANULADO" [1.2b] | P-02 | Pestaña "Cobrados hoy" |
| HU-04 | Antes de anular: pedidos que vuelven a "Abierto" e importe [1.2b] | P-07 / P-02 | Diálogo de anulación |
| HU-04 / SEC-007 | PIN del encargado al anular un cobro, aunque la sesión sea suya [1.2b] | P-07 / P-02 | Reconfirmación en el diálogo (design-system §5.10b) |
| HU-05 | 1 formulario con <= 4 campos obligatorios | P-09 | Nombre, categoría, precio, disponible |
| HU-05 | Agotado en <= 2 toques desde la toma | P-04 | Modo agotados |
| HU-05 | Errores con campo y corrección | P-09 | Mensajes con rango |
| HU-06 | Cancelar Pendiente en <= 3 toques | P-08 | Cancelar, motivo, Cancelar pedido |
| HU-06 | Diálogo con número e importe | P-08 | Cabecera del diálogo |
| HU-06 | AÑADIDO / ELIMINADO en texto | P-04, P-05, P-08 | Etiquetas + tachado |
| HU-06 | Autorización: encargado + PIN en el mismo dispositivo, preseleccionado si solo hay uno, no se pide a una sesión de encargado [1.2b] | P-08 | Diálogo de autorización (variantes A y B) |
| HU-06 | PIN incorrecto junto al campo; PIN vaciado; cambio conservado; intentos y bloqueo [1.2b] | P-08 | Estados del diálogo (design-system §5.10b) |
| HU-06 | Pedido cobrado: indica que hay que anular el cobro | P-08 | Estado "Pedido cobrado" |
| HU-07 | Alta en 1 formulario de 3 campos | P-10 | Nombre, rol, PIN |
| HU-07 | Lista con nombre, rol y estado en texto (incluido el bloqueo) [1.2b] | P-10 | Tabla |
| HU-07 / SEC-001 | Desbloquear a un usuario [1.2b] | P-10 | Acción "Desbloquear" |
| HU-07 / SEC-007 | PIN del encargado en cada escritura de Personal [1.2b] | P-10 | Reconfirmación en cada diálogo |
| HU-08 | Resumen en 1 toque desde el menú del encargado | Gestión -> P-11 | Opción directa |
| HU-08 | 2 decimales + €; diferencia negativa con "-" y "Falta" | P-11 | Formato + texto |
| HU-09 (propuesta) | "Ajustes" en 1 toque desde el menú del encargado [1.2b] | Gestión -> P-12 | Opción del menú (solo si se aprueba) |
| HU-09 (propuesta) | 1 formulario, 2 campos (mesas 1-99, retraso 1-60 min), "Guardar" [1.2b] | P-12 | Formulario |
| HU-09 (propuesta) | Error junto a su campo con el rango; "Ajustes guardados" [1.2b] | P-12 | Tabla de errores + toast |

Estados vacío / cargando / error / éxito: cada wireframe tiene su tabla "Estados".
Ambigüedades y hallazgos: en `docs/estado.md` (con el agente responsable).
