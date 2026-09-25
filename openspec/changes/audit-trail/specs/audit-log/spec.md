# Audit Log Specification

## Purpose

Provide immutable, tenant-scoped evidence for every in-scope clinical, financial, administrative, and security action.

## Requirements

### Requirement: Complete audit event

Each event MUST persist a catalog action, actor (or explicit anonymous/system marker), tenant when known, entity/type and id when applicable, outcome, correlation/request metadata, redacted before/after snapshots, and changed fields. Events MUST be append-only; clinical and financial records MUST NOT be physically deleted.

#### Scenario: Successful patient update

- GIVEN an authenticated user updates a patient in tenant A
- WHEN the operation succeeds
- THEN exactly one UPDATE event records tenant A, actor, entity, outcome success, changed fields, and redacted snapshots

#### Scenario: Failed mutation

- GIVEN a valid tenant-scoped operation fails validation or authorization
- WHEN the request finishes
- THEN the event records failure without persisting rejected secrets or raw clinical data

### Requirement: Coverage matrix

The system MUST emit events for patient and doctor create/update/deactivate; payment create/complete/void/adjustment; expense create/update/void; consultation create/update/void; specialty/service/catalog changes; user, role, permission and ACL changes; login/logout/failed authentication; onboarding send/verify/complete; and report/export generation.

#### Scenario: Financial completion

- GIVEN a payment or expense completes inside a transaction
- WHEN the transaction commits
- THEN its corresponding event is present and reflects the final outcome

#### Scenario: Security and reporting actions

- GIVEN a login fails, onboarding is verified, or an authorized report is exported
- WHEN the action finishes
- THEN an event exists with safe metadata and no token, credential, or report payload

#### Scenario: Clinical, catalog, and access matrix

- GIVEN a patient/doctor is changed, a consultation is recorded or voided, a specialty/service changes, or a user/role/permission changes
- WHEN each operation succeeds or fails
- THEN one cataloged event records the relevant entity, actor, tenant, outcome, and safe changed fields

### Requirement: Atomic financial audit

Financial events MUST be written through a writer accepting `Prisma.TransactionClient`; if the business transaction rolls back, its audit event MUST also be absent.

#### Scenario: Financial rollback

- GIVEN payment persistence and its audit write execute in one transaction
- WHEN a later financial operation fails
- THEN neither the financial mutation nor its audit event remains

### Requirement: Tenant-safe immutable query

Audit reads MUST require `audit_logs:read`, always scope by tenant, support bounded pagination and filters, and MUST NOT permit update/delete/purge through the application API.

#### Scenario: Cross-tenant identifier

- GIVEN an administrator of tenant A requests an event belonging to tenant B
- WHEN the event is queried
- THEN the API returns not found/forbidden without revealing its existence
