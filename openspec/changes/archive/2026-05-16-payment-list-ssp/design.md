# Design: Payment List Server-Side Pagination

## Technical Approach

Mirror the existing patients SSP pattern: accept `PaginationQueryDto`, return `PaginatedResponseDto<PaymentResponseDto>`, compose `DataTable` with `DebouncedSearchInput`, and expose row actions via `meta`. The main divergence is the Prisma `where` clause, which must traverse `PaymentItem → Consultation → Patient` for patient name/document search, and an optional `status` filter to replace the current hardcoded `COMPLETED` filter.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Status filter param | Extend `PaginationQueryDto` with optional `status?: PaymentStatus` | Dedicated `PaymentPaginationQueryDto` | Keeps generic DTO reusable; `IsEnum` + `IsOptional` is sufficient |
| Nested patient search | Prisma `where.OR` with `item.consultation.patient.name` and `item.consultation.patient.documentId` | Flatten patient snapshot into `Payment` | Snapshot would duplicate data; existing indexes on `Consultation.patientId` make nested query performant |
| Row action wiring | 4 callbacks via `table.options.meta` | Render prop or column params | Matches existing `patient-columns.tsx` pattern; `meta` is idiomatic TanStack Table |
| Hook coexistence | Keep `usePayments()`, add `usePaginatedPayments()` | Replace existing hook | Prevents breakage in payment form dropdowns or other consumers |

## Data Flow

```
GET /payments?page=1&limit=10&search=gomez&status=COMPLETED
         │
         ▼
PaymentsController.findAll(PaginationQueryDto)
         │
         ▼
PaymentsService.findAll(tenantId, query)
    ┌────┴────┐
    ▼         ▼
  count    findMany
  (where)  (skip/take/include)
    └────┬────┘
         ▼
createPaginatedResponse(data, total, page, limit)
         │
         ▼
PaginatedResponseDto<PaymentResponseDto>
         │
         ▼
usePaginatedPayments(queryKey: ['payments', page, limit, search, status])
         │
         ▼
DataTable(columns=getPaymentColumns(), meta={onDownloadReceipt, ...})
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/payments/payments.controller.ts` | Modify | `findAll` accepts `PaginationQueryDto` + optional `status`, returns `PaginatedResponseDto` |
| `apps/api/src/payments/payments.service.ts` | Modify | Rewrite `findAll` with `$transaction`, nested `where`, `skip`/`take`, remove hardcoded `status` |
| `apps/web/src/features/payments/services/payments.service.ts` | Modify | Add `GetPaymentsQuery`, `getPaginatedPayments`, `PaginatedResponse` interface |
| `apps/web/src/features/payments/hooks/use-payments.ts` | Modify | Add `usePaginatedPayments` hook; keep `usePayments` untouched |
| `apps/web/src/features/payments/components/payment-columns.tsx` | Create | Column defs with status/type/totals/date/actions; 4 conditional buttons via `meta` |
| `apps/web/src/features/payments/components/payment-toolbar.tsx` | Create | `DebouncedSearchInput` + `FilterSelect` for status (COMPLETED/VOIDED/all) |
| `apps/web/src/app/(dashboard)/pagos/page.tsx` | Modify | Replace raw `<table>` with `DataTable` + `PaymentToolbar` + pagination state |

## Interfaces / Contracts

**Backend where clause (Prisma):**
```typescript
const where: Prisma.PaymentWhereInput = {
  tenantId,
  ...(status ? { status } : {}),
  ...(search ? {
    OR: [
      { id: { contains: search, mode: 'insensitive' } },
      { item: { description: { contains: search, mode: 'insensitive' } } },
      { item: { consultation: { patient: { name: { contains: search, mode: 'insensitive' } } } } },
      { item: { consultation: { patient: { documentId: { contains: search, mode: 'insensitive' } } } } },
    ],
  } : {}),
};
```

**Frontend meta type:**
```typescript
type PaymentTableMeta = {
  onDownloadReceipt: (p: PaymentResponse) => void;
  onViewReceipt: (p: PaymentResponse) => void;
  onVoid: (p: PaymentResponse) => void;
  onAdjustments: (p: PaymentResponse) => void;
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `PaymentsService.findAll` where clause builder | Jest — mock `prisma.$transaction`, assert `OR` includes patient fields |
| Integration | `GET /payments` with `search`, `status`, pagination | Supertest — seed 3 payments, assert meta counts and nested patient match |
| E2E (manual) | Row actions still trigger download/view/void/adjustment | Render `DataTable` in browser, click each action, verify modals/mutations |

## Migration / Rollout

No migration required. The endpoint signature changes from `PaymentResponseDto[]` to `PaginatedResponseDto<PaymentResponseDto>`, but the old `usePayments` hook remains. After deployment, invalidate `queryClient` cache for `['payments']`.

## Open Questions

None.
