# Proposal: Doctor Service Pricing

## Intent

Currently, service prices are tied to `Specialty` via `ServicePrice`. However, doctors need the flexibility to set their own prices for services within their specialties. We need to replace the global `ServicePrice` model with a per-doctor `DoctorService` model (doctorId, specialtyId, serviceId, priceUsd).

## Scope

### In Scope

- Remove `ServicePrice` from `schema.prisma`.
- Add `DoctorService` (doctorId, specialtyId, serviceId, priceUsd) to `schema.prisma`.
- Update backend API (`CreateDoctorDto`, `UpdateDoctorDto`) to manage a doctor's services and their custom prices.
- Update consultation creation backend logic to fetch the price from `DoctorService` instead of `ServicePrice`.
- Update frontend Admin > Doctors page to allow adding/editing services and their specific prices per doctor.
- Update frontend Reception > Create Consultation to filter available services based on the selected doctor and retrieve the specific doctor's price.

### Out of Scope

- Migrating existing global prices to all doctors automatically (this can be done via a one-off script if needed, but the core focus is replacing the data model and UI).

## Capabilities

### New Capabilities

- `doctor-service-pricing`: Allows assigning services and specific prices directly to individual doctors, overriding or replacing global specialty-based pricing.

### Modified Capabilities

- None

## Approach

1. **Database Schema**: Modify `schema.prisma` to drop `ServicePrice` and create `DoctorService`. Add a unique constraint on `[doctorId, specialtyId, serviceId]` and a `tenantId` field to respect tenant boundaries.
2. **Backend**:
   - Update `doctors` module to handle CRUD for `DoctorService` alongside doctor profiles. Use transactions for multi-write operations.
   - Update `consultations` module to query `DoctorService` instead of `ServicePrice` when validating and fetching the consultation price.
3. **Frontend**:
   - Update `features/doctores` forms (`react-hook-form` + `useMutation`) to include a dynamic list of services with their prices.
   - Update the consultation creation form to cascade service selection based on the chosen doctor.

## Affected Areas

| Area                               | Impact   | Description                                                           |
| ---------------------------------- | -------- | --------------------------------------------------------------------- |
| `apps/api/prisma/schema.prisma`    | Modified | Replace `ServicePrice` with `DoctorService`                           |
| `apps/api/src/doctors/`            | Modified | Update DTOs, service, and controller to manage doctor services        |
| `apps/api/src/consultations/`      | Modified | Fetch correct price from `DoctorService` during consultation creation |
| `apps/web/src/features/doctores/`  | Modified | Add UI for setting per-doctor service prices                          |
| `apps/web/src/features/consultas/` | Modified | Update consultation form to filter services by doctor                 |

## Risks

| Risk                                                            | Likelihood | Mitigation                                                                                                        |
| --------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Broken historical references to `ServicePrice`                  | Low        | `ConsultationService` already copies `priceUsd` at the time of consultation, so historical data is safe.          |
| Incomplete backend validation allows invalid service assignment | Medium     | Strict input validation in NestJS DTOs; ensure `serviceId` belongs to `specialtyId` before assigning to a doctor. |

## Rollback Plan

Revert the Prisma migration to restore `ServicePrice`, revert backend and frontend code to use the specialty-based pricing. Historical consultation records remain unaffected due to `priceUsd` snapshotting.

## Dependencies

- None

## Success Criteria

- [ ] `ServicePrice` is removed and `DoctorService` is implemented in the schema.
- [ ] Admins can assign services and prices to specific doctors via the frontend.
- [ ] Receptionists can only select services configured for the selected doctor when creating a consultation.
- [ ] Consultations are correctly priced based on the doctor's specific rate.
