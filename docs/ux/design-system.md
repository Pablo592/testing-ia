# Design system — Toma de pedidos (cafetería)

Autor: UX/UI Designer · Etapa 1, tareas 1.2, 1.2b y 1.2c · Fecha: 2026-11-23
Los cambios de la tarea 1.2b (hallazgos resueltos por el PO en la ronda 1.1c) van marcados **[1.2b]**; los de la tarea 1.2c (rondas 1.1d, 1.1e y 1.1f del PO), **[1.2c]**; los de la tarea 2.1d (rutas de la SPA y "Acceso denegado" de la 2.1c del SE, T-30), **[2.1d]**.
Estado: **propuesta, pendiente de aprobación humana** (dirección visual).

## 0. Principios

1. **Prisa primero.** Cada flujo Must se mide en toques (ver `flujos.md`). La acción más frecuente siempre está a la vista y nunca a más de 1 toque.
2. **Un solo botón principal por pantalla** (estilo `primario`). El resto son secundarios, fantasma o de peligro.
3. **Nunca solo color.** Todo estado lleva **texto + icono + color**, y en las tarjetas de barra también un **patrón de borde**.
4. **Objetivos táctiles grandes.** Mínimo 48x48 px en todo el producto (la historia exige 44 y WCAG 2.2 pide 24; vamos por encima). Barra: 72 px.
5. **Etiquetas con verbo** en los botones: "Enviar a barra", "Cobrar 7,40 €", "Marcar listo". Nada de "OK" o "Aceptar".
6. **Error junto a su causa**, en texto, con la corrección ("El precio debe estar entre 0,01 y 999,99 €").

Base recomendada: **shadcn/ui + Tailwind CSS** (componentes accesibles sobre Radix, tokens como variables CSS). Los tokens están en la paleta de Tailwind v3, así que se trasladan a cualquier stack. Si el Software Engineer elige otro stack, los tokens se usan como variables CSS sin cambios. **No se permiten colores, tamaños ni espaciados fuera de estos tokens**; es lo que revisaré en las etapas 2 y 3.

## 1. Color

Un solo tema claro en el MVP (también en barra; un tema oscuro queda fuera del MVP). Contrastes calculados con la fórmula de luminancia relativa de WCAG 2.x (script reproducible al final). Umbrales: texto >= 4,5:1 (AA, 1.4.3); componentes y bordes que identifican estado o foco >= 3:1 (1.4.11).

### 1.1 Tokens base

| Token | Hex | Uso |
|---|---|---|
| `--color-bg` | `#f8fafc` (slate-50) | Fondo de la aplicación |
| `--color-surface` | `#ffffff` | Tarjetas, paneles, modales, inputs |
| `--color-surface-muted` | `#f1f5f9` (slate-100) | Producto agotado, filas alternas, zonas inactivas |
| `--color-border` | `#cbd5e1` (slate-300) | Separadores decorativos (no identifican nada) |
| `--color-border-strong` | `#64748b` (slate-500) | Borde de inputs y botones secundarios |
| `--color-text` | `#0f172a` (slate-900) | Texto principal |
| `--color-text-secondary` | `#475569` (slate-600) | Texto secundario, metadatos, ayuda |
| `--color-primary` | `#1d4ed8` (blue-700) | Botón principal, enlaces, selección |
| `--color-primary-hover` | `#1e40af` (blue-800) | Hover/pulsado del principal |
| `--color-on-primary` | `#ffffff` | Texto sobre primario/peligro/éxito |
| `--color-focus` | `#2563eb` (blue-600) | Anillo de foco (3 px, separación 2 px) |
| `--color-danger` | `#b91c1c` (red-700) | Botón de peligro, texto de error |
| `--color-success` | `#15803d` (green-700) | Botón de confirmación de cobro, texto de éxito |
| `--color-toast` | `#0f172a` (slate-900) | Fondo de avisos (toast) |
| `--color-offline` | `#991b1b` (red-800) | Banner "Sin conexión" |

### 1.2 Tokens de estado (insignias y tarjetas)

| Estado | Texto (`--status-*-fg`) | Fondo (`--status-*-bg`) | Borde (`--status-*-border`) | Icono | Etiqueta | Patrón de borde en tarjeta |
|---|---|---|---|---|---|---|
| Pendiente | `#334155` | `#e2e8f0` | `#64748b` | ○ (círculo vacío) | PENDIENTE | 2 px continuo |
| En preparación | `#1e3a8a` | `#dbeafe` | `#2563eb` | ◐ (medio círculo) | EN PREPARACIÓN | 4 px continuo a la izquierda |
| Listo | `#14532d` | `#dcfce7` | `#16a34a` | ✓ | LISTO | 4 px continuo completo |
| **Servido** (solo sala) [1.2b] | `#166534` | `#ffffff` (sin relleno) | `#16a34a`, 2 px | ✓✓ (doble check) | SERVIDO | **insignia de contorno, sin relleno** (el resto de insignias están rellenas) |
| **Retrasado** (se suma al estado) | `#7f1d1d` | `#fee2e2` | `#dc2626` | ⚠ (triángulo) | RETRASADO · 12 min | 6 px **discontinuo** + franja superior |
| Modificado | `#4c1d95` | `#ede9fe` | `#7c3aed` | ✎ | MODIFICADO | franja superior |
| Añadido a pedido Listo/Servido (vuelve a la cola) [1.2b, texto 1.2c] | `#4c1d95` | `#ede9fe` | `#7c3aed` | ＋ (`plus-circle`) | ＋ AÑADIDO hh:mm · YA SERVIDO (o YA LISTO) | franja superior; sin "Entendido" |
| Cancelado | `#0f172a` | `#cbd5e1` | `#0f172a` | ✕ | CANCELADO | contenido tachado + franja |
| Cobrado (solo sala) | `#134e4a` | `#ccfbf1` | — | € | COBRADO | — |
| Anulado (cobro; solo "Cobrados hoy" y ticket) [1.2b] | `#0f172a` | `#cbd5e1` | — | ⊘ | ANULADO | importe tachado + línea "Motivo: …" |
| Aviso | `#78350f` | `#fef3c7` | — | ⚠ | (texto del aviso) | — |

