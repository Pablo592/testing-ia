# Wireframes — índice y cobertura de criterios UX

Formato: ASCII en Markdown (se lee en cualquier editor). Son wireframes de **estructura y comportamiento**: los colores, tamaños y componentes salen de `../design-system.md`, y los flujos, el recuento de toques y la telemetría, de `../flujos.md`.
Estado: **pendiente de aprobación humana de la dirección visual** antes de programar.
Última actualización: tarea 1.2c (2026-11-23), con HU-01..HU-08 tras las rondas 1.1d, 1.1e y 1.1f del PO y la arquitectura 1.3c (`POST /auth/pin` solo para el cambio obligatorio). HU-09 queda fuera del MVP.

| ID | Archivo | Pantalla | Historias | Prioridad |
|---|---|---|---|---|
| P-01 | `01-login.md` | Inicio de sesión (usuario + PIN, bloqueos, cambio obligatorio del PIN, vuelta al login) | HU-01, HU-07 (PIN provisional) | Must |
| P-02 | `02-pedidos.md` | Pedidos: inicio de sala ("Pedidos activos" y "Cobrados hoy") | HU-02, HU-03, HU-04 | Must |
| P-03, P-04 | `03-toma-pedido.md` | Mesa/mostrador y toma de pedido (+ modo agotados) | HU-02, HU-05, HU-06 | Must |
| P-05 | `04-cola-barra.md` | Cola de barra/cocina | HU-03, HU-06 | Must |
| P-06, P-07 | `05-cobro.md` | Cobro y ticket (+ anulación con PIN) | HU-04 | Must |
| P-09 | `06-gestion-menu.md` | Menú y menú de gestión | HU-05 | Must |
| P-08 | `07-modificar-cancelar.md` | Detalle, modificar y cancelar (+ autorización del encargado) | HU-06 | Should |
| P-10 | `08-personal.md` | Personal (+ desbloqueo, reconfirmación) | HU-07 | Should |
| P-11 | `09-resumen-dia.md` | Resumen del día (+ desglose por usuario, SEC-008) | HU-08 | Could |
| ~~P-12~~ | `06-gestion-menu.md` (al final, solo referencia) | ~~Ajustes del local~~ | ~~HU-09~~ | **Fuera del MVP** (descartada por el humano el 2026-11-23; supuesto 20) |

## Matriz: criterio de la historia -> pantalla

Los criterios se citan con su ID estable `HU-xx/CA-xnn` (`docs/historias/README.md`, "Identificadores de los criterios"). Están todos los criterios **UX** (`CA-U`) del MVP y los funcionales y no funcionales que fijan algo visible en la interfaz (textos, estados, tamaños, orientación). Los que solo se verifican en el servidor no aparecen aquí: están en `docs/testing.md` §10. Los marcados [1.2c] son nuevos o han cambiado en esta tarea. Cada wireframe repite su parte en "Criterios cubiertos".

