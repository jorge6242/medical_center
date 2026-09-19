# AGENTS.md

Sistema de gestión para centro médico (Venezuela). Controla pagos de consultas, split de ingresos entre doctores y centro médico, egresos operativos, y datos de pacientes.

## Prioridad Actual

- La ruta de estabilidad / demo comercial es `Inicio` (`/inicio`).
- Debe mostrar KPIs reales desde `GET /stats/home` + alertas operativas.

## Skills

Usa `@` para invocar skills disponibles:

- `@nestjs-best-practices` — Al escribir, revisar o refactorizar código NestJS
- `@nextjs-best-practices` — Al trabajar con Next.js App Router
- `@docker-expert` — Para tareas de containerización y Docker

## Stack

| Capa | Tecnología |
|---|---|
| Backend | NestJS (monolito modular) |
| Frontend | Next.js (App Router) |
| DB | PostgreSQL |
| ORM | **Prisma** |
| Package Manager | pnpm |
| Docker | docker-compose |

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

## Estructura

```
centro_medico/
  apps/api/      → NestJS (puerto 3001)
  apps/web/     → Next.js (puerto 3000)
  packages/shared/  → DTOs, enums, interfaces compartidas
  docker-compose.dev.yml   → desarrollo local
  docker-compose.dev.yml   → desarrollo
```

## Comandos — Makefile

Usar `make` desde la raíz. Ver `Makefile` para lista completa.

```bash
make setup              # Primera vez: build + up + migraciones + seeds automáticos
make dev                # Levantar dev (sin rebuild)
make down               # Bajar containers
make down-v             # Bajar + borrar volúmenes (reset DB)
make logs               # Tail logs API
make shell-api          # Shell en container API
make shell-db           # psql en container DB
make db-migrate name=NombreMigracion  # Genera + aplica migración (prisma migrate dev)
make db-deploy                         # Solo aplica migraciones existentes (prisma migrate deploy)
make db-studio                         # Abre Prisma Studio (UI explorador DB)
Producción Railway usa servicios separados desde imágenes Docker Hub; no hay `docker-compose.yml` local de producción.
```

**Orden de arranque garantizado:**
`db` healthcheck pasa → `api` arranca → migraciones → seeds → `GET /health` responde 200 → "Setup complete."

`make setup` hace polling activo: DB con `pg_isready` (max 60s), API con `curl /health` (max 120s). Muestra dots mientras espera, error si timeout.

`GET /health` marcado `@Public()` — devuelve `{ status: 'ok' }` solo cuando NestJS bootstrap completo (incluyendo `onModuleInit` del SeedService). Sin este endpoint el Makefile no puede saber cuándo terminaron migraciones y seeds.

## Estructura Backend (NestJS)

El backend vive en `apps/api/src/` y sigue este patrón organizativo:

```text
apps/api/                ← NestJS API (Backend)
└── src/
    ├── auth/            ← Auth module (login, JWT, guards)
    ├── users/           ← Users module
    ├── patients/        ← Patients module
    ├── doctors/         ← Doctors module
    ├── specialties/     ← Specialties & Services module
    ├── payments/        ← Payments module
    ├── common/          ← Shared across modules
    │   ├── exceptions/  ← Custom business exceptions
    │   ├── filters/     ← Global exception filter
    │   ├── constants/   ← Shared constants & enums
    │   ├── interfaces/  ← Shared TypeScript interfaces
    │   ├── decorators/  ← Custom decorators (@CurrentUser, @Public)
    │   └── utils/       ← Helper functions
    ├── config/          ← App config & env validation
    └── database/        ← PrismaService + PrismaModule
```

Cada módulo de negocio es autónomo:

- `auth/` — login, logout, JWT, guards
- `users/` — gestión de usuarios
- `roles/` — roles, permisos, RoleVersion
- `patients/` — datos de pacientes
- `doctors/` — doctores con split configurable
- `specialties/` — especialidades y servicios
- `consultations/` — registro de visitas
- `payments/` — pagos idempotentes, split, IVA
- `expenses/` — egresos operativos
- `reports/` — PDFs, balances

