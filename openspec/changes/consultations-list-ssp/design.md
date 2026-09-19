# Design: Consultations List SSP

## Technical Approach

Add a dedicated consultations read model without changing how consultations are created. Backend exposes `GET /consultations` through a new NestJS module. Frontend adds `/consultas` with the existing SSP `DataTable` pattern and reuses `MedicalRecordsCreatePanel` in a modal seeded with the selected consultation.

## Generic Specs Applied

| Generic spec | How this change uses it |
|---|---|
| `data-table-ssp` | `/consultas` composes the shared `DataTable`, toolbar, manual pagination state, loading/empty states, and row action callback through table meta. |
| `pagination-dtos` | `ConsultationQueryDto` extends `PaginationQueryDto`; `GET /consultations` returns `PaginatedResponseDto<ConsultationResponseDto>` with standard metadata and transaction-backed count/list queries. |

## Architecture Decisions

### Decision: Dedicated consultations module

**Choice**: Create `ConsultationsModule`, `ConsultationsController`, `ConsultationsService`, and DTOs under `apps/api/src/consultations/`.
**Alternatives considered**: Put listing into `PatientsService` or `PaymentsService`.
**Rationale**: The list is consultation-centered and must include records not naturally owned by a single patient page or payment page.

### Decision: Reuse existing permissions initially

**Choice**: Protect list with `patients:read`; show report action only where the existing medical-record create path is valid (`patients:create`).
**Alternatives considered**: Add `consultations:read/create` ACL resources.
**Rationale**: Avoid seed/role churn for a read-only view and stay aligned with current medical-record controller permissions.

### Decision: Row action over detail page

**Choice**: Open the existing medical-record modal directly from the row.
**Alternatives considered**: Build a consultation detail page first.
**Rationale**: The current workflow is static review plus one frequent action; a detail page adds navigation cost without new content.

## Data Flow

```text
/consultas page -> usePaginatedConsultations -> consultations.service.ts
      -> GET /consultations -> ConsultationsController -> ConsultationsService
      -> Prisma Consultation tenant-scoped query -> PaginatedResponseDto

Row Informe action -> Modal -> MedicalRecordsCreatePanel(patientId, consultationId)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/consultations/consultations.module.ts` | Create | Register controller/service |
| `apps/api/src/consultations/consultations.controller.ts` | Create | `GET /consultations` endpoint |
| `apps/api/src/consultations/consultations.service.ts` | Create | Tenant-safe Prisma query and DTO mapping |
| `apps/api/src/consultations/dto/consultation-query.dto.ts` | Create | Extends `PaginationQueryDto` with status/date/doctor/specialty filters |
| `apps/api/src/consultations/dto/consultation-response.dto.ts` | Create | Explicit list row response |
| `apps/api/src/app.module.ts` | Modify | Import `ConsultationsModule` |
| `apps/web/src/features/consultations/services/consultations.service.ts` | Create | API client and TS types |
| `apps/web/src/features/consultations/hooks/use-consultations.ts` | Create | TanStack query hook |
| `apps/web/src/features/consultations/components/consultation-columns.tsx` | Create | Table columns and report action |
| `apps/web/src/features/consultations/components/consultation-toolbar.tsx` | Create | Search and filters |
| `apps/web/src/app/(dashboard)/consultas/page.tsx` | Create | Page state, table, modal composition |
| `apps/web/src/config/navigation.config.ts` | Modify | Add Consultas nav item |

## Interfaces / Contracts

```typescript
class ConsultationQueryDto extends PaginationQueryDto {
  status?: ConsultationStatus;
  fromDate?: string;
  toDate?: string;
  doctorId?: string;
  specialtyId?: string;
}

interface ConsultationResponseDto {
  id: string;
  date: string;
  status: 'PENDING' | 'PAID' | 'VOIDED';
  patient: { id: string; name: string; documentType: string; documentId: string };
  doctor: { id: string; name: string; documentType: string; documentId: string };
  services: Array<{ serviceName: string; specialtyId: string; specialtyName: string }>;
  medicalRecordId: string | null;
}
```

## Verification Strategy

| Layer | What to Verify | Approach |
|---|---|---|
| Backend | `GET /consultations` compiles and follows tenant-safe pagination/filter contract | Docker API typecheck/lint |
| Frontend | `/consultas` compiles with shared `DataTable`, filters, and modal composition | Docker web typecheck/lint |
| Manual | Pagination, search, filters, tenant-safe data, and report modal behavior | Browser/manual smoke verification |

Automated tests are intentionally out of scope for this implementation plan per current project direction.

## Migration / Rollout

No migration required. Existing `Consultation` indexes cover tenant, patient, doctor, status, and date. Specialty filtering will use `services.some.specialtyId`; add an index only if performance testing proves it necessary.

## Open Questions

- [ ] Should the table include date despite the requested columns? Recommended: yes, because date filtering needs visible context.