| Criterio | Qué pide (resumen) | Pantalla | Cómo se cumple |
|---|---|---|---|
| Criterio común (README) y HU-01/CA-N04, HU-02/CA-N04, HU-03/CA-N04, HU-04/CA-N06, HU-05/CA-N04, HU-06/CA-N04, HU-07/CA-N03, HU-08/CA-N05 | WCAG 2.2 AA | Todas | Contrastes verificados (design-system §1.3), objetivos >= 48 px (2.5.8), foco no tapado (2.4.11), Subir/Bajar en vez de arrastrar (2.5.7), etiquetas asociadas |
| **HU-01** | | | |
| HU-01/CA-U01 | Login en <= 2 pasos | P-01 | Usuario -> PIN + Entrar |
| HU-01/CA-U02 | Teclado con botones >= 44x44 | P-01, P-06, P-07, P-08, P-10 | 72x72 px (64 en 375 px) |
| HU-01/CA-U03, CA-F05 | Error junto al campo, en texto; PIN vaciado | P-01 | "Usuario o PIN incorrectos" bajo el campo |
| HU-01/CA-U04 | Nombre y rol en todas las pantallas | Todas | Barra superior (design-system §5.11) |
| HU-01/CA-F01, CA-F02, CA-F03 | Destino según el rol; gestión solo para el encargado | P-01 -> P-02 / P-05 | "Gestión" solo en la barra del encargado |
| HU-01/CA-F06, CA-F11 | Bloqueo progresivo con tiempo restante, indefinido y por dispositivo | P-01 | "Mensajes de bloqueo"; minutos redondeados hacia arriba (I-03) [1.2c] |
| HU-01/CA-F07 | "Usuario desactivado, contacta con el encargado" | P-01 | Estado "Desactivado" |
| HU-01/CA-F09, CA-N06 | Cierre por inactividad (15 min) y caducidad de 12 h | P-01, P-05 | Aviso a los 14 min; "Vuelta al inicio de sesión"; aviso de 12 h en barra [1.2c] |
| HU-01/CA-F12 [1.2c] | Bloqueo temporal con la sesión abierta: "Cuenta bloqueada. Espera X min" al reconfirmar, sin hacer la acción y sin perder datos | P-07/P-02 (anulación), P-10 | design-system §5.10b, fila `423 LOCKED` |
| HU-01/CA-F13 [1.2c] | Bloqueo indefinido: sesiones revocadas, se pierde lo escrito, login con "Cuenta bloqueada. Pide al encargado que la desbloquee" | P-01 y todas | "Vuelta al inicio de sesión" |
| HU-01/CA-N01 | PIN de 6 dígitos para encargado | P-01, P-07, P-08, P-10 | Etiqueta "(6 dígitos)" y 6 indicadores |
| **HU-02** | | | |
| HU-02/CA-U01 | <= 6 toques (3 productos de la categoría inicial); +1 por cambio de categoría | P-02 -> P-03 -> P-04 | 1 + 1 + 3 + 1 (flujos §3) |
| HU-02/CA-U06 | Tipo y mesa en 1 toque | P-03 | Rejilla única; 20 mesas sin desplazar [1.2c] |
| HU-02/CA-U02 | Cambiar de categoría en 1 toque | P-04 | Pestañas siempre visibles, en varias filas si hace falta [1.2c] |
| HU-02/CA-U03 | Producto >= 44x44 con nombre y precio | P-04 | 120x88 px |
| HU-02/CA-U04 | Confirmación >= 3 s con el número; pantalla lista | P-02 | Toast de 5 s, no bloqueante |
| HU-02/CA-U05 | Total en <= 200 ms | P-04 | Cálculo en el cliente para mostrarlo (lo verifica Testing) |
| HU-02/CA-N05 | 1280x800 y 800x1280 sin desplazamiento horizontal; total y "Enviar" visibles | P-03, P-04 | Dos maquetaciones; barra inferior fija en vertical; tablas de espacio a 800x1280 [1.2c] |
| HU-02/CA-F01 | Mesa 1..N (N = 20 fijo) o mostrador con nombre de máx. 30 | P-03, P-04 | Rejilla de 20 mesas; campo con contador [1.2c] |
| HU-02/CA-F15 | Abre la primera categoría | P-04 | Primera pestaña activa |
| HU-02/CA-F08 | "Enviar a barra" deshabilitado sin líneas | P-04 | Botón deshabilitado + ayuda |
| HU-02/CA-F09 | Aviso "La mesa X ya tiene un pedido abierto" | P-03, P-04 | "Abierta #38" + aviso no bloqueante |
| HU-02/CA-F06 | Agotado deshabilitado | P-04 | Tachado + "AGOTADO" + `aria-disabled` |
| HU-02/CA-N02 | "No se ha podido enviar, reintenta"; pedido conservado | P-04 | Estado "Error de envío" |
| HU-02/CA-F16..CA-F22 | Lista "Pedidos": qué entra, fila, orden, agrupación, abrir detalle | P-02 | Tabla "Qué entra en la lista" + fila |
| HU-02/CA-F23 | Lista actualizada sin recargar | P-02 | Actualización en vivo |
| **HU-03** | | | |
| HU-03/CA-U01 | Mayúsculas >= 7 mm a 1,5 m (24" FHD) | P-05 | 38/40 px (design-system §2.1) |
| HU-03/CA-U02 | 1 toque, botón >= 60x60 | P-05 | 72 px de alto |
| HU-03/CA-U03 | >= 6 pedidos sin desplazar a 1920x1080 con hasta 5 líneas | P-05 | Rejilla 3x2 y presupuesto de alto |
| HU-03/CA-U04 | Estados por texto y color | P-05, P-02 | Texto + icono + color + borde |
| HU-03/CA-U05, CA-F16 | "Servido" en 1 toque desde la fila | P-02 | Botón en filas LISTO |
| HU-03/CA-F01, CA-F02 | Datos de la tarjeta; orden por entrada en la cola | P-05 | Cabecera de la tarjeta; orden de lectura |
| HU-03/CA-F23, CA-F13 | Vuelta a la cola con "AÑADIDO hh:mm" y líneas "AÑADIDO" | P-05 | Franja "＋ AÑADIDO hh:mm · YA SERVIDO/LISTO" [1.2c] |
| HU-03/CA-F05, CA-F11 | Deshacer "Empezar"/"Listo" 30 s; no si ya está servido | P-05 | Zona Deshacer de la barra superior |
| HU-03/CA-F06 | Retrasado con icono y texto (10 min fijos) | P-05, P-02 | "⚠ RETRASADO · N min" [1.2c] |
| HU-03/CA-F07 | MODIFICADO / CANCELADO hasta confirmar | P-05 | Franja + "Entendido" |
| HU-03/CA-F09 [1.2c] | Sonido desactivable; preferencia guardada en el dispositivo; activado la primera vez | P-05 | Interruptor y sección "Sonido" |
| HU-03/CA-F14 [1.2c] | "Sonido bloqueado" + "Activar sonido" >= 60x60, en <= 1 s, sin tapar pedidos | P-05 | Barra superior, sección "Sonido" |
| HU-03/CA-F15 | "Listos para servir" delante + aviso "Pedido N está listo" | P-02 | Sección + toast `aria-live` |
| HU-03/CA-F19 | Deshacer "Servido" en 30 s | P-02 | Toast con acción y cuenta atrás |
| HU-03/CA-F17, CA-F18, CA-F21 | Qué pasa con Servido/Cobrado y hasta cuándo se ve | P-02 | Tabla "Qué entra en la lista" |
| HU-03/CA-F22 | Barra no marca "Servido" | P-05 | No existe la acción |
| HU-03/CA-N02 | "Sin conexión" en <= 5 s | P-05, P-02 | Banner |
| HU-03/CA-N03 | Barra no ve importes | P-05 | Tarjeta sin importes |
| HU-03/CA-N05 [1.2c] | Pantalla encendida >= 30 min | P-05 | Wake Lock con reintento y aviso "La pantalla puede apagarse" |
| **HU-04** | | | |
| HU-04/CA-U01 | Tarjeta en <= 3 toques | P-02/P-08 -> P-06 | Cobrar, Tarjeta, Confirmar |
| HU-04/CA-U02 | Efectivo en <= 4 toques + importe; botones rápidos | P-06 | Exacto/5/10/20/50 |
| HU-04/CA-U03 | Cambio >= 32 px | P-06 | 40 px |
| HU-04/CA-U04 | Total y método en la vista de "Confirmar" sin desplazar; "Pedido N cobrado" | P-06, P-02 | Etiqueta del botón; efectivo reorganizado para 1024x768 [1.2c]; toast |
| HU-04/CA-U05 | Antes de anular: pedidos que vuelven a "Abierto" e importe | P-07 / P-02 | Diálogo de anulación |
| HU-04/CA-F04 | "Importe insuficiente: faltan X,XX €" | P-06 | Bloque de error + botón deshabilitado |
| HU-04/CA-F09 | Cobrar mesa | P-02, P-06 | "Cobrar mesa N · total" |
| HU-04/CA-F10, CA-F20 | Ticket en pantalla | P-07 | "Ticket no fiscal" [1.2c] |
| HU-04/CA-F18 | Cobrado sin servir sigue con "COBRADO" | P-02 | Insignia "€ COBRADO" |
| HU-04/CA-F19, CA-F21 | "Cobrados hoy" en 1 toque, con "ANULADO"; "Anular cobro" solo encargado | P-02 | Pestaña "Cobrados hoy" |
| HU-04/CA-F11 | "El motivo debe tener al menos 5 caracteres" | P-07 / P-02 | Error bajo el campo |
| HU-04/CA-F23 | PIN del encargado al anular; con cuenta bloqueada, HU-01/CA-F12 y CA-F13 | P-07 / P-02 | Reconfirmación (design-system §5.10b) [1.2c] |
| **HU-05** | | | |
| HU-05/CA-U01 | 1 formulario con <= 4 campos obligatorios | P-09 | Nombre, categoría, precio, disponible |
| HU-05/CA-U02 | Agotado en <= 2 toques desde la toma | P-04 | Modo agotados |
| HU-05/CA-U03, CA-F06, CA-F07 | Errores con campo y corrección | P-09 | Mensajes con el rango |
| HU-05/CA-F08 | Borrar categoría con productos: cuántos | P-09 | Diálogo informativo |
| HU-05/CA-N03 [1.2c] | Con 20 categorías se cumple HU-02/CA-N05 | P-04 | Pestañas en varias filas |
| HU-05/CA-N04 | Reordenar sin arrastrar, teclado | P-09 | Subir/Bajar |
| **HU-06** | | | |
| HU-06/CA-U01 | Cancelar "Pendiente" en <= 3 toques | P-08 | Cancelar, motivo, Cancelar pedido |
| HU-06/CA-U02 | Diálogo con número e importe | P-08 | Cabecera del diálogo |
| HU-06/CA-U03 | AÑADIDO / ELIMINADO en texto | P-04, P-05, P-08 | Etiquetas + tachado |
| HU-06/CA-U04, CA-F06 | Pedido cobrado: hace falta anular el cobro | P-08 | Estado "Pedido cobrado" |
| HU-06/CA-F03 | Aviso de línea ya preparada o servida | P-08 | Aviso al pulsar "−" |
| HU-06/CA-F11, CA-F12, CA-F15 | Encargado + PIN; preseleccionado si es único; sin pedirlo a una sesión de encargado | P-08 | Variantes A y B |
| HU-06/CA-F13, CA-F18 | "PIN de encargado incorrecto", PIN vaciado, cambio conservado (también con encargado bloqueado) | P-08 | Estados del diálogo |
| HU-06/CA-F19 | "Demasiados intentos. Espera X min", cambio conservado | P-08 | Estado `429` por sesión [1.2c: texto literal] |
| HU-06/CA-N03 | Aviso "el pedido ha cambiado" y versión actual | P-08, P-02, P-05 | Estado de conflicto (409) |
| **HU-07** | | | |
| HU-07/CA-U01 | Alta en 1 formulario de 3 campos | P-10 | Nombre, rol, PIN |
| HU-07/CA-U02, CA-F10 | Lista con nombre, rol y estado en texto (incluido "Bloqueado") | P-10 | Tabla |
| HU-07/CA-F05 | "Debe existir al menos un encargado activo" | P-10 | "Desactivar" deshabilitado con el texto |
| HU-07/CA-F06 | Rechazo de PIN indicando la regla | P-10, P-01 | "Reglas de PIN" |
| HU-07/CA-F08 | Desbloquear | P-10 | Acción "Desbloquear" |
| HU-07/CA-F04, CA-F09 | Cambio obligatorio del PIN (provisional o promoción a encargado) | P-01 | "Cambio obligatorio del PIN"; sin cambio voluntario en el MVP [1.2c] |
| HU-07/CA-N04 | PIN del encargado en cada escritura; con cuenta bloqueada, HU-01/CA-F12 y CA-F13 | P-10 | Reconfirmación en cada diálogo [1.2c] |
| **HU-08** | | | |
| HU-08/CA-U01 | Resumen en 1 toque desde el menú del encargado | Gestión -> P-11 | Opción directa |
| HU-08/CA-U02 | 2 decimales + €; diferencia negativa con "-" y "Falta" | P-11 | Formato + texto |
| HU-08/CA-F01 | Cifras del día | P-11 | Tarjetas |
| HU-08/CA-F13 [1.2c] | Cancelaciones y anulaciones por usuario y autorizador ("sin autorización") | P-11 | Tabla "Cancelaciones y anulaciones por usuario" |
| HU-08/CA-F14 [1.2c] | La suma del desglose coincide con los totales | P-11 | Fila "Total" igual a las tarjetas |
| HU-08/CA-F03 | "Hay N pedidos sin cobrar" con acceso | P-11 | Aviso + "Ver pedidos" |
| HU-08/CA-F05 | Día cerrado; anulados tras el cierre aparte | P-11 | Solo lectura + sección aparte |
| HU-08/CA-F06, CA-F12 | Fechas de hoy a 90 días atrás; anteriores no seleccionables | P-11 | Selector con días deshabilitados |

Estados vacío / cargando / error / éxito: cada wireframe tiene su tabla "Estados".
Telemetría del cliente (M-03): pantallas, flujos y pasos en `../flujos.md` §10.
Ambigüedades y hallazgos: en `docs/estado.md` (con el agente responsable).
