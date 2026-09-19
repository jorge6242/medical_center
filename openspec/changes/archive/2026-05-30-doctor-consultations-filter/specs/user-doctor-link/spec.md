# User-Doctor Link Specification

## Purpose

Define the database relationship, authentication payload, and data-seeding contract that links a `User` (authentication entity) to a `Doctor` (business entity), enabling role-based access control and self-service doctor workflows.

## Requirements

### Requirement: Doctor MUST reference its owning User

The `Doctor` model SHALL contain a nullable `userId` column that is a foreign key to `User.id`. The `User` model SHALL expose an inverse optional relation `doctor`. No column SHALL be added to `User` that references `Doctor`.

#### Scenario: Schema migration adds userId to Doctor

- GIVEN the current Prisma schema
- WHEN the migration runs
- THEN `Doctor.userId String? @unique` exists
- AND `User.doctor Doctor?` is the inverse relation
- AND existing Doctor rows retain `userId: null`

#### Scenario: Admin creates a doctor with a linked user

- GIVEN an admin invokes `POST /doctors`
- AND the request includes `userEmail` and `userPassword`
- WHEN the system processes the request
- THEN a `User` with role `doctor` is created
- AND a `Doctor` is created with `userId` pointing to that `User`
- AND both creations occur inside a Prisma transaction

### Requirement: JWT payload MUST include doctorId for doctor users

During login (`POST /auth/login`), the system MUST query the `User` record including its optional `doctor` relation. If `user.doctor` exists, the JWT payload SHALL include `doctorId: user.doctor.id`; otherwise `doctorId` SHALL be `null`.

#### Scenario: Doctor login receives doctorId in token

- GIVEN a `User` with an associated `Doctor`
- WHEN the user authenticates successfully
- THEN the JWT payload contains `doctorId` equal to the doctor's UUID
- AND the token is signed with the standard secret

#### Scenario: Non-doctor login has null doctorId

- GIVEN a `User` with no associated `Doctor`
- WHEN the user authenticates successfully
- THEN the JWT payload contains `doctorId: null`
- AND all other claims remain unchanged

#### Scenario: Frontend auth store persists doctorId

- GIVEN a successful login response with a JWT containing `doctorId`
- WHEN the frontend initializes the auth store
- THEN `authStore.doctorId` is set to the JWT value
- AND `authStore.role` is set to the JWT role

### Requirement: Seeders MUST create linked User-Doctor pairs

The demo seeders SHALL create a `User` with role `doctor` for each demo doctor, and SHALL link them via `Doctor.userId`. Doctors SHALL NOT be seeded without an associated user.

#### Scenario: Demo doctor has login credentials

- GIVEN the database is freshly seeded
- WHEN querying for the demo doctor `Dra. María González`
- THEN a `User` with email `maria.gonzalez@centromedico.demo` exists
- AND the `Doctor.userId` points to that `User.id`

### Requirement: Frontend navigation MUST filter by role

The navigation configuration SHALL declare visibility rules based on `role`. When `role === 'doctor'`, the sidebar MUST display only items relevant to doctors.

#### Scenario: Doctor role sees restricted menu

- GIVEN a logged-in user with `role: 'doctor'`
- WHEN the sidebar renders
- THEN "Consultas" and "Mi Perfil" (future) are visible
- AND "Doctores", "Reportes", "Egresos", etc. are hidden

#### Scenario: Admin role sees full menu

- GIVEN a logged-in user with `role: 'admin'`
- WHEN the sidebar renders
- THEN all navigation items matching their permissions are visible

## REMOVED Requirements

None.
