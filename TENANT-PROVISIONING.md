# Provisioning de Tenants

Procedimiento para crear un centro médico nuevo sin datos demo. El provisioning crea únicamente el tenant, sus roles/permisos, el administrador, la configuración inicial y un link de acceso.

## Qué Crea

- Tenant con UUID y slug único.
- Roles `admin`, `recepcionista` y `doctor`.
- Permisos base por tenant.
- Usuario administrador.
- Configuración `igtf_rate`.
- Tasa BCV inicial opcional.
- `TenantAccessLink` con hash persistido.
- Password y token de acceso mostrados una sola vez.

## Qué No Crea

- Pacientes.
- Doctores.
- Consultas.
- Pagos.
- Informes médicos.
- Servicios, especialidades ni precios.
- Datos demo.

Los catálogos y los registros operativos se cargan después desde el sistema por el administrador o la recepción.

## Requisitos

- Docker Desktop activo.
- API local levantada para provisioning local.
- API de producción desplegada con la imagen que contiene `prisma/provision-tenant.ts`.
- `DATABASE_URL` disponible en el servicio API.
- `TENANT_LOGO_URL` opcional, pero si se usa debe ser una URL pública `http` o `https`.

## Provisioning Local

Ejecutar desde la raíz del proyecto. Este comando modifica la base local, no Railway:

### Asistente interactivo

Para evitar errores al cargar las variables manualmente, usar el asistente. Solicita los datos del tenant, genera una contraseña segura si se deja vacía y pide confirmación antes de modificar la base local:

```bash
bash scripts/provision-tenant.sh
```

El resultado muestra la contraseña inicial y el token de acceso una sola vez. Guardarlos en un gestor de contraseñas y no en el repositorio.

### Variables manuales

```bash
TENANT_NAME="Centro Médico Virgen del Rosario" \
TENANT_SLUG="virgen-del-rosario" \
ADMIN_NAME="Administrador Virgen del Rosario" \
ADMIN_EMAIL="admin@virgendelrosario.com" \
INITIAL_IGTF_RATE="0" \
INITIAL_BCV_RATE="0" \
ACCESS_LINK_DAYS="7" \
PATH=/usr/local/bin:$PATH \
make tenant-provision
```

Si no se define `ADMIN_PASSWORD`, el script genera una password segura y la muestra una sola vez.

Para definirla manualmente, usar comillas simples si contiene `$`, `*` u otros caracteres especiales:

```bash
ADMIN_PASSWORD='CambiarEstaClave.2026*$' \
TENANT_NAME="Centro Médico Virgen del Rosario" \
TENANT_SLUG="virgen-del-rosario" \
ADMIN_NAME="Administrador Virgen del Rosario" \
ADMIN_EMAIL="admin@virgendelrosario.com" \
RESET_ADMIN_PASSWORD="true" \
PATH=/usr/local/bin:$PATH \
make tenant-provision
```

El resultado incluye:

```text
Tenant ID: <uuid>
Initial password (show once): <password>
Access token (show once): <token>
Access path: /login?access=<token>
```

## Preparar Producción

Antes de ejecutar el provisioning en Railway:

1. Publicar una nueva imagen API que incluya el script y la migración.
2. Actualizar el servicio API con esa imagen.
3. Mantener `RUN_DB_SEED=false` en producción.
4. Esperar a que los logs muestren `Starting server...`.
5. Verificar `GET /health`.

La imagen API ejecutará automáticamente:

```text
prisma migrate deploy
```

No ejecutar `prisma migrate dev` en Railway.

Build y publicación:

```bash
make docker-build-api \
  DOCKERHUB_USER=jorge6242 \
  IMAGE_TAG=railway-<fecha>-<tag> \
  DOCKER_PLATFORM=linux/amd64

make docker-push-api \
  DOCKERHUB_USER=jorge6242 \
  IMAGE_TAG=railway-<fecha>-<tag>
```

En Railway, usar:

```text
jorge6242/centro-medico-api:<tag>
```

Configuración recomendada del API:

| Variable       | Valor                                               |
| -------------- | --------------------------------------------------- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}`                        |
| `RUN_DB_SEED`  | `false`                                             |
| `FRONTEND_URL` | `https://centromedicoweb-production.up.railway.app` |
| Target port    | `8080`                                              |
| Healthcheck    | `/health`                                           |

## Provisioning En Railway

### Generar un link temporal para un tenant existente

En desarrollo local, ejecutar dentro de Docker:

```bash
make tenant-access-link TENANT_SLUG=centro-medico-demo ACCESS_LINK_DAYS=7
```

En la **Console** del servicio API en Railway (donde el comando ya está dentro del contenedor), ejecutar:

```bash
pnpm run tenant:access-link -- --slug centro-medico-demo --expires-days 14
```

El comando crea un link que vence en 7 días por defecto e imprime la URL completa para compartir. En local usa `http://localhost:3000` si `FRONTEND_URL` no está definida; en Railway usa la variable `FRONTEND_URL` configurada en el servicio API.

No ejecutar `make tenant-provision` para producción: ese target usa el contenedor y la base local.

Después de desplegar el API, abrir la **Console** del servicio API en Railway y ejecutar desde `/app/apps/api`:

```bash
TENANT_NAME='Centro Médico Virgen del Rosario' \
TENANT_SLUG='virgen-del-rosario' \
ADMIN_NAME='Administrador Virgen del Rosario' \
ADMIN_EMAIL='admin@virgendelrosario.com' \
INITIAL_IGTF_RATE='0' \
INITIAL_BCV_RATE='0' \
ACCESS_LINK_DAYS='7' \
pnpm run tenant:provision
```

Si se desea definir la password manualmente:

```bash
ADMIN_PASSWORD='CambiarEstaClave.2026*$' \
TENANT_NAME='Centro Médico Virgen del Rosario' \
TENANT_SLUG='virgen-del-rosario' \
ADMIN_NAME='Administrador Virgen del Rosario' \
ADMIN_EMAIL='admin@virgendelrosario.com' \
RESET_ADMIN_PASSWORD='true' \
pnpm run tenant:provision
```

La password y el token aparecen una sola vez en la consola. No guardarlos en Railway Variables ni en el repositorio.

## Link de Acceso

Construir el link completo usando el dominio Web de Railway:

```text
https://centromedicoweb-production.up.railway.app/login?access=<token>
```

El usuario verá el nombre y el logo del tenant si `logoUrl` fue configurado. Sin token, el formulario no se muestra y el login indica que se necesita un link de acceso.

## Verificación

- [ ] API responde `200` en `/health`.
- [ ] Tenant aparece con UUID propio.
- [ ] Usuario admin pertenece al tenant nuevo.
- [ ] Roles y permisos pertenecen al tenant nuevo.
- [ ] No existen pacientes, doctores ni datos demo del nuevo tenant.
- [ ] `igtf_rate` fue creado.
- [ ] La tasa BCV fue configurada si se recibió `INITIAL_BCV_RATE`.
- [ ] El link resuelve nombre y logo.
- [ ] El login crea cookie HttpOnly con JWT del tenant correcto.
- [ ] El administrador puede crear servicios, precios, doctores y pacientes después del login.

## Idempotencia

Reejecutar el comando no duplica el tenant, roles ni administrador. Cada ejecución genera un nuevo access link. El password existente no se modifica a menos que se defina:

```text
RESET_ADMIN_PASSWORD=true
```
