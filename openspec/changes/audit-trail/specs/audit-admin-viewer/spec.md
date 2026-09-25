# Audit Admin Viewer Specification

## Purpose

Allow authorized administrators to inspect tenant-scoped audit evidence safely.

## Requirements

### Requirement: Protected audit endpoint

The API MUST expose a permission-protected, tenant-scoped list/detail view using `audit_logs:read`, bounded pagination, and filters for date range, actor, action, entity, outcome, and correlation id. Responses MUST be redacted DTOs, never Prisma models.

#### Scenario: Authorized filtered page

- GIVEN an administrator with `audit_logs:read` in tenant A
- WHEN they request a valid filtered page
- THEN only matching tenant-A redacted events and a stable pagination cursor are returned

#### Scenario: Missing permission

- GIVEN an authenticated user without `audit_logs:read`
- WHEN they request the endpoint
- THEN the API returns forbidden and does not disclose event data

### Requirement: Administrative UI

The admin UI MUST use a thin App Router page with a service and TanStack Query, show filters, loading, empty, error, and pagination states, and render redacted fields only. It MUST NOT call the API directly from the page or store audit data in persistent browser storage.

#### Scenario: Tenant-safe navigation

- GIVEN an administrator opens the audit view
- WHEN filters and pagination change
- THEN the UI requests the corresponding tenant-scoped page and renders only returned DTO fields

#### Scenario: Empty or denied result

- GIVEN no events match or the API returns forbidden
- WHEN the query resolves
- THEN the UI shows an explicit empty/permission state without exposing raw response payloads
