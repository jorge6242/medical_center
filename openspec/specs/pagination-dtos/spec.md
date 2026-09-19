# pagination-dtos Specification

## Purpose

Define the API contract for server-side pagination across all entity list endpoints, standardizing query parameters and response metadata to enable generic frontend consumption.

## Requirements

### Requirement: GET endpoints MUST accept PaginationQueryDto

All `GET /{entities}` endpoints MUST accept a `PaginationQueryDto` containing `page` (default 1), `limit` (default 10), and optional `search`.

### Requirement: Search fields MUST be defined per entity

Before implementing SSP for a new entity, the developer MUST ask the user which fields should be searchable in the DataTable. The `search` parameter MUST target only the fields explicitly requested by the user for that entity.

**Example questions to ask**:
- "¿Por qué campos quieres buscar?" (nombre, cédula, email, teléfono)
- "¿Hay filtros adicionales?" (status, fecha, categoría, método de pago)

The chosen fields MUST be documented in the entity's delta spec and implemented in the Prisma `where` clause with `OR` conditions.

### Requirement: Entity-specific filters MUST extend PaginationQueryDto

When an entity requires additional filter parameters (e.g., `status`, `dateRange`, `category`), the backend MUST create an entity-specific DTO that **extends** `PaginationQueryDto`. The endpoint MUST use this extended DTO as the `@Query()` parameter.

The system MUST NOT add extra `@Query()` parameters alongside the DTO when `ValidationPipe` is configured with `whitelist: true` and `forbidNonWhitelisted: true`, because undecorated query params will be rejected with 400 Bad Request.

#### Scenario: Request with default pagination

- GIVEN a GET request to `/patients` without query parameters
- WHEN the controller processes the request
- THEN `PaginationQueryDto` resolves to `page=1`, `limit=10`

#### Scenario: Request with search and pagination

- GIVEN a GET request to `/patients?page=2&limit=25&search=maria`
- WHEN the controller processes the request
- THEN `PaginationQueryDto` resolves to `page=2`, `limit=25`, `search="maria"`

#### Scenario: Endpoint with status filter uses extended DTO

- GIVEN `GET /payments?page=1&limit=10&status=COMPLETED`
- WHEN the request hits a controller using `PaymentQueryDto extends PaginationQueryDto`
- THEN the DTO resolves `page=1`, `limit=10`, `status="COMPLETED"`
- AND the request passes `ValidationPipe` validation

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

## Implementation Notes

### Gotcha: NestJS ts-node Cache in Docker
When modifying DTOs or controllers in `apps/api/src/`, NestJS running under `ts-node` inside Docker may serve stale compiled code. The `dist/tsconfig.tsbuildinfo` cache file prevents recompilation of changed files.

**Symptom**: API returns old response shape or rejects fields that were just added to a DTO.

**Resolution**: After modifying backend files, remove the build cache and restart the API container:
```bash
docker compose -f docker-compose.dev.yml exec api rm -rf /app/apps/api/dist
docker compose -f docker-compose.dev.yml restart api
```

### Gotcha: ValidationPipe Whitelist with Query Params
When `ValidationPipe` is configured with `whitelist: true` and `forbidNonWhitelisted: true` (as in this project's `main.ts`), any query parameter that is NOT decorated in the DTO will cause a 400 Bad Request.

**Example — Update DTOs**: The `PatientForm` sends `documentType` and `documentId` on PATCH requests. If `UpdatePatientDto` lacks these fields, the API rejects the request with `"property documentType should not exist"`.

**Resolution**: Ensure `UpdatePatientDto` includes all fields the frontend may send, even if they are `@IsOptional()`. Alternatively, the frontend should filter the payload before sending, but this adds coupling. DTO completeness is preferred.

**Example — Pagination DTO Extension**: The Payments list needs a `status` filter. If the controller adds `@Query('status') status?: string` alongside `@Query() query: PaginationQueryDto`, the `ValidationPipe` rejects the request with `"property status should not exist"` because `status` is not a property of `PaginationQueryDto`.

**WRONG approach**:
```typescript
@Get()
findAll(
  @Query() query: PaginationQueryDto,
  @Query('status') status?: string,  // ❌ ValidationPipe rejects this
) { ... }
```

**CORRECT approach**:
```typescript
// dto/payment-query.dto.ts
export class PaymentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}

@Get()
findAll(@Query() query: PaymentQueryDto) {  // ✅ status is validated
  const { page, limit, search, status } = query;
  ...
}
```

### Gotcha: Frontend Testing Infrastructure
The `apps/web` workspace currently lacks a test runner and `@testing-library/react` dependencies. Any unit tests for frontend components (e.g., `DebouncedSearchInput`) cannot be executed until testing infrastructure is installed.
