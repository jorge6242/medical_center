# Tasks: Lab Orders List SSP

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 280-360 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | API paginated query contract + search/status filtering | PR 1 | Includes DTO, controller, service tests |
| 2 | Web SSP table wiring + preserve Pagar flow | PR 1 | Includes hook/service/page changes |

## Phase 1: Foundation / Contract

- [x] 1.1 Create `apps/api/src/lab-orders/dto/lab-order-query.dto.ts` extending `PaginationQueryDto` with `status` validation.
- [x] 1.2 Update `apps/web/src/features/lab-orders/services/lab-orders.service.ts` types for `LabOrderQuery` and `PaginatedResponse`.

## Phase 2: Core Implementation

- [x] 2.1 Refactor `apps/api/src/lab-orders/lab-orders.service.ts` to return `PaginatedResponseDto` using `count + findMany` in one transaction.
- [x] 2.2 Add Prisma `where` search for `id`, `patient.name`, `patient.documentId`, and `tests.some.testName`, scoped by tenant and optional status.
- [x] 2.3 Update `apps/api/src/lab-orders/lab-orders.controller.ts` to accept the query DTO and return the paginated contract.
- [x] 2.4 Add `apps/web/src/features/lab-orders/hooks/use-lab-orders.ts` paginated hook keyed by `page`, `limit`, `search`, and `status`.
- [x] 2.5 Create `apps/web/src/features/lab-orders/components/lab-orders-toolbar.tsx` with debounced search + status select.
- [x] 2.6 Create `apps/web/src/features/lab-orders/components/lab-orders-columns.tsx` with `DataTable` columns and the `Pagar` meta callback.
- [x] 2.7 Replace `apps/web/src/app/(dashboard)/laboratorio/ordenes/page.tsx` custom table with `DataTable` + toolbar + pagination state; keep existing modals.

## Phase 3: Testing / Verification

- [x] 3.1 Add Jest coverage for `LabOrdersService` scenarios: no filters, search only, status only, and combined search + status.
- [x] 3.2 Add controller/integration coverage for `GET /lab-orders` returning `data` plus `meta.total`, `meta.totalPages`, and paging flags.
- [x] 3.3 Validate spec scenarios manually: first render shows SSP table, search/status reset to page 1, and `Pagar` still opens the existing flow for pending orders.

## Phase 4: Cleanup / Final Checks

- [ ] 4.1 Run backend `pnpm run typecheck` and `pnpm run lint` in `make shell-api`.
- [ ] 4.2 Run web `pnpm run typecheck` and `pnpm run lint` in `make shell-web`, then confirm no schema migration is needed.
