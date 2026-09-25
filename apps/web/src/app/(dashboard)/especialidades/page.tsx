'use client';

import { useState } from 'react';

import { Plus } from 'lucide-react';

import { getSpecialtyColumns } from '@/features/specialties/components/specialty-columns';
import { SpecialtyForm } from '@/features/specialties/components/specialty-form';
import { SpecialtyToolbar } from '@/features/specialties/components/specialty-toolbar';
import {
  useDeactivateSpecialty,
  usePaginatedSpecialties,
  usePermanentlyDeleteSpecialty,
} from '@/features/specialties/hooks/use-specialties';
import type { SpecialtyResponse } from '@/features/specialties/services/specialties.service';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { DataTable } from '@/shared/components/ui/data-table';
import { Modal } from '@/shared/components/ui/modal';
import { useNotification } from '@/shared/hooks/use-notification';

export default function SpecialtiesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyResponse | null>(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const { data, isLoading } = usePaginatedSpecialties({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
  });
  const deactivateSpecialty = useDeactivateSpecialty();
  const permanentlyDeleteSpecialty = usePermanentlyDeleteSpecialty();
  const notification = useNotification();
  const specialties = data?.data ?? [];
  const meta = data?.meta;
  const closeEdit = () => setSelectedSpecialty(null);
  const handlePermanentDelete = (specialty: SpecialtyResponse) => {
    if (
      !window.confirm(
        `¿Eliminar definitivamente ${specialty.name}? Solo es posible si no está relacionada con doctores, servicios o consultas.`,
      )
    )
      return;
    permanentlyDeleteSpecialty.mutate(specialty.id, {
      onSuccess: () => notification.success('Especialidad eliminada definitivamente'),
      onError: (error) => notification.error(error.message),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Especialidades</h1>
          <p className="text-sm text-on-surface-variant">
            Administrá las especialidades médicas disponibles en el centro.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Nueva especialidad
        </Button>
      </div>
      <Card className="p-4">
        <DataTable
          data={specialties}
          columns={getSpecialtyColumns()}
          toolbar={
            <SpecialtyToolbar
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            />
          }
          isLoading={isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={meta?.totalPages ?? 0}
          rowCount={meta?.total ?? 0}
          meta={{
            onEdit: (specialty: SpecialtyResponse) => setSelectedSpecialty(specialty),
            onDeactivate: (id: string) => {
              if (window.confirm('¿Desactivar esta especialidad?')) deactivateSpecialty.mutate(id);
            },
            onPermanentDelete: handlePermanentDelete,
          }}
        />
      </Card>
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nueva especialidad"
      >
        <SpecialtyForm onClose={() => setShowCreateModal(false)} />
      </Modal>
      <Modal open={Boolean(selectedSpecialty)} onClose={closeEdit} title="Editar especialidad">
        <SpecialtyForm specialty={selectedSpecialty ?? undefined} onClose={closeEdit} />
      </Modal>
    </div>
  );
}
