# Flujos de usuario

Autor: UX/UI Designer · Etapa 1, tareas 1.2 y 1.2b · Fecha: 2026-11-21
Entradas: `docs/historias/` (HU-01..HU-09, supuestos 1-22), `docs/seguridad.md` §6.1 y §6.3 (PIN, bloqueo, SEC-007). Estado: **propuesta, pendiente de aprobación humana**.
Cambios de la tarea 1.2b: estado "Servido" y "Cobrados hoy" (§4, §5), "Deshacer" de "Empezar" (§4), autorización y reconfirmación del encargado (§6, §7), bloqueos (§1) y Ajustes vinculados a HU-09 (§9).

Convenciones:
- **Toque** = una pulsación en pantalla. Escribir texto o un importe se cuenta aparte, como indica cada historia.
- Los diagramas usan Mermaid (GitHub, GitLab y VS Code los muestran). Debajo de cada uno, los pasos van en texto para leerlos sin herramientas.
- Los IDs de pantalla (P-01...) coinciden con los de `wireframes/`.

## 0. Mapa de pantallas y navegación por rol

| ID | Pantalla | Camarero/cajero | Barra/cocina | Encargado | Wireframe |
|---|---|---|---|---|---|
| P-01 | Inicio de sesión | sí | sí | sí | `01-login.md` |
| P-02 | Pedidos (inicio de sala) | **inicio** | no | sí | `02-pedidos.md` |
| P-03 | Nuevo pedido: elegir mesa o mostrador | sí | no | sí | `03-toma-pedido.md` |
| P-04 | Toma de pedido (productos + ticket) | sí | no | sí | `03-toma-pedido.md` |
| P-05 | Cola de barra | no | **inicio** | sí | `04-cola-barra.md` |
| P-06 | Cobro | sí | no | sí | `05-cobro.md` |
| P-07 | Ticket en pantalla | sí | no | sí | `05-cobro.md` |
| P-08 | Detalle de pedido (modificar/cancelar) | sí | no | sí | `07-modificar-cancelar.md` |
| P-09 | Gestión del menú | no | no | sí | `06-gestion-menu.md` |
| P-10 | Personal | no | no | sí | `08-personal.md` |
| P-11 | Resumen del día | no | no | sí | `09-resumen-dia.md` |
| P-12 | Ajustes (mesas, umbral de retraso), **solo si se aprueba HU-09** | no | no | sí | `06-gestion-menu.md` (§ P-12) |

```mermaid
flowchart LR
  L[P-01 Inicio de sesión] -->|camarero| P[P-02 Pedidos]
  L -->|barra| C[P-05 Cola de barra]
  L -->|encargado| P
  P --> N[P-03 Mesa o mostrador] --> T[P-04 Toma de pedido]
  T -->|Enviar a barra| P
  P -->|Cobrar| CB[P-06 Cobro] --> TK[P-07 Ticket]
  P -->|tocar fila| D[P-08 Detalle] --> CB
  D -->|Añadir productos| T
  P -. solo encargado: Menú de gestión .-> G{{Gestión}}
  G --> M[P-09 Menú]
  G --> S[P-10 Personal]
  G --> R[P-11 Resumen del día]
  G -. si se aprueba HU-09 .-> A[P-12 Ajustes]
  G --> C
```

Pasos en texto:
- Camarero: P-01 -> P-02 Pedidos. Desde ahí crea (P-03 -> P-04), cobra (P-06) y abre el detalle (P-08).
- Barra: P-01 -> P-05 Cola. No tiene otra navegación (HU-01: no puede crear, cobrar ni cancelar).
- Encargado: P-01 -> P-02 Pedidos + botón "Gestión" en la barra superior (Menú, Personal, Resumen del día, Ajustes si HU-09 se aprueba, Cola de barra).
- P-02 tiene dos pestañas: "Pedidos activos" y "Cobrados hoy" (1 toque, HU-04).
- **Todas las pantallas** llevan la barra superior con "Nombre · Rol" y "Cerrar sesión" (HU-01).

