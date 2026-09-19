# Design: Reportes Consolidados con Exportación PDF/Excel

## Technical Approach

Backend aggregation queries (Prisma) → BullMQ job queue → Worker Strategy Pattern → PostgreSQL blob storage → Frontend polling + download.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Report generation | Async via BullMQ worker | Sync in request handler | Worker handles heavy PDF/Excel generation without blocking API; survives browser disconnect |
| File storage | PostgreSQL bytea blob | S3 / filesystem | No new infra; backups included; TTL cleanup built-in |
| PDF library | `@react-pdf/renderer` (frontend) | pdfmake / puppeteer backend | Already installed; consistent with existing receipt generation pattern |
| Excel library | `xlsx` (SheetJS) in frontend | exceljs backend | Lightweight (~500KB); no Docker changes; handles aggregated data easily |
| Data aggregation | Prisma raw queries + JS grouping | Pure SQL views | Prisma queries are maintainable; indexes handle performance |
| UX for async jobs | Right sidebar panel | Toast-only | Persistent sidebar survives navigation; user can track multiple jobs |

## Data Flow

```
Frontend (/reportes)
  ├── POST /reports/generate → { jobId }
  ├── Poll GET /reports/jobs/:id (every 2s)
  └── Sidebar shows: Generating → Ready → Download
        ↑
API (ReportsController + ReportsService)
  ├── Validates params
  ├── Creates BullMQ job
  └── Returns jobId immediately
        ↑
Redis + BullMQ
  ├── Queue: reports:export
  └── Worker picks up job
        ↑
Worker (ReportsExportProcessor)
  ├── Strategy Pattern:
  │   ├── PdfExportStrategy → @react-pdf/renderer
     └── ExcelExportStrategy → xlsx
  ├── Flattener maps DB data → flat rows
  └── Saves blob to GeneratedReport table
        ↑
PostgreSQL
  └── generated_reports (blob + metadata + TTL)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/reports/reports.module.ts` | Create | NestJS module registering controller, service, strategies |
| `apps/api/src/reports/reports.controller.ts` | Create | Endpoints: GET /reports/consolidated, GET /reports/detail, POST /reports/generate, GET /reports/jobs/:id, GET /reports/jobs/:id/download |
| `apps/api/src/reports/reports.service.ts` | Create | Aggregation logic: Prisma queries for income/expenses by day/week/month; detail queries with filters |
| `apps/api/src/reports/dto/` | Create | DTOs: QueryReportsDto, GenerateReportDto, ConsolidatedRecordDto, DetailRecordDto |
| `apps/api/src/reports/interfaces/export-strategy.interface.ts` | Create | Strategy interface: generate(data, metadata) → Promise<Buffer> |
| `apps/api/src/reports/strategies/pdf-export.strategy.ts` | Create | PdfExportStrategy: uses @react-pdf/renderer, maps flat data to table rows |
| `apps/api/src/reports/strategies/excel-export.strategy.ts` | Create | ExcelExportStrategy: uses xlsx library, creates worksheet from flat data |
| `apps/api/src/reports/flattener/report-flattener.ts` | Create | Maps complex DB entities → flat JSON for templates |
| `apps/worker/src/worker/reports-export.processor.ts` | Create | BullMQ processor: dequeues job, selects strategy, executes, stores result |
| `apps/api/prisma/schema.prisma` | Modify | Add GeneratedReport model |
| `apps/api/src/stats/stats.service.ts` | Modify | Add expense metrics and recent activity feed |
| `apps/api/src/app.module.ts` | Modify | Register ReportsModule |
| `apps/web/src/app/(dashboard)/reportes/page.tsx` | Modify | Rewrite: tabs (Consolidado/Detalle), DatePickers, Select filters, DataTable, export buttons |
| `apps/web/src/features/reports/` | Create | Hooks (useReports, useReportGeneration), services (reports.service.ts), components (ReportExportSidebar, ReportTable) |
| `apps/web/package.json` | Modify | Add `xlsx` dependency |
| `apps/web/src/stores/report-jobs.store.ts` | Create | Zustand store: activeJobs, addJob, updateJob, removeJob; persists to localStorage |

## Interfaces

```typescript
// Strategy Pattern
interface ExportStrategy {
  generate(data: FlatRow[], meta: ReportMetadata): Promise<Buffer>;
}

// Job status for frontend polling
interface ReportJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  format: 'pdf' | 'excel';
  filename?: string;
  sizeBytes?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// Zustand store
interface ReportJobsStore {
  jobs: ReportJobStatus[];
  addJob: (job: ReportJobStatus) => void;
  updateJob: (jobId: string, updates: Partial<ReportJobStatus>) => void;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Flattener mapping, Strategy selection logic | Jest with mock data |
| Integration | ReportsService aggregation queries | Test against seeded DB |
| Integration | Worker processor with BullMQ | TestContainer with Redis |
| E2E | Full flow: generate → poll → download | Cypress/Playwright |

## Migration

1. Prisma migration: `npx prisma migrate dev --name add_generated_reports`
2. Install xlsx: `pnpm add xlsx` in `apps/web/`
3. Restart worker container to pick up new processor
4. Seed: no data migration needed (new feature)

## Open Questions

- None — design ready for implementation.
