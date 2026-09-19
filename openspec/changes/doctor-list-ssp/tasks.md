# Tasks: doctor-list-ssp

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~240-360 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | API pagination/search contract | PR 1 | Includes DTOs, query logic, and integration tests |
| 2 | Web DataTable refactor | PR 1 | Includes toolbar, columns, pagination state, manual QA |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 Update `apps/api/src/doctors/dto/` to reuse `PaginationQueryDto` and `PaginatedResponseDto<DoctorResponseDto>` for `GET /doctors`.
- [x] 1.2 Confirm `DoctorResponseDto` exposes `isActive`, `verificationStatus`, and existing fields needed by `/admin/doctores`.

## Phase 2: Core Implementation

- [x] 2.1 Refactor `apps/api/src/doctors/doctors.service.ts` to apply paginated `findMany/count` logic with `search` across `name`, `documentId`, `medicalLicenseNumber`, and nested `specialties.specialty.name`.
- [x] 2.2 Update `apps/api/src/doctors/doctors.controller.ts` so `GET /doctors` accepts the shared pagination query and returns `{ data, meta }`.
- [x] 2.3 Create/adjust `apps/web/src/features/doctors/components/doctor-columns.tsx` to read action handlers from `table.options.meta` for edit, verify/re-verify, and deactivate.
- [x] 2.4 Refactor `apps/web/src/app/(dashboard)/admin/doctores/page.tsx` to use `DataTable`, a doctor toolbar search input, and local pagination state.

## Phase 3: Testing / Verification

- [ ] 3.1 Add backend integration tests for spec scenarios: default paginated request, nested specialty search, and search by document/license.
- [ ] 3.2 Add page-level/manual verification notes for toolbar search driving `GET /doctors` and row actions still rendering in the table.
- [ ] 3.3 Verify paginated response shape keeps existing doctor field names stable for backward compatibility.

## Phase 4: Cleanup / Validation

- [x] 4.1 Run Docker-based `pnpm run typecheck` in `apps/api` and `apps/web` after the refactor.
- [x] 4.2 Run Docker-based `pnpm run lint` and confirm `/admin/doctores` works in-browser with pagination, search, and row actions.
