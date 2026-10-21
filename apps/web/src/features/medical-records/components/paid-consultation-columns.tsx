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
        <Link
          href={`/consultas/${row.original.id}`}
          aria-label={`Ver consulta de ${row.original.patientName}`}
          className="block rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <p className="font-medium text-on-surface">{row.original.patientName}</p>
          <p className="text-xs text-on-surface-variant">{row.original.patientDocument}</p>
        </Link>
      ),
    },
    {
      accessorKey: 'doctorName',
      header: 'Doctor',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-on-surface">{row.original.doctorName}</p>
          <p className="text-xs text-on-surface-variant">{row.original.doctorDocument}</p>
        </div>
      ),
    },
    {
      id: 'specialties',
      header: 'Especialidad',
      cell: ({ row }) => {
        const specialties = [...new Set(row.original.services.map((s) => s.specialtyName))];
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
            {row.original.services.map((service, i) => (
              <Badge
                key={`${service.serviceName}${i}`}
                variant={hasMultiple ? 'secondary' : 'default'}
              >
                {service.serviceName}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'total',
      header: 'Total servicios',
      cell: ({ row }) =>
        formatUsd(
          row.original.services.reduce((sum, service) => sum + Number(service.priceUsd), 0),
        ),
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'PAID' ? 'success' : 'warning'}>
          {{ PAID: 'Pagada', SCHEDULED: 'Agendada', PENDING: 'Pendiente' }[row.original.status]}
        </Badge>
      ),
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

        const detailLink = (
          <Link
            href={`/consultas/${consultation.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver detalle
          </Link>
        );

        if (consultation.medicalRecordId) {
          return (
            <div className="flex flex-col gap-1">
              {detailLink}
              <Link
                href={`/medical-records/${consultation.medicalRecordId}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver informe
              </Link>
            </div>
          );
        }

        if (!consultation.canCreateMedicalRecord) {
          return detailLink;
        }

        return (
          <div className="flex flex-col items-start gap-1">
            {detailLink}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => meta?.onCreateMedicalRecord?.(consultation)}
            >
              Crear informe
            </Button>
          </div>
        );
      },
    },
  ];
}
