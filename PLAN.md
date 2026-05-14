# Plan de Desarrollo — Centro Médico

## Stack Decidido

| Capa | Tecnología |
|---|---|
| Backend | NestJS (monolito modular) |
| Frontend | Next.js (React, App Router) |
| Base de datos | PostgreSQL |
| ORM | **Prisma** |
| Repo | Monorepo — `pnpm-workspace.yaml` (workspaces simples, sin Turborepo) |
| Package manager | pnpm |
| Tipos compartidos | `packages/shared` (TypeScript) |
| Password | bcrypt async (10 rounds) — NUNCA `hashSync`/`compareSync`, bloquea event loop |
| Estado global | Zustand (client) + TanStack Query (server state) |
| Campos dinámicos | `Patient.extraData` JSONB — Fase 1. Tablas por especialidad en Fase 3 |
| Deploy | Railway — configurar post Fase 1 |
| PDF receipts | `@react-pdf/renderer` — generación compartida (Frontend: on-demand, Backend: para correos) |
| Email service | `@nestjs-modules/mailer` + Nodemailer |
| PDF Pattern | Strategy Pattern para templates y mapping (Flattener) |

---

## Enums Globales

| Enum | Valores | Ubicación |
|------|---------|-----------|
| GenderType | masculine, feminine | `packages/shared/src/enums/` |
| DocumentType | V, E, J, G | `packages/shared/src/enums/` |

**Nota:** Los enums se comparten entre backend y frontend via `packages/shared`.

---

## Arquitectura del Monorepo

```
centro_medico/
  apps/
    api/          → NestJS monolito modular
    web/          → Next.js
  packages/
    shared/       → tipos TypeScript compartidos (DTOs, enums, interfaces)
  docker/
    nginx/        → config del reverse proxy
  docker-compose.yml
  docker-compose.dev.yml
```

---

## Docker — Contenedores por Responsabilidad

### Contenedores

| Contenedor | Imagen | Responsabilidad |
|---|---|---|
| `api` | Node (custom) | NestJS — lógica de negocio + REST API |
| `web` | Node (custom) | Next.js — frontend SSR |
| `db` | postgres:16 | Base de datos PostgreSQL |
| `nginx` | nginx:alpine | Reverse proxy — enruta `/api` → api, `/` → web |
| `redis` | redis:7-alpine | Broker de mensajes (BullMQ) + Cache. Config: `--appendonly yes` — **Fase 2** |
| `worker` | Node (custom) | NestJS — procesamiento asíncrono de colas (mismo código que `api`) — **Fase 2** |

### Por qué estos 6 y no más

- **`api` separado de `web`**: escalan diferente, se despliegan diferente, logs separados
- **`db` separado**: datos persisten independiente del ciclo de vida de la app, backup aislado
- **`nginx`**: un solo punto de entrada (puerto 80/443), sin exponer puertos de api/web directamente
- **`redis`**: gestión de colas y caché distribuida
- **`worker` separado de `api`**: el worker consume recursos de CPU (PDFs) sin afectar la latencia de la API. Ambos comparten el mismo código pero activan módulos diferentes según variables de entorno.

### Estrategia dev vs prod

**`docker-compose.dev.yml`** (desarrollo):
- Volúmenes montados para hot reload (`apps/api/src`, `apps/web/src`)
- Variables de entorno desde `.env.local`
- Puerto DB expuesto localmente para debugging
- Sin nginx (dev accede directo a puertos)

**`docker-compose.yml`** (producción):
- Imágenes buildeadas, sin volúmenes de código
- nginx activo
- Puerto DB **no** expuesto externamente
- Variables desde `.env.production`

### Puertos

| Servicio | Dev | Prod (externo) |
|---|---|---|
| web | 3000 | 80/443 vía nginx |
| api | 3001 | 80/443 vía nginx (`/api`) |
| db | 5432 | cerrado |

### Estructura de red Docker

```
nginx (puerto 80)
  ├── /api/*  → api:3001
  └── /*      → web:3000

api → db:5432 (red interna)
api → redis:6379 (red interna)
worker → db:5432 (red interna)
worker → redis:6379 (red interna)
web → api (vía nginx o red interna)
```

### Estrategia Redis (Infraestructura)

- **Persistencia:** Activada vía AOF (`appendonly yes`) con fsync cada segundo. Esto garantiza que los Jobs de BullMQ no se pierdan ante un reinicio del contenedor.
- **Memoria:** Política `allkeys-lru` (borrar lo menos usado al llenar el límite). Evita caídas por falta de memoria RAM.
- **Seguridad:** Uso de `requirepass` definido vía variable de entorno en el compose.
- **Naming:** Patrón jerárquico `[app]:[modulo]:[tipo]:[id]` (ej: `cm:cache:bcv_rate`).

---

## Módulos del Backend (NestJS)

### Módulo 0: Organismo (Tenant)
- Representa a la institución médica (clínica, consultorio, centro).
- Punto de entrada para el aislamiento de datos.

### Entidad: Tenant

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| name | string | Nombre comercial de la institución |
| slug | string | Único para URLs (ej: `clinica-el-avila`) |
| status | enum | `ACTIVE`, `SUSPENDED`, `ARCHIVED` |
| countryCode | enum | `VE`, `CO`, `US`, etc. (ISO 3166-1) |
| locale | string | default `es-VE` |
| timezone | string | default `America/Caracas` |
| ownerId | FK → User | Responsable legal/administrativo del tenant |
| config | jsonb | Logo, colores del tema, moneda base, tipografía — ver estructura en "Sistema de Theming" |
| createdAt | datetime | |
| updatedAt | datetime | |

---

### Arquitectura Multi-País (Estrategias Regionales) — Fase 3

> **No implementar en Fase 1.** El diseño de la interfaz se documenta aquí para no requerir refactor cuando se agregue el primer cliente en otro país. En Fase 1 solo existe Venezuela.

Para escalar globalmente sin ensuciar el código con condicionales, se implementa el **Patrón Strategy** para lógica regionalizada:

1. **Regional Strategy Registry:** Un servicio central que inyecta la lógica correcta basada en el `countryCode` del Tenant actual.
2. **Fiscal Strategy:** Cada país implementa su propia lógica de impuestos.
   - `VenezuelaFiscalStrategy`: Maneja IGTF (0%-3%) y exención IVA en consultas — **única implementación en Fase 1**
   - `ColombiaFiscalStrategy`: IVA 19% + retenciones — **Fase 3, cuando haya cliente colombiano**
3. **Identity Strategy:** Máscaras y validaciones para documentos (V/E/J en VE, CC/NIT en CO).
4. **Currency Strategy:** Monedas locales vs USD, redondeos.

---

### Internacionalización (I18N) — Fase 3

> **No implementar en Fase 1 ni Fase 2.** El sistema es en español venezolano. I18N agrega costo de setup sin beneficio actual.

- **Frontend:** `next-intl` (App Router compatible)
- **Backend:** `nestjs-i18n`
- **Shared:** Enums y constantes traducibles en `packages/shared`

---

### Módulo 1: Pacientes (Patient)
- Registro de paciente: nombre, apellido, cédula, teléfono, email, sexo, fecha de nacimiento
- Campos base definidos (ver tabla más abajo)
- Extensible a historial clínico (futuro)

### Entidad: Patient

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| name | string | Primer nombre |
| lastName | string | Apellido |
| documentType | enum DocumentType | V, E, J, G |
| documentId | string | Número de cédula |
| gender | enum GenderType | masculine, feminine |
| phone | string? | Teléfono móvil |
| email | string? | Correo electrónico |
| birthDate | date? | Fecha de nacimiento |
| address | string? | Dirección |
| emergencyContact | string? | Contacto de emergencia |
| notes | string? | Observaciones |
| extraData | jsonb? | Campos dinámicos por especialidad — ver diseño abajo |
| isActive | boolean | default true |
| tenantId | UUID | FK → Tenant (NOT NULL) — Aislamiento estricto |
| createdAt | datetime | |
| updatedAt | datetime | |

### Campos dinámicos del paciente — `extraData: JsonB`

**Fase 1 — JSONB en `Patient`:** En lugar de una tabla `PatientExtraFields` con `fieldName: string / fieldValue: string`, los campos extra se guardan como JSONB directamente en el registro del paciente.

```prisma
model Patient {
  // ... campos base ...
  extraData Json?  @db.JsonB  // { bloodType: "O+", lastPeriod: "2026-01-15", ... }
}
```

**Por qué no `fieldName/fieldValue` (antipatrón EAV):**
- Sin type safety — `fieldValue: string` no distingue fecha de texto libre de número
- No indexable por campo individual — buscar `bloodType = 'O+'` en toda la DB es un full scan
- Queries complejos: `WHERE fieldName = 'bloodType' AND fieldValue = 'O+'` es ineficiente y propenso a errores
- Con JSONB: `WHERE extra_data->>'bloodType' = 'O+'` — indexable con `@@index` de GIN en Prisma

**Acceso tipado en TypeScript:**
```ts
// Definir interface en packages/shared
export interface PatientExtraData {
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-'
  lastPeriodDate?: string  // ISO date
  allergies?: string[]
  // ... por especialidad
}

// En el service: cast tipado
const extra = patient.extraData as PatientExtraData
```

**Fase 3 — Tablas dedicadas por especialidad:** Cuando haya múltiples especialidades con campos estructurados complejos (ej. `GynecologyProfile`, `PediatricsProfile`), migrar a tablas 1:1 con `Patient`. Esto habilita constraints, índices por campo, y queries relacionales completas. JSONB de Fase 1 es un paso de migración natural — el campo `extraData` coexiste con las tablas de perfil en la transición.

### Módulo 2: Doctores (Doctor)
- Registro de doctor con especialidad y subespecialidad
- Tarifa por doctor (varía entre doctores)
- Porcentaje de split (70/30 o 60/40 — configurable por doctor)
- Datos bancarios del doctor (tabla separada para múltiples cuentas)

### Entidad: Doctor

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| name | string | Nombre completo |
| email | string | Correo |
| phone | string | Teléfono |
| split_percentage | numeric(5,2) | % doctor (ej: 70.00, 67.50, 33.33) — soporta fracciones de punto flotante |
| isActive | boolean | |
| tenantId | UUID | FK → Tenant (NOT NULL) — aislamiento estricto |
| createdAt | datetime | |
| updatedAt | datetime | |

### Entidad: DoctorSpecialty (relación N:N doctor ↔ especialidad)

| Campo | Tipo | Notas |
|------|------|-------|
| doctor_id | FK → Doctor | PK compuesta |
| specialty_id | FK → Specialty | PK compuesta |
| isPrimary | boolean | Especialidad principal del doctor (solo una `true` por doctor) |
| tenantId | UUID | FK → Tenant (NOT NULL) |

**Regla `isPrimary`:** primera especialidad asignada = `isPrimary: true` automáticamente. Permite al doctor ofrecer servicios de múltiples especialidades. Al listar servicios disponibles de un doctor → JOIN a través de `DoctorSpecialty` para traer todos sus servicios.

### Entidad: DoctorBankAccount (Cuentas bancarias)

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| doctor_id | FK → Doctor | |
| bankName | string | Nombre del banco |
| accountType | enum | `SAVINGS` \| `CHECKING` |
| accountNumber | string | Número de cuenta |
| documentId | string | Cédula del titular |
| phone | string | Celular del titular |
| isDefault | boolean | default false — cuenta usada para recibos |
| isActive | boolean | default true |
| tenantId | UUID | FK → Tenant (NOT NULL) |

**Regla `isDefault`:** Un doctor puede tener múltiples cuentas pero solo una `isDefault = true`. Al generar el recibo, el snapshot toma la cuenta con `isDefault = true` en ese momento. Cambiar el default no afecta recibos históricos (son snapshots). Al crear la primera cuenta de un doctor → `isDefault` se fuerza a `true` automáticamente.

**Flujo:** Doctor se registra con sus cuentas → Al hacer pago, snapshot toma cuenta `isDefault` → Se genera PDF del recibo

### Módulo 3: Especialidades y Servicios
- Relación N:N — una especialidad ofrece muchos servicios, un servicio puede pertenecer a múltiples especialidades
- El precio vive en la tabla pivote (`ServicePrice`) — el mismo servicio puede tener distinto precio según la especialidad
- CRUD de especialidades permite buscar servicios existentes o crear nuevos

#### Entidad: Specialty

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| name | string | Nombre de la especialidad (ej: "Ginecología y Obstetricia") |
| description | string? | Descripción opcional |
| isActive | boolean | default true |
| tenantId | UUID | FK → Tenant (NOT NULL) |
| createdAt | datetime | |
| updatedAt | datetime | |

#### Entidad: Service (catálogo de servicios médicos — reutilizable)

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| name | string | Nombre del servicio (ej: "Ecografía obstétrica", "Consulta + Electrocardiograma") |
| description | string? | Descripción opcional |
| isActive | boolean | default true |
| tenantId | UUID | FK → Tenant (NOT NULL) |
| createdAt | datetime | |
| updatedAt | datetime | |

**Nota:** `Service` es un catálogo independiente. No tiene precio propio — el precio se define en la relación con la especialidad (`ServicePrice`).

#### Entidad: ServicePrice (pivote N:N — precio por especialidad)

