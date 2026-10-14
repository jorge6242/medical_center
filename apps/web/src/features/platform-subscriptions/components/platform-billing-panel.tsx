'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

import { usePlatformPlans } from '@/features/platform-tenants/hooks/use-platform-tenants';
import {
  useCreatePeriod,
  useRegisterPayment,
  useVoidPayment,
} from '../hooks/use-platform-subscription';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Modal } from '@/shared/components/ui/modal';
import { UncertainMutationNotice } from '@/features/platform-shared/uncertain-mutation-notice';

import type { PlatformContract } from '../services/platform-subscriptions.service';

const USD_METHODS = ['CASH_USD', 'ZELLE', 'WIRE_TRANSFER_USD', 'POS_USD_CARD'];
const VES_METHODS = ['POS_BS', 'PAGO_MOVIL'];
const PRICE = /^\d+(\.\d{1,2})?$/;

export function PlatformBillingPanel({
  tenantId,
  data,
}: {
  readonly tenantId: string;
  readonly data: PlatformContract;
}) {
  return (
    <section className="flex flex-col gap-6">
      <PeriodForm tenantId={tenantId} />
      <PeriodsTable data={data} />
      <InvoicesTable tenantId={tenantId} data={data} />
      <PaymentsTable tenantId={tenantId} data={data} />
    </section>
  );
}

