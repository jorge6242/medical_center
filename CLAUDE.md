# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Skills

@.agents/skills/nestjs-best-practices/SKILL.md
@.agents/skills/nextjs-best-practices/SKILL.md
@.agents/skills/docker-expert/SKILL.md

## Project

Sistema de gestión para centro médico (Venezuela). Controla pagos de consultas, split de ingresos entre doctores y centro médico, egresos operativos, y datos de pacientes.

### Prioridad actual

- Ruta de estabilidad / demo comercial: `Inicio` (`/inicio`) como landing principal del dashboard.
- La vista debe consumir `GET /stats/home` y mostrar KPIs reales + alertas operativas.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | NestJS (monolito modular) |
| Frontend | Next.js (App Router) |
| Base de datos | PostgreSQL |
| Contenedores | Docker + docker-compose |
| Tipos compartidos | `packages/shared` (TypeScript) |

## Reglas de Entorno — SOLO Docker

**NUNCA ejecutar comandos TypeScript, npm, pnpm, node, o cualquier comando de consola directamente en la máquina host.**

- **TypeScript check:** Usar `make shell-api` → `pnpm run typecheck` (dentro del container API)
- **Ejecutar lint:** Usar `make shell-api` → `pnpm run lint` (dentro del container API)
- **Frontend:** Usar `make shell-web` → `pnpm run lint` / `pnpm run build` (dentro del container Web)
- **DB queries:** Usar `make shell-db` para psql interactivo
- **Migraciones:** Siempre via `make db-migrate name=Nombre`
- **Anything else:** Si necesitás ejecutar algo, primero preguntá cómo hacerlo via Docker/Makefile

**Errores comunes por evitar:**

- `pnpm install` en local → usar `make dev` que levanta containers con volumenes montados
- `npm run build` en local → el container ya tiene el entorno correcto
- Cualquier cosa que requiera Node.js específico → always use `make shell-*`
- Si agregás o modificás un workspace package (`apps/*` o `packages/*`), primero actualizá `pnpm-workspace.yaml`, `package.json` del workspace afectado y `pnpm-lock.yaml` regenerado dentro de Docker.
- Si cambiás dependencias o workspaces, corré `make deps-sync` desde Docker para refrescar `pnpm-lock.yaml`.
- No dupliques mounts ni asumas que `COPY` y `volume` se combinan en runtime: el volumen siempre gana y debe montarse explícitamente.
- Si aparece un app nueva (ej. `worker`), no asumas que hereda tooling: agregá `package.json`, `tsconfig.json`, `eslint.config.mjs` y el mount correspondiente en `docker-compose.dev.yml`.
- Nunca intentes resolver dependencias monorepo con `docker run` aislado si el proyecto ya usa `docker-compose`; usá el container del proyecto y revalidá con `docker compose ... config` + `pnpm run typecheck`.

---

## Principios de Código (Karpathy-inspired)

### 1. Think Before Coding
- No asumas. Si no entendés, preguntá.
- State assumptions explicitly — Si uncertain, preguntá en lugar de guess
- Present multiple interpretations cuando hay ambigüedad
- Push back cuando existe un approach más simple
- Stop when confused — Nombrá lo que está unclear y pedí clarificación

### 2. Simplicity First
- Mínimo código que resuelve el problema. Nada especulativo.
- No features más allá de lo pedido
- No abstracciones para single-use code
- No "flexibilidad" o "configurabilidad" no solicitada
- If 200 líneas podrían ser 50, reescribílo

### 3. Surgical Changes
- Tocá solo lo que debés. Limpiá solo tu propio mess.
- Don't "improve" código adyacente, comentarios o formatting
- Don't refactor things que no están rotos
- Match existing style, aunque harías diferente
- Si notás código muerto no relacionado, mencioná — no lo borres
- Solo remové imports/variables/functions que TUS cambios making unused

### 4. Goal-Driven Execution
- Definí success criteria. Loop until verified.
- Instead of "Add validation" → "Write tests for invalid inputs, then make them pass"
- Instead of "Fix the bug" → "Write a test that reproduces it, then make it pass"
- For multi-step tasks, state a brief plan: 1. [Step] → verify: [check]

---

## Estructura del Monorepo

```
centro_medico/
  apps/
    api/          → NestJS (puerto 3001)
    web/          → Next.js (puerto 3000)
  packages/
    shared/       → DTOs, enums, interfaces compartidas
  docker-compose.dev.yml   → desarrollo local (hot reload, DB expuesta)
```

## Comandos

```bash
# Desarrollo
docker compose -f docker-compose.dev.yml up

# Producción
# Railway usa servicios separados desde imágenes Docker Hub.
# No hay docker-compose.yml local de producción.

# Solo backend/API

# Solo backend (sin Docker)
cd apps/api && pnpm run start:dev

# Solo frontend (sin Docker)
cd apps/web && pnpm run dev

# Tests backend
cd apps/api && pnpm run test
cd apps/api && pnpm run test:e2e

# Migraciones (Prisma)
cd apps/api && pnpm run db:migrate       # desarrollo — genera migración + aplica
cd apps/api && pnpm run db:deploy        # producción — solo aplica migraciones existentes
cd apps/api && pnpm run db:seed          # corre prisma/seed.ts
cd apps/api && pnpm run db:studio        # Prisma Studio (UI para explorar DB)

# Lint
pnpm run lint
```

---

## Configuración de Entorno — `@nestjs/config` + Joi

### Variables requeridas

```env
# .env.development / .env.production
NODE_ENV=development
PORT=3001

# Database — Prisma usa una sola URL de conexión
# En Docker: host = nombre del servicio ("db"). Fuera de Docker: localhost
DATABASE_URL="postgresql://postgres:postgres@db:5432/centro_medico?schema=public"

# JWT
JWT_SECRET=cambia_esto_por_al_menos_32_caracteres_aleatorios
JWT_EXPIRES_IN=8h      # string ms-compatible — @nestjs/jwt v11 usa StringValue, no número
```

`.env` y `.env.*` en `.gitignore`. Sí comitear `.env.example` sin valores reales.

> **Simplificación vs TypeORM:** TypeORM requería 5 variables separadas (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`). Prisma usa una sola `DATABASE_URL` — el Joi schema es más simple y la URL es el estándar de la industria.

### Estructura en `apps/api/src/config/`

```
config/
  app.config.ts        → registerAs('app', ...) — PORT, NODE_ENV
  database.config.ts   → registerAs('database', ...) — DATABASE_URL
  jwt.config.ts        → registerAs('jwt', ...) — JWT_*
  env.validation.ts    → Joi schema — falla rápido si var falta o es inválida
```

### Implementación

```ts
// config/env.validation.ts
import * as Joi from 'joi'

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().uri().required(),  // una sola var — Prisma URL
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('8h'),   // string ms-compatible, no número
})
```

```ts
// config/database.config.ts
import { registerAs } from '@nestjs/config'

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,  // Prisma solo necesita la URL completa
}))
```

```ts
// config/jwt.config.ts
import { registerAs } from '@nestjs/config'
import type { StringValue } from 'ms'

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN as StringValue, // @nestjs/jwt v11 exige StringValue, no number
}))
```

```ts
// app.module.ts — ConfigModule global
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
  load: [databaseConfig, jwtConfig],
  validationSchema: envValidationSchema,
  validationOptions: { abortEarly: true, allowUnknown: true },
})
```

### Sincronización con Docker

El container lee las vars desde `env_file` en el compose:

```yaml
# docker-compose.dev.yml — servicio api
services:
  api:
    env_file:
      - .env.development
    environment:
      # DATABASE_URL en .env.development usa localhost — override obligatorio para Docker
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/centro_medico?schema=public
```

```yaml
# Railway — producción
# DATABASE_URL se configura como variable del servicio API,
# apuntando al PostgreSQL managed de Railway.
NODE_ENV=production
DATABASE_URL=<railway-postgres-url>
```

**Regla crítica:** `DATABASE_URL` siempre se sobreescribe en el bloque `environment:` del compose para apuntar al servicio `db` — aunque el `.env` local use `localhost`. Con Prisma, una sola variable reemplaza los 5 override individuales de TypeORM.

---

## Backend — Estructura

```text
apps/api/
└── src/
    ├── auth/            ← Auth module (login, JWT, guards)
    ├── users/           ← Users module
    ├── roles/           ← Roles, permisos, RoleVersion, seed
    ├── patients/        ← Patients module
    ├── doctors/         ← Doctors module
    ├── specialties/     ← Specialties & Services module
    ├── consultations/   ← Consultations module
    ├── payments/        ← Payments module (idempotente, split, IVA)
    ├── expenses/        ← Expenses module
    ├── reports/         ← Reports module (PDFs, balances)
    ├── common/          ← Shared across modules
    │   ├── exceptions/  ← Custom business exceptions
    │   ├── filters/     ← Global exception filter
    │   ├── constants/   ← Shared constants & enums
    │   ├── interfaces/  ← Shared TypeScript interfaces
    │   ├── decorators/  ← @CurrentUser, @Public, @RequirePermission
    │   └── utils/       ← Helper functions
    ├── config/          ← App config & env validation
    └── database/        ← PrismaService + PrismaModule
