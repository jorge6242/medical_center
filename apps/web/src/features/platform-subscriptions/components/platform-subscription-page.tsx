'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import type { SubscriptionHistoryQuery } from '../services/platform-subscriptions.service';

import { usePlatformContract } from '../hooks/use-platform-subscription';
import { PlatformBillingPanel } from './platform-billing-panel';
import { PlatformContractPanel } from './platform-contract-panel';

export function PlatformSubscriptionPage({ tenantId }: { readonly tenantId: string }) {
  const [pages, setPages] = useState({
    periodPage: 1,
    invoicePage: 1,
    paymentPage: 1,
  });
  const contract = usePlatformContract(tenantId, pages);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <Link
          href={`/platform/tenants/${tenantId}`}
          className="text-sm text-primary hover:underline"
        >
          ← Volver al centro
        </Link>
        <h1 className="mt-2 text-xl font-bold text-on-surface">Suscripción SaaS</h1>
      </header>

      {contract.isPending && (
        <p role="status" aria-live="polite" className="text-sm text-on-surface-variant">
          Cargando contrato…
        </p>
      )}
      {contract.isError && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container"
        >
          {contract.error.message}
        </p>
      )}
      {contract.data && (
        <>
          <PlatformContractPanel tenantId={tenantId} data={contract.data} />
          <PlatformBillingPanel tenantId={tenantId} data={contract.data} />
          <section className="flex flex-wrap gap-4" aria-label="Paginación de historiales">
            {(
              [
                ['periods', 'periodPage', 'Períodos'],
                ['invoices', 'invoicePage', 'Facturas'],
                ['payments', 'paymentPage', 'Pagos'],
              ] as const
            ).map(([history, field, label]) => {
              const pagination = contract.data.pagination[history];
              const total = Math.max(1, Math.ceil(pagination.total / pagination.limit));
              const move = (delta: number) =>
                setPages((current) => ({
                  ...current,
                  [field as keyof SubscriptionHistoryQuery]: current[field] + delta,
                }));
              return (
                <nav
                  key={history}
                  className="flex items-center gap-2"
                  aria-label={`Paginación ${label}`}
                >
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pages[field] <= 1 || contract.isFetching}
                    onClick={() => move(-1)}
                  >
                    Anterior
                  </Button>
                  <span>
                    {label}: {pages[field]} / {total} ({pagination.total})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pages[field] >= total || contract.isFetching}
                    onClick={() => move(1)}
                  >
                    Siguiente
                  </Button>
                </nav>
              );
            })}
          </section>
        </>
      )}
    </section>
  );
}
