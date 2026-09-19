# Proposal: Reports Page SSP

## Intent

Move `/reportes` from full-array analytics loading to server-side paginated search/filtering per tab, so large report datasets stay responsive while preserving the current export flow and date-range/group-by/type filters.

## Scope

### In Scope
- Add SSP behavior to `Consolidado` and `Detalle` tabs on `/reportes`.
- Keep `from`, `to`, `groupBy`, and `type` filters.
- Keep PDF/Excel exports as page-level actions for the active tab.
- Give each tab its own pagination and search state.

### Out of Scope
- Row actions.
- Export redesign or async export jobs.
- New report types or business rules.

## Capabilities

### Reused Capabilities
- `data-table-ssp`: table pagination, empty/loading states, and toolbar-driven SSP behavior.
- `pagination-dtos`: backend `page/limit/search` contracts and paginated response shape.

### New Capability
- `reports-page-tab-ssp`: reports-page-specific tab state, filters, and tab-aware search rules.

## Approach

- Use separate query state per tab so `Consolidado` and `Detalle` do not share page/search state.
- `Detalle` should behave like a list: paginate the returned transactions directly.
- `Consolidado` is aggregated, so paging may need special handling after grouping or a dedicated paginated aggregation shape.
- Keep the shared date-range/group-by/type filters at page level, then apply tab-local pagination/search on top.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/reports/reports.controller.ts` | Modified | Accept paginated query DTOs for both report endpoints. |
| `apps/api/src/reports/reports.service.ts` | Modified | Return paginated data/meta instead of raw arrays. |
| `apps/api/src/reports/dto/` | New/Modified | Add tab-aware query DTOs for SSP + existing filters. |
| `apps/web/src/app/(dashboard)/reportes/page.tsx` | Modified | Split per-tab state and wire paginated table UX. |
| `apps/web/src/features/reports/hooks/use-reports.ts` | Modified | Add tab-specific paginated hooks. |
| `apps/web/src/features/reports/services/reports.service.ts` | Modified | Send paginated query params and consume paginated responses. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Consolidated pagination feels artificial | Medium | Treat aggregated paging explicitly and keep tab-specific UX. |
| API contract drift | Medium | Reuse `pagination-dtos` and validate all sent filters. |
| Export state accidentally couples to pagination | Low | Keep exports page-level and keyed to the active tab only. |

## Rollback Plan

Revert the reports controller/service DTO changes and restore the page to fetching raw arrays per tab. Keep the existing export flow intact so the rollback only removes SSP behavior.

## Success Criteria

- [ ] Both tabs paginate and search independently.
- [ ] Existing filters and exports still work.
- [ ] `Detalle` behaves like a normal list; `Consolidado` remains correct despite aggregation.
- [ ] Backend returns paginated responses instead of raw arrays.
