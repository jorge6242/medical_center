# Design: doctor-service-pricing

## Technical Approach

We will replace the global `ServicePrice` model with a tenant-scoped `DoctorService` model, linking specific services and prices directly to doctors. We will update the `doctors` API module to manage these services alongside doctor profiles via transactions. The `consultations` and `payments` workflows will be updated to fetch prices from `DoctorService` instead of `ServicePrice`. Frontend forms for doctors, specialties, and consultations will be updated to handle this new structure.

## Architecture Decisions

### Decision: Drop `ServicePrice` entirely

**Choice**: Completely remove `ServicePrice` and replace it with `DoctorService`.
**Alternatives considered**: Keep `ServicePrice` as a fallback for when a doctor doesn't have a specific price.
**Rationale**: The proposal explicitly requests replacing global specialty-based pricing to give doctors full flexibility. Dropping it simplifies the pricing logic and guarantees every doctor controls their own rates.

### Decision: Keep `Service` as a global catalog

**Choice**: The `Service` model remains a global dictionary of service names (no `tenantId`), while `DoctorService` defines the tenant-specific pricing and availability for a doctor.
**Alternatives considered**: Add `tenantId` to `Service`.
**Rationale**: Keeping `Service` as a simple unique name catalog (`id`, `name`, `isActive`) avoids duplicating standard medical service names across tenants. The tenant-specific business rules (pricing, associations) live cleanly in `DoctorService`.

## Data Flow

    [Admin UI] ──(POST /doctors)──→ [Doctors Controller]
                                          │
                                          ▼
    [Service Catalog] ←─(upsert name)─ [Doctors Service]
                                          │ (Transaction)
                                          ▼
                                   [DoctorService DB]
                                          │
    [Reception UI] ──(GET /doctors/:id)───┘
          │
      (Select service)
          │
    [Payment UI] ──(POST /payments)──→ [Payments Service]
                                          │
                                   (Fetch priceUsd)
                                          ▼
                                 [ConsultationService DB]

## File Changes

| File                                                         | Action | Description                                                                                       |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------- |
| `apps/api/prisma/schema.prisma`                              | Modify | Remove `ServicePrice`, add `DoctorService` (tenant-scoped).                                       |
| `apps/api/src/doctors/dto/create-doctor.dto.ts`              | Modify | Add `services: DoctorServiceDto[]` array.                                                         |
| `apps/api/src/doctors/dto/doctor-response.dto.ts`            | Modify | Add `services: DoctorServiceResponseDto[]`.                                                       |
| `apps/api/src/doctors/doctors.service.ts`                    | Modify | Upsert global services and create/update `DoctorService` records inside doctor CRUD transactions. |
| `apps/api/src/specialties/dto/*.dto.ts`                      | Modify | Remove `services` from `CreateSpecialtyDto`, `UpdateSpecialtyDto`, and `SpecialtyResponseDto`.    |
| `apps/api/src/specialties/specialties.service.ts`            | Modify | Remove `ServicePrice` upsert logic.                                                               |
| `apps/api/src/payments/dto/create-payment.dto.ts`            | Modify | Replace `servicePriceIds` with `doctorServiceIds` in `PaymentItemDto`.                            |
| `apps/api/src/payments/payments.service.ts`                  | Modify | Fetch pricing from `DoctorService` instead of `ServicePrice`.                                     |
| `apps/web/src/app/(dashboard)/admin/doctores/page.tsx`       | Modify | Add dynamic list of services/prices to the doctor form.                                           |
| `apps/web/src/app/(dashboard)/admin/especialidades/page.tsx` | Modify | Remove service price management from the specialty form.                                          |
| `apps/web/src/app/(dashboard)/consultas/page.tsx`            | Modify | Filter services by selected doctor and fetch corresponding price.                                 |

## Interfaces / Contracts

```typescript
export class DoctorServiceDto {
  @IsUUID('4')
  specialtyId: string;

  @IsString()
  @Length(2, 100)
  serviceName: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  priceUsd: number;
}
```

## Testing Strategy

| Layer | What to Test          | Approach                                                                                                           |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Unit  | `doctors.service.ts`  | Mock Prisma to ensure `DoctorService` records are created correctly during doctor creation/updates.                |
| Unit  | `payments.service.ts` | Ensure consultation price is correctly fetched from `DoctorService` and falls back gracefully or fails if missing. |
| E2E   | Doctor API            | `POST /doctors` with services, verify `DoctorService` rows.                                                        |
| E2E   | Payment API           | `POST /payments` for a consultation using a doctor's specific service ID.                                          |

## Migration / Rollout

No migration required. The proposal states it is out of scope to migrate existing global prices to all doctors.

## Open Questions

- None
