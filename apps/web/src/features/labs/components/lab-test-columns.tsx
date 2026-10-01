'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { formatUsd } from '@/shared/utils/format';

import type { LabTest } from '../services/labs.service';

export function getLabTestColumns(): ColumnDef<LabTest>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'priceUsd',
      header: 'Precio',
      cell: ({ row }) => formatUsd(row.original.priceUsd),
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'error'}>
          {row.original.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row, table }) => {
        const meta = table.options.meta as
          | {
              onEdit?: (test: LabTest) => void;
              onToggle?: (test: LabTest) => void;
            }
          | undefined;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => meta?.onEdit?.(row.original)}
              title="Editar test"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => meta?.onToggle?.(row.original)}>
              {row.original.isActive ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        );
      },
    },
  ];
}
