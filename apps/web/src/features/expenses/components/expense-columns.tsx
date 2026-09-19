'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Eye, Ban } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { formatDate, formatUsd } from '@/shared/utils/format';

import type { ExpenseResponse } from '../services/expenses.service';

type ExpenseTableMeta = {
  onView?: (expense: ExpenseResponse) => void;
  onVoid?: (expense: ExpenseResponse) => void;
};

function statusVariant(status: string) {
  return status === 'ACTIVE' ? 'success' : 'error';
}

export function getExpenseColumns(): ColumnDef<ExpenseResponse>[] {
  return [
    {
      accessorKey: 'categoryName',
      header: 'Categoría',
      cell: ({ row }) => <span className="font-medium text-on-surface">{row.original.categoryName}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Descripción',
      cell: ({ row }) => <span className="text-on-surface-variant">{row.original.description}</span>,
    },
    {
      accessorKey: 'amountUsd',
      header: 'Monto USD',
      cell: ({ row }) => <span className="font-medium text-on-surface">{formatUsd(row.original.amountUsd)}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Fecha',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row, table }) => {
        const meta = table.options.meta as ExpenseTableMeta | undefined;
        const expense = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => meta?.onView?.(expense)}>
              <Eye className="h-4 w-4" />
              Ver
            </Button>
            {expense.status === 'ACTIVE' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-error hover:text-error"
                onClick={() => meta?.onVoid?.(expense)}
              >
                <Ban className="h-4 w-4" />
                Anular
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
