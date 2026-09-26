'use client';

import { useRouter } from 'next/navigation';

import { DoctorForm } from './doctor-form';
import type { DoctorAdminResponse } from '../services/doctors-admin.service';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

export function DoctorCreatePage() {
  const router = useRouter();
  const returnToList = () => router.push('/admin/doctores');
  const showCreatedDoctor = (doctor: DoctorAdminResponse) => {
    router.replace(`/admin/doctores/${doctor.id}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Nuevo doctor</h1>
          <p className="text-sm text-on-surface-variant">
            Registra sus datos, servicios y cuenta bancaria.
          </p>
        </div>
        <Button variant="outline" onClick={returnToList}>
          Volver
        </Button>
      </div>
      <Card className="p-6">
        <DoctorForm onCancel={returnToList} onSuccess={showCreatedDoctor} />
      </Card>
    </div>
  );
}
