'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Mail, Pencil, RefreshCw, Trash2 } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { VerificationBadge } from './verification-badge';
import type { DoctorAdminResponse } from '../services/doctors-admin.service';

export function getDoctorColumns(): ColumnDef<DoctorAdminResponse>[] {
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
      header: 'Documento',
      cell: ({ row }) => (
        <span className="text-on-surface-variant">
          {row.original.documentType}-{row.original.documentId}
        </span>
      ),
    },
    {
      accessorKey: 'specialties',
      header: 'Especialidades',
      cell: ({ row }) => (
        <span className="text-on-surface-variant">
          {row.original.specialties.map((s) => s.specialtyName).join(', ') || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'splitPercentage',
      header: 'Split',
      cell: ({ row }) => (
        <span className="text-on-surface-variant">{row.original.splitPercentage}%</span>
      ),
    },
    {
      accessorKey: 'verificationStatus',
      header: 'Verificación',
      cell: ({ row }) => <VerificationBadge status={row.original.verificationStatus} />,
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
              onEdit?: (doctor: DoctorAdminResponse) => void;
              onVerify?: (id: string) => void;
              onDeactivate?: (id: string) => void;
              onSendOnboarding?: (id: string) => void;
              isVerifying?: boolean;
              isSendingOnboarding?: string | null;
            }
          | undefined;

        const doctor = row.original;
        const canSendOnboarding = doctor.isActive && doctor.email;
        const isSending = meta?.isSendingOnboarding === doctor.id;

        return (
          <div className="flex items-center gap-2">
            {canSendOnboarding && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => meta?.onSendOnboarding?.(doctor.id)}
                disabled={isSending}
                title="Enviar invitación por email"
              >
                <Mail className={`h-4 w-4 ${isSending ? 'animate-pulse' : ''}`} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => meta?.onVerify?.(doctor.id)}
              disabled={meta?.isVerifying}
              title="Re-verificar credenciales"
            >
              <RefreshCw className={`h-4 w-4 ${meta?.isVerifying ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => meta?.onEdit?.(doctor)}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            {doctor.isActive && (
              <Button
                variant="ghost"
                size="sm"
                className="text-error hover:text-error"
                onClick={() => meta?.onDeactivate?.(doctor.id)}
                title="Desactivar doctor"
              >
                <Trash2 className="h-4 w-4" />
                Desactivar
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