> **Nombre elegido sobre `SpecialtyService`:** En NestJS, `SpecialtyService` se lee invariablemente como la clase `@Injectable()` del módulo de especialidades — colisión garantizada en code reviews, búsquedas y autocompletado. `ServicePrice` describe con precisión qué contiene la entidad: el precio de un servicio bajo una especialidad específica.

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| specialty_id | FK → Specialty | |
| service_id | FK → Service | |
| price_usd | numeric(12,2) | Precio del servicio bajo esta especialidad (ej: "Eco obstétrica" = $30 en Ginecología, $50 en Cardiología) |
| isActive | boolean | default true — permite desactivar sin borrar |
| tenantId | UUID | FK → Tenant (NOT NULL) |
| createdAt | datetime | |
| updatedAt | datetime | |

**UNIQUE constraint:** `(specialty_id, service_id, tenantId)` — un servicio solo puede estar una vez por especialidad por tenant.

**¿Por qué precio en el pivote y no en Service?** Porque el mismo servicio puede tener precios distintos según la especialidad:
- "Consulta + Electrocardiograma" bajo Medicina General = $30
- "Consulta + Electrocardiograma" bajo Cardiología = $50

**Flujo CRUD de especialidades:**
1. Admin crea/edita una especialidad
2. En el formulario, busca servicios existentes del tenant (autocomplete) o crea uno nuevo
3. Asigna el precio específico para esa combinación especialidad + servicio
4. El servicio queda disponible para reusar en otras especialidades con precio diferente

**Flujo de selección de servicios en pago:**
1. Recepcionista selecciona doctor → se obtienen sus especialidades (vía `DoctorSpecialty`)
2. Se listan los servicios disponibles por cada especialidad (vía `ServicePrice`)
3. Recepcionista selecciona uno o más `ServicePrice` → el precio viene de `ServicePrice.price_usd`
4. `ConsultationService.price_usd` snapshot inmutable del precio al momento del pago

#### Diagrama de relaciones Specialty ↔ Service ↔ Doctor

```
Doctor (1) ──── (N) DoctorSpecialty (N) ──── (1) Specialty
                                                        │
                                                   (1) Specialty
                                                        │
                                                   (N) ServicePrice
                                                        │
                                                   (1) Service

ConsultationService.price_usd = snapshot de ServicePrice.price_usd
```

### Módulo 4: Consultas y Pagos

#### Entidad: Consultation

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| patient_id | FK → Patient | |
| doctor_id | FK → Doctor | |
| date | datetime | Fecha/hora de la consulta |
| status | enum | `pending` \| `paid` \| `voided` |
| payment_id | FK → Payment? | nullable — se asigna al completar el pago |
| tenantId | UUID | FK → Tenant (NOT NULL) |
| createdAt | datetime | |
| updatedAt | datetime | |

**Sin `deletedAt`** — `Consultation` nunca se borra. El estado `voided` es el equivalente de "eliminación". Usar `status = voided` para anular — nunca soft-delete. Registro persiste para auditoría financiera.

**Regla:** `pending` = esperando pago (no "esperando atención"). Flujo es pago primero, atención después. `Consultation` se crea dentro de la transacción de pago — nunca existe sin pago completado.

#### Entidad: ConsultationService (líneas de servicios por consulta)

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| consultation_id | FK → Consultation | |
| service_id | FK → Service (NOT NULL) | FK para auditoría — el registro histórico no depende de este join |
| specialty_id | FK → Specialty (NOT NULL) | FK para auditoría — ídem |
| service_name | varchar NOT NULL | **Snapshot** del nombre del servicio al momento del pago — inmutable |
| specialty_name | varchar NOT NULL | **Snapshot** del nombre de la especialidad al momento del pago — inmutable |
| price_usd | decimal NOT NULL | **Snapshot** del precio al momento del pago (desde `Service.price_usd`) — inmutable |
| tenantId | UUID | FK → Tenant (NOT NULL) |

**Propósito:** Una consulta puede incluir uno o más servicios (ej: consulta + ecografía + citología como ítems separados). Todos los campos relevantes son **snapshots inmutables** — si un admin renombra o elimina un servicio/especialidad, los reportes y recibos históricos no se ven afectados.

**Regla de lectura en reportes:** siempre leer `service_name` y `specialty_name` del snapshot. Nunca joinear `Service` o `Specialty` para obtener el nombre — esos registros pueden haber sido renombrados o desactivados (`isActive = false`).

**`Payment.total_service_usd`** = `SUM(ConsultationService.price_usd)` — calculado en la transacción de pago antes de persistir.

#### Entidad: Payment

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| consultation_id | FK → Consultation | |
| total_service_usd | decimal | Precio del/los servicios en USD (ej: 100.00) — fuente del split del doctor |
| bcv_exchange_rate | decimal | Tasa BCV usada ese día (snapshot) para conversiones históricas |
| total_igtf_usd | decimal? | Total IGTF calculado en USD (ej: 1.80) — acumulado desde `PaymentDetail` |
| total_paid_usd | decimal | Suma de importes pagados en USD (agregado `PaymentDetail`) |
| total_paid_bs | decimal | Suma de importes pagados en VES (agregado `PaymentDetail`) |
| doctor_share_usd | decimal | `total_service_usd * split_percentage / 100` — cantidad en USD a pagar al doctor (no incluye IGTF) |
| center_share_usd | decimal | `total_service_usd - doctor_share_usd` |
| status | enum | `pending` \| `completed` \| `voided` |
| tenantId | UUID | FK → Tenant (NOT NULL) |
| createdAt | datetime | |

**Notas:** `total_service_usd` es la fuente verdadera para el cálculo del split; los impuestos y ajustes van aparte.

#### Entidad: PaymentDetail (líneas de pago)

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| payment_id | FK → Payment | |
| payment_method | enum | `CASH_USD` \| `ZELLE` \| `POS_BS` \| `PAGO_MOVIL` \| `WIRE_TRANSFER_USD` \| `POS_USD_CARD` |
| currency | enum | `USD` \| `VES` |
| amount | decimal | Monto pagado en la `currency` indicada |
| reference_number | string? | Opacable — ref del POS, Zelle, Pago Móvil, etc. |
| applied_igtf_amount | decimal? | IGTF generado por esta línea (en USD) — si aplica |
| tenantId | UUID | FK → Tenant (NOT NULL) |
| createdAt | datetime | |

#### Entidad: PaymentAdjustment (descuentos / cargos / montos a favor)

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| payment_id | FK → Payment | |
| payment_detail_id | FK → PaymentDetail? | Opcional — vinculado a una línea específica si aplica |
| adjustment_type | enum | `DISCOUNT` \| `SURCHARGE` \| `CREDIT` \| `REFUND` |
| amount | decimal | Monto del ajuste (usar signo positivo; `DISCOUNT` se registra positivo y el cálculo lo aplica restando) |
| currency | enum | `USD` \| `VES` |
| reason | string? | Texto libre para auditoría (ej: "IGTF 3% sobre efectivo") |
| createdBy | FK → User? | Quién registró el ajuste |
| tenantId | UUID | FK → Tenant (NOT NULL) |
| createdAt | datetime | |

**Uso en Fase 1:** La entidad existe pero no se usa activamente — está preparada para descuentos, créditos y reembolsos en Fase 2. El IGTF se registra **únicamente** en `PaymentDetail.applied_igtf_amount`, no como `PaymentAdjustment`.

**Reglas IGTF por método de pago:**

| Método | IGTF aplica |
|---|---|
| `CASH_USD` | ✅ Sí |
| `ZELLE` | ✅ Sí |
| `WIRE_TRANSFER_USD` | ✅ Sí |
| `POS_USD_CARD` | ❌ No — tarjetas en divisas exoneradas |
| `POS_BS` | ❌ No — VES |
| `PAGO_MOVIL` | ❌ No — VES |

#### Entidad: ExchangeRate (historial de tasas BCV)

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| rate | numeric(12,6) | Tasa BCV del día — 6 decimales para precisión de tasa de cambio |
| date | date | Fecha de la tasa — UNIQUE (una tasa por día) |
| source | enum | `MANUAL` \| `API` |
| createdBy | FK → User? | nullable — null si vino de API (Fase 2) |
| tenantId | UUID | |
| createdAt | datetime | |

**Regla:** `date` UNIQUE — si se registra la misma fecha dos veces → upsert, no duplicado. La más reciente por fecha es la vigente.

**Uso en pagos:**
```ts
// PaymentsService — pre-transacción
const rate = await exchangeRateService.getForDate(new Date())
// Si no hay tasa del día → usar la más reciente disponible
Payment.bcv_exchange_rate = rate.rate  // snapshot inmutable
```

**Flujo Fase 1 — manual:**
Admin registra la tasa cada mañana vía `POST /exchange-rates` (solo admin). Recepcionista ve la tasa vigente (readonly) en el formulario de pago.

**Flujo Fase 2 — automático:**
Cron job de BullMQ llama API externa (dolarapi.com, exchangerate.host) → inserta con `source: 'API'`. Sin intervención humana.

**Beneficio de auditoría:** `Payment.bcv_exchange_rate` es snapshot del valor en el momento del pago. Con `ExchangeRate` se puede trazar de dónde vino ese valor y recalcular conversiones históricas con precisión.

---

#### Entidad: SystemConfig (configuración global del sistema)

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| key | string | UNIQUE — ej: `igtf_rate` |
| value | string | Valor en texto — parsear según contexto |
| description | string | Para lectura humana en admin panel |
| updatedAt | datetime | |

**Propósito:** configuración mutable por admin sin deployment. Actualmente usada para la tasa IGTF.

**Seed inicial:**
```
{ key: 'igtf_rate', value: '0', description: 'Alícuota IGTF % sobre pagos en divisas. Decreto 4.972 jul-2024: 0%. Modificar si el Ejecutivo cambia la alícuota.' }
```

**Lógica de cálculo IGTF en PaymentsService:**
```ts
const igtfRate = parseFloat(await systemConfigService.get('igtf_rate')) / 100  // e.g. 0.03
// Por cada PaymentDetail en divisas que NO sea POS_USD_CARD:
const igtfAmount = detail.currency === 'USD' && detail.payment_method !== 'POS_USD_CARD'
  ? detail.amount * igtfRate
  : 0
```

### Implementación detallada — Enums, Modelos Prisma y Migraciones (Payments)

Objetivo: implementar los enums compartidos en `packages/shared`, agregar los modelos `Payment`, `PaymentDetail`, `PaymentAdjustment` al `schema.prisma` y generar la migración.

Pasos concretos:

1) Crear enums y tipos compartidos (`packages/shared`)
- `packages/shared/src/enums/payment-method.enum.ts` — `CASH_USD`, `ZELLE`, `POS_BS`, `PAGO_MOVIL`, `WIRE_TRANSFER_USD`, `POS_USD_CARD`.
- `packages/shared/src/enums/currency.enum.ts` — `USD`, `VES`.
- `packages/shared/src/enums/adjustment-type.enum.ts` — `DISCOUNT`, `SURCHARGE`, `CREDIT`, `REFUND`.
- (Opcional) `packages/shared/src/dtos/payment.dto.ts` con interfaces/DTOs compartidos.

2) Agregar modelos al `schema.prisma`
Los modelos `Payment`, `PaymentDetail`, `PaymentAdjustment` se definen en `apps/api/prisma/schema.prisma` con sus relaciones e índices. Ver sección "ORM — Prisma" en CLAUDE.md para el patrón exacto.

3) Generar migración con Prisma CLI
```bash
npx prisma migrate dev --name add-payments
```
Prisma genera el SQL automáticamente desde el schema diff. Revisar el archivo en `prisma/migrations/*/migration.sql`.

4) Implementar `payments.service` y `payments.repository`
- `payments.service` orquesta la transacción: usar `prisma.$transaction(async tx => { ... })`.
- `payments.repository` encapsula queries complejas (reportes por doctor, período).

5) Tests de humo e integración
- Casos mínimos: pago 100% VES (sin IGTF); pago 100% USD efectivo (IGTF 3%); pago mixto (USD + VES).

Consideraciones técnicas
- **Precisión decimal:** Todos los campos monetarios en Prisma: `@db.Decimal(12, 2)`. NUNCA `Float` — errores de punto flotante rompen cálculos financieros.
  ```prisma
  totalServiceUsd  Decimal  @db.Decimal(12, 2)
  ```
- **Integridad financiera — principio de persistencia:** Entidades con impacto financiero o clínico **nunca se borran**. El mecanismo de "eliminación" depende del tipo de entidad:

  | Entidad | Mecanismo | Campo |
  |---|---|---|
  | `Patient` | Desactivar | `isActive = false` |
  | `Doctor` | Desactivar | `isActive = false` |
  | `User` | Desactivar | `isActive = false` |
  | `Service` / `Specialty` | Desactivar | `isActive = false` |
  | `Consultation` | Anular | `status = VOIDED` |
  | `Payment` | Anular | `status = VOIDED` |
  | `Expense` | Anular | `status = VOIDED` |

  Ningún modelo usa `@deleteAt` de Prisma. Los reportes filtran por `Payment.status` y `Expense.status` — nunca por `isActive` de modelos relacionados.
- Guardar `bcvExchangeRate` en `Payment` para trazabilidad.
- Registrar IGTF en `PaymentDetail.appliedIgtfAmount`.

Fin de la sección de implementación detallada.


#### Entidad: ConsultationPayment (idempotencia anti-doble-cobro)

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| idempotency_key | UUID | Generado por frontend antes de submit — UNIQUE |
| status | enum | `initiated` \| `processing` \| `completed` \| `failed` \| `voided` |
| consultation_id | FK → Consultation | |
| payment_id | FK → Payment? | nullable hasta completar |
| tenantId | UUID | FK → Tenant (NOT NULL) |
| createdAt | datetime | |
| updatedAt | datetime | |

