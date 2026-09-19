# data-table-ssp Specification

## Purpose

Define the behavior of the generic `DataTable` component for all entity list views, providing server-side pagination, loading states, empty states, and action callbacks without coupling to specific entity types.

## Requirements

### Requirement: DataTable MUST accept generic data, columns, and toolbar

The `DataTable` component MUST accept `data`, `columns`, `toolbar` (render prop), `isLoading`, `pagination` state, and `onPaginationChange` handler. It SHALL render the toolbar above the table and pass pagination state to TanStack Table.

### Requirement: Searchable fields MUST be defined per entity

Before creating column definitions and toolbar filters for a new entity, the developer MUST ask the user which fields should be searchable. The `search` parameter and any additional filters MUST be tailored to the specific entity and user requirements.

**Mandatory questions for every entity**:
1. "¿Por qué campos quieres buscar en la tabla de {entidad}?" (e.g., nombre, cédula, descripción, monto)
2. "¿Necesitas filtros adicionales además de búsqueda?" (e.g., status, fecha, categoría)
3. "¿Qué columnas deben mostrarse en la tabla?"

The answers MUST be documented in the entity's delta spec before implementation.

#### Scenario: Render with valid configuration

- GIVEN a `DataTable` with `columns`, `data`, and `toolbar` props
- WHEN the component mounts
- THEN it renders the toolbar and a table with rows matching the column definitions

### Requirement: DataTable MUST operate in manualPagination mode

The `DataTable` MUST configure TanStack Table with `manualPagination: true`. Page changes SHALL trigger the `onPaginationChange` callback without modifying local data.

#### Scenario: User navigates to next page

- GIVEN a `DataTable` on page 1 with `manualPagination` enabled
- WHEN the user clicks the next page button
- THEN `onPaginationChange` is called with `{ pageIndex: 1, pageSize: 10 }`
- AND the table does not filter or slice local data

### Requirement: DataTable MUST display loading state

When `isLoading` is `true`, the `DataTable` MUST render a visual loading indicator (Skeleton or Spinner) covering the table body. Data rows MUST NOT be rendered during loading.

#### Scenario: Data is fetching

- GIVEN `isLoading` is `true` and `data` is empty
- WHEN the component renders
- THEN it displays a Skeleton loader instead of table rows

### Requirement: DataTable MUST display empty state

When `isLoading` is `false` and `data.length === 0`, the `DataTable` MUST render an empty state message in a single cell spanning all columns.

#### Scenario: No results after search

- GIVEN `isLoading` is `false` and `data` is an empty array
- WHEN the component renders
- THEN it displays "No hay datos para mostrar" in a full-width cell (`colSpan={columns.length}`)

### Requirement: DataTable MUST support action callbacks via meta

The `DataTable` MUST support passing action callbacks (e.g., `onEdit`, `onDelete`) through `table.options.meta`. Action columns SHALL invoke these callbacks with the row's original data.

#### Scenario: Edit action triggered

- GIVEN an actions column configured to use `meta.onEdit`
- WHEN the user clicks the edit button on a row
- THEN `meta.onEdit(row.original)` is invoked

### Requirement: State SHOULD be preserved after mutations

After a successful mutation (create, edit, void), the parent page SHOULD trigger a refetch that preserves the current `pageIndex`, `pageSize`, and `search` filters.

#### Scenario: Edit modal closes successfully

- GIVEN the user is on page 2 with search "juan"
- WHEN the user edits a patient and the mutation succeeds
- THEN the query cache is invalidated
- AND the table refetches with `page=2` and `search=juan`

## Implementation Notes

### Gotcha: Cache Invalidation Granularity
When using TanStack Query with paginated data, mutations should invalidate the specific `queryKey` including pagination params (`['patients', page, limit, search]`), not just the base key (`['patients']`). Invalidating only the base key may cause stale data or incorrect pagination state after mutations.

**Recommended pattern**:
```typescript
// Invalidate both the paginated list and the specific entity
void queryClient.invalidateQueries({ queryKey: ['patients'] }); // broad invalidation
void queryClient.invalidateQueries({ queryKey: ['patients', page, limit, search] }); // specific
```

### Gotcha: Passing Additional Filters to DataTable
When a list view requires filters beyond basic search (e.g., `status`, `dateRange`), these filters MUST be included in the query object passed to the paginated hook and service, and reflected in the `queryKey`.

**WRONG approach** — filters not in queryKey:
```typescript
const [status, setStatus] = useState('');
const { data } = usePaginatedPayments({ page, limit, search }); // ❌ status missing
// Changing status won't trigger refetch, and status isn't sent to API
```

**CORRECT approach** — filters in queryKey and service params:
```typescript
// hook
export function usePaginatedPayments(query?: GetPaymentsQuery) {
  return useQuery({
    queryKey: ['payments', query?.page, query?.limit, query?.search, query?.status],
    queryFn: () => getPaginatedPayments(query),
  });
}

// service
export interface GetPaymentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;  // ✅ part of the query object
}

// page
const [status, setStatus] = useState('');
const { data } = usePaginatedPayments({ page, limit, search, status }); // ✅ reflected in queryKey
```

### Gotcha: Docker Volume Sync for New Test Files
When creating new test files (e.g., `patients.e2e-spec.ts`) on macOS with Docker Desktop, the bind mount may not immediately sync the new file into the container. This causes `jest` to report "No tests found" even when the file exists on the host.

**Resolution**: Restart the API container after creating new test files:
```bash
docker compose -f docker-compose.dev.yml restart api
```

### Gotcha: Frontend Lint Dependencies
The `apps/web` workspace references `@typescript-eslint/eslint-plugin` in `eslint.config.mjs` but the package is not listed in `apps/web/package.json` `devDependencies`. This causes `pnpm run lint` to fail with `ERR_MODULE_NOT_FOUND`. This is a pre-existing issue unrelated to the DataTable change but blocks verification.

**Resolution**: Install the missing dependency in `apps/web`:
```bash
pnpm --filter web add -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
```
