'use client';

import type {
  SubscriptionPeriodSummary,
  TenantSubscriptionSummary,
} from '@centro-medico/shared/src/subscriptions';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { formatUsd } from '@/shared/utils/format';
import { useTenantSubscription } from '../hooks/use-tenant-subscription';

const STATUS: Record<TenantSubscriptionSummary['status'], string> = {
  ACTIVE: 'Activo',
  TRIALING: 'En prueba',
  PAST_DUE: 'En mora',
  SUSPENDED: 'Suspendido',
  CANCELED: 'Cancelado',
};
const COVERAGE: Record<TenantSubscriptionSummary['coverageStatus'], string> = {
  UNASSIGNED: 'Sin período vigente asignado',
  SCHEDULED: 'Programada',
  ACTIVE: 'Vigente',
  EXPIRED: 'Período vencido',
  RESTRICTED: 'Restringida',
};
const INVOICE: Record<NonNullable<SubscriptionPeriodSummary['invoice']>['status'], string> = {
  PENDING: 'Pendiente',
  PARTIALLY_PAID: 'Pago parcial',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
  VOIDED: 'Anulada',
};
const date = (value: string) =>
  new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'medium',
    timeZone: 'America/Caracas',
  }).format(new Date(value));

function PeriodDetails({ title, period }: { title: string; period: SubscriptionPeriodSummary }) {
  return (
    <div className="mt-4 border-t border-outline pt-4">
      <h3 className="font-medium text-on-surface">{title}</h3>
      <p className="mt-1 text-sm">
        {period.planName} · {formatUsd(period.priceUsd)}
      </p>
      <p className="text-sm text-on-surface-variant">
        Desde {date(period.startsAt)} hasta {date(period.endsAt)} (fin exclusivo).
      </p>
      {period.invoice && (
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt>Factura</dt>
            <dd className="break-all font-medium">{period.invoice.number}</dd>
          </div>
          <div>
            <dt>Estado de factura</dt>
            <dd>{INVOICE[period.invoice.status]}</dd>
          </div>
          <div>
            <dt>Vencimiento de pago</dt>
            <dd>{date(period.invoice.dueAt)}</dd>
          </div>
          <div>
            <dt>Total / pagado confirmado</dt>
            <dd>
              {formatUsd(period.invoice.totalUsd)} / {formatUsd(period.invoice.confirmedPaidUsd)}
            </dd>
          </div>
          <div>
            <dt>
              Saldo{' '}
              {period.invoice.status === 'VOIDED' ? '(factura anulada, no exigible)' : 'pendiente'}
            </dt>
            <dd>{formatUsd(period.invoice.balanceUsd)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

export function TenantSubscriptionCard() {
  const { data, isPending, isError, refetch } = useTenantSubscription();
  return (
    <Card>
      <h2 className="text-lg font-semibold text-on-surface">Suscripción</h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        Información del contrato mensual y su facturación.
      </p>
      {isPending ? (
        <p className="mt-4" role="status">
          Cargando suscripción...
        </p>
      ) : isError ? (
        <div className="mt-4" role="alert">
          <p>No se pudo cargar la suscripción.</p>
          <Button type="button" className="mt-2" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      ) : !data ? (
        <p className="mt-4">Este centro todavía no tiene una suscripción registrada.</p>
      ) : (
        <>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-on-surface-variant">Estado del contrato</dt>
              <dd>
                <Badge>{STATUS[data.status]}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-on-surface-variant">Cobertura del período</dt>
              <dd>{COVERAGE[data.coverageStatus]}</dd>
            </div>
            <div>
              <dt className="text-sm text-on-surface-variant">Mensualidad acordada</dt>
              <dd className="font-medium">{formatUsd(data.agreedPriceUsd)}</dd>
            </div>
            <div>
              <dt className="text-sm text-on-surface-variant">Días de gracia acordados</dt>
              <dd>{data.gracePeriodDays}</dd>
            </div>
          </dl>
          {data.currentPeriod && (
            <PeriodDetails title="Período asignado" period={data.currentPeriod} />
          )}
          {data.latestPeriod && data.latestPeriod.id !== data.currentPeriod?.id && (
            <PeriodDetails
              title="Último período registrado (no asignado como vigente)"
              period={data.latestPeriod}
            />
          )}
        </>
      )}
    </Card>
  );
}