```

**Regla crítica de arquitectura:** módulos no se importan entre sí salvo dependencia real. Si `PaymentsModule` necesita datos de `DoctorsModule`, lo hace vía service inyectado — nunca acoplamiento circular. Preserva capacidad de extraer módulos a microservicios en el futuro.

---

## Backend — Convenciones NestJS

### Estructura interna de cada módulo

```
src/payments/
  payments.controller.ts   → recibe request, delega al service, retorna DTO
  payments.service.ts      → orquesta lógica de negocio
  payments.repository.ts   → queries complejas (solo si aplica criterio)
  payments.mapper.ts       → entidad → ResponseDto (si transformación > 2 líneas)
  payments.types.ts        → tipos/interfaces locales del módulo (si aplica)
  dto/
    create-payment.dto.ts
    update-payment.dto.ts
    payment-response.dto.ts
  payments.module.ts
```

**Controller** — solo recibe, valida (via Pipe), llama service, retorna. Sin lógica de negocio.
**Service** — solo lógica de negocio. Inyecta `PrismaService` directamente para CRUD y queries simples.
**Repository** — clase opcional para queries analíticas complejas y reutilizables; también inyecta `PrismaService`.

### Repository custom — criterio de uso

`PrismaService` inyectado directo en service para CRUD y queries simples.

Crear `xxx.repository.ts` solo cuando:
1. Queries reutilizadas en el sistema (respeta DRY)
2. Consultas analíticas pesadas (múltiples `include` / subconsultas complejas)

Módulos con repository custom desde inicio: `payments`, `reports`. Resto: `PrismaService` directo en service.

```ts
// Vale la pena — query compleja, reutilizable
findByDoctorInPeriod(doctorId: string, tenantId: string, from: Date, to: Date) {
  return this.prisma.payment.findMany({
    where: {
      tenantId,
      consultation: { doctorId },
      createdAt: { gte: from, lte: to },
      status: 'completed',
    },
    include: { details: true, consultation: { include: { doctor: true } } },
  })
}
```

### DTOs y Validación

- Todo input tiene su `CreateXxxDto` / `UpdateXxxDto` con decoradores de `class-validator`
- Todo output tiene su `XxxResponseDto` — nunca exponer entidad directa al cliente
- `whitelist: true` en `ValidationPipe` — propiedades no declaradas se eliminan silenciosamente
- `forbidNonWhitelisted: true` — propiedades extra lanzan error 400

```ts
// main.ts
app.useGlobalFilters(new HttpExceptionFilter());
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
```

### Mapper dedicado por módulo

`service.ts` no transforma entidades — esa responsabilidad va en `xxx.mapper.ts`. Regla: transformación > 2 líneas o con cálculos → mapper. Módulos con mapper desde inicio: `payments`, `reports`.

```ts
// payments.mapper.ts
export class PaymentsMapper {
  static toResponse(payment: Payment): PaymentResponseDto {
    return plainToInstance(PaymentResponseDto, {
      id: payment.id,
      totalServiceUsd: payment.totalServiceUsd,
      doctorShareUsd: payment.doctorShareUsd,
      centerShareUsd: payment.centerShareUsd,
      totalPaidUsd: payment.totalPaidUsd,
      totalPaidBs: payment.totalPaidBs,
      totalIgtfUsd: payment.totalIgtfUsd,
      bcvExchangeRate: payment.bcvExchangeRate,
      status: payment.status,
      details: payment.details.map(d => ({
        paymentMethod: d.paymentMethod,
        currency: d.currency,
        amount: d.amount,
        appliedIgtfAmount: d.appliedIgtfAmount,
      })),
    })
  }
}
```

### Payments — Diseño para IGTF y pagos mixtos

Para cubrir pagos 100% en Bs, 100% en divisas y mixtos (y el IGTF), adoptamos el patrón Cabecera + Líneas:

- `Payment` (cabecera): snapshot del total del recibo, tasa BCV del día, totales agregados (USD y VES), totales de IGTF, estado.
- `PaymentDetail` (líneas): cada forma de pago por la que se compone el recibo (efectivo USD, Zelle, POS en Bs, Pago Móvil). Cada línea contiene `amount`, `currency`, `payment_method`, `reference_number` y `applied_igtf_amount` cuando corresponda.
- `PaymentAdjustment` (opcional/extras): descuentos, montos a favor, cargos adicionales o notas fiscales que afecten el total del `Payment`. Los ajustes pueden estar ligados al `Payment` y opcionalmente a una `PaymentDetail`.

Reglas clave:
- Guardar `bcv_exchange_rate` en la `Payment` (snapshot) para auditoría y conversiones históricas.
- El `IGTF` se calcula por `PaymentDetail` que sea en divisas (excepto `POS_USD_CARD` — exonerado). Tasa leída de `SystemConfig.igtf_rate` en cada pago — permite cambiar la tasa sin deployment.
- El `split` del doctor siempre se calcula sobre el `total_service_usd` (precio del servicio), nunca sobre IGTF ni ajustes.
- Registrar `total_paid_usd` y `total_paid_bs` en `Payment` (agregados desde `PaymentDetail`) para reportes rápidos.
- IVA **no aplica** — consultas médicas exentas en Venezuela (TSJ sentencia).

Beneficio:
- Flexible para futuros impuestos o reglas locales.
- Traza exacta de cómo se compuso un pago mixto para auditoría.
- Permite anexar descuentos/créditos/recargos como `PaymentAdjustment` sin romper el modelo base.


### Custom Decorators

Decoradores en `apps/api/src/common/decorators/`:

| Decorador | Uso |
|---|---|
| `@CurrentUser()` | Extrae usuario autenticado del request en controller |
| `@RequirePermission(resource, action)` | Define permiso requerido (usado por `AclGuard`) |
| `@Public()` | Marca endpoint como público — `JwtAuthGuard` lo omite |

### Manejo de Excepciones — Global

Un único `HttpExceptionFilter` en `main.ts` normaliza todas las respuestas de error:

```ts
{
  statusCode: number,
  message: string | string[],
  error: string,
  timestamp: string,
  path: string
}
```

- Errores 500 loguean stack trace internamente — cliente nunca recibe stack

### Flujo de excepciones

```
Controller → Service lanza excepción → HttpExceptionFilter captura → JSON estructurado
```

**Regla:** Controllers nunca capturan ni manejan errores con `try/catch`. Solo llaman al service y retornan. Toda la gestión de errores vive en el service y el filter global.

### Custom Business Exceptions — `common/exceptions/`

Exceptions propias del dominio van en `src/common/exceptions/`. Extienden `HttpException`. Solo los **Services** las lanzan — nunca los controllers.

```ts
// common/exceptions/doctor-not-available.exception.ts
import { BadRequestException } from '@nestjs/common'

export class DoctorNotAvailableException extends BadRequestException {
  constructor(doctorId: string) {
    super(`Doctor ${doctorId} no está disponible para consultas`)
  }
}

// common/exceptions/duplicate-payment.exception.ts
import { ConflictException } from '@nestjs/common'

export class DuplicatePaymentException extends ConflictException {
  constructor(idempotencyKey: string) {
    super(`Pago con key ${idempotencyKey} ya fue procesado`)
  }
}
```

Naming: `{Motivo}Exception` en PascalCase — descriptivo del caso de negocio.

### NestJS Built-in Exceptions — cuál usar cuándo

| Excepción | Cuándo usarla |
|---|---|
| `NotFoundException` | Entidad no encontrada por ID (patient, doctor, payment) |
| `BadRequestException` | Input inválido de negocio (no cubierto por ValidationPipe) |
| `UnauthorizedException` | JWT inválido o ausente |
| `ForbiddenException` | Usuario autenticado sin permiso para ese recurso |
| `ConflictException` | Entrada duplicada (cédula existente, idempotency key repetida) |
| Custom exception | Caso de negocio específico que necesita mensaje preciso |

Nunca reinventar lo que NestJS ya provee. Custom exception solo cuando el mensaje necesita contexto del dominio.

### Principios SOLID aplicados

- **S** — controller, service, repository tienen una sola razón de cambio
- **O** — guards y filtros extensibles via decoradores sin modificar código existente
- **L** — DTOs de respuesta heredables si comparten campos base
- **I** — interfaces de repository separadas de implementación (facilita mocking en tests)
- **D** — services dependen de abstracciones, no de clases concretas; `PrismaService` se inyecta como dependencia, no se instancia directamente

---

## ORM — Prisma

### Reglas absolutas

- Schema definido en `prisma/schema.prisma` — fuente única de verdad del esquema
- Cambios de esquema **solo** vía `prisma migrate dev` (dev) o `prisma migrate deploy` (prod)
- Nunca usar `db push` en producción — no genera historial de migraciones
- `@@index()` en campos de query frecuente — no autodetectados por Prisma

### PrismaService — integración NestJS

```ts
// src/database/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect()
    // Prisma Middleware de auditoría se registra aquí (ver sección Auditoría)
  }
}
```

```ts
// src/database/prisma.module.ts
import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