"Retrasado" no es un estado del pedido sino un **modificador**: la tarjeta sigue mostrando PENDIENTE o EN PREPARACIÓN y además lleva la franja "⚠ RETRASADO · N min". Así se cumple HU-03 (icono y texto, no solo color).

**Servido [1.2b]** es el estado final de preparación y solo se ve en sala (P-02; barra nunca lo muestra). Se distingue de LISTO de cuatro formas: texto (SERVIDO), icono (doble check), relleno (contorno frente a fondo verde) y sección (LISTO va en "Listos para servir"; SERVIDO, en "Resto de pedidos"). Comparte el tono verde con LISTO a propósito, porque es su continuación; la diferencia que no depende del color es el relleno, que también se ve en escala de grises. Frente a PENDIENTE (gris relleno) cambian el tono, el relleno, el icono y el texto.

**Anulado [1.2b]** usa los colores de Cancelado (neutro oscuro, ya verificado), pero con otro icono (⊘) y otro texto. Nunca coinciden en la misma vista: CANCELADO es un estado del pedido (barra y detalle) y ANULADO, un estado del cobro ("Cobrados hoy" y ticket).

Los iconos son de una librería (Lucide en shadcn/ui: `circle`, `circle-dashed`/`loader`, `check`, `check-check` (Servido), `ban` (Anulado), `triangle-alert`, `pencil`, `x`, `euro`, `undo-2` (Deshacer), `lock` (bloqueo)); los símbolos de esta tabla solo los representan en los wireframes. Los iconos son decorativos (`aria-hidden`) porque el texto de la etiqueta siempre está presente.

### 1.3 Contrastes verificados

| Par (texto / fondo) | Ratio | Criterio | Resultado |
|---|---|---|---|
| `text` / `surface` | 17,85 | 4,5 | Cumple |
| `text` / `bg` | 17,06 | 4,5 | Cumple |
| `text-secondary` / `surface` | 7,58 | 4,5 | Cumple |
| `text-secondary` / `bg` | 7,24 | 4,5 | Cumple |
| `text-secondary` / `surface-muted` (producto agotado) | 6,92 | 4,5 | Cumple |
| `on-primary` / `primary` | 6,70 | 4,5 | Cumple |
| `on-primary` / `primary-hover` | 8,72 | 4,5 | Cumple |
| `primary` como texto/enlace / `surface` | 6,70 | 4,5 | Cumple |
| `on-primary` / `danger` | 6,47 | 4,5 | Cumple |
| `danger` como texto de error / `surface` | 6,47 | 4,5 | Cumple |
| `on-primary` / `success` | 5,02 | 4,5 | Cumple |
| `success` como texto / `surface` | 5,02 | 4,5 | Cumple |
| Pendiente fg / bg | 8,40 | 4,5 | Cumple |
| En preparación fg / bg | 8,49 | 4,5 | Cumple |
| Listo fg / bg | 8,30 | 4,5 | Cumple |
| Retrasado fg / bg | 8,20 | 4,5 | Cumple |
| Modificado fg / bg | 9,23 | 4,5 | Cumple |
| Cancelado fg / bg | 12,02 | 4,5 | Cumple |
| Cobrado fg / bg | 8,41 | 4,5 | Cumple |
| **Servido** fg `#166534` / `surface` [1.2b] | 7,13 | 4,5 | Cumple |
| **Servido** fg `#166534` / `bg` (si la fila no tiene fondo propio) [1.2b] | 6,81 | 4,5 | Cumple |
| **Servido** fg `#166534` / `surface-muted` (fila pulsada) [1.2b] | 6,51 | 4,5 | Cumple |
| **Anulado** fg / bg (= Cancelado) [1.2b] | 12,02 | 4,5 | Cumple |
| Aviso fg / bg | 8,15 | 4,5 | Cumple |
| Blanco / `toast` | 17,85 | 4,5 | Cumple |
| Blanco / `offline` | 8,31 | 4,5 | Cumple |
| **No texto** (1.4.11): `border-strong` / `surface` | 4,76 | 3 | Cumple |
| `focus` / `surface` | 5,17 | 3 | Cumple |
| Borde retrasado `#dc2626` / `surface` | 4,83 | 3 | Cumple |
| Borde en preparación `#2563eb` / `surface` | 5,17 | 3 | Cumple |
| Borde listo `#16a34a` / `surface` | 3,30 | 3 | Cumple (justo) |
| Contorno de la insignia **Servido** `#16a34a` / `surface` (2 px, identifica el componente) [1.2b] | 3,30 | 3 | Cumple (justo) |
| Borde modificado `#7c3aed` / `surface` | 5,70 | 3 | Cumple |

