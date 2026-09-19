# Tasks: Reports Page SSP

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 300-420 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | API + web SSP contracts | PR 1 | DTOs, controller/service responses, hooks, page wiring |
| 2 | Spec coverage + regression checks | PR 1 | Jest + manual verification for tabs, pagination, exports |

## Phase 1: Foundation / Contracts

- [ ] 1.1 Add `DetailReportsQueryDto` and `ConsolidatedReportsQueryDto` in `apps/api/src/reports/dto/query-reports.dto.ts` extending `PaginationQueryDto` with `from`, `to`, `groupBy`, and `type`.
- [ ] 1.2 Update `apps/api/src/reports/reports.controller.ts` to bind the new DTOs on `/reports/detail` and `/reports/consolidated`.
- [ ] 1.3 Update `apps/web/src/features/reports/services/reports.service.ts` types so each tab sends `page`, `limit`, `search`, and shared report filters.

## Phase 2: Core Implementation / SSP Wiring

- [ ] 2.1 Refactor `apps/api/src/reports/reports.service.ts` so `Detalle` paginates filtered rows and returns `PaginatedResponseDto` with correct `meta.total`.
- [ ] 2.2 Refactor `apps/api/src/reports/reports.service.ts` so `Consolidado` groups first, then paginates grouped results without breaking totals.
- [ ] 2.3 Update `apps/web/src/features/reports/hooks/use-reports.ts` with tab-scoped query keys and independent state per tab.
- [ ] 2.4 Replace the current `/reportes` table rendering in `apps/web/src/app/(dashboard)/reportes/page.tsx` with shared `DataTable` plus per-tab pagination/search state and page-level export actions.

## Phase 3: Testing / Verification

- [ ] 3.1 Add Jest tests for spec scenarios: tab state preservation, `Detalle` page 2/search reset, and export state isolation.
- [ ] 3.2 Add service/controller tests proving `Consolidado` keeps grouped totals correct after pagination and `Detalle` returns filtered paginated metadata.
- [ ] 3.3 Verify manually in `/reportes` that both tabs load, filters persist per tab, and PDF/Excel exports use the active tab state.

## Phase 4: Cleanup / Final Checks

- [ ] 4.1 Run backend typecheck and lint inside Docker for `apps/api` after the DTO/service changes.
- [ ] 4.2 Run frontend typecheck and lint inside Docker for `apps/web`, then do a final browser pass for tab switching and exports.
