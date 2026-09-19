# Request Context Specification

## Purpose

Provides a globally available `RequestContextModule` that stores `{ userId, tenantId, email, role }` from the decoded JWT into Node.js `AsyncLocalStorage` at the start of each HTTP request. Downstream services read context via `RequestContextService.getContext()` instead of receiving tenant/user data as method parameters.

## Requirements

### Requirement: Global Module Registration

The `RequestContextModule` MUST be decorated with `@Global()` and registered once in `AppModule`. It MUST NOT be imported manually in feature modules.

#### Scenario: Module available across feature modules

- GIVEN `RequestContextModule` is registered in `AppModule` imports
- WHEN any feature service calls `RequestContextService.getContext()`
- THEN the context is resolved without importing `RequestContextModule` in the feature module

### Requirement: Middleware Context Injection

`RequestContextMiddleware` MUST run after `JwtAuthGuard` validates the JWT. It MUST read `req.user` (set by Passport) and store `{ userId: req.user.sub, tenantId: req.user.tenantId, email: req.user.email, role: req.user.role }` into the active `AsyncLocalStorage` store for the duration of the request.

#### Scenario: Authenticated request populates context

- GIVEN a valid JWT is present in the request cookie
- WHEN `JwtAuthGuard` validates the token and `RequestContextMiddleware` runs
- THEN `RequestContextService.getContext()` returns `{ userId, tenantId, email, role }` within that request's async scope

#### Scenario: Public route — no user on request

- GIVEN an endpoint decorated with `@Public()` (JWT guard returns `true` without setting `req.user`)
- WHEN `RequestContextMiddleware` executes
- THEN the middleware MUST skip context injection and leave the store as `null`
- AND `RequestContextService.getContext()` returns `null` for that request

#### Scenario: Internal request — no user on request

- GIVEN an endpoint decorated with `@InternalRequest()` (JWT guard short-circuits)
- WHEN `RequestContextMiddleware` executes
- THEN the middleware MUST skip context injection
- AND `RequestContextService.getContext()` returns `null` for that request

### Requirement: Context Accessor

`RequestContextService` MUST expose a `getContext()` method that returns `{ userId: string; tenantId: string; email: string; role: string } | null`. It MUST return `null` when no context is stored in the current async scope.

#### Scenario: Context read within authenticated request scope

- GIVEN an authenticated request has set context
- WHEN a service calls `RequestContextService.getContext()`
- THEN it returns the same `{ userId, tenantId, email, role }` stored by the middleware

#### Scenario: Context read outside any request scope

- GIVEN code running outside an HTTP request (seed scripts, cron jobs)
- WHEN `RequestContextService.getContext()` is called
- THEN it returns `null` without throwing

### Requirement: Protected Route Guard

Services MUST throw `InternalServerErrorException` if `getContext()` returns `null` on a route that requires authentication (i.e., the service was reached without a valid auth context).

#### Scenario: Null context on protected service call

- GIVEN a service method that requires `tenantId` from context
- WHEN `getContext()` returns `null`
- THEN the service MUST throw `InternalServerErrorException` with message `"Request context not available"`
- AND the error MUST propagate to the global `HttpExceptionFilter`

### Requirement: AsyncLocalStorage Isolation

Each HTTP request MUST have an isolated `AsyncLocalStorage` store. Context from one concurrent request MUST NOT leak into another.

#### Scenario: Concurrent requests maintain isolated context

- GIVEN two simultaneous authenticated requests with different `userId` values
- WHEN both requests call `RequestContextService.getContext()`
- THEN each returns its own `userId` without cross-contamination