Descartado [1.2b]: para Servido, contorno `#16a34a` sobre el fondo de Listo `#dcfce7` (3,00:1, en el límite exacto), y por eso la insignia de Servido no lleva relleno verde.
Descartado: `#64748b` como texto sobre `surface-muted` (4,34:1, **no cumple**). Por eso el texto de un producto agotado usa `text-secondary`, no un gris más claro. **No se usa opacidad** para deshabilitar: cambia el contraste de forma impredecible.

## 2. Tipografía

- Familia: pila del sistema `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif`. Sin descarga de fuentes (mejor LCP, sin parpadeo de texto).
- Cifras: `font-variant-numeric: tabular-nums` en precios, totales, cantidades, tiempos y números de pedido, para que las columnas se alineen y los totales no "bailen" al cambiar.
- Formato monetario: `7,40 €` (coma decimal, espacio fino antes de €, 2 decimales siempre). `Intl.NumberFormat('es-ES', {style:'currency', currency:'EUR'})`.
- Altura de línea: 1,5 para texto corrido; 1,2 para títulos y textos de barra.
- Tamaño mínimo de texto en todo el producto: **16 px** (salvo metadatos de 14 px en pantallas de gestión, nunca en sala ni barra).

| Token | Tamaño / línea | Peso | Uso |
|---|---|---|---|
| `--text-sm` | 14 / 20 | 400 | Metadatos en gestión (fechas de auditoría). No en sala ni barra |
| `--text-base` | 16 / 24 | 400 | Texto general, inputs, ayudas |
| `--text-lg` | 18 / 28 | 500 | Nombre de producto en botón, líneas del pedido |
| `--text-xl` | 20 / 28 | 600 | Botones principales, títulos de panel |
| `--text-2xl` | 24 / 32 | 700 | Título de pantalla, total del pedido |
| `--text-3xl` | 32 / 40 | 700 | **Cambio a devolver** (HU-04 exige >= 32), total en cobro |
| `--text-4xl` | 40 / 48 | 800 | Número de pedido en la confirmación de envío |
| `--text-bar-meta` | 24 / 32 | 600 | Barra: notas de línea, hora, minutos de espera, insignias, franjas de modificador |
| `--text-bar-item` | **38** / 44 | 700 | Barra: cantidad y nombre de producto [1.2b: pasa de 36 a 38 px, ver §2.1] |
| `--text-bar-title` | 40 / 48 | 800 | Barra: número de pedido y mesa/cliente |
| `--text-bar-action` | 28 / 32 | 800 | Barra: texto de los botones de 72 px (Empezar, Marcar listo, Entendido, Deshacer) [1.2b] |

### 2.1 Legibilidad a distancia en barra (cálculo) [actualizado 1.2b]

**Criterio (HU-03, supuesto 21):** altura de mayúscula >= 7 mm (unos 16 arcmin a 1,5 m) en el nombre de producto, la cantidad, el número de pedido y la mesa o cliente, en la pantalla de barra de 24" FHD (1920x1080) a zoom 100 %.

**Datos:**
- Tamaño de píxel de 24" 16:9 FHD: ancho = 609,6 mm x 16 / √(16² + 9²) = 531,3 mm, y 531,3 / 1920 = **0,2767 mm/px**.
- Altura de mayúscula de la fuente, como fracción del tamaño (`cap-height / em`), según la fuente que use `system-ui` en el equipo de barra: Ubuntu 0,693; **Segoe UI 0,700** (Windows); SF Pro 0,705; Roboto 0,711; Noto Sans 0,714; DejaVu Sans 0,729. Para el cálculo se toma la peor: **0,69**.
- Ángulo = atan(altura / 1500 mm).

| Tamaño | Mayúscula con 0,69 | Mayúscula con 0,70 (Segoe UI) | Ángulo a 1,5 m (0,69) | >= 7 mm |
|---|---|---|---|---|
| 24 px (`text-bar-meta`) | 4,58 mm | 4,65 mm | 10,5 arcmin | No (no se le exige, ver abajo) |
| 32 px | 6,11 mm | 6,20 mm | 14,0 arcmin | No |
| 36 px (valor anterior de `text-bar-item`) | 6,87 mm | **6,97 mm** | 15,8 arcmin | **No** con Ubuntu ni Segoe UI |
| **38 px (`text-bar-item`, nuevo)** | **7,26 mm** | 7,36 mm | 16,6 arcmin | **Sí** con todas |
| **40 px (`text-bar-title`)** | **7,64 mm** | 7,75 mm | 17,5 arcmin | **Sí** con todas |

