# Exploration: lab-orders-list-ssp

## Current State

### Backend
- `GET /lab-orders` currently returns a raw array (`Promise<LabOrder[]>`), not a paginated response.
- It uses `prisma.labOrder.findMany({ where: { tenantId }, include: { patient, tests.labTest }, orderBy: { createdAt: 'desc' } })`.
- Available fields from the schema / include that matter for search:
  - `id`
  - `status` (`PENDING`, `PAID`, `VOIDED`)
  - `createdAt`
  - `totalUsd`
  - `patient.name`
  - `patient.documentId`
  - `tests[].testName`
- Existing status concept is real and already used elsewhere:
  - `LabOrderStatus = PENDING | PAID | VOIDED`
  - Payments void flow can set a lab order to `VOIDED`
  - A lab payment flow only pays orders in `PENDING`
- No query DTO, search, or filter logic exists in the lab-orders module today.

### Frontend
- The list page is `apps/web/src/app/(dashboard)/laboratorio/ordenes/page.tsx`.
- It is a client page with a custom `<table>`, not `DataTable`.
- Data access is through:
  - `useLabOrders()` → `getLabOrders()` for the list
  - `useLabOrder(id)` for the selected order modal
  - `useCreateLabOrder()` for create
- Current row action is only:
  - `Pagar` when `order.status === 'PENDING'`
- Current page also has modals for:
  - new order creation
  - payment completion for a selected order
- There is no search, pagination, or filter UI yet.

### Generic Pieces Already Available
- `apps/web/src/shared/components/ui/data-table.tsx` — manual pagination + `meta` callbacks.
- `apps/web/src/shared/components/ui/debounced-search-input.tsx` — debounced search field.
- `apps/web/src/shared/components/ui/filter-select.tsx` — simple select filter.
- `apps/api/src/common/dto/pagination-query.dto.ts` — `page`, `limit`, `search`.
- `apps/api/src/common/dto/paginated-response.dto.ts` — `{ data, meta }` response shape.

## Affected Areas

- `apps/api/src/lab-orders/lab-orders.controller.ts` — accept query params and return paginated response.
- `apps/api/src/lab-orders/lab-orders.service.ts` — implement count + skip/take + search (+ optional status filter).
- `apps/api/src/lab-orders/dto/*` — add a query DTO if we extend beyond plain `PaginationQueryDto`.
- `apps/web/src/features/lab-orders/services/lab-orders.service.ts` — add paginated query types and response typing.
- `apps/web/src/features/lab-orders/hooks/use-lab-orders.ts` — add a paginated hook.
- `apps/web/src/features/lab-orders/components/*` — add columns + toolbar for `DataTable`.
- `apps/web/src/app/(dashboard)/laboratorio/ordenes/page.tsx` — replace the raw table with `DataTable` composition.

## Approaches

1. **Mirror the existing SSP pattern** — add `page/limit/search`, return `PaginatedResponseDto`, and render with `DataTable` + toolbar.
   - Pros: reuses proven primitives, consistent with patients/expenses/payments, lowest cognitive load.
   - Cons: search needs nested relation handling for `patient` and `tests`.
   - Effort: Medium.

2. **SSP + status filter from day one** — extend the query DTO with `status` so the list can isolate `PENDING`, `PAID`, or `VOIDED` orders.
   - Pros: matches the existing status lifecycle and makes the list more useful operationally.
   - Cons: one more DTO/UI field and more branching in queries.
   - Effort: Medium.

## Recommendation

Use **Approach 2**: standard SSP plus a `status` filter.

Recommended search fields:
- `id`
- `patient.name`
- `patient.documentId`
- `tests.testName`

Recommended filters for v1:
- `status` (`PENDING`, `PAID`, `VOIDED`)

Additional query DTO fields beyond `page/limit/search`:
- `status?: LabOrderStatus`

Recommended row actions and `DataTable` meta callbacks:
- `onPay(order)` — existing `Pagar` action for `PENDING` orders
- `onView(order)` — optional detail modal if the list needs a read-only inspection action
- `onPrint(order)` / `onDownload(order)` — not currently supported; only add if a PDF/receipt flow is introduced
- `onReceive` / `onProcess` — not currently supported in the lab-orders module; status changes happen through payment/void flows, not from this list

## Risks

- Search across `tests.testName` requires nested Prisma `OR` conditions.
- The current page is a custom table plus two modals, so the refactor must preserve payment/create flows while swapping in `DataTable`.
- `status` is already meaningful in the domain, so omitting it from v1 would leave an obvious filter gap.

## Ready for Proposal

Yes. The change is clear enough for proposal/spec work.
