# Tasks: Doctor Service Pricing

## Review Workload Forecast

| Field                   | Value                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Estimated changed lines | ~600-800 lines                                                                                  |
| 400-line budget risk    | High                                                                                            |
| Chained PRs recommended | Yes                                                                                             |
| Suggested split         | PR 1 (Schema & Specialties API) → PR 2 (Doctors API) → PR 3 (Payments API) → PR 4 (Frontend UI) |
| Delivery strategy       | single-pr with size:exception                                                                   |
| Chain strategy          | size:exception                                                                                  |

Decision needed before apply: No — maintainer authorized size:exception
Chained PRs recommended: Yes
Chain strategy: size:exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                         | Likely PR | Notes                              |
| ---- | -------------------------------------------- | --------- | ---------------------------------- |
| 1    | Schema update & remove old Specialty pricing | PR 1      | DB Migration and Specialty cleanup |
| 2    | Doctors API integration for DoctorService    | PR 2      | DTO updates, transaction handling  |
| 3    | Payments API integration for DoctorService   | PR 3      | Pricing fetch logic update         |
| 4    | Frontend UI updates                          | PR 4      | Admin & Reception forms refactor   |

## Phase 1: Foundation & Data Model

- [x] 1.1 `apps/api/prisma/schema.prisma`: Remove `ServicePrice` model and add `DoctorService` (tenantId, doctorId, specialtyId, serviceId, priceUsd).
- [x] 1.2 `apps/api`: Generate new prisma migration.

## Phase 2: Backend Core (Specialties & Doctors)

- [x] 2.1 `apps/api/src/specialties/dto/*.dto.ts`: Remove `services` from `CreateSpecialtyDto`, `UpdateSpecialtyDto`, and `SpecialtyResponseDto`.
- [x] 2.2 `apps/api/src/specialties/specialties.service.ts`: Remove `ServicePrice` upsert logic.
- [x] 2.3 `apps/api/src/doctors/dto/create-doctor.dto.ts` & `update-doctor.dto.ts`: Add `services: DoctorServiceDto[]` array.
- [x] 2.4 `apps/api/src/doctors/dto/doctor-response.dto.ts`: Add `services: DoctorServiceResponseDto[]`.
- [x] 2.5 `apps/api/src/doctors/doctors.service.ts`: Update CRUD to upsert global services and handle `DoctorService` records inside transactions.

## Phase 3: Backend Core (Payments)

- [x] 3.1 `apps/api/src/payments/dto/create-payment.dto.ts`: Replace `servicePriceIds` with `doctorServiceIds` inside `PaymentItemDto`.
- [x] 3.2 `apps/api/src/payments/payments.service.ts`: Modify to fetch pricing from `DoctorService` instead of `ServicePrice`.

## Phase 4: Frontend UI (Admin & Forms)

- [x] 4.1 `apps/web/src/app/(dashboard)/admin/especialidades/page.tsx`: Remove service price management from the specialty form.
- [x] 4.2 `apps/web/src/app/(dashboard)/admin/doctores/page.tsx`: Add dynamic list of services/prices to the doctor form using `react-hook-form`.
- [x] 4.3 `apps/web/src/features/payments/components/consultation-payment-form.tsx`: Filter services by selected doctor and fetch corresponding price from `DoctorService`.

## Phase 5: Testing

- [x] 5.1 `apps/api/src/doctors/doctors.service.spec.ts`: Add test mocking Prisma to ensure assigned `DoctorService` records are returned correctly.
- [x] 5.2 `apps/api/src/payments/payments.service.spec.ts`: Add test ensuring consultation item identifiers use `doctorServiceIds`.