**Regla:** No importar módulos entre sí salvo dependencia real.

## Convenciones

### NestJS
- Schema de DB: `apps/api/prisma/schema.prisma` — fuente única de verdad
- DTOs en `dto/` del módulo (input/output del API — independientes del schema Prisma)
- `PrismaService` inyectado directo en el Service para CRUD y queries simples
- **Repository Custom (`<entity>.repository.ts`)** SOLO para:
  1. Queries reutilizables en el sistema (ej. `getDoctorsByStatus`) para respetar DRY.
  2. Consultas analíticas pesadas (múltiples `include` / subconsultas complejas).
- Salida: `ResponseDto` — nunca exponer modelo Prisma directamente al cliente
- Usar `plainToInstance` para transformar

### Configuración de Entorno — `@nestjs/config` + Joi

Variables requeridas: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` (valor `8h` — string ms-compatible, no número).

Archivos en `apps/api/src/config/`: `app.config.ts`, `database.config.ts`, `jwt.config.ts`, `env.validation.ts` (Joi schema — falla rápido al arrancar si falta una var).

`ConfigModule.forRoot({ isGlobal: true, validationSchema, load: [...] })` — global, sin reimportar.

**Docker sync:** `env_file: .env.development` en compose. `DATABASE_URL` siempre se sobreescribe en el bloque `environment:` del compose para apuntar al servicio `db` — aunque el `.env` local use `localhost`.

### Prisma — ORM

**`PrismaService`** extiende `PrismaClient`, se registra en `PrismaModule` (`@Global()`). Todos los módulos lo reciben por inyección sin reimportar `PrismaModule`.

**`prisma/schema.prisma`** — define datasource (PostgreSQL), generator (`prisma-client-js`) y todos los modelos con `@@index()` en campos de query frecuente.

```bash
# scripts en apps/api/package.json
db:migrate  → prisma migrate dev      # desarrollo — genera + aplica migración
db:deploy   → prisma migrate deploy   # producción — solo aplica existentes
db:seed     → prisma db seed          # corre prisma/seed.ts
db:studio   → prisma studio           # UI explorador de DB
```

Migraciones generadas automáticamente en `prisma/migrations/`. Seeds en `prisma/seed.ts` usan `new PrismaClient()` standalone (independiente de NestJS). Docker entrypoint corre `prisma migrate deploy && prisma db seed` antes de arrancar NestJS.

**Campos monetarios:** `Decimal @db.Decimal(12, 2)` — nunca `Float`.

**Transacciones:** `await prisma.$transaction(async (tx) => { ... })` — rollback automático si cualquier operación falla.

### Tenant Safety — Reglas Estrictas

**Regla base:** toda query sobre datos de negocio debe estar scoped por `tenantId`. Si un modelo no tiene `tenantId` directo, filtrar por la relación que sí lo tiene.

| Caso | Regla obligatoria |
|---|---|
| `findMany` / `count` / reportes | Incluir `where: { tenantId, ... }` en el modelo principal. |
| `findFirst` / detalle por id | Usar `where: { id, tenantId }`; nunca solo `{ id }` en modelos tenant-scoped. |
| `update` / `delete` / `upsert` por id | Primero validar pertenencia con `tenantId` o usar `updateMany({ where: { id, tenantId } })`. Nunca aceptar ids del request sin validación tenant previa. |
| Modelos indirectos sin `tenantId` (`ServicePrice`, `DoctorReceipt`, detalles de pagos, pivotes) | Filtrar por relación tenant-scoped: ej. `ServicePrice -> specialty.tenantId`, `DoctorReceipt -> payment.tenantId`, `PaymentDetail -> payment.tenantId`. |
| Auth / roles | El backend login requiere `tenantSlug + email + password`; el frontend debe resolver `tenantSlug` por contexto/configuración, no pedirlo manualmente al usuario salvo fallback operativo. Cualquier lookup de `User`, `Role` o `RoleVersion` debe considerar tenant. El cache de roles debe usar key compuesta `tenantId:roleName`. |
| Idempotencia | Las claves de idempotencia nunca pueden devolver datos de otro tenant. Si la constraint es global, validar el tenant del registro encontrado antes de responder. |
| Endpoints `@Public()` | Prohibido devolver datos tenant-scoped. Solo `GET /health` puede ser público sin tenant. |
| Catálogos y precios | Aunque parezcan "globales", si dependen de `Specialty`, `LabTestCatalog`, precios o configuración, deben usar `tenantId`. |

**Checklist antes de cerrar cualquier cambio backend:**
- [ ] Busqué queries Prisma nuevas o modificadas.
- [ ] Cada modelo con `tenantId` tiene filtro tenant en lecturas/listados.
- [ ] Cada modelo indirecto se filtra por relación tenant-scoped.
- [ ] Ningún endpoint `@Public()` expone precios, pacientes, doctores, pagos, reportes, laboratorios o configuración tenant.
- [ ] No introduje cache global por nombre (`roleName`, `email`, `slug`) cuando el dato varía por tenant.

## Estructura Frontend (Next.js)

El frontend vive en `apps/web/src/` y sigue el patrón Feature-Sliced Design adaptado a App Router:

```text
apps/web/src/
├── app/                 # Next.js App Router (Routing, Layouts y Pages)
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/pacientes/page.tsx
│   ├── layout.tsx       # Root layout + Providers
│   └── loading.tsx      # Global App Shell / Skeleton
├── config/              # fetch/axios config y query.config.ts
├── features/            # Lógica y UI encapsulada por dominio
│   ├── pacientes/
│   │   ├── store/       # Zustand store (solo si requiere estado cliente local)
│   │   ├── hooks/       # usePatients, useCreatePatient (TanStack Query)
│   │   ├── components/  # PatientForm, PatientTable
│   │   └── services/    # llamadas API (patients.service.ts)
│   ├── doctores/
│   └── pagos/
├── shared/              # Código reutilizable transversalmente
│   ├── components/      # UI base de Shadcn (Button, Input, Layouts globales)
│   ├── hooks/           # usePagination, useDebounce
│   ├── utils/           # formatCurrency, cn (tailwind merge)
│   └── types/           # TypeScript interfaces compartidas
└── stores/              # Zustand stores globales
    └── auth.store.ts    # Estado de Auth (Zustand en memoria RAM, sin localStorage)
