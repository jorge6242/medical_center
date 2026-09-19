# Proposal: Expense List SSP

## Intent

Move `/egresos` from a custom table to the shared SSP DataTable pattern so expenses gain server-side pagination and search while keeping the current create, detail, and void modal flows intact.

## Scope

### In Scope
- Add pagination + search to `GET /expenses`.
- Search by `categoryName` and `description`.
- Replace the list UI with DataTable meta callbacks for `Ver` and `Anular`.
- Preserve existing create modal and detail/void modal behavior.

### Out of Scope
- New expense filters beyond search and status display.
- Changes to expense business rules or voiding semantics.
- Changes to create/edit/void API payloads.

## Capabilities

### Reused Capabilities
- `data-table-ssp`: table shell, server-side state, row actions, and pagination UI.
- `pagination-dtos`: shared request/response contract for page, limit, sort, and meta.

### New Capability
- `expense-list-actions`: expense-specific DataTable actions and modal wiring for view/void flows.

## Approach

Mirror the patients SSP pattern, but keep it simpler than payments: one list endpoint, two search fields, visible status, and action callbacks only. Extend the API to accept paging/search params and return pagination metadata; keep the existing modals mounted from the page so the UX stays stable during the table migration.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/expenses/expenses.controller.ts` | Modified | Accept pagination/search query params. |
| `apps/api/src/expenses/expenses.service.ts` | Modified | Apply search + pagination and return DTO with meta. |
| `apps/web/src/app/(dashboard)/egresos/page.tsx` | Modified | Swap custom table for SSP DataTable, preserve modals. |
| `apps/web/src/features/egresos/*` | Modified | Table columns, query layer, and action callbacks. |

## Risks and Mitigation

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Modal regressions during table swap | Medium | Keep modal state and handlers in the page while only replacing the row renderer. |
| Search mismatch with backend fields | Medium | Bind search explicitly to `categoryName` and `description`, add contract checks. |
| Pagination breaks current list assumptions | Low | Default to existing page size and preserve visible status column. |

## Rollback Plan

Revert the page to the current custom table implementation and restore the previous `GET /expenses` call shape. Because modal flows remain separate, rollback can be limited to the list endpoint and list page only.

## Success Criteria

- [ ] `/egresos` lists expenses through SSP DataTable with pagination.
- [ ] Search works for `categoryName` and `description`.
- [ ] `Ver` and `Anular` still open the existing modals.
- [ ] `GET /expenses` returns paginated results with meta and no UI regressions.