`PrismaModule` es `@Global()` — importarlo una sola vez en `AppModule`. Todos los demás módulos reciben `PrismaService` por inyección sin importar `PrismaModule`.

```ts
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ... }),
    PrismaModule,                    // ← una sola vez, global
    AuthModule,
    PatientsModule,
    // ...
  ],
})
export class AppModule {}
```

### Scripts y CLI — `apps/api/package.json`

```json
{
  "scripts": {
    "db:migrate":  "prisma migrate dev",
    "db:deploy":   "prisma migrate deploy",
    "db:seed":     "prisma db seed",
    "db:studio":   "prisma studio"
  },
  "prisma": {
    "seed": "ts-node --transpile-only prisma/seed.ts"
  }
}
```

| Script | Uso |
|---|---|
| `db:migrate` | Desarrollo — detecta cambios en schema, genera y aplica migración |
| `db:deploy` | Producción — aplica migraciones existentes (no genera nuevas) |
| `db:seed` | Corre `prisma/seed.ts` con `PrismaClient` standalone |
| `db:studio` | Abre Prisma Studio en navegador para explorar la DB |

### schema.prisma — estructura y convenciones

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Patient {
  id         String   @id @default(uuid())
  tenantId   String
  name       String
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  consultations Consultation[]

  @@index([tenantId])
  @@index([tenantId, isActive])
}
```

**Campos monetarios — `@db.Decimal(12, 2)`:** Nunca `Float` — los errores de punto flotante rompen cálculos financieros.

```prisma
model Payment {
  totalServiceUsd  Decimal @db.Decimal(12, 2)
  doctorShareUsd   Decimal @db.Decimal(12, 2)
  centerShareUsd   Decimal @db.Decimal(12, 2)
  totalPaidUsd     Decimal @db.Decimal(12, 2)
  totalPaidBs      Decimal @db.Decimal(12, 2)
  totalIgtfUsd     Decimal @db.Decimal(12, 2)
  bcvExchangeRate  Decimal @db.Decimal(12, 4)
}
```

### Patrón Repository con Prisma

No existe `extends Repository<Entity>`. El patrón es: inyectar `PrismaService` en el service o en un repository custom opcional.

```ts
// Directo en service (CRUD y queries simples)
@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.patient.findMany({
      where: { tenantId, isActive: true },
    })
  }
}

// Repository custom (queries analíticas complejas — solo payments y reports)
@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByDoctorInPeriod(doctorId: string, tenantId: string, from: Date, to: Date) {
    return this.prisma.payment.findMany({
      where: {
        tenantId,
        consultation: { doctorId },
        createdAt: { gte: from, lte: to },
        status: 'completed',
      },
      include: { details: true, consultation: { include: { doctor: true } } },
    })
  }
}
```

### Transacciones

```ts
// Transacción atómica — patrón obligatorio en creación de pagos
await this.prisma.$transaction(async (tx) => {
  const consultation = await tx.consultation.create({ data: { ... } })
  const payment = await tx.payment.create({ data: { ... } })
  await tx.consultation.update({
    where: { id: consultation.id },
    data: { status: 'paid', paymentId: payment.id },
  })
  // Si cualquier operación falla → rollback completo
})
```

### Flujo Docker + migraciones

```
container api arranca (docker-entrypoint.sh)
  → npx prisma migrate deploy   ← aplica migraciones pendientes
  → npx prisma db seed          ← seeds idempotentes
  → exec node dist/main.js      ← NestJS bootstrap
  → GET /health responde 200    ← listo para requests
```

Migraciones y seeds corren **antes** del bootstrap de NestJS — si fallan, el container no arranca.

### Estructura de archivos

```
apps/api/
  prisma/
    schema.prisma              ← fuente única de verdad del esquema
    seed.ts                    ← entrypoint de seeds (PrismaClient standalone)
    seeders/
      roles.seeder.ts
      users.seeder.ts
      specialties.seeder.ts
      doctors.seeder.ts
      patients.seeder.ts
      expense-categories.seeder.ts
      system-config.seeder.ts
      exchange-rates.seeder.ts
    migrations/                ← generadas por prisma migrate dev
      20240101000000_init/
        migration.sql
  src/
    database/
      prisma.service.ts
      prisma.module.ts
