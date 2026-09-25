# Apply Progress: audit-trail

## Mode

Strict TDD. Delivery: single PR with maintainer-authorized size:exception. Final continuation merged with all prior progress.

## Completed Tasks

- [x] 1.1–1.4 Foundation, context, schema/migration and shared contracts.
- [x] 2.1–2.4 Redactor, catalog, writers, facade and CRUD baseline.
- [ ] 3.1 **Partial:** explicit events cover Patient, Doctor, Specialty, Service assignments, User baseline CRUD and Role/Permission baseline selection. Dedicated ACL mutation matrix and complete service/user event tests remain.
- [x] 3.2 Payment COMPLETE/VOID/ADJUSTMENT and Expense CREATE/VOID use the active transaction client. Docker rollback E2E proves both business rows and AuditLog rows disappear together.
- [ ] 3.3 **Partial:** login failure TraceLog, logout, onboarding SEND/COMPLETE, doctor verification success/failure, consultation CREATE/VOID, medical-record CREATE and report EXPORT are covered. Consultation UPDATE and full failure matrix remain.
- [ ] 3.4 **Blocked by design contract:** AUDIT_ENABLED, TRACE_RETENTION_DAYS, admin permission seed and TraceWriter.prune() are present/tested. The design does not define scheduler or metrics contracts; no behavior was invented.
- [x] 4.1–4.2 Protected tenant-scoped viewer API and Next viewer.
- [ ] 4.3 **Partial:** tenant/cursor unit tests, viewer E2E and payment/expense rollback E2E pass. Real AppModule permission-denied/cross-tenant HTTP coverage remains; unrelated existing patients/payments E2E still fail at 401 setup.
- [x] 4.4 Docker migration deployment and validations executed; baseline failures documented below.

## TDD Cycle Evidence

| Task | Test File                                                                                       | Layer       | RED                         | GREEN                                                  | TRIANGULATE / BLOCKER                                           |
| ---- | ----------------------------------------------------------------------------------------------- | ----------- | --------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| 3.1  | database/prisma-audit.extension.spec.ts, domain suites                                          | Unit        | Existing/updated first      | 8 suites/20 tests pass                                 | Complete ACL mutation matrix pending                            |
| 3.2  | payments.service.spec.ts, expenses.service.spec.ts, test/audit-rollback.e2e-spec.ts             | Unit/E2E    | Adjustment path added first | 2 rollback scenarios pass; payment suite passes        | Service-level rollback coupling not separately exercised        |
| 3.3  | auth guard/domain suites, SACS implementation                                                   | Unit        | Updated first               | Targeted auth/domain suites pass                       | Consultation UPDATE path absent in current domain API           |
| 3.4  | trace-writer.spec.ts                                                                            | Unit        | Written first               | 1/1 passes                                             | Scheduler/metrics contract absent in design; explicitly blocked |
| 4.3  | audit-log-query.service.spec.ts, test/audit-viewer.e2e-spec.ts, test/audit-rollback.e2e-spec.ts | Unit/E2E    | Written first               | 2 suites/3 tests pass                                  | Real AppModule auth setup remains pending                       |
| 4.4  | Docker migration/typecheck/lint/Jest                                                            | Integration | N/A                         | Migration no-pending, typecheck and directed lint pass | Full baseline failures documented                               |

## Validation Evidence

- Docker `pnpm run db:deploy`: ✅ no pending migrations; audit migration already applied.
- Docker Prisma validate: ✅.
- Docker API typecheck: ✅.
- Docker targeted ESLint: ✅.
- Docker targeted Jest: ✅ 8 suites, 20 tests in latest domain run.
- Docker audit E2E: ✅ 2 suites, 3 tests, including payment and expense rollback.
- Existing full E2E: expenses passes; patients/payments fail with HTTP 401 because those tests instantiate full AppModule without authenticated setup.
- Full unit suite baseline still has unrelated medical-record export and reports Reflect metadata failures. No build executed.

## Explicit Blockers

- 3.4: no scheduler/metrics contract exists in proposal/spec/design; retention prune remains callable infrastructure only.
- 4.3: existing AppModule E2E lacks authenticated tenant fixtures; only audit-specific isolated E2E was changed.
- 3.3: no consultation UPDATE method exists in the current domain API, so no event was invented.

## Relevant Files

- apps/api/src/audit-log/\* — redaction, writers, retention prune, query API and tests.
- apps/api/src/payments/payments.service.ts — transactional payment events and adjustment event.
- apps/api/src/doctors/doctors.service.ts — doctor/service/verification events.
- apps/api/src/auth/auth.controller.ts — logout event.
- apps/api/test/audit-viewer.e2e-spec.ts — viewer E2E contract.
- apps/api/test/audit-rollback.e2e-spec.ts — payment/expense rollback evidence.
- openspec/changes/audit-trail/tasks.md — 3.2 and 4.4 marked complete; remaining tasks intentionally unchecked.
