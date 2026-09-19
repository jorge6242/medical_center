# Spec: Medical Records First Slice

## Change intent

Agregar un primer slice de informes médicos con dos capas de información:
- antecedentes longitudinales del paciente en `Patient.clinicalHistory`
- snapshots episódicos por consulta en `MedicalRecord`

## Requirements

1. El sistema **MUST** persistir `Patient.clinicalHistory` como JSONB opcional.
2. El sistema **MUST** crear un `MedicalRecord` por consulta, paciente, doctor y tenant.
3. Una consulta **MUST NOT** tener más de un medical record.
4. `recordData` **MUST** validarse con contratos tipados estrictos.
5. La API **MUST** soportar create, read y list por paciente.
6. La UI **SHOULD** exponer el historial en la vista de detalle del paciente.

## Scenarios

### Scenario: Save patient clinical history
- GIVEN an existing patient
- WHEN the user saves longitudinal antecedents
- THEN `Patient.clinicalHistory` is stored as JSONB

### Scenario: Create a medical record from a consultation
- GIVEN an existing consultation with no medical record
- WHEN the user creates a record
- THEN the system creates one `MedicalRecord`

### Scenario: Prevent duplicates
- GIVEN a consultation that already has a medical record
- WHEN the user tries to create another one
- THEN the system MUST return a conflict response

### Scenario: List records in patient detail
- GIVEN a patient with records
- WHEN the patient detail page loads
- THEN the episodic list is shown newest first

## Out of scope

- PDFs
- BullMQ
- Full timeline UI
- Edit/delete workflows
- Moving consultation creation out of payments

## Acceptance criteria

- El cambio es additive y rollback-safe.
- No se rompe `/inicio`.
- No se usan `any` en los contratos JSONB.
- Los records duplicados por consulta no son posibles.

## Affected areas

- `apps/api/prisma/schema.prisma`
- `apps/api/src/medical-records/*`
- `packages/shared/src/*`
- `apps/web/src/app/(dashboard)/pacientes/[id]/*`
- `apps/web/src/features/medical-records/*`