```

### Modelos y sus tablas

| Modelo Prisma | Módulo | Tabla PostgreSQL |
|---|---|---|
| `User` | `users` | `users` |
| `Role` | `roles` | `roles` |
| `Permission` | `roles` | `permissions` |
| `RoleVersion` | `roles` | `role_versions` |
| `Patient` | `patients` | `patients` |
| `Doctor` | `doctors` | `doctors` |
| `Specialty` | `specialties` | `specialties` |
| `Service` | `specialties` | `services` |
| `ServicePrice` | `specialties` | `service_prices` |
| `Consultation` | `consultations` | `consultations` |
| `ConsultationService` | `consultations` | `consultation_services` |
| `Payment` | `payments` | `payments` |
| `PaymentDetail` | `payments` | `payment_details` |
| `ConsultationPayment` | `payments` | `consultation_payments` |
| `Expense` | `expenses` | `expenses` |
| `ExpenseCategory` | `expenses` | `expense_categories` |
| `AuditLog` | `audit-log` | `audit_logs` |

---

## Connection Pooling — Prisma

PostgreSQL por defecto acepta ~100 conexiones. Sin configurar el pool, bajo carga concurrente (varios doctores + recepcionistas activos) se agotan conexiones rápidamente.

### Config recomendada — Fase 1 (Railway)

Dos niveles de control: parámetros en `DATABASE_URL` y opciones del `PrismaClient`.

```env
# .env.development / .env.production
# connection_limit: máx conexiones que Prisma abre por instancia
# pool_timeout: segundos que Prisma espera por una conexión libre antes de lanzar error
DATABASE_URL="postgresql://user:pass@db:5432/centro_medico?schema=public&connection_limit=5&pool_timeout=15"
```

```ts
// src/database/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private config: ConfigService) {
    super({
      datasources: { db: { url: config.get<string>('DATABASE_URL') } },
      // log: ['query', 'warn', 'error'],  // activar en dev para ver queries
    })
  }

  async onModuleInit() {
    await this.$connect()
    // ... middleware de auditoría
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
```

**Valores sugeridos por entorno:**

| Entorno | `connection_limit` | `pool_timeout` | Razón |
|---|---|---|---|
| Dev local | 3 | 10 | Un solo developer, recursos limitados |
| Railway (prod inicial) | 5 | 15 | 1 instancia API, plan starter de Railway |
| Railway (prod con tráfico) | 10 | 20 | Múltiples usuarios concurrentes |

**Regla:** `connection_limit` × número de instancias API ≤ 80% del `max_connections` de PostgreSQL. PostgreSQL en Railway Starter tiene ~97 conexiones — con 1 instancia y `connection_limit=5` hay margen amplio para el overhead del sistema.

### Escalado a PgBouncer (Fase 2+)

Cuando Railway esté activo y el tráfico crezca, activar PgBouncer como proxy de pool:

```env
# Con PgBouncer: connection_limit puede subir porque PgBouncer multiplexea
DATABASE_URL="postgresql://user:pass@pgbouncer-host:6432/centro_medico?schema=public&pgbouncer=true&connection_limit=20"
```

Alternativa: **Prisma Accelerate** (servicio gestionado de connection pooling de Prisma — agrega edge caching también). Sin cambios de código — solo cambiar `DATABASE_URL` por la URL de Accelerate.

---

## Multitenancy — Preparación para SaaS

Sistema actual es monotenant (un centro médico). Arquitectura preparada para escalar via **row-level tenancy**.

Cada entidad de negocio lleva `tenant_id` desde Fase 1 — no se usa aún pero evita refactor costoso.

```
Tenant
  id, name, slug    ← ej: "clinica-san-jose"
  plan              ← futuro: free | pro
  created_at
```

Entidades con `tenant_id`:
- `Patient`, `Doctor`, `Specialty`, `Service`
- `Consultation`, `Payment`, `ConsultationPayment`, `Expense`
- `User`, `Role`, `Permission` (roles por tenant, no globales)

`TenantGuard` global extrae `tenant_id` del JWT — todos los queries filtran por él automáticamente. Actualmente inactivo — sistema corre como monotenant hasta implementar lógica completa.

```ts
// Nunca hacer query sin tenant_id en entidades de negocio
this.prisma.patient.findMany({ where: { tenantId: ctx.tenantId } })
```

---

## Modelo de Datos — Relaciones Clave

### Especialidades y Servicios
```
Specialty (1) ──── (N) ServicePrice (N) ──── (1) Service
  id, name              id, specialty_id, service_id, price_usd
  ej: Ginecología        ej: Consulta+Eco ($50 en Gin.), Eco sola ($30 en Gin.)
```
El precio vive en `ServicePrice` (pivote N:N), no en `Service` directamente. Un mismo servicio puede tener distinto precio por especialidad.

### Doctor
```
Doctor
  id, name, email, phone
  split_percentage  Decimal(5,2)  ← % doctor (ej: 70.00, 67.50, 33.33 — soporta fracciones)

DoctorSpecialty (N:N — doctor puede tener múltiples especialidades)
  doctor_id → Doctor
  specialty_id → Specialty
  isPrimary  boolean    ← especialidad principal (solo una true por doctor)

DoctorBankAccount (1..N por doctor)
  doctor_id → Doctor
  bankName, accountType (SAVINGS | CHECKING), accountNumber
  documentId, phone     ← datos del titular
  isDefault  boolean    ← cuenta usada para snapshot del recibo (solo una true por doctor)
  isActive   boolean
```

**Regla `isDefault`:** primera cuenta creada = `isDefault: true` automáticamente. Cambiar default no afecta recibos históricos — son snapshots inmutables.

**Regla `DoctorSpecialty`:** un doctor puede ofrecer servicios de todas sus especialidades. Al seleccionar servicios en recepción → validar que cada `service.specialty_id` esté en las especialidades del doctor.

### Consulta y Pago — flujo central
```
Patient (1) ──── (N) Consultation (1) ──── (1) Payment
Doctor  (1) ──── (N) Consultation
Consultation (1) ── (N) ConsultationService (N) ── (1) Service

Consultation
  id, patient_id, doctor_id, date
  status        (pending | paid | voided)
  payment_id    → Payment (nullable — null hasta que el pago se complete)

ConsultationService  (líneas de servicios — snapshot completo)
  consultation_id → Consultation
  service_id      → Service        ← solo auditoría, no usar para obtener nombre
  specialty_id    → Specialty      ← solo auditoría, no usar para obtener nombre
  service_name    snapshot del nombre del servicio (inmutable)
  specialty_name  snapshot del nombre de la especialidad (inmutable)
  price_usd       snapshot del precio al momento del pago (inmutable)

Payment
  id, consultation_id
  total_service_usd     precio del servicio (snapshot) — base del split
  bcv_exchange_rate     tasa BCV del día (snapshot para auditoría)
  total_paid_usd        suma líneas en USD (desde PaymentDetail)
  total_paid_bs         suma líneas en VES (desde PaymentDetail)
  total_igtf_usd        IGTF total cobrado (acumulado desde PaymentDetail)
  doctor_share_usd      total_service_usd * split_percentage / 100
  center_share_usd      total_service_usd - doctor_share_usd
  status                (pending | completed | voided)
  created_at

PaymentDetail  (líneas — una por forma de pago)
  id, payment_id
  payment_method   (CASH_USD | ZELLE | WIRE_TRANSFER_USD | POS_USD_CARD | POS_BS | PAGO_MOVIL)
  currency         (USD | VES)
  amount           monto en la currency de la línea
  reference_number nullable (ref POS, Zelle, transferencia)
  applied_igtf_amount  IGTF generado por esta línea en USD (0 si no aplica)
```

**Regla de status:** `Payment` es source of truth del dinero. `Consultation` refleja el estado derivado:
- `Payment.completed` → `Consultation.paid`
- `Payment.voided` → `Consultation.voided`
- Ambos se actualizan **en la misma transacción** — nunca desincronizados.

`Consultation.status = pending` significa **esperando pago** — no "esperando atención médica". El flujo es pago primero, atención después.

### Idempotencia de Pagos — patrón anti-doble-cobro
```
ConsultationPayment
  id
  idempotency_key   UUID único generado por frontend antes de enviar
  status            (initiated | processing | completed | failed | voided)
  consultation_id   → Consultation
  payment_id        → Payment (nullable hasta completar)
  created_at, updated_at
```

**Flujo de pago — un solo `POST /payments`, una transacción atómica:**

Request: `{ patient_id, doctor_id, service_price_ids[], payment_lines[], idempotency_key, bcv_exchange_rate }`

1. Frontend genera `idempotency_key` (UUID v4) antes de submit
2. API busca `ConsultationPayment` con esa key
3. Si existe y `completed` → retorna mismo resultado, sin reprocesar
4. Si existe y `processing` → retorna 409 Conflict
5. Pre-transacción: fetch precios de `service_price_ids[]` desde `ServicePrice` → validar que pertenezcan a especialidades del doctor → `total_service_usd = SUM(prices)` → leer `igtf_rate` de `SystemConfig`
6. Si no existe → DB transaction:
   - Crea `Consultation` (status: `pending`)
   - Crea `ConsultationService` por cada servicio (snapshots: `service_name`, `specialty_name`, `price_usd` — tomados en el momento de la transacción)
   - Crea `ConsultationPayment` (status: `initiated`)
   - Crea `PaymentDetail` por cada línea + calcula IGTF por línea
   - Crea `Payment` con totales agregados (status: `completed`)
   - Actualiza `Consultation.status` → `paid`, `Consultation.payment_id` → Payment.id
   - Actualiza `ConsultationPayment.status` → `completed`, `.payment_id` → Payment.id
   - Commit
7. Fallo → rollback completo — `Consultation` y `ConsultationService` **nunca quedan en DB** si el pago no completó

**Voiding:** nunca borrar. En una transacción: `Payment.status` = `voided` + `ConsultationPayment.status` = `voided` + `Consultation.status` = `voided`. Auditoría preservada.

---

## Lógica de Negocio Clave

**Split de ingresos:**
- Porcentaje configurable por doctor (ej. 70% doctor / 30% centro)
- Base del split: `total_service_usd` (precio del servicio) — nunca sobre IGTF ni ajustes
- `doctor_share_usd = total_service_usd * split_percentage / 100`
- `center_share_usd = total_service_usd - doctor_share_usd`

**IVA — NO aplica a consultas médicas:**
- Servicios de salud ambulatoria están **exentos de IVA en Venezuela** (TSJ sentencia confirmada)
- El sistema no calcula IVA sobre consultas

**IGTF (Impuesto a las Grandes Transacciones Financieras):**
- Aplica sobre pagos en divisas (USD, criptomonedas) — **excepto tarjetas en divisas (POS_USD_CARD)**
- Tasa actual: **0%** (Decreto 4.972, jul-2024). Históricamente 3%. El Ejecutivo puede modificarla.
- Tasa almacenada en `SystemConfig.igtf_rate` — admin la actualiza sin deployment
- Lo paga el **paciente** (consumidor) — el centro lo recauda y remite al SENIAT
- En pagos mixtos: IGTF solo sobre la porción en divisas
```
// Por cada PaymentDetail con currency=USD y method != POS_USD_CARD:
applied_igtf = detail.amount * (igtf_rate / 100)
// Payment.total_igtf_usd = suma de todos los applied_igtf
```

**Tasa BCV — tabla `ExchangeRate`:**
- Historial completo de tasas por fecha (`date` UNIQUE — una tasa por día)
- `source`: `MANUAL` (admin registra cada mañana vía `POST /exchange-rates`) o `API` (Fase 2 — cron job automático)
- `Payment.bcv_exchange_rate` toma el valor de `ExchangeRate` más reciente al momento del pago — snapshot inmutable
- No se recalcula en voiding — el snapshot queda como estaba al momento del pago
- Permite auditar qué tasa se usó en cada pago y recalcular conversiones históricas

**Doctores cobran por honorarios profesionales** — no son empleados. Pagos generan recibo firmado (no nómina).

---

## Seguridad — Autenticación con HttpOnly Cookies

JWT en cookie `HttpOnly` — nunca en `localStorage` ni en memoria JS. Protege contra XSS.

**Flujo:**
1. Login → NestJS valida credenciales → emite JWT
2. NestJS setea cookie `HttpOnly` (`Set-Cookie`)
3. Browser envía cookie automáticamente en cada request
4. NestJS valida JWT en cada request protegido vía Guard

### JWT Payload

Solo datos operacionales no sensibles:

```ts
// ✅ Payload correcto
{ sub: user.id, email: user.email, role: user.role.name, permissions: [...], role_version: n }

// ❌ NUNCA en payload
// password, documentId, phone, bank_info, o cualquier PII
```

### Password Hashing — bcrypt async obligatorio

```ts
// ✅ Correcto — async, no bloquea event loop
const hash = await bcrypt.hash(password, 10)
const valid = await bcrypt.compare(password, hash)

// ❌ NUNCA — sync bloquea Node.js durante ~100ms por llamada
const hash = bcrypt.hashSync(password, 10)
const valid = bcrypt.compareSync(password, hash)
```

10 rounds — balance costo/seguridad. `hashSync`/`compareSync` bloquean el event loop completo: un solo login congela todos los requests concurrentes.

### Backend

```ts
res.cookie('access_token', jwt, {
  httpOnly: true,
  secure: true,        // solo HTTPS en prod
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000, // 8 horas (jornada laboral)
})
```

- `JwtAuthGuard` extrae token desde `req.cookies.access_token` (no header `Authorization`)
- Logout hace `res.clearCookie('access_token')`
- Habilitar `cookie-parser` en `main.ts`
- Sin Refresh Token — expiración de 8 horas fuerza re-login por jornada

### Frontend

- Nunca leer ni almacenar token en cliente
- `apiFetch` usa `credentials: 'include'` — browser envía cookie automático
- `middleware.ts` protege rutas — sin sesión redirige a `/login` antes de que cargue la página (cero parpadeos)
- Server Components propagan cookie vía `next/headers` en SSR

### Next.js 16 — APIs Breaking

El proyecto usa Next.js **16.2.4**. Dos cambios críticos respecto a versiones anteriores:

**`params` y `searchParams` son `Promise<{...}>`** — siempre hacer `await`:
```ts
// ✅ Correcto en Next.js 16
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}

