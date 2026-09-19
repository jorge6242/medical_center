# Exploration: expense-list-ssp

## Current State

### Backend
- `GET /expenses` currently returns `Promise<ExpenseResponseDto[]>` — a raw array, not paginated.
- It is tenant-scoped and hard-filters to active expenses only: `where: { tenantId, status: 'ACTIVE' }`.
- It does **not** accept `PaginationQueryDto` or any search/filter DTO today.
- Useful expense fields for SSP/search:
  - `categoryName`
  - `description`
  - `amountUsd`
  - `status`
  - `createdAt`
  - `amountBs` (display only, probably not a primary search field)
- Existing status concept:
  - `ExpenseStatus = ACTIVE | VOIDED`
  - void action sets `status = 'VOIDED'`, `voidedBy`, and `voidReason`.
- `GET /expenses/:id` already returns the full expense snapshot, including `voidReason`.

### Frontend
- The expenses list page is `apps/web/src/app/(dashboard)/egresos/page.tsx`.
- It is a client page with a custom `<table>` and manual modals for create/view/void.
- Data access is via `useExpenses()` → `getExpenses()`.
- Current row actions:
  - view
  - void (only when `status === 'ACTIVE'`)
  - create lives as a top-level button, not a row action.
- There is no pagination/search/filter UI yet.

### Generic Pieces Already Available
- `apps/web/src/shared/components/ui/data-table.tsx` — manual pagination + meta callbacks.
- `apps/web/src/shared/components/ui/debounced-search-input.tsx` — search input with debounce.
- `apps/web/src/shared/components/ui/filter-select.tsx` — simple select filter.
- `apps/api/src/common/dto/pagination-query.dto.ts` — `page`, `limit`, `search`.
- `apps/api/src/common/dto/paginated-response.dto.ts` — `{ data, meta }` response shape.

## Affected Areas

- `apps/api/src/expenses/expenses.controller.ts` — change `GET /expenses` to accept pagination query DTO and return paginated response.
- `apps/api/src/expenses/expenses.service.ts` — implement count + page query + search, likely with transaction.
- `apps/api/src/expenses/dto/*` — add an expense query DTO only if we decide to extend beyond `search`.
- `apps/web/src/features/expenses/services/expenses.service.ts` — add paginated query support.
- `apps/web/src/features/expenses/hooks/use-expenses.ts` — add paginated query hook.
- `apps/web/src/features/expenses/components/*` — create columns and toolbar for `DataTable`.
- `apps/web/src/app/(dashboard)/egresos/page.tsx` — replace the raw table with `DataTable` composition.

## Approaches

1. **Mirror the existing patients/payments SSP pattern** — add `page/limit/search`, return `PaginatedResponseDto<ExpenseResponseDto>`, and render the list with `DataTable` + toolbar.
   - Pros: reuses existing generic pieces, lowest cognitive overhead, consistent with current SSP patterns.
   - Cons: search is currently hardcoded only on the backend design; UI refactor is larger than a table swap.
   - Effort: Medium.

2. **Add extra filters now (status / category)** — extend the query DTO beyond `search` to support `status` and/or `categoryId`.
   - Pros: better admin control for active vs voided expenses and by category.
   - Cons: more DTO/API/UI surface and more query-key branching than a first SSP pass.
   - Effort: Medium-High.

## Recommendation

Use **Approach 1** for the first SSP slice.

Recommended search fields:
- `categoryName`
- `description`

Optional/less useful for v1 search:
- `amountUsd` (only if you want numeric-text search)
- `createdAt` (usually better as a future date filter, not free-text search)

Recommended filters for v1:
- none required beyond search; keep `status` visible in columns and preserve the existing void action.
- If a filter is desired later, `status` is the best first filter because the entity already has `ACTIVE`/`VOIDED`.

Recommended row actions and meta callbacks:
- `onView(expense)` — open detail modal
- `onVoid(expense)` or `onVoid(id)` — trigger void flow for active expenses
- `onCreate` is **not** a row action; keep it as the page-level button/modal
- No detail route is required unless the UX wants a standalone expense page later

## Risks

- The current controller/service always hides voided expenses; adding a `status` filter would require changing the default list behavior.
- Search across `categoryName` is easy because the field is denormalized on `Expense`; no nested relation search is needed.
- The existing expenses page already owns create/view/void modals, so the `DataTable` refactor will need to preserve those behaviors in callbacks.
- Compared with patients, complexity is slightly higher because the current page also manages a full detail modal and a void reason modal.
- Compared with payments, expenses are simpler: no nested item types, no receipt/adjustment actions, and no extra query-state complexity.

## Ready for Proposal

Yes. The change is clear enough for proposal/spec work. Next step should confirm whether v1 search should include `amountUsd` or stay limited to `categoryName` + `description`, and whether a `status` filter belongs in the first slice.
