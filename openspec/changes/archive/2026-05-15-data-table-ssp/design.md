# Design: DataTable Genérico con Server-Side Pagination

## Technical Approach

Implementar una arquitectura de tres capas: **DTOs genéricos backend** → **hooks/services frontend** → **componentes UI genéricos**. Cada entidad migrará incrementalmente reemplazando su `page.tsx` actual por la nueva composición `DataTable + Toolbar + Columns`.

## Architecture Decisions

### Decision: DTOs Genéricos vs. DTOs por Entidad

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Genéricos en `common/dto/` | Reutilización, consistencia API | **Selected** |
| DTOs por entidad | Más tipado, menos abstracción | Rejected — duplicación innecesaria |

**Rationale**: `PaginationQueryDto` con `@Query()` y class-validator es idéntico para todas las entidades. `PaginatedResponseDto<T>` usa genéricos de TypeScript sin perder type safety.

### Decision: IoC via Render Prop para Toolbar

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Render prop `toolbar` | Flexible, desacoplado, testeable | **Selected** |
| Props fijas de filtro | Rígido, no escala a filtros complejos | Rejected |

**Rationale**: Cada entidad tiene filtros distintos (Pacientes: nombre/cédula; Pagos: rango de fecha/método). Un render prop permite inyectar `PatientToolbar` o `PaymentToolbar` sin modificar `DataTable`.

### Decision: Extender `usePatients` vs. Crear `usePaginatedPatients`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Extender hook existente | Menos archivos, breaking change controlado | **Selected** |
| Hook separado | Sin breaking change, más duplicación | Rejected — overkill para este caso |

**Rationale**: `usePatients` recibirá argumentos `(page, limit, search)` y usará `queryKey: ['patients', page, limit, search]` para cache granular. Hooks existentes sin argumentos se deprecarán gradualmente.

## Data Flow

```
User clicks Next Page
       │
       ▼
PatientPage state: { pageIndex, pageSize, search }
       │
       ▼
usePatients({ page: 1, limit: 10, search: "" })
       │
       ▼
getPatients({ page, limit, search }) ──→ apiJson(`/patients?page=1&limit=10&search=`)
       │
       ▼
PatientsController.findAll(@Query() query: PaginationQueryDto)
       │
       ▼
PatientsService.findAll(tenantId, { page, limit, search })
       │
       ▼
prisma.$transaction([
  prisma.patient.count({ where }),
  prisma.patient.findMany({ where, skip, take })
])
       │
       ▼
PaginatedResponseDto<PatientResponseDto> → { data, meta }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/common/dto/pagination-query.dto.ts` | Create | `page`, `limit`, `search` con class-validator decorators |
| `apps/api/src/common/dto/paginated-response.dto.ts` | Create | Generic `data: T[]` + `meta` with pagination fields |
| `apps/api/src/patients/patients.controller.ts` | Modify | `findAll` accepts `@Query() query: PaginationQueryDto` |
| `apps/api/src/patients/patients.service.ts` | Modify | `findAll` returns `PaginatedResponseDto`, uses `$transaction` |
| `apps/web/src/shared/components/ui/data-table.tsx` | Create | Generic TanStack Table wrapper with manualPagination |
| `apps/web/src/shared/components/ui/debounced-search-input.tsx` | Create | Input + `useDebounce` hook encapsulated |
| `apps/web/src/shared/components/ui/filter-select.tsx` | Create | Generic select for status/status-like filters |
| `apps/web/src/features/patients/components/patient-columns.tsx` | Create | Column definitions using `meta.onEdit` |
| `apps/web/src/features/patients/components/patient-toolbar.tsx` | Create | `DebouncedSearchInput` + any entity-specific filters |
| `apps/web/src/app/(dashboard)/pacientes/page.tsx` | Modify | Replace inline table with `DataTable` + `PatientToolbar` |
| `apps/web/src/features/patients/hooks/use-patients.ts` | Modify | Accept `{ page, limit, search }`, use in `queryKey` |
| `apps/web/src/features/patients/services/patients.service.ts` | Modify | `getPatients` accepts query params object |

## Interfaces / Contracts

```typescript
// Backend — apps/api/src/common/dto/pagination-query.dto.ts
export class PaginationQueryDto {
  @IsInt() @Min(1) @Type(() => Number) page: number = 1;
  @IsInt() @Min(1) @Max(100) @Type(() => Number) limit: number = 10;
  @IsString() @IsOptional() search?: string;
}

// Backend — apps/api/src/common/dto/paginated-response.dto.ts
export interface PaginatedResponseDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Frontend — TanStack Table meta
interface DataTableMeta<TData> {
  onEdit?: (row: TData) => void;
  onDeactivate?: (id: string) => void;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `PaginationQueryDto` validation | class-validator tests with `validate()` |
| Unit | `PaginatedResponseDto` factory | Ensure `meta.totalPages` calculates correctly |
| Integration | `GET /patients?page=2&limit=5&search=maria` | supertest + test DB, assert `meta` shape |
| Unit (frontend) | `DebouncedSearchInput` | RTL — input fires `onChange` only after debounce |
| E2E | Navigate pages, search, verify data | jest e2e — full flow through API |

## Migration / Rollout

**Phased by entity**: Pacientes → Doctores → Pagos → resto. Cada fase es un PR independiente. Backend DTOs genéricos se mergean primero en un PR separado para desbloquear entidades en paralelo.

## Open Questions

- [ ] ¿Existe componente `Table` de shadcn/ui o usamos `<table>` nativo? (Investigar antes de Fase 3)
- [ ] ¿Las entidades con filtros complejos (fechas, multi-select) extienden `PaginationQueryDto` o usan DTO separado?
