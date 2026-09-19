# Proposal: Payment List Server-Side Pagination

## Intent

`GET /payments` returns a raw unfiltered array. The frontend renders a static table without pagination or search. We will apply the existing patients SSP pattern to payments.

## Scope

### In Scope
- Backend pagination, search, and count for `GET /payments`
- Patient name search via nested relation (`PaymentItem` → `Consultation` → `Patient`)
- Frontend `DataTable` with `payment-columns.tsx` and `payment-toolbar.tsx`
- Remove hardcoded `status: 'COMPLETED'` backend filter

### Out of Scope
- New payment methods or receipt generation changes
- Adjustment/void workflow changes (only list rendering)
- Sorting beyond `createdAt desc`

## Capabilities

### Existing (Reused)
- `data-table-ssp`: Generic `DataTable`, `DebouncedSearchInput`, loading/empty states, action callbacks via `meta`
- `pagination-dtos`: `PaginationQueryDto`, `PaginatedResponseDto`, `$transaction` pattern

### New
- `payment-list-ssp`: Payment-specific SSP including nested patient search and row actions (view receipt, download PDF, void, adjustments)

## Approach

Mirror the patients SSP pattern.

**Backend**: Modify `findAll` to accept `PaginationQueryDto`. Build a `where` clause with `OR` on `id`, `item.consultation.patient.name`, and `item.consultation.patient.documentId` using `contains` with `mode: 'insensitive'`. Execute count and data queries inside `prisma.$transaction`. Remove the hardcoded `status: 'COMPLETED'` filter.

**Frontend**: Add `getPaginatedPayments` service. Add `usePaginatedPayments` hook with `queryKey: ['payments', page, limit, search]`. Create `payment-columns.tsx` and `payment-toolbar.tsx`. Refactor `pagos/page.tsx` to compose `DataTable`. Preserve existing modals and mutations.

## Affected Areas

| File | Impact |
|---|---|
| `apps/api/src/payments/payments.controller.ts` | Modify `findAll` to accept `PaginationQueryDto` |
| `apps/api/src/payments/payments.service.ts` | Rewrite `findAll` with pagination, search, `$transaction` |
| `apps/web/src/features/payments/services/payments.service.ts` | Add `getPaginatedPayments` |
| `apps/web/src/features/payments/hooks/use-payments.ts` | Add `usePaginatedPayments` |
| `apps/web/src/features/payments/components/payment-columns.tsx` | New — column definitions with action meta |
| `apps/web/src/features/payments/components/payment-toolbar.tsx` | New — search input + new payment CTA |
| `apps/web/src/app/(dashboard)/pagos/page.tsx` | Refactor to `DataTable` composition |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Nested patient search slows query | Low | Ensure `Consultation.patientId` is indexed; verify with `EXPLAIN` |
| Removing status filter surfaces unexpected data | Med | Test with seed data; UI can default-filter if needed |
| Row action buttons lost in refactor | Low | Map all 4 existing actions in `meta`; manual verification |

## Rollback Plan

1. `git checkout` the 7 affected files to restore pre-change state.
2. The old `findAll` returning `PaymentResponseDto[]` is backward-compatible for clients ignoring `meta`.
3. Invalidate frontend cache: `queryClient.invalidateQueries({ queryKey: ['payments'] })`.

## Success Criteria

- [ ] `GET /payments` returns `PaginatedResponseDto<PaymentResponseDto>` with correct `meta`
- [ ] Search by patient name or document filters results
- [ ] All payment statuses (`COMPLETED`, `VOIDED`, etc.) appear in the table
- [ ] Row actions (download PDF, view receipt, void, adjustments) remain functional
- [ ] Pagination controls navigate without full page reload
