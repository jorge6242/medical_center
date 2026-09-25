'use client';

import { useRouter } from 'next/navigation';

import { DoctorPayoutForm } from '@/features/doctor-payouts/components/doctor-payout-form';
import type { DoctorPayout } from '@/features/doctor-payouts/services/doctor-payouts.service';
import { Card } from '@/shared/components/ui/card';

export default function NewDoctorPayoutPage() {
  const router = useRouter();

  const handleSuccess = (payout: DoctorPayout) => {
    router.replace(`/liquidaciones-doctores/${payout.id}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Registrar pago de honorarios</h1>
        <p className="text-sm text-on-surface-variant">
          Seleccioná las consultas, registrá el pago y verificá su equivalente BCV.
        </p>
      </div>
      <Card className="p-5">
        <DoctorPayoutForm
          onCancel={() => router.push('/liquidaciones-doctores')}
          onSuccess={handleSuccess}
        />
      </Card>
    </div>
  );
}
