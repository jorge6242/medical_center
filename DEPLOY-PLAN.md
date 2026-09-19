# Plan de Deploy MVP — Centro Médico

Este plan define cómo llevar el MVP de Centro Médico a producción de forma simple, económica y segura para uso real inicial.

## Decisión recomendada

Usar **Railway** para el primer deploy del MVP.

| Área | Decisión |
|---|---|
| Cloud inicial | Railway |
| Servicios | `api`, `web`, `postgres` |
| Backend | NestJS como servicio separado |
| Frontend | Next.js como servicio separado |
| Imágenes Docker | Publicadas desde una cuenta de Docker Hub |
| Base de datos | PostgreSQL managed |
| Email | SMTP externo |
| Redis/worker | No requerido para el MVP actual |
| Objetivo | Minimizar DevOps y validar uso real rápido |

## Recursos Railway creados

Proyecto:

```text
centro_medico
```

Environment:

```text
production
```

Servicios existentes:

| Servicio Railway | Tipo | Red privada |
|---|---|---|
| `api` | Backend NestJS | `api.railway.internal` |
| `web` | Frontend Next.js | `web.railway.internal` |
| `Postgres` | PostgreSQL managed | `postgres.railway.internal` |

Estado actual:

- `api` y `web` existen y usan **Connect Image** con imágenes Docker Hub.
- Postgres ya expone red privada y proxy TCP público.
- `api` y `web` están online con imágenes `railway-mvp-amd64-test`.

Dominios públicos generados:

| Servicio | URL |
|---|---|
| API | `https://api-production-2c35.up.railway.app` |
| Web | `https://web-production-a3ce7.up.railway.app` |

## Arquitectura objetivo

```text
Usuario
  ↓
Web Next.js
  ↓ HTTPS + cookies
API NestJS
  ↓
PostgreSQL Railway
```

## Servicios a crear

## Estrategia de imágenes Docker

Las imágenes de producción deben publicarse primero en una cuenta de **Docker Hub** y luego ser usadas por el cloud de deploy.

Imágenes esperadas:

```text
jgomezfreelancer/centro-medico-api:<tag>
jgomezfreelancer/centro-medico-web:<tag>
```

Reglas:

- No depender de imágenes locales para producción.
- No usar `latest` como referencia estable de producción.
- Usar tags versionados o por commit SHA.
- Mantener `api` y `web` como imágenes separadas.
- El deploy debe apuntar explícitamente al tag aprobado.
- Construir imágenes para `linux/amd64`, porque Railway despliega en infraestructura amd64.
- En runtime API copiar también `apps/api/node_modules`; pnpm usa symlinks por workspace y Prisma CLI necesita resolver `prisma/config` desde el workspace `api`.
- La imagen Web debe construirse con `NEXT_PUBLIC_API_URL` como build arg; Next.js inyecta variables `NEXT_PUBLIC_*` en el bundle cliente durante build.
- NestJS no copia assets `.html` automáticamente; `apps/api/nest-cli.json` debe declarar los templates de mailer como assets para que existan en `dist`.
- El seed de Prisma corre con `ts-node`; la imagen API runtime debe incluir `apps/api/tsconfig.json` y `tsconfig.base.json`, y `prisma.config.ts` debe pasar `--project` explícito.
- Login debe devolver `userId` y `email` además de rol/permisos para hidratar Zustand; `/auth/login` y `/auth/me` deben compartir el mismo contrato base.
- Cookies HttpOnly entre dominios Railway distintos requieren `secure: true` y `sameSite: 'none'` en producción.

Ejemplo:

```text
jgomezfreelancer/centro-medico-api:2026-06-railway-mvp
jgomezfreelancer/centro-medico-web:2026-06-railway-mvp
```

Docker Hub namespace:

```text
jgomezfreelancer
```

Repositorios Docker Hub a crear:

| Repositorio | Imagen |
|---|---|
| `centro-medico-api` | `jgomezfreelancer/centro-medico-api:<tag>` |
| `centro-medico-web` | `jgomezfreelancer/centro-medico-web:<tag>` |

Estado:

- [x] Crear repo Docker Hub `jgomezfreelancer/centro-medico-api`.
- [x] Crear repo Docker Hub `jgomezfreelancer/centro-medico-web`.
- [x] Publicar primer tag API.
- [x] Publicar primer tag Web.

Primer tag publicado:

```text
railway-mvp-test        # arm64 desde Mac M1; no usar en Railway
railway-mvp-amd64-test  # amd64 para Railway
```

Digests:

```text
jgomezfreelancer/centro-medico-api@sha256:9531706811ebf527847495fbf64bf843a7848f736264a00edd3b25bbc1dd636a
jgomezfreelancer/centro-medico-web@sha256:b7db76e2f15a43435331182b6998e87d0ace5c5482fa9f9238ce5371df44d189
jgomezfreelancer/centro-medico-api@sha256:c105c9da8ba8f652136f7aa4b30774e3f346ca9d147e5cbb8ef86b7f74a7bada
jgomezfreelancer/centro-medico-web@sha256:ec07b368fd2570ee2d629c031ec5f254f310fe120d28d3f12007a485bceb6494
```

