'use client';

import Link from 'next/link';

import { type ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { formatDate, formatUsd } from '@/shared/utils/format';

import type { PaidConsultation } from '../services/medical-records.service';

export function getPaidConsultationColumns(): ColumnDef<PaidConsultation>[] {
  return [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: 'patientName',
      header: 'Paciente',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-on-surface">{row.original.patientName}</p>
          <p className="text-xs text-on-surface-variant">{row.original.patientDocument}</p>
        </div>
      ),
    },
    {
      accessorKey: 'doctorName',
      header: 'Doctor',
    },
    {
      id: 'specialties',
      header: 'Especialidad',
      cell: ({ row }) => {
        const specialties = [
          ...new Set(row.original.services.map((s) => s.specialtyName)),
        ];
        return (
          <div className="flex flex-wrap gap-1">
            {specialties.map((specialty) => (
              <Badge key={specialty} variant="secondary">
                {specialty}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'services',
      header: 'Servicios',
      cell: ({ row }) => {
        const hasMultiple = row.original.services.length > 1;
        return (
          <div className="flex flex-wrap gap-1">
            {row.original.services.map((service,i) => (
              <Badge key={`${service.serviceName}${i}`} variant={hasMultiple ? 'secondary' : 'default'}>
                {service.serviceName}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) =>
        formatUsd(row.original.services.reduce((sum, service) => sum + Number(service.priceUsd), 0)),
    },
    {
      id: 'medicalRecord',
      header: 'Informe',
      cell: ({ row }) => (
        <Badge variant={row.original.medicalRecordId ? 'success' : 'warning'}>
          {row.original.medicalRecordId ? 'Creado' : 'Pendiente'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row, table }) => {
        const meta = table.options.meta as
          | {
              onCreateMedicalRecord?: (consultation: PaidConsultation) => void;
            }
          | undefined;
        const consultation = row.original;

        if (consultation.medicalRecordId) {
          return (
            <Link
              href={`/medical-records/${consultation.medicalRecordId}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Ver informe
            </Link>
          );
        }

        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => meta?.onCreateMedicalRecord?.(consultation)}
          >
            Crear informe
          </Button>
        );
      },
    },
  ];
}