// ❌ Rompe en Next.js 16
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params // Error — params es una Promise
}
```

**`cookies()` es async** — ya contemplado en `apiFetch` con `await cookies()` ✅

### CSRF

`sameSite: 'strict'` mitiga CSRF. Si se requiere mayor protección: CSRF token en Fase 2.

### Nginx

Proxy pasa headers de cookie sin modificar. En prod: forzar HTTPS para que `secure: true` funcione.

---

## Roles y Control de Acceso (ACL)

RBAC: `User` → `Role` → `Permission`. Permiso = `resource` + `action`.

```
User
  id, email, password_hash, name
  role_id → Role

Role
  id, name (admin | recepcionista | doctor)
  permissions → Permission[]

Permission
  id
  resource  (patients | doctors | payments | expenses | reports | specialties)
  action    (create | read | update | delete)
  role_id → Role
```

### Permisos por Rol

| Recurso | Acción | recepcionista | admin |
|---|---|---|---|
| patients | create/read/update | ✅ | ✅ |
| patients | delete | ❌ | ✅ |
| payments | create/read | ✅ | ✅ |
| payments | delete | ❌ | ✅ |
| expenses | create/read | ✅ | ✅ |
| expenses | delete | ❌ | ✅ |
| doctors | read | ✅ | ✅ |
| doctors | create/update/delete | ❌ | ✅ |
| specialties | read | ✅ | ✅ |
| specialties | create/update/delete | ❌ | ✅ |
| reports | read | ❌ | ✅ |

**`delete` = acción real según entidad — nunca dispara `DELETE` SQL:**

| Permiso ACL | Acción real | AuditLog action |
|---|---|---|
| `patients.delete` | `Patient.isActive = false` | `DEACTIVATE` |
| `doctors.delete` | `Doctor.isActive = false` | `DEACTIVATE` |
| `specialties.delete` | `Specialty/Service.isActive = false` | `DEACTIVATE` |
| `payments.delete` | `Payment.status = voided` | `VOID` |
| `expenses.delete` | `Expense.status = voided` | `VOID` |

### Implementación — Backend

- Permisos cargados desde DB al hacer login → incluidos en JWT payload
- `AclGuard` valida contra permisos del JWT — sin hit a DB en cada request

```ts
@Get('doctors')
@UseGuards(JwtAuthGuard, AclGuard)
@RequirePermission('doctors', 'read')
findAll() { ... }
```

### Implementación — Frontend (Navegación ACL-driven)

Tres capas independientes y complementarias — cada una con su responsabilidad:

| Capa | Archivo | Responsabilidad | ¿Es seguridad real? |
|---|---|---|---|
| Sesión | `middleware.ts` | Verifica presencia de cookie → redirect `/login` | Parcial (no valida firma JWT) |
| UX | `useSidebarNav` + `Sidebar` | Filtra ítems del menú por permisos del JWT | ❌ Solo presentación |
| Seguridad | `AclGuard` (NestJS) | Valida permiso requerido en cada endpoint | ✅ Fuente de verdad |

**Regla:** el sidebar filtrado es UX, nunca seguridad. El `AclGuard` en el backend es la única fuente de verdad — siempre presente en todos los endpoints, independientemente de si el ítem de menú está visible.

```ts
// navigation.config.ts — cada ítem declara el permiso requerido
{ label: 'Reportes', path: '/reportes', permission: { resource: 'reports', action: 'read' } }

// useSidebarNav — filtra usando permisos del store (JWT ya parseado al hacer login)
const permissions = useAuthStore(s => s.permissions)
return filterNav(NAV_CONFIG, permissions)

// auth.store.ts — permisos en RAM (Zustand, sin localStorage)
permissions: Array<{ resource: string; action: string }>
```

**Flujo al hacer login:**
1. `POST /auth/login` → NestJS responde con cookie HttpOnly + body `{ permissions, role, roleVersion }`
2. Frontend guarda `permissions[]` en `auth.store` (RAM)
3. `useSidebarNav` filtra `NAV_CONFIG` → sidebar renderiza solo ítems accesibles
4. Cada request a la API lleva la cookie automáticamente → `AclGuard` valida en backend

### Navegación Dinámica en DB — Fase 3

> **Fase 1:** `navigation.config.ts` (estático). **Fase 3:** Entidad `MenuItem` en DB con auto-referencia + FK a `Permission`.

Relaciones clave:
- `MenuItem.parentId → MenuItem` — self-join para submenús en profundidad (Adjacency List)
- `MenuItem.permissionId → Permission` — FK directa, filtra por `resource` + `action` del JWT (no por Role)
- `MenuItem.tenantId → Tenant` — cada tenant personaliza su árbol de menú
- `MenuItemRole` (N:N pivot) — visibilidad por defecto por rol (solo para seeder y panel admin, no seguridad)

**Regla:** La vinculación es a `Permission`, no a `Role`. El rol es solo un agrupador. Si admin crea un rol nuevo con ciertos permisos, el menú se filtra automáticamente sin tocar la config del menú.

Ver diseño completo (entidad, tabla pivote, diagrama, datos ejemplo) en `PLAN.md → Fase 3 → Navegación Dinámica en DB`.

### Módulo Auth

```
apps/api/src/auth/
  auth.module.ts
  auth.controller.ts     → POST /auth/login, POST /auth/logout
  auth.service.ts        → valida credenciales, emite JWT con permisos
  jwt.strategy.ts        → extrae JWT de cookie
  guards/
    jwt-auth.guard.ts
    acl.guard.ts
  decorators/
    require-permission.decorator.ts
    current-user.decorator.ts
```

### Seed Inicial

Seeds usan el patrón estándar de Prisma — `prisma/seed.ts` standalone ejecutado por `prisma db seed` (vía `package.json → prisma.seed`). Corre **antes** del bootstrap de NestJS en el docker-entrypoint:

```
prisma migrate deploy        → migraciones
prisma db seed               → seeds (orden: roles → users → specialties → doctors → patients → ...)
exec node dist/main.js       → NestJS arranca
```

Todos los seeders son idempotentes — usan `upsert` con `where` único. Sistema arranca con datos demo funcionales sin intervención manual.

Ver datos completos (especialidades, servicios con precios, doctores, pacientes) en `PLAN.md → Seed Inicial`.

### RoleVersion — permisos desactualizados en JWT

Si admin cambia permisos, sesiones activas siguen con permisos viejos hasta que expire el JWT (8h).

**Solución:** `role_version` en JWT + tabla `RoleVersion`

```
RoleVersion
  role_id → Role
  version  (entero, incrementa cuando cambian permisos del rol)
  updated_at
```

Flujo: `AclGuard` compara `jwt.role_version` vs versión en cache → si difiere → `401` → frontend redirige a `/login`.

Cache en memoria (`Map` en `RolesService`) con TTL 60s — sin Redis.

---

## Makefile

Punto de entrada único para todas las operaciones del proyecto. Archivo en la raíz del monorepo.

Ver `Makefile` directamente para la lista actualizada. Regla importante: `make setup`, `make dev`, `make api`, `make web`, shells y comandos Prisma operan sobre `docker-compose.dev.yml`.

Producción Railway no usa `make prod` ni `docker-compose.yml`; usa imágenes Docker Hub y servicios Railway separados.

### Flujo `make setup` — paso a paso

```
[1/4] docker compose build
        → imágenes api y web buildeadas

[2/4] docker compose up -d
        → db container arranca

[3/4] poll pg_isready cada 2s (max 60s)
        → postgres acepta conexiones
        → api arranca (depends_on: service_healthy)
            → docker-entrypoint.sh ejecuta:
                → prisma migrate deploy  (migraciones)
                → prisma db seed         (seeds idempotentes)
                → exec node dist/main.js (NestJS bootstrap)

[4/4] poll GET /health cada 2s (max 120s)
        → API responde 200 → bootstrap completo
        → web ya disponible

