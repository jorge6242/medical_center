'use client';

import { useState } from 'react';

import { Search } from 'lucide-react';

import { getPaidConsultationColumns } from '@/features/medical-records/components/paid-consultation-columns';
import { MedicalRecordsCreatePanel } from '@/features/medical-records/components/medical-records-create-panel';
import { usePaidConsultations } from '@/features/medical-records/hooks/use-medical-records';
import { useConsultationFilters } from '@/features/medical-records/hooks/use-consultation-filters';
import type { PaidConsultation } from '@/features/medical-records/services/medical-records.service';
import { Card } from '@/shared/components/ui/card';
import { DataTable } from '@/shared/components/ui/data-table';
import { DebouncedSearchInput } from '@/shared/components/ui/debounced-search-input';
import { Modal } from '@/shared/components/ui/modal';
import { Input } from '@/shared/components/ui/input';

export function ConsultationsView() {
  const { query, update } = useConsultationFilters();
  const pagination = { pageIndex: query.page - 1, pageSize: query.limit };
  const [selectedConsultation, setSelectedConsultation] = useState<PaidConsultation | null>(null);

  const { data, isLoading, isError } = usePaidConsultations(query);

  const consultations = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Consultas</h1>
        <p className="text-sm text-on-surface-variant">
          Reporte de consultas agendadas y pagadas, con paciente, profesional y total de servicios.
        </p>
      </div>

      <Card className="p-4">
        {isError && <p role="alert">No se pudieron cargar las consultas.</p>}
        <DataTable
          data={consultations}
          columns={getPaidConsultationColumns()}
          toolbar={
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative max-w-sm flex-1">
                <DebouncedSearchInput
                  value={query.search}
                  onChange={(value) => update({ search: value })}
                  placeholder="Buscar por paciente, doctor o servicio…"
                />
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              </div>
              <Input
                type="date"
                label="Fecha de consulta"
                value={query.date ?? ''}
                onChange={(event) => update({ date: event.target.value })}
              />
              {query.date && (
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => update({ date: '' })}
                >
                  Quitar filtro de fecha
                </button>
              )}
            </div>
          }
          isLoading={isLoading}
          pagination={pagination}
          onPaginationChange={(updater) => {
            const next = typeof updater === 'function' ? updater(pagination) : updater;
            update(
              next.pageSize !== pagination.pageSize
                ? { limit: String(next.pageSize) }
                : { page: String(next.pageIndex + 1) },
            );
          }}
          pageCount={meta?.totalPages ?? 0}
          rowCount={meta?.total ?? 0}
          meta={{
            onCreateMedicalRecord: (consultation: PaidConsultation) => {
              setSelectedConsultation(consultation);
            },
          }}
        />
      </Card>

      <Modal
        open={!!selectedConsultation}
        onClose={() => setSelectedConsultation(null)}
        title="Nuevo informe médico"
        className="max-w-4xl"
      >
        {selectedConsultation ? (
          <MedicalRecordsCreatePanel
            patientId={selectedConsultation.patientId}
            initialConsultationId={selectedConsultation.id}
            onSuccess={() => setSelectedConsultation(null)}
            doctorName={selectedConsultation.doctorName}
            patientName={selectedConsultation.patientName}
            specialties={[...new Set(selectedConsultation.services.map((s) => s.specialtyName))]}
          />
        ) : null}
      </Modal>
    </div>
  );
}