**Resultado:** con 36 px el criterio de 7 mm solo se cumple si la fuente tiene `cap-height` >= 0,703 em (falla por 0,03-0,13 mm con Segoe UI y Ubuntu). Por eso `text-bar-item` sube a **38 px** con la misma altura de línea de 44 px: el presupuesto de alto de la tarjeta no cambia (ver `wireframes/04-cola-barra.md`) y el ancho útil pasa de unos 30 a unos 28 caracteres por línea. La equivalencia "36 px" que cita HU-03 queda en el límite; manda el criterio en mm (reportado al PO en `docs/estado.md`).

**Cómo se verifica (Testing, etapa 3):** a 1920x1080 y zoom 100 %, medir en el navegador la altura de mayúscula renderizada de cada texto obligado (p. ej. `canvas.measureText('H').actualBoundingBoxAscent` con la fuente calculada del elemento) y exigir **>= 25,3 px** (7 mm / 0,2767 mm). En la pantalla instalada, medir con regla una "H" mayúscula: >= 7 mm.

**Condiciones de instalación:** el sistema operativo de la pantalla de barra debe tener la escala de pantalla al 100 % y el navegador a zoom 100 %. Una pantalla mayor de 24" con 1920x1080 da píxeles más grandes (27" FHD: 0,311 mm/px) y cumple con más margen. Una pantalla de 24" con más resolución (QHD o 4K) solo cumple si la escala del sistema hace que 1 px CSS mida >= 0,2767 mm (QHD de 24" al 133 %, 4K de 24" al 200 %).

**Qué queda fuera del criterio de 7 mm:** notas de línea, hora, minutos de espera, insignias de estado, franjas de modificador (RETRASADO, MODIFICADO, CANCELADO) y etiquetas AÑADIDO/ELIMINADO, a 24 px (unos 11 arcmin, legibles a aprox. 1 m). Las insignias y franjas se refuerzan con color, icono y patrón de borde, que se distinguen a más distancia que el texto, y una línea ELIMINADA se ve tachada a 38 px. **Las notas no tienen refuerzo** y pueden cambiar la preparación ("sin lactosa"): he propuesto al PO incluirlas en el criterio (`docs/estado.md`). Mientras el PO no decida, el diseño las mantiene a 24 px.

## 3. Espaciado y retícula

Retícula de **8 px**. Se permite 4 px solo para separar icono y texto dentro de un componente.

| Token | Valor | Uso típico |
|---|---|---|
| `--space-0-5` | 4 px | Icono-texto |
| `--space-1` | 8 px | Separación mínima entre objetivos táctiles |
| `--space-2` | 16 px | Padding de tarjetas y botones, separación de rejilla |
| `--space-3` | 24 px | Separación entre grupos |
| `--space-4` | 32 px | Márgenes de pantalla en tablet/escritorio |
| `--space-6` | 48 px | Separación entre secciones |
| `--space-8` | 64 px | Altura de la barra superior |

Radios: `--radius-sm` 4 px (insignias), `--radius-md` 8 px (botones, inputs), `--radius-lg` 12 px (tarjetas, modales).
Sombras: solo `--shadow-overlay` (modales y bottom sheet); las tarjetas usan borde, no sombra.

Puntos de corte (los mismos de la revisión visual): **375 px** (móvil, solo uso de emergencia), **768 px** (tablet vertical), **1024 px** (tablet horizontal / TPV), **1440 px** (escritorio), **1920 px** (pantalla de barra).

## 4. Tamaños táctiles

| Token | Tamaño | Uso | Criterio que cubre |
|---|---|---|---|
| `--touch-min` | 48x48 px | Cualquier control (iconos, +/-, cerrar) | HU-01/02 (>= 44), WCAG 2.5.8 |
| `--touch-md` | 56 px de alto | Botones secundarios, pestañas de categoría, inputs | — |
| `--touch-lg` | 64 px de alto | Botón principal en sala; teclas del teclado de PIN e importe (64x64 o más) | HU-01 (>= 44) |
| `--touch-product` | mín. 120x88 px | Botón de producto (nombre + precio) | HU-02 (>= 44, nombre y precio visibles) |
| `--touch-bar` | 72 px de alto, mín. 160 px de ancho | Botones de barra (Empezar, Marcar listo, Entendido, Deshacer, Activar sonido) | HU-03 (>= 60x60) |

Separación mínima entre objetivos: 8 px (16 px en barra). Ningún control destructivo (Descartar, Cancelar pedido, Eliminar línea) se coloca junto al botón principal: va en el lado opuesto o detrás de un diálogo.

## 5. Componentes

Todos con estados: **reposo, hover (solo puntero), pulsado, foco visible, deshabilitado, cargando**. El foco siempre es visible (anillo `--color-focus` de 3 px), también en tablet con teclado externo.

### 5.1 Botones
| Variante | Aspecto | Uso |
|---|---|---|
| `primario` | Fondo `primary`, texto blanco, `text-xl`, alto `touch-lg` | Uno por pantalla: "Nuevo pedido", "Enviar a barra", "Confirmar cobro"... |
| `exito` | Fondo `success`, texto blanco | Solo el "Confirmar cobro" (sustituye al primario en esa pantalla, sigue siendo uno) |
| `secundario` | Fondo `surface`, borde `border-strong`, texto `text` | Acciones alternativas |
| `fantasma` | Sin borde, texto `primary` | Acciones terciarias ("Ver ticket") |
| `peligro` | Fondo `danger`, texto blanco | Solo dentro de diálogos de confirmación destructiva |
| `peligro-contorno` | Borde y texto `danger` | Lanzar una acción destructiva ("Descartar", "Cancelar pedido") |

