'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
  type OnChangeFn,
} from '@tanstack/react-table';

import { Button } from './button';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  toolbar?: React.ReactNode;
  isLoading?: boolean;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  pageCount: number;
  rowCount: number;
  meta?: Record<string, unknown>;
}

export function DataTable<TData>({
  data,
  columns,
  toolbar,
  isLoading,
  pagination,
  onPaginationChange,
  pageCount,
  rowCount,
  meta,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    manualPagination: true,
    pageCount,
    rowCount,
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    meta,
  });

  return (
    <div className="flex flex-col gap-4">
      {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}

      <div className="overflow-x-auto rounded-lg border border-outline">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-outline-variant bg-surface-variant">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-on-surface-variant"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(pagination.pageSize)].map((_, i) => (
                <tr key={i} className="border-b border-outline-variant last:border-0">
                  {columns.map((_, colIndex) => (
                    <td key={colIndex} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-surface-variant" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-outline-variant last:border-0">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-on-surface">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-on-surface-variant"
                >
                  No hay datos para mostrar
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-on-surface-variant">
          Página {pagination.pageIndex + 1} de {pageCount}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
