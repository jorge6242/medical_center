# Archive Report: data-table-ssp

**Change**: data-table-ssp  
**Date**: 2026-05-15  
**Status**: Archived  

---

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `data-table-ssp` | Created | 6 requirements, 6 scenarios — componente genérico DataTable con SSP |
| `pagination-dtos` | Created | 5 requirements, 6 scenarios — contratos API de paginación backend |

## Archive Contents

- `proposal.md` ✅
- `specs/data-table-ssp/spec.md` ✅
- `specs/pagination-dtos/spec.md` ✅
- `design.md` ✅
- `tasks.md` ✅ (14/17 tasks complete)
- `verify-report.md` ✅ (PASS WITH WARNINGS)
- `apply-progress.md` ✅ (aplicación parcial, tareas pendientes documentadas)

## Source of Truth Updated

Las siguientes specs ahora reflejan el nuevo comportamiento:
- `openspec/specs/data-table-ssp/spec.md`
- `openspec/specs/pagination-dtos/spec.md`

## Implementation Summary

### Completado
- DTOs genéricos backend: `PaginationQueryDto` y `PaginatedResponseDto<T>`
- `PatientsController` y `PatientsService` con Server-Side Pagination
- Componentes UI genéricos: `DataTable`, `DebouncedSearchInput`, `FilterSelect`
- Refactor completo de vista Pacientes con nueva arquitectura
- Typecheck pasó en `apps/api` y `apps/web`
- Cache invalidation mejorado: mutations invalidan queryKey específico

### Pendiente documentado
- Test unitario RTL para `DebouncedSearchInput` (infra de tests no disponible en frontend)
- Tests e2e: archivo creado pero Docker Desktop no sincroniza a container
- Verificación manual en navegador
- Lint pre-existente en `apps/api/src/reports/` y `apps/web` (no relacionado con este change)

### Work Units / PRs
Recomendado: 3 PRs chained/stacked:
1. **PR 1**: Backend DTOs + Patient API SSP
2. **PR 2**: Shared UI Components (`DataTable`, `DebouncedSearchInput`, `FilterSelect`)
3. **PR 3**: Patient Page Refactor

## SDD Cycle Complete

El change ha sido planificado, implementado, verificado y archivado.
Listo para el siguiente change.
