# Exploration: reports-page-ssp

## Current State

### Backend
- `GET /reports/consolidated` and `GET /reports/detail` are thin controller pass-throughs in `apps/api/src/reports/reports.controller.ts`.
- Both endpoints currently accept only `from`, `to`, `groupBy?`, and `type?` as raw query params; they do **not** use a paginated DTO.
- `reports.service.ts` returns **raw arrays**, not `PaginatedResponseDto`.
- `consolidated`:
  - pulls `payment` rows with `status = COMPLETED`
  - pulls `expense` rows with `status = ACTIVE`
  - groups in-memory by `day | week | month`
  - returns one aggregated record per period
- `detail`:
  - returns a unified transaction array sorted by `date DESC`
  - supports `type = all | consultation | lab | expense`
  - includes consultation/lab payment data and expense rows in one feed

### Fields Available for Search/Filter
- Shared time filters: `from`, `to`, `groupBy`, `type`
- `consolidated` usable fields today: `period`, `periodStart`, `periodEnd`, `income.*`, `expenses.*`, `net.*`
- `detail` usable fields today:
  - consultation/lab: `patientName`, `doctorName`, `description`, `paymentMethods`, `status`, `recordType`
  - expense: `categoryName`, `description`, `status`, `recordType`

### Frontend
- Page: `apps/web/src/app/(dashboard)/reportes/page.tsx`
- Current wiring:
  - local `activeTab` state: `consolidado | detalle`
  - shared filter state for both tabs: `from`, `to`, `groupBy`, `type`
  - both hooks are fetched in parallel: `useConsolidatedReports(params)` and `useDetailReports(params)`
  - exports are page-level actions: PDF and Excel, using the active tab's dataset
- Current UI:
  - custom buttons for tabs
  - native inputs/selects for filters
  - plain HTML tables for both datasets
  - no row actions
  - no shared query state beyond the common filter object
- Report support code already exists:
  - `apps/web/src/features/reports/hooks/use-reports.ts`
  - `apps/web/src/features/reports/services/reports.service.ts`
  - `apps/web/src/features/reports/components/report-pdf.tsx`
  - `apps/web/src/features/reports/components/report-excel.tsx`
  - `apps/web/src/features/reports/components/report-export-sidebar.tsx`

### Generic Pieces Already Available
- `apps/web/src/shared/components/ui/data-table.tsx` — manual pagination, loading/empty states, meta callbacks
- `apps/web/src/shared/components/ui/debounced-search-input.tsx` — search field with debounce
- `apps/web/src/shared/components/ui/filter-select.tsx` — reusable select filter
- `apps/api/src/common/dto/pagination-query.dto.ts` — `page`, `limit`, `search`
- `apps/api/src/common/dto/paginated-response.dto.ts` — `{ data, meta }`

## Affected Areas

- `apps/api/src/reports/reports.controller.ts` — must accept entity-specific query DTOs if SSP is added
- `apps/api/src/reports/reports.service.ts` — needs paging/search logic if endpoints become server-paginated
- `apps/api/src/reports/dto/query-reports.dto.ts` — likely needs extended DTOs for page/limit/search + report filters
- `apps/web/src/features/reports/services/reports.service.ts` — add typed paginated query contracts
- `apps/web/src/features/reports/hooks/use-reports.ts` — add per-tab paginated hooks
- `apps/web/src/app/(dashboard)/reportes/page.tsx` — replace hand-built tables with `DataTable` and toolbar state
- `apps/web/src/features/reports/components/*` — define columns, toolbars, and tab-specific filter controls

## Approaches

1. **Keep the page as analytics/export-only** — preserve current arrays and only refactor UI reuse.
   - Pros: lowest risk, no backend pagination work.
   - Cons: not SSP; tables still load full datasets.
   - Effort: Low.

2. **Make each tab a server-paginated list with shared date filters** — `consolidado` and `detalle` each get their own pagination/search state.
   - Pros: fits the existing `DataTable`/pagination DTO stack.
   - Cons: `consolidated` is aggregated, so paging must happen after grouping or via a dedicated query shape.
   - Effort: Medium-High.

3. **Paginate only `detalle`, keep `consolidado` as grouped summary** — one true SSP table plus one analytical summary.
   - Pros: best matches data shape and keeps summary fast.
   - Cons: mixed interaction model across tabs.
   - Effort: Medium.

## Recommendation

Use **separate paginated query state per tab**, but keep the shared date range (`from`/`to`) page-level.

Recommended shape:
- `Consolidado`: own `{ page, limit, search?, groupBy?, type? }` state; search should be limited to `period` / period labels unless backend exposes more meaningful grouped fields.
- `Detalle`: own `{ page, limit, search?, type?, status?, recordType? }` state; search should target `patientName`, `doctorName`, `description`, `categoryName`, and `paymentMethods`.
- Keep exports as page-level actions; they should use the currently active tab and current filters.

Extra DTO fields likely needed beyond `page/limit/search`:
- `groupBy` and `type` remain required for consolidated/detail semantics.
- For `Detalle`, add `status` and `recordType` only if the UX needs explicit filters beyond free-text search.
- `search` alone is not enough for both tabs if the UI should support precise filtering.

Recommended row actions / page-level actions:
- No row actions are needed from the current design.
- Keep `PDF` / `Excel` as page-level actions.
- If SSP is introduced, `Detalle` could optionally gain `Ver` / `Descargar` row actions later, but that is not required now.

## Risks

- `consolidated` is an aggregated result, so forcing standard pagination may feel artificial unless pagination happens after grouping.
- Current endpoints are array-based; switching to SSP requires API contract changes plus frontend refactor.
- The reports page already has export-job state; adding SSP should avoid coupling pagination state to the export sidebar.
- If `ValidationPipe` is strict, backend query DTOs must include every filter the frontend sends.

## Ready for Proposal

Yes.

The page can move to SSP cleanly, but the proposal should decide whether `Consolidado` is truly paginated or remains a grouped summary with only search/filter reuse.
