# Reglas del equipo

Todos los agentes deben leer y cumplir este documento.

## 1. Reglas generales

- Los agentes se comunican mediante **archivos en `docs/`**, no de memoria. Antes
  de trabajar, lee tus documentos de entrada. Al terminar, escribe tu salida en
  el documento indicado.
- Todo hallazgo, rechazo o pedido de cambio debe ser **concreto**: archivo, línea,
  test que falla, criterio incumplido o captura. "No me gusta" o "se podría
  mejorar" no son hallazgos válidos.
- Cada agente trabaja **solo en su especialidad**. Si detectas un problema de otra
  área, lo reportas en `docs/estado.md` indicando el agente responsable; no lo
  corriges tú.
- **Retroceso de etapa:** cualquier agente puede pedir volver a la etapa del
  Software Engineer (o del UX Designer si es un problema de diseño), con un
  motivo concreto y una propuesta de mejora. **Máximo 3 ciclos por
  funcionalidad**; al cuarto, decide el humano.
- Nunca guardar secretos (contraseñas, tokens, claves) en el código ni en `docs/`.
- Acciones irreversibles o con coste (`terraform apply` en prod, borrar datos,
  desplegar en prod) requieren **siempre aprobación humana**.
- Las puertas entre etapas las aprueba el humano.
- **Contenedores en todo el ciclo de vida. Nada corre como root, en ningún
  entorno** (ver sección 3).

## 2. Documentos compartidos

| Ruta | Responsable |
|---|---|
| `docs/estado.md` | Orquestador |
| `docs/historias/` | Product Owner |
| `docs/ux/flujos.md`, `docs/ux/wireframes/`, `docs/ux/design-system.md`, `docs/ux/revision.md` | UX Designer |
| `docs/arquitectura.md`, `docs/decisiones/` (ADRs) | Software Engineer |
| `docs/seguridad.md`, `docs/permisos.md` | Cybersecurity (permisos junto con Developer) |
| `docs/infraestructura.md` | Infrastructure |
| `docs/testing.md` | Testing |
| `docs/logging.md` | Monitoring |
| `docs/especificacion/` | Todos (etapa Demo) |

## 3. Política de contenedores (rootless)

**Por qué:** si el motor corre como root, quien pueda usarlo es root en la
práctica (incluidos los agentes). Si el proceso del contenedor es root, escapar
del contenedor da root en el host.

### 3.1 Motor
- Podman rootless (recomendado) o Docker rootless.
- Prohibido usar `sudo` con podman/docker.
- **Compose: usar siempre `podman-compose`** (ej. `podman-compose -f compose.dev.yaml up -d`).
  No usar `podman compose` (puede delegar en el `docker-compose` de Docker) ni
  `docker compose` / `docker-compose`: en esta máquina también está instalado
  Docker con daemon root, y esos comandos podrían terminar hablando con él.
- No usar el comando `docker` en este proyecto; el motor es Podman.

### 3.2 Construcción
- Con Podman/Buildah rootless (o BuildKit rootless). En CI: Buildah o Kaniko.
  Nunca montar `/var/run/docker.sock`.
- Dockerfile multi-stage: la imagen final contiene solo lo necesario.
- Imagen base mínima (alpine, distroless, slim) con versión fija por digest.
- **Rust:** compilar en una etapa con la imagen oficial de Rust y copiar solo el
  binario a una imagen final distroless o scratch. Sin shell ni gestor de
  paquetes en la imagen final.
- Sin secretos en la imagen ni en los build args.

### 3.3 Imagen
- `USER` sin privilegios (UID >= 1000), archivos con `--chown` de ese usuario.
- Puertos > 1024. `HEALTHCHECK` definido.
- Escaneo con Trivy o Grype en cada build: sin vulnerabilidades críticas/altas.

### 3.4 Ejecución (obligatorio, o su equivalente en compose)
```
--user 1000:1000
--cap-drop=ALL                    # añadir solo las imprescindibles
--security-opt=no-new-privileges
--read-only --tmpfs /tmp
--memory=<límite> --cpus=<límite>
```
**Prohibido:** `--privileged`, montar el socket de Docker/Podman, `--network=host`
y montar directorios del sistema (`/`, `/etc`, `/var`, `/proc`...).

### 3.5 Acceso a contenedores en ejecución (`exec`)
- Siempre con un usuario sin privilegios (el `USER` de la imagen, o `-u 1000`).
- **Prohibido sin aprobación humana explícita:** `exec -u root`, `exec -u 0`,
  `exec --privileged`.
- Si hace falta root dentro del contenedor, no se usa exec: se corrige el
  Dockerfile y se reconstruye la imagen.
- Es una regla de disciplina, no una barrera técnica. La protección real es el
  motor rootless.

### 3.6 Puertos 80/443
Se exponen mediante un proxy inverso hacia puertos > 1024, o ajustando
`net.ipv4.ip_unprivileged_port_start` (decisión documentada en un ADR).

### 3.7 Secretos
Se inyectan en tiempo de ejecución (`podman secret` o gestor de secretos), nunca
dentro de la imagen.

### 3.8 Entornos
| Entorno | Cómo |
|---|---|
| DEV | Podman rootless + `compose.dev.yaml` (recarga en caliente) |
| TESTING | Podman rootless + `compose.test.yaml` (efímero) |
| DEMO | Podman rootless + `compose.demo.yaml` (imágenes de Testing) |
| PROD | Host creado con Terraform + Podman rootless + Quadlet, usuario sin privilegios (imágenes aprobadas en Demo) |

### 3.9 Verificación (Cybersecurity + Testing)
- `podman info` muestra `rootless: true`.
- Ningún proceso de contenedor tiene UID 0 en el host
  (`podman top <contenedor> huser,user`).
- Dockerfiles y compose revisados contra esta sección.
- Escaneo de imágenes aprobado.