La pantalla P-02 Pedidos ya está definida en HU-02 (sección "Lista Pedidos"), HU-03 ("Listos para servir") y HU-04 ("Cobrados hoy"), tras el hallazgo de UX resuelto por el PO.

---

## 1. HU-01 — Iniciar sesión con mi rol

```mermaid
flowchart TD
  A[P-01: rejilla de usuarios] -->|toque 1: elegir usuario| B[Teclado de PIN]
  B -->|escribir PIN + toque 2: Entrar| V{Validación en servidor}
  V -->|correcto, camarero o encargado| P[P-02 Pedidos]
  V -->|correcto, barra| C[P-05 Cola]
  V -->|incorrecto| E[Mensaje bajo el PIN: Usuario o PIN incorrectos. El PIN se vacía]
  E --> B
  V -->|5, 10 o 15 fallos seguidos: 423| K[Demasiados intentos fallidos. Podrás volver a intentarlo en 4:59 / 15 / 60 min. Teclado deshabilitado]
  V -->|20 fallos seguidos: 423 manual| KM[Cuenta bloqueada. Pide al encargado que la desbloquee]
  KM -.-> UL[Encargado: P-10 Desbloquear + su PIN]
  V -->|10 fallos del dispositivo en 10 min: 429| KD[Demasiados intentos desde este dispositivo. Espera X min. También en el paso 1]
  V -->|usuario desactivado| X[Usuario desactivado, contacta con el encargado]
  V -->|PIN provisional HU-07| Q[Cambiar PIN: nuevo + repetir] --> P
```

Pasos:
1. **Paso 1:** tocar la tarjeta del usuario (o escribirlo con "¿No apareces? Escribe tu usuario").
2. **Paso 2:** escribir el PIN en el teclado en pantalla y tocar "Entrar".
3. Resultado según el rol: camarero/encargado -> P-02; barra -> P-05.

Ramas: error (mensaje junto al campo, en texto, PIN vaciado), bloqueo progresivo 5/15/60 min con cuenta atrás, bloqueo indefinido hasta que un encargado desbloquee, bloqueo del dispositivo (`429`), usuario desactivado (textos exactos en `wireframes/01-login.md`, "Mensajes de bloqueo"), PIN provisional, cierre de sesión (vuelve a P-01) y cierre automático por inactividad. A los 14 min, aviso "Tu sesión se cerrará en 60 s por inactividad · Seguir conectado"; a los 15 min, P-01 con el mensaje "Sesión cerrada por inactividad". La cola de barra no caduca.

Criterios UX cubiertos: <= 2 pasos; teclado de 72 px (>= 44); error en texto junto al campo y PIN vaciado; nombre y rol en la barra superior de todas las pantallas.

---

## 2. HU-05 — Gestionar el menú (encargado)

```mermaid
flowchart TD
  G[Gestión] --> M[P-09 Menú: categorías a la izquierda, productos a la derecha]
  M -->|Nuevo producto| F[Formulario: nombre, categoría, precio, disponible]
  F -->|Guardar producto| V{Validación}
  V -->|válido| OK[Toast: Producto guardado. Aparece en la toma de pedido]
  V -->|inválido| ER[Error bajo cada campo con el rango válido]
  ER --> F
  M -->|Nueva categoría| FC[Nombre de categoría 1-30] --> M
  M -->|Desactivar producto| DC[Diálogo: Dejará de aparecer en la toma de pedido. Se conserva en el histórico] --> M
  M -->|Borrar categoría con productos activos| BL[Bloqueado: Esta categoría tiene 7 productos activos]
  M -->|Subir / Bajar o arrastrar| ORD[Nuevo orden guardado]
```

