# Reports Export Specification

## Purpose

Generación asíncrona de archivos PDF y Excel para reportes consolidados y detalle, implementando Strategy Pattern en worker.

## Requirements

### Requirement: Async Job Creation

The system MUST queue report generation jobs and return immediate acknowledgment.

#### Scenario: Admin requests Excel export

- GIVEN admin with `reports:read` permission
- WHEN `POST /reports/generate` with body `{ type: 'consolidated', format: 'excel', from: '2026-05-01', to: '2026-05-31', groupBy: 'day' }`
- THEN returns 202 Accepted with `{ jobId: 'uuid', status: 'pending' }`
- AND creates BullMQ job with payload

#### Scenario: Admin requests PDF export

- GIVEN admin with reports access
- WHEN `POST /reports/generate` with body `{ type: 'detail', format: 'pdf', from: '2026-05-01', to: '2026-05-31', recordType: 'consultation' }`
- THEN returns 202 Accepted with jobId
- AND queues job with appropriate strategy

#### Scenario: Invalid format

- GIVEN admin with reports access
- WHEN `POST /reports/generate` with format: 'csv' (not supported)
- THEN returns 400 Bad Request with message "Format not supported"

#### Scenario: Invalid type

- GIVEN admin with reports access
- WHEN `POST /reports/generate` with type: 'custom'
- THEN returns 400 Bad Request with message "Type must be consolidated or detail"

### Requirement: Worker Strategy Pattern

The worker MUST implement Strategy Pattern for different export formats.

#### Scenario: PdfExportStrategy processes consolidated data

- GIVEN a pending job with format: 'pdf' and type: 'consolidated'
- WHEN worker processor executes
- THEN PdfExportStrategy.generate() is invoked
- AND queries consolidated data via ReportsService
- AND maps data to flat array using Flattener
- AND generates PDF with @react-pdf/renderer
- AND stores blob in GeneratedReport table

#### Scenario: ExcelExportStrategy processes detail data

- GIVEN a pending job with format: 'excel' and type: 'detail'
- WHEN worker processor executes
- THEN ExcelExportStrategy.generate() is invoked
- AND queries detail data via ReportsService
- AND maps data to worksheet rows using Flattener
- AND generates .xlsx with xlsx library
- AND stores blob in GeneratedReport table

#### Scenario: Job fails and retries

- GIVEN a processing job that throws database error
- WHEN worker catches exception
- THEN marks job as failed after 3 attempts with exponential backoff
- AND updates status to 'failed' in GeneratedReport
- AND stores error message for user notification

### Requirement: Job Progress Tracking

The system MUST allow querying job status.

#### Scenario: Query pending job

- GIVEN a recently queued job
- WHEN `GET /reports/jobs/:jobId`
- THEN returns `{ jobId, status: 'pending', progress: 0, createdAt }`

#### Scenario: Query processing job

- GIVEN a job being processed by worker
- WHEN `GET /reports/jobs/:jobId`
- THEN returns `{ jobId, status: 'processing', progress: 45, createdAt }`

#### Scenario: Query completed job

- GIVEN a finished job with generated file
- WHEN `GET /reports/jobs/:jobId`
- THEN returns `{ jobId, status: 'completed', filename: 'reporte-mayo-2026.pdf', size: 245760, createdAt, completedAt }`

#### Scenario: Query failed job

- GIVEN a job that failed after retries
- WHEN `GET /reports/jobs/:jobId`
- THEN returns `{ jobId, status: 'failed', error: 'Database timeout', createdAt }`

#### Scenario: Non-existent job

- GIVEN invalid jobId
- WHEN `GET /reports/jobs/:jobId`
- THEN returns 404 Not Found

## Flattener Interface

```typescript
interface ReportDataFlattener {
  mapConsolidated(data: ConsolidatedRecord[]): FlatRow[];
  mapDetail(data: DetailRecord[]): FlatRow[];
}

interface FlatRow {
  [key: string]: string | number;
}
```

## Strategy Interface

```typescript
interface ExportStrategy {
  generate(data: FlatRow[], metadata: ReportMetadata): Promise<Buffer>;
}

interface ReportMetadata {
  title: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  tenantName: string;
}
```
