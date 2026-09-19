'use client';

import { type ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { formatDate, formatUsd } from '@/shared/utils/format';

import type { LabOrderListItem } from '../services/lab-orders.service';

type LabOrdersTableMeta = {
  onPay?: (order: LabOrderListItem) => void;
};

function statusVariant(status: string) {
  if (status === 'PAID') return 'success';
  if (status === 'VOIDED') return 'error';
  return 'warning';
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: 'Pendiente',
    PAID: 'Pagada',
    VOIDED: 'Anulada',
  };

  return map[status] ?? status;
}

export function getLabOrderColumns(): ColumnDef<LabOrderListItem>[] {
  return [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-on-surface-variant">{row.original.id.slice(0, 8)}…</span>
      ),
    },
    {
      accessorKey: 'patientName',
      header: 'Paciente',
      cell: ({ row }) => <span className="font-medium text-on-surface">{row.original.patientName}</span>,
    },
    {
      accessorKey: 'totalUsd',
      header: 'Total',
      cell: ({ row }) => <span className="font-medium text-on-surface">{formatUsd(row.original.totalUsd)}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{statusLabel(row.original.status)}</Badge>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Fecha',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row, table }) => {
        const meta = table.options.meta as LabOrdersTableMeta | undefined;
        const order = row.original;

        if (order.status !== 'PENDING') return null;

        return (
          <Button variant="ghost" size="sm" onClick={() => meta?.onPay?.(order)}>
            Pagar
          </Button>
        );
      },
    },
  ];
}