**Flujo — `POST /payments`, una transacción atómica:**

Request del frontend: `{ patient_id, doctor_id, service_price_ids[], payment_lines[], idempotency_key, bcv_exchange_rate }`

1. Frontend genera `idempotency_key` (UUID v4)
2. API busca `ConsultationPayment` con esa key
   - `completed` → retorna resultado existente (sin reprocesar)
   - `processing` → 409 Conflict
   - No existe → continúa
3. Pre-transacción: fetch precios de `service_price_ids[]` desde `ServicePrice` → validar que todas las especialidades pertenezcan al doctor (vía `DoctorSpecialty`) → calcular `total_service_usd = SUM(ServicePrice.price_usd)` → leer `igtf_rate` de `SystemConfig`
4. DB transaction:
   - Crea `Consultation` (status: `pending`, sin `service_id`)
   - Crea `ConsultationService` por cada servicio (con snapshots: `service_name`, `specialty_name`, `price_usd` — todos tomados en este momento, nunca relectura posterior)
   - Crea `ConsultationPayment` (status: `initiated`)
   - Crea `PaymentDetail` por cada línea de pago + calcula IGTF por línea
   - Crea `Payment` con totales agregados (status: `completed`)
   - Actualiza `Consultation` → `paid`, `payment_id` asignado
   - Actualiza `ConsultationPayment` → `completed`, `payment_id` asignado
   - Commit
5. Fallo → rollback completo. `Consultation` y `ConsultationService` nunca quedan en DB.

**Voiding — misma transacción:** `Payment` → `voided` + `ConsultationPayment` → `voided` + `Consultation` → `voided`. Nunca borrar, auditoría preservada.

**Source of truth:** `Payment` para el dinero. `Consultation` refleja estado derivado — ambos se sincronizan en la misma transacción siempre.

**Módulo de pagos incluye:**
- Cálculo automático del split doctor/centro médico
- IGTF configurable vía `SystemConfig.igtf_rate` (actualmente 0%)
- Manejo de retenciones (honorarios profesionales)
- Generación de recibo de pago al doctor
- Historial de pagos por doctor

#### Entidad: ReceiptCounter (Numeración secuencial y atómica)

Para la generación de correlativos de recibos (ej: `CM-2026-1`), si se hace una lectura y un `last_seq + 1` en memoria, múltiples pagos concurrentes pueden obtener el mismo número.

| Campo | Tipo | Notas |
|------|------|-------|
| year | int | Año en curso (PK compuesta) |
| tenantId | UUID | FK → Tenant (PK compuesta) |
| last_seq | int | Último número emitido, inicia en 0 |
| updatedAt | datetime | |

**Incremento atómico anti Race Conditions:** Prisma soporta incrementos atómicos a nivel de DB (`UPDATE SET last_seq = last_seq + 1 RETURNING`). 
Dentro de la misma transacción de pago, se obtiene el siguiente número así:
```ts
const counter = await prisma.receiptCounter.update({
  where: { year_tenantId: { year: currentYear, tenantId } },
  data: { last_seq: { increment: 1 } }
})
const receiptNumber = `CM-${currentYear}-${counter.last_seq}`
```
Esto bloquea la fila o asegura atomicidad en PostgreSQL sin necesidad de bloqueos de tabla, garantizando que el número sea único e incorruptible.

#### Entidad: DoctorReceipt (Recibo de Pago al Doctor)

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| receipt_number | string | `CM-{AÑO}-{SEQ}` único generado por `ReceiptCounter` |
| payment_id | FK → Payment | UNIQUE |
| doctor_name | string | **Snapshot** inmutable |
| doctor_document | string | **Snapshot** inmutable |
| bank_name | string | **Snapshot** inmutable |
| account_number | string | **Snapshot** inmutable |
| split_percentage | decimal | **Snapshot** inmutable |
| total_consultation | decimal | Total del servicio (base del split) |
| doctor_share | decimal | Monto para el doctor |
| center_share | decimal | Monto retenido por el centro |
| status | enum | `generated` \| `voided` |
| tenantId | UUID | FK → Tenant (NOT NULL) |
| generated_at | datetime | |
| generated_by | FK → User | Recepcionista/Admin que procesó el pago |

**Regla Crítica:** Split%, banco y nombre del médico pueden cambiar en el futuro. El recibo depende puramente de *snapshots* para mantener su trazabilidad legal e integridad financiera (no se asocia a FK).

### Módulo 5: Egresos

#### Entidad: ExpenseCategory (catálogo de categorías — admin managed)

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| name | string | ej: Papelería, Limpieza, Cafetería, Servicios, Insumos médicos, Mantenimiento |
| isActive | boolean | default true |
| tenantId | UUID | FK → Tenant (NOT NULL) |
| createdAt | datetime | |

**Propósito:** Admin gestiona las categorías sin tocar código. Permite reportes agrupados por categoría.

Seed inicial: `Papelería`, `Limpieza`, `Cafetería`, `Servicios públicos`, `Insumos médicos`, `Mantenimiento`, `Otro`.

#### Entidad: Expense

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| category_id | FK → ExpenseCategory | FK para auditoría — no usar para obtener nombre en reportes |
| category_name | varchar NOT NULL | **Snapshot** del nombre de la categoría al momento del registro — inmutable |
| description | string | Detalle libre del ítem (ej: "200 vasos desechables", "1 resma papel carta") |
| amount | decimal | Monto del egreso |
| date | date | Fecha del egreso |
| currency | enum | `USD` \| `VES` — moneda del egreso |
| bcv_exchange_rate | decimal? | Tasa BCV del día (snapshot) — para conversión en reportes |
| notes | string? | Observaciones adicionales |
| status | enum | `active` \| `voided` — default `active`. Voiding preserva el egreso para auditoría |
| voidedBy | FK → User? | nullable — usuario que anuló el egreso |
| voidedAt | datetime? | nullable — timestamp del void |
| voidReason | string? | nullable — motivo del void |
| createdBy | FK → User | |
| tenantId | UUID | FK → Tenant (NOT NULL) |
| createdAt | datetime | |
| updatedAt | datetime | |

**Sin `deletedAt`** — `Expense` es registro financiero, nunca se borra. Para anular un egreso mal registrado: `status = voided` con `voidedBy`, `voidedAt` y `voidReason`. Reportes de egresos filtran por `status = active` por defecto; el admin puede ver histórico con voided incluido.

### Módulo 6: Reportes
- PDF de ingresos/egresos
- Balance general
- Historial por doctor

### Módulo 7: DocGen & Mailer (Generación de Documentos y Correos) — Fase 2

> **No implementar en Fase 1.** El PDF del recibo se genera on-demand en el frontend con `@react-pdf/renderer`. El email asíncrono requiere Redis + BullMQ + Worker que son Fase 2.

**Arquitectura de Generación (Basada en Patrón Strategy):**
- **Template Registry:** Orquestador central para elegir la estrategia de PDF/Email según el evento.
- **Strategies:** Clases específicas por documento (ej: `ReceiptPdfStrategy`, `ExpenseReportStrategy`).
- **Shared Templates:** Los componentes de React-PDF viven en `packages/shared` para ser usados tanto en el frontend (descarga) como en el backend (adjunto de correo).
- **Flattener (Mappers):** Cada estrategia implementa un `mapData()` que transforma entidades complejas de la DB en un objeto JSON plano para el template.

**Procesamiento Asíncrono (BullMQ + Redis):**
- **Queue Producer:** El API solo "encola" el trabajo (ej: `email-queue.add('send-receipt', { paymentId })`).
- **Small Payloads:** Solo se pasan IDs en el job data para mantener Redis eficiente y asegurar data fresca de la DB.
- **Idempotencia:** Los workers verifican estado antes de procesar (ej: verificar si `isSent` es false en la DB).
- **Retry Strategy:** Reintentos con **Exponential Backoff** (delay inicial 1s, 3 intentos).
- **Sandboxed Processors:** Las tareas pesadas (PDF) se ejecutan en procesos aislados (Worker Threads/Child Processes) para no bloquear el event loop de la API.
- **Concurrency Control:** Límite de ejecución simultánea (ej: máx 5 jobs a la vez) para proteger la base de datos y evitar límites de rate en el mailer.
- **Graceful Shutdown:** Manejo de `SIGTERM` para permitir que los workers terminen procesos activos antes de morir.
- **Monitoring:** Integración de **Bull Board** en `/admin/queues` para visualización y reintento manual de fallidos.

**Flujo de Envío de Recibos:**
1. Pago completado → Evento disparado.
2. API añade Job a `email-queue` (payload: `{ paymentId }`).
3. Worker de BullMQ recoge el Job.
4. Worker usa `DocGenService` + `ReceiptPdfStrategy` para generar Buffer.
5. `MailerService` envía correo al doctor con el PDF adjunto.
6. Worker marca el Job como completado (o falla y reintenta).
7. (Fase 2) Subida de copia a S3/Almacenamiento para auditoría.

### Módulo 8: Auditoría (Audit Log) — Fase 1

**Entidad: AuditLog**

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| userId | FK → User | Quién realizó la acción |
| tenantId | FK → Tenant | Aislamiento de auditoría |
| action | enum | `CREATE` \| `UPDATE` \| `VOID` \| `DEACTIVATE` \| `LOGIN` \| `LOGOUT` |
| entityName | string | Tabla afectada (ej: `Specialty`, `Service`, `Doctor`) |
| entityId | string | ID del registro afectado |
| oldValues | jsonb | **Snapshot completo ANTES del cambio** — null en CREATE |
| newValues | jsonb | **Snapshot completo DESPUÉS del cambio** — null en VOID final |
| changedFields | string[] | Campos que mutaron en UPDATE (ej: `["name", "price_usd"]`) — para queries de auditoría |
| ipAddress | string | Origen de la petición |
| userAgent | string | Navegador/Dispositivo |
| createdAt | datetime | Fecha exacta |

**Por qué `oldValues` + `newValues` y no `payload` genérico:**
Un `payload` genérico registra que hubo un cambio pero no permite reconstruir el estado anterior. Con `oldValues`/`newValues` puedes reproducir el estado de cualquier entidad en cualquier punto del tiempo — "¿cómo se llamaba este servicio y cuál era su precio el 15 de marzo?"

**Entidades auditadas obligatoriamente:**

| Entidad | Acciones | Quién puede ejecutarla |
|---|---|---|
| `Patient` | CREATE, UPDATE | recepcionista, admin |
| `Patient` | DEACTIVATE (`isActive = false`) | admin (`patients.delete`) |
| `Specialty` | CREATE, UPDATE (name), DEACTIVATE | admin (`specialties.create/update/delete`) |
| `Service` | CREATE, UPDATE (name, price_usd), DEACTIVATE | admin (`specialties.create/update/delete`) |
| `ExpenseCategory` | CREATE, UPDATE (name) | admin |
| `Doctor` | CREATE, UPDATE (split_percentage), DEACTIVATE | admin (`doctors.create/update/delete`) |
| `DoctorBankAccount` | CREATE, UPDATE, cambio de isDefault | admin |
| `ExchangeRate` | CREATE (quién registró la tasa y cuál valor) | admin |
| `SystemConfig` | UPDATE (igtf_rate — quién y cuándo) | admin |
| `User` | CREATE, UPDATE (role), DEACTIVATE | admin |
| `Payment` | VOID | admin (`payments.delete`) |
| `Expense` | VOID | admin (`expenses.delete`) |
| `Auth` | LOGIN, LOGOUT | todos |

**Mapeo permiso `delete` → acción real:**

El permiso se llama `delete` en el sistema ACL (nombre del contrato externo), pero la acción real varía según la entidad. El `AuditLog` registra la acción real:

| Permiso ACL | Entidad | Acción real | AuditLog action |
|---|---|---|---|
| `patients.delete` | Patient | Desactivar (`isActive = false`) | `DEACTIVATE` |
| `doctors.delete` | Doctor | Desactivar (`isActive = false`) | `DEACTIVATE` |
| `specialties.delete` | Specialty / Service | Desactivar (`isActive = false`) | `DEACTIVATE` |
| `payments.delete` | Payment | Anular (`status = voided`) | `VOID` |
| `expenses.delete` | Expense | Anular (`status = voided`) | `VOID` |

El permiso `delete` nunca dispara un `DELETE` SQL ni un soft-delete — siempre es `VOID` o `DEACTIVATE` según la entidad.

**Implementación — Prisma Middleware automático:**

El middleware se registra en `PrismaService.onModuleInit()` y captura automáticamente UPDATE en entidades de configuración auditadas:

```ts
// src/database/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly auditContext: AuditContextService) {
    super()
  }

  async onModuleInit() {
    await this.$connect()
    this.$use(async (params, next) => {
      const auditedModels = ['Patient', 'Specialty', 'Service', 'ExpenseCategory',
        'Doctor', 'ExchangeRate', 'SystemConfig']

      if (params.action === 'update' && auditedModels.includes(params.model ?? '')) {
        // Captura estado ANTES — Prisma no provee old values en middleware
        const oldRecord = await (this as any)[params.model!.toLowerCase()].findUnique({
          where: params.args.where,
        })

        const result = await next(params)

        const newData: Record<string, unknown> = params.args.data as Record<string, unknown>
        const changedFields = Object.keys(newData).filter(
          k => JSON.stringify(oldRecord?.[k]) !== JSON.stringify(newData[k]),
        )

        const ctx = this.auditContext.get()
        await this.auditLog.create({
          data: {
            action: 'UPDATE',
            entityName: params.model!,
            entityId: (oldRecord as Record<string, unknown>)?.['id'] as string,
            oldValues: oldRecord ?? {},
            newValues: newData,
            changedFields,
            userId: ctx?.userId ?? null,
            tenantId: ctx?.tenantId ?? null,
          },
        })

        return result
      }

      return next(params)
    })
  }
}
```

