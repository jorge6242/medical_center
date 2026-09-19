# Design: Doctor List SSP

## Technical Approach

Reuse the existing generic SSP building blocks: `PaginationQueryDto`, `PaginatedResponseDto`, `DataTable`, and the shared TanStack table pattern. The change is doctor-specific only in the query search fields, column definitions, and action wiring. The current doctors endpoint returns an array; it will become paginated so the web list can consume `data + meta` without custom table logic.

## Architecture Decisions

| Decision | Options | Rationale |
|---|---|---|
| Query DTO | Reuse `PaginationQueryDto` | No extra doctor filters are required now; `page`, `limit`, and `search` cover the list. Add `DoctorQueryDto extends PaginationQueryDto` only if a future filter is introduced. |
| Search scope | `name`, `documentId`, `medicalLicenseNumber`, `specialties.some.specialty.name` | Matches the proposal and keeps search aligned with visible doctor data, including nested specialties. |
| List rendering | Generic `DataTable` + `DoctorColumns` | Avoids redoing table/pagination UX; doctors only need custom cells and actions. |
| Actions | `meta` callbacks (`onEdit`, `onVerify`, `onDeactivate`) | Keeps action logic out of column rendering and matches the existing generic table contract. |

## Data Flow

```text
page.tsx
  → useDoctorsAdmin(query)
  → doctors-admin.service.getDoctors(query)
  → GET /doctors?page&limit&search
  → DoctorsController.findAll(@Query() query: PaginationQueryDto)
  → DoctorsService.findAll(tenantId, query)
  → Prisma count + findMany in transaction
  → PaginatedResponseDto<DoctorResponseDto>
  → DataTable + DoctorColumns + meta actions
```

Prisma `where` shape:

```ts
{
  tenantId,
  isActive: true,
  ...(search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { documentId: { contains: search, mode: 'insensitive' } },
      { medicalLicenseNumber: { contains: search, mode: 'insensitive' } },
      { specialties: { some: { specialty: { name: { contains: search, mode: 'insensitive' } } } } },
    ],
  } : {})
}
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/doctors/dto/doctor-query.dto.ts` | Create | Optional DTO wrapper if we later need doctor-only filters; otherwise keep controller on `PaginationQueryDto`. |
| `apps/api/src/doctors/doctors.controller.ts` | Modify | Accept paginated query and return `PaginatedResponseDto<DoctorResponseDto>`. |
| `apps/api/src/doctors/doctors.service.ts` | Modify | Add transaction-backed count/findMany, build OR search across nested specialties, keep `isActive`/`verificationStatus` in response. |
| `apps/web/src/features/doctors/services/doctors-admin.service.ts` | Modify | Switch list call to paginated query/response and expose query params to the hook. |
| `apps/web/src/features/doctors/hooks/use-doctors-admin.ts` | Modify | Add paginated query state and invalidation keyed by `page`, `limit`, `search`. |
| `apps/web/src/features/doctors/components/doctor-toolbar.tsx` | Create | Search-only toolbar for doctors. |
| `apps/web/src/features/doctors/components/doctor-columns.tsx` | Create | TanStack columns for name, document, specialties, split, verification, active status, and actions via meta. |
| `apps/web/src/app/(dashboard)/admin/doctores/page.tsx` | Modify | Replace custom `<table>` with `DataTable`, wire toolbar, columns, pagination, and row actions. |
| `apps/web/src/features/doctors/components/verification-badge.tsx` | Keep | Reuse existing verification status display. |

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Prisma `where` builder and column action handlers | Jest service tests for search OR clauses and row-action callbacks. |
| Integration | `GET /doctors` pagination/search contract | Supertest verifies `data/meta`, defaults, and nested specialty search. |
| UI smoke | Toolbar, pagination, action wiring | Manual check in `/admin/doctores` because the web app has no test runner yet. |

## Migration / Rollout

No migration required. This is a read-path/UI refactor plus a controller/service contract update.

## Open Questions

- [ ] If a future doctor filter is needed (e.g. `verificationStatus`), should it live in `DoctorQueryDto` or a separate admin-only DTO?
