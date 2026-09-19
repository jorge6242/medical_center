# request-context Specification

## Purpose

Define the request-scoped context contract used to expose authenticated `{ userId, tenantId }` to infrastructure code without manually threading those values through every service method.

## Requirements

### Requirement: Request context MUST be backed by AsyncLocalStorage

The backend MUST provide a shared `AsyncLocalStorage<RequestContext>` instance through a global NestJS module.
`RequestContext` MUST include `userId: string` and `tenantId: string`.

#### Scenario: Context is available inside authenticated request execution

- GIVEN an authenticated HTTP request with a validated JWT payload containing `sub` and `tenantId`
- WHEN application code reads the request context during the same request execution
- THEN it MUST receive `{ userId: payload.sub, tenantId: payload.tenantId }`

#### Scenario: Context is absent outside request execution

- GIVEN a non-HTTP flow such as a seed, cron, or direct script
- WHEN application code reads the request context
- THEN it MUST receive `undefined`
- AND the absence of context MUST NOT throw

### Requirement: JwtAuthGuard MUST populate request context after JWT validation

The request context MUST be populated from `JwtAuthGuard.handleRequest()` after Passport validates the JWT user payload.
NestJS middleware MUST NOT be used to read `req.user` for this feature because middleware runs before guards.

#### Scenario: Guard stores authenticated user context

- GIVEN Passport validates a JWT and returns a user payload with `sub` and `tenantId`
- WHEN `JwtAuthGuard.handleRequest()` returns the user
- THEN it MUST store `{ userId: sub, tenantId }` in `AsyncLocalStorage`
- AND downstream controllers, services, and Prisma extensions MUST be able to read that context

#### Scenario: Guard rejects missing user before storing context

- GIVEN Passport returns no user or an authentication error
- WHEN `JwtAuthGuard.handleRequest()` executes
- THEN it MUST throw an unauthorized error
- AND it MUST NOT store a partial or invalid request context

### Requirement: JWT payload MUST include tenantId

Authenticated JWT payloads MUST include `tenantId` so request context can be populated without extra database lookups.

#### Scenario: Login signs tenantId into JWT

- GIVEN a user logs in successfully for a tenant
- WHEN the backend signs the access token
- THEN the JWT payload MUST include the authenticated user's `tenantId`
- AND the payload MUST continue to avoid PII such as document IDs, phone numbers, bank data, or passwords

#### Scenario: Old tokens without tenantId are not accepted for context-dependent requests

- GIVEN an existing session token does not include `tenantId`
- WHEN the user sends an authenticated request after this change is deployed
- THEN the backend SHOULD require re-authentication rather than silently creating incomplete request context

### Requirement: AsyncLocalStorage MUST NOT replace explicit tenant filters

Request context exists for infrastructure concerns such as auditing and correlation.
Business data queries MUST continue to include explicit tenant scoping according to the project tenant-safety rules.

#### Scenario: Service query remains tenant-scoped

- GIVEN a service reads or mutates tenant-scoped business data
- WHEN request context is available
- THEN the service MUST still scope Prisma queries by `tenantId` explicitly
- AND the request context MUST NOT be treated as an automatic authorization layer
