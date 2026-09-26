'use client';

import { useRouter } from 'next/navigation';

import { useDoctorAdmin } from '@/features/doctors/hooks/use-doctors-admin';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

interface DoctorDetailPageProps {
  doctorId: string;
}

export function DoctorDetailPage({ doctorId }: DoctorDetailPageProps) {
  const router = useRouter();
  const { data: doctor, error, isLoading } = useDoctorAdmin(doctorId);
  const returnToList = () => router.push('/admin/doctores');

  if (isLoading) return <p className="text-on-surface-variant">Cargando doctor…</p>;

  if (error || !doctor) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-error">{error?.message ?? 'No se pudo cargar el doctor.'}</p>
        <Button className="w-fit" variant="outline" onClick={returnToList}>
          Volver a doctores
        </Button>
      </div>
    );
  }

  const fullName = `${doctor.name} ${doctor.lastName}`.trim();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{fullName}</h1>
          <p className="text-sm text-on-surface-variant">
            {doctor.documentType}-{doctor.documentId}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={returnToList}>
            Volver
          </Button>
          <Button onClick={() => router.push(`/admin/doctores/${doctor.id}/editar`)}>Editar</Button>
        </div>
      </div>
      <Card className="grid gap-6 p-6 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-on-surface">Datos profesionales</h2>
          <p>Especialidad base: {doctor.primarySpecialtyName}</p>
          <p>Porcentaje médico: {doctor.splitPercentage}%</p>
          <p>Licencia: {doctor.medicalLicenseNumber ?? '—'}</p>
          <p>Teléfono: {doctor.phone ?? '—'}</p>
          <p>Email: {doctor.email ?? '—'}</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-on-surface">Cuenta bancaria</h2>
          <p>Banco: {doctor.bankAccounts[0]?.bankName ?? '—'}</p>
          <p>Cuenta: {doctor.bankAccounts[0]?.accountNumber ?? '—'}</p>
          <p>Cédula: {doctor.bankAccounts[0]?.documentId ?? '—'}</p>
        </section>
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-on-surface">Servicios y precios</h2>
        <div className="flex flex-col gap-2">
          {doctor.services.map((service) => (
            <div key={service.id} className="grid grid-cols-3 gap-4 text-sm">
              <span>{service.specialtyName}</span>
              <span>{service.serviceName}</span>
              <span>USD {service.priceUsd}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
