# data-table-ssp Specification

## Purpose

Define the behavior of the generic `DataTable` component for all entity list views, providing server-side pagination, loading states, empty states, and action callbacks without coupling to specific entity types.

## Requirements

### Requirement: DataTable MUST accept generic data, columns, and toolbar

The `DataTable` component MUST accept `data`, `columns`, `toolbar` (render prop), `isLoading`, `pagination` state, and `onPaginationChange` handler. It SHALL render the toolbar above the table and pass pagination state to TanStack Table.

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
