'use client';

import { useState } from 'react';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { DoctorForm } from '@/features/doctors/components/doctor-form';
import { getDoctorColumns } from '@/features/doctors/components/doctor-columns';
import { DoctorToolbar } from '@/features/doctors/components/doctor-toolbar';
import {
  useDeactivateDoctor,
  useDoctorsAdmin,
  useSendDoctorOnboarding,
  useVerifyDoctor,
} from '@/features/doctors/hooks/use-doctors-admin';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { DataTable } from '@/shared/components/ui/data-table';
import { Modal } from '@/shared/components/ui/modal';

export default function DoctoresPage() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sendingDoctorId, setSendingDoctorId] = useState<string | null>(null);
  const { data, isLoading } = useDoctorsAdmin({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
  });
  const { mutate: deactivate } = useDeactivateDoctor();
  const { mutate: verify, isPending: isVerifying } = useVerifyDoctor();
  const { mutate: sendOnboarding } = useSendDoctorOnboarding();
  const doctors = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Doctores</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" /> Nuevo doctor
        </Button>
      </div>
      <Card className="p-4">
        <DataTable
          data={doctors}
          columns={getDoctorColumns()}
          toolbar={<DoctorToolbar search={search} onSearchChange={setSearch} />}
          isLoading={isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={meta?.totalPages ?? 0}
          rowCount={meta?.total ?? 0}
          meta={{
            onEdit: (id: string) => router.push(`/admin/doctores/${id}`),
            onVerify: verify,
            onDeactivate: deactivate,
            onSendOnboarding: (id: string) => {
              setSendingDoctorId(id);
              sendOnboarding(id, { onSettled: () => setSendingDoctorId(null) });
            },
            isVerifying,
            isSendingOnboarding: sendingDoctorId,
          }}
        />
      </Card>
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo doctor"
        className="max-w-lg"
      >
        <DoctorForm
          onCancel={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
}