- **Cargando:** el botón mantiene su tamaño, muestra un indicador giratorio y el texto en gerundio ("Enviando…", "Cobrando…") y queda **deshabilitado** hasta la respuesta. Así se evita el doble envío y el doble cobro (HU-02, HU-04).
- **Deshabilitado:** fondo `surface-muted`, texto `text-secondary`, borde `border` y `aria-disabled`. Si la razón no es obvia, un texto de ayuda la explica debajo ("Añade al menos un producto").

### 5.2 Botón de producto (toma de pedido)
- Mínimo 120x88 px, `surface`, borde `border-strong`, nombre `text-lg` (2 líneas como máximo, con puntos suspensivos y el nombre completo en `aria-label`), precio `text-base` en `text-secondary` con cifras tabulares.
- Si está en el pedido: insignia redonda con la cantidad ("×2") en `primary`, y borde de 2 px en `primary`.
- **Agotado:** fondo `surface-muted`, nombre tachado, insignia "AGOTADO" con el estilo de Aviso, `aria-disabled="true"`. No se puede añadir (HU-02, HU-05).
- **Modo "Marcar agotados":** los botones muestran un interruptor "Disponible / Agotado" y al tocarlos cambia la disponibilidad, no se añaden al pedido. Banner fijo de Aviso: "Modo agotados: toca un producto para cambiar su disponibilidad" + botón "Terminar".

### 5.3 Teclado numérico (PIN e importe)
- Rejilla 3x4, teclas de al menos 72x72 px (64 en 375 px), `text-2xl`, separación 8 px. Teclas: 1-9, borrar (icono + "Borrar"), 0 y la acción (Entrar / Aplicar).
- PIN: se muestran puntos (●) por dígito, nunca el dígito. También acepta el teclado físico.
- Importe: muestra el importe con formato € mientras se escribe. En el cobro hay teclas rápidas encima: "Exacto", "5 €", "10 €", "20 €", "50 €".

### 5.4 Inputs de formulario (gestión)
- Etiqueta visible siempre encima (nunca solo placeholder), asociada con `for`/`id`. Alto 56 px, `text-base`, borde `border-strong`.
- Obligatorio: "(obligatorio)" en texto en la etiqueta, no solo un asterisco.
- Ayuda bajo el campo en `text-secondary` con el rango válido ("Entre 0,01 y 999,99 €").
- **Error:** borde de 2 px `danger`, icono ⚠ y mensaje `danger` bajo el campo, enlazado con `aria-describedby`, y `aria-invalid="true"`. Al enviar un formulario con errores, el foco va al primer campo erróneo y arriba aparece un resumen con enlaces a cada campo.

### 5.5 Tarjeta de pedido (barra)
Ver wireframe `04-cola-barra.md`. Estructura fija: (1) franja de modificador opcional (RETRASADO / MODIFICADO / CANCELADO); (2) cabecera con número, mesa o cliente, hora y minutos de espera; (3) insignia de estado; (4) líneas: cantidad en negrita + nombre en `text-bar-item` (38 px), con la nota debajo en `text-bar-meta` y cursiva precedida de "Nota:"; las líneas añadidas llevan la etiqueta "AÑADIDO" y las eliminadas, tachado + "ELIMINADO"; (5) un único botón de acción `touch-bar` a todo el ancho. **Sin importes.**

### 5.6 Fila de pedido (sala) [actualizado 1.2b]
Número, mesa/cliente, hora de envío, insignia de estado de preparación, insignia "€ COBRADO" si el cobro está registrado, total con IVA y, a la derecha, el grupo de acciones. Toda la fila (mín. 72 px de alto) abre el detalle; cada acción es un objetivo táctil propio de 56 px de alto, separado 16 px de la siguiente.

| Preparación \ Cobro | Abierto | Cobrado |
|---|---|---|
| Pendiente / En preparación | `[Cobrar]` | (sin acciones; solo la insignia COBRADO) |
| Listo | `[✓✓ Servido]` `[Cobrar]` | `[✓✓ Servido]` |
| Servido | `[Cobrar]` | (no aparece en la lista) |

- "Servido" es un botón **secundario** (no rompe la regla de un solo primario: el primario de P-02 es "Nuevo pedido") con icono `check-check` y la etiqueta "Servido". Su `aria-label` es completo: "Marcar servido el pedido 42, mesa 7".
- "Servido" va a la izquierda de "Cobrar" y siempre en el mismo sitio, para que la posición no cambie entre filas con y sin cobro.
- Cuando un pedido está esperando la respuesta del servidor, el botón pasa a "Guardando…" y se deshabilita (contra el doble toque).

### 5.6b Pestañas de la lista de sala [1.2b]
Mismo componente que §5.8 (56 px, la activa con fondo `primary` y subrayado de 4 px): "Pedidos activos (N)" y "Cobrados hoy". Cambiar de pestaña = 1 toque (HU-04).