**Request Context — `userId` en el Middleware:**
El middleware Prisma no tiene acceso al request HTTP. Solución: `AsyncLocalStorage` como provider global. El `JwtAuthGuard` escribe `{ userId, tenantId }` en el store al inicio de cada request; el middleware lo lee al loguear.

```ts
// src/common/audit/audit-context.service.ts
@Injectable()
export class AuditContextService {
  private storage = new AsyncLocalStorage<{ userId: string; tenantId: string }>()
  run(ctx: { userId: string; tenantId: string }, fn: () => void) { this.storage.run(ctx, fn) }
  get() { return this.storage.getStore() }
}
```

**Acciones manuales** (VOID, DEACTIVATE, LOGIN/LOGOUT): el Service llama directamente a `AuditService.log(action, entity, oldValues, newValues)` — no depende del Subscriber.

---

### Módulo 9: App Config (Bootstrap del Frontend) — Fase 1

Endpoint único que agrega toda la configuración que el frontend necesita al iniciar la sesión. Elimina el problema de waterfall (N llamadas secuenciales: tasa BCV, IGTF, tenant, menú...) con una sola request.

#### `GET /config/init` — respuesta Fase 1

```ts
// config-init-response.dto.ts
{
  tenant: {
    name: string              // "Centro Médico El Ávila"
    slug: string              // "centro-medico-el-avila"
  }
  systemConfig: {
    igtfRate: number          // 0 (tasa actual — Decreto 4.972)
  }
  exchangeRate: {             // null si no hay tasa registrada
    rate: number              // 36.50
    date: string              // "2026-04-27"
    source: 'MANUAL' | 'API'
  } | null
}
```

#### `GET /config/init` — respuesta Fase 3 (extensión)

```ts
{
  tenant: {
    name: string
    slug: string
    logo: string | null       // URL del logo
    theme: Record<string, string>  // tokens MD3 del tenant
    locale: string            // "es-VE"
    timezone: string          // "America/Caracas"
  }
  systemConfig: {
    igtfRate: number
    // futuras configs...
  }
  exchangeRate: { ... } | null
  menu: NavItem[]             // árbol ya filtrado por permisos del JWT del usuario
}
```

#### Arquitectura del módulo

```
apps/api/src/app-config/
  app-config.module.ts
  app-config.controller.ts     → GET /config/init
  app-config.service.ts        → agrega datos de otros services
  dto/
    config-init-response.dto.ts
```

**Patrón:** `AppConfigService` inyecta `SystemConfigService`, `ExchangeRatesService`, `TenantsService` (y en Fase 3, `MenuItemsService`). No tiene lógica propia — solo agrega y mapea.

```ts
// app-config.service.ts
@Injectable()
export class AppConfigService {
  constructor(
    private readonly systemConfig: SystemConfigService,
    private readonly exchangeRates: ExchangeRatesService,
    private readonly tenants: TenantsService,
    // Fase 3: private readonly menuItems: MenuItemsService,
  ) {}

  async getInitConfig(tenantId: string, userPermissions: Permission[]): Promise<ConfigInitResponseDto> {
    const [tenant, igtfRate, exchangeRate] = await Promise.all([
      this.tenants.findByIdOrFail(tenantId),
      this.systemConfig.getNumber('igtf_rate'),
      this.exchangeRates.getLatest(tenantId),
    ])

    return {
      tenant: { name: tenant.name, slug: tenant.slug },
      systemConfig: { igtfRate },
      exchangeRate: exchangeRate
        ? { rate: exchangeRate.rate, date: exchangeRate.date, source: exchangeRate.source }
        : null,
      // Fase 3: menu: await this.menuItems.getTreeFiltered(tenantId, userPermissions),
    }
  }
}
```

```ts
// app-config.controller.ts
@Controller('config')
export class AppConfigController {
  @Get('init')
  @UseGuards(JwtAuthGuard)   // requiere sesión, no requiere permiso específico
  getInit(@CurrentUser() user: JwtPayload) {
    return this.appConfigService.getInitConfig(user.tenantId, user.permissions)
  }
}
```

**Nota:** No lleva `@RequirePermission` — todo usuario autenticado puede leer la config de su tenant. No es `@Public()` porque necesita el `tenantId` y permisos del JWT.

#### Consumo en frontend — `useAppConfig`

```ts
// features/config/services/config.service.ts
export const getInitConfig = (): Promise<ConfigInitResponseDto> =>
  apiFetch('/config/init').then(r => r.json())

// features/config/hooks/use-app-config.ts
export function useAppConfig() {
  return useQuery({
    queryKey: ['config', 'init'],
    queryFn: getInitConfig,
    staleTime: 5 * 60 * 1000,  // 5 min — config cambia poco
    refetchOnWindowFocus: false,
  })
}
```

**Cuándo se llama:** Una sola vez al montar el Dashboard layout (`app/(dashboard)/layout.tsx`). Se cachea con TanStack Query. Si la tasa BCV cambia, el admin la registra y la próxima vez que expira el cache (o se hace refetch manual) el frontend la ve actualizada.

**Flujo completo post-login:**
```
1. POST /auth/login → cookie HttpOnly + body { permissions, role, roleVersion }
2. Frontend guarda permissions en auth.store (RAM)
3. Redirect a /recepcion (o ruta por defecto)
4. Dashboard layout monta → useAppConfig() → GET /config/init
5. Config cacheada → Sidebar renderiza, tasa BCV disponible, IGTF rate listo
```

**¿Por qué no incluir auth data en `/config/init`?** Separación de responsabilidades:
- `/auth/login` → autenticación + permisos (ejecuta una vez al hacer login)
- `/config/init` → datos operacionales del tenant (ejecuta al montar el dashboard, se cachea)

Si mezcláramos auth y config en un solo endpoint, un cambio en la lógica de login afectaría la config y viceversa.

---

## Módulos del Frontend (Next.js)

### Layout Dashboard — Sidebar fijo + contenido central

El 100% de las rutas protegidas comparten un layout de dashboard clásico: sidebar fijo a la izquierda, contenido principal al centro. Se implementa con un nested layout en el route group `(dashboard)`.

```
app/
├── (auth)/
│   └── login/
│       └── page.tsx              ← pantalla completa, sin sidebar
└── (dashboard)/
    ├── layout.tsx                ← sidebar + main wrapper (COMPARTIDO)
    ├── recepcion/page.tsx
    ├── pacientes/page.tsx
    ├── pagos/page.tsx
    ├── egresos/page.tsx
    ├── reportes/page.tsx
    └── admin/
        ├── doctores/page.tsx
        ├── especialidades/page.tsx
        ├── usuarios/page.tsx
        ├── roles/page.tsx
        ├── configuracion/page.tsx
        └── tasas/page.tsx
```

```tsx
// app/(dashboard)/layout.tsx — Server Component
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

`Sidebar` y `Topbar` son Client Components (`'use client'`) — necesitan `usePathname()` para resaltar la ruta activa y estado para colapsar el menú en mobile.

---

### Navegación Dinámica — Menús y Submenús por Rol (ACL-driven)

Los ítems del sidebar no son estáticos — se filtran en tiempo real según los permisos del usuario en el JWT. Esto garantiza que un usuario solo vea las rutas a las que tiene acceso, sin consultar la DB en cada render.

#### Estrategia: config estática + filtrado por JWT (Fase 1)

> **Fase 1:** Los ítems del menú se definen en `navigation.config.ts` (config estática en código). Cada ítem declara el permiso requerido. El hook `useSidebarNav` filtra la config usando los permisos del JWT ya disponibles en el store de auth — cero llamadas extra a DB.
>
> **Fase 3 (multi-tenant):** La config migra a DB (entidad `MenuItem` con auto-referencia para submenús + vinculación a `Permission` para ACL). Cada tenant personaliza labels, íconos y orden. El filtrado por permisos se mantiene igual. Ver diseño completo en **Fase 3 → Navegación Dinámica en DB**.

#### `navigation.config.ts` — estructura completa

```ts
// shared/config/navigation.config.ts
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Users, Stethoscope, CreditCard,
  TrendingDown, BarChart3, Settings, UserCog,
  Building2, Repeat2, CalendarPlus,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  permission?: { resource: string; action: string }  // undefined = visible para todos los autenticados
  children?: NavItem[]                               // submenús
}

export const NAV_CONFIG: NavItem[] = [
  {
    label: 'Recepción',
    path: '/recepcion',
    icon: CalendarPlus,
    permission: { resource: 'payments', action: 'create' },
  },
  {
    label: 'Pacientes',
    path: '/pacientes',
    icon: Users,
    permission: { resource: 'patients', action: 'read' },
  },
  {
    label: 'Pagos',
    path: '/pagos',
    icon: CreditCard,
    permission: { resource: 'payments', action: 'read' },
  },
  {
    label: 'Egresos',
    path: '/egresos',
    icon: TrendingDown,
    permission: { resource: 'expenses', action: 'read' },
  },
  {
    label: 'Reportes',
    path: '/reportes',
    icon: BarChart3,
    permission: { resource: 'reports', action: 'read' },
  },
  {
    label: 'Administración',
    path: '/admin',
    icon: Settings,
    permission: { resource: 'doctors', action: 'create' }, // solo admin tiene este permiso
    children: [
      {
        label: 'Doctores',
        path: '/admin/doctores',
        icon: Stethoscope,
        permission: { resource: 'doctors', action: 'read' },
      },
      {
        label: 'Especialidades',
        path: '/admin/especialidades',
        icon: Building2,
        permission: { resource: 'specialties', action: 'read' },
      },
      {
        label: 'Usuarios',
        path: '/admin/usuarios',
        icon: UserCog,
        permission: { resource: 'users', action: 'read' },
      },
      {
        label: 'Roles y Permisos',
        path: '/admin/roles',
        icon: UserCog,
        permission: { resource: 'roles', action: 'read' },
      },
      {
        label: 'Tasas BCV',
        path: '/admin/tasas',
        icon: Repeat2,
        permission: { resource: 'exchange-rates', action: 'create' },
      },
      {
        label: 'Configuración',
        path: '/admin/configuracion',
        icon: Settings,
        permission: { resource: 'system-config', action: 'update' },
      },
    ],
  },
]
```

#### `useSidebarNav` — filtrado por permisos del JWT

```ts
// shared/hooks/use-sidebar-nav.ts
'use client'
import { useAuthStore } from '@/stores/auth.store'
import { NAV_CONFIG, type NavItem } from '@/shared/config/navigation.config'

function hasPermission(
  permissions: Array<{ resource: string; action: string }>,
  required?: { resource: string; action: string },
): boolean {
  if (!required) return true
  return permissions.some(p => p.resource === required.resource && p.action === required.action)
}

function filterNav(items: NavItem[], permissions: Array<{ resource: string; action: string }>): NavItem[] {
  return items.reduce<NavItem[]>((acc, item) => {
    if (!hasPermission(permissions, item.permission)) return acc
    const filtered = { ...item }
    if (item.children) {
      filtered.children = filterNav(item.children, permissions)
      if (filtered.children.length === 0) return acc  // ocultar padre si no hay hijos visibles
    }
    acc.push(filtered)
    return acc
  }, [])
}

export function useSidebarNav() {
  const permissions = useAuthStore(s => s.permissions)
  return filterNav(NAV_CONFIG, permissions)
}
```

#### Vista de menú por rol

| Ítem | Recepcionista | Admin |
|---|---|---|
| Recepción | ✅ | ✅ |
| Pacientes | ✅ | ✅ |
| Pagos | ✅ | ✅ |
| Egresos | ✅ | ✅ |
| Reportes | ❌ | ✅ |
| Administración (grupo) | ❌ | ✅ |
| └ Doctores | ❌ | ✅ |
| └ Especialidades | ❌ | ✅ |
| └ Usuarios | ❌ | ✅ |
| └ Roles y Permisos | ❌ | ✅ |
| └ Tasas BCV | ❌ | ✅ |
| └ Configuración | ❌ | ✅ |

---

### Alineación ACL — Frontend, Backend y Middleware

Los tres niveles de protección actúan en capas independientes y complementarias:

```
Request del usuario
  │
  ▼
[1] middleware.ts (Next.js)
    → Verifica que exista cookie `access_token`
    → Si no hay cookie → redirect /login
    → No valida permisos — solo presencia de sesión
  │
  ▼
[2] Sidebar (useSidebarNav)
    → Filtra ítems visibles según permisos del JWT
    → UX: el usuario no ve rutas a las que no tiene acceso
    → NO es seguridad — es presentación
  │
  ▼
[3] AclGuard (NestJS — backend)
    → Valida permiso requerido en cada endpoint
    → @RequirePermission('patients', 'read')
    → Si no tiene permiso → 403 Forbidden
    → ESTA es la seguridad real — nunca se omite
```

**Regla crítica:** el sidebar filtrado es UX, no seguridad. Siempre asumir que cualquier endpoint puede ser llamado directamente. El `AclGuard` en el backend es la única fuente de verdad para autorización.

#### Protección de rutas Next.js — `middleware.ts`

```ts
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')
  const isPublic = PUBLIC_PATHS.some(p => request.nextUrl.pathname.startsWith(p))

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

