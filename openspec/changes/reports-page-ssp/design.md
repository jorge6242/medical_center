# Design: Reports Page SSP

## Technical Approach

Refactor `/reportes` into two independent server-driven tab views that reuse the existing `DataTable`, `DebouncedSearchInput`, `FilterSelect`, `PaginationQueryDto`, and `PaginatedResponseDto` patterns. Keep the page-level export buttons, but bind them to the active tab’s current filter/search state. `Detalle` becomes a true paginated list; `Consolidado` remains an aggregated summary with pagination applied after grouping so totals stay correct.

## Architecture Decisions

| Decision | Options | Rationale |
|---|---|---|
| Tab state isolation | Shared page state vs per-tab state | Per-tab `{page, limit, search}` avoids cross-tab overwrites and matches the existing UX requirement. |
| Consolidado pagination model | Paginate raw rows vs paginate grouped periods | Paginate after grouping. Raw-row paging would distort totals; grouped paging preserves summary correctness. |
| Query contracts | Single DTO with optional fields vs tab-specific DTOs extending `PaginationQueryDto` | Use tab-specific DTOs for clarity and validation: `ConsolidatedReportsQueryDto` and `DetailReportsQueryDto` extend `PaginationQueryDto` and add `from`, `to`, `groupBy`, `type`. `Detail` can add optional field scope if needed later. |
| Exports | Table-level actions vs page-level actions | Keep exports at page level so PDF/Excel always reflect the active tab and avoid coupling exports to pagination controls. |

## Data Flow

```text
User changes tab/filter/search/page
   → page stores state per tab
   → active tab params assembled
   → useConsolidatedReports / useDetailReports
   → reports.service builds query string
   → GET /reports/consolidated|detail
   → ReportsService applies filters + pagination
   → returns PaginatedResponseDto<T>
   → DataTable renders rows + meta
   → export buttons consume active tab state
```

`Consolidado` flow: fetch all matching transactions, group in service, sort groups, then slice by `page/limit` and return `meta.total = groupCount`.

`Detalle` flow: fetch matching detail records, sort desc, apply search filter, then slice and return `meta.total = filteredRecordCount`.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/app/(dashboard)/reportes/page.tsx` | Modify | Split state by tab, wire `DataTable`, keep exports page-level. |
| `apps/web/src/features/reports/hooks/use-reports.ts` | Modify | Add tab-aware paginated hooks and query keys. |
| `apps/web/src/features/reports/services/reports.service.ts` | Modify | Send `page`, `limit`, `search` plus existing filters; consume paginated responses. |
| `apps/api/src/reports/dto/query-reports.dto.ts` | Modify | Extend with tab-specific paginated DTOs; keep shared filter enums. |
| `apps/api/src/reports/reports.controller.ts` | Modify | Accept DTOs instead of raw query strings. |
| `apps/api/src/reports/reports.service.ts` | Modify | Return `PaginatedResponseDto` for both endpoints. |
| `apps/api/src/common/dto/pagination-query.dto.ts` | Modify | Reused as base; no behavior change. |
| `apps/api/src/common/dto/paginated-response.dto.ts` | Modify | Reused as return contract; no behavior change. |

## Interfaces / Contracts

```ts
export class DetailReportsQueryDto extends PaginationQueryDto {
  from!: string;
  to!: string;
  groupBy?: ReportGroupBy;
  type?: ReportType;
}

export class ConsolidatedReportsQueryDto extends PaginationQueryDto {
  from!: string;
  to!: string;
  groupBy?: ReportGroupBy;
  type?: ReportType;
}
```

Response contract:

```ts
type DetailReportResponse = PaginatedResponseDto<DetailRecord>;
type ConsolidatedReportResponse = PaginatedResponseDto<ConsolidatedRecord>;
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | DTO validation and paging helpers | Jest tests for DTO inheritance/validation and service pagination slices. |
| Integration | API responses for both endpoints | Supertest checks page/limit/search, `meta.total`, and active-tab filters. |
| E2E | `/reportes` tab switching and exports | Verify each tab preserves its own state and exports use the active tab. |

## Migration / Rollout

No migration required. The change is API/UI contract-only.

## Open Questions

- [ ] Should `Consolidado` search target only period labels, or also derived summary fields like totals?
