# Proposal: Consultations List SSP

## Intent

Add a dedicated consultations view so staff can review paid medical consultations and open the existing medical-record modal from the consultation row.

## Scope

### In Scope

- Tenant-safe paginated `GET /consultations` with `page`, `limit`, `search`, `status`, date range, doctor, and specialty filters.
- New frontend route `/consultas` using the existing SSP `DataTable` pattern.
- New `features/consultations` service, hook, toolbar, and columns.
- Sidebar navigation entry when permission allows direct access.
- Row action to open the existing medical-record creation modal for that consultation.

### Out of Scope

- Creating consultations outside the current payment/reception flow.
- Editing consultation data.
- Changing payment, receipt, or medical-record creation flows.
- Prisma schema changes unless design discovers a missing index.
- New consultation detail page.

## Capabilities

### Reused Capabilities

- `data-table-ssp`: generic DataTable, toolbar, manual pagination, loading/empty states, meta callbacks.
- `pagination-dtos`: `PaginationQueryDto`, `PaginatedResponseDto`, entity-specific query DTO extension.

### New Capabilities

- `consultations-list-ssp`: consultation-specific paginated list contract for `/consultations` and `/consultas`.

### Modified Capabilities

- None.

## Approach

Create a `ConsultationsModule` with controller/service/dtos. Search will cover patient name/document, doctor name/document, and service specialty snapshot. Filters will cover status, date range, doctor, and specialty. The frontend table will show cédula, paciente, doctor, servicio, and status, with a per-row “Registrar informe” action. Prefer row action over a detail page because the current user task is frequent and single-purpose.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/api/src/consultations/` | New | Module, controller, service, query/response DTOs |
| `apps/api/src/app.module.ts` | Modified | Register consultations module |
| `apps/web/src/features/consultations/` | New | Service, hook, columns, toolbar |
| `apps/web/src/app/(dashboard)/consultas/page.tsx` | New | Consultations list route |
| `apps/web/src/config/navigation.config.ts` | Modified | Add direct navigation item |
| `apps/web/src/features/medical-records/` | Reused | Existing creation panel/modal opened from row action |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Medical record action shown to wrong users | Medium | Gate button with the existing create permission used by medical records. |
| Search over multiple nested fields is slow | Medium | Use existing tenant/date/status indexes and add indexes only if design finds a concrete gap. |
| Tenant leakage through nested includes | Low | Use `where: { tenantId }` and explicit DTO mapping. |

## Rollback Plan

Remove the new module registration, `apps/api/src/consultations/`, frontend route/slice, and navigation item. No database rollback is expected if schema remains unchanged.

## Dependencies

- Existing `Consultation` and `ConsultationService` Prisma models.
- Existing generic `data-table-ssp` spec for manual pagination, toolbar composition, empty/loading states, and action callbacks through `table.options.meta`.
- Existing generic `pagination-dtos` spec for `PaginationQueryDto`, extended entity query DTOs, `PaginatedResponseDto`, metadata fields, and `count + findMany` transaction behavior.

## Success Criteria

- [ ] `/consultas` renders a paginated consultations table.
- [ ] `GET /consultations` is tenant-safe and returns `PaginatedResponseDto`.
- [ ] Search covers patient name/document, doctor name/document, and specialty.
- [ ] Filters cover status, date range, doctor, and specialty.
- [ ] Columns show cédula, paciente, doctor, servicio, and status.
- [ ] Row action opens the existing medical-record creation modal.
- [ ] Existing reception, payment, and medical-record flows remain unchanged.