> **Nota:** El middleware solo verifica la presencia de la cookie, no su validez criptográfica (eso lo hace NestJS en cada request). La validación de permisos por ruta en el frontend es solo UX — nunca reemplaza al `AclGuard`.

#### `auth.store.ts` — persiste permisos del JWT en RAM

```ts
// stores/auth.store.ts
import { create } from 'zustand'

interface Permission { resource: string; action: string }

interface AuthState {
  userId: string | null
  email: string | null
  role: string | null
  permissions: Permission[]
  roleVersion: number | null
  setAuth: (payload: Omit<AuthState, 'setAuth' | 'clearAuth'>) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  role: null,
  permissions: [],
  roleVersion: null,
  setAuth: (payload) => set(payload),
  clearAuth: () => set({ userId: null, email: null, role: null, permissions: [], roleVersion: null }),
}))
```

Los permisos se cargan en el store al hacer login (parseando el JWT en el cliente con `jose` o vía un `GET /auth/me` ligero). El sidebar los lee desde el store — sin llamadas extra a DB.

---

- `/recepcion` → registro de paciente + pago de consulta
- `/doctores` → gestión de doctores y tarifas (solo admin)
- `/especialidades` → gestión de especialidades y servicios (solo admin)
- `/pagos` → historial de pagos, recibos
- `/egresos` → registro y historial de gastos
- `/reportes` → reportes PDF, balance mensual (solo admin)

---

### Stack de Formularios

**Regla:** `react-hook-form` + `zod` para validación en todos los formularios. `useMutation` (TanStack Query) para el submit. Nunca `useActionState` — el proyecto llama a una API NestJS externa, no a Server Actions.

| Capa | Herramienta | Responsabilidad |
|---|---|---|
| Validación + estado del form | `react-hook-form` + `zod` (via `@hookform/resolvers`) | Schema validation, errores por campo, dirty state |
| Submit / HTTP | `useMutation` (TanStack Query) | HTTP call, loading, cache invalidation |
| Pending del botón | `useFormStatus` (opcional) | Solo si el botón es componente hijo extraído de un `<form>` nativo |

**Patrón completo:**
```ts
// Formulario simple (login, tasa BCV, IGTF rate)
const schema = z.object({ rate: z.number().positive() })
const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
})
const { mutate, isPending } = useCreateExchangeRateMutation()
// onSubmit: mutate(data) — sin try/catch en el componente

// Formulario complejo con campos dinámicos (registro de pago)
const { control, watch, handleSubmit } = useForm<CreatePaymentDto>({
  resolver: zodResolver(paymentSchema),
})
const { fields, append, remove } = useFieldArray({ control, name: 'paymentLines' })
const { mutate, isPending } = useCreatePaymentMutation()
```

**`useActionState` no entra en este proyecto.** Existe para Server Actions que no llaman a una API externa — incompatible con el stack NestJS + fetch.

---

## Roles / Usuarios

| Rol | Acceso |
|---|---|
| Recepcionista | Registro pacientes, cobro, egresos |
| Admin | Todo + configuración de doctores, tarifas, reportes |
| Doctor | (futuro) ver sus propios pacientes |

---

## Consideraciones Fiscales (Venezuela)

- **IVA:** Consultas médicas **exentas de IVA** en Venezuela (TSJ sentencia). El sistema no calcula ni muestra IVA sobre servicios de salud.
- **IGTF:** 3% sobre pagos en divisas (excepto tarjetas POS en divisas). Tasa actual 0% por Decreto 4.972 jul-2024. Configurable en `SystemConfig.igtf_rate` sin deployment.
- Doctores cobran por **honorarios profesionales** (no nómina)
- Recibo firmado: copia centro + copia doctor
- Retenciones aplicadas al recibo del doctor

---

## Fases de Desarrollo

### Fase 1 — Base (MVP)

#### Setup del monorepo (ejecutar una vez manualmente)

```bash
# Estructura base
mkdir -p apps/api apps/web packages/shared docker/nginx

# pnpm workspace — archivo en la raíz
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Inicializar cada proyecto
cd apps/api && pnpm init -y
cd apps/web && pnpm init -y
cd packages/shared && pnpm init -y
```

#### Estado actual de las apps (verificado)

`apps/api` ya tiene instalado el core de NestJS (`@nestjs/common`, `core`, `platform-express`, `reflect-metadata`, `rxjs`) y las dev tools (CLI, jest, eslint, prettier, typescript). **Faltan todas las dependencias de negocio.**

`apps/web` ya tiene instalado Next.js **16.2.4**, React **19.2.4**, Tailwind CSS **v4** (`@tailwindcss/postcss`) y TypeScript. **Faltan TanStack Query, Zustand, UI utils y @react-pdf/renderer.**

#### Dependencias a instalar — backend (`apps/api`)

> **Nota:** `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` ya están — no reinstalar.

```bash
# Config + validación de entorno
pnpm add @nestjs/config joi

# Prisma ORM
pnpm add @prisma/client
pnpm add -D prisma

# Auth
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt cookie-parser

# Validación de DTOs
pnpm add class-validator class-transformer

# Seguridad
pnpm add helmet @nestjs/throttler

# Dev — tipos faltantes
pnpm add -D @types/passport-jwt @types/bcrypt @types/cookie-parser
```

> Después de instalar: `npx prisma init` genera `prisma/schema.prisma` y agrega `DATABASE_URL` al `.env`.

#### Dependencias a instalar — frontend (`apps/web`)

> **Nota:** Next.js, React, Tailwind v4 y TypeScript ya están — no reinstalar.

```bash
# TanStack Query
pnpm add @tanstack/react-query @tanstack/react-query-devtools

# Estado global
pnpm add zustand

# Formularios + validación
pnpm add react-hook-form @hookform/resolvers zod

# UI utils
pnpm add class-variance-authority clsx tailwind-merge lucide-react

# PDF recibos on-demand
pnpm add @react-pdf/renderer
```

#### Dependencias shared (`packages/shared`)

```bash
pnpm add -D typescript
```

---

#### Code Quality — TypeScript Strict + ESLint + Prettier + Git Hooks

Estrategia de calidad de código para el monorepo. Todos los archivos de configuración viven donde corresponde según el scope: configs compartidas en la raíz, overrides por app.

##### TypeScript Strict — `tsconfig.json`

**Estado actual:** `apps/api` tiene `strictNullChecks: false` y `noImplicitAny: false`. `apps/web` ya tiene `strict: true` ✅.

**Acción:** Crear `tsconfig.base.json` en la raíz con opciones compartidas. Cada app extiende de esta base.

```jsonc
// tsconfig.base.json (raíz del monorepo)
{
  "compilerOptions": {
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "ES2021",
    "moduleResolution": "node",
    "declaration": true,
    "removeComments": true,
    "sourceMap": true,
    "incremental": true
  }
}
```

```jsonc
// apps/api/tsconfig.json — extiende base, agrega NestJS-specific
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "outDir": "./dist",
    "baseUrl": "./",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```jsonc
// apps/web/tsconfig.json — extiende base, agrega Next.js-specific
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

> **Regla crítica:** `strict: true` en la base hereda a ambas apps. Nunca sobreescribir `strictNullChecks` o `noImplicitAny` a `false` en las apps — si algo no compila, arreglar el código, no la config.

##### ESLint — Flat Config (v9) por app

**Decisión:** Ambas apps usan **ESLint flat config** (`eslint.config.mjs`). El API debe migrar de `.eslintrc.js` (legacy) a flat config.

**Reglas extraídas del análisis del proyecto + AGENTS.md:**

| Regla | Severidad | Justificación proyecto |
|-------|-----------|------------------------|
| `@typescript-eslint/no-explicit-any` | `error` | AGENTS.md: "Sin `any`. Sin excepciones." |
| `@typescript-eslint/no-unused-vars` | `error` (con `argsIgnorePattern: '^_'`) | NestJS usa `_` para params de decoradores no usados |
| `@typescript-eslint/no-floating-promises` | `error` | Crítico en NestJS async — promesas sin await causan bugs silenciosos |
| `@typescript-eslint/require-await` | `error` | Detecta funciones `async` que no usan `await` |
| `@typescript-eslint/consistent-type-imports` | `error` | Imports limpios con `type` keyword |
| `@typescript-eslint/no-non-null-assertion` | `warn` | Evitar `!` — preferir narrowing o early return |
| `import/order` | `error` | Orden: builtin → external → internal → parent/sibling → type |
| `import/no-duplicates` | `error` | Sin imports duplicados |
| `no-console` | `warn` (allow: `['warn', 'error']`) | Usar NestJS Logger en backend, console solo en dev |
| `prefer-const` | `error` | Inmutabilidad por defecto |
| `no-var` | `error` | Solo `const` / `let` |

**Reglas adicionales solo para Next.js (web):**

| Regla | Severidad | Justificación |
|-------|-----------|---------------|
| `react-hooks/rules-of-hooks` | `error` | Hooks solo en top-level de componentes |
| `react-hooks/exhaustive-deps` | `warn` | Dependencias faltantes en useEffect |
| `react/self-closing-comp` | `error` | `<div />` en vez de `<div></div>` |
| `react/jsx-curly-brace-presence` | `error` (props: never) | `prop="text"` no `prop={'text'}` |

**Reglas relajadas en archivos de test (`.spec.ts`, `.test.ts`):**

| Regla | Override | Justificación |
|-------|----------|---------------|
| `@typescript-eslint/no-explicit-any` | `off` | Mocks y fixtures pueden necesitar `any` |
| `@typescript-eslint/no-floating-promises` | `off` | Jest maneja promesas implícitamente |
| `@typescript-eslint/no-non-null-assertion` | `off` | Tests pueden asumir existencia de datos |

**Config para el API (NestJS):**

```ts
// apps/api/eslint.config.mjs
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'] },

  js.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'import': importPlugin,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'type'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      }],
      'import/no-duplicates': 'error',

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Relajar reglas en tests
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  prettier,
];
```

**Config para el Web (Next.js):**

```ts
// apps/web/eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),

  // Reglas custom del proyecto
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      'react/self-closing-comp': 'error',
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
]);

export default eslintConfig;
```

> **Nota:** La web hereda reglas de `next/core-web-vitals` y `next/typescript` que ya incluyen React Hooks, import ordering, y accesibilidad. Las reglas custom se agregan encima.

##### Prettier — config compartida en la raíz

```jsonc
// .prettierrc (raíz del monorepo)
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

```
// .prettierignore (raíz)
node_modules
dist
build
.next
coverage
*.min.js
*.min.css
pnpm-lock.yaml
```

**Por qué en la raíz:** Prettier resuelve la config más cercana al archivo. Config en la raíz = todas las apps la heredan. Eliminar `.prettierrc` de `apps/api/` (solo tiene `{ singleQuote: true, trailingComma: "all" }` — ya está cubierto por la config raíz).

##### Git Hooks — Husky + lint-staged + commitlint

Validación automática antes de cada commit. Si lint o format falla → commit bloqueado.

**Dependencias (raíz del monorepo):**
```bash
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init
```

**lint-staged config:**
```jsonc
// package.json raíz (sección lint-staged)
{
  "lint-staged": {
    "apps/api/**/*.ts": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "apps/web/**/*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "packages/shared/**/*.ts": [
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
}
```

**Husky hooks:**
```bash
# .husky/pre-commit
npx lint-staged

# .husky/commit-msg
npx commitlint --edit $1
```

**commitlint — conventional commits:**
```js
// commitlint.config.js (raíz)
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',     // Nueva feature
      'fix',      // Bug fix
      'docs',     // Documentación
      'style',    // Formato (no afecta lógica)
      'refactor', // Reestructuración de código
      'perf',     // Performance
      'test',     // Tests
      'build',    // Build system
      'ci',       // CI configuration
      'chore',    // Mantenimiento
      'revert',   // Revert
    ]],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 72],
  },
};
```

**Formato de commits:** `type(scope): descripción`
- `feat(patients): add search by document id`
- `fix(payments): prevent double charge on timeout`
- `docs(plan): add code quality section`

##### VS Code — settings compartidos

```jsonc
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true
}
```

```jsonc
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

##### Scripts npm — raíz y apps

```jsonc
// package.json raíz
{
  "scripts": {
    "lint": "pnpm -r run lint",
    "lint:fix": "pnpm -r run lint:fix",
    "format": "prettier --write \"**/*.{ts,tsx,json,md,css}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,json,md,css}\"",
    "typecheck": "pnpm -r run typecheck",
    "check": "pnpm run typecheck && pnpm run lint && pnpm run format:check"
  }
}
```

```jsonc
// apps/api/package.json (scripts a agregar)
{
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix --max-warnings 0",
    "format": "prettier --write \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit"
  }
}
```

```jsonc
// apps/web/package.json (scripts a agregar)
{
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "typecheck": "tsc --noEmit"
  }
}
```

##### Dependencias de calidad a instalar

```bash
# Raíz del monorepo (dev tools compartidos)
pnpm add -D prettier husky lint-staged @commitlint/cli @commitlint/config-conventional

# apps/api (reemplaza ESLint 8 legacy por ESLint 9 flat config)
pnpm add -D eslint@^9 @eslint/js @typescript-eslint/eslint-plugin @typescript-eslint/parser \
           eslint-config-prettier eslint-plugin-import
# Eliminar: eslint-plugin-prettier (innecesario con eslint-config-prettier)

# apps/web (ya tiene eslint 9 + eslint-config-next)
pnpm add -D eslint-config-prettier
```

