'use client';

import { useState } from 'react';

import { Plus } from 'lucide-react';

import { PatientForm } from '@/features/patients/components/patient-form';
import { getPatientColumns } from '@/features/patients/components/patient-columns';
import { PatientToolbar } from '@/features/patients/components/patient-toolbar';
import { useDeactivatePatient, usePaginatedPatients } from '@/features/patients/hooks/use-patients';
import type { PatientResponse } from '@/features/patients/services/patients.service';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { DataTable } from '@/shared/components/ui/data-table';
import { Modal } from '@/shared/components/ui/modal';

export default function PacientesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientResponse | null>(null);
  const [search, setSearch] = useState('');

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const { data, isLoading } = usePaginatedPatients({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
  });

  const deactivatePatient = useDeactivatePatient(() => {
    // Refetch is handled by the hook
  });

  const patients = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Pacientes</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Nuevo paciente
        </Button>
      </div>

      <Card className="p-4">
        <DataTable
          data={patients}
          columns={getPatientColumns()}
          toolbar={<PatientToolbar search={search} onSearchChange={setSearch} />}
          isLoading={isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={meta?.totalPages ?? 0}
          rowCount={meta?.total ?? 0}
          meta={{
            onEdit: (patient: PatientResponse) => {
              setSelectedPatient(patient);
              setShowEditModal(true);
            },
            onDeactivate: (id: string) => deactivatePatient.mutate(id),
          }}
        />
      </Card>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo paciente">
        <PatientForm onClose={() => setShowCreateModal(false)} />
      </Modal>

      <Modal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPatient(null);
        }}
        title="Editar paciente"
      >
        <PatientForm
          patient={selectedPatient ?? undefined}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPatient(null);
          }}
        />
      </Modal>
    </div>
  );
}