Setup complete.
```

`GET /health` responde 200 cuando NestJS termina el bootstrap — migraciones y seeds ya corrieron antes (son parte del entrypoint, no del bootstrap de NestJS).

**`down-v` es destructivo** — elimina volumen PostgreSQL. Solo para reset completo.

### Endpoint `GET /health`

Necesario para que el Makefile detecte bootstrap completo. Controlador mínimo en NestJS:

```ts
// src/health.controller.ts
import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' }
  }
}
```

Registrar en `AppModule`. Marcar con `@Public()` — no requiere JWT.

### Endpoint `GET /config/init` — Bootstrap del Frontend

Endpoint único que agrega toda la configuración operacional que el frontend necesita al iniciar sesión. Elimina el waterfall de N llamadas independientes (tasa BCV, IGTF, tenant info, menú...) con una sola request.

```ts
// Respuesta Fase 1
{
  tenant: { name: string, slug: string }
  systemConfig: { igtfRate: number }
  exchangeRate: { rate: number, date: string, source: 'MANUAL' | 'API' } | null
}

// Extensión Fase 3
{
  tenant: { name, slug, logo, theme, locale, timezone }
  systemConfig: { igtfRate, ... }
  exchangeRate: { ... } | null
  menu: NavItem[]  // árbol ya filtrado por permisos del JWT
}
```

**Módulo:** `AppConfigModule` (`src/app-config/`). Service inyecta `SystemConfigService`, `ExchangeRatesService`, `TenantsService`. No tiene lógica propia — solo agrega.

**Auth:** Requiere `JwtAuthGuard` (necesita `tenantId` del JWT) pero NO lleva `@RequirePermission` — todo usuario autenticado lee la config de su tenant.

**Separación auth vs config:**
- `/auth/login` → autenticación + permisos (ejecuta una vez)
- `/config/init` → datos operacionales del tenant (se cachea con TanStack Query, `staleTime: 5min`)

**Frontend:** `useAppConfig()` hook llama a `GET /config/init` al montar el Dashboard layout. El sidebar, el formulario de pago (tasa BCV, IGTF) y el Topbar (nombre tenant) leen de este cache.

**Fase 3:** El menú dinámico (`MenuItem` entity) se filtra server-side y viaja dentro de la respuesta de `/config/init` — no en endpoint separado. `useSidebarNav` migra de config estática a leer `menu` del cache de `useAppConfig()`.

Ver diseño completo (ResponseDto, service, controller, hook) en `PLAN.md → Módulo 9: App Config`.

---

## Docker

### Naming

Containers agrupados bajo proyecto `centro_medico`:

```yaml
name: centro_medico

services:
  frontend:
    container_name: centro_medico_frontend
  api:
    container_name: centro_medico_api
  db:
    container_name: centro_medico_db
  nginx:
    container_name: centro_medico_nginx  # solo en prod
```

### Puertos y redes

| Container | Puerto interno | Expuesto (prod) |
|---|---|---|
| `centro_medico_api` | 3001 | vía nginx `/api` |
| `centro_medico_frontend` | 3000 | vía nginx `/` |
| `centro_medico_db` | 5432 | cerrado en prod |
| `centro_medico_nginx` | 80/443 | 80/443 |

```yaml
networks:
  backend-net:    # api + db
  frontend-net:   # frontend + api en desarrollo local
```

`centro_medico_dev_db` está expuesto solo para desarrollo local.

- `docker-compose.dev.yml`: volúmenes montados para hot reload, puerto DB dev expuesto, sin nginx
- Producción Railway: servicios separados desde imágenes Docker Hub, sin Docker Compose local

### Healthcheck + depends_on — orden de arranque garantizado

`api` no arranca hasta que `db` pase el healthcheck — evita que migraciones fallen por DB no lista.

```yaml
# docker-compose.dev.yml
services:
  db:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

  api:
    depends_on:
      db:
        condition: service_healthy   # ← espera healthcheck, no solo "container started"

  web:
    depends_on:
      api:
        condition: service_started
```

Sin `condition: service_healthy`, Docker marca `db` como lista cuando el container existe — pero Postgres puede tardar 2-3s más en aceptar conexiones. Migraciones fallan con `ECONNREFUSED`.

---

## Frontend — Estructura (Feature-Sliced Design)

```text
apps/web/src/
├── app/                     # Next.js App Router (Routing, Layouts, Pages)
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/
│   │   ├── pacientes/page.tsx
│   │   ├── doctores/page.tsx
│   │   ├── pagos/page.tsx
│   │   ├── egresos/page.tsx
│   │   └── reportes/page.tsx
│   ├── layout.tsx           # Root layout + Providers
│   └── loading.tsx          # Global App Shell / Skeleton
├── config/                  # Cliente HTTP y config de Query
│   ├── api.ts               # apiFetch — cliente HTTP centralizado
│   └── query.config.ts      # TanStack Query global config
├── features/                # Lógica y UI encapsulada por dominio
│   ├── pacientes/
│   │   ├── services/        # pacientes.service.ts — funciones HTTP puras
│   │   ├── hooks/           # usePacientes, useCreatePaciente (TanStack Query)
│   │   ├── components/      # PacienteForm, PacienteTable
│   │   └── store/           # Zustand (solo si requiere estado local cliente)
│   ├── doctores/
│   ├── pagos/
│   ├── egresos/
│   └── reportes/
├── shared/                  # Código reutilizable transversal
│   ├── components/          # UI base: Button, Input, layouts globales (shadcn/ui)
│   ├── hooks/               # usePagination, useDebounce
│   ├── utils/               # formatCurrency, calcIva, calcDoctorSplit, cn
│   └── types/               # TypeScript interfaces compartidas
├── stores/                  # Zustand stores globales
│   └── auth.store.ts        # Estado de Auth (RAM, sin localStorage)
└── middleware.ts             # Protección de rutas
```

---

## Frontend — Convenciones Next.js

### Cliente HTTP centralizado — `config/api.ts`

Único punto de entrada para todas las llamadas al API. Maneja contexto server/client:

```ts
import { cookies } from 'next/headers'

export async function apiFetch(path: string, init?: RequestInit) {
  const isServer = typeof window === 'undefined'
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(isServer ? { Cookie: (await cookies()).toString() } : {}),
  }
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
    credentials: isServer ? undefined : 'include',
  })

  // 401 handling: solo redirigir si estamos en el cliente
  if (!isServer && res.status === 401) {
    window.location.href = '/login'
    return res
  }

  return res
}
```

- **Server Component** → propaga cookie vía `next/headers`
- **Client Component** → `credentials: 'include'` → browser envía cookie automático
- **Manejo 401:** si la API retorna 401, el cliente redirige automáticamente a `/login`
- Nunca llamar `fetch` directamente — siempre vía `apiFetch`

### Providers — `app/providers.tsx`

Providers de cliente van en `app/providers.tsx` (`'use client'`). Se importa una sola vez en `app/layout.tsx`.

```tsx
// app/providers.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { queryConfig } from '@/config/query.config'

const queryClient = new QueryClient(queryConfig)

export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

```ts
// config/query.config.ts
export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
}
```

### TanStack Query — uso

| Contexto | Estrategia |
|---|---|
| Server Component | `apiFetch` directo → SSR, primera carga rápida |
| Client Component con interactividad | `useQuery` vía hook del feature |
| Mutaciones (crear/editar/eliminar) | `useMutation` con `onSuccess`/`onError` |

### Thin Pages — `page.tsx` sin lógica HTTP

`page.tsx` solo compone — cero HTTP directo ni `try/catch`.

```tsx
// ✅ Client page
'use client'
export default function PacientesPage() {
  const { data, isLoading } = usePacientes()
  return <PacientesTable data={data} isLoading={isLoading} />
}

// ✅ Server page
export default async function PacientesPage() {
  const pacientes = await getPacientesServer()
  return <PacientesTable data={pacientes} />
}
```

### Errores en Mutaciones — sin `try/catch` en UI

`onError`/`onSuccess` del `useMutation` disparan Toasts (shadcn/ui). El componente solo llama `mutate(data)`.

```ts
// features/pacientes/hooks/use-create-paciente.ts
export function useCreatePaciente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreatePacienteDto) =>
      apiFetch('/patients', { method: 'POST', body: JSON.stringify(dto) }).then(r => r.json()),
    onSuccess: () => {
      toast.success('Paciente registrado')
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
```

### Services — capa HTTP por dominio

`features/<domain>/services/<domain>.service.ts` — funciones async puras, tipadas, sin React. Los hooks consumen estos services, no `apiFetch` directamente.

```ts
// features/pacientes/services/pacientes.service.ts
export const getPacientes = (): Promise<PacienteResponseDto[]> =>
  apiFetch('/patients').then(r => r.json())

export const createPaciente = (dto: CreatePacienteDto): Promise<PacienteResponseDto> =>
  apiFetch('/patients', { method: 'POST', body: JSON.stringify(dto) }).then(r => r.json())
```

```ts
// features/pacientes/hooks/use-pacientes.ts
export function usePacientes() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: getPacientes,
  })
}
```

### Formularios — react-hook-form + Zod + useMutation

Stack de formularios único para todo el proyecto. No usar `useActionState` — el proyecto llama a NestJS (API externa), no a Server Actions.

