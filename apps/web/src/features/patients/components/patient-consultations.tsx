'use client';

import { DateTime } from 'luxon';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { useConsultations } from '@/features/consultations/hooks/use-consultations';
import type { ConsultationStatus } from '@/features/consultations/services/consultations.service';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Select } from '@/shared/components/ui/select';
import { formatDate } from '@/shared/utils/format';
import { getAppTimezone } from '@/shared/utils/timezone';
import { useAuthStore } from '@/stores/auth.store';

const statuses: Record<ConsultationStatus, string> = {
  SCHEDULED: 'Programada',
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  VOIDED: 'Anulada',
};
const options = [
  { value: '', label: 'Todos los estados' },
  ...Object.entries(statuses).map(([value, label]) => ({ value, label })),
];

function ConsultationHistory({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ConsultationStatus>();
  const id = useId();
  const query = useConsultations({ patientId, page, limit: 10, status });
  return (
    <div className="flex flex-col gap-3">
      <Select
        id={id}
        label="Estado de consulta"
        options={options}
        value={status ?? ''}
        onChange={(event) => {
          setStatus(
            Object.keys(statuses).find(
              (value): value is ConsultationStatus => value === event.target.value,
            ),
          );
          setPage(1);
        }}
      />
      {query.isError ? (
        <div>
          <p role="alert">No se pudieron cargar las consultas</p>
          <Button onClick={() => void query.refetch()}>Reintentar consultas</Button>
        </div>
      ) : query.isPending ? (
        <p role="status">Cargando consultas…</p>
      ) : !query.data.data.length ? (
        <p>Sin consultas registradas</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Consultas del paciente</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Doctor</th>
                  <th scope="col">Servicios / especialidades</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Atención</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((consultation) => (
                  <tr
                    key={consultation.id}
                    className="cursor-pointer hover:bg-surface-variant focus-within:bg-surface-variant"
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest('a')) return;
                      router.push(`/consultas/${consultation.id}`);
                    }}
                  >
                    <td className="p-2">
                      <Link
                        href={`/consultas/${consultation.id}`}
                        aria-label={`Ver consulta ${consultation.id}`}
                        className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {DateTime.fromISO(consultation.date, {
                          zone: getAppTimezone(),
                        })
                          .setLocale('es-VE')
                          .toLocaleString(DateTime.DATE_MED)}
                      </Link>
                    </td>
                    <td className="p-2">{consultation.doctorName}</td>
                    <td className="p-2">
                      {consultation.services.map((service, index) => (
                        <div key={index}>
                          <p>{service.serviceName}</p>
                          <p>{service.specialtyName}</p>
                        </div>
                      ))}
                    </td>
                    <td className="p-2">
                      <Badge>{statuses[consultation.status]}</Badge>
                    </td>
                    <td className="p-2">
                      {consultation.attendedAt
                        ? `Atendida: ${formatDate(consultation.attendedAt)}`
                        : 'Sin atención registrada'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={page === 1 || query.isFetching}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <p>
              Página {page} de {query.data.meta.totalPages}
            </p>
            <Button
              variant="outline"
              disabled={page >= query.data.meta.totalPages || query.isFetching}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function PatientConsultations({ patientId }: { patientId: string }) {
  const allowed = useAuthStore(
    (state) =>
      state.hasPermission('patients', 'read') && state.hasPermission('consultations', 'read'),
  );
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Historial de Consultas</h2>
      {allowed && patientId ? (
        <ConsultationHistory key={patientId} patientId={patientId} />
      ) : (
        <p>No tenés permiso para ver las consultas</p>
      )}
    </Card>
  );
}
