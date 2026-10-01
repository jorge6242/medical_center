'use client';

import { useState } from 'react';

import { Plus } from 'lucide-react';

import { getLabTestColumns } from '@/features/labs/components/lab-test-columns';
import { LabTestToolbar } from '@/features/labs/components/lab-test-toolbar';
import {
  useCreateLabTest,
  usePaginatedLabTests,
  useToggleLabTest,
  useUpdateLabTest,
} from '@/features/labs/hooks/use-labs';
import type { LabTest } from '@/features/labs/services/labs.service';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { DataTable } from '@/shared/components/ui/data-table';
import { Input } from '@/shared/components/ui/input';
import { Modal } from '@/shared/components/ui/modal';

export default function LaboratoriosPage() {
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const { data, isLoading } = usePaginatedLabTests({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
  });
  const { mutate: createTest, isPending: creating } = useCreateLabTest(() => {
    setShowModal(false);
    setEditingTest(null);
    setFormData({ name: '', priceUsd: '' });
  });
  const { mutate: updateTest } = useUpdateLabTest(() => {
    setShowModal(false);
    setEditingTest(null);
    setFormData({ name: '', priceUsd: '' });
  });
  const { mutate: toggleTest } = useToggleLabTest();

  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [formData, setFormData] = useState({ name: '', priceUsd: '' });
  const tests = data?.data ?? [];
  const meta = data?.meta;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTest) {
      updateTest({
        id: editingTest.id,
        dto: { name: formData.name, priceUsd: parseFloat(formData.priceUsd) },
      });
    } else {
      createTest({
        name: formData.name,
        priceUsd: parseFloat(formData.priceUsd),
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Laboratorios</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Nuevo test
        </Button>
      </div>

      <Card className="p-4">
        <DataTable
          data={tests}
          columns={getLabTestColumns()}
          toolbar={
            <LabTestToolbar
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
            onEdit: (test: LabTest) => {
              setEditingTest(test);
              setFormData({ name: test.name, priceUsd: test.priceUsd });
              setShowModal(true);
            },
            onToggle: (test: LabTest) => toggleTest(test),
          }}
        />
      </Card>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTest(null);
          setFormData({ name: '', priceUsd: '' });
        }}
        title={editingTest ? 'Editar test' : 'Nuevo test'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Precio USD"
            type="number"
            step="0.01"
            value={formData.priceUsd}
            onChange={(e) => setFormData((prev) => ({ ...prev, priceUsd: e.target.value }))}
            required
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={creating}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
