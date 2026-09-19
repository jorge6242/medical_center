# Tasks: Medical Records First Slice

## Phase 1: Data model

- [x] 1.1 Add `Patient.clinicalHistory` as nullable JSONB in `apps/api/prisma/schema.prisma`.
- [x] 1.2 Add `MedicalRecord` model with relations and unique `(tenantId, consultationId)` constraint.
- [x] 1.3 Generate the additive Prisma migration.

## Phase 2: Shared contracts

- [x] 2.1 Add typed interfaces for clinical history and record payloads in `packages/shared/src/`.
- [x] 2.2 Add JSON validation helpers/schema for the medical record payload.

## Phase 3: Backend API

- [x] 3.1 Create `apps/api/src/medical-records/` module.
- [x] 3.2 Implement service logic for create/read/list with tenant and duplicate checks.
- [x] 3.3 Add DTOs and response mappers.
- [x] 3.4 Register the module in `AppModule`.

## Phase 4: Web integration

- [x] 4.1 Create `apps/web/src/features/medical-records/` service/hooks/components.
- [x] 4.2 Add `apps/web/src/app/(dashboard)/pacientes/[id]/page.tsx` thin entry point.

## Phase 5: Template Registry & Snapshot Architecture

- [x] 5.1 Extract reusable sections from monolithic schemas (`sections/` folder).
- [x] 5.2 Create composable templates (`templates/` folder) with version tracking.
- [x] 5.3 Implement centralized template registry with type-safe lookups.
- [x] 5.4 Add `templateVersion` and `templateSnapshot` to `MedicalRecord` model.
- [x] 5.5 Implement template resolver with snapshot priority over current registry.
- [x] 5.6 Move template inference from frontend string-matching to backend (`Specialty.templateType`).
- [x] 5.7 Create `GET /medical-records/template-type` endpoint for backend-driven inference.

## Phase 6: Read-only UX and export

- [x] 6.1 Render medical records as a read-only clinical document in the detail view.
- [x] 6.2 Add browser print support for the detail view.
- [x] 6.3 Add frontend PDF export for medical-record download.
- [x] 6.4 Add PDF download action in the medical record detail UI.
- [ ] 6.5 Refine the medical-record PDF visual design to match the receipt export style.

## Phase 7: Verification

- [x] 7.1 Add backend tests for create/read/list and duplicate prevention.
- [ ] 7.2 Run typecheck/lint verification in the affected workspaces.
- [ ] 7.3 Confirm the medical-record PDF no longer looks like a plain technical dump.
