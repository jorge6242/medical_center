# Proposal: DataTable Genérico con Server-Side Pagination (SSP)

## Intent

Eliminar paginación client-side en todas las vistas de listado (Pacientes, Doctores, Pagos, etc.) e implementar una tabla genérica reusable con Server-Side Pagination (SSP) usando TanStack Table v8 y shadcn/ui, evolucionando los endpoints existentes sin duplicar lógica.

## Scope

### In Scope
- Componentes genéricos: `DataTable`, `DebouncedSearchInput`, `FilterSelect`
- DTOs genéricos backend: `PaginationQueryDto` y `PaginatedResponseDto<T>`
- Actualizar endpoints `GET /{entities}` para soportar búsqueda, paginación y filtros
- Refactor de páginas existentes a nueva arquitectura de tabla

### Out of Scope
- Filtros avanzados (rangos de fecha, multi-select)
- Sorting server-side (será Phase 2)
- Export CSV/Excel
- Cambios en permisos o ACL

## Capabilities

### New Capabilities
- `data-table-ssp`: Componente genérico `DataTable` con `manualPagination`, estados de carga (`isLoading`), empty state, y soporte para `meta` callbacks (ej. `onEdit`).
- `pagination-dtos`: Contratos genéricos backend `PaginationQueryDto` (page, limit, search) y `PaginatedResponseDto<T>` (data + meta total/page/totalPages/hasNext/hasPrev).

### Modified Capabilities
- None (evolucionamos endpoints existentes, no cambiamos requisitos de negocio).

## Approach

Patrón IoC para inyección de toolbar. TanStack Table en modo `manualPagination`. Backend usa Prisma `$transaction([countQuery, dataQuery])` para consistencia. Implementación por fases: backend genérico → servicios/hooks frontend → UI genérica → refactor de vistas.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/common/dto/` | New | `PaginationQueryDto`, `PaginatedResponseDto` |
| `apps/api/src/{entities}/` | Modified | Controllers y Services aceptan `@Query()` y retornan paginado |
| `apps/web/src/shared/components/ui/` | New | `data-table.tsx`, `debounced-search-input.tsx`, `filter-select.tsx` |
| `apps/web/src/features/*/` | Modified | Refactor de `page.tsx`, nuevos `{entity}-columns.tsx` y `{entity}-toolbar.tsx` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Break list views during migration | Medium | Migrar una entidad a la vez; mantener fallback |
| Performance con búsqueda OR en Prisma | Medium | Limitar `search` a 3 campos indexados; revisar explain |
| Bundle size con `@tanstack/react-table` | Low | Tree-shaking; solo importar hooks usados |

## Rollback Plan

1. Revertir `page.tsx` de la entidad afectada a su versión pre-DataTable.
2. Conservar servicios backend antiguos (sin paginación) hasta que todas las entidades migren.
3. Usar Git para cherry-pick o revert por feature branch.

## Dependencies

- `@tanstack/react-table` (frontend)
- Componentes `Table` de shadcn/ui ya instalados

## Success Criteria

- [ ] Todas las vistas de listado usan `DataTable` con SSP
- [ ] Ninguna tabla hace paginación client-side
- [ ] Backend retorna `meta` correcto (total, totalPages, hasNextPage, hasPreviousPage)
- [ ] Tabla muestra skeleton durante carga y empty state cuando `data.length === 0`
- [ ] `pnpm run typecheck` y `pnpm run lint` pasan en `apps/api` y `apps/web`
