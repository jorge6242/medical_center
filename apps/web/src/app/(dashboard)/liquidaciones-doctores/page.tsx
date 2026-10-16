'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Plus } from 'lucide-react';

import {
  useDoctorPayouts,
  useVoidDoctorPayout,
} from '@/features/doctor-payouts/hooks/use-doctor-payouts';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { formatBs, formatUsd } from '@/shared/utils/format';

export default function DoctorPayoutsPage() {
  const router = useRouter();
  const { data: payouts = [], isLoading, isError, error } = useDoctorPayouts();
  const voidMutation = useVoidDoctorPayout();
  const [reasonError, setReasonError] = useState('');
  const requestVoid = (id: string) => {
    if (voidMutation.isPending) return;
    voidMutation.reset();
    setReasonError('');
    const reason = window.prompt('Motivo de anulación');
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setReasonError('El motivo debe tener al menos 3 caracteres');
      return;
    }
    voidMutation.mutate({ id, reason: reason.trim() });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Honorarios médicos</h1>
          <p className="text-sm text-on-surface-variant">
            Pagos del centro médico a los profesionales por sus consultas.
          </p>
        </div>
        <Button onClick={() => router.push('/liquidaciones-doctores/nueva')}>
          <Plus className="h-4 w-4" />
          Nuevo pago de honorarios
        </Button>
      </div>
      {(reasonError || voidMutation.isError) && (
        <p role="alert">{reasonError || voidMutation.error?.message}</p>
      )}
      {isError ? (
        <p role="alert">{error.message}</p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-variant text-left text-on-surface-variant">
              <tr>
                <th className="p-3">Doctor</th>
                <th className="p-3">Total USD</th>
                <th className="p-3">Equivalente Bs</th>
                <th className="p-3">Método</th>
                <th className="p-3">Referencia</th>
                <th className="p-3">Estado</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td className="p-4" colSpan={7}>
                    Cargando…
                  </td>
                </tr>
              )}
              {payouts.map((payout) => (
                <tr key={payout.id} className="border-t border-outline-variant">
                  <td className="p-3">{payout.doctorName}</td>
                  <td className="p-3">{formatUsd(payout.amountUsd)}</td>
                  <td className="p-3">
                    {payout.equivalentBs ? formatBs(payout.equivalentBs) : 'Sin tasa'}
                  </td>
                  <td className="p-3">{payout.paymentMethod.replaceAll('_', ' ')}</td>
                  <td className="p-3">{payout.referenceNumber ?? '—'}</td>
                  <td className="p-3">{payout.status === 'COMPLETED' ? 'Pagada' : 'Anulada'}</td>
                  <td className="flex gap-1 p-3">
                    <Link
                      className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-on-surface hover:bg-surface-variant"
                      href={`/liquidaciones-doctores/${payout.id}`}
                    >
                      Ver detalle
                    </Link>
                    {payout.status === 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={voidMutation.isPending}
                        onClick={() => requestVoid(payout.id)}
                      >
                        Anular
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && payouts.length === 0 && (
                <tr>
                  <td className="p-4 text-on-surface-variant" colSpan={7}>
                    Todavía no hay pagos de honorarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