| Capa | Herramienta | Responsabilidad |
|---|---|---|
| Validación + estado | `react-hook-form` + `zod` | Schema, errores por campo, dirty state |
| Submit / HTTP | `useMutation` (TanStack Query) | HTTP, loading, cache invalidation |
| Pending del botón | `isPending` del `useMutation` | Deshabilitar submit mientras muta |

```ts
// Formulario simple (login, tasa BCV)
const schema = z.object({ rate: z.number().positive() })
const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
})
const { mutate, isPending } = useCreateExchangeRateMutation()

// Formulario con campos dinámicos (registro de pago — múltiples líneas)
const { control, handleSubmit } = useForm<CreatePaymentDto>({ resolver: zodResolver(paymentSchema) })
const { fields, append, remove } = useFieldArray({ control, name: 'paymentLines' })
const { mutate, isPending } = useCreatePaymentMutation()
```

- Componente solo llama `mutate(data)` — sin `try/catch` en UI
- `onSuccess`/`onError` del `useMutation` disparan Toasts y cache invalidation
- `useFormStatus` aplica solo si el botón submit es un componente hijo extraído de un `<form>` nativo; con `useMutation` se usa `isPending` directamente

### Custom Hooks — obligatorio extraer lógica

Toda lógica que no sea renderizado va en un hook. Componentes deben ser legibles de un vistazo.

Extraer a hook cuando:
- Llamada a API con TanStack Query
- Lógica de formulario (estado, validación, submit)
- Lógica de negocio reutilizable entre componentes
- Más de 2 `useState` juntos en un componente

### Utils — `shared/utils/`

Funciones puras sin dependencias de React ni del API.

```ts
export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount)

export const calcIva = (total: number) => ({
  base: total / 1.16,
  iva: (total / 1.16) * 0.16,
})

export const calcDoctorSplit = (total: number, pct: number) => ({
  doctor: total * pct / 100,
  center: total * (1 - pct / 100),
})
```

### Manejo de Estado

- **Server State:** datos del backend → **TanStack Query**. NO duplicar en Zustand.
- **Client State:** **Zustand** SOLO para UI global o auth en RAM.
- **Loading UX:** App Shell y Skeletons (`loading.tsx`) por vista.

---

## Tipos Compartidos

DTOs e interfaces usados por `api` y `web` van en `packages/shared/src/`. Nunca duplicar tipos entre apps.

---

## Generación de Recibos PDF — `@react-pdf/renderer`

Recibos de doctor generados **en el frontend** on-demand. Backend solo expone los datos (`GET /receipts/:paymentId/data`) — no genera ni almacena PDF en Fase 1.

### Por qué frontend

- Railway no tiene filesystem persistente — almacenar PDFs en servidor requiere S3/R2 (Fase 2)
- `@react-pdf/renderer` usa componentes React → control total del diseño
- Usuario puede previsualizar con `<PDFViewer>` antes de descargar
- Sin dependencias extra en el container Docker (pdfmake/puppeteer añaden peso)

### Patrón

```tsx
// features/pagos/components/DoctorReceiptPDF.tsx
import { Document, Page, Text, View } from '@react-pdf/renderer'

export function DoctorReceiptPDF({ data }: { data: DoctorReceiptData }) {
  return (
    <Document>
      <Page size="A4">
        {/* Centro Médico header */}
        {/* Datos doctor (snapshot: nombre, cédula, banco, cuenta) */}
        {/* Tabla: consulta, total, doctor_share, center_share */}
        {/* IVA si applies */}
        {/* Número de recibo CM-{AÑO}-{SEQ}, fecha */}
        {/* Área de firma */}
      </Page>
    </Document>
  )
}
```

```ts
// Descarga on-demand — sin almacenamiento
import { pdf } from '@react-pdf/renderer'

const blob = await pdf(<DoctorReceiptPDF data={receiptData} />).toBlob()
const url = URL.createObjectURL(blob)
window.open(url) // preview en nueva pestaña
```

### Backend — `receipts` module

`GET /receipts/:paymentId/data` retorna snapshot de datos para el PDF. Backend crea `DoctorReceipt` en DB al completar el pago (snapshot inmutable + número secuencial).

```
DoctorReceipt
  receipt_number     CM-{AÑO}-{SEQ}   ← único, secuencial, reinicia por año
  payment_id         FK → Payment
  doctor_name        snapshot
  doctor_document    snapshot
  bank_name          snapshot
  account_number     snapshot
  split_percentage   snapshot
  total_consultation decimal
  doctor_share       decimal
  center_share       decimal
  base_imponible     decimal?
  iva                decimal?
  generated_at       datetime
  generated_by       FK → User
  status             generated | voided
```

**Regla crítica:** snapshot, no FK references. Split%, banco y nombre del doctor pueden cambiar — el recibo refleja lo que era al momento del pago.

---

## Sistema de Theming — White-Label Multi-Tenant

El UI usa tokens semánticos inspirados en **Material Design 3** sobre Tailwind v4 + shadcn/ui. El tema de cada tenant se almacena en `Tenant.config.theme` (JSONB) y se inyecta server-side como CSS variables — sin rebuild, sin JS extra.

### Tokens MD3 — nomenclatura obligatoria

Usar siempre tokens semánticos, nunca colores literales:

| Token | Uso |
|---|---|
| `primary` / `on-primary` | Acción principal, botones filled |
| `primary-container` / `on-primary-container` | Fondos de chips, badges |
| `secondary` / `on-secondary` | Acciones secundarias |
| `surface` / `on-surface` | Fondos de cards, modales |
| `surface-variant` | Fondos alternativos (tablas, inputs) |
| `error` / `on-error` | Estados de error |
| `elevation-1/2/3` | Sombras según jerarquía visual |

### Regla de uso en componentes

```tsx
// ✅ Siempre tokens semánticos
<div className="bg-surface text-on-surface shadow-elevation-2 rounded-lg">
  <Button className="bg-primary text-on-primary">Registrar pago</Button>
</div>

// ❌ Nunca colores literales — rompe el white-label
<div className="bg-white text-gray-900">
<Button className="bg-blue-700 text-white">
```

### Inyección del tema — `app/layout.tsx` (Fase 3)

> **Fase 1:** `app/layout.tsx` no llama a DB para el tema — usa los valores por defecto del `globals.css`. Todos los componentes se construyen con tokens semánticos para que la inyección de Fase 3 funcione sin tocar ningún componente.
>
> **Fase 3:** Se activa `getTenantTheme()` en el layout + panel `/admin/configuracion`.

```tsx
// Fase 3 — Server Component lee Tenant.config.theme y lo inyecta como <style>
const theme = await getTenantTheme()
const cssVars = theme ? Object.entries(theme).map(([k, v]) => `--${k}: ${v}`).join('; ') : ''
// <style>{`:root { ${cssVars} }`}</style> en el <head>
```

---

## Auditoría — AuditLog

`AuditLog` registra toda mutación de entidades críticas con trazabilidad completa de antes/después.

**Campos clave:** `oldValues: jsonb` (snapshot antes) + `newValues: jsonb` (snapshot después) + `changedFields: string[]` (qué campos cambiaron). Sin estos tres campos, el log solo dice "hubo un cambio" — no permite reconstruir el estado histórico.

**Entidades auditadas:** `Patient` (CREATE/UPDATE/DEACTIVATE), `Specialty`, `Service`, `ExpenseCategory`, `Doctor`, `DoctorBankAccount`, `ExchangeRate`, `SystemConfig`, `User`, `Payment` (VOID), `Expense` (VOID), Auth (LOGIN/LOGOUT). `Expense` lleva `category_name` snapshot — renombrar categoría no afecta registros históricos.

**Implementación:** Prisma Middleware automático (registrado en `PrismaService.onModuleInit()`) para UPDATE en entidades de configuración. Acciones manuales (VOID, DEACTIVATE, LOGIN) → `AuditService.log()` directo desde el Service. `userId`/`tenantId` se propagan al Middleware vía `AsyncLocalStorage` — el `JwtAuthGuard` escribe el contexto al inicio de cada request.

---

## Buenas Prácticas de Arquitectura

- **Anti-Arrow Pattern:** Priorizar *Early Return* en validaciones — evitar `else` y anidamientos. Encapsular condiciones complejas en variables con nombre semántico (`const isEligibleForPayment = ...`).
- **Funciones cortas:** Máximo ~30 líneas por función. Lógica compleja → extraer a métodos privados o funciones puras en `common/utils/`.
- **Composite Decorators:** Agrupar múltiples decoradores con `applyDecorators()` (ej. `@AuthAndPermission`).
- **Filtros e Interceptores Globales:** `HttpExceptionFilter` para errores + `TransformInterceptor` para estandarizar respuestas exitosas.
- **Validación de Entorno:** Joi en `ConfigModule` — falla rápido al arrancar si falta una var.
- **Persistencia Total — ninguna entidad financiera/clínica tiene `@DeleteDateColumn()`:** No existe "borrar" en este dominio. El mecanismo depende del tipo:

  | Entidad | Acción de "eliminación" | Campo |
  |---|---|---|
  | `Patient`, `Doctor`, `User`, `Service`, `Specialty` | Desactivar | `isActive = false` |
  | `Consultation`, `Payment` | Anular | `status = voided` |
  | `Expense` | Anular | `status = voided` + `voidedBy` + `voidReason` |

  Los reportes financieros filtran por `Payment.status = completed` y `Expense.status = active` — nunca por `isActive` ni `deletedAt` de entidades relacionadas. Esto garantiza que desactivar un paciente o doctor no afecta el balance histórico.
