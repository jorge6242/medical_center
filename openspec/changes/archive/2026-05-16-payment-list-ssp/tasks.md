# Tasks: Payment List Server-Side Pagination

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350–450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

## Phase 1: Backend Pagination & Search

- [x] 1.1 Modify `apps/api/src/payments/payments.controller.ts` — `findAll` accepts `PaginationQueryDto` + optional `status`, returns `PaginatedResponseDto<PaymentResponseDto>`
- [x] 1.2 Modify `apps/api/src/payments/payments.service.ts` — `findAll` builds nested `where` with `OR` on `items.consultation.patient.name` and `documentId`, removes hardcoded `status: 'COMPLETED'`, wraps count and findMany in `prisma.$transaction`

## Phase 2: Frontend Components & Wiring

- [x] 2.1 Create `apps/web/src/features/payments/components/payment-columns.tsx` — column defs with status, type, totals, date, and 4 action buttons wired via `table.options.meta`
- [x] 2.2 Create `apps/web/src/features/payments/components/payment-toolbar.tsx` — `DebouncedSearchInput` + status filter select (COMPLETED / VOIDED / all)
- [x] 2.3 Modify `apps/web/src/features/payments/services/payments.service.ts` — add `GetPaymentsQuery`, `getPaginatedPayments`, and `PaginatedResponse<PaymentResponse>` interface
- [x] 2.4 Modify `apps/web/src/features/payments/hooks/use-payments.ts` — add `usePaginatedPayments` with query key `['payments', page, limit, search, status]`; keep `usePayments` untouched
- [x] 2.5 Modify `apps/web/src/app/(dashboard)/pagos/page.tsx` — replace static `<table>` with `DataTable` + `PaymentToolbar` + pagination state

## Phase 3: Testing

- [ ] 3.1 Unit test: assert `PaymentsService.findAll` where clause includes patient `name` and `documentId` `OR` conditions (spec scenarios: Search by patient name / document ID)
- [x] 3.2 Integration test: `GET /payments` with `search`, `status`, and pagination params returns correct `meta` counts (spec scenarios: Paginated request with search / Filter by status parameter)
- [ ] 3.3 Manual E2E: verify row action buttons trigger `meta.onDownloadReceipt`, `onViewReceipt`, `onVoid`, and `onAdjustments` (spec scenarios: Download receipt / Void action triggered)

## Phase 4: Verification & Cleanup

- [x] 4.1 Run `pnpm run typecheck` inside API container (`make shell-api`)
- [x] 4.2 Run `pnpm run lint` inside API and web containers
- [x] 4.3 Verify existing `usePayments()` consumers (e.g., payment form dropdowns) still work for backward compatibility