Marcar agotado desde la toma de pedido (camarero o encargado), en **2 toques**:
1. En P-04, tocar "Marcar agotados" (barra de categorías). Aparece el banner de modo agotados.
2. Tocar el producto: pasa a "AGOTADO" (o vuelve a "Disponible"). Se ve en todos los dispositivos en <= 5 s.
3. "Terminar" sale del modo. No cuenta para el criterio porque el cambio ya está hecho en el toque 2.

Criterios UX cubiertos: 1 formulario con 4 campos obligatorios; agotado en 2 toques; errores con campo y rango.

---

## 3. HU-02 — Tomar un pedido

```mermaid
flowchart TD
  P[P-02 Pedidos] -->|toque 1: Nuevo pedido| N[P-03: rejilla de mesas 1..N + botón Mostrador / Para llevar]
  N -->|toque 2: Mesa 7| T[P-04 con Mesa 7]
  N -->|toque 2: Mostrador| T2[P-04 con Mostrador. Campo opcional: nombre del cliente]
  T -->|toques 3-5: 3 productos| T
  T -->|toque 6: Enviar a barra| S{Envío}
  S -->|correcto| OK[Toast 5 s: Pedido 42 enviado a barra. Vuelve a P-02 listo para otro pedido]
  S -->|sin conexión o error| E[Error en línea: No se ha podido enviar, reintenta. Se conserva el pedido. Botón Reintentar]
  E -->|Reintentar, misma clave de idempotencia| S
  T -->|Descartar| DD[Diálogo: ¿Descartar este pedido? 3 productos] -->|Descartar pedido| P
```

Recuento del criterio "<= 6 toques": Nuevo pedido (1) · Mesa 7 (2) · producto (3) · producto (4) · producto (5) · Enviar a barra (6). **Cumple con 6**, siempre que:
- la elección de tipo y de mesa sea **un único toque** (P-03 muestra mesas y "Mostrador" en la misma rejilla, sin paso previo de "tipo");
- los 3 productos estén en la categoría que se abre por defecto (la primera según el orden de HU-05). Si están en otra categoría, cada cambio suma 1 toque (ya recogido en HU-02).
- la mesa se elija sin desplazar: P-03 adapta el tamaño de los botones al número de mesas (1-99) (`wireframes/03-toma-pedido.md`).

Otros pasos:
- Tocar el mismo producto otra vez sube la cantidad. En el ticket, "+" y "-" (48 px); al llegar a 0 la línea desaparece y aparece un toast "Café con leche quitado · Deshacer".
- Nota de línea: tocar "Añadir nota" en la línea -> campo de texto (máx. 100, contador "23/100") con sugerencias rápidas como chips ("Sin azúcar", "Leche de avena", "Para llevar") -> "Guardar nota".
- Mesa con pedido abierto: en P-03 la mesa se muestra con el texto "Abierta · #38". Al elegirla, P-04 muestra un aviso **no bloqueante**: "La mesa 7 ya tiene un pedido abierto (#38). Este se enviará como pedido independiente." No añade toques.
- "Enviar a barra" está deshabilitado sin líneas, con la ayuda "Añade al menos un producto".
- Confirmación: el toast muestra "Pedido **42**" (número en `text-4xl`) durante 5 s (>= 3 s exigidos) **sin bloquear**: la pantalla ya está lista para el siguiente pedido.

Criterios UX cubiertos: <= 6 toques; categoría en 1 toque; producto de 120x88 px con nombre y precio; confirmación >= 3 s con número; total recalculado al momento en el cliente (presentación; el servidor recalcula al enviar, ver HU-02 no funcionales).

---

## 4. HU-03 — Cola de barra y entrega en sala [actualizado 1.2b]

