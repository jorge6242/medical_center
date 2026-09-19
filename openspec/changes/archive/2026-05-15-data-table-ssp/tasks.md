# Tasks: DataTable Genérico con Server-Side Pagination

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 700–950 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Backend DTOs + Patient API) → PR 2 (Shared UI components) → PR 3 (Patient page refactor) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend DTOs genéricos + `PatientsController`/`Service` con SSP | PR 1 | Tests de integración incluidos |
| 2 | Componentes UI genéricos (`DataTable`, `DebouncedSearchInput`, `FilterSelect`) | PR 2 | Tests unitarios RTL incluidos |
| 3 | Refactor de vista Pacientes (`page.tsx`, `columns`, `toolbar`, hooks) | PR 3 | Depende de PR 1 y PR 2 |

## Phase 1: Backend Foundation

- [x] 1.1 Crear `apps/api/src/common/dto/pagination-query.dto.ts` con `page`, `limit`, `search` y class-validator decorators
- [x] 1.2 Crear `apps/api/src/common/dto/paginated-response.dto.ts` con generic `data` + `meta` (total, page, limit, totalPages, hasNextPage, hasPreviousPage)
- [x] 1.3 Modificar `apps/api/src/patients/patients.controller.ts`: `findAll` acepta `@Query() query: PaginationQueryDto`
- [x] 1.4 Modificar `apps/api/src/patients/patients.service.ts`: `findAll` retorna `PaginatedResponseDto`, usa `prisma.$transaction([count, findMany])`
- [x] 1.5 Escribir test de integración: `GET /patients?page=2&limit=5&search=maria` retorna `meta` correcto

## Phase 2: Shared UI Components

- [x] 2.1 Crear `apps/web/src/shared/components/ui/debounced-search-input.tsx` (Input + `useDebounce` encapsulado)
- [x] 2.2 Crear `apps/web/src/shared/components/ui/filter-select.tsx` (Select genérico con `value`, `onChange`, `options`)
- [x] 2.3 Crear `apps/web/src/shared/components/ui/data-table.tsx` (TanStack Table wrapper con `manualPagination`, `isLoading`, empty state, `meta` callbacks)
- [ ] 2.4 Escribir test unitario: `DebouncedSearchInput` emite `onChange` solo tras debounce

## Phase 3: Domain Refactor (Pacientes)

- [x] 3.1 Modificar `apps/web/src/features/patients/services/patients.service.ts`: `getPatients` acepta `{ page, limit, search }` y construye query string
- [x] 3.2 Modificar `apps/web/src/features/patients/hooks/use-patients.ts`: `usePatients` recibe args y usa `queryKey: ['patients', page, limit, search]`
- [x] 3.3 Crear `apps/web/src/features/patients/components/patient-columns.tsx` con definición de columnas y `meta.onEdit`/`meta.onDeactivate`
- [x] 3.4 Crear `apps/web/src/features/patients/components/patient-toolbar.tsx` con `DebouncedSearchInput` inyectado en `DataTable`
- [x] 3.5 Modificar `apps/web/src/app/(dashboard)/pacientes/page.tsx`: reemplazar tabla inline por `DataTable` + `PatientToolbar`, mantener modales

## Phase 4: Verification

- [x] 4.1 Ejecutar `pnpm run typecheck` en `apps/api` y `apps/web` — debe pasar sin errores
- [ ] 4.2 Ejecutar `pnpm run lint` en `apps/api` y `apps/web` — debe pasar sin errores
- [ ] 4.3 Ejecutar tests de integración del backend (`apps/api`) — todos deben pasar
- [ ] 4.4 Verificar manual: paginación, búsqueda, empty state, skeleton loading, modales de edit/crear
