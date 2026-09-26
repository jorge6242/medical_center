'use client';

import { useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { DoctorForm } from './doctor-form';
import { useDoctorAdmin } from '@/features/doctors/hooks/use-doctors-admin';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

interface DoctorEditPageProps {
  doctorId: string;
}

export function DoctorEditPage({ doctorId }: DoctorEditPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: doctor, error, isFetching, isLoading } = useDoctorAdmin(doctorId);
  const returnToDetail = () => router.push(`/admin/doctores/${doctorId}`);

  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: ['doctor-admin', doctorId], exact: true });
    };
  }, [doctorId, queryClient]);

  if (isLoading || isFetching) {
    return <p className="text-on-surface-variant">Cargando doctor…</p>;
  }

  if (error || !doctor) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-error">{error?.message ?? 'No se pudo cargar el doctor.'}</p>
        <Button className="w-fit" variant="outline" onClick={returnToDetail}>
          Volver a doctores
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Editar doctor</h1>
          <p className="text-sm text-on-surface-variant">
            {`${doctor.name} ${doctor.lastName}`.trim()}
          </p>
        </div>
        <Button variant="outline" onClick={returnToDetail}>
          Volver
        </Button>
      </div>
      <Card className="p-6">
        <DoctorForm doctor={doctor} onCancel={returnToDetail} onSuccess={returnToDetail} />
      </Card>
    </div>
  );
}