## Operación con Makefile, migraciones y seeds

El repo ya usa `Makefile` como contrato operativo local. Para producción hay que mantener la misma intención:

| Acción | Entorno local/dev | Producción |
|---|---|---|
| Crear migración | `make db-migrate` | No aplica |
| Aplicar migraciones existentes | `make db-deploy` | `prisma migrate deploy` |
| Ejecutar seeds | `make db-seed` | Seed inicial controlado |

Reglas:

- En producción **nunca** usar `prisma migrate dev`.
- En producción usar únicamente `prisma migrate deploy`.
- Los seeds deben ser idempotentes si se ejecutan en arranque.
- Para datos reales, evitar resembrar datos demo después del primer deploy.
- Definir si el seed inicial se ejecuta automáticamente o como job manual.

Estado actual:

- `apps/api/docker-entrypoint.sh` ejecuta:

```sh
npx prisma migrate deploy --config prisma/prisma.config.ts
npx prisma db seed --config prisma/prisma.config.ts
node dist/main.js
```

Esto significa que cada arranque de la API intentará aplicar migraciones y correr seeds.

Decisión pendiente:

| Opción | Ventaja | Riesgo |
|---|---|---|
| Mantener seeds en entrypoint | Setup automático | Puede reinsertar/actualizar datos demo en producción |
| Separar seeds como comando manual | Más seguro para datos reales | Requiere paso operativo extra |

Recomendación:

- Mantener `migrate deploy` automático.
- Separar `db seed` como paso manual/controlado para producción.
- Crear comandos Makefile específicos para build/push/deploy cuando se implemente el SDD.

## Docker Compose local

El repo mantiene **Docker Compose solo para desarrollo local**.

| Ambiente | Archivo | Compose project | Uso |
|---|---|---|---|
| Desarrollo | `docker-compose.dev.yml` | `centro_medico_dev` | Hot reload, shells, DB dev |

Reglas:

- Desarrollo usa `make setup`, `make dev`, `make api`, `make web`.
- Los containers dev usan prefijo `centro_medico_dev_*`.
- Producción **no** usa `docker-compose.yml` local.
- Producción Railway usa servicios separados desde imágenes Docker Hub.
- El contrato de producción del repo son los Dockerfiles, tags Docker Hub, variables Railway y migraciones.

### 1. PostgreSQL

- Crear PostgreSQL managed en Railway.
- Usar `DATABASE_URL` generada por Railway.
- Activar backups si el plan lo permite.

Variables Railway del servicio Postgres:

```env
DATABASE_URL="postgresql://${{PGUSER}}:${{POSTGRES_PASSWORD}}@${{RAILWAY_PRIVATE_DOMAIN}}:5432/${{PGDATABASE}}"
DATABASE_PUBLIC_URL="postgresql://${{PGUSER}}:${{POSTGRES_PASSWORD}}@${{RAILWAY_TCP_PROXY_DOMAIN}}:${{RAILWAY_TCP_PROXY_PORT}}/${{PGDATABASE}}"
PGDATABASE="${{POSTGRES_DB}}"
PGHOST="${{RAILWAY_PRIVATE_DOMAIN}}"
PGPORT="5432"
PGUSER="${{POSTGRES_USER}}"
POSTGRES_DB="railway"
POSTGRES_USER="postgres"
```

Regla:

- La API debe usar `DATABASE_URL` privada, no `DATABASE_PUBLIC_URL`.
- `DATABASE_PUBLIC_URL` queda solo para herramientas externas puntuales.
- No copiar secretos de Postgres en documentación o chat.

### 2. API NestJS

Imagen:

```text
jgomezfreelancer/centro-medico-api:<tag>
```