```mermaid
stateDiagram-v2
  [*] --> Pendiente: Enviar a barra (HU-02)
  Pendiente --> EnPreparacion: barra, Empezar
  EnPreparacion --> Pendiente: barra, Deshacer (<= 30 s)
  EnPreparacion --> Listo: barra, Marcar listo
  Listo --> EnPreparacion: barra, Deshacer (<= 30 s, si no está Servido)
  Listo --> Servido: sala, Servido (1 toque en P-02)
  Servido --> Listo: sala, Deshacer (<= 30 s, quien lo marcó)
  Listo --> Pendiente: HU-06, añadir productos
  Servido --> Pendiente: HU-06, añadir productos
  Pendiente --> Cancelado: HU-06
  EnPreparacion --> Cancelado: HU-06 + autorización
  Listo --> Cancelado: HU-06 + autorización
  Servido --> Cancelado: HU-06 + autorización
  note right of EnPreparacion
    Retrasado = modificador visual
    si espera > umbral (10 min por defecto,
    HU-09 o supuesto 20)
  end note
```
El cobro (Abierto / Cobrado / Cancelado) es independiente y ningún cambio de este diagrama lo modifica (supuesto 14).

Pasos en barra (P-05; cada cambio de estado = **1 toque**, botón de 72 px):
1. Llega un pedido: aparece al final de la cola (orden: más antiguo arriba a la izquierda), con sonido (desactivable) y borde resaltado 2 s, sin recargar.
2. "Empezar" -> EN PREPARACIÓN. En la barra superior aparece "Pedido 41 empezado · Deshacer · 30 s".
3. "Marcar listo" -> LISTO. La tarjeta sale de la cola y la zona Deshacer muestra "Pedido 42 listo · Deshacer · 30 s".
4. "Deshacer" (1 toque, <= 30 s) vuelve al estado anterior. Solo se puede deshacer la última acción de la pantalla; si sala ya ha marcado "Servido" el pedido, se avisa "Pedido 42 ya servido: no se puede deshacer".
5. Pedido modificado o cancelado: la tarjeta muestra la franja "✎ MODIFICADO" o "✕ CANCELADO" y el botón pasa a "Entendido" (1 toque), que hay que pulsar antes de seguir. En una cancelación, "Entendido" quita la tarjeta.
6. Sin conexión: banner "Sin conexión. Reintentando…" en <= 5 s; los botones de estado se deshabilitan con el texto "Sin conexión". Al reconectar se resincroniza sola.
7. Si el navegador bloquea el audio tras recargar: botón "Activar sonido" en la barra superior (1 toque).

Pasos en sala (P-02):
1. Un pedido pasa a LISTO: entra en "Listos para servir" (arriba) con el aviso "Pedido 42 (Mesa 7) está listo" (toast 5 s, `aria-live`), en <= 2 s.
2. El camarero lo recoge y lo entrega. Toca **"Servido"** en la fila (1 toque).
3. Toast "Pedido 42 servido · Deshacer (30 s)". Si estaba cobrado, el pedido sale de la lista (solo queda en "Cobrados hoy"); si no, pasa a "Resto de pedidos" con la insignia SERVIDO y "Cobrar".
4. Un pedido cobrado y Listo que nadie marca "Servido" sigue en "Listos para servir" hasta las 00:00 del día siguiente a su envío.

Criterios UX cubiertos: mayúsculas >= 7 mm a 1,5 m en 24" FHD (38/40 px, cálculo en design-system §2.1); 1 toque y 72 px (>= 60); 6 pedidos sin desplazar a 1920x1080 con hasta 5 líneas (rejilla 3x2); estados con texto, icono, color y patrón; "Servido" en 1 toque; "Deshacer" de "Empezar", "Listo" y "Servido".

---

## 5. HU-04 — Cobrar y cerrar

