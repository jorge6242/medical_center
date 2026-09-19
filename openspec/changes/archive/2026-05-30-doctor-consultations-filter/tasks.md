# Tasks: Filtrar consultas por doctor logueado

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250–300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema, seeders, auth payload, backend filter | PR 1 | Single PR — all backend + frontend + tests |

## Phase 1: Foundation (Schema & Types)

- [ ] 1.1 Modify `prisma/schema.prisma`: add `userId String? @unique` to `Doctor` + inverse `doctor Doctor?` to `User`
- [ ] 1.2 Generate Prisma migration: `npx prisma migrate dev --name add_doctor_user_link`
- [ ] 1.3 Modify `src/common/decorators/current-user.decorator.ts`: add `doctorId: string | null` to `JwtPayload`

## Phase 2: Backend (Auth & Service Filter)

- [ ] 2.1 Modify `src/auth/auth.service.ts`: `include: { doctor: true }` in login query; add `doctorId` to JWT payload
- [ ] 2.2 Modify `src/auth/dto/auth-response.dto.ts`: add `doctorId: string | null` field
- [ ] 2.3 Modify `src/medical-records/medical-records.controller.ts`: pass full `user: JwtPayload` to `findPaidConsultations` instead of only `user.tenantId`
- [ ] 2.4 Modify `src/medical-records/medical-records.service.ts`: accept `JwtPayload`; add `doctorId` filter when `role === 'doctor'` and `doctorId != null`
- [ ] 2.5 Modify `prisma/seeders/users.seeder.ts`: create 3 demo users with `roleName: 'doctor'` (maria.gonzalez, carlos.rodriguez, luis.martinez)
- [ ] 2.6 Modify `prisma/seeders/doctors.seeder.ts`: link each doctor to its seeded user via `userId`

## Phase 3: Frontend (Auth Store & Navigation)

- [ ] 3.1 Modify `apps/web/src/stores/auth.store.ts`: add `doctorId: string | null` to `AuthState` and persist it from login response
- [ ] 3.2 Modify `apps/web/src/features/auth/services/auth.service.ts`: add `doctorId` to login response type
- [ ] 3.3 Modify `apps/web/src/shared/types/nav.types.ts`: add optional `visibleForRoles?: string[]` to `NavItem`
- [ ] 3.4 Modify `apps/web/src/config/navigation.config.ts`: add `visibleForRoles` to items; hide admin-only items for `doctor`
- [ ] 3.5 Modify `apps/web/src/shared/hooks/use-sidebar-nav.ts`: filter `NAV_ITEMS` by `visibleForRoles` against `authStore.role`

## Phase 4: Typecheck & Lint

- [ ] 4.1 Run `make shell-api` → `pnpm run typecheck`
- [ ] 4.2 Run `make shell-api` → `pnpm run lint`
- [ ] 4.3 Run `make shell-web` → `pnpm run typecheck`
- [ ] 4.4 Run `make shell-web` → `pnpm run lint`
- [ ] 4.5 Run `make db-migrate` (if needed) and verify seeders create linked users

## Phase 5: Verification

- [ ] 5.1 Manual test: login with demo doctor (`maria.gonzalez@centromedico.demo`) → `/consultas` shows only consultations for that doctor
- [ ] 5.2 Manual test: login with admin (`admin@centromedico.demo`) → `/consultas` shows all consultations
- [ ] 5.3 Manual test: sidebar for doctor role shows only relevant items
- [ ] 5.4 Verify no regression: create medical record from consultation still works
