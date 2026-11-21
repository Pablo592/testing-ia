# Design system — Toma de pedidos (cafetería)

Autor: UX/UI Designer · Etapa 1, tarea 1.2 · Fecha: 2026-11-21
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
| **Retrasado** (se suma al estado) | `#7f1d1d` | `#fee2e2` | `#dc2626` | ⚠ (triángulo) | RETRASADO · 12 min | 6 px **discontinuo** + franja superior |
| Modificado | `#4c1d95` | `#ede9fe` | `#7c3aed` | ✎ | MODIFICADO | franja superior |
| Cancelado | `#0f172a` | `#cbd5e1` | `#0f172a` | ✕ | CANCELADO | contenido tachado + franja |
| Cobrado (solo sala) | `#134e4a` | `#ccfbf1` | — | € | COBRADO | — |
| Aviso | `#78350f` | `#fef3c7` | — | ⚠ | (texto del aviso) | — |

"Retrasado" no es un estado del pedido sino un **modificador**: la tarjeta sigue mostrando PENDIENTE o EN PREPARACIÓN y además lleva la franja "⚠ RETRASADO · N min". Así se cumple HU-03 (icono y texto, no solo color).

Los iconos son de una librería (Lucide en shadcn/ui: `circle`, `circle-dashed`/`loader`, `check`, `triangle-alert`, `pencil`, `x`, `euro`); los símbolos de esta tabla solo los representan en los wireframes. Los iconos son decorativos (`aria-hidden`) porque el texto de la etiqueta siempre está presente.

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
| Aviso fg / bg | 8,15 | 4,5 | Cumple |
| Blanco / `toast` | 17,85 | 4,5 | Cumple |
| Blanco / `offline` | 8,31 | 4,5 | Cumple |
| **No texto** (1.4.11): `border-strong` / `surface` | 4,76 | 3 | Cumple |
| `focus` / `surface` | 5,17 | 3 | Cumple |
| Borde retrasado `#dc2626` / `surface` | 4,83 | 3 | Cumple |
| Borde en preparación `#2563eb` / `surface` | 5,17 | 3 | Cumple |
| Borde listo `#16a34a` / `surface` | 3,30 | 3 | Cumple (justo) |
| Borde modificado `#7c3aed` / `surface` | 5,70 | 3 | Cumple |

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
| `--text-bar-meta` | 24 / 32 | 600 | Barra: notas de línea, hora, minutos de espera |
| `--text-bar-item` | 36 / 44 | 700 | Barra: cantidad y nombre de producto |
| `--text-bar-title` | 40 / 48 | 800 | Barra: número de pedido y mesa/cliente |

### 2.1 Legibilidad a distancia en barra (cálculo)

HU-03 pide "legible a 1,5 m: mínimo 18 px en pantalla de 15 pulgadas o mayor". He comprobado el tamaño físico (pantalla 1920x1080 a zoom 100 %, altura de mayúscula aprox. 0,72 em):

| Pantalla FHD | Tamaño de píxel | 18 px: mayúscula / ángulo a 1,5 m | 36 px: mayúscula / ángulo a 1,5 m |
|---|---|---|---|
| 15" | 0,173 mm | 2,2 mm / 5 arcmin | 4,5 mm / 10 arcmin |
| 21,5" | 0,248 mm | 3,2 mm / 7 arcmin | 6,4 mm / 15 arcmin |
| 24" | 0,277 mm | 3,6 mm / 8 arcmin | 7,2 mm / 16 arcmin |

La referencia habitual de ergonomía de pantallas (ISO 9241-303) pide unos **16 arcmin como mínimo** (20-22 recomendado) de altura de carácter para lectura. **18 px en 15" se queda en unos 5 arcmin, la tercera parte de ese mínimo.** Por eso:

- El diseño usa **36 px** para productos y **40 px** para el número de pedido y la mesa (el doble de lo que pide la historia, así que también cumple el criterio literal).
- Con 36 px, la lectura a 1,5 m cumple el mínimo ergonómico en una pantalla de **24" FHD**. En 15" cumple a aprox. 1 m. Lo he reportado al PO en `docs/estado.md` para que reformule el criterio (en mm o en ángulo, junto con el tamaño de pantalla).

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
| `--touch-bar` | 72 px de alto, mín. 160 px de ancho | Botones de barra (Empezar, Marcar listo, Entendido, Deshacer) | HU-03 (>= 60x60) |

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
Ver wireframe `04-cola-barra.md`. Estructura fija: (1) franja de modificador opcional (RETRASADO / MODIFICADO / CANCELADO); (2) cabecera con número, mesa o cliente, hora y minutos de espera; (3) insignia de estado; (4) líneas: cantidad en negrita + nombre en `text-bar-item`, con la nota debajo en `text-bar-meta` y cursiva precedida de "Nota:"; las líneas añadidas llevan la etiqueta "AÑADIDO" y las eliminadas, tachado + "ELIMINADO"; (5) un único botón de acción `touch-bar` a todo el ancho. **Sin importes.**

### 5.6 Fila de pedido (sala)
Número, mesa/cliente, hora, insignia de estado (incluida LISTO, destacada arriba), total y botón "Cobrar". Toda la fila (mín. 72 px de alto) abre el detalle; "Cobrar" es un objetivo táctil propio de 56 px, separado 16 px.

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
- **Toast con acción**: "Pedido 42 marcado listo · Deshacer (27 s)" en barra, con la cuenta atrás visible.
- **Error en línea** (bloque `danger` con icono) junto a la acción que falla: "No se ha podido enviar, reintenta" + botón "Reintentar". `role="alert"`.
- **Banner de conexión** fijo arriba, `offline`: "⚠ Sin conexión. Reintentando…" (HU-03: visible en <= 5 s). Al recuperarse, cambia 3 s a "Conexión recuperada" en estilo Listo.

### 5.11 Barra superior (en todas las pantallas)
64 px. Izquierda: título de la pantalla. Derecha: **"Lucía · Camarero"** (nombre y rol en texto, HU-01) y el botón "Cerrar sesión" (icono + texto, 48 px). El encargado tiene además el botón "Menú de gestión". En barra se añaden el interruptor de sonido ("Sonido: activado") y el indicador de conexión.

### 5.12 Estados vacío, cargando y error (obligatorios en cada lista)
| Estado | Patrón |
|---|---|
| Vacío | Icono + frase que explica + la acción principal. Ej. cola: "No hay pedidos en cola. Los nuevos aparecerán aquí solos." |
| Cargando | Esqueleto con la forma del contenido final (sin spinner a pantalla completa); si tarda más de 1 s, texto "Cargando pedidos…" |
| Error | Bloque de error en línea con causa y "Reintentar"; el contenido anterior se mantiene visible si existe |
| Éxito | Toast con el resultado y el identificador ("Pedido 42 cobrado") |

## 6. Movimiento y sonido
- Transiciones <= 200 ms; con `prefers-reduced-motion` se desactivan. Nada parpadea más de 3 veces por segundo (WCAG 2.3.1).
- La tarjeta nueva en barra entra con un resaltado de 2 s en el borde, sin animaciones de desplazamiento que muevan otras tarjetas mientras se tocan.
- Sonido de pedido nuevo en barra, desactivable desde la barra superior; el estado del sonido se muestra en texto. Nota técnica para el Developer: los navegadores bloquean el audio sin una interacción previa, y el inicio de sesión en barra la proporciona.

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