```

### Convenciones Next.js
- **Server Components** por defecto, `'use client'` solo si es estrictamente necesario (ej. interactividad).
- **Manejo de Estado:**
  - **Server State:** Datos del backend a través de **TanStack Query**. NO duplicar en Zustand.
  - **Client State:** **Zustand** SOLO para UI global o auth token en RAM.
- **Loading UX:** Uso de App Shell y Skeletons (`loading.tsx`) por vista.
- Tipos compartidos en `packages/shared/src/`.
- **Providers:** `app/providers.tsx` (`'use client'`) envuelve `QueryClientProvider`. Se importa en `app/layout.tsx`. Config global en `config/query.config.ts` con `staleTime: 60_000, retry: 1`.
- **Thin Pages:** `page.tsx` nunca tiene llamadas HTTP directas ni `try/catch`. Solo compone — client pages usan hooks, server pages usan server services.
- **Mutaciones sin try/catch en UI:** `onError`/`onSuccess` en `useMutation` disparan Toasts. El componente solo llama `mutate(data)`.
- **Services layer:** `features/<domain>/services/<domain>.service.ts` — funciones async puras, tipadas, sin React. Los hooks TanStack Query consumen estos services, no `apiFetch` directo.
- **Stack de formularios:** `react-hook-form` + `zod` (via `@hookform/resolvers`) para validación. `useMutation` para submit + cache invalidation. `useActionState` no aplica — el proyecto llama a NestJS (API externa), no a Server Actions.

## Patrones Clave

### Auditoría — AuditLog
- `oldValues: jsonb` + `newValues: jsonb` + `changedFields: string[]` — sin estos tres campos el log no permite reconstruir estado histórico
- Entidades auditadas: `Patient` (CREATE/UPDATE/DEACTIVATE), `Specialty`, `Service`, `ExpenseCategory`, `Doctor`, `DoctorBankAccount`, `ExchangeRate`, `SystemConfig`, `User`, `Payment` (VOID), `Expense` (VOID), Auth
- UPDATE automático vía Prisma Middleware (registrado en `PrismaService.onModuleInit()`). VOID/DEACTIVATE/LOGIN → `AuditService.log()` manual desde Service
- `userId`/`tenantId` en Middleware vía `AsyncLocalStorage` — `JwtAuthGuard` escribe contexto al inicio de cada request
- Permiso `delete` en ACL nunca dispara `DELETE` SQL — mapea a `DEACTIVATE` (Patient/Doctor/Specialty) o `VOID` (Payment/Expense) según entidad
- `Expense.category_name` snapshot obligatorio — igual que `ConsultationService.service_name`

### Autenticación
- JWT en cookie HttpOnly (no localStorage)
- Sin Refresh Token: expiración de 8 horas (fuerza login por jornada)
- Token desde `req.cookies.access_token`
- Decorador `@Public()` para endpoints públicos
- **401 en `apiFetch` (client):** si API retorna 401 → `window.location.href = '/login'`. Solo en client-side (`!isServer`).
- **JWT payload:** solo `{ sub, email, role, permissions, role_version }` — nunca `password`, `documentId`, `phone`, `bank_info` ni PII
- **bcrypt async obligatorio:** `await bcrypt.hash(pwd, 10)` / `await bcrypt.compare()`. NUNCA `hashSync`/`compareSync` — bloquean event loop ~100ms por llamada

### ACL
- `@RequirePermission(resource, action)` en endpoints
- Permisos validados por `AclGuard`
- Sistema: User → Role → Permission

### Pagos
- Idempotencia con `ConsultationPayment` (evita doble cobro)
- Split sobre `total_service_usd` — nunca sobre IGTF: `doctor_share = total_service_usd * split_percentage / 100`
- IVA **no aplica** — consultas médicas exentas en Venezuela (TSJ)
- IGTF: sobre líneas en divisas excepto `POS_USD_CARD`. Tasa en `SystemConfig.igtf_rate` (actualmente 0% — Decreto 4.972 jul-2024, configurable sin deployment)
- Modelo Cabecera + Líneas: `Payment` + `PaymentDetail` (una por método de pago) + `PaymentAdjustment`
- `Payment.bcv_exchange_rate` snapshot inmutable — tasa BCV del día del pago
- `ConsultationService` guarda snapshot completo: `service_name`, `specialty_name`, `price_usd` — reportes y recibos nunca joinean `Service`/`Specialty` para obtener nombres (pueden estar renombrados o desactivados con `isActive = false`)
- `ServicePrice` (pivote N:N entre `Specialty` y `Service`) contiene el precio por especialidad — nombre elegido sobre `SpecialtyService` para evitar colisión con la clase `@Injectable()` de NestJS

### Recibos de Doctor
- PDF generado en **frontend** con `@react-pdf/renderer` — on-demand, sin almacenamiento en Fase 1
- Backend crea `DoctorReceipt` en DB al completar pago: snapshot de datos + número secuencial `CM-{AÑO}-{SEQ}`
- `GET /receipts/:paymentId/data` retorna datos del snapshot para que el frontend construya el PDF
- Snapshot obligatorio: `doctor_name`, `split_percentage`, `bank_name`, `account_number` — no depender de FK porque esos datos pueden cambiar después del pago

## Buenas Prácticas de Arquitectura (Clean Code)

- **Anti-Arrow Pattern:** Early Return en validaciones — evitar `else`. Encapsular booleans complejos en variables con nombre semántico.
- **Funciones cortas:** Máximo ~30 líneas. Lógica compleja → métodos privados o `common/utils/`.
- **Composite Decorators:** Agrupar múltiples decoradores con `applyDecorators()` (ej. `@AuthAndPermission`).
- **Filtros e Interceptores Globales:** `HttpExceptionFilter` + `TransformInterceptor` globales en `main.ts`.
- **Validación de Entorno:** Joi en `ConfigModule` — falla rápido si falta var requerida.
- **Persistencia Total:** Entidades financieras/clínicas nunca se borran. `Patient`/`Doctor`/`User`/`Service`/`Specialty` → `isActive = false`. `Consultation`/`Payment`/`Expense` → `status = voided`. Ninguna usa `@DeleteDateColumn()`.
- **Seguridad extra:** `helmet` + `@nestjs/throttler` en el backend.
- **Flujo de excepciones:** Controller → Service lanza → `HttpExceptionFilter` captura → JSON estructurado. Controllers nunca usan `try/catch`.
- **Custom exceptions** en `src/common/exceptions/` — extienden `HttpException`, naming `{Motivo}Exception`, lanzadas solo desde Services.
- **Built-in exceptions:** `NotFoundException` (no existe), `ConflictException` (duplicado), `ForbiddenException` (sin permiso), `UnauthorizedException` (JWT inválido). Custom solo cuando el mensaje necesita contexto de dominio.

## Convenciones de Código

| Elemento | Convención |
|---|---|
| Variables / funciones | `camelCase` |
| Clases / interfaces / types | `PascalCase` |
| Enums (nombre) | `PascalCase` |
| Enum (valores) | `UPPER_SNAKE_CASE` |
| Archivos | `kebab-case` |
| Constantes literales | `UPPER_SNAKE_CASE` |

### TypeScript Strict

- `strict: true`, `noImplicitAny: true`, `strictNullChecks: true` en ambos proyectos
- **Nunca usar `any`**
- Enums con `as const`: `const STATUSES = ['pending', 'paid'] as const`

### Estilos de Código (SOLID & Clean Code)

**Imports:**
- Usar ES modules: `import { Injectable } from '@nestjs/common'`
- Nunca CommonJS `require()`

**Funciones cortas (SOLID):**
- Máximo ~30 líneas por función
- Si la lógica se complica → extraer a métodos privados o `common/utils/`

**Condicionales (Anti-Arrow Pattern):**
- **Early Returns:** Validar errores primero, lanzar excepciones inmediatamente
- **Evitar `else`:** Si el `if` lanza o retorna, no usar `else`
- **Encapsular condiciones complejas:** `const isEligible = hasWatched && !hasExisting`

```typescript
// ✅ Correcto: Early return
async function createPatient(dto: CreatePatientDto) {
  if (!dto.name) {
    throw new BadRequestException('Name is required');
  }
  if (!dto.documentId) {
    throw new BadRequestException('Document is required');
  }
  // Happy path al final
  return this.patientRepo.save(dto);
}

