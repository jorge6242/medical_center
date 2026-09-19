# Proposal: Lab Orders List SSP

## Intent

Convert `GET /lab-orders` and the laboratorio orders page to the standard SSP pattern so the list supports real pagination, search, and status filtering without breaking the existing `Pagar` flow or modal behavior.

## Scope

### In Scope
- Paginated `GET /lab-orders` with `page`, `limit`, `search`, and `status`.
- Search across `id`, `patient.name`, `patient.documentId`, and `tests.testName`.
- Replace the custom table with SSP-style table/toolbar composition while preserving row meta actions.

### Out of Scope
- New lab order lifecycle actions.
- Payment modal redesign or changes to the existing create/payment flows.
- PDF/receipt work.

## Capabilities

### Reused Capabilities
- `data-table-ssp`: generic DataTable, toolbar, manual pagination, meta callbacks.
- `pagination-dtos`: `PaginationQueryDto`, `PaginatedResponseDto`, entity-specific DTO extension.

### New Capabilities
- `lab-orders-query-ssp`: lab-order-specific paginated search + `status` filter contract for `/lab-orders`.

## Approach

Mirror the SSP pattern already used by list views:
1. Add a `LabOrderQueryDto extends PaginationQueryDto` with `status?: LabOrderStatus`.
2. Return `PaginatedResponseDto<LabOrderResponseDto>` from `GET /lab-orders`.
3. Implement Prisma `count + findMany` in a transaction with nested `OR` search over the requested fields.
4. On the frontend, move the page to `DataTable` + toolbar, wiring search and status filter from day one.
5. Keep `Pagar` as a `DataTable` meta callback so the payment flow and current modals remain intact.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/api/src/lab-orders/` | Modified | Query DTO, controller, service pagination/search/filtering |
| `apps/api/src/lab-orders/dto/` | New/Modified | `lab-order-query.dto.ts`, response DTOs if needed |
| `apps/web/src/features/lab-orders/` | Modified | Paginated service/hook and table metadata |
| `apps/web/src/app/(dashboard)/laboratorio/ordenes/page.tsx` | Modified | Swap custom table for SSP composition |

## Risks and Mitigation

| Risk | Likelihood | Mitigation |
|---|---|---|
| Nested search over `tests.testName` becomes brittle | Medium | Keep search logic isolated in service and validate with representative queries. |
| Payment flow regresses during table refactor | Medium | Preserve `Pagar` as meta callback and avoid modal changes. |
| Query DTO validation rejects new filter | Low | Extend `PaginationQueryDto` instead of adding separate query params. |

## Rollback Plan

Revert the API DTO/controller/service changes and restore the previous custom table page implementation. Because the change is additive around a single endpoint and page, rollback is localized and does not affect other SSP lists.

## Success Criteria

- [ ] `GET /lab-orders` returns paginated results with search and status filtering.
- [ ] The UI can page, search, and filter by status from the first render.
- [ ] `Pagar` still opens the existing payment flow for `PENDING` orders.
- [ ] Existing create/payment modals continue working unchanged.
