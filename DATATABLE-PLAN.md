# Plan de Implementación: DataTable Genérico y Paginación Server-Side (SSP)

Este documento detalla la arquitectura y el paso a paso para implementar una tabla centralizada, escalable y genérica utilizando **TanStack Table v8** y **shadcn/ui**, aplicando Server-Side Pagination (SSP) y el patrón de Inversión de Control (IoC) para la inyección de filtros.

## 1. Arquitectura y Componentes Clave

### A. Componentes Genéricos (Shared)

Vivirán en `apps/web/src/shared/components/ui/` y servirán para todas las entidades del sistema (Pacientes, Doctores, Pagos, etc.).

1. **`DataTable`** (`data-table.tsx`):
   - El orquestador global.
   - Recibe `data`, `columns`, `toolbar` (Render Prop) y handlers para paginación y hooks manuales (`meta`).
   - Configurado en modo `manualPagination` para delegar el control al backend.
   - Maneja la propiedad `isLoading` mostrando un _Skeleton_ o _Spinner_ como loader durante las peticiones asíncronas.
   - Incorpora un estado vacío (Empty State) mostrando un mensaje amigable cuando no se encuentran resultados (`data.length === 0`).

2. **`DebouncedSearchInput`**:
   - Encapsula un `Input` + `useDebounce`.
   - Propiedades: `value`, `onChange` (emite solo tras dejar de escribir), `placeholder`, `label`.

3. **`FilterSelect`**:
   - Selector genérico para filtros de estado (ej. Activo / Inactivo).
   - Propiedades: `value`, `onChange`, `options`.

### B. Componentes de Dominio (Ej. `{Entity}`)

Vivirán en `apps/web/src/features/{entity}/components/`.

1. **`{entity}-columns.tsx`**:
   - Definición estática del array de columnas para la entidad.
   - La columna de "Acciones" utiliza `table.options.meta.onActionName` (ej. `onEdit`) para ejecutar el callback sin acoplar la tabla a la data de la página.

2. **`{Entity}Toolbar`**:
   - Inyectado en el `DataTable`.
   - Usará `DebouncedSearchInput` para las columnas principales y el `FilterSelect` para filtros de estado, pasándole su valor al contenedor principal.

## 2. Ajustes en el Backend (NestJS)

El endpoint actual (`GET /{entities}`) será actualizado para soportar búsquedas y paginación desde la base de datos (Prisma). En lugar de crear un endpoint nuevo por cada tabla, **evolucionaremos el actual** implementando DTOs genéricos que puedan reutilizarse en todas las entidades del sistema.

- **Contrato de Petición (`PaginationQueryDto`):**
  - Tendrá propiedades estándar: `page` (default 1), `limit` (default 10).
  - Permitirá parámetros adicionales como `search` (opcional) y será extensible a otros filtros futuros (`status`, `dateRange`, etc.).
- **Response Format estandarizado (`PaginatedResponseDto<T>`):**
  ```json
  {
    "data": [
      /* ARRAY DE PACIENTES O ENTIDAD CORRESPONDIENTE */
    ],
    "meta": {
      "total": 150,
      "page": 1,
      "limit": 10,
      "totalPages": 15,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
  ```

## 3. Comportamiento en la Vista (`page.tsx`)

La página `${Entity}Page` se convierte en un orquestador:

- Controla el estado principal de paginación (`{ pageIndex, pageSize }`) y el string de búsqueda.
- Pasa estos estados al hook de TanStack Query (`use{Entities}`).
- Mantiene las Modales necesarias (ej. edición) y crea las funciones como `handleEdit`.
- Al mutar una entidad (crear/editar/desactivar), TanStack Query invalida la data y realiza un refetch conservando la página y la estructura actuales.

---

## 4. Plan Maestro de Ejecución (6 Fases)

### Fase 1: Adaptación del Backend

- **DTOs Genéricos:** Crear interfaz/clase `PaginationQueryDto` y `PaginatedResponseDto<T>` en el directorio `common/` o compartidos para reusar en todas las entidades.
- **Controlador:** Actualizar `GET /{entities}` en `{entities}.controller.ts` para aceptar `@Query() query: PaginationQueryDto` (y parámetros extendidos de la entidad si aplica).
- **Prisma Query Filters (Buenas prácticas):** En `{entities}.service.ts`, construir el objeto de condiciones (`where`) de forma dinámica.
  - Si viene `search`, inyectar un array `OR` apuntando a los campos clave (nombre, cédula, etc.) con `contains` y `mode: 'insensitive'`.
  - Agrupar la validación del count total y el fetching de datos con paginación (`skip`, `take`) dentro de un `await prisma.$transaction([ totalCountQuery, dataQuery ])` para garantizar el mismo snapshot de tiempo en ambos queries.

### Fase 2: Servicios y Hooks del Frontend

- Actualizar la firma de `api/{entities}.service.ts` para añadir querystrings en las peticiones de lista.
- Modificar `use{Entities}` para recibir reactivamente los argumentos (page, limit, search, ...filtros).

### Fase 3: Dependencias y UI Base

- Instalar dep: `pnpm add @tanstack/react-table`.
- Añadir (si no existen) los componentes base de tabla en shadcn: `Table`, `TableHeader`, `TableRow`, `TableCell`, etc.

### Fase 4: Controles UI Genéricos

- Crear `shared/components/ui/debounced-search-input.tsx`.
- Crear `shared/components/ui/filter-select.tsx`.

### Fase 5: El `DataTable` Central

- Construir el `DataTable` (`data-table.tsx`) y su paginación respectiva.
- Soportar SSP con el control de Paginación delegado y soportar `meta` contexts para pasar parámetros como `onEdit`.
- Implementar los estados visuales transitorios de la tabla:
  - Mostrar un `<Skeleton />` o indicador visual de carga cuando la prop `isLoading` sea verdadera (integrado en el medio de la vista de la tabla).
  - Presentar una única celda de tamaño completo (`colSpan`) con el mensaje "No hay datos para mostrar" si finaliza la carga y no existen resultados.

### Fase 6: Refactor Completo de la Vista `{Entity}`

- Definir `{entity}-columns.tsx`.
- Crear el wrapper visual de filtros `{entity}-toolbar.tsx`.
- Refactorizar `app/(dashboard)/{entities}/page.tsx` con el código sumamente limpio conectando el estado con el `DataTable`.
