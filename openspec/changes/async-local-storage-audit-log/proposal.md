# Proposal: AsyncLocalStorage Context Manager + Prisma Audit Log Middleware

## Intent

Two critical infrastructure gaps block production-readiness:

1. **`JwtAuthGuard` does not inject `userId`/`tenantId` into `AsyncLocalStorage`** — services that need audit context must receive it via manual parameter threading, which is error-prone and breaks tenant safety.
2. **`AuditLogService` is dead code** — it was designed but never wired to `PrismaService`, so no automatic audit trail exists for any CREATE/UPDATE on business entities.

This change wires both gaps so audit logs are captured automatically on every mutating Prisma operation without any call-site changes in existing services.

## Scope

### In Scope
- `RequestContextModule` — global `AsyncLocalStorage` provider/service for request context.
- `JwtAuthGuard.handleRequest()` context wiring — extracts `{ userId, tenantId }` from the validated JWT user payload after Passport validation and stores it in `AsyncLocalStorage`.
- `PrismaService` Prisma `$extends` query extension — intercepts `create`, `update`, `updateMany` on audited models; reads context from `AsyncLocalStorage`; calls `AuditLogService.log()` with `oldValues`, `newValues`, `changedFields`.
- Audited models (per AGENTS.md): `Patient`, `Doctor`, `User`, `Specialty`, `Service`, `ExpenseCategory`, `DoctorBankAccount`, `ExchangeRate`, `SystemConfig`.
- `AuditLogService` activation — remove dead-code status by integrating into `PrismaService.onModuleInit()`.
- Unit tests for request-context wiring and Prisma audit extension logic.

### Out of Scope
- Manual `AuditLogService.log()` calls for VOID/DEACTIVATE/Auth events (already documented; tracked separately).
- Frontend audit log viewer UI.
- `AuditLog` query/search API endpoints.
- Changes to existing service or controller call-sites.

## Capabilities

### New Capabilities
- `request-context`: NestJS-scoped `AsyncLocalStorage` module that makes `{ userId, tenantId }` available globally without parameter threading.
- `prisma-audit-middleware`: Automatic Prisma-level audit capture for all configured model mutations using Prisma `$extends`.

### Modified Capabilities
- None — no existing spec-level behavior changes.

## Approach

1. Create `RequestContextModule` with a global `AsyncLocalStorage` provider and `RequestContextService`.
2. Override `JwtAuthGuard.handleRequest()` to store `{ userId, tenantId }` from the validated Passport user payload in `AsyncLocalStorage`. Do **not** use NestJS middleware for this: middleware runs before guards and cannot reliably read `req.user`.
3. In `PrismaService.onModuleInit()`, register a Prisma `$extends` query extension that:
   - Checks if the operation is in `['create', 'update', 'updateMany']` and the model is in the audited models list.
   - For `update`/`updateMany`, fetches the current record **before** the operation (read-before-write).
   - After the operation, calls `AuditLogService.log({ action, model, oldValues, newValues, changedFields, userId, tenantId })` from `AsyncLocalStorage`.
4. `AuditLogService` uses its own lifecycle-managed standalone `PrismaClient` so `PrismaService` can depend on it without a circular module dependency.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/common/context/` | New | `RequestContextModule`, `RequestContextService`, `RequestContext` provider |
| `apps/api/src/auth/guards/jwt-auth.guard.ts` | Modified | Populate `AsyncLocalStorage` from validated JWT user payload in `handleRequest()` |
| `apps/api/src/database/prisma.service.ts` | Modified | Register Prisma `$extends` query extension in `onModuleInit()` |
| `apps/api/src/audit-log/audit-log.service.ts` | Modified | Activated through standalone Prisma client and called by Prisma audit extension |
| `apps/api/src/app.module.ts` | Modified | Import and apply `RequestContextModule` globally |
| `apps/api/src/audit-log/audit-log.module.ts` | Modified | Export `AuditLogService` for injection into `DatabaseModule` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Circular dependency `PrismaModule ↔ AuditLogModule` | Med | Keep `AuditLogModule` as pure infrastructure; use `forwardRef` only if unavoidable |
| Read-before-write in Prisma audit extension adds latency | Low | Only on audited models; single indexed PK lookup; negligible at consultation volumes |
| `AsyncLocalStorage` context missing on non-HTTP flows (seeds, cron) | Low | Guard with null-check: if no context, skip audit log (don't throw) |
| `updateMany` doesn't return updated records | Med | For `updateMany`, log `args.data` as `newValues` without old-values snapshot; document this limitation in spec |

## Rollback Plan

All changes are additive:
1. Remove Prisma `$extends` audit registration from `PrismaService.onModuleInit()`.
2. Remove `RequestContextModule` from `AppModule`.
3. `AuditLogService` reverts to unused (no data lost).
4. No migration needed — `AuditLog` table already exists in schema.

## Dependencies

- `AuditLog` Prisma model must exist in `prisma/schema.prisma` with fields: `oldValues: Json?`, `newValues: Json?`, `changedFields: String[]`. Verify before starting spec phase.
- `JwtAuthGuard` must be applied globally (already confirmed in exploration).
- JWT payload must include `tenantId`; existing sessions may need re-login after deployment if previous tokens did not include it.

## Deploy Notes

1. If `AuthService` was not already signing `tenantId` into JWTs, invalidate existing sessions or require users to re-login after deploy so `JwtAuthGuard.handleRequest()` receives tenant context.
2. No DB migration is expected if the existing `AuditLog` table already has `oldValues`, `newValues`, and `changedFields`.
3. Rollback is code-only: remove the Prisma `$extends` audit registration from `PrismaService.onModuleInit()` and revert the `JwtAuthGuard.handleRequest()` context population.

## Success Criteria

- [ ] Every `create` and `update` on audited models writes an `AuditLog` row with correct `userId`, `tenantId`, `oldValues`, `newValues`, `changedFields`.
- [ ] `AsyncLocalStorage` context is always populated on authenticated requests and gracefully absent on unauthenticated/non-HTTP flows.
- [ ] No circular dependency errors at module bootstrap.
- [ ] No changes required to any existing service or controller.
- [ ] TypeScript strict-mode passes (`pnpm run typecheck` in API container).
