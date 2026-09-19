# Exploration: doctor-list-ssp

## Current State

### Backend
- `GET /doctors` currently returns `Promise<DoctorResponseDto[]>` — a raw array, not paginated.
- It only returns active doctors for the current tenant: `where: { tenantId, isActive: true }`.
- It includes `specialties` (with `specialty.name`) and active `bankAccounts`.
- Current searchable/useful fields on the entity:
  - `name`
  - `documentId`
  - `medicalLicenseNumber`
  - `verificationStatus`
  - `specialties[].specialtyName`
- Existing status concepts:
  - `isActive` (active/inactive)
  - `verificationStatus` (`PENDING`, `VERIFIED`, `REJECTED`, `NOT_FOUND`)

### Frontend
- The doctors list page is `apps/web/src/app/(dashboard)/admin/doctores/page.tsx`.
- It is a client page with a custom `<table>` and no pagination/search UI.
- Current row actions:
  - edit
  - verify / re-verify
  - deactivate
- Data access is via `useDoctorsAdmin()` → `getDoctorsAdmin()`.
- There is also a separate read-only doctors fetch in payments (`useDoctors()` / `getDoctors()`); that should stay untouched.

### Generic Pieces Already Available
- `apps/web/src/shared/components/ui/data-table.tsx` — manual pagination + meta callbacks.
- `apps/web/src/shared/components/ui/debounced-search-input.tsx` — search input with debounce.
- `apps/web/src/shared/components/ui/filter-select.tsx` — simple select filter.
- `apps/api/src/common/dto/pagination-query.dto.ts` — `page`, `limit`, `search`.
- `apps/api/src/common/dto/paginated-response.dto.ts` — `{ data, meta }` response shape.

## Affected Areas

- `apps/api/src/doctors/doctors.controller.ts` — change `GET /doctors` to accept pagination query DTO and return paginated response.
- `apps/api/src/doctors/doctors.service.ts` — implement count + page query + search across doctor fields / specialties.
- `apps/api/src/doctors/dto/*` — add a query DTO only if we decide to extend beyond `search`.
- `apps/web/src/features/doctors/services/doctors-admin.service.ts` — add paginated query support.
- `apps/web/src/features/doctors/hooks/use-doctors-admin.ts` — add paginated query hook.
- `apps/web/src/features/doctors/components/*` — create columns and toolbar for `DataTable`.
- `apps/web/src/app/(dashboard)/admin/doctores/page.tsx` — replace the raw table with `DataTable` composition.

## Approaches

1. **Mirror the patients SSP pattern** — add `page/limit/search`, return `PaginatedResponseDto<DoctorResponseDto>`, and render the list with `DataTable` + toolbar.
   - Pros: reuses existing generic pieces, consistent with patients/payments, lowest cognitive overhead.
   - Cons: search on specialties needs nested relation handling.
   - Effort: Medium.

2. **Add filters now (status / verification)** — extend the query DTO beyond `search` to support `isActive` and/or `verificationStatus`.
   - Pros: more control in admin list.
   - Cons: more DTO/API/UI surface, more branching than needed for a first SSP pass.
   - Effort: Medium-High.

## Recommendation

Use **Approach 1** for the first SSP slice.

Recommended search fields:
- `name`
- `documentId`
- `medicalLicenseNumber`
- `specialties.specialty.name`

Recommended filters for v1:
- none required beyond search; keep `isActive` and `verificationStatus` visible in columns + row actions.

Recommended row actions and meta callbacks:
- `onEdit(doctor)` — open edit modal
- `onVerify(doctor)` — trigger re-verification
- `onDeactivate(id)` — deactivate doctor
- Optional: `onServicePrices(doctor)` if the list should expose the service-prices view/action later

## Risks

- Nested specialty search will require relation-aware Prisma `OR` conditions.
- Current doctor page already combines CRUD + verification + deactivate; the actions column will be denser than patients.
- If we introduce filters like `verificationStatus`, the query DTO must extend `PaginationQueryDto` (not separate `@Query()` params) because validation is whitelist-based.
- The existing doctor admin page is not yet built on the generic `DataTable`, so the refactor is larger than patients.

## Ready for Proposal

Yes. The change is clear enough for proposal/spec work. Next step should define the exact doctor search fields and whether the initial SSP includes any filters beyond search.
