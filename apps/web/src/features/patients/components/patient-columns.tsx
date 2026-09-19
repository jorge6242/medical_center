'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Pencil, UserX, FileText } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { formatDate } from '@/shared/utils/format';
import type { PatientResponse } from '../services/patients.service';

export function getPatientColumns(): ColumnDef<PatientResponse>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <span className="font-medium text-on-surface">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'documentId',
      header: 'Cédula',
      cell: ({ row }) => (
        <span className="text-on-surface-variant">
          {row.original.documentType}-{row.original.documentId}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Teléfono',
      cell: ({ row }) => row.original.phone ?? '—',
    },
    {
      accessorKey: 'createdAt',
      header: 'Registro',
      cell: ({ row }) => formatDate(row.original.createdAt),
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
          | { onEdit?: (patient: PatientResponse) => void; onDeactivate?: (id: string) => void }
          | undefined;

        return (
          <div className="flex items-center gap-2">
            <Link
              href={`/pacientes/${row.original.id}`}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-on-surface hover:bg-surface-variant"
            >
              <FileText className="h-4 w-4" />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => meta?.onEdit?.(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {row.original.isActive && (
              <Button
                variant="ghost"
                size="sm"
                className="text-error hover:text-error"
                onClick={() => meta?.onDeactivate?.(row.original.id)}
                title="Desactivar paciente"
              >
                <UserX className="h-4 w-4" />
                Desactivar
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
