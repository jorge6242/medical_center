# Exploration: Consultations List SSP

## Current State

There is no standalone consultations list view. The frontend has no `/consultas` route and no `features/consultations` or `features/consultas` slice. Consultations are created indirectly through the payments flow in reception, and patient-specific consultations are exposed only through `GET /patients/:id/consultations` for medical-record creation.

The database already has `Consultation` and `ConsultationService` models with tenant indexes, status, date, patient, doctor, payment, service snapshots, and medical-record relation. The API has no active `ConsultationsModule`, controller, or service registered in `AppModule`.

## Affected Areas

- `apps/api/src/consultations/` — new module/controller/service/dtos for tenant-safe listing.
- `apps/api/src/app.module.ts` — register `ConsultationsModule`.
- `apps/api/prisma/schema.prisma` — likely no schema changes needed; existing indexes cover tenant/date/status/patient/doctor.
- `apps/web/src/app/(dashboard)/consultas/page.tsx` — new dashboard route.
- `apps/web/src/features/consultations/` — new service, hook, toolbar, columns.
- `apps/web/src/config/navigation.config.ts` — add sidebar entry if users should navigate directly.

## Approaches

1. **Standalone SSP list** — Add `GET /consultations` and a `/consultas` DataTable page.
   - Pros: Matches existing SSP patterns, clear operational view, minimal schema impact.
   - Cons: New backend module and frontend slice.
   - Effort: Medium.

2. **Reuse payments list only** — Treat paid consultation payments as the consultation view.
   - Pros: Less backend work.
   - Cons: Hides pending/voided consultation state, couples clinical view to payment rows, poor UX for medical-record follow-up.
   - Effort: Low.

## Recommendation

Use a standalone SSP list. Implement `GET /consultations` with `PaginationQueryDto` extension for filters, include patient/doctor/services/medicalRecord/payment summary fields, and render `/consultas` using the existing `DataTable` pattern.

## Risks

- Search/filter requirements are not yet explicit; existing specs require asking the user before implementation.
- Permissions need a pragmatic decision: reuse `payments:read` or introduce `consultations:read` with seed/role updates.
- Query includes nested patient/doctor/services/medicalRecord data, so response DTO should stay explicit and avoid exposing Prisma models.

## Ready for Proposal

Yes. Proceed with an OpenSpec proposal for `consultations-list-ssp`, then ask the required table/search/filter questions before specs.