// ✅ Encapsular condiciones
const isEligibleForDiscount = patient.age >= 65 && patient.hasInsurance;
if (isEligibleForDiscount) {
  applyDiscount();
}
```

**Utils y Hooks:**

```typescript
// Backend: common/utils/currency.utils.ts
export function calculateSplit(total: number, percentage: number): {
  doctor: number;
  center: number;
} {
  const doctor = total * percentage / 100;
  return { doctor, center: total - doctor };
}

// Frontend: features/pacientes/hooks/usePatients.ts
export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: () => patientsService.getAll(),
  });
}
```

**Evitar Death Code:**
- Código sin usar → eliminar inmediatamente
- Imports sin usar → limpiar
- Funciones obsoletas → borrar o marcar como `@deprecated`

**ESLint + Prettier:**
- Siempre ejecutar antes de commit: `pnpm run lint && pnpm run format`
- CI bloquea PRs con errores

## Errores a Evitar

1. Queries sin `tenant_id` en entidades de negocio
2. Exponer modelo Prisma directamente al cliente — usar `ResponseDto`
3. Lógica de negocio en controller — delegar al service
4. No inyectar `PrismaService` correctamente — siempre via constructor injection, nunca `new PrismaClient()` dentro de un módulo NestJS
5. Sin validación de permisos — usar `@RequirePermission`
6. localStorage para JWT — usar cookie HttpOnly
7. Uso de tipos `any` o variables no tipadas en TypeScript estricto
8. Borrar entidades financieras/clínicas — no existe "borrar" en este dominio:
   - `Patient`, `Doctor`, `User`, `Service`, `Specialty` → desactivar con `isActive = false`
   - `Consultation`, `Payment`, `Expense` → anular con `status = voided`
   - Ninguna entidad de negocio usa soft-delete con `deletedAt`
9. Reportes que filtran por `isActive` de entidades relacionadas — desactivar un Patient/Doctor no afecta el balance. Filtrar solo por `Payment.status` y `Expense.status`
10. `try/catch` en componentes UI para mutaciones — usar `onError`/`onSuccess` del `useMutation`
11. Llamadas `apiFetch` directas en `page.tsx` — client pages usan hooks, server pages usan server services
12. Hooks TanStack Query que llaman `apiFetch` directamente — siempre consumir vía service function
13. Joinear `Service`/`Specialty` en reportes para obtener nombre — leer `service_name`/`specialty_name` del snapshot en `ConsultationService`
14. `useActionState` en formularios que llaman NestJS — usar `react-hook-form` + `useMutation`
15. `AuditLog.payload` genérico — usar `oldValues`/`newValues`/`changedFields` separados
16. Interpretar permiso `delete` como `DELETE` SQL — es `DEACTIVATE` (isActive=false) o `VOID` (status=voided) según la entidad
17. `Float` para campos monetarios en Prisma — usar `Decimal @db.Decimal(12, 2)` siempre
18. `prisma db push` en producción — usa `prisma migrate deploy`; `db push` no genera historial de migraciones
19. Usar `process.env` directo en servicios NestJS — siempre `ConfigService` o config namespaced. Excepción: `prisma/seed.ts` (proceso standalone)
20. `DATABASE_URL` con `localhost` en Docker — debe apuntar al nombre del servicio (`db`) sobreescrito en el compose
21. `JWT_EXPIRES_IN` como número (`28800`) — `@nestjs/jwt` v11 usa `StringValue` (del paquete `ms`). Valor correcto: `'8h'`. Cast: `process.env.JWT_EXPIRES_IN as StringValue`
22. Tipo `any` o `strictNullChecks` desactivado — TypeScript strict obligatorio en ambas apps
23. Enum values en `camelCase` o `PascalCase` — siempre `UPPER_SNAKE_CASE`
24. Commit sin pasar `pnpm run lint && pnpm run format`
25. `try/catch` en controllers — solo en Services; filter global captura el resto
26. Custom exception cuando existe built-in equivalente (`NotFoundException`, `ConflictException`, etc.)
27. `apiFetch` sin manejo de 401 en client — sesión expirada queda sin redirigir a `/login`
28. `bcrypt.hashSync` / `bcrypt.compareSync` en AuthService — bloquea event loop en cada login
29. PII (`documentId`, `phone`, `bank_info`) en JWT payload — solo datos operacionales no sensibles
30. `new PrismaClient()` dentro de un módulo NestJS — crea conexiones huérfanas. Inyectar siempre `PrismaService` vía constructor injection
31. `fieldName: string / fieldValue: string` para campos dinámicos del paciente (antipatrón EAV) — usar `extraData: Json @db.JsonB` en `Patient`. Sin type safety, no indexable, queries ineficientes. Cast a `PatientExtraData` interface en el service
32. `split_percentage: Int` en `Doctor` — usar `Decimal @db.Decimal(5, 2)`. Un médico que negocia 67.5% no puede representarse con entero. `Float` tampoco — imprecisión en cálculos financieros
33. Usar `SpecialtyService` como nombre de entidad — en NestJS se lee invariablemente como la clase `@Injectable()` del módulo. El pivote N:N se llama `ServicePrice` en este proyecto
34. `DATABASE_URL` sin parámetros de pool — siempre incluir `connection_limit` y `pool_timeout`. Sin esto, bajo carga concurrente se agotan las ~97 conexiones de PostgreSQL en Railway. Ver sección Connection Pooling en CLAUDE.md

## Testing

- **Separación estricta:** Nunca mezclar *Mocks* de comportamiento (fábricas de `jest.fn()`) con *Fixtures* (objetos de datos simulados como `mockPatient`).
- **Scope:** Mantener los mocks locales al módulo a menos que varios módulos requieran compartirlos.

## Más Detalles

Ver `CLAUDE.md` para información completa.
