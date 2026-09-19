# Lab Orders List SSP Specification

## Purpose

Define the lab-orders list behavior that builds on `data-table-ssp` and `pagination-dtos`. Those shared specs provide the generic DataTable, toolbar, manual pagination, and paginated DTO contract; this spec defines only lab-order-specific search, filtering, and payment-action behavior.

## Requirements

### Requirement: `GET /lab-orders` MUST return paginated results

The backend MUST accept an entity-specific query DTO that extends `PaginationQueryDto` and MUST return `PaginatedResponseDto<LabOrderResponseDto>`. The query SHALL support `page`, `limit`, `search`, and `status` from day one.

#### Scenario: Default list request

- GIVEN a request to `GET /lab-orders` without query parameters
- WHEN the controller handles the request
- THEN the response SHALL include paginated `data` and `meta`
- AND `page` and `limit` SHALL fall back to the shared defaults

#### Scenario: Status filter is accepted

- GIVEN a request to `GET /lab-orders?status=PENDING`
- WHEN the controller validates the query
- THEN the request MUST pass validation
- AND the service MUST filter to matching lab orders only

### Requirement: Lab order search MUST target the required fields

When `search` is provided, the backend MUST match lab orders by `id`, `patient.name`, `patient.documentId`, and `tests.testName`. The search SHALL be case-insensitive and SHALL use OR conditions.

#### Scenario: Search by patient document

- GIVEN `search=V123`
- WHEN the backend builds the query
- THEN orders whose patient document contains `V123` MUST be included
- AND orders that match only other fields MUST not be excluded incorrectly

#### Scenario: Search by nested test name

- GIVEN `search=hemograma`
- WHEN the backend builds the query
- THEN orders with any nested test whose `testName` contains `hemograma` MUST be included

### Requirement: The list page MUST use the SSP table and toolbar pattern

The lab-orders page MUST compose the shared `DataTable` and toolbar patterns. Search and status filtering SHALL be available on first render, and the page MUST not depend on the previous custom table implementation.

#### Scenario: Initial render shows toolbar controls

- GIVEN the lab-orders page loads
- WHEN the page renders
- THEN the toolbar MUST expose search and status filter controls
- AND the list MUST be request-driven rather than locally filtered

### Requirement: The `Pagar` action MUST remain available for pending orders

The table MUST preserve the existing `Pagar` action for lab orders with status `PENDING`. Clicking the action MUST trigger the current payment flow and MUST NOT replace or redesign the existing modals.

#### Scenario: Pending order shows payment action

- GIVEN a lab order with status `PENDING`
- WHEN the row is rendered
- THEN the table MUST show a `Pagar` action for that row

#### Scenario: Payment flow remains unchanged

- GIVEN a `PENDING` lab order row
- WHEN the user clicks `Pagar`
- THEN the existing payment modal or flow MUST open
- AND the user experience MUST remain compatible with the current implementation
