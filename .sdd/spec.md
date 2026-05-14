# Medical Management SaaS Specification

## 1. Product Scope
The product is a tenant-aware medical management SaaS for a clinic/business operating in Venezuela. It supports authentication, patient registry, doctor registry, specialty/service pricing, payment capture, receipt generation, operating expenses, and a home dashboard with current financial stats.

## 2. Architecture

### 2.1 Backend
- Framework: NestJS monolith with modular boundaries.
- Persistence: Prisma + PostgreSQL.
- Async processing: Redis + BullMQ for non-blocking jobs.
- Security: JWT in HttpOnly cookie, ACL guards, throttling, helmet.
- Cross-cutting concerns: audit logging, configuration validation, global exception filter.

### 2.2 Frontend
- Framework: Next.js App Router.
- Rendering model: Server Components by default; client components only for interactivity.
- State: TanStack Query for server state, Zustand only for ephemeral client state such as auth/session hydration.
- UI: custom components plus Tailwind only.
- Forms: react-hook-form + zod.

### 2.3 Shared Contracts
- Shared DTOs, enums, and interfaces live in `packages/shared`.
- API response DTOs must not expose raw Prisma models.
- Monetary values use fixed-point decimals, not floats.

## 3. Domain Boundaries

### 3.1 Auth
Handles login, session me endpoint, and logout.

### 3.2 Patients
CRUD for patients with deactivate instead of hard delete.

### 3.3 Doctors
CRUD for doctors, deactivate, and doctor service-price inspection.

### 3.4 Specialties and Services
CRUD for specialties, and update/deactivate service prices within a specialty.

### 3.5 Payments
Payment creation, retrieval, voiding, and adjustments.

### 3.6 Receipts
Receipt snapshot retrieval for frontend PDF generation and internal receipt creation.

### 3.7 Expenses
Expense categories listing, expense CRUD, and voiding.

### 3.8 Stats
Home dashboard aggregates for revenue and operational state.

### 3.9 Roles and ACL
Permission checks via `resource + action` guards.

## 4. Functional Requirements

### 4.1 Auth
- A user can log in with credentials.
- The API sets an HttpOnly `access_token` cookie on success.
- A user can query the current session via `GET /auth/me`.
- A user can log out and the cookie is cleared.

### 4.2 Patients
- List all patients for the current tenant.
- Retrieve one patient by id.
- Create a patient.
- Update a patient.
- Deactivate a patient.

### 4.3 Doctors
- List all doctors for the current tenant.
- Retrieve one doctor by id.
- Create a doctor.
- Update a doctor.
- Inspect a doctor's service prices.
- Deactivate a doctor.

### 4.4 Specialties and Services
- List all specialties for the current tenant.
- Retrieve one specialty by id.
- Create a specialty.
- Update a specialty.
- Update a service price inside a specialty.
- Deactivate a specialty.
- Deactivate a service price entry.

### 4.5 Payments
- List all payments for the current tenant.
- Retrieve one payment by id.
- Create a payment.
- Void a payment.
- Add a payment adjustment.

### 4.6 Receipts
- Fetch receipt data for a payment.
- Generate a receipt internally after payment completion.
- The frontend builds the PDF from receipt data.

### 4.7 Expenses
- List expense categories.
- List expenses for the current tenant.
- Retrieve one expense by id.
- Create an expense.
- Void an expense.

### 4.8 Stats
- Fetch home stats for the current tenant.

## 5. API Contracts

### 5.1 Auth
#### `POST /auth/login`
Request:
```json
{ "email": "string", "password": "string" }
```
Response:
```json
{ "userId": "string", "email": "string", "role": "string", "roleVersion": 1, "permissions": [] }
```
Behavior:
- Sets `access_token` cookie.

#### `GET /auth/me`
Response:
```json
{ "userId": "string", "email": "string", "role": "string", "roleVersion": 1, "permissions": [] }
```

#### `POST /auth/logout`
Response:
```json
{ "message": "Sesión cerrada" }
```

### 5.2 Patients
#### `GET /patients`
Response: `PatientResponseDto[]`

#### `GET /patients/:id`
Response: `PatientResponseDto`

#### `POST /patients`
Request: `CreatePatientDto`
Response: `PatientResponseDto`

