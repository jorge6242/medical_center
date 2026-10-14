'use client';

import { usePlatformDashboard } from '../hooks/use-platform-dashboard';
import { Button } from '@/shared/components/ui/button';

const STATUS_LABELS: Record<string, string> = {
  TRIALING: 'En prueba',
  ACTIVE: 'Activas',
  PAST_DUE: 'Vencidas',
  SUSPENDED: 'Suspendidas',
  CANCELED: 'Canceladas',
};

const usd = new Intl.NumberFormat('es-VE', {
  style: 'currency',
  currency: 'USD',
});

export function PlatformDashboardPage() {
  const dashboard = usePlatformDashboard();

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Panel de plataforma</h1>
          <p className="text-sm text-on-surface-variant">
            Centros y suscripciones SaaS. No incluye pagos de consultas ni datos clínicos.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={dashboard.isFetching}
          onClick={() => void dashboard.refetch()}
        >
          {dashboard.isFetching ? 'Actualizando…' : 'Actualizar'}
        </Button>
      </header>
      {dashboard.isError && (
        <div role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">
          <p>No se pudieron actualizar los indicadores. {dashboard.error.message}</p>
          <Button
            variant="outline"
            className="mt-3"
            disabled={dashboard.isFetching}
            onClick={() => void dashboard.refetch()}
          >
            Reintentar
          </Button>
        </div>
      )}
      {dashboard.isPending && <DashboardSkeleton />}
      {dashboard.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Centros activos" value={String(dashboard.data.tenants.active)} />
            <MetricCard label="Centros inactivos" value={String(dashboard.data.tenants.inactive)} />
            <MetricCard
              label="Saldo pendiente SaaS"
              value={usd.format(Number(dashboard.data.pendingBalanceUsd))}
            />
            <MetricCard
              label="Cobros confirmados del mes"
              value={usd.format(Number(dashboard.data.confirmedRevenueMonthUsd))}
            />
          </div>
          <p className="text-sm text-on-surface-variant">
            Mes de cobro (America/Caracas):{' '}
            {new Date(dashboard.data.month.from).toLocaleDateString('es-VE', {
              month: 'long',
              year: 'numeric',
              timeZone: 'America/Caracas',
            })}
            . Los saldos incluyen facturas pendientes, parcialmente pagadas y vencidas.
          </p>
          <section className="rounded-xl bg-surface p-6 shadow-elevation-1">
            <h2 className="mb-4 text-lg font-semibold text-on-surface">Suscripciones por estado</h2>
            <dl className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <div key={status}>
                  <dt className="text-sm text-on-surface-variant">{label}</dt>
                  <dd className="mt-1 text-2xl font-bold text-on-surface">
                    {dashboard.data.subscriptionsByStatus[status] ?? 0}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <dl className="rounded-xl bg-surface p-6 shadow-elevation-1">
      <dt className="text-sm text-on-surface-variant">{label}</dt>
      <dd className="mt-2 text-2xl font-bold text-on-surface">{value}</dd>
    </dl>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Cargando indicadores" className="grid gap-4 sm:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded-xl bg-surface-variant" />
      ))}
    </div>
  );
}
