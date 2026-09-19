# Proposal: Doctor List SSP

## Intent

Add server-side pagination and search to the doctor admin list so `/doctors` scales beyond the current full-array response and matches the established SSP pattern used elsewhere in the app.

## Scope

### In Scope
- Paginated `GET /doctors` response with search support.
- Search across `name`, `documentId`, `medicalLicenseNumber`, and `specialties.specialty.name`.
- Update the admin doctors page to use the shared DataTable pagination/search pattern.
- Preserve DataTable meta callbacks for edit, verify/re-verify, and deactivate.

### Out of Scope
- New doctor filters beyond search and active/verification columns.
- Changes to doctor business rules, CRUD semantics, or permissions.
- Refactors to non-admin doctor consumers unless required for compatibility.

## Capabilities

### Reused Capabilities
- `data-table-ssp`: shared table pagination/search UX and meta-driven actions.
- `pagination-dtos`: shared request/response DTO contract for paginated endpoints.

### New Capabilities
- `doctor-list-ssp`: doctor-specific server-side listing behavior, including nested specialty search and backward-compatible pagination wiring.

## Approach

Mirror the patients SSP pattern: add query DTO support in the API, return paginated metadata from `GET /doctors`, and wire the admin page to the shared DataTable/search controls. Doctors are slightly more complex because search must traverse nested specialty relations, so the API query needs the extra join/filter logic while keeping existing action callbacks intact.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/doctors/` | Modified | Add paginated search handling and DTO mapping. |
| `apps/api/src/doctors/dto/` | Modified | Introduce/adjust pagination query and response DTOs. |
| `apps/api/src/doctors/doctors.controller.ts` | Modified | Accept pagination/search query params. |
| `apps/api/src/doctors/doctors.service.ts` | Modified | Implement filtered paginated query. |
| `apps/web/src/app/(dashboard)/admin/doctores/page.tsx` | Modified | Swap to SSP table/search flow. |
| `apps/web/src/features/*` | Modified | Reuse shared DataTable/search components if needed. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Nested specialty search is slower than simple fields | Med | Use targeted Prisma filtering and indexed joins where available. |
| Existing consumers expect array responses | Low | Keep compatibility in mind; update only admin flow unless shared usage is confirmed. |
| Actions regress in the new table wrapper | Med | Preserve current meta callbacks and verify them in the page integration. |

## Rollback Plan

Revert the doctor API pagination/search changes and restore the admin page to the current table implementation. The change is isolated to doctor listing, so rollback should not affect other SSP capabilities.

## Success Criteria

- [ ] `GET /doctors` supports pagination and search with the required fields.
- [ ] Admin doctors page shows paged results with working search and existing actions.
- [ ] Existing non-admin behavior remains functional or intentionally untouched.
