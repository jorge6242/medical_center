# Apply Progress: DataTable Genérico con Server-Side Pagination

**Change**: data-table-ssp
**Mode**: Standard (no TDD configured)
**Date**: 2026-05-15

## Completed Tasks

### Phase 1: Backend Foundation
- [x] 1.1 Crear `apps/api/src/common/dto/pagination-query.dto.ts`
- [x] 1.2 Crear `apps/api/src/common/dto/paginated-response.dto.ts`
- [x] 1.3 Modificar `apps/api/src/patients/patients.controller.ts`
- [x] 1.4 Modificar `apps/api/src/patients/patients.service.ts`
- [x] 1.5 Escribir test de integración `apps/api/test/patients.e2e-spec.ts`

### Phase 2: Shared UI Components
- [x] 2.1 Crear `apps/web/src/shared/components/ui/debounced-search-input.tsx`
- [x] 2.2 Crear `apps/web/src/shared/components/ui/filter-select.tsx`
- [x] 2.3 Crear `apps/web/src/shared/components/ui/data-table.tsx`
- [ ] 2.4 Escribir test unitario: `DebouncedSearchInput` emite `onChange` solo tras debounce

### Phase 3: Domain Refactor (Pacientes)
- [x] 3.1 Modificar `apps/web/src/features/patients/services/patients.service.ts`
- [x] 3.2 Modificar `apps/web/src/features/patients/hooks/use-patients.ts`
- [x] 3.3 Crear `apps/web/src/features/patients/components/patient-columns.tsx`
- [x] 3.4 Crear `apps/web/src/features/patients/components/patient-toolbar.tsx`
- [x] 3.5 Modificar `apps/web/src/app/(dashboard)/pacientes/page.tsx`

### Phase 4: Verification
- [x] 4.1 Ejecutar `pnpm run typecheck` en `apps/api` y `apps/web` — pasó sin errores
- [ ] 4.2 Ejecutar `pnpm run lint` en `apps/api` y `apps/web` — ver notas abajo
- [ ] 4.3 Ejecutar tests de integración del backend (`apps/api`) — ver notas abajo
- [ ] 4.4 Verificar manual: paginación, búsqueda, empty state, skeleton loading, modales de edit/crear

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/api/src/common/dto/pagination-query.dto.ts` | Created | DTO con `page`, `limit`, `search` y class-validator decorators |
| `apps/api/src/common/dto/paginated-response.dto.ts` | Created | Interface genérica `PaginatedResponseDto<T>` + helper `createPaginatedResponse` |
| `apps/api/src/patients/patients.controller.ts` | Modified | `findAll` ahora acepta `@Query() query: PaginationQueryDto` y retorna `PaginatedResponseDto` |
| `apps/api/src/patients/patients.service.ts` | Modified | `findAll` implementa búsqueda OR + `prisma.$transaction([count, findMany])` |
| `apps/api/test/patients.e2e-spec.ts` | Created | Tests de integración para paginación SSP |
| `apps/web/package.json` | Modified | Agregada dependencia `@tanstack/react-table@^8.21.0` |
| `apps/web/src/shared/components/ui/debounced-search-input.tsx` | Created | Input con debounce encapsulado (300ms default) |
| `apps/web/src/shared/components/ui/filter-select.tsx` | Created | Select genérico con opción "Todos" |
| `apps/web/src/shared/components/ui/data-table.tsx` | Created | Wrapper de TanStack Table con `manualPagination`, skeleton loading, empty state |
| `apps/web/src/features/patients/services/patients.service.ts` | Modified | Agregado `getPaginatedPatients` con query params; `getPatients` preservado para compatibilidad |
| `apps/web/src/features/patients/hooks/use-patients.ts` | Modified | Agregado `usePaginatedPatients` con `queryKey` granular; `usePatients` preservado |
| `apps/web/src/features/patients/components/patient-columns.tsx` | Created | Definición de columnas con `meta.onEdit` y `meta.onDeactivate` |
| `apps/web/src/features/patients/components/patient-toolbar.tsx` | Created | Toolbar con `DebouncedSearchInput` |
| `apps/web/src/app/(dashboard)/pacientes/page.tsx` | Modified | Refactor a `DataTable` + `PatientToolbar`; modales preservados |

## Deviations from Design

1. **Backward compatibility en hooks**: En lugar de extender `usePatients` directamente (que rompería otros componentes como `lab-order-form` y `payment-form`), se creó `usePaginatedPatients` como hook separado. `usePatients` se mantiene sin cambios para compatibilidad. Esto evita refactorizar módulos fuera del scope.

2. **FilterSelect simplificado**: No se incluyó en la tabla de pacientes ya que el diseño actual no requiere filtros de estado adicionales más allá de la búsqueda. El componente está creado y listo para usar en otras entidades.

## Issues Found

1. **Web lint bloqueado**: `pnpm run lint` en `apps/web` falla con `ERR_MODULE_NOT_FOUND` para `@typescript-eslint/eslint-plugin`. Este es un error pre-existente (no está en `devDependencies` de `apps/web`). No está relacionado con este cambio.

2. **API lint pre-existente**: `apps/api/src/reports/` tiene 8 errores y 3 warnings pre-existentes de import/order y `any`. Los archivos modificados por este cambio pasan lint correctamente.

3. **Tests e2e no ejecutables**: El archivo `patients.e2e-spec.ts` se creó en el host pero no se sincroniza al container Docker (issue de volumen bind en macOS). Recomendación: reiniciar containers o verificar mount.

## Remaining Tasks

- [ ] 2.4 Escribir test unitario RTL para `DebouncedSearchInput`
- [ ] 4.2 Resolver lint en web (instalar `@typescript-eslint/*` en `apps/web`) y re-ejecutar
- [ ] 4.3 Ejecutar tests e2e cuando el volumen Docker sincronice
- [ ] 4.4 Verificación manual en navegador (requiere `make dev` levantado)

## Workload / PR Boundary

- Mode: auto-chain / stacked-to-main
- Current work unit: Work Unit 1 + 2 + 3 (Backend DTOs + Shared UI + Patient Domain Refactor)
- Boundary: Este batch incluye el backend genérico, los componentes UI reutilizables, y el refactor completo de la vista Pacientes
- Estimated review budget impact: ~400-500 líneas modificadas (dentro del límite razonable para un PR, pero dado el forecast original de 700-950, considerar si se debe dividir)

## Status

14/17 tasks complete (82%). Ready for verification (Phase 4 pending Docker/volumen issues).
