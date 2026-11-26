# ADR-007: Proxy inverso, TLS y puertos 80/443

- **Estado:** Propuesto (pendiente de la puerta de la Etapa 1 y de Infrastructure)
- **Fecha:** 2026-11-21
- **Autor:** Software Engineer

## Contexto

- Los PIN y la cookie de sesión viajan por la Wi-Fi del local: hace falta
  **HTTPS** (cookie `Secure`, ADR-005). La Wake Lock API para la pantalla de
  barra también exige contexto seguro.
- SSE se beneficia de **HTTP/2** (sin límite de 6 conexiones por origen).
- Política de contenedores (sección 3.4/3.6): nada como root, puertos > 1024;
  80/443 solo mediante proxy hacia puertos > 1024 o ajustando
  `net.ipv4.ip_unprivileged_port_start`, documentado en un ADR.
- Aún no se sabe si PROD será un equipo en el propio local o una VM en internet
  (pregunta 11 del README; Terraform sugiere una VM).

## Opciones consideradas

1. **TLS en Node directamente:** mezcla responsabilidades, gestión manual de
   certificados.
2. **Nginx como proxy:** maduro, pero certificados manuales o con un contenedor
   extra (certbot).
3. **Caddy como proxy:** HTTPS automático (ACME con dominio real, o CA interna
   `tls internal` en red local), HTTP/2 por defecto, no almacena en búfer SSE,
   configuración de pocas líneas.

Para 80/443:
a. Publicar solo 8443 (y 8080) en el host: sin cambios en el host, pero la URL
   lleva puerto (`https://caja.local:8443`); aceptable en tablets con acceso
   directo guardado.
b. `net.ipv4.ip_unprivileged_port_start=80` en el host: URLs limpias; es un
   cambio de sistema que se hace una vez al aprovisionar (Terraform/cloud-init),
   no desde los contenedores.

## Decisión

- **Caddy** (imagen oficial, sin modificar, `Caddyfile` montado en solo lectura)
  como único servicio publicado al host. Dentro del contenedor escucha en
  **8443** (HTTPS) y **8080** (redirección a HTTPS). Reenvía todo a `app:3000`
  por la red interna; no expone `/healthz` ni `/readyz` (responde `404`) y no
  enruta el puerto interno de métricas 9464 de `app` (revisión 2026-11-21,
  hallazgos M-01/M-02). Genera `X-Request-Id` por petición (M-04).
- **Certificados:**
  - PROD en VM con dominio: ACME automático (Let's Encrypt).
  - PROD/DEMO en red local sin dominio: `tls internal`; la CA raíz de Caddy se
    instala una vez en cada dispositivo (procedimiento de Infrastructure).
- **Puertos del host:**
  - DEV: sin proxy; Vite y la API en `localhost` (contexto seguro para el
    navegador).
  - TESTING/DEMO: se publican 8080/8443 tal cual (opción a).
  - PROD: opción b, `ip_unprivileged_port_start=80` aplicado por Terraform /
    cloud-init al crear el host; los contenedores siguen sin capacidades.
- Cabeceras de seguridad (HSTS, CSP, `X-Content-Type-Options`, etc.) en Caddy;
  la lista exacta la define Cybersecurity.

## Consecuencias

- (+) HTTPS sin gestión manual de certificados; HTTP/2 para SSE.
- (+) La app solo habla HTTP interno; el proxy es reemplazable.
- (−) En red local con CA interna hay un paso manual por dispositivo (instalar la
  CA raíz); si no se hace, los navegadores mostrarán avisos.
- (−) Modificar el sysctl en PROD baja el umbral de puertos privilegiados para
  todos los usuarios del host: aceptable en un host dedicado; lo valida
  Cybersecurity.
- La imagen oficial de Caddy se ejecuta con `--user` ≥ 1000 y volumen `/data`
  propiedad de ese UID.

## Revisión 2026-11-21 (tarea 1.3b, decisiones de Cybersecurity §6.2)

- **Condición de despliegue (SEC-002, bloqueante):** el login y la API **nunca**
  son alcanzables desde internet ni desde la Wi-Fi de clientes. PROD en el
  local: Wi-Fi del personal separada (SSID/VLAN, WPA2-AES/WPA3) y cortafuegos
  del host que solo admite 80/443 (u 8080/8443) desde la subred del personal.
  PROD en VM: lista blanca de la IP fija del local o túnel WireGuard; sin una de
  las dos no se despliega. Infrastructure lo documenta como requisito previo en
  `docs/infraestructura.md`; Cybersecurity lo verifica (RS-41).
- **TLS:** solo 1.2/1.3; `:8080` solo `308` a HTTPS. Cabeceras: lista RS-26.
- **`ip_unprivileged_port_start`:** solo valor exacto **80** y solo en host
  dedicado; si no lo es, se usa la opción (a) o una redirección `nftables`
  443→8443 / 80→8080 del aprovisionamiento.
- La red rootless debe conservar la IP de origen (SEC-003, Infrastructure) y
  `app` solo confía en `X-Forwarded-For` de `proxy` (necesario para el límite
  por IP de ADR-005).
- Si la imagen oficial de Caddy no arranca con `cap-drop=ALL` por su capacidad
  de fichero (SEC-009), se usa una imagen derivada mínima sin capacidades
  (Infrastructure); "sin modificar" deja de aplicarse en ese caso.

## Revisión 2026-11-26 (tarea 2.2c)

La decisión (Caddy como único servicio publicado, TLS y puertos) **no
cambia**. Dos ajustes:
- **Imagen derivada mínima** (`localhost/mi-app-proxy`, SEC-055): no por
  SEC-009 (la oficial arranca sin capacidades), sino para aplicar `apk
  upgrade` a paquetes Alpine con CVE corregida. Lleva el **mismo** binario
  `/usr/bin/caddy` que la oficial (sha256 comprobado en el build) y `USER
  1000:1000`. Detalle en `docs/infraestructura.md` §8.
- **Publicación solo por IPv4 en DEMO y PROD** (SEC-043): los puertos de
  Caddy (o el `.socket` de la activación por socket, SEC-003) se publican en
  direcciones IPv4 y el nombre que usan los dispositivos resuelve solo a
  IPv4. El límite por IP de ADR-005 agrupa las IPv6 por /64, y en una Wi-Fi
  IPv6 todo el personal compartiría el mismo cupo. Si el local solo tuviera
  IPv6, se decide con Cybersecurity antes de DEMO.
