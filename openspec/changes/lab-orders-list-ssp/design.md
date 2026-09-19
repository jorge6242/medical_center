# Design: Lab Orders List SSP

## Technical Approach

Convert the lab-orders list to the shared SSP pattern already used elsewhere in the app: backend pagination via `PaginatedResponseDto`, frontend manual pagination via `DataTable`, and request-driven search/filter state. The existing `Pagar` row action and current payment/create modals remain unchanged; only the list transport and composition change.

No Prisma schema changes are required. The current `LabOrder` + `LabOrderTest` shape already exposes the fields needed for search and display.

## Architecture Decisions

### Decision: Extend the shared pagination DTO instead of adding ad hoc query params

**Choice**: Create `LabOrderQueryDto extends PaginationQueryDto` with `status?: LabOrderStatus`.

**Alternatives considered**: Keep raw query parsing in controller; add separate `status` endpoint.

**Rationale**: Reuses the existing pagination contract, keeps validation centralized, and matches other SSP list endpoints.

### Decision: Implement search in the service with a single Prisma `where` clause

**Choice**: Search `id`, `patient.name`, `patient.documentId`, and `tests.some.testName` with case-insensitive OR conditions, scoped by `tenantId` and optional `status`.

**Alternatives considered**: Client-side filtering; separate repository layer.

**Rationale**: The list must be request-driven, and the service already owns Prisma access. The query stays explicit and easy to test.

### Decision: Keep payment behavior as a row meta callback

**Choice**: Preserve `Pagar` as a `DataTable` meta callback that opens the existing selected-order modal.

**Alternatives considered**: Move payment flow into the table component; redesign the modal flow.

**Rationale**: Minimizes regression risk and keeps the refactor limited to list presentation and query state.

## Data Flow

`page.tsx` → local state (`search`, `status`, `pageIndex`, `pageSize`) → `useLabOrdersQuery(...)` → `GET /lab-orders?page&limit&search&status` → `LabOrdersController` → `LabOrdersService.findAll()` → Prisma `count + findMany` in a transaction → `createPaginatedResponse()` → React Query cache → `DataTable` rows + pagination controls.

```text
Toolbar (search/status) ─┐
Pagination controls ─────┼──> Page state ─> hook/service ─> API ─> Prisma
Pagar action ────────────┘                         │
                                                   └─> existing payment modal
```

Search/status changes MUST reset `pageIndex` to `0` so new filters start on the first page.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/lab-orders/dto/lab-order-query.dto.ts` | Create | Query DTO extending `PaginationQueryDto` with `status` validation. |
| `apps/api/src/lab-orders/lab-orders.controller.ts` | Modify | Accept query DTO and return paginated response. |
| `apps/api/src/lab-orders/lab-orders.service.ts` | Modify | Add paginated search/status query and return `PaginatedResponseDto`. |
| `apps/web/src/features/lab-orders/services/lab-orders.service.ts` | Modify | Add paginated response/query types and API call signature. |
| `apps/web/src/features/lab-orders/hooks/use-lab-orders.ts` | Modify | Add query-keyed paginated hook and keep detail/create hooks intact. |
| `apps/web/src/features/lab-orders/components/lab-orders-toolbar.tsx` | Create | Compose `DebouncedSearchInput` + `FilterSelect` for the page. |
| `apps/web/src/features/lab-orders/components/lab-orders-columns.tsx` | Create | Define `DataTable` columns and the `Pagar` meta callback. |
| `apps/web/src/app/(dashboard)/laboratorio/ordenes/page.tsx` | Modify | Replace the custom table with `DataTable` + toolbar + pagination state; keep modals. |

## Interfaces / Contracts

```ts
export interface LabOrderQuery {
  page: number;
  limit: number;
  search?: string;
  status?: 'PENDING' | 'PAID' | 'VOIDED';
}
```

`GET /lab-orders` SHALL return `{ data: LabOrderRow[]; meta: { total, page, limit, totalPages, hasNextPage, hasPreviousPage } }`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Query DTO validation and Prisma `where` construction | Jest tests for service branches: no search, search, status, combined filters. |
| Integration | `GET /lab-orders` response shape | Supertest against controller/service with seeded or mocked Prisma. |
| UI smoke | Toolbar, paging, and `Pagar` preservation | Manual browser check plus `pnpm run typecheck` in web container. |

## Migration / Rollout

No migration required. Rollout is additive and localized to one endpoint and one page.

## Open Questions

- [ ] None.