### 5.7 Insignia de estado
Texto en mayúsculas `text-base` (`text-bar-meta` en barra), peso 700, icono a la izquierda, colores de la tabla 1.2, `radius-sm`, padding 4x8 px.

### 5.8 Pestañas de categoría
Fila horizontal desplazable (vertical en el lateral si es horizontal y caben). Alto 56 px. La activa: fondo `primary`, texto blanco y subrayado de 4 px (no solo color). Cambiar de categoría = 1 toque (HU-02). `role="tablist"`, navegables con flechas.

### 5.9 Modal / diálogo
- Centrado (bottom sheet en < 768 px), `radius-lg`, ancho máx. 560 px, fondo atenuado.
- Título que describe la acción ("¿Cancelar el pedido 42?"), cuerpo con el impacto (importe, líneas) y botones con verbo: el destructivo a la derecha con texto explícito ("Cancelar pedido") y el de salida a la izquierda ("Volver"). No se usan "Sí/No".
- Foco atrapado, Escape cierra (equivale a "Volver"), al cerrar el foco vuelve al disparador.

### 5.10 Avisos
- **Toast** (`toast`): éxito o información, no bloquea, se muestra al menos 3 s (5 s por defecto), `role="status"`. Ej.: "Pedido 42 enviado a barra".
- **Toast con acción** [actualizado 1.2b]: "Pedido 42 servido · Deshacer (27 s)" en sala. Botón "Deshacer" de 56 px (secundario invertido: borde y texto blancos sobre `toast`, contraste 17,85:1) y cuenta atrás visible en texto; el toast dura lo que dure la ventana de deshacer (30 s) y no tapa el foco (WCAG 2.4.11: se coloca abajo y la lista reserva su alto con padding inferior). Solo hay **un** "Deshacer" a la vez: la acción nueva sustituye a la anterior (HU-03: "solo la última acción").
- **Zona Deshacer de barra** [1.2b]: no es un toast, es una zona fija de la barra superior de P-05 (ver wireframe). Muestra "Pedido 41 empezado" o "Pedido 39 listo" + botón `touch-bar` "↶ DESHACER · 27 s". Al terminar los 30 s o si sala marca "Servido", el botón desaparece y la zona muestra 5 s el motivo ("Pedido 39 ya servido: no se puede deshacer").
- **Error en línea** (bloque `danger` con icono) junto a la acción que falla: "No se ha podido enviar, reintenta" + botón "Reintentar". `role="alert"`.
- **Banner de conexión** fijo arriba, `offline`: "⚠ Sin conexión. Reintentando…" (HU-03: visible en <= 5 s). Al recuperarse, cambia 3 s a "Conexión recuperada" en estilo Listo.

### 5.10b Diálogo de PIN del encargado: autorización y reconfirmación [1.2b] (HU-06, supuesto 22, SEC-007, `docs/seguridad.md` §6.1 y §6.3)
Componente reutilizable con dos variantes:

| Variante | Cuándo | Quién escribe el PIN |
|---|---|---|
| **Autorización** | Acción de HU-06 (quitar líneas o cancelar un pedido no Pendiente) pedida desde una sesión de camarero/cajero | Un encargado que elige su nombre en la tablet del camarero |
| **Reconfirmación** (SEC-007) | Desde una sesión de encargado: anular un cobro (HU-04) y toda escritura en Personal (alta, cambio de rol, activar/desactivar, restablecer PIN, desbloquear; HU-07) | El propio encargado de la sesión; su nombre va fijo |

Con una sesión de encargado, las acciones de HU-06 **no** muestran el diálogo (supuesto 22, confirmado por Cybersecurity). Un camarero/cajero nunca llega a la reconfirmación porque no tiene esas acciones.

Estructura fija:
1. **Título con la acción concreta**: "Autorizar: quitar 1 × Zumo naranja del pedido 42", "Confirma con tu PIN: anular el cobro de las 10:41 (12,60 €)" o "Confirma con tu PIN: desbloquear a Lucía". Quien escribe el PIN ve qué aprueba.
2. **Contexto** (solo en autorización): Aviso "⚠ El pedido está en preparación: la línea puede estar ya preparada" (o "ya servida").
3. **Encargado**: en autorización, con un solo encargado activo, texto fijo "Encargado: Marta" (preseleccionado). Con 2 o más, botones de opción de 56 px, uno por encargado (no una lista desplegable: es 1 toque y se ven todos), **sin preselección**, y el teclado se habilita al elegir uno (`role="radiogroup"`, etiqueta "Encargado que autoriza"). En reconfirmación, siempre texto fijo con el usuario de la sesión.
4. **PIN**: etiqueta visible "PIN de Marta (6 dígitos)" (los encargados tienen exactamente 6 dígitos, `seguridad.md` §6.1.1), 6 indicadores ● y el teclado de §5.3 (72 px). El botón de acción se habilita con 6 dígitos.
5. **Zona de mensaje** bajo el PIN (`role="alert"` para errores).
6. Botones: "Volver" (secundario, izquierda) y el verbo de la acción a la derecha ("Autorizar y quitar", "Autorizar y cancelar pedido", "Confirmar y anular cobro", "Confirmar y desbloquear"), en estilo primario o de peligro según la acción.

