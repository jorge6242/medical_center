# Prisma Audit Middleware Specification

## Purpose

Specifies the automatic audit log capture layer registered as a Prisma middleware in `PrismaService`. Intercepts configured mutating operations on audited models and writes an `AuditLog` row with before/after state, without requiring changes to existing services.

## Requirements

### Requirement: Middleware Registration

The Prisma audit middleware MUST be registered inside `PrismaService.onModuleInit()` via `this.$use()`. It MUST run on every Prisma client request before the query resolves.

#### Scenario: Middleware active after module init

- GIVEN `PrismaService.onModuleInit()` has executed
- WHEN a mutating query runs on an audited model
- THEN the middleware intercepts the query before and after execution

### Requirement: Audited Operations

The middleware MUST intercept the following Prisma operations: `create`, `update`, `updateMany`, `delete`, `deleteMany`. Operations `findMany`, `findUnique`, `findFirst`, `count`, and `aggregate` MUST NOT be intercepted.

#### Scenario: Create operation on audited model

- GIVEN a `create` operation targets `Patient`
- WHEN the middleware intercepts it
- THEN an `AuditLog` row is written with `action = 'CREATE'`, `oldValues = null`, `newValues = <created record>`

#### Scenario: Update operation on audited model

- GIVEN an `update` operation targets `Doctor`
- WHEN the middleware intercepts it
- THEN an `AuditLog` row is written with `action = 'UPDATE'`, `oldValues = <record before mutation>`, `newValues = <record after mutation>`

#### Scenario: Read operation — no audit

- GIVEN a `findMany` query targets `Patient`
- WHEN the middleware intercepts it
- THEN the query passes through without writing any `AuditLog` row

### Requirement: Audited Models

The middleware MUST audit the following models only: `Patient`, `Doctor`, `User`, `Payment`, `Expense`, `Specialty`, `Service`. The `AuditLog` model itself MUST NOT be audited (prevents infinite loop).

#### Scenario: Mutation on non-audited model

- GIVEN an `update` operation targets `ConsultationPayment` (not in audited list)
- WHEN the middleware intercepts it
- THEN the query passes through without writing any `AuditLog` row

#### Scenario: Mutation on AuditLog model itself

- GIVEN a `create` on `AuditLog` (triggered by `AuditLogService.log()`)
- WHEN the middleware would otherwise recurse
- THEN the middleware detects `model === 'AuditLog'` and passes through without re-auditing

### Requirement: Pre-Read for Old Values

For `update` operations, the middleware MUST perform a `findUnique` lookup by primary key **before** executing the mutation to capture `oldValues`. For `create` operations, the pre-read MUST be skipped (no prior state exists).

#### Scenario: Update — old values captured

- GIVEN an `update` on `Patient` with `where: { id: '123' }`
- WHEN the middleware runs
- THEN it calls `findUnique({ where: { id: '123' } })` before the update
- AND stores the result as `oldValues` in the audit entry

#### Scenario: Create — no pre-read

- GIVEN a `create` on `User`
- WHEN the middleware runs
- THEN it does NOT perform any `findUnique` call before the insert
- AND `oldValues` is `null` in the audit entry

#### Scenario: UpdateMany — no pre-read, args as newValues

- GIVEN an `updateMany` on `Patient`
- WHEN the middleware runs
- THEN `oldValues` is `null` (pre-read skipped for batch operations)
- AND `newValues` MUST be set to the `args.data` payload (mutation input)
- AND the audit entry MUST include a note field or action suffix indicating batch scope

### Requirement: ChangedFields Computation

For `update` operations with `oldValues` available, the middleware MUST compute `changedFields` as the array of field names whose values differ between `oldValues` and `newValues`. For `create`, `changedFields` MUST be all fields present in `newValues`. For `updateMany`, `changedFields` MUST be the keys of `args.data`.

#### Scenario: Changed fields on update

- GIVEN `oldValues = { name: 'Alice', phone: null }` and `newValues = { name: 'Alice', phone: '555-1234' }`
- WHEN `changedFields` is computed
- THEN `changedFields = ['phone']`

### Requirement: Context-Sourced UserId and TenantId

The middleware MUST call `RequestContextService.getContext()` to obtain `userId` and `tenantId` for the audit entry. These values MUST NOT be taken from query arguments.

#### Scenario: Authenticated context available

- GIVEN an authenticated HTTP request has populated `RequestContextService`
- WHEN a mutation fires on an audited model
- THEN the `AuditLog` row is written with `userId` and `tenantId` from the request context

#### Scenario: Null context — silent skip

- GIVEN code running outside an HTTP request (seed scripts, cron jobs, tests)
- WHEN `RequestContextService.getContext()` returns `null`
- THEN the middleware MUST skip audit log creation silently (no error thrown)
- AND the mutation MUST still execute normally

### Requirement: No Circular Dependency

`AuditLogModule` MUST be importable by `DatabaseModule` without creating a circular dependency. `AuditLogModule` MUST NOT import `DatabaseModule` or `PrismaModule`.

#### Scenario: Application bootstraps without error

- GIVEN `AuditLogModule` exports `AuditLogService` and `DatabaseModule` imports `AuditLogModule`
- WHEN NestJS resolves the dependency graph
- THEN no circular dependency error is thrown and the app starts successfully
