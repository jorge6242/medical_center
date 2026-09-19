# Tasks: AsyncLocalStorage Context Manager + Prisma Audit Log Middleware

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Phase 0+1: JWT + RequestContext) → PR 2 (Phase 2+3: Prisma extension + tests) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No — implement Work Unit 1 first, then Work Unit 2 as the dependent slice.
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | JWT tenantId claim + RequestContextModule + guard wiring | PR 1 | Deployable alone; no behavior change on unprotected routes |
| 2 | AuditLogService standalone + Prisma $extends extension + integration tests | PR 2 | Depends on PR 1 (ALS token must exist); adds audit rows |

---

## Phase 0: JWT Payload Verification

- [x] 0.1 Confirm `JwtPayload` interface in `apps/api/src/common/decorators/current-user.decorator.ts` already declares `tenantId: string` — **it does** (no change needed). Add inline comment: `// tenantId required for AsyncLocalStorage audit context`.
- [x] 0.2 Confirm `JwtStrategy.validate()` in `apps/api/src/auth/strategies/jwt.strategy.ts` returns raw payload (it does). Verify `AuthService.login()` signs a token that includes `tenantId` from the user record. If `tenantId` is missing from the signed payload, add it to the `jwt.sign()` call in `apps/api/src/auth/auth.service.ts`.
- [x] 0.3 **Deploy note**: existing JWT tokens issued before this deploy lack `tenantId` in the claim only if the sign step was missing it. After verifying sign step (0.2), document: users must re-login after deploy if `tenantId` was previously absent from token. No DB migration needed.

## Phase 1: RequestContextModule

- [x] 1.1 Create `apps/api/src/common/context/request-context.interface.ts` — export `RequestContext { userId: string; tenantId: string }` and `REQUEST_CONTEXT = 'REQUEST_CONTEXT'` injection token.
- [x] 1.2 Create `apps/api/src/common/context/request-context.service.ts` — `@Injectable()` wrapping `AsyncLocalStorage<RequestContext>`; methods: `getStore(): RequestContext | undefined`, `enterWith(ctx: RequestContext): void`.
- [x] 1.3 Create `apps/api/src/common/context/request-context.module.ts` — `@Global() @Module` that provides `RequestContextService` and the `AsyncLocalStorage` instance as `REQUEST_CONTEXT` token; exports both.
- [x] 1.4 Create `apps/api/src/common/context/index.ts` — barrel re-export for `RequestContext`, `REQUEST_CONTEXT`, `RequestContextService`, `RequestContextModule`.
- [x] 1.5 Modify `apps/api/src/auth/guards/jwt-auth.guard.ts` — inject `RequestContextService` via constructor; override `handleRequest<T>(err, user: T & { sub: string; tenantId: string }): T` to call `requestContextService.enterWith({ userId: user.sub, tenantId: user.tenantId })` before returning `user`. Guard `@Public()` / `@InternalRequest()` paths: only call `enterWith` when `user` is non-null.
- [x] 1.6 Modify `apps/api/src/auth/auth.module.ts` — add `RequestContextModule` to `imports` so the ALS token resolves for `JwtAuthGuard`.
- [x] 1.7 Modify `apps/api/src/app.module.ts` — add `RequestContextModule` to `imports` (before `AuthModule`) to register the global ALS token.
- [x] 1.8 Unit test `apps/api/src/common/context/request-context.service.spec.ts` — test: `enterWith` stores context; `getStore()` returns it; concurrent stores are isolated (use two `AsyncLocalStorage.run()` calls in parallel); `getStore()` returns `undefined` outside any context.
- [x] 1.9 Unit test `apps/api/src/auth/guards/jwt-auth.guard.spec.ts` (update) — test: `handleRequest` calls `requestContextService.enterWith` with `{ userId: user.sub, tenantId: user.tenantId }`; throws `UnauthorizedException` when `user` is null.

## Phase 2: Prisma Audit Extension

- [x] 2.1 Modify `apps/api/src/audit-log/audit-log.service.ts` — remove `PrismaService` constructor injection; instantiate `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` using `ConfigService.getOrThrow('DATABASE_URL')`; call `await this.prismaClient.$connect()` in `onModuleInit()` and `$disconnect()` in `onModuleDestroy()`. Keep `AuditLogEntry` interface and `log()` method signature unchanged.
- [x] 2.2 Modify `apps/api/src/audit-log/audit-log.module.ts` — add `ConfigModule` to `imports` (needed by `AuditLogService` standalone client). Do NOT import `PrismaModule` — that would recreate the circular dep.
- [x] 2.3 Create `apps/api/src/database/prisma-audit.extension.ts` — factory function `buildAuditExtension(als: RequestContextService, auditLog: AuditLogService)` that returns a `$extends` query extension object. Logic: check `AUDITED_MODELS` set + `AUDITED_OPERATIONS` set; for `update` where `args.where.id` exists, issue `findUnique` pre-read; execute `query(args)`; if `als.getStore()` is defined, compute `changedFields` diff and call `auditLog.log(...)`. For `Service` model, use the acting request context `tenantId` because `AuditLog.tenantId` is required. For `updateMany`, set `entityId = 'bulk'` and skip pre-read.
- [x] 2.4 Modify `apps/api/src/database/prisma.service.ts` — inject `AuditLogService` and `RequestContextService` via constructor; after `await this.$connect()` in `onModuleInit()`, call `Object.assign(this, this.$extends(buildAuditExtension(this, this.requestContextService, this.auditLogService)))`.
- [x] 2.5 Modify `apps/api/src/database/prisma.module.ts` — add `AuditLogModule` to `imports` so `AuditLogService` is available for `PrismaService` injection.
- [x] 2.6 Unit test `apps/api/src/database/prisma-audit.extension.spec.ts` — test cases: (a) non-audited model passes through without calling `auditLog.log`; (b) unauthenticated context (`als.getStore() === undefined`) — mutation succeeds, `auditLog.log` NOT called; (c) `update` on audited model with auth context — `auditLog.log` called with correct `userId`, `tenantId`, `changedFields`; (d) `Service` model mutation — `tenantId` comes from the acting request context.

## Phase 3: Integration & Validation

- [ ] 3.1 Integration test: send authenticated `PATCH /patients/:id` → verify `AuditLog` row created with correct `userId`, `tenantId`, non-empty `changedFields`. Use test DB (Supertest + real Prisma connection).
- [ ] 3.2 Integration test: send unauthenticated request that bypasses guard (seed/non-HTTP flow simulation via direct service call) → mutation succeeds, no `AuditLog` row created.
- [ ] 3.3 Typecheck + lint: `make shell-api` → `pnpm run typecheck && pnpm run lint`. Both must pass with zero errors before marking this phase done.

Validation note: attempted Docker-based targeted Jest run via `docker compose -f docker-compose.dev.yml run --rm api ...`, but the API image build currently fails before tests because `pnpm-lock.yaml` is out of sync with `apps/worker/package.json` (`@types/react`, `@react-pdf/renderer`, `react`). Re-run validation after lockfile/dependency sync is restored.

## Phase 4: Deploy Notes

- [ ] 4.1 Add `## Deploy Notes` section to `openspec/changes/async-local-storage-audit-log/proposal.md`: (1) If `AuthService` was not signing `tenantId` into JWT, existing sessions must be invalidated (users re-login); (2) No DB migration needed — `AuditLog` table already has `oldValues`, `newValues`, `changedFields` columns; (3) Rollback: remove `$extends` block from `PrismaService.onModuleInit()` and revert `JwtAuthGuard.handleRequest()` — no data rollback required.
