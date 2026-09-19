# Proposal: Medical Records First Slice

## Intent

Agregar el primer slice de informes médicos con un modelo mínimo, additive y rollback-safe:
- `Patient.clinicalHistory` para antecedentes longitudinales.
- `MedicalRecord` para snapshots episódicos por consulta.

## Scope

### In Scope
- Modelo Prisma para `MedicalRecord`.
- `Patient.clinicalHistory` como JSONB opcional.
- API mínima para crear, leer y listar records.
- Entrada thin en la vista de detalle del paciente.
- Contratos tipados compartidos para JSONB.

### Out of Scope
- PDFs de medical records.
- BullMQ y jobs de exportación.
- Timeline completo por especialidad.
- Mover la creación de consultas fuera de `payments.service.ts`.

## Affected Areas

- `apps/api/prisma/schema.prisma`
- `apps/api/src/medical-records/`
- `apps/api/src/patients/`
- `packages/shared/src/`
- `apps/web/src/app/(dashboard)/pacientes/[id]/`
- `apps/web/src/features/medical-records/`

## Risks

- Confundir datos longitudinales con snapshots episódicos.
- Introducir `any` en los contratos JSONB.
- Acoplar esta primera fase a PDFs o workflows de exportación.

## Rollback Plan

1. Remover el consumo de la nueva UI/API.
2. Revertir la migración additive si hiciera falta.
3. El resto del dominio queda intacto.
