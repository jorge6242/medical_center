# Consultations List SSP Specification

## Purpose

Define the behavior for listing consultations in a dedicated dashboard view with server-side pagination, search, filters, and medical-record creation access.

## Generic SSP Dependencies

This capability builds on the existing generic specs:

- `data-table-ssp`: table composition, manual server-side pagination, loading/empty states, toolbar usage, and row actions through `table.options.meta`.
- `pagination-dtos`: `PaginationQueryDto`, entity-specific query DTO extension, `PaginatedResponseDto`, standard metadata fields, case-insensitive `search`, and transaction-backed `count + findMany`.

This spec defines only the consultation-specific endpoint, filters, columns, and row action.

## Requirements

### Requirement: Consultations endpoint MUST return tenant-safe paginated results

`GET /consultations` MUST use a consultation-specific query DTO that extends `PaginationQueryDto` and MUST return `PaginatedResponseDto<ConsultationResponseDto>` scoped to the authenticated user's tenant. It SHALL accept `page`, `limit`, `search`, `status`, `fromDate`, `toDate`, `doctorId`, and `specialtyId`. When the caller has `role: 'doctor'` and a valid `doctorId` in the JWT payload, the endpoint SHALL ignore any externally provided `doctorId` parameter and SHALL enforce the JWT-scoped filter.

#### Scenario: Default paginated request

- GIVEN an authenticated user with consultation read access
- WHEN `GET /consultations` is requested without query params
- THEN the response contains up to 10 consultations for that tenant
- AND metadata includes total, page, limit, totalPages, hasNextPage, and hasPreviousPage

#### Scenario: Tenant isolation

- GIVEN consultations exist for two tenants
- WHEN tenant A requests `GET /consultations`
- THEN no consultation from tenant B is returned

#### Scenario: Doctor role overrides external doctorId param

- GIVEN a doctor user with `doctorId: 'doc-001'`
- WHEN `GET /consultations?doctorId=doc-002` is requested
- THEN the response still only contains consultations for `doc-001`
- AND the external `doctorId` parameter is ignored

### Requirement: Search MUST support patient, doctor, and specialty text

When `search` is provided, the system MUST match patient name, patient document ID, doctor name, doctor document ID, or consultation specialty snapshot text case-insensitively.

#### Scenario: Search by patient document

- GIVEN a consultation for a patient with document `V123456`
- WHEN `GET /consultations?search=123456` is requested
- THEN that consultation appears in the result set

#### Scenario: Search by doctor or specialty

- GIVEN a consultation for doctor `Ana Pérez` in specialty `Ginecología`
- WHEN search is `perez` or `ginecologia`
- THEN that consultation appears in the result set

### Requirement: Filters MUST narrow consultations by operational dimensions

The endpoint MUST support filtering by consultation status, date range, doctor, and specialty. Filters SHALL combine with search and pagination.

#### Scenario: Filter by status and date range

- GIVEN paid and voided consultations across multiple dates
- WHEN `GET /consultations?status=PAID&fromDate=2026-05-01&toDate=2026-05-31` is requested
- THEN only paid consultations in that range are returned

#### Scenario: Filter by doctor and specialty

- GIVEN consultations from multiple doctors and specialties
- WHEN `doctorId` and `specialtyId` filters are provided
- THEN only consultations matching both filters are returned

### Requirement: Doctor-scoped filtering MUST automatically restrict results

When the authenticated user's role is `doctor` and the JWT payload contains a non-null `doctorId`, the system MUST automatically append `doctorId: req.user.doctorId` to the Prisma `where` clause of `GET /consultations`. The endpoint SHALL NOT expose this filter as a query parameter, to prevent tampering.

#### Scenario: Doctor user sees only own consultations

- GIVEN a doctor user with `role: 'doctor'` and `doctorId: 'doc-001'`
- AND consultations exist for `doc-001`, `doc-002`, and `doc-003`
- WHEN `GET /consultations` is requested
- THEN only consultations where `doctorId = 'doc-001'` are returned
- AND the response metadata reflects the filtered count

#### Scenario: Non-doctor user sees all consultations

- GIVEN an admin user with `role: 'admin'` and no `doctorId`
- AND consultations exist for multiple doctors
- WHEN `GET /consultations` is requested
- THEN all consultations for the tenant are returned
- AND no automatic `doctorId` filter is applied

#### Scenario: Doctor with null doctorId sees empty list

- GIVEN a user with `role: 'doctor'` but `doctorId: null`
- WHEN `GET /consultations` is requested
- THEN the result set is empty
- AND the response metadata shows `total: 0`

### Requirement: Consultations page MUST show the agreed columns

The `/consultas` page MUST render the generic `DataTable` in manual pagination mode with cédula, paciente, doctor, servicio, and status columns. It SHOULD include date if needed for filtering context.

#### Scenario: Table renders consultation rows

- GIVEN the API returns consultation rows
- WHEN `/consultas` loads
- THEN each row displays patient document, patient name, doctor name, service names, and consultation status

### Requirement: Row action MUST open medical-record creation modal

Each consultation row MUST expose a "Registrar informe" action that opens the existing medical-record creation UI for the selected consultation. The action MUST NOT create or edit consultations.

#### Scenario: Open report modal from consultation row

- GIVEN a consultation row without a completed medical record
- WHEN the user clicks "Registrar informe"
- THEN the existing medical-record creation modal opens with that consultation selected

#### Scenario: Existing medical record prevents duplicate creation

- GIVEN a consultation already has a medical record
- WHEN the row renders
- THEN the UI MUST prevent duplicate creation or clearly show that the report already exists
