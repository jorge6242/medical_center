# prisma-audit-middleware Specification

## Purpose

Define automatic Prisma-level audit capture for business-entity mutations using Prisma `$extends`, request context from `AsyncLocalStorage`, and the existing `AuditLog` table.

## Requirements

### Requirement: Audited mutations MUST create AuditLog rows when request context exists

For configured audited models, Prisma `create`, `update`, and supported `updateMany` operations MUST write an `AuditLog` entry when `RequestContext` is available.
The audit entry MUST include `userId`, `tenantId`, action, entity/model name, entity id when available, `oldValues`, `newValues`, and `changedFields`.

#### Scenario: Update records old and new values

- GIVEN an authenticated request updates an audited model record
- WHEN the Prisma `$extends` query hook executes the update
- THEN it MUST read the previous record before mutation
- AND it MUST write an `AuditLog` row containing the previous values, submitted new values, and changed field names

#### Scenario: Create records new values

- GIVEN an authenticated request creates an audited model record
- WHEN the Prisma `$extends` query hook executes the create
- THEN it MUST write an `AuditLog` row with `oldValues` absent or null
- AND `newValues` MUST describe the created values or mutation data

### Requirement: Audit hook MUST skip safely when no request context exists

The audit hook MUST NOT throw or block mutations when `AsyncLocalStorage` has no context.

#### Scenario: Seed or background flow mutates audited model

- GIVEN a seed, cron, or non-HTTP flow mutates an audited model
- WHEN the audit hook reads request context and receives `undefined`
- THEN the original mutation MUST still succeed
- AND no `AuditLog` row MUST be written for that automatic hook execution

### Requirement: Audit implementation MUST use Prisma $extends

The automatic audit hook MUST be implemented with Prisma `$extends` query extensions, not removed Prisma middleware APIs such as `$use()`.

#### Scenario: PrismaService initializes audit extension

- GIVEN `PrismaService.onModuleInit()` runs
- WHEN the Prisma client connects
- THEN it MUST apply the audit query extension with `$extends`
- AND existing service call sites such as `prisma.patient.update(...)` MUST continue to work without code changes

### Requirement: AuditLogService MUST avoid PrismaService circular dependency

`AuditLogService` MUST NOT inject `PrismaService` if `PrismaService` depends on `AuditLogService`.
It MUST use a lifecycle-managed standalone `PrismaClient` or another non-circular persistence mechanism.

#### Scenario: Application bootstraps without circular providers

- GIVEN NestJS starts the API application
- WHEN `PrismaModule`, `AuditLogModule`, and `RequestContextModule` are initialized
- THEN provider resolution MUST complete without circular dependency errors
- AND `AuditLogService` MUST be able to insert audit rows independently of `PrismaService`

### Requirement: Audited model set MUST match project audit policy

Automatic audit MUST cover the configured business models from the project policy where Prisma-level create/update capture is appropriate.
At minimum this includes `Patient`, `Doctor`, `User`, `Specialty`, `Service`, `ExpenseCategory`, `DoctorBankAccount`, `ExchangeRate`, and `SystemConfig`.

#### Scenario: Non-audited model mutates

- GIVEN a Prisma mutation targets a model outside the audited set
- WHEN the audit extension evaluates the operation
- THEN it MUST call the original query without writing an `AuditLog` row

#### Scenario: Global Service model mutates

- GIVEN a mutation targets the global `Service` catalog model
- WHEN the audit extension writes an audit row
- THEN it MUST use the acting request context `tenantId` because `AuditLog.tenantId` is required by the current schema
- AND it MUST NOT infer tenant ownership from the `Service` row itself, because `Service` has no direct tenant field

### Requirement: updateMany limitations MUST be explicit

For `updateMany`, the system MAY log bulk-level mutation data instead of per-record old/new values because Prisma does not return each updated entity.

#### Scenario: Bulk update is audited at bulk level

- GIVEN an authenticated request executes `updateMany` on an audited model
- WHEN the audit extension writes an audit entry
- THEN it MUST use a bulk entity identifier such as `bulk`
- AND it SHOULD record `newValues` from the mutation data
- AND it MAY omit per-row `oldValues`
