# ADR-002: Frontend

- **Estado:** Propuesto (pendiente de la puerta de la Etapa 1)
- **Fecha:** 2026-11-21
- **Autor:** Software Engineer

## Contexto

Los usuarios usan **tablets de 10"**, una **pantalla táctil de barra de 15"+**,
el TPV del mostrador u un ordenador (README). Necesidades de las historias que
condicionan la tecnología:

- Total actualizado en ≤ 200 ms tras cada toque (HU-02): cálculo local.
- Borrador del pedido que no se pierde si falla la red al enviar (HU-02).
- Actualización en tiempo real sin recargar (HU-03, HU-05) y aviso "Sin conexión"
  en ≤ 5 s (HU-03).
- Vistas distintas por rol; aviso sonoro; uso táctil con botones grandes.
- No hay requisito de app nativa, ni de tiendas de aplicaciones, ni offline.

## Opciones consideradas

1. **App nativa / híbrida (Flutter, React Native):** instalación en cada
   dispositivo, distribución y actualizaciones más costosas; no aporta nada que
   pidan las historias.
2. **HTML renderizado en servidor + htmx (con extensión SSE):** muy poco JS, pero
   el borrador local, el total instantáneo y el vigilante de conexión acaban
   necesitando JS propio; la lógica compartida en TypeScript se aprovecha peor.
3. **SPA React + Vite + TypeScript:** estado local rico (borrador, totales),
   reutiliza `packages/shared` (ADR-001), ecosistema muy amplio y fácil de
   probar (Vitest, Playwright).
4. **SPA Svelte/Vue:** técnicamente equivalentes para este caso; menor
   ecosistema de componentes accesibles y menos conocimiento común que React.

## Decisión

**SPA con React + Vite + TypeScript**, servida como archivos estáticos por el
propio backend (mismo origen, sin CORS), detrás del proxy (ADR-007).

- Enrutado con React Router; vista inicial según rol tras el login (HU-01).
- Estado del servidor con TanStack Query; los eventos SSE (ADR-004) actualizan
  o invalidan su caché.
- Borrador del pedido en estado local + `localStorage` del dispositivo.
- Componentes propios según `docs/ux/design-system.md` (cuando exista); sin
  librería de UI pesada salvo que UX lo justifique.
- Sin service worker ni modo offline (fuera de alcance).

## Consecuencias

- (+) Cero instalación: cualquier navegador moderno vale; actualizar = desplegar.
- (+) Tipos y reglas compartidos con el servidor.
- (−) Más JS que un enfoque htmx; se mantiene acotado (sin librerías de estado
  globales adicionales).
- (−) Funciones del navegador que necesita UX (Wake Lock para que la pantalla de
  barra no se apague, audio) requieren **HTTPS** y, el audio, un gesto previo
  del usuario: el inicio de sesión en barra cuenta como gesto, pero tras una
  recarga del navegador puede hacer falta un toque "Activar sonido".
- En DEV, Vite sirve la SPA con recarga en caliente y redirige `/api` al backend.
