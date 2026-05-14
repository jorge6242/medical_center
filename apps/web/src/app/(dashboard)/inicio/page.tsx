'use client';

import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';

import { useHomeStats } from '@/features/stats/hooks/use-stats';
import { formatUsd } from '@/shared/utils/format';

export default function InicioPage() {
  const { data, isLoading } = useHomeStats();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Inicio</h1>
        <p className="text-sm text-on-surface-variant">Resumen operativo del día y del mes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Pacientes hoy" value={data?.patientsToday ?? 0} loading={isLoading} />
        <MetricCard label="Doctores hoy" value={data?.doctorsToday ?? 0} loading={isLoading} />
        <MetricCard label="Cancelados mes" value={data?.canceledDoctorsThisMonth ?? 0} loading={isLoading} />
        <MetricCard label="Pendientes pago" value={data?.pendingPayoutDoctors ?? 0} loading={isLoading} />
        <MetricCard
          label="Monto pendiente"
          value={data ? formatUsd(data.pendingPayoutAmountUsd) : '$0.00'}
          loading={isLoading}
        />
      </div>

      <Card>
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-on-surface">Alertas</h2>
          {data?.alerts?.length ? (
            <div className="space-y-3">
              {data.alerts.map((alert, index) => (
                <div key={index} className="rounded-lg border border-outline-variant p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-on-surface">{alert.title}</p>
                      <p className="text-sm text-on-surface-variant">{alert.message}</p>
                    </div>
                    <Badge variant={alert.severity === 'warning' ? 'warning' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">Sin alertas por ahora.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  loading,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly loading: boolean;
}) {
  return (
    <Card>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-on-surface">
        {loading ? '...' : value}
      </p>
    </Card>
  );
}
