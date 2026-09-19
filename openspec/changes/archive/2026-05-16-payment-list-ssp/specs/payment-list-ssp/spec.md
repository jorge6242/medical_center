# Payment List Server-Side Pagination Specification

## Purpose

Define payment-specific behavior for the generic SSP pattern applied to the Payments entity. This spec references `data-table-ssp` and `pagination-dtos` for generic behavior and covers only payment-specific search, filtering, and row actions.

## Requirements

### Requirement: GET /payments MUST return paginated responses

The `GET /payments` endpoint MUST accept `PaginationQueryDto` and return `PaginatedResponseDto<PaymentResponseDto>`. It SHALL execute count and data queries inside `prisma.$transaction` as defined in `pagination-dtos`.

#### Scenario: Default pagination request

- GIVEN a `GET /payments` request without query parameters
- WHEN the controller processes the request
- THEN it returns `PaginatedResponseDto` with `meta.page=1`, `meta.limit=10`, and `data` containing up to 10 payments

#### Scenario: Paginated request with search

- GIVEN a `GET /payments?page=2&limit=25&search=maria` request
- WHEN the service queries the database
- THEN the response contains matching payments for page 2
- AND `meta.total`, `meta.totalPages`, `meta.hasNextPage`, and `meta.hasPreviousPage` reflect the filtered result set

### Requirement: Payment search MUST support nested patient fields

When `search` is provided, the backend MUST construct a Prisma `where` clause with `OR` conditions targeting `PaymentItem.consultation.patient.name` and `PaymentItem.consultation.patient.documentId` using `contains` with `mode: 'insensitive'`.

#### Scenario: Search by patient name

- GIVEN a payment linked to a consultation for patient "Maria Gomez"
- WHEN `GET /payments?search=gomez` is requested
- THEN the payment appears in the result set

#### Scenario: Search by patient document ID

- GIVEN a payment linked to a patient with `documentId="V123456"`
- WHEN `GET /payments?search=V123456` is requested
- THEN the payment appears in the result set

### Requirement: Payment list MUST NOT hardcode status filter

The `GET /payments` endpoint MUST NOT include a hardcoded `status: 'COMPLETED'` filter. It MAY accept an optional `status` query parameter to filter by payment status. When no `status` is provided, all payment statuses SHALL be returned.

#### Scenario: List includes voided payments

- GIVEN payments exist with statuses `COMPLETED` and `VOIDED`
- WHEN `GET /payments` is requested without a `status` parameter
- THEN the response includes both `COMPLETED` and `VOIDED` payments

#### Scenario: Filter by status parameter

- GIVEN payments exist with statuses `COMPLETED` and `VOIDED`
- WHEN `GET /payments?status=COMPLETED` is requested
- THEN the response includes only `COMPLETED` payments
- AND `meta.total` reflects the count of `COMPLETED` payments only

### Requirement: Payment row actions MUST remain available in DataTable

The `payment-columns.tsx` column definitions MUST expose four action callbacks via `table.options.meta` as defined in `data-table-ssp`: `onDownloadReceipt`, `onViewReceipt`, `onVoid`, and `onAdjustments`. The `pagos/page.tsx` SHALL compose the generic `DataTable` with these columns and the corresponding action handlers.

#### Scenario: Download receipt action triggered

- GIVEN a payments DataTable row with action buttons
- WHEN the user clicks "Descargar recibo"
- THEN `meta.onDownloadReceipt(row.original)` is invoked with the payment data

#### Scenario: Void action triggered

- GIVEN a payments DataTable row with action buttons
- WHEN the user clicks "Anular"
- THEN `meta.onVoid(row.original)` is invoked and the existing void mutation is triggered

### Requirement: Frontend MUST consume paginated payments via dedicated hook and service

The frontend MUST provide a new `getPaginatedPayments` service function and a `usePaginatedPayments` hook using the query key `['payments', page, limit, search]`. The existing `getPayments()` and `usePayments()` MUST remain available for backward compatibility.

#### Scenario: DataTable fetches paginated payments

- GIVEN the pagos page renders with `DataTable`
- WHEN the user navigates to page 2 with search term "juan"
- THEN `usePaginatedPayments` fetches `GET /payments?page=2&limit=10&search=juan`
- AND the DataTable displays the returned payment rows

### Requirement: PaymentToolbar MUST support patient name/description search

The `payment-toolbar.tsx` MUST render a `DebouncedSearchInput` (as defined in `data-table-ssp`) that filters payments by patient name or document ID via the backend search parameter.

#### Scenario: Search input debounces and refetches

- GIVEN the user types "gomez" into the payment toolbar search field
- WHEN the debounce timer expires
- THEN `usePaginatedPayments` refetches with `search=gomez` and resets to page 1
