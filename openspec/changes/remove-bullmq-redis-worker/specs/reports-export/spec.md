# Reports Export Specification

## Purpose
Define how the system generates financial and operational reports synchronously upon request.

## Requirements

### Requirement: Synchronous Report Generation

The system MUST generate reports (PDF or Excel) directly within the HTTP request/response cycle when the export endpoint is called.

#### Scenario: Admin requests a PDF report

- GIVEN an authenticated admin with report permissions
- WHEN the admin calls the report export endpoint with valid date range and type
- THEN the system MUST query the database directly
- AND generate the PDF content inline
- AND return the file as a downloadable blob or stream
- AND the response MUST complete within 10 seconds

#### Scenario: Large date range report

- GIVEN an authenticated admin
- WHEN the admin requests a report spanning more than 30 days
- THEN the system MUST generate the report inline
- AND the response MAY exceed 10 seconds
- AND the system SHOULD return a warning header indicating slow generation

### Requirement: Report Storage and Retrieval

Generated reports MUST be stored in the database with a 24-hour TTL, allowing re-download without regeneration.

#### Scenario: Re-download existing report

- GIVEN a report was generated within the last 24 hours
- WHEN the same request is made again
- THEN the system MUST return the cached blob from the database
- AND skip regeneration

#### Scenario: Expired report

- GIVEN a report was generated more than 24 hours ago
- WHEN a download is requested
- THEN the system MUST regenerate the report inline
- AND replace the expired entry

## REMOVED Behavior

- Queue-based async report generation (BullMQ `reports-export` queue)
- Worker-processed background report jobs
- Polling for report completion status
