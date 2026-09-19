# Delta for consultations-list-ssp

## ADDED Requirements

### Requirement: Doctor-scoped filtering MUST automatically restrict results

When the authenticated user's role is `doctor` and the JWT payload contains a non-null `doctorId`, the system MUST automatically append `doctorId: req.user.doctorId` to the Prisma `where` clause of `GET /consultations`. The endpoint SHALL NOT expose this filter as a query parameter, to prevent tampering.

#### Scenario: Doctor user sees only own consultations

- GIVEN a doctor user with `role: 'doctor'` and `doctorId: 'doc-001'`
- AND consultations exist for `doc-001`, `doc-002`, and `doc-003`
- WHEN `GET /consultations` is requested
- THEN only consultations where `doctorId = 'doc-001'` are returned
- AND the response metadata reflects the filtered count

#### Scenario: Non-doctor user sees all consultations

- GIVEN an admin user with `role: 'admin'` and no `doctorId`
- AND consultations exist for multiple doctors
- WHEN `GET /consultations` is requested
- THEN all consultations for the tenant are returned
- AND no automatic `doctorId` filter is applied

#### Scenario: Doctor with null doctorId sees empty list

- GIVEN a user with `role: 'doctor'` but `doctorId: null`
- WHEN `GET /consultations` is requested
- THEN the result set is empty
- AND the response metadata shows `total: 0`

## MODIFIED Requirements

### Requirement: Consultations endpoint MUST return tenant-safe paginated results

`GET /consultations` MUST use a consultation-specific query DTO that extends `PaginationQueryDto` and MUST return `PaginatedResponseDto<ConsultationResponseDto>` scoped to the authenticated user's tenant. It SHALL accept `page`, `limit`, `search`, `status`, `fromDate`, `toDate`, `doctorId`, and `specialtyId`. When the caller has `role: 'doctor'` and a valid `doctorId` in the JWT payload, the endpoint SHALL ignore any externally provided `doctorId` parameter and SHALL enforce the JWT-scoped filter.
(Previously: endpoint accepted doctorId only as a query param without role-based enforcement)

#### Scenario: Default paginated request

- GIVEN an authenticated user with consultation read access
- WHEN `GET /consultations` is requested without query params
- THEN the response contains up to 10 consultations for that tenant
- AND metadata includes total, page, limit, totalPages, hasNextPage, and hasPreviousPage

#### Scenario: Tenant isolation

- GIVEN consultations exist for two tenants
- WHEN tenant A requests `GET /consultations`
- THEN no consultation from tenant B is returned

#### Scenario: Doctor role overrides external doctorId param

- GIVEN a doctor user with `doctorId: 'doc-001'`
- WHEN `GET /consultations?doctorId=doc-002` is requested
- THEN the response still only contains consultations for `doc-001`
- AND the external `doctorId` parameter is ignored

## REMOVED Requirements

None.
