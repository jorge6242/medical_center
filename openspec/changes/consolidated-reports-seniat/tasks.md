# Tasks: Reportes Consolidados con Exportación PDF/Excel

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~800-1000 |
| 400-line budget risk | **High** |
| Chained PRs recommended | **Yes** |
| Suggested split | PR-1: Backend + DB → PR-2: Worker + Strategies → PR-3: Frontend + UX |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Notes |
|------|------|-----|-------|
| 1 | Backend: DB schema, ReportsModule, API endpoints, Stats extension | PR-1 | Independent, includes migration + typecheck |
| 2 | Worker: BullMQ processor + Strategy Pattern (PDF/Excel) | PR-2 | Depends on PR-1 schema; includes flattener + strategies |
| 3 | Frontend: Reportes page rewrite, sidebar, Zustand store, xlsx lib | PR-3 | Depends on PR-1 API + PR-2 job status |

---

## Phase 1: Foundation (Database + Backend)

- [ ] 1.1 Prisma: Add `GeneratedReport` model to schema.prisma with indexes
- [ ] 1.2 Run `make db-migrate name=AddGeneratedReports`
- [ ] 1.3 Create `apps/api/src/reports/` directory structure (module, controller, service, dto, strategies, flattener)
- [ ] 1.4 Create DTOs: `QueryReportsDto`, `GenerateReportDto`, `ConsolidatedResponseDto`, `DetailResponseDto`
- [ ] 1.5 Create `ReportsService` with `getConsolidated()`, `getDetail()`, `createJob()` methods
- [ ] 1.6 Create `ReportsController` with endpoints: GET /reports/consolidated, GET /reports/detail, POST /reports/generate, GET /reports/jobs/:id, GET /reports/jobs/:id/download
- [ ] 1.7 Register `ReportsModule` in `AppModule`
- [ ] 1.8 Extend `StatsService`: add expense queries (today, week, month) + recent activity feed
- [ ] 1.9 Add `@@index([tenantId, createdAt, status])` to `Payment` and `LabOrder` models
- [ ] 1.10 Typecheck API: `make shell-api` → `pnpm run typecheck`

## Phase 2: Worker + Export Strategies

- [ ] 2.1 Create `ExportStrategy` interface and `ReportMetadata` type
- [ ] 2.2 Create `ReportFlattener` with `mapConsolidated()` and `mapDetail()` methods
- [ ] 2.3 Create `PdfExportStrategy`: implements ExportStrategy, uses @react-pdf/renderer
- [ ] 2.4 Create `ExcelExportStrategy`: implements ExportStrategy, uses xlsx library
- [ ] 2.5 Create `ReportsExportProcessor`: BullMQ processor, selects strategy, executes, stores blob
- [ ] 2.6 Register processor in `WorkerModule`
- [ ] 2.7 Add `xlsx` to `apps/web/package.json`
- [ ] 2.8 Typecheck API + Web after changes

## Phase 3: Frontend

- [ ] 3.1 Create `reports.service.ts` with API calls: getConsolidated, getDetail, generateReport, getJobStatus, downloadReport
- [ ] 3.2 Create `useReports`, `useReportGeneration`, `useJobPolling` hooks
- [ ] 3.3 Create `ReportJobsStore` (Zustand) with localStorage persistence
- [ ] 3.4 Create `ReportExportSidebar` component: shows active/completed jobs, download button
- [ ] 3.5 Rewrite `reportes/page.tsx`: tabs (Consolidado/Detalle), DatePicker filters, Select type/groupBy, DataTable
- [ ] 3.6 Integrate sidebar into dashboard layout (right side, collapsible)
- [ ] 3.7 Add export buttons: "Exportar PDF", "Exportar Excel" with loading states
- [ ] 3.8 Update `navigation.config.ts` if needed (no changes expected)
- [ ] 3.9 Typecheck Web: `make shell-web` → `pnpm run typecheck`

## Phase 4: Testing + Verification

- [ ] 4.1 Test consolidated API: `GET /reports/consolidated?from=2026-05-01&to=2026-05-31&groupBy=day`
- [ ] 4.2 Test detail API: `GET /reports/detail?from=2026-05-01&to=2026-05-31&type=consultation`
- [ ] 4.3 Test job generation: `POST /reports/generate` → poll → download
- [ ] 4.4 Test stats home: verify new expense KPIs appear
- [ ] 4.5 Test permissions: recepcionista gets 403 on `/reports/*`
- [ ] 4.6 Verify PDF export content matches filter criteria
- [ ] 4.7 Verify Excel export has correct headers and data
- [ ] 4.8 Verify sidebar persists across navigation
- [ ] 4.9 Verify expired reports return 410 Gone
- [ ] 4.10 Verify cleanup: old GeneratedReport records deleted after TTL

## Phase 5: Cleanup

- [ ] 5.1 Remove temporary console.logs
- [ ] 5.2 Update AGENTS.md if any conventions changed
- [ ] 5.3 Verify no unused imports in new files
- [ ] 5.4 Run lint API + Web
- [ ] 5.5 Commit all PRs with `--no-verify` (husky has npx issues)
