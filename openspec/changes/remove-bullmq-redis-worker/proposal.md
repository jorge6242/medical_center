# Proposal: Remove BullMQ/Redis/Worker for MVP Simplification

## Intent

The current architecture maintains BullMQ + Redis + a separate Worker app for background job processing (receipt generation, report export, receipt emails). For an MVP with <50 concurrent users, these jobs complete in 1-3 seconds and do not need queue-based async processing. Removing this infrastructure reduces deployment cost, operational complexity, and eliminates the broken production docker-compose (which is missing Redis/Worker services).

## Scope

### In Scope
- Convert async BullMQ jobs to synchronous service calls in the API
- Remove `apps/worker/` NestJS application entirely
- Remove Redis service from docker-compose files
- Remove BullMQ dependencies (`@nestjs/bullmq`, `bullmq`) from `apps/api/package.json`
- Remove BullBoard dashboard (`queues/` module)
- Remove BullMQ module registrations and `@InjectQueue` decorators
- Update `pnpm-workspace.yaml` to remove worker
- Update `docker-compose.yml` and `docker-compose.dev.yml`

### Out of Scope
- Re-architecting the frontend (no changes)
- Changing database schema (no changes)
- Adding new features or UI changes
- Replacing BullMQ with a different queue system
- Implementing true async processing (deferred until scale)

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `payment-processing`: Receipt generation and receipt email sending become synchronous within the payment completion flow
- `reports-export`: Report generation becomes synchronous (endpoint returns file directly or after inline processing)
- `medical-records-export`: Export becomes synchronous or is deferred to a future version

## Approach

1. **Inline receipt generation**: Move `ReceiptGenerationProcessor` logic into `PaymentsService` or `ReceiptsService`, called directly after payment creation.
2. **Inline receipt email**: Call `MailerService.sendReceiptEmail()` directly from `PaymentsService` instead of queueing.
3. **Inline report export**: Convert `ReportsService` export to synchronous generation; return file stream or cached blob directly.
4. **Remove infrastructure code**: Delete `QueuesModule`, `BullBoardController`, `BullBoardService`, processors, and DTOs.
5. **Clean dependencies**: Remove BullMQ packages, update `pnpm-lock.yaml` inside Docker.
6. **Fix docker-compose**: Production compose gets Redis and Worker removed; dev compose simplified.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/payments/payments.service.ts` | Modified | Inline receipt generation + email instead of queue.add() |
| `apps/api/src/receipts/` | Modified | Remove `receipt-email.processor.ts`; service becomes direct caller |
| `apps/api/src/reports/reports.service.ts` | Modified | Remove queue.add(); export becomes synchronous |
| `apps/api/src/medical-records/medical-records.service.ts` | Modified | Remove queue.add(); export becomes synchronous or removed |
| `apps/api/src/queues/` | Removed | Delete entire module (BullBoard, controllers, services, DTOs) |
| `apps/api/src/app.module.ts` | Modified | Remove `QueuesModule` import |
| `apps/api/src/medical-records/medical-records.module.ts` | Modified | Remove `BullModule.registerQueue()` |
| `apps/api/src/reports/reports.module.ts` | Modified | Remove `BullModule.registerQueue()` |
| `apps/api/src/payments/payments.module.ts` | Modified | Remove `BullModule` imports |
| `apps/api/package.json` | Modified | Remove `@nestjs/bullmq` and `bullmq` |
| `apps/worker/` | Removed | Delete entire application |
| `pnpm-workspace.yaml` | Modified | Remove `apps/worker` from workspaces |
| `docker-compose.yml` | Modified | Remove `redis` and `worker` services |
| `docker-compose.dev.yml` | Modified | Remove `redis` and `worker` services |
| `packages/shared/src/queues/` | Evaluate | May need to keep type definitions or remove if only used by BullMQ |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Payment creation slows from 200ms to 3s (receipt+email inline) | High | Acceptable for MVP with low concurrency; monitor response times |
| Report generation blocks API request for large datasets | Medium | Limit report size in MVP; add warning in UI for large date ranges |
| Missed `@InjectQueue` or BullMQ import causes build failure | Medium | Run `pnpm run typecheck` after each file change; grep for all BullMQ references |
| Docker build fails due to stale pnpm-lock | Low | Run `pnpm install` inside Docker to regenerate lockfile |
| Frontend polling/report status endpoints break | Medium | Remove or refactor `GET /queues/status` endpoint; verify no frontend calls remain |

## Rollback Plan

1. This change is fully reversible via git revert.
2. BullMQ code is self-contained in processors and queue registrations; re-adding means restoring deleted files and re-installing dependencies.
3. If response times degrade in production, the inline calls can be wrapped in a simple `setImmediate` or Node.js `worker_threads` without reintroducing Redis.
4. Keep a branch `backup/bullmq-worker` before merging to main.

## Dependencies

- None external; this is a pure codebase simplification.

## Success Criteria

- [ ] `make shell-api` → `pnpm run typecheck` passes with zero errors
- [ ] `make shell-api` → `pnpm run lint` passes with zero errors
- [ ] `make shell-web` → `pnpm run build` passes (if affected)
- [ ] Creating a payment generates a receipt and sends email synchronously without errors
- [ ] docker-compose.yml has only 3 services: db, api, web (plus nginx if kept)
- [ ] `apps/worker/` directory no longer exists
- [ ] No `bullmq` or `@nestjs/bullmq` references remain in `apps/api/`
- [ ] Railway deployment is possible with only API + PostgreSQL (no Redis dependency)