```mermaid
flowchart TD
  P[P-02 Pedidos] -->|toque 1: Cobrar en la fila| C[P-06 Cobro: líneas + total + método]
  D[P-08 Detalle] -->|toque 1: Cobrar| C
  C -->|toque 2: Tarjeta| CT[Botón: Confirmar cobro con tarjeta · 7,40 €]
  CT -->|toque 3| OK[Toast: Pedido 42 cobrado + Ver ticket]
  C -->|toque 2: Efectivo| CE[Importe entregado: teclas Exacto 5 10 20 50 o teclado]
  CE -->|toque 3: 10 €| CA[Cambio: 2,60 € en 32 px o más]
  CA -->|toque 4: Confirmar cobro en efectivo · 7,40 €| OK
  CE -->|importe menor| IN[Importe insuficiente: faltan 2,40 €. Confirmar deshabilitado]
  OK -->|no servido| PA[P-02: sigue con € COBRADO hasta Servido o fin del día]
  OK -->|ya servido| PB[Sale de P-02; solo en Cobrados hoy]
  OK -->|Ver ticket| TK[P-07 Ticket]
  P -->|1 toque: pestaña Cobrados hoy| CH[Cobros de hoy, más reciente primero, con ANULADO]
  CH -->|Ver ticket| TK
  TK -->|encargado: Anular cobro| AN[Diálogo: importe + pedidos que vuelven a sin cobrar + motivo mín. 5 + PIN del encargado SEC-007]
  CH -->|encargado: Anular cobro| AN
  AN -->|Confirmar y anular cobro, PIN correcto| AV[Toast: Cobro anulado. Pedidos vuelven a P-02 con Cobrar]
  AN -->|PIN incorrecto o bloqueo| AE[Mensaje de §5.10b; motivo conservado]
```

Recuento:
- Tarjeta: Cobrar (1) · Tarjeta (2) · Confirmar (3) = **3 toques** (cumple <= 3). Antes del 3 se lee "Total 7,40 € · Tarjeta" y el aviso "Confirma solo cuando el datáfono haya aprobado el pago".
- Efectivo: Cobrar (1) · Efectivo (2) · tecla rápida o importe (3) · Confirmar (4) = **4 toques** (cumple <= 4 + importe).
- Cobrar mesa: en P-02, el grupo de la mesa con varios pedidos abiertos muestra "Cobrar mesa 7 · 2 pedidos · 15,20 €" (1 toque) -> P-06 con los dos pedidos agrupados y un único total.
- Tras confirmar: el botón pasa a "Cobrando…" y se deshabilita (contra el doble toque). Después, toast "Pedido 42 cobrado" y vuelta a P-02. Si el pedido aún no está "Servido", sigue en la lista con "€ COBRADO" y sin "Cobrar"; si ya estaba servido, sale (HU-04, supuesto 18).
- Anular un cobro (solo encargado): desde P-07 o "Cobrados hoy". El diálogo muestra importe y pedidos que vuelven a "sin cobrar", pide motivo (mín. 5) y **el PIN del encargado aunque la sesión sea suya** (SEC-007). No hay criterio de toques para la anulación.

Criterios UX cubiertos: 3 toques con tarjeta; 4 con efectivo y botones rápidos; cambio >= 32 px (40 px de diseño); total y método visibles antes de confirmar (en el propio botón); mensaje "Pedido N cobrado".

---

## 6. HU-06 — Modificar o cancelar (Should) [actualizado 1.2b]

```mermaid
flowchart TD
  P[P-02] -->|tocar fila| D[P-08 Detalle de pedido 42]
  D -->|Añadir productos| T[P-04 modo modificar: Enviar cambios a barra]
  D -->|- en una línea, pedido Pendiente| M[Línea tachada + ELIMINADO. Enviar cambios a barra]
  D -->|- en una línea, En preparación / Listo / Servido| MA[Línea tachada + aviso: puede estar ya preparada. Necesita autorización al enviar]
  MA -->|Enviar cambios a barra| S{¿Sesión de encargado?}
  S -->|sí| OK1[Se aplica. authorized_by = el encargado]
  S -->|no| AU[Diálogo de autorización: elegir encargado, preseleccionado si solo hay uno, + PIN de 6 dígitos]
  AU -->|correcto| OK2[Se aplica. Toast: autorizado por Marta]
  AU -->|PIN incorrecto| AE[PIN de encargado incorrecto. PIN vaciado. Cambio conservado]
  AE --> AU
  AU -->|429 sesión o dispositivo| AB[Demasiados intentos. Espera X min. Volver activo, cambio conservado]
  D -->|toque 1: Cancelar pedido| CC[Diálogo: Pedido 42 · 7,40 €. Motivo]
  CC -->|toque 2: motivo; toque 3: Cancelar pedido, si Pendiente| X[Toast: Pedido 42 cancelado]
  CC -->|no Pendiente y sesión de camarero| CCA[Mismo diálogo + sección de autorización. Autorizar y cancelar pedido]
  CCA --> X
  D -->|el pedido ha cambiado en otro dispositivo 409| CF[Aviso: Este pedido ha cambiado. Se muestra la versión actual]
```

