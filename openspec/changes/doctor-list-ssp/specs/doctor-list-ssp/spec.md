# doctor-list-ssp Specification

## Purpose

Define doctor-specific server-side listing behavior for the admin experience. This spec reuses `data-table-ssp` for generic table pagination/search UX and `pagination-dtos` for the paginated API contract, and adds only doctor-specific search, visibility, action, and compatibility rules.

## Requirements

### Requirement: GET /doctors MUST return a paginated doctor list

`GET /doctors` MUST accept the shared pagination query contract and SHALL return a paginated response with `data` and `meta`.
The doctor item shape in `data` MUST preserve existing doctor fields and MUST expose the columns needed by the admin table.

#### Scenario: Default paginated request

- GIVEN a request to `GET /doctors` without query parameters
- WHEN the endpoint resolves the request
- THEN it MUST use the default pagination values from the shared DTO contract
- AND it MUST return a paginated response envelope

#### Scenario: Existing doctor fields remain available

- GIVEN a paginated response from `GET /doctors`
- WHEN a client inspects a doctor item
- THEN the item MUST still include the existing doctor properties used by current consumers

### Requirement: Doctor search MUST cover the required fields

When `search` is provided, `GET /doctors` MUST filter doctors by `name`, `documentId`, `medicalLicenseNumber`, and `specialties.specialty.name`.
Search SHOULD be case-insensitive and MUST match partial text.

#### Scenario: Search by nested specialty name

- GIVEN `search=cardio`
- WHEN the endpoint queries doctors
- THEN doctors MUST match if any related specialty name contains `cardio`

#### Scenario: Search by document or license

- GIVEN `search=1234`
- WHEN the endpoint queries doctors
- THEN doctors MUST match by `documentId` or `medicalLicenseNumber` when those fields contain `1234`

### Requirement: Doctor listings MUST surface active and verification status

Each listed doctor MUST include `isActive` and `verificationStatus` so the admin table can display operational state without extra requests.

#### Scenario: Render status columns

- GIVEN a doctor list response
- WHEN the admin page renders a row
- THEN the row MUST have data for `isActive` and `verificationStatus`

### Requirement: The admin doctor page MUST use the generic DataTable with doctor toolbar actions

The doctor admin page MUST compose the shared `DataTable` with a doctor-specific toolbar.
The row action set MUST preserve edit, verify/re-verify, and deactivate callbacks.

#### Scenario: Toolbar search drives server-side filtering

- GIVEN the admin doctor page is open
- WHEN the user searches for a doctor
- THEN the page MUST request the filtered paginated list from `GET /doctors`
- AND the generic `DataTable` MUST render the matching rows

#### Scenario: Row actions remain available

- GIVEN a doctor row in the table
- WHEN the row renders
- THEN the actions for edit, verify/re-verify, and deactivate MUST still be exposed

### Requirement: Doctor list behavior SHOULD remain backward-compatible

The change SHOULD avoid breaking existing doctor consumers by preserving the doctor item contract and keeping the response stable for clients that already consume doctor fields.
Legacy consumers MAY need to adapt to the paginated envelope, but the underlying doctor data MUST remain compatible.

#### Scenario: Consumer reads existing doctor fields

- GIVEN a client that already depends on doctor field names
- WHEN it consumes the new response
- THEN the doctor field names MUST remain unchanged
- AND the client MUST still find the same data inside each item
