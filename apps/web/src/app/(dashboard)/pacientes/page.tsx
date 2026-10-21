'use client';

import { useState } from 'react';

import { Plus } from 'lucide-react';

import { PatientForm } from '@/features/patients/components/patient-form';
import { getPatientColumns } from '@/features/patients/components/patient-columns';
import { PatientToolbar } from '@/features/patients/components/patient-toolbar';
import {
  useDeactivatePatient,
  usePaginatedPatients,
  usePermanentlyDeletePatient,
} from '@/features/patients/hooks/use-patients';
import type { PatientResponse } from '@/features/patients/services/patients.service';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { DataTable } from '@/shared/components/ui/data-table';
import { Modal } from '@/shared/components/ui/modal';
import { useNotification } from '@/shared/hooks/use-notification';
import { useAuthStore } from '@/stores/auth.store';

export default function PacientesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const canRead = useAuthStore((state) => state.hasPermission('patients', 'read'));
  const canUpdate = useAuthStore((state) => state.hasPermission('patients', 'update'));
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
  const permanentlyDeletePatient = usePermanentlyDeletePatient();
  const notification = useNotification();

  const handlePermanentDelete = (patient: PatientResponse) => {
    const shouldDelete = window.confirm(
      `¿Eliminar definitivamente a ${patient.name}? Solo es posible si no tiene movimientos.`,
    );

    if (!shouldDelete) {
      return;
    }

    permanentlyDeletePatient.mutate(patient.id, {
      onError: (error) => notification.error(error.message),
      onSuccess: () => notification.success('Paciente eliminado definitivamente'),
    });
  };

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
          columns={getPatientColumns({ canRead, canUpdate })}
          toolbar={<PatientToolbar search={search} onSearchChange={setSearch} />}
          isLoading={isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={meta?.totalPages ?? 0}
          rowCount={meta?.total ?? 0}
          meta={{
            onDeactivate: (id: string) => deactivatePatient.mutate(id),
            onPermanentDelete: handlePermanentDelete,
          }}
        />
      </Card>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo paciente"
      >
        <PatientForm onClose={() => setShowCreateModal(false)} />
      </Modal>
    </div>
  );
}