Tras cualquier respuesta, el PIN se vacía de la pantalla y de la memoria del cliente (RS-29b). El cambio pendiente **nunca** se pierde por un error: solo se descarta con "Volver".

**Mensajes de error y bloqueo** (política de `docs/seguridad.md` §6.1: bloqueo progresivo 5/15/60 min y después indefinido, límite por sesión y por dispositivo; códigos de `docs/arquitectura.md` §5). En la autorización (HU-06) el servidor **no** distingue un encargado bloqueado de un PIN incorrecto (`403` genérico, RS-04), así que la interfaz tampoco puede hacerlo. Los tiempos los da el servidor (`retryAfterSeconds` o `Retry-After`); la cuenta atrás se muestra como "N min", con los minutos restantes redondeados hacia arriba (con 4 min 1 s, "5 min"; nunca "0 min"; interpretación I-03 de `docs/testing.md`) [1.2c], y el lector de pantalla la anuncia al aparecer y cada minuto, no cada segundo.

| Respuesta del servidor | Variante | Mensaje (junto al PIN) | Teclado y botones |
|---|---|---|---|
| `403 MANAGER_APPROVAL_INVALID` (PIN incorrecto; también si el encargado está bloqueado, desactivado o con PIN provisional: error genérico idéntico, RS-04) | Autorización | "⚠ PIN de encargado incorrecto" (texto de HU-06). Desde el 2.º fallo seguido en el diálogo se añade la ayuda: "Si estás seguro del PIN, inicia sesión con tu usuario para comprobar si tu cuenta está bloqueada." | Activo; PIN vaciado; foco en el primer dígito |
| `429` por sesión (5 aprobaciones fallidas en 10 min) | Autorización | "🔒 Demasiados intentos. Espera 10 min." (texto de HU-06/CA-F19) | Deshabilitado para todos los encargados; "Volver" activo |
| `429` por dispositivo (10 fallos en 10 min) | Las dos | "🔒 Demasiados intentos desde este dispositivo. Espera 9 min." (mismo texto que el login, HU-01) | Deshabilitado; "Volver" activo |
| `403 PIN_CONFIRMATION_INVALID` | Reconfirmación | "⚠ PIN incorrecto. No se ha hecho ningún cambio." + "Cuenta para el bloqueo de tu usuario." | Activo; PIN vaciado |
| `423 LOCKED` (bloqueo temporal de 5, 15 o 60 min) del encargado de la sesión [1.2c] | Reconfirmación | "🔒 Cuenta bloqueada. Espera 5 min." (texto de HU-01/CA-F12; minutos redondeados hacia arriba, I-03) + "No se ha hecho ningún cambio." El servidor lo rechaza sin comprobar el PIN y **no** cuenta como fallo. El intento que **activa** el bloqueo muestra el mensaje normal de PIN incorrecto (fila anterior); este aparece en el siguiente | Teclado y botón de acción deshabilitados con la cuenta atrás; "Volver" activo; **lo escrito se conserva** (motivo de anulación, formulario de Personal). Al terminar el bloqueo se habilitan solos (HU-01/CA-F12 d) |
| `423 ACCOUNT_LOCKED_MANUAL` del encargado de la sesión (20 fallos) [1.2c] | Reconfirmación | No hay mensaje en el diálogo: el servidor revoca **todas** sus sesiones y el dispositivo vuelve a P-01 con "Cuenta bloqueada. Pide al encargado que la desbloquee." (HU-01/CA-F13; `wireframes/01-login.md`, "Vuelta al inicio de sesión") | Lo escrito se pierde (HU-01/CA-F13) |
| Sin conexión / `5xx` | Las dos | "No se ha podido comprobar el PIN. No se ha hecho ningún cambio. · Reintentar" (no cuenta como intento) | Activo |
| `409` el pedido o el cobro ha cambiado | Las dos | Se cierra el diálogo y se muestra el aviso de conflicto de la pantalla; la aprobación no se usa | — |
| Correcto | Las dos | Se cierra el diálogo y se aplica la acción; toast con el resultado y, en autorización, "· autorizado por Marta" | — |

Los iconos 🔒 y ⚠ son `lock` y `triangle-alert` de Lucide. Bloqueo = bloque de estilo Aviso; error = texto `danger`. Los dos llevan texto, así que nunca dependen solo del color.

