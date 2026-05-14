# Medical Management SaaS SDD Proposal

## Problem
The repository already implies a medical management platform, but the product boundary, backend module map, and API contracts are not yet formalized in a single specification. That makes implementation drift likely across NestJS, Next.js, Prisma, and background jobs.

## Objective
Define the target architecture and API surface for the current product direction so implementation can proceed consistently across backend and frontend.

## Included Scope
- NestJS modular backend structure and domain boundaries
- Next.js App Router frontend structure with custom components and Tailwind
- Prisma/PostgreSQL persistence model assumptions
- Redis/BullMQ background processing assumptions
- API contracts for auth, patients, doctors, specialties/services, payments, receipts, expenses, and home stats
- Tenant-aware access and ACL rules

## Excluded Scope
- New product lines outside the current medical management flow
- Mobile apps
- Public marketing site
- Advanced analytics, BI, or forecasting beyond the current home stats view
- Insurance, inventory, pharmacy, scheduling, or EMR modules not already implied by the repo

## Proposed Approach
- Keep a Clean Architecture style at the module level: controllers handle transport, services hold business rules, PrismaService handles persistence, and shared DTOs define contracts.
- Preserve the current monolith modular split in NestJS: auth, patients, doctors, specialties, payments, receipts, expenses, stats, app config, roles, audit log, and queues.
- Keep Next.js as a thin presentation layer using App Router, server components by default, TanStack Query for server state, and feature-based folders per domain.
- Formalize payment and receipt generation as a core flow with queue-backed side effects for email and asynchronous receipt processing.
- Treat tenant isolation as mandatory for all business endpoints.

## Main Domain Boundaries
- Auth and session management
- Patients registry
- Doctors registry and doctor split configuration
- Specialties and service prices
- Payments, adjustments, and voiding
- Receipts and receipt snapshot generation
- Expenses and voiding
- Home stats / dashboard aggregates
- Roles and permissions for ACL

## Key Risks
- Contract drift between current implementation and formal API shapes
- Ambiguity around which entities are tenant-scoped versus global reference data
- Receipt generation flow may depend on internal queue semantics not yet fully documented
- Some frontend pages may already exist with behavior that needs to be aligned to the final contracts

## Open Assumptions
- The system is tenant-aware and every operational entity is scoped by `tenantId`.
- Background jobs are used for receipt generation and email delivery, not for core synchronous CRUD.
- Expenses categories are global reference data unless the implementation proves otherwise.
- Receipts are generated from payment snapshots and are not reconstructed from mutable doctor or specialty records.

## Pending Decisions
- Final shape of shared DTOs in `packages/shared`
- Whether stats/home needs cache invalidation through Redis or is computed on demand
- Whether queue consumers live inside `apps/api` or the separate `apps/worker` runtime for every job type
