# Tasks: Remove BullMQ/Redis/Worker for MVP Simplification

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600-900 (additions + deletions) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (stacked to main) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Est. Lines | Notes |
|------|------|-----------|------------|-------|
| 1 | Inline payment receipt + email generation | PR 1 | ~150 | Convert queue.add() to direct service calls |
| 2 | Inline report + medical record export | PR 1 | ~100 | Convert queue.add() to direct generation |
| 3 | Remove BullMQ infrastructure from API | PR 2 | ~250 | Delete queues module, processors, BullModule |
| 4 | Remove Worker app | PR 3 | ~300 | Delete apps/worker/ + workspace + lockfile |
| 5 | Docker cleanup + dependency removal | PR 3 | ~100 | docker-compose.yml, dev.yml, package.json |

---

## Phase 1: Inline Core Jobs (PR-1)

- [ ] 1.1 Refactor `payments.service.ts`: Replace `receiptQueue.add()` with direct call to `receiptsService.generateReceipt()`
- [ ] 1.2 Refactor `payments.service.ts`: Replace `receiptEmailQueue.add()` with direct call to `mailerService.sendReceiptEmail()`
- [ ] 1.3 Refactor `reports.service.ts`: Replace `reportsQueue.add()` with inline report generation logic
- [ ] 1.4 Refactor `medical-records.service.ts`: Replace `medicalRecordExportQueue.add()` with inline export generation
- [ ] 1.5 Ensure all inline calls handle errors gracefully (log failure, don't block payment persistence)
- [ ] 1.6 Run `pnpm run typecheck` inside Docker (API) — verify no TypeScript errors
- [ ] 1.7 Run `pnpm run lint` inside Docker (API)
- [ ] 1.8 Manual test: Create payment → verify receipt generated → verify email sent (check logs)

## Phase 2: Remove BullMQ Infrastructure (PR-2)

- [ ] 2.1 Delete `apps/api/src/queues/` directory (BullBoard controller, service, DTOs, module)
- [ ] 2.2 Delete `apps/api/src/receipts/receipt-email.processor.ts`
- [ ] 2.3 Remove `QueuesModule` import from `apps/api/src/app.module.ts`
- [ ] 2.4 Remove `BullModule` imports from `payments.module.ts`, `reports.module.ts`, `medical-records.module.ts`
- [ ] 2.5 Remove `@InjectQueue` decorators and `Queue` type imports from `payments.service.ts`, `reports.service.ts`, `medical-records.service.ts`
- [ ] 2.6 Remove `BullModule` imports from `queues.module.ts` (before deleting it)
- [ ] 2.7 Grep for remaining `bullmq` or `@nestjs/bullmq` references in `apps/api/src/`
- [ ] 2.8 Run `pnpm run typecheck` inside Docker — must pass with zero errors
- [ ] 2.9 Run `pnpm run lint` inside Docker
- [ ] 2.10 Manual regression test: Create payment → receipt → email (should still work synchronously)

## Phase 3: Remove Worker App + Docker Cleanup (PR-3)

- [ ] 3.1 Delete `apps/worker/` directory entirely
- [ ] 3.2 Remove `apps/worker` from `pnpm-workspace.yaml`
- [ ] 3.3 Remove `@nestjs/bullmq` and `bullmq` from `apps/api/package.json` dependencies
- [ ] 3.4 Remove `redis` service from `docker-compose.dev.yml`
- [ ] 3.5 Remove `worker` service from `docker-compose.dev.yml`
- [ ] 3.6 Remove `redis` service from `docker-compose.yml` (production)
- [ ] 3.7 Remove `worker` service from `docker-compose.yml` (production)
- [ ] 3.8 Regenerate `pnpm-lock.yaml` inside Docker: `pnpm install` (will remove BullMQ packages)
- [ ] 3.9 Run `pnpm run typecheck` for API workspace
- [ ] 3.10 Run `pnpm run typecheck` for Web workspace (ensure no shared packages broke)
- [ ] 3.11 Run `pnpm run lint` for API workspace
- [ ] 3.12 Run `docker compose -f docker-compose.dev.yml up` — verify only db, api, web start
- [ ] 3.13 End-to-end smoke test: Login → create payment → view receipt → verify no errors in logs

## Phase 4: Verification Against Specs

- [ ] 4.1 Verify PR-1 matches `specs/payment-processing/spec.md` scenarios (sync receipt + email)
- [ ] 4.2 Verify PR-1 matches `specs/reports-export/spec.md` scenarios (sync generation)
- [ ] 4.3 Verify PR-1 matches `specs/medical-records-export/spec.md` scenarios (sync export)
- [ ] 4.4 Verify response times: payment creation < 5s, report export < 10s
- [ ] 4.5 Verify error handling: SMTP failure logged but payment succeeds
- [ ] 4.6 Verify no BullMQ, Redis, or Worker references remain in codebase

---

## Chain Context for Stacked PRs

```text
main
 └── PR-1: Inline core jobs (payments, reports, medical records)
      └── PR-2: Remove BullMQ infrastructure (queues, processors, BullModule)
           └── PR-3: Remove Worker app + Docker cleanup
```

| PR | Scope | Files | Est. Lines |
|----|-------|-------|------------|
| PR-1 | Inline core jobs | 3 services | ~250 |
| PR-2 | Remove BullMQ infra | ~8 files | ~250 |
| PR-3 | Remove Worker + Docker | ~6 files | ~300 |

### PR Dependencies
- PR-2 depends on PR-1 (removes queues that PR-1 stopped using)
- PR-3 depends on PR-2 (removes worker that PR-2 made obsolete)
- Each PR is autonomous: can be rolled back independently
