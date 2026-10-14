'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

import { useChangeContractStatus, useUpdateContract } from '../hooks/use-platform-subscription';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

import type { ContractStatus, PlatformContract } from '../services/platform-subscriptions.service';

// Espejo de design.md §5 sólo para mostrar opciones válidas; el backend valida igual.
const NEXT_STATUS: Record<ContractStatus, ContractStatus[]> = {
  TRIALING: ['ACTIVE', 'CANCELED'],
  ACTIVE: ['PAST_DUE', 'SUSPENDED', 'CANCELED'],
  PAST_DUE: ['ACTIVE', 'SUSPENDED', 'CANCELED'],
  SUSPENDED: ['ACTIVE', 'CANCELED'],
  CANCELED: [],
};

const PRICE = /^\d+(\.\d{1,2})?$/;

const schema = z.object({
  agreedPriceUsd: z
    .string()
    .regex(PRICE, 'Precio: positivo, hasta 2 decimales')
    .refine((value) => Number(value) > 0, 'El precio debe ser mayor que cero'),
  gracePeriodDays: z.number().int().min(0).max(30),
  reason: z.string().trim().min(1, 'Motivo obligatorio').max(500),
});
type FormValues = z.infer<typeof schema>;

export function PlatformContractPanel({
  tenantId,
  data,
}: {
  readonly tenantId: string;
  readonly data: PlatformContract;
}) {
  const { contract } = data;
  const update = useUpdateContract(tenantId);
  const changeStatus = useChangeContractStatus(tenantId);
  const [nextStatus, setNextStatus] = useState<ContractStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      agreedPriceUsd: contract.agreedPriceUsd,
      gracePeriodDays: contract.gracePeriodDays,
      reason: '',
    },
  });

  const options = NEXT_STATUS[contract.status];

  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl bg-surface p-6 shadow-elevation-1">
        <h2 className="text-base font-semibold text-on-surface">Contrato</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-on-surface-variant">Estado</dt>
          <dd className="font-medium">{contract.status}</dd>
          <dt className="text-on-surface-variant">Precio acordado</dt>
          <dd>{contract.agreedPriceUsd} USD</dd>
          <dt className="text-on-surface-variant">Días de gracia</dt>
          <dd>{contract.gracePeriodDays}</dd>
          <dt className="text-on-surface-variant">Versión</dt>
          <dd>{contract.version}</dd>
        </dl>

        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={handleSubmit((v) =>
            update.mutate({
              agreedPriceUsd: v.agreedPriceUsd,
              gracePeriodDays: v.gracePeriodDays,
              reason: v.reason,
              expectedVersion: contract.version,
            }),
          )}
        >
          <p className="text-xs text-on-surface-variant">
            Un cambio de precio aplica sólo a los períodos futuros.
          </p>
          <Input
            {...register('agreedPriceUsd')}
            id="agreedPriceUsd"
            label="Precio (USD)"
            error={errors.agreedPriceUsd?.message}
          />
          <Input
            {...register('gracePeriodDays', { valueAsNumber: true })}
            id="gracePeriodDays"
            label="Días de gracia"
            type="number"
            min={0}
            max={30}
            error={errors.gracePeriodDays?.message}
          />
          <Input
            {...register('reason')}
            id="contractReason"
            label="Motivo"
            error={errors.reason?.message}
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={update.isPending}>
              Guardar contrato
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl bg-surface p-6 shadow-elevation-1">
        <h2 className="text-base font-semibold text-on-surface">Cambiar estado</h2>
        {options.length === 0 ? (
          <p className="mt-3 text-sm text-on-surface-variant">
            Este contrato está cancelado y no admite cambios de estado.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">
              Nuevo estado
              <select
                className="h-10 rounded-lg border border-outline bg-surface px-3 text-sm"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as ContractStatus | '')}
              >
                <option value="">Seleccioná…</option>
                {options.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <Input
              id="statusReason"
              label="Motivo (obligatorio)"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                variant={nextStatus === 'CANCELED' ? 'destructive' : 'primary'}
                disabled={!nextStatus || !statusReason.trim()}
                isLoading={changeStatus.isPending}
                onClick={() => {
                  if (!nextStatus) return;
                  changeStatus.mutate(
                    {
                      status: nextStatus,
                      reason: statusReason.trim(),
                      expectedVersion: contract.version,
                    },
                    {
                      onSuccess: () => {
                        setNextStatus('');
                        setStatusReason('');
                      },
                    },
                  );
                }}
              >
                Aplicar estado
              </Button>
            </div>
            <p className="text-xs text-on-surface-variant">
              Cambiar el estado no suspende ni reactiva el acceso del centro: eso se hace desde la
              pantalla del centro.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