function PeriodsTable({ data }: { readonly data: PlatformContract }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-surface p-6 shadow-elevation-1">
      <h2 className="mb-3 text-base font-semibold text-on-surface">Historial de períodos</h2>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-outline text-on-surface-variant">
          <tr>
            <th className="py-2">Inicio</th>
            <th>Fin</th>
            <th>Plan</th>
            <th>Precio USD</th>
          </tr>
        </thead>
        <tbody>
          {data.periods.map((period) => (
            <tr key={period.id} className="border-b border-outline/40">
              <td className="py-2">{new Date(period.startsAt).toLocaleDateString('es-VE')}</td>
              <td>{new Date(period.endsAt).toLocaleDateString('es-VE')}</td>
              <td>{period.planCodeSnapshot}</td>
              <td>{period.priceUsdSnapshot}</td>
            </tr>
          ))}
          {data.periods.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-on-surface-variant">
                Sin períodos registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PeriodForm({ tenantId }: { readonly tenantId: string }) {
  const plans = usePlatformPlans();
  const create = useCreatePeriod(tenantId);
  const schema = z
    .object({
      planCode: z.string().min(1, 'Seleccioná un plan'),
      startsAt: z.string().min(1, 'Inicio requerido'),
      dueAt: z.string().min(1, 'Vencimiento requerido'),
    })
    .refine((v) => new Date(v.dueAt) >= new Date(v.startsAt), {
      message: 'El vencimiento no puede ser anterior al inicio',
      path: ['dueAt'],
    });
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({ resolver: zodResolver(schema) });

  return (
    <form
      className="grid gap-4 rounded-xl bg-surface p-6 shadow-elevation-1 md:grid-cols-4"
      onSubmit={handleSubmit((v) =>
        create.mutate(
          {
            planCode: v.planCode,
            startsAt: new Date(v.startsAt).toISOString(),
            dueAt: new Date(v.dueAt).toISOString(),
          },
          {
            onSuccess: () => {
              reset();
            },
          },
        ),
      )}
    >
      <h2 className="text-base font-semibold text-on-surface md:col-span-4">
        Nuevo período mensual
      </h2>
      <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">
        Plan
        <select
          className="h-10 rounded-lg border border-outline bg-surface px-3 text-sm"
          {...register('planCode')}
        >
          <option value="">Seleccioná…</option>
          {plans.data?.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
        {errors.planCode && <span className="text-xs text-error">{errors.planCode.message}</span>}
      </label>
      <Input
        {...register('startsAt')}
        id="periodStartsAt"
        label="Inicio"
        type="datetime-local"
        error={errors.startsAt?.message}
      />
      <Input
        {...register('dueAt')}
        id="periodDueAt"
        label="Vencimiento"
        type="datetime-local"
        error={errors.dueAt?.message}
      />
      <div className="flex items-end">
        <Button type="submit" isLoading={create.isPending} disabled={create.uncertain}>
          Crear período
        </Button>
      </div>
      <p className="text-xs text-on-surface-variant md:col-span-4">
        El período debe empezar donde termina el último. El mes se toma en hora de Caracas.
      </p>
      {create.uncertain && (
        <UncertainMutationNotice
          pending={create.isPending}
          retry={() => create.retryOriginal(() => reset())}
        />
      )}
    </form>
  );
}

function InvoicesTable({
  tenantId,
  data,
}: {
  readonly tenantId: string;
  readonly data: PlatformContract;
}) {
  const [paying, setPaying] = useState<{ id: string; number: string } | null>(null);
  return (
    <div className="rounded-xl bg-surface p-6 shadow-elevation-1">
      <h2 className="mb-3 text-base font-semibold text-on-surface">Facturas</h2>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-outline text-on-surface-variant">
          <tr>
            <th className="py-2">Número</th>
            <th>Estado</th>
            <th>Total USD</th>
            <th>Vence</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data.invoices.map((inv) => (
            <tr key={inv.id} className="border-b border-outline/40">
              <td className="py-2">{inv.number}</td>
              <td>{inv.status}</td>
              <td>{inv.totalUsd}</td>
              <td>{new Date(inv.dueAt).toLocaleDateString('es-VE')}</td>
              <td className="text-right">
                {inv.status !== 'PAID' && inv.status !== 'VOIDED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPaying({ id: inv.id, number: inv.number })}
                  >
                    Registrar pago
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {data.invoices.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-on-surface-variant">
                Sin facturas todavía.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {paying && (
        <PaymentDialog tenantId={tenantId} invoice={paying} onClose={() => setPaying(null)} />
      )}
    </div>
  );
}

function PaymentDialog({
  tenantId,
  invoice,
  onClose,
}: {
  readonly tenantId: string;
  readonly invoice: { id: string; number: string };
  readonly onClose: () => void;
}) {
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');
  const payment = useRegisterPayment(tenantId);
  const schema = z
    .object({
      amountPaid: z
        .string()
        .regex(PRICE, 'Monto positivo, hasta 2 decimales')
        .refine((value) => Number(value) > 0, 'El monto debe ser mayor que cero'),
      rate: z.string().optional(),
      method: z.string().min(1, 'Método requerido'),
      reference: z.string().max(100).optional(),
      paidAt: z.string().min(1, 'Fecha requerida'),
    })
    .refine(
      (v) =>
        currency === 'USD' || (v.rate !== undefined && PRICE.test(v.rate) && Number(v.rate) > 0),
      {
        message: 'Un pago en VES requiere tasa positiva',
        path: ['rate'],
      },
    );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  const methods = currency === 'USD' ? USD_METHODS : VES_METHODS;

  return (
    <Modal
      open
      onClose={() => {
        if (!payment.uncertain && !payment.isPending) onClose();
      }}
      title={`Pago de ${invoice.number}`}
    >
      {payment.uncertain && (
        <UncertainMutationNotice
          pending={payment.isPending}
          retry={() => payment.retryOriginal(onClose)}
        />
      )}
      <form
        className="flex flex-col gap-4 px-6 pb-6"
        onSubmit={handleSubmit((v) =>
          payment.mutate(
            {
              invoiceId: invoice.id,
              currency,
              amountPaid: v.amountPaid,
              rate: currency === 'VES' ? v.rate : undefined,
              method: v.method,
              reference: v.reference || undefined,
              paidAt: new Date(v.paidAt).toISOString(),
            },
            { onSuccess: onClose },
          ),
        )}
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">
          Moneda
          <select
            className="h-10 rounded-lg border border-outline bg-surface px-3 text-sm"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'USD' | 'VES')}
          >
            <option value="USD">USD</option>
            <option value="VES">VES (Bs)</option>
          </select>
        </label>
        <Input
          {...register('amountPaid')}
          id="amountPaid"
          label={`Monto (${currency})`}
          inputMode="decimal"
          error={errors.amountPaid?.message}
        />
        {currency === 'VES' && (
          <Input
            {...register('rate')}
            id="rate"
            label="Tasa de cambio (snapshot)"
            inputMode="decimal"
            error={errors.rate?.message as string | undefined}
          />
        )}
        <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">
          Método
          <select
            className="h-10 rounded-lg border border-outline bg-surface px-3 text-sm"
            {...register('method')}
          >
            {methods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <Input
          {...register('reference')}
          id="reference"
          label="Referencia (opcional)"
          error={errors.reference?.message}
        />
        <Input
          {...register('paidAt')}
          id="paidAt"
          label="Fecha del pago"
          type="datetime-local"
          error={errors.paidAt?.message}
        />
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={payment.uncertain || payment.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" isLoading={payment.isPending} disabled={payment.uncertain}>
            Registrar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentsTable({
  tenantId,
  data,
}: {
  readonly tenantId: string;
  readonly data: PlatformContract;
}) {
  const [voiding, setVoiding] = useState<string | null>(null);
  return (
    <div className="rounded-xl bg-surface p-6 shadow-elevation-1">
      <h2 className="mb-3 text-base font-semibold text-on-surface">Pagos</h2>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-outline text-on-surface-variant">
          <tr>
            <th className="py-2">Fecha</th>
            <th>Monto pagado</th>
            <th>USD</th>
            <th>Estado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data.payments.map((p) => (
            <tr key={p.id} className="border-b border-outline/40">
              <td className="py-2">{new Date(p.paidAt).toLocaleString('es-VE')}</td>
              <td>
                {p.amountPaid} {p.paymentCurrency}
              </td>
              <td>{p.amountUsd}</td>
              <td>{p.status}</td>
              <td className="text-right">
                {p.status === 'CONFIRMED' && (
                  <Button size="sm" variant="destructive" onClick={() => setVoiding(p.id)}>
                    Anular
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {data.payments.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-on-surface-variant">
                Sin pagos registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {voiding && (
        <VoidDialog tenantId={tenantId} paymentId={voiding} onClose={() => setVoiding(null)} />
      )}
    </div>
  );
}

function VoidDialog({
  tenantId,
  paymentId,
  onClose,
}: {
  readonly tenantId: string;
  readonly paymentId: string;
  readonly onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const voidPayment = useVoidPayment(tenantId);
  return (
    <Modal
      open
      onClose={() => {
        if (!voidPayment.uncertain && !voidPayment.isPending) onClose();
      }}
      title="Anular pago"
    >
      {voidPayment.uncertain && (
        <UncertainMutationNotice
          pending={voidPayment.isPending}
          retry={() => voidPayment.retryOriginal(onClose)}
        />
      )}
      <div className="flex flex-col gap-4 px-6 pb-6">
        <p className="text-sm text-on-surface-variant">
          El pago queda registrado como anulado y la factura se recalcula. No se borra.
        </p>
        <Input
          id="voidReason"
          label="Motivo (obligatorio)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={voidPayment.uncertain || voidPayment.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || voidPayment.uncertain}
            isLoading={voidPayment.isPending}
            onClick={() =>
              voidPayment.mutate({ paymentId, reason: reason.trim() }, { onSuccess: onClose })
            }
          >
            Anular pago
          </Button>
        </div>
      </div>
    </Modal>
  );
}
