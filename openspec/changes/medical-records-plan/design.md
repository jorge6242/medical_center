# Design: Medical Records First Slice

## Architecture

- Nuevo módulo NestJS en `apps/api/src/medical-records/`.
- `patients` y `payments` se mantienen casi intactos.
- La UI usa una página thin en `/pacientes/[id]` y feature components dedicados.

## Data model

- `Patient.clinicalHistory`: `Json? @db.JsonB`.
- `MedicalRecord`: nueva tabla con `tenantId`, `patientId`, `consultationId`, `createdById`, `recordedAt`, `clinicalData`.
- Unicidad por `(tenantId, consultationId)` para evitar duplicados.

## API contract

- `POST /medical-records`
- `GET /medical-records/:id`
- `GET /patients/:patientId/medical-records`

## Web integration

- `apps/web/src/features/medical-records/` para service, hooks y componentes.
- `apps/web/src/app/(dashboard)/pacientes/[id]/page.tsx` como punto de entrada.

## Risks / mitigations

- JSON contract drift -> shared interfaces + validation helpers.
- Duplicates -> unique constraint + conflict handling.
- Cross-tenant access -> tenant filters en cada query.

## Rollout / rollback

- Migración additive.
- Sin backfill.
- Rollback por retiro de consumo y reversión de migración si hace falta.

## Deferred work

- PDFs.
- BullMQ.
- Timeline completo.
- Auto-creación desde payment flow.
