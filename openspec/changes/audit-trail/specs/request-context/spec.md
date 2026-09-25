# Request Context Specification

## Purpose

Provide isolated safe metadata for audit and trace correlation.

## MODIFIED Requirements

### Requirement: Context contents and lifecycle

The global context MUST expose authenticated `userId`, `tenantId`, `email`, `role`, correlation/request id, and safe client metadata when available. Public/internal requests MUST have no authenticated tenant or user context; failed authentication MUST retain correlation without inventing tenant data.
(Previously: context exposed only userId, tenantId, email, and role.)

#### Scenario: Authenticated request

- GIVEN a valid JWT and correlation id
- WHEN the request context is initialized
- THEN services read the authenticated identity, tenant, role, and correlation id

#### Scenario: Public or failed-auth request

- GIVEN a public route or invalid login
- WHEN tracing occurs
- THEN user/tenant are null and no tenant enumeration is possible

### Requirement: Async isolation

Each concurrent request MUST have an isolated context and MUST clear it after completion.

#### Scenario: Concurrent requests

- GIVEN two requests with different users and tenants
- WHEN downstream audit writers run
- THEN neither request can observe the other's context

### Requirement: Protected access

Services requiring authenticated tenant context MUST fail with `InternalServerErrorException("Request context not available")` when absent; optional trace emission MUST remain safe outside HTTP requests.

#### Scenario: Protected service without context

- GIVEN a tenant-scoped service is called outside an authenticated request
- WHEN it requires context
- THEN it fails without querying or exposing business data
