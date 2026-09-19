# Exploration: reports-list-ssp

## Current State

### Backend
- There is **no** `GET /reports` route today.
- Current report endpoints are:
  - `GET /reports/consolidated` → returns a **raw array** of consolidated records.
  - `GET /reports/detail` → returns a **raw array** of detail records.
  - `POST /reports/generate` → queues export jobs.
  - `GET /reports/jobs/:jobId` → returns one job status object.
  - `GET /reports/jobs/:jobId/download` → streams the generated file.
- `consolidated` is grouped in-memory by `day | week | month` and combines:
  - payments with `status = COMPLETED`
  - expenses with `status = ACTIVE`
- `detail` returns a unified, date-desc sorted array for:
  - consultations
  - labs
  - expenses
- Existing fields useful for search/filtering:
  - Detail/payment side: `patientName`, `doctorName`, `description`, `paymentMethods`, `status`, `recordType`
  - Expense side: `categoryName`, `description`, `status`
  - Time slicing: `from`, `to`, `groupBy`, `type`
- Existing concepts already present:
  - `ReportGroupBy = day | week | month`
  - `ReportType = consultation | lab | expense | all`
  - export formats: `pdf | excel`
  - async job state: `pending | processing | completed | failed`

### Frontend
- The reports page is `apps/web/src/app/(dashboard)/reportes/page.tsx`.
- It is a client page with:
  - two tabs: `Consolidado` / `Detalle`
  - date inputs (`from` / `to`)
  - selects for `groupBy` and `type`
  - manual PDF / Excel export buttons
  - plain `<table>` rendering for both tabs
- Data access is via:
  - `useConsolidatedReports(params)`
  - `useDetailReports(params)`
  - `useReportJobsStore()` for local export-job tracking
- Existing actions:
  - page-level export PDF
  - page-level export Excel
  - sidebar job remove / clear completed
- There are **no row actions** in the current report tables.

### Generic Pieces Already Available
- `apps/web/src/shared/components/ui/data-table.tsx` — manual pagination + meta callbacks.
- `apps/web/src/shared/components/ui/debounced-search-input.tsx` — search input with debounce.
- `apps/web/src/shared/components/ui/filter-select.tsx` — simple select filter.
- `apps/api/src/common/dto/pagination-query.dto.ts` — `page`, `limit`, `search`.
- `apps/api/src/common/dto/paginated-response.dto.ts` — `{ data, meta }` response shape.

## Affected Areas

- `apps/api/src/reports/reports.controller.ts` — current report endpoints; needs a new paginated list endpoint if SSP is applied to report history/jobs.
- `apps/api/src/reports/reports.service.ts` — current aggregation/export logic; needs list/query logic for paginated reports.
- `apps/api/src/reports/dto/query-reports.dto.ts` — likely needs an entity-specific query DTO extending `PaginationQueryDto`.
- `apps/web/src/features/reports/services/reports.service.ts` — add paginated query types / list calls.
- `apps/web/src/features/reports/hooks/use-reports.ts` — add a paginated hook.
- `apps/web/src/app/(dashboard)/reportes/page.tsx` — replace the custom tables with `DataTable` if the page becomes a list view.
- `apps/web/src/features/reports/components/*` — create columns + toolbar for the DataTable.

## Approaches

1. **Keep current report extractor UX** — preserve `consolidated/detail` arrays and only wrap them in `DataTable` on the client.
   - Pros: minimal backend work.
   - Cons: not true SSP; no server-side paging/search.
   - Effort: Low.

2. **Apply SSP to a report-history/job list** — add a paginated list endpoint for generated reports and render it with `DataTable`.
   - Pros: fits the existing generic SSP stack cleanly.
   - Cons: current backend does not expose a list endpoint yet.
   - Effort: Medium.

3. **Apply SSP to report detail rows** — add paging/search to `GET /reports/detail` and keep consolidated as non-paginated aggregation.
   - Pros: improves the largest dataset.
   - Cons: consolidated mode still stays outside SSP; mixed UX model.
   - Effort: Medium-High.

## Recommendation

Use **Approach 2** only if the goal is a true SSP list in the reports area; otherwise the current reports page should stay as a date-driven analytics view.

Recommended search fields for a paginated reports list:
- If listing **generated jobs/history**: `jobId`, `filename`, `status`, `format`.
- If listing **detail rows** instead: `patientName`, `doctorName`, `description`, `categoryName`, `status`, `recordType`.

Recommended filters:
- Existing report filters should remain `from`, `to`, `groupBy`, `type`.
- For a job/history list, add `status` and `format`.

Additional query DTO fields beyond `page/limit/search`:
- Yes. This feature already depends on date/type semantics, so a plain `PaginationQueryDto` is not enough.
- Use an entity-specific DTO extending `PaginationQueryDto`.

Recommended row actions / meta callbacks:
- `onView(row)` — useful only if a report-history list or drill-down table is introduced.
- `onDownload(row)` — maps to generated-report downloads.
- `onExportPdf` / `onExportExcel` — **not row actions** today; they are page-level actions.
- No existing per-row actions are present in the current reports tables.

## Risks

- The current backend does not have a paginated reports list endpoint, so SSP needs a new API shape.
- `consolidated` is an aggregated analytics result, not a natural paginated collection.
- `GET /reports/jobs/:jobId` currently returns one job, but there is no `GET /reports/jobs` list for the download sidebar/history.
- `getJobStatus()` currently sets `completedAt` to `createdAt` when completed; that is a data correctness issue.
- `downloadReport()` throws generic `Error` for pending/failed/expired states, so error mapping may need cleanup before exposing it through a list UX.

## Ready for Proposal

Yes, but only after clarifying **which reports list is intended**:
1. report-history/job list, or
2. paginated detail rows.

The current codebase strongly suggests the reports area is an analytics/export view, not yet a server-paginated list.
