# pagination-dtos Specification

## Purpose

Define the API contract for server-side pagination across all entity list endpoints, standardizing query parameters and response metadata to enable generic frontend consumption.

## Requirements

### Requirement: GET endpoints MUST accept PaginationQueryDto

All `GET /{entities}` endpoints MUST accept a `PaginationQueryDto` containing `page` (default 1), `limit` (default 10), and optional `search`. Additional entity-specific filters MAY be added via extension.

#### Scenario: Request with default pagination

- GIVEN a GET request to `/patients` without query parameters
- WHEN the controller processes the request
- THEN `PaginationQueryDto` resolves to `page=1`, `limit=10`

#### Scenario: Request with search and pagination

- GIVEN a GET request to `/patients?page=2&limit=25&search=maria`
- WHEN the controller processes the request
- THEN `PaginationQueryDto` resolves to `page=2`, `limit=25`, `search="maria"`

### Requirement: Responses MUST use PaginatedResponseDto

All paginated endpoints MUST return a `PaginatedResponseDto<T>` containing a `data` array of type `T` and a `meta` object with pagination metadata.

#### Scenario: Successful paginated response

- GIVEN a query returns 5 patient records from a total of 50
- WHEN the response is serialized
- THEN the JSON contains `data: [...]` and `meta: {...}`

### Requirement: Meta object MUST contain standard pagination fields

The `meta` object MUST include `total` (total records), `page` (current page), `limit` (page size), `totalPages` (calculated), `hasNextPage` (boolean), and `hasPreviousPage` (boolean).

#### Scenario: Calculate metadata for middle page

- GIVEN `total=150`, `page=2`, `limit=10`
- WHEN metadata is computed
- THEN `meta.totalPages=15`, `meta.hasNextPage=true`, `meta.hasPreviousPage=true`

#### Scenario: Calculate metadata for last page

- GIVEN `total=95`, `page=10`, `limit=10`
- WHEN metadata is computed
- THEN `meta.totalPages=10`, `meta.hasNextPage=false`, `meta.hasPreviousPage=true`

### Requirement: Search MUST filter with OR and case-insensitive contains

When `search` is provided, the backend MUST construct a Prisma `where` clause with `OR` conditions targeting entity-specific fields (e.g., `name`, `documentId`) using `contains` with `mode: 'insensitive'`.

#### Scenario: Search patients by name or document

- GIVEN `search="gomez"` on `/patients`
- WHEN Prisma builds the query
- THEN `where` contains `OR: [{ name: { contains: "gomez", mode: "insensitive" } }, { documentId: { contains: "gomez", mode: "insensitive" } }]`

### Requirement: Count and data queries MUST run in a transaction

The backend MUST execute the total count query and the paginated data query inside a single `prisma.$transaction([...])` to guarantee a consistent snapshot.

#### Scenario: Concurrent writes during pagination

- GIVEN a request for page 1 of patients
- WHEN a new patient is created between the count and data queries
- THEN both queries still see the same snapshot because they run in a transaction
