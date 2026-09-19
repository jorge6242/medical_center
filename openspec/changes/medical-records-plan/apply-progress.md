# Apply Progress: Medical Records First Slice

**Change**: medical-records-plan
**Mode**: Standard
**Date**: 2026-05-16

## Completed Tasks

### Phase 1: Data model
- [x] 1.1 Add `Patient.clinicalHistory` as nullable JSONB in `apps/api/prisma/schema.prisma`.
- [x] 1.2 Add `MedicalRecord` model with relations and unique `(tenantId, consultationId)` constraint.
- [x] 1.3 Generate the additive Prisma migration.

### Phase 2: Shared contracts
- [x] 2.1 Add typed interfaces for clinical history and record payloads in `packages/shared/src/`.
- [x] 2.2 Add JSON validation helpers/schema for the medical record payload.

### Phase 3: Backend API
- [x] 3.1 Create `apps/api/src/medical-records/` module.
- [x] 3.2 Implement service logic for create/read/list with tenant and duplicate checks.
- [x] 3.3 Add DTOs and response mappers.
- [x] 3.4 Register the module in `AppModule`.

### Phase 4: Web integration
- [x] 4.1 Create `apps/web/src/features/medical-records/` service/hooks/components.
- [x] 4.2 Add `apps/web/src/app/(dashboard)/pacientes/[id]/page.tsx` thin entry point.
- [x] 4.3 Add consultation list endpoint and infer `templateType` from consultation services.
- [x] 4.4 Add medical record detail route and panel.

### Phase 5: Read-only UX and export
- [x] 5.1 Render medical records as a read-only clinical document in the detail view.
- [x] 5.2 Add browser print support for the detail view.
- [x] 5.3 Add frontend PDF export for medical-record download.
- [x] 5.4 Add PDF download action in the medical record detail UI.
- [ ] 5.5 Polish the PDF output to match the visual treatment of the doctor receipt.

## Remaining Tasks
- [ ] 6.1 Run typecheck/lint verification in the affected workspaces.
- [ ] 6.3 Improve the medical-record PDF styling so it is not a plain debug-style export.

## Remaining Tasks
- [ ] 5.2 Add typecheck/lint verification in the affected workspaces.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/api/prisma/schema.prisma` | Modified | Added `Patient.clinicalHistory`, `MedicalRecordStatus`, `MedicalRecord`, and inverse relations on `Tenant`, `Doctor`, `User`, `Consultation` |
| `apps/api/prisma/migrations/20260514500000_add_tenant_id_to_payments_and_lab_orders/migration.sql` | Added | Backfill migration to fix shadow-db tenantId/index ordering for existing report migration |
| `apps/api/prisma/migrations/20260516000000_add_medical_records/migration.sql` | Added | Additive migration for medical records slice |
| `apps/api/src/medical-records/*` | Added | New module, DTOs, controllers, service, and mappers |
| `apps/api/src/patients/*` | Modified | Added `clinicalHistory` to patient DTOs/service/response |
| `apps/api/src/patients/*` | Modified | Added `clinicalHistory` to create/update DTOs and service validation |
| `apps/api/src/patients/*` | Modified | Added mapper to normalize `clinicalHistory` for DTO responses |
| `packages/shared/src/medical-records.ts` | Added | Shared clinical history and medical record contracts |
| `packages/shared/src/medical-records.ts` | Modified | Added runtime validation helpers for JSONB payloads |
| `packages/shared/src/index.ts` | Modified | Exported new shared contracts |
| `apps/web/src/features/medical-records/*` | Added | Read-only service, hook, and panel |
| `apps/web/src/app/(dashboard)/pacientes/[id]/page.tsx` | Added | Thin patient detail entry point |
| `apps/web/src/features/patients/components/patient-columns.tsx` | Modified | Added link to patient detail |
| `apps/web/src/features/patients/services/patients.service.ts` | Modified | Added `clinicalHistory` to patient response type |
| `apps/api/src/medical-records/medical-records.service.spec.ts` | Added | Backend service tests for create/read/list and duplicate prevention |
| `apps/api/src/patients/patients.service.spec.ts` | Added | Patient service tests for `clinicalHistory` persistence |
| `apps/web/src/features/medical-records/components/medical-record-detail-panel.tsx` | Modified | Rendered the record read-only, added print, and switched PDF export to job-driven download |
| `apps/web/src/features/medical-records/components/medical-record-pdf.tsx` | Modified | Frontend PDF renderer using template resolver with snapshot fallback |
| `apps/web/src/features/medical-records/sections/*.section.ts` | Added | Reusable section building blocks (anamnesis, gyn-exam, obstetric-eco, resolution) |
| `apps/web/src/features/medical-records/templates/*.template.ts` | Added | Specialty-specific template assemblies (gynecology, obstetrics, gyn-obstetrics) |
| `apps/web/src/features/medical-records/templates/template-registry.ts` | Added | Centralized type-safe template registry |
| `apps/web/src/features/medical-records/templates/template-resolver.ts` | Added | Resolves template with snapshot priority over current registry |
| `apps/api/src/medical-records/dto/consultation-template-response.dto.ts` | Added | Response DTO for consultation template type inference |
| `apps/api/src/medical-records/medical-records.controller.ts` | Modified | Added `GET /medical-records/template-type` endpoint |
| `apps/api/src/medical-records/medical-records.service.ts` | Modified | Added `inferTemplateType` method; stores `templateVersion` and `templateSnapshot` |
| `apps/api/prisma/migrations/20260519000000_add_template_version_and_specialty_template_type/migration.sql` | Added | Migration for `templateVersion`, `templateSnapshot` (MedicalRecord) and `templateType` (Specialty) |

## Architecture Changes

### Template Registry Pattern (openEHR Simplified)
Implemented a composable template system inspired by openEHR archetypes:
- **Sections**: Reusable building blocks (`anamnesis`, `gyn-exam`, `obstetric-eco`, `resolution`)
- **Templates**: Specialty-specific assemblies of sections
- **Registry**: Centralized type-safe map of all templates
- **Resolver**: Falls back to snapshot if available, otherwise uses current registry

### Template Snapshot Immutability
Every medical record now stores:
- `templateVersion`: Semver of the template used (e.g., "1.0.0")
- `templateSnapshot`: Complete schema snapshot at creation time (JSONB)
This guarantees that historical records render correctly even if templates evolve.

### Backend-Driven Template Inference
- Added `Specialty.templateType` to the database schema
- Created `GET /medical-records/template-type?consultationId=xxx` endpoint
- Frontend no longer infers template type via string matching on service names
- Fallback to specialty name matching for backwards compatibility

## Deviations from Design
- `clinicalData` was used instead of the plan's `recordData` naming.
- `status` enum was kept without `voidedBy` / `voidReason` fields.
- The first slice includes read-only patient detail UI, not the schema-driven editor.
- The export flow was simplified to frontend-generated PDF to match the receipt strategy and avoid worker instability.
- The current medical-record PDF output is functional but visually too simple compared with the styled doctor receipt PDF.

## Issues Found
- `make db-migrate` previously failed because older migrations referenced `tenantId` indexes before those columns existed in the shadow DB history.
- Added a backfill migration to restore shadow-db consistency.
- The worker export flow required keeping the job row visible immediately to avoid 404s during polling.
- The PDF export still needs a visual pass to match the polished layout standard used by payment receipts.
