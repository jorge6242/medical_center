# Prisma Audit Middleware Specification

## Purpose

Define the CRUD baseline without duplicating domain events or bypassing tenant and transaction rules.

## MODIFIED Requirements

### Requirement: Audited operations and models

The middleware MUST intercept configured mutating operations only (`create`, `update`, `updateMany`, `delete`, `deleteMany`) for `Patient`, `Doctor`, `User`, `Payment`, `Expense`, `Specialty`, and `Service`; reads and `AuditLog`/`TraceLog` writes MUST pass through. It MUST NOT duplicate an explicit domain event for the same action, and delete semantics MUST remain deactivation/voiding rather than physical deletion.
(Previously: middleware audited the listed models and mutations without duplicate suppression or TraceLog distinction.)

#### Scenario: Read and excluded model

- GIVEN a `findMany` on Patient or an update on ConsultationPayment
- WHEN middleware runs
- THEN the query proceeds without an audit row

#### Scenario: Explicit event prevents duplicate

- GIVEN a payment service writes its domain audit event in the active transaction
- WHEN the Prisma mutation is intercepted
- THEN no second baseline event is created for the same correlation/action

### Requirement: Values and fields

For single-record updates the middleware MUST capture before/after state and changed fields; creates MUST use null before-state; batch mutations MUST identify batch scope. All values MUST be redacted before persistence.

#### Scenario: Update snapshot

- GIVEN old `{name:'A', phone:null}` and new `{name:'A', phone:'x'}`
- WHEN fields are computed
- THEN changedFields is `['phone']` and snapshots are redacted

### Requirement: Context and transaction

The middleware MUST source actor, tenant, correlation, and request metadata from request context, and MUST use the active transaction client when one exists. Outside a request it MUST skip safely; it MUST never infer tenant from query arguments.

#### Scenario: Concurrent tenant requests

- GIVEN two requests mutate records for different tenants
- WHEN both execute concurrently
- THEN each event contains only its own context and transaction

#### Scenario: No context

- GIVEN a seed or background mutation has no request context
- WHEN middleware runs
- THEN the mutation succeeds without an invented actor or tenant
