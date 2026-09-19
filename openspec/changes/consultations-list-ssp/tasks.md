# Tasks: Consultations List SSP

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 500-750 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 backend API -> PR 2 frontend list/modal |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Add tenant-safe `GET /consultations` | PR 1 | DTOs, module, service, controller |
| 2 | Add `/consultas` UI | PR 2 | Service/hook/table/toolbar/modal/navigation |

## Generic Spec Dependencies

- [ ] 0.1 Follow `data-table-ssp` for shared `DataTable` composition, manual pagination, toolbar, loading/empty states, and row action callbacks through table meta.
- [ ] 0.2 Follow `pagination-dtos` for `ConsultationQueryDto extends PaginationQueryDto`, `PaginatedResponseDto`, standard meta fields, and transaction-backed count/list queries.

## Phase 1: Backend Implementation

- [ ] 1.1 Create `apps/api/src/consultations/dto/consultation-query.dto.ts` extending `PaginationQueryDto` with decorated filter fields.
- [ ] 1.2 Create `apps/api/src/consultations/dto/consultation-response.dto.ts` with explicit patient, doctor, services, status, date, and `medicalRecordId` fields.
- [ ] 1.3 Create `apps/api/src/consultations/consultations.service.ts` with tenant-scoped `count + findMany` transaction and response mapping.
- [ ] 1.4 Create `apps/api/src/consultations/consultations.controller.ts` using `JwtAuthGuard`, `AclGuard`, `@RequirePermission('patients','read')`.
- [ ] 1.5 Create `apps/api/src/consultations/consultations.module.ts` and register it in `apps/api/src/app.module.ts`.

## Phase 2: Frontend Implementation

- [ ] 2.1 Create `apps/web/src/features/consultations/services/consultations.service.ts` with query params and response types.
- [ ] 2.2 Create `apps/web/src/features/consultations/hooks/use-consultations.ts` with query key including all filters.
- [ ] 2.3 Create `apps/web/src/features/consultations/components/consultation-toolbar.tsx` with search, status, date, doctor, and specialty filters.
- [ ] 2.4 Create `apps/web/src/features/consultations/components/consultation-columns.tsx` showing cédula, paciente, doctor, servicio, status, and report action.
- [ ] 2.5 Create `apps/web/src/app/(dashboard)/consultas/page.tsx` composing `DataTable`, toolbar, pagination, and `MedicalRecordsCreatePanel` modal.
- [ ] 2.6 Update `apps/web/src/config/navigation.config.ts` with a `Consultas` item using the chosen read permission.

## Phase 3: Verification

- [ ] 3.1 Run API typecheck/lint inside Docker via `make shell-api`.
- [ ] 3.2 Run web typecheck/lint inside Docker via `make shell-web`.
- [ ] 3.3 Manually verify `/consultas` pagination, search, filters, tenant-safe data, and report modal behavior.

## Out of Scope

- Automated unit, controller, integration, or e2e tests for this change.
