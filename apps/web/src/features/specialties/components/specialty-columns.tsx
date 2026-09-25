'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, UserX } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';

import type { SpecialtyResponse } from '../services/specialties.service';

export function getSpecialtyColumns(): ColumnDef<SpecialtyResponse>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Especialidad',
      cell: ({ row }) => <span className="font-medium text-on-surface">{row.original.name}</span>,
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'error'}>
          {row.original.isActive ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row, table }) => {
        const meta = table.options.meta as
          | {
              onEdit?: (specialty: SpecialtyResponse) => void;
              onDeactivate?: (id: string) => void;
              onPermanentDelete?: (specialty: SpecialtyResponse) => void;
            }
          | undefined;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => meta?.onEdit?.(row.original)}
              title="Editar especialidad"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {row.original.isActive ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-error hover:text-error"
                  onClick={() => meta?.onDeactivate?.(row.original.id)}
                  title="Desactivar especialidad"
                >
                  <UserX className="h-4 w-4" />
                  Desactivar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-error hover:text-error"
                  onClick={() => meta?.onPermanentDelete?.(row.original)}
                  title="Eliminar especialidad sin relaciones"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </>
            ) : null}
          </div>
        );
      },
    },
  ];
}
