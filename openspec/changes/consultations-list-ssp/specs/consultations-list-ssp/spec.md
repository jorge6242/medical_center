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

`GET /consultations` MUST use a consultation-specific query DTO that extends `PaginationQueryDto` and MUST return `PaginatedResponseDto<ConsultationResponseDto>` scoped to the authenticated user's tenant. It SHALL accept `page`, `limit`, `search`, `status`, `fromDate`, `toDate`, `doctorId`, and `specialtyId`.

#### Scenario: Default paginated request

- GIVEN an authenticated user with consultation read access
- WHEN `GET /consultations` is requested without query params
- THEN the response contains up to 10 consultations for that tenant
- AND metadata includes total, page, limit, totalPages, hasNextPage, and hasPreviousPage

#### Scenario: Tenant isolation

- GIVEN consultations exist for two tenants
- WHEN tenant A requests `GET /consultations`
- THEN no consultation from tenant B is returned

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

### Requirement: Consultations page MUST show the agreed columns

The `/consultas` page MUST render the generic `DataTable` in manual pagination mode with cédula, paciente, doctor, servicio, and status columns. It SHOULD include date if needed for filtering context.

#### Scenario: Table renders consultation rows

- GIVEN the API returns consultation rows
- WHEN `/consultas` loads
- THEN each row displays patient document, patient name, doctor name, service names, and consultation status

### Requirement: Row action MUST open medical-record creation modal

Each consultation row MUST expose a “Registrar informe” action that opens the existing medical-record creation UI for the selected consultation. The action MUST NOT create or edit consultations.

#### Scenario: Open report modal from consultation row

- GIVEN a consultation row without a completed medical record
- WHEN the user clicks “Registrar informe”
- THEN the existing medical-record creation modal opens with that consultation selected

#### Scenario: Existing medical record prevents duplicate creation

- GIVEN a consultation already has a medical record
- WHEN the row renders
- THEN the UI MUST prevent duplicate creation or clearly show that the report already exists