> **`eslint-plugin-prettier` vs `eslint-config-prettier`:** El plugin ejecuta Prettier como regla ESLint (lento, duplica trabajo). El config solo *desactiva* reglas ESLint que conflictuarían con Prettier. Usar solo `eslint-config-prettier` — Prettier corre aparte vía `lint-staged`.

---

#### Sistema de Theming — Material Design 3 + White-Label Multi-Tenant

El sistema de UI usa **shadcn/ui** sobre **Tailwind v4** con un sistema de tokens semánticos inspirado en **Material Design 3 (MD3)**. Esto da un feel MD3 (elevación, forma, tipografía, paleta semántica) sin instalar MUI. Como el sistema es multi-tenant, cada tenant puede personalizar su tema sin rebuild.

##### Por qué MD3 como base

MD3 define tokens por rol semántico (primary, surface, on-primary...) en lugar de colores literales. Esto hace que el white-label sea directo: el tenant solo sobreescribe los tokens, los componentes se adaptan automáticamente.

##### Estructura del tema en `Tenant.config` (JSONB) — documentada desde Fase 1, implementada en Fase 3

```json
{
  "theme": {
    "primary": "210 100% 40%",
    "on-primary": "0 0% 100%",
    "primary-container": "210 100% 90%",
    "on-primary-container": "210 100% 10%",
    "secondary": "199 89% 48%",
    "on-secondary": "0 0% 100%",
    "surface": "0 0% 98%",
    "on-surface": "222 47% 11%",
    "surface-variant": "210 40% 96%",
    "error": "0 84% 60%",
    "on-error": "0 0% 100%",
    "radius-sm": "0.5rem",
    "radius-md": "1rem",
    "radius-lg": "1.75rem",
    "font-sans": "\"Roboto\", sans-serif"
  },
  "logo": "https://cdn.example.com/logo.png",
  "name": "Clínica El Ávila"
}
```

> **Fase 1:** Se define el schema del tema en la documentación y se construyen todos los componentes usando tokens semánticos. El JSONB existe en la entidad `Tenant` pero no se lee en runtime.
>
> **Fase 3:** Se activa la inyección server-side en `app/layout.tsx` (`getTenantTheme()`) y el panel `/admin/configuracion` para que cada tenant edite su paleta.

**Flujo white-label (Fase 3):**
1. Admin del tenant edita su paleta en `/admin/configuracion`
2. Se guarda en `Tenant.config.theme` (JSONB en DB)
3. Próximo request — layout inyecta las variables → tema aplicado sin rebuild ni redeploy

##### `apps/web/src/app/globals.css` — tokens base (tenant default)

> **Tailwind v4:** Se usa `@theme inline { ... }` para exponer las CSS variables como utilidades de Tailwind (`bg-primary`, `text-on-surface`, etc.). Sin `tailwind.config.js`.

```css
@import "tailwindcss";

/* Expone los tokens como utilidades de Tailwind */
@theme inline {
  /* Colores semánticos MD3 */
  --color-primary:            hsl(var(--primary));
  --color-on-primary:         hsl(var(--on-primary));
  --color-primary-container:  hsl(var(--primary-container));
  --color-secondary:          hsl(var(--secondary));
  --color-on-secondary:       hsl(var(--on-secondary));
  --color-surface:            hsl(var(--surface));
  --color-on-surface:         hsl(var(--on-surface));
  --color-surface-variant:    hsl(var(--surface-variant));
  --color-error:              hsl(var(--error));
  --color-on-error:           hsl(var(--on-error));

  /* Elevación MD3 (box-shadow como utilidad) */
  --shadow-elevation-1: 0 1px 2px rgb(0 0 0 / 0.3), 0 1px 3px 1px rgb(0 0 0 / 0.15);
  --shadow-elevation-2: 0 1px 2px rgb(0 0 0 / 0.3), 0 2px 6px 2px rgb(0 0 0 / 0.15);
  --shadow-elevation-3: 0 4px 8px 3px rgb(0 0 0 / 0.15), 0 1px 3px rgb(0 0 0 / 0.3);

  /* Tipografía */
  --font-sans: var(--font-sans-tenant, "Roboto", sans-serif);

  /* Shape */
  --radius-sm: var(--radius-sm-tenant, 0.5rem);
  --radius-md: var(--radius-md-tenant, 1rem);
  --radius-lg: var(--radius-lg-tenant, 1.75rem);
}

/* Valores por defecto — se sobreescriben por inyección del tenant */
:root {
  --primary:            222 47% 20%;
  --on-primary:         0 0% 100%;
  --primary-container:  222 47% 90%;
  --on-primary-container: 222 47% 10%;
  --secondary:          199 89% 40%;
  --on-secondary:       0 0% 100%;
  --surface:            0 0% 98%;
  --on-surface:         222 47% 11%;
  --surface-variant:    210 40% 96%;
  --error:              0 84% 60%;
  --on-error:           0 0% 100%;
}
```

##### Uso en componentes shadcn

```tsx
// ✅ Siempre usar tokens semánticos — nunca colores literales
<div className="bg-surface text-on-surface shadow-elevation-2 rounded-lg p-4">
  <Button className="bg-primary text-on-primary hover:bg-primary/90">
    Registrar pago
  </Button>
</div>

// ❌ Nunca hardcodear colores — rompe el white-label
<div className="bg-blue-900 text-white">
```

##### Lo que obtienes vs MUI

| Aspecto | Este sistema | Material UI |
|---|---|---|
| Paleta MD3 semántica | ✅ | ✅ |
| Elevación (box-shadow) | ✅ | ✅ |
| Shape / esquinas | ✅ | ✅ |
| Tipografía Roboto | ✅ | ✅ |
| White-label por tenant | ✅ Zero-rebuild | ❌ Requiere ThemeProvider JS |
| Ripple effect | ❌ (no crítico para app médica) | ✅ |
| Bundle size | ✅ Mínimo (solo CSS) | ❌ ~300KB extra JS |

---

Componentes UI a instalar vía shadcn: Button, Input, Label, Card, Table, Dialog, Select, Checkbox, Badge, Skeleton.

---

#### Autenticación — Referencias de implementación

**JWT payload** (solo datos operacionales, sin PII):

```typescript
// auth.service.ts
const token = this.jwtService.sign({
  sub: user.id,
  email: user.email,
  role: user.role.name,
  tenantId: user.tenantId,        // ← obligatorio para aislamiento de datos
  permissions: user.role.permissions,
  role_version: user.role.version,
})
```

### Estrategia de Seguridad Avanzada (Hardening)

1. **Aislamiento de Datos (Multitenancy):**
   - **Estrategia Shared-Schema:** Uso de columna `tenantId` en todas las tablas de negocio.
   - **Entidad Tenant:** Representa la clínica/organización.
     - Campos: `id`, `name`, `slug`, `status` (`ACTIVE`, `SUSPENDED`, `ARCHIVED`), `ownerId` (User), `config` (JSONB).
   - **Global Scoping:** Se usará Prisma Middleware global para inyectar automáticamente `WHERE tenantId = :tenantId` en todas las consultas basándose en el JWT.
   - **Tenant Status Guard:** Si un Tenant está `SUSPENDED`, se bloquean todas las mutaciones (403 Forbidden). Si está `ARCHIVED`, el acceso es de solo lectura (GET) o bloqueado totalmente.
   - **Structural Ownership:** Cada Tenant tiene un `ownerId`. Las acciones críticas (borrar tenant, cambiar plan) solo las puede hacer el owner.
   - **DB Constraint:** Columna `tenantId` con índice y restricción `NOT NULL` en tablas de negocio.

2. **Protección CSRF:**
   - **Headers:** El backend rechazará peticiones mutables (`POST`, `PUT`, `DELETE`) que no incluyan el header `X-Requested-With: XMLHttpRequest` o un token de sesión válido en cookie `SameSite: Strict`.

3. **Seguridad de Bull Board:**
   - El dashboard de colas en `/admin/queues` estará protegido por `JwtAuthGuard` y `AclGuard`, permitiendo acceso **únicamente** a usuarios con el rol `admin`.

4. **Sanitización de Entradas:**
   - Uso de `class-validator` con `whitelist: true` y `forbidNonWhitelisted: true`.
   - Sanitización de strings para evitar inyección de caracteres de control o HTML en la generación de PDFs.

5. **CORS Estricto:**
   - Solo se permitirá el origen del frontend definido en variables de entorno.

6. **Seguridad de Logs (PII Protection):**
   - Se implementará un interceptor global para registrar peticiones, el cual debe **ofuscar** campos sensibles (`password`, `documentId`, `phone`, `token`) antes de escribirlos en la consola o archivos de logs.

7. **Versionamiento de API:**
   - Se habilitará el versionamiento global en NestJS (`v1` por defecto) para facilitar la evolución del sistema sin romper clientes existentes.

8. **Política de Contraseñas:**
   - Requisito mínimo: 8 caracteres, al menos una mayúscula y un número, validado vía `class-validator` en todos los DTOs de entrada.

9. **Health Check Minimalista:**
   - El endpoint `/health` solo retornará `{ status: 'ok' }` sin revelar versiones de software o detalles del entorno.

10. **Trazabilidad de Auditoría (Universal Audit Log):**
   - Se implementará un **Audit Trail** obligatorio para todas las tablas de negocio.
   - Cada inserción, modificación o eliminación registrará: `userId`, `tenantId`, `action`, `entityName`, `entityId`, `oldValues` (JSONB — snapshot antes), `newValues` (JSONB — snapshot después), `changedFields` (string[]) e `ipAddress`.
   - Se usará Prisma Middleware global para capturar automáticamente toda mutación en entidades de configuración. Acciones manuales (VOID, DEACTIVATE) llaman a `AuditService.log()` directamente desde el Service.

11. **Seguridad de Contenedores (Non-root):**
    - En producción, los procesos de Node.js correrán bajo el usuario `node` (no root) para mitigar ataques de escalada de privilegios.

12. **Encriptación de PII At-Rest:**
    - Los datos de identidad sensibles (ej: `documentId`, `phone`) se encriptarán en la base de datos usando AES-256.

13. **Escaneo de Vulnerabilidades:**
    - Uso obligatorio de `pnpm audit` en el pipeline de desarrollo para detectar y parchear librerías vulnerables.

14. **Persistencia Total — Integridad Financiera:**
    - **Principio:** Ninguna entidad con impacto financiero o clínico tiene `@DeleteDateColumn()`. No existe "borrar" — existe "desactivar" (`isActive = false`) o "anular" (`status = voided`).
    - `Patient`, `Doctor`, `User`, `Service`, `Specialty` → `isActive = false` para desactivar. El registro persiste, el historial es accesible.
    - `Consultation`, `Payment`, `Expense` → `status = voided` para anular. Nunca eliminar. Auditoría completa preservada.
    - Los reportes financieros filtran exclusivamente por `Payment.status` y `Expense.status` — jamás por `isActive` ni `deletedAt` de entidades relacionadas.

**Cookie en login:**

```typescript
// auth.controller.ts
res.cookie('access_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000,
})
```

**Estructura de Endpoints:** `/api/v1/[resource]`

**Decoradores:**

```typescript
@Public()                              // endpoint público, JwtAuthGuard lo omite
@RequirePermission('patients', 'read') // AclGuard valida contra JWT
@CurrentUser()                         // extrae usuario del request
```

**Protección por endpoint:**

```typescript
@Get('patients')
@UseGuards(JwtAuthGuard, AclGuard)
@RequirePermission('patients', 'read')
findAll() { ... }
```

**Next.js 16 — cambios de API importantes:**

> El proyecto usa Next.js **16.2.4**. Dos cambios breaking respecto a versiones anteriores:
>
> **1. `params` y `searchParams` son `Promise<{...}>`** — siempre hacer `await`:
> ```ts
> // ✅ Next.js 16
> export default async function Page({ params }: { params: Promise<{ id: string }> }) {
>   const { id } = await params
> }
> ```
>
> **2. `cookies()` es async** — nuestro `apiFetch` ya lo contempla con `await cookies()` ✅

**Middleware Next.js:**

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')
  if (!token && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}
