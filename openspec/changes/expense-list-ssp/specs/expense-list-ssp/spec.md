# Expense List Server-Side Pagination Specification

## Purpose

Define expense-specific behavior for the generic SSP pattern. This spec reuses `data-table-ssp` for table paging/search UX and `pagination-dtos` for the paginated API contract; it only states expense-specific search, status, actions, and modal preservation rules.

## Requirements

### Requirement: GET /expenses MUST return paginated responses

`GET /expenses` MUST accept the shared pagination query contract and SHALL return a paginated response with `data` and `meta`. The expense item shape MUST preserve existing expense fields so the current page and modals continue to function.

#### Scenario: Default request

- GIVEN a request to `GET /expenses` without query parameters
- WHEN the endpoint resolves the request
- THEN it MUST apply the default page and limit from the shared pagination DTO
- AND it MUST return a paginated response envelope

#### Scenario: Existing expense data remains available

- GIVEN a paginated response from `GET /expenses`
- WHEN a client inspects an expense item
- THEN the item MUST still include the fields used by the current expense page

### Requirement: Expense search MUST target categoryName and description

When `search` is provided, `GET /expenses` MUST filter expenses by `categoryName` and `description`. Search SHOULD be case-insensitive and MUST match partial text.

#### Scenario: Search by category name

- GIVEN an expense with category name "Servicios"
- WHEN `GET /expenses?search=serv` is requested
- THEN the expense MUST appear in the result set

#### Scenario: Search by description

- GIVEN an expense with description "Pago mensual de internet"
- WHEN `GET /expenses?search=internet` is requested
- THEN the expense MUST appear in the result set

### Requirement: Expense list MUST show status as a visible column

The expense table MUST display a status column with values `ACTIVE` and `VOIDED`. Status visibility SHALL remain part of the list UI and MUST not be hidden behind a row action.

#### Scenario: Render status column

- GIVEN a paginated expense list
- WHEN the table renders a row
- THEN the row MUST show the expense status as `ACTIVE` or `VOIDED`

### Requirement: Expense row actions MUST preserve Ver and Anular behavior

The row actions for expenses MUST continue to expose `Ver` and `Anular`. `Ver` SHALL open the existing detail modal, and `Anular` SHALL open the existing void flow.

#### Scenario: View action remains available

- GIVEN an expense row in the table
- WHEN the row renders
- THEN the `Ver` action MUST still be available

#### Scenario: Void action remains available

- GIVEN an expense row in the table
- WHEN the row renders
- THEN the `Anular` action MUST still be available

### Requirement: The expense page MUST preserve existing modals

The expense page MUST preserve the existing create modal and the detail/void modals. Pagination and search behavior SHOULD change the list only; they MUST NOT remove or replace those dialogs.

#### Scenario: Create modal remains usable

- GIVEN the expense page is open
- WHEN the user opens the create expense action
- THEN the existing create modal MUST open

#### Scenario: Detail and void modals remain usable

- GIVEN the expense page is open
- WHEN the user selects `Ver` or `Anular`
- THEN the existing detail or void modal MUST open