#### `PATCH /patients/:id`
Request: `UpdatePatientDto`
Response: `PatientResponseDto`

#### `DELETE /patients/:id`
Response: `PatientResponseDto`

### 5.3 Doctors
#### `GET /doctors`
Response: `DoctorResponseDto[]`

#### `GET /doctors/:id`
Response: `DoctorResponseDto`

#### `POST /doctors`
Request: `CreateDoctorDto`
Response: `DoctorResponseDto`

#### `PATCH /doctors/:id`
Request: `UpdateDoctorDto`
Response: `DoctorResponseDto`

#### `GET /doctors/:id/service-prices`
Response: specialty service-price details for the doctor.

#### `DELETE /doctors/:id`
Response: `DoctorResponseDto`

### 5.4 Specialties
#### `GET /specialties`
Response: `SpecialtyResponseDto[]`

#### `GET /specialties/:id`
Response: `SpecialtyResponseDto`

#### `POST /specialties`
Request: `CreateSpecialtyDto`
Response: `SpecialtyResponseDto`

#### `PATCH /specialties/:id`
Request: `UpdateSpecialtyDto`
Response: `SpecialtyResponseDto`

#### `PATCH /specialties/:specialtyId/services/:servicePriceId`
Request: `UpdateServicePriceDto`
Response: `SpecialtyResponseDto`

#### `DELETE /specialties/:id`
Response: `SpecialtyResponseDto`

#### `DELETE /specialties/:specialtyId/services/:servicePriceId`
Response: `SpecialtyResponseDto`

### 5.5 Payments
#### `GET /payments`
Response: `PaymentResponseDto[]`

#### `GET /payments/:id`
Response: `PaymentResponseDto`

#### `POST /payments`
Request: `CreatePaymentDto`
Response: `PaymentResponseDto`

#### `POST /payments/:id/void`
Response: `PaymentResponseDto`

#### `POST /payments/:id/adjustments`
Request: `CreatePaymentAdjustmentDto`
Response: `PaymentResponseDto`

### 5.6 Receipts
#### `GET /receipts/:paymentId/data`
Response: `ReceiptResponseDto`

#### `POST /receipts/:paymentId/generate`
Internal only.
Headers:
- `x-tenant-id`
- `x-generated-by-id`
Response: `ReceiptResponseDto`

### 5.7 Expenses
#### `GET /expenses/categories`
Response: category list.

#### `GET /expenses`
Response: `ExpenseResponseDto[]`

#### `GET /expenses/:id`
Response: `ExpenseResponseDto`

#### `POST /expenses`
Request: `CreateExpenseDto`
Response: `ExpenseResponseDto`

#### `POST /expenses/:id/void`
Request: `VoidExpenseDto`
Response: `ExpenseResponseDto`

### 5.8 Stats
#### `GET /stats/home`
Response: `HomeStatsDto`

## 6. Non-Functional Requirements
- Tenant isolation for all business data.
- Authenticated endpoints require JWT and ACL where configured.
- Money fields use decimal precision, not floating point.
- Soft deletion is not used for business entities; use deactivate or void semantics.
- Controllers stay thin and do not contain business logic.
- Frontend pages stay thin and delegate fetching to hooks/services.

## 7. Technical Decisions
- Use Prisma as the single source of truth for persistence.
- Use NestJS modules as bounded contexts.
- Use `@RequirePermission(resource, action)` for authorization.
- Use a shared DTO layer rather than exposing Prisma entities.
- Use queue jobs for receipt/email side effects.
- Use App Router and feature-based folders on the frontend.
- Use custom components and Tailwind only, no component library dependency.

## 8. Acceptance Criteria
- Every core flow above has a documented API contract.
- The architecture matches the repo's NestJS + Next.js + Prisma stack.
- Tenant-scoped resources are consistently modeled across the spec.
- Receipt and payment flows are defined as separate concerns.
- The spec does not introduce unsupported product areas.

## 9. Assumptions and Edge Cases
- Categories for expenses are treated as reference data.
- Receipt PDF generation happens on the frontend from receipt snapshot data.
- Internal receipt generation is triggered by backend workflows, likely via BullMQ.
- Home stats are based on the current tenant and the same permission boundary as payments read access.
- Exact response schemas for DTOs are assumed to follow the existing response DTO naming in the repo and can be tightened in a later contract pass.
