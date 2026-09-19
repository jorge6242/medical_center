# Exploration: payment-list-ssp

## Current State

The `Payments` entity currently operates without server-side pagination (SSP). `GET /payments` returns a raw array of all completed payments (`PaymentResponseDto[]`) via `payments.service.ts` → `prisma.payment.findMany({ where: { tenantId, status: 'COMPLETED' } })`. No pagination, no search, no filters exist on the backend.

The frontend at `apps/web/src/app/(dashboard)/pagos/page.tsx` renders a static `<table>` with all rows loaded at once. It uses the plain `usePayments()` hook (TanStack Query with key `['payments']`) that calls `getPayments()` returning `PaymentResponse[]`. There is no pagination state, no search input, and no filtering.

The `DataTable` generic component (from `data-table-ssp`) already exists with `manualPagination`, loading skeletons, empty state, and `meta` callback support — but payments does not use it.

The `DebouncedSearchInput` component also exists and is used by patients.

## Affected Areas

- `apps/api/src/payments/payments.controller.ts` — `GET /payments` must accept `PaginationQueryDto` and return `PaginatedResponseDto<PaymentResponseDto>` instead of `PaymentResponseDto[]`
- `apps/api/src/payments/payments.service.ts` — `findAll()` must implement pagination with `skip`/`take`, count query, and optional search/filter logic; must also consider that search should span nested relations (patient name via `item.consultation`, doctor name)
- `apps/web/src/features/payments/services/payments.service.ts` — add `GetPaymentsQuery` interface and `getPaginatedPayments()` function
- `apps/web/src/features/payments/hooks/use-payments.ts` — add `usePaginatedPayments(query?)` hook with query key including page/limit/search
- `apps/web/src/app/(dashboard)/pagos/page.tsx` — replace raw `<table>` with `<DataTable>` + pagination state + `PatientToolbar`-style search
- `apps/web/src/features/payments/components/payment-columns.tsx` — **new** file: column definitions for `DataTable` (status, type, totals, date, actions)
- `apps/web/src/features/payments/components/payment-toolbar.tsx` — **new** file: search input (and potentially status filter)

## Approaches

1. **Mirror the patients SSP pattern exactly**
   - Replicate the `PaginationQueryDto` → `PaginatedResponseDto` flow, the `getPaginatedPayments` service function, the `usePaginatedPayments` hook, and the `DataTable` composition from `pacientes/page.tsx`
   - Pros: Proven pattern, minimal cognitive load, consistency across the codebase, reuses existing generic components
   - Cons: Payment search requires Prisma nested relation queries (`item.consultation.patient.name`) which are slightly more complex than flat patient fields
   - Effort: **Medium**

2. **Minimal paginated list without search**
   - Add pagination backend/frontend but skip search/filter for now
   - Pros: Smaller change, less risk
   - Cons: Degrades UX as payment volume grows; inconsistent with patients which has search
   - Effort: **Low**

### Recommendation

**Approach 1** — Mirror patients SSP pattern. The `DataTable` component, `PaginationQueryDto`, and `PaginatedResponseDto` are already built. Consistency is valuable. The main extra work is the Prisma `where` clause for search across `PaymentItem` → `Consultation` → `Patient.name` and `Doctor.name`.

## Risks

- **Nested relation search performance**: Searching by patient name requires `include` + `where` on nested `consultation.patient.name`. This may require an `OR` filter with relation nesting. Prisma supports it, but the query should be tested with real volume.
- **Decimal serialization**: Payment amounts are `Prisma.Decimal` in DB and `string` in DTOs. The `buildResponse` mapper already handles this, but ensure the paginated response path continues to use it.
- **Status filter ambiguity**: The current `findAll` hardcodes `status: 'COMPLETED'`. If we want to show VOIDED payments too (the current UI shows them in the list), the backend must allow filtering by status or return all statuses. The current page shows both COMPLETED and VOIDED badges.
- **Actions in DataTable meta**: Payments have more complex row actions (download receipt, view receipt modal, void, adjustments). The `meta` callback pattern used in patients (`onEdit`, `onDeactivate`) works, but payments need ~4 callbacks per row.
- **Breakage of existing `usePayments` consumers**: Other components may rely on the plain array `usePayments()` (e.g., payment form dropdowns). Keep the old hook/function untouched and add the new paginated variant alongside it.

## Ready for Proposal

**Yes.** The scope is clear: apply the existing SSP pattern to payments, following the patients implementation as a blueprint. The orchestrator should tell the user that payments currently load all rows at once and this change will:
1. Paginate `GET /payments` with page/limit/search
2. Replace the static table with the generic `DataTable` component
3. Add search by patient name / payment description
4. Retain all existing row actions (receipts, void, adjustments)

## Detailed Comparison: Payments vs Patients SSP

| Aspect | Patients | Payments |
|--------|----------|----------|
| Backend response | `PaginatedResponseDto<PatientResponseDto>` | `PaymentResponseDto[]` (array) |
| Backend query | Flat `Patient` model with `name`/`documentId` search | `Payment` with nested `item.consultation.patient` and `item.consultation.doctor` |
| Frontend table | `DataTable` + `PatientToolbar` | Raw `<table>` |
| Frontend hook | `usePaginatedPatients` | `usePayments` (plain array) |
| Row actions | Edit, Deactivate | View receipt, Download PDF, Void, Adjustments |
| Search fields | Name, Document ID | Patient name, Doctor name, Description, Payment ID |
| Filters | None (only search) | Status (COMPLETED/VOIDED), Item type (CONSULTATION/LAB), Date range (future) |
| Complexity | Low | Medium (nested relations + more actions) |

## Payment-Specific Search Fields (Recommended)

1. **Patient name** — via `item.consultation.patient.name`
2. **Doctor name** — via `item.consultation.doctor.name` (if exposed in include)
3. **Description** — `item.description`
4. **Payment ID short** — `id` (first 8 chars shown in UI)

## Payment-Specific Actions (Existing)

1. **Download receipt PDF** — `downloadReceipt(p.id)` (for CONSULTATION + COMPLETED)
2. **View receipt modal** — `setSelectedPaymentId` + `setShowReceiptModal(true)`
3. **Void payment** — `doVoid(p.id)` (for COMPLETED)
4. **Add adjustment** — `openAdjustments(p.id)` (for COMPLETED)

## Estimated Complexity

**Medium** — The pattern is already established by `data-table-ssp` and `pacientes`. The additional complexity comes from:
- Nested Prisma queries for search (`item.consultation` includes)
- More row actions to wire through `DataTable` `meta`
- Potentially adding a status filter toggle (COMPLETED vs VOIDED vs all)

If the patients implementation took ~1 unit of effort, payments is ~1.3–1.5 units.

## Files to Create / Modify

### Create
- `apps/web/src/features/payments/components/payment-columns.tsx`
- `apps/web/src/features/payments/components/payment-toolbar.tsx`

### Modify
- `apps/api/src/payments/payments.controller.ts` — accept `PaginationQueryDto`, return paginated response
- `apps/api/src/payments/payments.service.ts` — rewrite `findAll` to paginate, count, and search
- `apps/web/src/features/payments/services/payments.service.ts` — add `getPaginatedPayments` and `GetPaymentsQuery`
- `apps/web/src/features/payments/hooks/use-payments.ts` — add `usePaginatedPayments`
- `apps/web/src/app/(dashboard)/pagos/page.tsx` — replace raw table with `DataTable` composition