```

**Estructura de rutas frontend:**

```
app/
├── (auth)/login/
├── (dashboard)/
│   ├── admin/         // Solo admin
│   ├── pacientes/     // Recepcionista + admin
│   └── pagos/         // Recepcionista + admin
├── loading.tsx        // App Shell Skeleton global
└── not-found.tsx      // 404
```

---

#### Checklist Fase 1

**Monorepo e infraestructura base:**
- [x] `pnpm-workspace.yaml` en raíz
- [x] `packages/shared/` — `package.json` + `tsconfig.json` + directorios `src/enums/`, `src/interfaces/`, `src/dtos/`
- [x] `tsconfig.base.json` en raíz — `strict: true`, heredable por ambas apps
- [x] `apps/api/tsconfig.json` — extiende `../../tsconfig.base.json`, agrega `emitDecoratorMetadata`, `paths`
- [x] `apps/web/tsconfig.json` — extiende `../../tsconfig.base.json`, agrega Next.js-specific
- [x] Scripts Prisma en `apps/api/package.json`: `db:migrate` (`prisma migrate dev`), `db:deploy` (`prisma migrate deploy`), `db:studio` (`prisma studio`)
- [x] Puerto en `apps/api/src/main.ts`: cambiar de 3000 → 3001
- [x] `docker-compose.dev.yml` — healthcheck en `db`, `depends_on: condition: service_healthy` en `api`
- [x] `docker-compose.yml` — producción con nginx
- [x] `Makefile` en raíz — targets: `setup`, `dev`, `down`, `down-v`, `logs`, `logs-db`, `shell-api`, `shell-db`, `db-migrate`, `db-deploy`, `db-studio`, `db-seed`, `prod`, `prod-down`
- [x] `.env.development` + `.env.example` (sin valores reales)
- [x] `.gitignore` — incluye `.env*` excepto `.env.example`

**Code Quality (ESLint + Prettier + Git Hooks):**
- [x] `.prettierrc` + `.prettierignore` en raíz del monorepo (config compartida)
- [x] `apps/api/eslint.config.mjs` — flat config ESLint 9
- [x] `apps/web/eslint.config.mjs` — flat config ESLint 9
- [x] `apps/api/package.json` + `apps/web/package.json` — scripts `lint`, `lint:fix`, `format`, `typecheck`
- [x] `package.json` raíz — scripts `lint`, `format`, `format:check`, `typecheck`, `check`
- [x] Husky + lint-staged — pre-commit valida lint + format en archivos staged
- [x] `commitlint.config.js` — conventional commits
- [x] `.vscode/settings.json` + `.vscode/extensions.json` — formatOnSave + ESLint auto-fix

**Infraestructura backend:**
- [x] `src/config/` — `app.config.ts`, `database.config.ts`, `jwt.config.ts`, `env.validation.ts` (Joi)
- [x] `prisma/schema.prisma` — datasource + generator + todos los models con `@@index()` en campos de query frecuente
- [x] `src/database/prisma.service.ts` — `PrismaService extends PrismaClient`, `onModuleInit` connect
- [x] `src/database/prisma.module.ts` — `PrismaModule` global, exporta `PrismaService`
- [x] `AppModule` — `ConfigModule` global + `PrismaModule` + `ThrottlerModule`
- [x] `main.ts` — `cookie-parser`, `helmet`, `ValidationPipe`, `HttpExceptionFilter`
- [x] `GET /health` — `HealthController` marcado `@Public()`
- [x] `common/decorators/` — `@CurrentUser()`, `@Public()`, `@RequirePermission()`
- [x] `common/filters/` — `HttpExceptionFilter`
- [x] `common/exceptions/` — base para custom exceptions de dominio
- [x] Prisma migrations ya generadas (schema apply with prisma migrate dev)
- [x] `prisma/seed.ts` — standalone, usa `new PrismaClient({ adapter })`, llama seeders en orden; configurado en `prisma.config.ts → migrations.seed`

> **⚠️ Prisma 7 — Breaking changes vs CLAUDE.md:**
>
> 1. **`datasource.url` eliminado del schema.** Ya no se escribe `url = env("DATABASE_URL")` en `schema.prisma`. La URL de conexión va en `prisma/prisma.config.ts` (campo `datasource.url`) y el `PrismaClient` en runtime recibe el driver adapter.
>
> 2. **Driver adapter obligatorio.** `PrismaService` y `prisma/seed.ts` instancian `PrismaClient` con `{ adapter: new PrismaPg({ connectionString: url }) }`. Requiere `@prisma/adapter-pg` + `pg` como dependencias de producción.
>
> 3. **`prisma.config.ts` es el nuevo punto de configuración.** Reemplaza los campos del `datasource` block del schema para migraciones. Ubicar en `prisma/prisma.config.ts`.
>
> 4. **Seed config movida a `prisma.config.ts → migrations.seed`.** `package.json → "prisma": { "seed": "..." }` ya no funciona. El seed se configura en `prisma.config.ts` y todos los comandos prisma necesitan `--config prisma/prisma.config.ts`.
>
> ```ts
> // prisma/prisma.config.ts — Prisma 7 completo
> import { defineConfig } from 'prisma/config';
> export default defineConfig({
>   schema: path.join(__dirname, 'schema.prisma'),
>   datasource: { url: process.env['DATABASE_URL'] },
>   migrations: {
>     seed: `ts-node --transpile-only ${path.join(__dirname, 'seed.ts')}`,
>   },
> });
>
> // package.json scripts — todos con --config
> "db:migrate": "prisma migrate dev --config prisma/prisma.config.ts"
> "db:seed":    "prisma db seed --config prisma/prisma.config.ts"
>
> // src/database/prisma.service.ts — runtime con adapter
> super({ adapter: new PrismaPg({ connectionString: url }) });
>
> // prisma/schema.prisma — datasource sin url
> datasource db { provider = "postgresql" }
> ```
>
> 5. **`module: Node16` en tsconfig.** `module: commonjs` + `moduleResolution: node16` genera error TS — deben coincidir. Usar `module: "Node16"` + `moduleResolution: "Node16"`. NestJS compila correctamente con esta config.
>
> 6. **`globals` en eslint.config.mjs.** Con ESLint 9 flat config + `env: node` inexistente, `process`/`__dirname` son `no-undef`. Solución: `import globals from 'globals'` y agregar `globals: { ...globals.node }` en `languageOptions`.

**Auth y ACL:**
- [x] Entidades `User`, `Role`, `Permission`, `RoleVersion` + migraciones
- [x] `AuthModule` — login, logout, `JwtStrategy` extrae token de cookie
- [x] `JwtAuthGuard` + `AclGuard` con validación de `role_version`
- [x] Cache de `role_version` en memoria (`Map` con TTL 60s) en `RolesService`

**Migraciones (en orden de dependencias):**
- [x] `CreateTenantTable` (Obligatorio desde Fase 1)
- [x] `CreateRoleTable` + `CreatePermissionTable` + `CreateRoleVersionTable`
- [x] `CreateUserTable`
- [x] `CreateSpecialtyTable` + `CreateServiceTable`
- [x] `CreateDoctorTable` + `CreateDoctorBankAccountTable` + `CreateDoctorSpecialtyTable`
- [x] `CreatePatientTable` (incluye campo `extra_data JSONB nullable` — sin tabla separada)
- [x] `CreateConsultationTable` + `CreateConsultationServiceTable`
- [x] `CreateSystemConfigTable`
- [x] `CreateExchangeRateTable` — `date` UNIQUE, `source` enum (`MANUAL` | `API`)
- [x] `CreatePaymentTable` + `CreatePaymentDetailTable` + `CreatePaymentAdjustmentTable` + `CreateConsultationPaymentTable`
- [x] `CreateDoctorReceiptTable`
- [x] `CreateExpenseCategoryTable`
- [x] `CreateExpenseTable`
- [x] `CreateAuditLogTable`

**Seeders (en orden):**
- [x] `roles.seeder.ts` — roles + permisos
- [x] `users.seeder.ts` — admin + recepcionista
- [x] `specialties.seeder.ts` — 6 especialidades + servicios con precios
- [x] `doctors.seeder.ts` — 3 doctores demo con cuentas bancarias (`isDefault: true` en la primera cuenta)
- [x] `patients.seeder.ts` — 5 pacientes demo
- [x] `expense-categories.seeder.ts` — 7 categorías base
- [x] `system-config.seeder.ts` — `{ key: 'igtf_rate', value: '0' }`
- [x] `exchange-rates.seeder.ts` — tasa demo del día de setup
- [x] `tenant.seeder.ts` — tenant base

**Módulos de negocio backend** (cada uno: entidad + migración + DTOs + controller + service):
- [x] `patients` — CRUD, `PrismaService` inyectado en service, desactivar via `isActive = false`
- [x] `doctors` — registro con múltiples especialidades vía `DoctorSpecialty`, split configurable, `DoctorBankAccount` con `isDefault`
- [x] `specialties` — CRUD especialidades + servicios con precios
- [x] `consultations` — entidad `Consultation` (patient + doctor) + `ConsultationService` (N servicios con snapshot de precio)
- [x] `payments` — repository custom + `PaymentsMapper` + idempotencia (`ConsultationPayment`) + DB transaction + split + IGTF configurable + `PaymentDetail` + `PaymentAdjustment`
- [x] `system-config` — CRUD admin para configuración global (`igtf_rate`, futuras configs)
- [x] `exchange-rates` — `POST /exchange-rates` (admin, registra tasa del día) + `GET /exchange-rates/latest`
- [x] `receipts` — `DoctorReceipt` entity + snapshot de datos + numeración secuencial `CM-{AÑO}-{SEQ}` + `GET /receipts/:paymentId/data`
- [x] `expenses` — `ExpenseCategory` (CRUD admin) + `Expense` (registro con `status: active | voided`)
- [x] `roles` — CRUD roles y permisos (solo admin)
- [x] `audit-log` — interceptor global (CREATE/UPDATE/DELETE en entidades de negocio)
- [x] `app-config` — `AppConfigModule` + `GET /config/init`

**Infraestructura frontend:**
- [x] `config/api.ts` — `apiFetch` con detección server/client + manejo 401
- [x] `config/query.config.ts` — `staleTime: 60_000`, `retry: 1`
- [x] `app/providers.tsx` — `QueryClientProvider` (`'use client'`)
- [x] `app/layout.tsx` — importa `Providers`
- [x] `stores/auth.store.ts` — Zustand en RAM, sin persist
- [x] `shared/utils/` — `formatCurrency`, `calcDoctorSplit`, `calcIgtf`, `cn`
- [x] `middleware.ts` — protección de rutas, redirect a `/login`
- [x] `app/globals.css` — tokens MD3 completos (MD3 via `@theme inline` en Tailwind v4)
- [x] `shared/config/navigation.config.ts` — `NAV_CONFIG` con ítems, submenús y permisos requeridos
- [x] `shared/hooks/use-sidebar-nav.ts` — filtra NAV_CONFIG según permisos del JWT
- [x] `shared/components/Sidebar.tsx` — Client Component con submenús colapsables
- [x] `shared/components/Topbar.tsx` — nombre del usuario, rol, botón logout
- [x] `app/(dashboard)/layout.tsx` — layout con Sidebar + Topbar + main content
- [x] `features/config/services/config.service.ts` — `getInitConfig()` consume `GET /config/init`
- [x] `features/config/hooks/use-app-config.ts` — `useAppConfig()` con `staleTime: 5min`

**Módulos frontend** (page + hook TanStack Query + service + componentes):
- [x] App Shell global (`loading.tsx`) + páginas `not-found.tsx` + `error.tsx`
- [x] `app/not-found.tsx` — página 404 global
- [x] `app/error.tsx` — error boundary global con botón reintentar
- [x] `/login` — formulario, `useMutation`, setAuth en store al recibir respuesta
- [x] `features/auth/` — hooks y services para autenticación
- [x] `/admin/especialidades` — CRUD, `useSpecialties`
- [x] `/admin/doctores` — registro + listado, `useDoctors`
- [x] `/admin/roles` — gestión roles/permisos, `useRoles`
- [x] `/admin/usuarios` — gestión usuarios, `useUsers`
- [x] `/pacientes` — buscar/crear paciente, hooks + services
- [x] `/recepcion` — flujo completo: paciente → doctor → servicio → pago con idempotency key
- [x] `/pagos` — historial de pagos, formulario multi-línea con idempotency key
- [x] `/egresos` — registro de egresos + modal de void
- [x] Recibo doctor — componente `DoctorReceiptPDF` con `@react-pdf/renderer`

**Dependencia frontend nueva:**
```bash
pnpm add @react-pdf/renderer
pnpm add -D @types/react-pdf
```

**Patrón del componente recibo:**
```tsx
// features/pagos/components/DoctorReceiptPDF.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export function DoctorReceiptPDF({ data }: { data: DoctorReceiptData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* header, datos doctor, tabla montos, firma */}
      </Page>
    </Document>
  )
}
```

```tsx
// Descarga on-demand
import { pdf } from '@react-pdf/renderer'

