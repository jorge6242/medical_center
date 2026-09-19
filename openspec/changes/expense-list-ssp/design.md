# Design: Expense List SSP

## Technical Approach

Convert `/egresos` to the shared server-side pagination pattern already used by patients/doctors/payments. The API will accept a typed query DTO extending `PaginationQueryDto`, filter by `categoryName` and `description`, and return `PaginatedResponseDto<ExpenseResponseDto>`. The Next.js page will keep the existing create, view, and void modals, but replace the custom table with the shared `DataTable` + toolbar + local pagination state.

## Architecture Decisions

### Decision: Extend the shared pagination DTO instead of adding ad-hoc query params

| Choice | Tradeoff | Decision |
|---|---|---|
| `ExpenseQueryDto extends PaginationQueryDto` | One extra DTO file, but validates `page/limit/search` in one contract | Use it. Keeps `ValidationPipe` happy and matches the pagination-dtos spec. |
| Separate `@Query('search')` params | Simpler controller signature, but breaks whitelist validation | Reject. |

### Decision: Keep expense search server-side and entity-specific

| Choice | Tradeoff | Decision |
|---|---|---|
| Search on `categoryName` + `description` with Prisma `OR` / `contains` / `insensitive` | Slightly more query logic | Use it. Matches the requested UX and avoids frontend filtering drift. |
| Client-side filtering over fetched rows | Easier initially, but pagination/search would be inconsistent | Reject. |

### Decision: Preserve modal flows outside the table

| Choice | Tradeoff | Decision |
|---|---|---|
| Keep `ExpenseForm`, detail modal, and void modal in the page component | Slightly more page state, but minimal regression risk | Use it. `DataTable` only handles list rendering and row callbacks. |
| Move modals into table meta/actions layer | Tighter coupling and harder rollback | Reject. |

## Data Flow

```text
User types search / changes page
        ↓
Expenses page state (search, pagination)
        ↓
usePaginatedExpenses(query)
        ↓
GET /expenses?page=&limit=&search=
        ↓
ExpensesController → ExpenseQueryDto
        ↓
ExpensesService builds Prisma where + transaction(count,data)
        ↓
PaginatedResponseDto<ExpenseResponseDto>
        ↓
TanStack Query cache
        ↓
DataTable rows + status badge + row actions
        ↓
Existing View / Void / Create modals
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/expenses/dto/expense-query.dto.ts` | Create | Extends `PaginationQueryDto` with search contract for expenses. |
| `apps/api/src/expenses/expenses.controller.ts` | Modify | Accept `ExpenseQueryDto` in `GET /expenses`. |
| `apps/api/src/expenses/expenses.service.ts` | Modify | Add paginated search, transaction-based count/data queries, and paginated response output. |
| `apps/web/src/features/expenses/services/expenses.service.ts` | Modify | Add paginated query params and paginated response types. |
| `apps/web/src/features/expenses/hooks/use-expenses.ts` | Modify | Add `usePaginatedExpenses(query)` and invalidate the paginated list on create/void. |
| `apps/web/src/features/expenses/components/expense-toolbar.tsx` | Create | Search-only toolbar using `DebouncedSearchInput`. |
| `apps/web/src/features/expenses/components/expense-columns.tsx` | Create | DataTable columns including status badge and row action callbacks. |
| `apps/web/src/app/(dashboard)/egresos/page.tsx` | Modify | Replace custom table with `DataTable`, toolbar, pagination state, and preserved modals. |

## Interfaces / Contracts

```ts
export class ExpenseQueryDto extends PaginationQueryDto {}

// Response shape reused by the page
type PaginatedExpenseResponse = PaginatedResponseDto<ExpenseResponse>;
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Search query building, pagination math, DTO validation | Jest tests for `ExpensesService` and DTO behavior. |
| Integration | `GET /expenses` returns `data` + `meta` and respects search/page params | Supertest against the API route. |
| UI | Toolbar/search state, page reset on search, row actions still open existing modals | Verify through component/page-level behavior already covered by the existing frontend patterns; no new frontend runner is required. |

## Migration / Rollout

No migration required. The endpoint remains `GET /expenses`; only the response becomes paginated. Existing create, view, and void flows stay intact.

## Open Questions

- [ ] None.