### 5.11 Barra superior (en todas las pantallas)
64 px. Izquierda: título de la pantalla, que es el **único `h1`** de la página [2.1d] ("Pedidos", "Cola", "Menú", "Personal", "Resumen del día", "Acceso denegado"; los contadores como "· 7" van fuera del `h1`). El título del documento es "<h1> · Café · Toma de pedidos" (WCAG 2.4.2) y, en cada cambio de pantalla de la SPA, el foco pasa al `h1` (`tabindex="-1"`) para que el lector de pantalla lo anuncie (2.4.3). Derecha: **"Lucía · Camarero"** (nombre y rol en texto, HU-01) y el botón "Cerrar sesión" (icono + texto, 48 px). El encargado tiene además el botón "Menú de gestión". En barra se añaden el interruptor de sonido ("Sonido: activado" / "Sonido: desactivado") y el indicador de conexión. [1.2c] Si el navegador bloquea el audio con el sonido activado, el interruptor se sustituye por el texto "🔇 Sonido bloqueado" y el botón `touch-bar` "Activar sonido" (72 px de alto, >= 160 px de ancho, fondo de Aviso) hasta que se pulse (HU-03/CA-F14; detalle en `wireframes/04-cola-barra.md`). Si la pantalla no puede mantenerse encendida (Wake Lock rechazado o no disponible), aviso "⚠ La pantalla puede apagarse" en la zona de estado (HU-03/CA-N05). Los avisos de la barra superior nunca reducen el alto de las tarjetas.

### 5.12 Estados vacío, cargando y error (obligatorios en cada lista)
| Estado | Patrón |
|---|---|
| Vacío | Icono + frase que explica + la acción principal. Ej. cola: "No hay pedidos en cola. Los nuevos aparecerán aquí solos." |
| Cargando | Esqueleto con la forma del contenido final (sin spinner a pantalla completa); si tarda más de 1 s, texto "Cargando pedidos…" |
| Error | Bloque de error en línea con causa y "Reintentar"; el contenido anterior se mantiene visible si existe |
| Éxito | Toast con el resultado y el identificador ("Pedido 42 cobrado") |

### 5.13 Estado "Acceso denegado" [2.1d] (HU-01/CA-F04; `docs/arquitectura.md` §5.2)
Lo muestra la guarda de ruta dentro de la layout normal cuando la sesión no tiene el permiso de la ruta, o cuando una pantalla montada recibe `403 FORBIDDEN`. No monta la pantalla pedida ni cambia la URL. Wireframe y textos: `wireframes/10-acceso-denegado.md`.

| Parte | Especificación |
|---|---|
| Barra superior | La de §5.11, con `h1` "Acceso denegado", nombre y rol, "Cerrar sesión" (y "Gestión" si es encargado) |
| Bloque | Centrado, ancho máx. 560 px, `space-8` (64 px) desde la barra; a 375 px, a todo el ancho con 16 px de margen |
| Icono | `lock` de Lucide, 48 px, `text-secondary`, `aria-hidden` |
| Texto 1 | "No tienes permiso para ver esta pantalla." · `text-lg`, `text` (17,06:1 sobre `bg`) |
| Texto 2 | "Si la necesitas, pide al encargado que revise tu rol." · `text-base`, `text-secondary` (7,24:1 sobre `bg`) |
| Acción | Enlace con estilo `primario` (único primario), `touch-lg`, ancho mín. 240 px: "Ir a Pedidos" (camarero/cajero, encargado) o "Ir a la cola" (barra) |
| Foco | Al `h1` al mostrarse; después, Tab: barra superior → acción |

El texto "Acceso denegado" aparece **una sola vez** en la página (el `h1`): ni el bloque ni una región `aria-live` lo repiten.

## 6. Movimiento y sonido
- Transiciones <= 200 ms; con `prefers-reduced-motion` se desactivan. Nada parpadea más de 3 veces por segundo (WCAG 2.3.1).
- La tarjeta nueva en barra entra con un resaltado de 2 s en el borde, sin animaciones de desplazamiento que muevan otras tarjetas mientras se tocan.
- Sonido de pedido nuevo en barra, desactivable desde la barra superior; el estado del sonido se muestra en texto. [1.2c] La preferencia (activado o desactivado) se guarda **en el dispositivo** (almacenamiento local del navegador, sin datos personales) y se conserva al recargar y al volver a iniciar sesión con cualquier usuario; la primera vez que se abre la cola en un dispositivo, está activado (HU-03/CA-F09). Nota técnica para el Developer: los navegadores bloquean el audio sin una interacción previa; el inicio de sesión en barra la proporciona, pero una recarga no, y entonces aplica "Sonido bloqueado" (HU-03/CA-F14).

## 7. Accesibilidad (objetivo: WCAG 2.2 AA)
- Contraste: tabla 1.3. Zoom al 200 % sin pérdida de funciones en las pantallas de gestión.
- Teclado: todo es operable con Tab/Shift+Tab/Enter/Espacio/Escape; el orden de foco sigue el orden visual. Reordenar menú con botones "Subir/Bajar" además de arrastrar (WCAG 2.5.7).
- Sin gestos complejos: nada exige pulsación larga, deslizar ni doble toque.
- Formularios: etiqueta visible y asociada; errores con `aria-invalid` y `aria-describedby`.
- Cambios en vivo: cola de barra con `aria-live="polite"` resumido ("Nuevo pedido 43, mesa 7"); errores con `role="alert"`.
- Idioma `lang="es"`.

## 8. Script de verificación de contraste

```python
def L(h):
    h=h.lstrip('#'); r=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    r=[c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4 for c in r]
    return 0.2126*r[0]+0.7152*r[1]+0.0722*r[2]
def ratio(a,b):
    x,y=sorted([L(a),L(b)],reverse=True); return (x+0.05)/(y+0.05)
print(round(ratio('#1e3a8a','#dbeafe'),2))  # 8.49
```
