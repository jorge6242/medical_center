'use client';

import { useState } from 'react';

import { Search } from 'lucide-react';

import { getPaidConsultationColumns } from '@/features/medical-records/components/paid-consultation-columns';
import { MedicalRecordsCreatePanel } from '@/features/medical-records/components/medical-records-create-panel';
import { usePaidConsultations } from '@/features/medical-records/hooks/use-medical-records';
import type { PaidConsultation } from '@/features/medical-records/services/medical-records.service';
import { Card } from '@/shared/components/ui/card';
import { DataTable } from '@/shared/components/ui/data-table';
import { DebouncedSearchInput } from '@/shared/components/ui/debounced-search-input';
import { Modal } from '@/shared/components/ui/modal';

export default function ConsultasPage() {
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedConsultation, setSelectedConsultation] = useState<PaidConsultation | null>(null);

  const { data, isLoading } = usePaidConsultations({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
  });

  const consultations = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Consultas</h1>
        <p className="text-sm text-on-surface-variant">
          Consultas pagadas para crear o revisar informes médicos.
        </p>
      </div>

      <Card className="p-4">
        <DataTable
          key={`consultas-page-${pagination.pageIndex}`}
          data={consultations}
          columns={getPaidConsultationColumns()}
          toolbar={
            <div className="relative max-w-sm flex-1">
              <DebouncedSearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                placeholder="Buscar por paciente, doctor o servicio…"
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            </div>
          }
          isLoading={isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
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
            specialties={[
              ...new Set(selectedConsultation.services.map((s) => s.specialtyName)),
            ]}
          />
        ) : null}
      </Modal>
    </div>
  );
}