Variables requeridas:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=<railway-postgres-url>
JWT_SECRET=<secret-min-32-chars>
JWT_EXPIRES_IN=8h
API_INTERNAL_SECRET=<secret-min-32-chars>
FRONTEND_URL=https://<web-domain>
MAIL_HOST=<smtp-host>
MAIL_PORT=587
MAIL_USER=<smtp-user>
MAIL_PASS=<smtp-pass>
MAIL_FROM=<sender-email>
```

Responsabilidades:

- Ejecutar migraciones con `prisma migrate deploy`.
- Exponer `/health`.
- Aceptar cookies desde el dominio del frontend.

### 3. Web Next.js

Imagen:

```text
jgomezfreelancer/centro-medico-web:<tag>
```

Variables requeridas:

```env
NEXT_PUBLIC_API_URL=https://<api-domain>
```

Responsabilidades:

- Consumir API pública.
- Mantener `credentials: include` para cookies HttpOnly.

## Cambios previos necesarios

- [ ] Rotar secretos expuestos en `.env.development`.
- [ ] Confirmar que `.env*` sensibles no queden versionados.
- [ ] Revisar configuración de cookies para producción (`Secure`, `SameSite`, dominio).
- [ ] Revisar CORS con `FRONTEND_URL`.
- [ ] Confirmar estrategia de migraciones en arranque o comando manual.
- [ ] Confirmar backups de PostgreSQL.
- [ ] Definir dominio final: web y API.
- [x] Corregir Dockerfiles de producción para build monorepo con `pnpm-workspace.yaml`, `pnpm-lock.yaml` y `packages/shared`.
- [x] Ajustar `apps/api/docker-entrypoint.sh` para no correr seeds demo en cada arranque de producción.

## Riesgos principales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| JWT/cookies fallan entre dominios | Login roto | Configurar CORS + cookies production-ready |
| Secrets filtrados | Alto | Rotar credenciales antes de deploy |
| Sin backups | Pérdida de datos médicos/financieros | Activar backups o export diario |
| Migraciones no corren | API arranca contra schema viejo | Usar `prisma migrate deploy` |
| Costos crecen sin monitoreo | Factura inesperada | Definir budget/alerts |

## Roadmap de implementación

### Fase 0 — Preparación en Railway

- [x] Crear cuenta/equipo en Railway.
- [x] Crear proyecto Railway para el MVP.
- [x] Crear servicio PostgreSQL managed.
- [x] Crear servicio API apuntando a la imagen Docker Hub de backend.
- [x] Crear servicio Web apuntando a la imagen Docker Hub de frontend.
- [ ] Definir dominios temporales o custom domains para `web` y `api`.
- [ ] Copiar la `DATABASE_URL` del PostgreSQL al servicio API.
- [ ] Configurar variables requeridas del API.
- [ ] Configurar variables requeridas del Web.
- [ ] Definir budget/usage alerts si el plan lo permite.
- [ ] Confirmar cómo se ejecutarán migraciones y seed inicial.
- [ ] Decidir si Railway ejecutará seeds automáticamente o mediante comando manual.

### Fase 1 — Preparación local

- [ ] Limpiar variables sensibles.
- [ ] Crear `.env.production.example`.
- [ ] Documentar variables por servicio.
- [ ] Verificar Dockerfiles de producción.
- [ ] Confirmar que API y Web puedan correr como servicios independientes.
- [x] Crear repositorios Docker Hub para API y Web.
- [ ] Definir convención de tags Docker.
- [x] Revisar `apps/api/docker-entrypoint.sh` para separar seed de producción si aplica.
- [x] Definir comandos Makefile para build/push de imágenes.

### Fase 2 — Publicación de imágenes

- [x] Publicar imagen API en Docker Hub.
- [x] Publicar imagen Web en Docker Hub.
- [x] Confirmar que Railway usa los tags correctos.

Comandos preparados:

```bash
make docker-build IMAGE_TAG=railway-mvp-<short-sha>
make docker-push IMAGE_TAG=railway-mvp-<short-sha>
```

Para Web en Railway:

```bash
make docker-build-web IMAGE_TAG=<tag> NEXT_PUBLIC_API_URL=https://api-production-2c35.up.railway.app
make docker-push-web IMAGE_TAG=<tag>
```

El Makefile usa por defecto:

```bash
DOCKER_PLATFORM=linux/amd64
```

### Fase 3 — Deploy Railway

- [ ] Configurar variables.
- [ ] Ejecutar migraciones.
- [ ] Ejecutar seed inicial controlado solo si corresponde.

### Fase 4 — Verificación funcional

- [ ] Login admin.
- [ ] Login recepcionista.
- [ ] Login doctor.
- [ ] Crear consulta con pago.
- [ ] Crear orden de laboratorio.
- [ ] Ver consultas por fecha.
- [ ] Ver reportes básicos.
- [ ] Confirmar logout/session expiry.

### Fase 5 — Operación mínima

- [ ] Configurar dominio.
- [ ] Configurar backups.
- [ ] Configurar monitoreo básico.
- [ ] Definir usuario admin real.
- [ ] Cambiar passwords demo.

## Criterio de listo

El deploy está listo cuando:

- La app web carga por HTTPS.
- El API responde `/health`.
- Los tres roles pueden iniciar sesión.
- Recepción puede crear consulta con pago y orden de laboratorio.
- Los datos sobreviven redeploys.
- Existe backup o export recuperable de PostgreSQL.

## Pendiente para SDD

Crear un SDD específico si vamos a implementar cambios de código/infra, especialmente:

- Cookies production-ready.
- Scripts de deploy/migración.
- `.env.production.example`.
- Ajustes Dockerfile/monorepo para Railway.
- Documentación de rollback y backup.