Reglas (supuesto 22, `seguridad.md` §6.3):
- Encargado + PIN en el mismo dispositivo. Un solo encargado activo: aparece preseleccionado y solo se escribe el PIN. Varios: se elige con 1 toque (sin preselección).
- Una autorización vale para **una** acción: un envío de cambios (con todas sus líneas quitadas) o una cancelación.
- Sesión de encargado: sin autorización ni reconfirmación para HU-06.
- Mensajes de error y bloqueo: design system §5.10b.

Criterios UX cubiertos: cancelar en 3 toques (Cancelar, motivo, Confirmar) desde el detalle; el diálogo muestra número e importe; "AÑADIDO" y "ELIMINADO" (tachado) en texto; aviso de línea ya preparada o servida.

---

## 7. HU-07 — Personal (Should) [actualizado 1.2b]

Gestión -> Personal: lista (nombre, rol, estado en texto, con "Bloqueado · N min" y "Bloqueado hasta desbloquear"; los bloqueados primero) -> "Nuevo usuario" -> formulario de 3 campos (nombre, rol, PIN inicial con la regla según el rol) + **PIN del encargado** (SEC-007) -> "Confirmar y crear usuario". En cada fila: "Editar", "Restablecer PIN", "Desactivar"/"Activar" y, si está bloqueado, "Desbloquear". **Todas** las escrituras piden el PIN del encargado que actúa (variante "Reconfirmación" de design system §5.10b). Si es el único encargado, "Desactivar" se deshabilita con el texto "Debe existir al menos un encargado activo".

Desbloquear (`seguridad.md` §6.1.6): fila bloqueada -> "Desbloquear" (1) -> diálogo "¿Desbloquear a Lucía?" con su PIN de encargado -> "Confirmar y desbloquear" -> toast "Lucía desbloqueada: ya puede iniciar sesión". Si el único encargado está bloqueado, el desbloqueo es de soporte técnico (`unlock-user`).

## 8. HU-08 — Resumen del día (Could)

Gestión -> **Resumen del día** (1 toque, abre hoy) -> cifras + aviso "Hay 3 pedidos sin cobrar · Ver pedidos" -> "Efectivo contado" (teclado de importe) -> diferencia ("Falta 2,50 €" / "Sobra 1,00 €" / "Cuadra") -> "Guardar cierre" -> diálogo "El cierre no se podrá modificar" -> "Guardar cierre". Selector de fecha (últimos 90 días) arriba.

## 9. HU-09 — Ajustes del local (PROPUESTA, pendiente de aprobación humana) [1.2b]

Gestión -> **Ajustes** (1 toque) -> formulario con 2 campos: "Número de mesas" (1-99, por defecto 20) y "Aviso de pedido retrasado" (1-60 min, por defecto 10) -> "Guardar ajustes" -> toast "Ajustes guardados". Errores junto a su campo, con el rango (textos de HU-09). Reducir mesas con pedidos sin cobrar en una mesa mayor que N -> error que cita la mesa + "Ver pedidos". Los cambios llegan a P-03 en <= 5 s y a P-05 en <= 60 s. Si HU-09 no se aprueba, la opción no existe y los valores se fijan en la instalación (supuesto 20).
