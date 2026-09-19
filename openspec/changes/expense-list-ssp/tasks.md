# Tasks: Expense List SSP

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 260-360 |
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
| 1 | Paginated expense API + tests | PR 1 | Backend DTO/controller/service + spec coverage |
| 2 | SSP expenses page wiring | PR 1 | DataTable, toolbar, columns, and modal callbacks |

## Phase 1: Foundation / API contract

- [x] 1.1 Create `apps/api/src/expenses/dto/expense-query.dto.ts` extending `PaginationQueryDto` with validated `search` support.
- [x] 1.2 Update `apps/api/src/expenses/expenses.controller.ts` so `GET /expenses` accepts `ExpenseQueryDto` and returns `PaginatedResponseDto<ExpenseResponseDto>`.
- [x] 1.3 Confirm the shared pagination DTOs from `apps/api/src/common/dto/` are the only contract used by the list endpoint.

## Phase 2: Core implementation / UI wiring

- [x] 2.1 Implement paginated search in `apps/api/src/expenses/expenses.service.ts` using tenant scope plus `categoryName` OR `description` Prisma `contains` filters.
- [x] 2.2 Update `apps/web/src/features/expenses/services/expenses.service.ts` to send `page`, `limit`, and `search`, and to consume paginated `data/meta`.
- [x] 2.3 Add `usePaginatedExpenses(query)` in `apps/web/src/features/expenses/hooks/use-expenses.ts` and invalidate the list after create/void mutations.
- [x] 2.4 Create `expense-toolbar.tsx` and `expense-columns.tsx` with debounced search, visible `ACTIVE / VOIDED` status, and `Ver` / `Anular` row actions.
- [x] 2.5 Replace the custom table in `apps/web/src/app/(dashboard)/egresos/page.tsx` with shared `DataTable` plus local pagination state while keeping create/detail/void modals in-page.

## Phase 3: Testing / Verification

- [x] 3.1 Add Jest coverage for `ExpenseQueryDto` validation and `ExpensesService` search/pagination behavior from the spec scenarios.
- [x] 3.2 Add controller/integration tests for `GET /expenses` returning `data` + `meta` and honoring page/limit/search.
- [ ] 3.3 Manually verify `/egresos` shows paginated rows, resets to page 1 on search, and still opens `Ver`/`Anular` modals.

## Phase 4: Cleanup / Final checks

- [ ] 4.1 Run backend typecheck and lint inside Docker; fix any DTO/service/import issues introduced by the list refactor.
- [ ] 4.2 Run a final browser pass on the expenses page to confirm status labels, row actions, and create flow remain unchanged.