const blob = await pdf(<DoctorReceiptPDF data={receiptData} />).toBlob()
const url = URL.createObjectURL(blob)
// abrir en nueva pestaña o forzar descarga
```

---

---

### Post Fase 1 — Fixes y mejoras aplicadas

- [x] `GET /auth/me` — endpoint que retorna `{ userId, email, role, roleVersion, permissions }` desde JWT
- [x] `AuthHydrator` component — hidrata store Zustand al refrescar página (sin `localStorage`)
- [x] `useSidebarNav` — corregido selector Zustand: suscribe a `permissions[]` directo (no a `hasPermission` fn)
- [x] `navigation.config.ts` — rutas corregidas (`/admin/doctores`, agregado `/recepcion`)
- [x] `sidebar.tsx` — agregado ícono `ClipboardList` para Recepción
- [x] `GET /doctors/:id/service-prices` — endpoint faltante implementado
- [x] `pnpm-lock.yaml` — regenerado tras remover `ms` y `@types/ms`
- [x] Prisma Client regenerado en container (`make db-generate`)
- [x] Makefile — agregados `make api`, `make web`, `make restart-api`, `make restart-web`, `make logs-web`, `make shell-web`, `make db-generate`
- [x] Dockerfiles dev — `CMD` cambiado a `tail -f /dev/null` para control manual del proceso
- [x] `/reportes` — página placeholder Fase 2

### Validación Final Fase 1

- [x] `docker compose -f docker-compose.dev.yml exec api pnpm run typecheck`
- [x] `docker compose -f docker-compose.dev.yml exec api pnpm run lint`
- [x] `docker compose -f docker-compose.dev.yml exec web pnpm run typecheck`
- [x] `docker compose -f docker-compose.dev.yml exec web pnpm run lint`
- [x] `docker compose -f docker-compose.dev.yml exec web pnpm run build`

**Estado:** Fase 1 cerrada y validada en Docker.

---

### Post Fase 1 — Flujos operativos cerrados

- [x] `/pacientes` — listado + creación + edición + desactivación lógica desde modal/tabla
- [x] `/admin/doctores` — listado + creación + edición + desactivación lógica desde modal/tabla
- [x] `/egresos` — listado + modal de solo vista por registro + anulación lógica

---

### Fase 2 — Async, Email y Reportes

**Siguiente bloque recomendado:**
- [x] Definir configuración SMTP (`mailer.config` + env vars)
- [x] Crear módulo `mailer` con transporte y servicio base
- [x] Crear job BullMQ `send-receipt-email` para enviar recibos al doctor
- [x] Definir estrategia `docgen` server-side para adjuntar PDF
- [x] Mantener reportes y ajustes financieros para el final

**Infraestructura:**
- [x] Redis + BullMQ — contenedores `redis` y `worker` en docker-compose
- [x] `@nestjs-modules/mailer` + Nodemailer — transporte SMTP/SendGrid
- [x] Panel de colas en `/admin/queues` — protegido por AclGuard (solo admin)

**Issues detectados durante la integración BullMQ:**
- [x] `pnpm-lock.yaml` debe regenerarse dentro de Docker cada vez que se agrega un workspace package o dependencia nueva
- [x] Sync automático del lockfile vía `make deps-sync` + hook de pre-commit + CI con `pnpm install --frozen-lockfile`
- [x] `packages/shared` debe estar montado en `docker-compose.dev.yml` para que `api` y `worker` vean los cambios en desarrollo
- [x] Cada nuevo workspace necesita su propio `package.json`, `tsconfig.json` y config de lint si va a correr `typecheck`/`lint`
- [x] `Dockerfile.dev` debe copiar `packages/shared/package.json` antes de `pnpm install --frozen-lockfile`
- [x] No usar `docker run` aislado para resolver dependencias del monorepo cuando el proyecto ya usa `docker-compose`

**Módulos:**
- [x] `docgen` — Strategy Pattern para PDF server-side (recibos vía email al doctor)
- [x] `mailer` — envío asíncrono de correos con PDF adjunto (BullMQ queue)
- [x] Módulo `expenses` frontend — registro + historial egresos
- [x] Reportes PDF — balance ingresos/egresos (`@react-pdf/renderer`) 
- [x] Balance mensual con proyección
- [x] `PaymentAdjustment` activado — descuentos, créditos, reembolsos en UI
- [x] Bull Board montado en backend y panel de colas simplificado en `/admin/queues`

**Cierre de Fase 2:**
- [x] Async jobs, mailer, recibos y reportes cerrados para la demo comercial
- [x] Ruta de estabilidad `/inicio` con KPIs reales lista como entrada principal
- [x] Build/typecheck validados en Docker para `api` y `web`

**Nuevo bloque de Inicio / Stats:**
- [x] Botón `Inicio` en el menú principal
- [x] Ruta `/inicio` como landing del dashboard
- [x] Servicio `stats` backend con endpoint `GET /stats/home`
- [x] KPIs del inicio: pacientes hoy, doctores hoy, cancelados del mes, pendientes por pagar, monto pendiente
- [x] Alertas operativas mínimas en la vista `Inicio`
- [x] Pendientes por pagar definidos como pagos completados del mes aún sin liquidación

**Ruta de Estabilidad (Fase 2):**
- [x] Dashboard de Inicio (`/inicio`) con KPIs reales consumidos desde `GET /stats/home`
- [x] Vista pensada para demo comercial y lectura operativa inmediata
- [x] Primer punto de entrada del tenant al iniciar sesión

**Demo Seed (cliente / presentación):**
- [x] Seed demo separado e idempotente para `Centro Médico Demo`
- [x] Carga de roles, usuarios, especialidades, doctores, pacientes, consultas, pagos, ajustes y egresos
- [x] Dataset alineado con los KPIs de `Inicio` y los flujos de pagos/recibos
- [x] Seed ejecutable vía `pnpm run db:seed` dentro de Docker

### Fase 3 — Multi-País, I18N y Extensiones Clínicas

> **Nota Estratégica para Escalamiento:** Toda la arquitectura y roadmap de la **Fase 3** (Theming Avanzado, Menú Dinámico en DB, Internacionalización y Estrategias Fiscales Multi-País) se ha migrado al archivo **[PHASE3-FUTURE.md](./PHASE3-FUTURE.md)**.
> 
> *¿Por qué?* El diseño de MVP debe mantener un foco implacable en la clínica piloto. La arquitectura de Fase 1 ya es sólida (row-level tenancy garantizado, JWT seguro, decimales exactos, transacciones atómicas) preparándonos para ser un SaaS confiable, pero sin caer en *over-engineering* prematuro. Construimos lo necesario hoy, con bases listas para extenderse mañana.

---

## Seed Inicial

Todos los seeders son **idempotentes** — verifican existencia antes de insertar. Orden de ejecución obligatorio:

```
roles.seeder → users.seeder → specialties.seeder → doctors.seeder → patients.seeder → expense-categories.seeder
```

Archivo orquestador: `apps/api/src/database/seeders/seed.ts`

---

### 1. Roles + Permisos (`roles.seeder.ts`)

Roles: `admin`, `recepcionista`. Matriz de permisos definida en CLAUDE.md (sección ACL).

---

### 2. Usuarios (`users.seeder.ts`)

| Email | Password | Rol |
|-------|----------|-----|
| admin@centromedico.com | Admin123! | admin |
| recepcion@centromedico.com | Recep123! | recepcionista |

---

### 3. Especialidades + Servicios (`specialties.seeder.ts`)

#### Ginecología y Obstetricia
| Servicio | Precio |
|---|---|
| Consulta ginecológica | $25 |
| Consulta + Ecografía obstétrica | $45 |
| Ecografía obstétrica | $30 |
| Consulta + Ecografía ginecológica | $40 |
| Citología (PAP) | $20 |
| Consulta + Eco + Citología | $55 |

#### Medicina General
| Servicio | Precio |
|---|---|
| Consulta | $15 |
| Consulta + Electrocardiograma | $30 |

#### Cardiología
| Servicio | Precio |
|---|---|
| Consulta cardiológica | $35 |
| Consulta + Electrocardiograma | $50 |
| Ecocardiograma | $60 |

#### Pediatría
| Servicio | Precio |
|---|---|
| Consulta pediátrica | $20 |
| Control de niño sano | $20 |

#### Dermatología
| Servicio | Precio |
|---|---|
| Consulta dermatológica | $30 |
| Consulta + Biopsia | $60 |

#### Ecografía
| Servicio | Precio |
|---|---|
| Ecografía abdominal | $35 |
| Ecografía pélvica | $30 |
| Ecografía obstétrica | $30 |
| Ecografía de partes blandas | $35 |

---

### 4. Doctores demo (`doctors.seeder.ts`)

| Nombre | Especialidades (isPrimary) | Split % | Email | Banco | Tipo cuenta | N° cuenta |
|---|---|---|---|---|---|---|
| Dr. Carlos Mendoza | Ginecología y Obstetricia ✅, Ecografía | 70 | carlos.mendoza@centromedico.com | Banco Venezuela | Ahorro | 0102-1234-56-7890123456 |
| Dra. María Pérez | Medicina General ✅ | 65 | maria.perez@centromedico.com | Banesco | Corriente | 0134-9876-54-3210987654 |
| Dr. José Ramírez | Cardiología ✅ | 70 | jose.ramirez@centromedico.com | Mercantil | Ahorro | 0105-4567-89-0123456789 |

Cada doctor tiene una `DoctorBankAccount` con `isDefault: true` y sus registros en `DoctorSpecialty` (✅ = `isPrimary: true`).

---

### 5. Pacientes demo (`patients.seeder.ts`)

| Nombre | Apellido | Documento | Tipo | Sexo | Teléfono |
|---|---|---|---|---|---|
| Ana | García | 12345678 | V | F | 0414-1234567 |
| Luis | Rodríguez | 15678901 | V | M | 0424-7654321 |
| María | Torres | 18234567 | V | F | 0416-2345678 |
| Carlos | Medina | 20123456 | V | M | 0412-8765432 |
| Sofía | Blanco | 22345678 | V | F | 0426-3456789 |

---

### Mecanismo de ejecución

Los seeds usan el patrón estándar de Prisma — un archivo standalone `prisma/seed.ts` que Prisma CLI ejecuta directamente, sin necesidad de un `SeedService` dentro de NestJS. Esto evita que el bootstrap de NestJS dependa de los seeds (migrations sí corren vía `prisma migrate deploy` en el entrypoint del container).

```ts
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { seedRoles } from './seeders/roles.seeder'
import { seedUsers } from './seeders/users.seeder'
import { seedSpecialties } from './seeders/specialties.seeder'
import { seedDoctors } from './seeders/doctors.seeder'
import { seedPatients } from './seeders/patients.seeder'
import { seedExpenseCategories } from './seeders/expense-categories.seeder'
import { seedSystemConfig } from './seeders/system-config.seeder'
import { seedExchangeRates } from './seeders/exchange-rates.seeder'

const prisma = new PrismaClient()

async function main() {
  // Orden obligatorio — respeta dependencias entre tablas
  await seedRoles(prisma)
  await seedUsers(prisma)
  await seedSpecialties(prisma)
  await seedDoctors(prisma)
  await seedPatients(prisma)
  await seedExpenseCategories(prisma)
  await seedSystemConfig(prisma)
  await seedExchangeRates(prisma)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

```jsonc
// apps/api/package.json — Prisma sabe dónde está el seed
{
  "prisma": {
    "seed": "ts-node --transpile-only prisma/seed.ts"
  }
}
```

Cada seeder recibe `prisma: PrismaClient` y usa `upsert` (idempotente) — puede correr varias veces sin duplicar datos:

```ts
// prisma/seeders/roles.seeder.ts
export async function seedRoles(prisma: PrismaClient) {
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      permissions: {
        create: [
          { resource: 'patients', action: 'create' },
          { resource: 'patients', action: 'read' },
          // ... resto de permisos admin
        ],
      },
    },
  })
}
```

**Docker entrypoint** — en el compose el comando del container api corre migraciones y luego arranca NestJS:

```sh
# apps/api/docker-entrypoint.sh
#!/bin/sh
set -e
echo "Running migrations..."
npx prisma migrate deploy
echo "Running seeds..."
npx prisma db seed
echo "Starting server..."
exec node dist/main.js
```

`GET /health` responde 200 cuando NestJS bootstrap completa — migrations y seeds ya corrieron antes porque son parte del entrypoint, no del bootstrap de NestJS.

---

## 🚀 Orden de Implementación Recomendado

Secuencia óptima para Fase 1 — cada paso se puede validar antes de avanzar al siguiente:

1. **Monorepo base:** ✅ `pnpm-workspace.yaml`, `packages/shared/`, `tsconfig.base.json`, migrar de npm a pnpm
2. **Code Quality:** ✅ ESLint flat config (ambas apps), Prettier raíz, `.vscode/`
3. **Docker:** ✅ `docker-compose.dev.yml` + `Makefile` + `.env.development` — validar con `make setup`
4. **Infraestructura backend:** ✅ Config (`@nestjs/config` + Joi), Prisma (`schema.prisma` + `PrismaService` + `PrismaModule`), `main.ts` hardening, `GET /health`
5. **Auth y ACL:** ✅ Entidades (User, Role, Permission, RoleVersion) + migraciones + seeders + guards + decorators
6. **Módulos de negocio backend:** ✅ Patients → Doctors → Specialties → Consultations → Payments → Expenses
7. **`GET /config/init`:** ✅ AppConfigModule (agrega tenant + systemConfig + exchangeRate)
8. **Infraestructura frontend:** 🔄 `apiFetch`, providers, auth store, middleware, globals.css (en progreso)
9. **Módulos frontend:** 🔄 Login → Dashboard layout (Sidebar + Topbar) → Recepción → Pacientes → Pagos
10. **Pendiente:** 
    - `packages/shared/` (enums, interfaces, DTOs compartilhados)
    - Sidebar.tsx + Topbar.tsx componentes
    - Recibo PDF (`@react-pdf/renderer`)
    - Audit log interceptor
    - Pages completas (`app/(auth)`, `app/(dashboard)`)

---

## ⚠️ Fixes y Decisiones de Implementación (actualizado durante Fase 1)

### `tenantId` obligatorio en `JwtPayload` — controllers usan `user.tenantId`

**Problema:** `JwtPayload` solo tenía `sub` (userId). Los controllers pasaban `user.sub` como `tenantId` a los services → todos los queries filtraban por `userId` en vez de `tenantId` → data leak entre usuarios del mismo tenant o queries vacíos.

**Fix aplicado:**
```ts
// common/decorators/current-user.decorator.ts
export interface JwtPayload {
  sub: string;        // userId
  tenantId: string;   // ← OBLIGATORIO — aislamiento de datos
  email: string;
  role: string;
  permissions: Array<{ resource: string; action: string }>;
  roleVersion: number;
}

// auth.service.ts — incluir tenantId en el payload al firmar
const payload: JwtPayload = {
  sub: user.id,
  tenantId: user.tenantId,  // ← siempre incluir
  email: user.email,
  role: user.role.name,
  permissions: [...],
  roleVersion,
};
```

**Regla:** Todos los controllers de módulos de negocio pasan `user.tenantId` (no `user.sub`) a los services. `user.sub` solo se usa para operaciones sobre el propio usuario (ej: `GET /auth/me`).