- **Precisión decimal — dinero:** Todos los campos monetarios en Prisma: `@db.Decimal(12, 2)`. NUNCA `Float` — los errores de punto flotante rompen cálculos financieros.
- **Seguridad extra:** `helmet` y `@nestjs/throttler` (rate limit) en el backend.

## Convenciones de Código

### TypeScript strict

`tsconfig.base.json` en la raíz del monorepo con `strict: true`. Ambas apps extienden de esta base:

```jsonc
// tsconfig.base.json → strict: true, forceConsistentCasingInFileNames, noUncheckedIndexedAccess
// apps/api/tsconfig.json → "extends": "../../tsconfig.base.json" + decorators + commonjs
// apps/web/tsconfig.json → "extends": "../../tsconfig.base.json" + bundler + jsx
```

Sin `any`. Sin nulls implícitos. Sin excepciones. Si algo no compila, arreglar el código — nunca la config.

> **Estado actual:** `apps/web` ya tiene `strict: true` ✅. `apps/api` tiene `strictNullChecks: false` y `noImplicitAny: false` — corregir antes de escribir código de negocio.

### Naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Variables / funciones | `camelCase` | `splitPercentage`, `calcIva()` |
| Clases / interfaces / types | `PascalCase` | `PaymentService`, `CreatePatientDto` |
| Enums (nombre) | `PascalCase` | `DocumentType`, `GenderType` |
| Enum (valores) | `UPPER_SNAKE_CASE` | `MASCULINE`, `FEMININE`, `V`, `E` |
| Archivos | `kebab-case` | `create-patient.dto.ts`, `jwt-auth.guard.ts` |
| Constantes literales | `UPPER_SNAKE_CASE` | `MAX_SPLIT_PERCENTAGE` |

### Enums y literales — `as const`

Enums en `packages/shared/src/enums/`. Literales con `as const` para inferencia estricta:

```ts
// packages/shared/src/enums/document-type.enum.ts
export enum DocumentType {
  V = 'V',
  E = 'E',
  J = 'J',
  G = 'G',
}

// Para literales (no enums formales)
export const CONSULTATION_STATUSES = ['pending', 'paid', 'cancelled'] as const
export type ConsultationStatus = typeof CONSULTATION_STATUSES[number]
```

### ESLint — Reglas críticas del proyecto

Ambas apps usan **ESLint 9 flat config** (`eslint.config.mjs`). Reglas alineadas con AGENTS.md:

| Regla | Severidad | Por qué |
|-------|-----------|--------|
| `no-explicit-any` | `error` | "Sin `any`. Sin excepciones." |
| `no-floating-promises` | `error` | Promesas sin await causan bugs silenciosos en NestJS async |
| `require-await` | `error` | Funciones `async` que no usan `await` |
| `consistent-type-imports` | `error` | Imports limpios con `type` keyword |
| `no-unused-vars` | `error` (`argsIgnorePattern: '^_'`) | `_` para params de decoradores NestJS |
| `import/order` | `error` | builtin → external → internal → parent/sibling → type |
| `no-console` | `warn` (allow: `['warn', 'error']`) | Usar NestJS Logger, no `console.log` |

Tests (`.spec.ts`, `.test.ts`) relajan `no-explicit-any` y `no-floating-promises` a `off`.

**API** extiende `@eslint/js` + `@typescript-eslint/recommended` + `eslint-config-prettier`.
**Web** extiende `next/core-web-vitals` + `next/typescript` + reglas custom + `eslint-config-prettier`.

> **`eslint-config-prettier`** solo desactiva reglas conflictivas. **No** usar `eslint-plugin-prettier` — ejecuta Prettier como regla ESLint (lento, duplica trabajo). Prettier corre aparte vía `lint-staged`.

### Prettier — config compartida

`.prettierrc` en la raíz del monorepo. Ambas apps heredan. Eliminar `.prettierrc` de `apps/api/`.

```jsonc
{ "semi": true, "singleQuote": true, "trailingComma": "all", "tabWidth": 2, "printWidth": 100, "endOfLine": "lf" }
```

### Git Hooks — Husky + lint-staged + commitlint

Pre-commit valida lint + format en archivos staged. Si falla → commit bloqueado.

```bash
# .husky/pre-commit → npx lint-staged
# .husky/commit-msg → npx commitlint --edit $1
```

**Conventional commits:** `type(scope): descripción`
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

```bash
# Validación completa (CI + pre-push)
pnpm run check  # → typecheck && lint && format:check
```

Ver configs completas (ESLint por app, lint-staged, commitlint, VS Code) en `PLAN.md → Code Quality`.

---

## Errores a Evitar

1. Queries sin `tenant_id` en entidades de negocio — data leak entre centros
2. Exponer entidad directa — usar `ResponseDto`
3. Lógica de negocio en controller — delegar al service
4. Queries directas a DB en service sin inyectar `PrismaService` — inyectar `PrismaService` o un repository custom que lo encapsule
5. Sin validación de permisos — usar `@RequirePermission`
6. `localStorage` para JWT — usar cookie HttpOnly
7. Tipos `any` o variables no tipadas — TypeScript estricto siempre
8. Borrar físicamente entidades financieras/clínicas — no existe "borrar", solo desactivar (`isActive = false`) o anular (`status = voided`)
9. `Float` para campos monetarios en Prisma — usar `Decimal @db.Decimal(12, 2)` siempre
10. Reportes financieros que filtran por `isActive` de entidades relacionadas — desactivar un `Patient` o `Doctor` no debe afectar el balance histórico. Filtrar solo por `Payment.status` y `Expense.status`
11. `try/catch` en componentes UI para mutaciones — usar `onError`/`onSuccess` del `useMutation`
12. Llamadas `apiFetch` directas en `page.tsx` — client pages usan hooks, server pages usan server services
13. Hooks TanStack Query que llaman `apiFetch` directamente — siempre consumir vía service function
14. Colores literales en clases Tailwind (`bg-blue-700`, `text-gray-900`) en lugar de tokens semánticos (`bg-primary`, `text-on-surface`) — rompe el white-label multi-tenant
15. Joinear `Service` o `Specialty` para obtener nombre en reportes/recibos — leer siempre `service_name`/`specialty_name` del snapshot en `ConsultationService`
16. `useActionState` en formularios que llaman a NestJS — usar `react-hook-form` + `useMutation`. `useActionState` es para Server Actions que no llaman API externa
17. Soft-delete con `deletedAt` en entidades financieras/clínicas — Prisma `@default` en campo `deletedAt` o campo similar no aplica en este dominio. Usar `isActive = false` o `status = voided` según la entidad
18. `AuditLog` con campo `payload` genérico — usar `oldValues`/`newValues`/`changedFields` separados. Sin `oldValues` no se puede reconstruir el estado anterior de una entidad en el tiempo
19. `prisma db push` en producción — no genera historial de migraciones y puede destruir datos. En producción **siempre** `prisma migrate deploy`; en desarrollo `prisma migrate dev`
20. `process.env.DATABASE_URL` directo en servicios NestJS — siempre vía `ConfigService` o config namespaced (`databaseConfig`). Excepción: `prisma/seed.ts` (proceso standalone, no NestJS)
21. `DATABASE_URL` con `localhost` en Docker — la URL en el compose debe referenciar el nombre del servicio (`db`), no `localhost`. Sobreescribir en el bloque `environment:` del compose
22. `JWT_EXPIRES_IN` como número (`28800`) — `@nestjs/jwt` v11 usa `StringValue` del paquete `ms`. Valor correcto: `'8h'`. Cast obligatorio: `process.env.JWT_EXPIRES_IN as StringValue`
23. `bcrypt.hashSync` / `bcrypt.compareSync` en `AuthService` — bloquean el event loop ~100ms por llamada. Usar siempre `await bcrypt.hash()` / `await bcrypt.compare()`
24. PII en JWT payload (`documentId`, `phone`, `bank_info`) — el payload solo lleva datos operacionales: `{ sub, email, role, permissions, role_version }`
25. `new PrismaClient()` dentro de un módulo NestJS — instanciar Prisma fuera del DI container crea conexiones huérfanas. Inyectar siempre `PrismaService` vía constructor

---

## Testing

- **Separación estricta:** Nunca mezclar *Mocks* de comportamiento (fábricas `jest.fn()`) con *Fixtures* (objetos de datos simulados como `mockPatient`).
- **Scope:** Mocks locales al módulo salvo que varios módulos los compartan.
