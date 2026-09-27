'use client';

import { useEffect, useMemo, useState } from 'react';

import { pdf } from '@react-pdf/renderer';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileDown } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { useAppConfig } from '@/features/config/hooks/use-app-config';
import { useDoctorLookup } from '@/features/payments/hooks/use-doctor-lookup';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { LookupCombobox } from '@/shared/components/ui/lookup-combobox';
import { Select } from '@/shared/components/ui/select';
import { useNotification } from '@/shared/hooks/use-notification';
import { formatBs, formatUsd } from '@/shared/utils/format';

import { useCreateDoctorPayout, usePendingDoctorPayout } from '../hooks/use-doctor-payouts';
import type { DoctorPayout, DoctorPayoutDetail } from '../services/doctor-payouts.service';
import { DoctorPayoutPDF } from './doctor-payout-pdf';

const schema = z.object({
  doctorId: z.string().min(1, 'Seleccioná un doctor'),
  paymentMethod: z.enum(['CASH_USD', 'ZELLE', 'WIRE_TRANSFER_USD', 'PAGO_MOVIL']),
  currency: z.enum(['USD', 'VES']),
  bcvExchangeRate: z.number().positive('Ingresá una tasa BCV válida'),
  referenceNumber: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface DoctorPayoutFormProps {
  onCancel: () => void;
  onSuccess: (payout: DoctorPayout) => void;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function DoctorPayoutForm({ onCancel, onSuccess }: DoctorPayoutFormProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDownloadingPreview, setIsDownloadingPreview] = useState(false);
  const [doctorQuery, setDoctorQuery] = useState('');
  const doctorLookup = useDoctorLookup(doctorQuery);
  const { data: appConfig } = useAppConfig();
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { paymentMethod: 'PAGO_MOVIL', currency: 'VES' },
  });
  const doctorId = watch('doctorId');
  const paymentMethod = watch('paymentMethod');
  const currency = watch('currency');
  const bcvExchangeRate = watch('bcvExchangeRate');
  const { data: pending, isLoading } = usePendingDoctorPayout(doctorId);
  const createMutation = useCreateDoctorPayout(onSuccess);
  const notification = useNotification();

  useEffect(() => {
    setSelectedIds(pending?.payments.map((payment) => payment.id) ?? []);
  }, [pending]);
  useEffect(() => {
    if (paymentMethod === 'PAGO_MOVIL') setValue('currency', 'VES');
  }, [paymentMethod, setValue]);

  const selectedPayments = useMemo(
    () => pending?.payments.filter((payment) => selectedIds.includes(payment.id)) ?? [],
    [pending, selectedIds],
  );
  const totalDoctorShare = selectedPayments.reduce(
    (sum, payment) => sum + Number(payment.doctorShareUsd),
    0,
  );
  const equivalentBs = bcvExchangeRate ? totalDoctorShare * bcvExchangeRate : 0;
  const selectedDoctor = doctorLookup.items.find((doctor) => doctor.id === doctorId);

  const submit = (data: FormData) => {
    if (paymentMethod === 'PAGO_MOVIL' && !data.referenceNumber?.trim()) return;
    createMutation.mutate({
      ...data,
      paymentIds: selectedIds,
      referenceNumber: data.referenceNumber || undefined,
      bankName: pending?.doctor.bankName ?? undefined,
      accountNumber: pending?.doctor.accountNumber ?? undefined,
      bankPhone: pending?.doctor.bankPhone ?? undefined,
    });
  };

  const downloadPreview = async () => {
    if (!pending || !selectedDoctor || !bcvExchangeRate || selectedPayments.length === 0) {
      notification.error('Seleccioná consultas e ingresá la tasa BCV para generar la vista previa');
      return;
    }
    const preview: DoctorPayoutDetail = {
      id: 'borrador',
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      doctorDocument: `${selectedDoctor.documentType}-${selectedDoctor.documentId}`,
      status: 'COMPLETED',
      paymentMethod,
      currency,
      amountUsd: totalDoctorShare.toFixed(2),
      paidAmount: currency === 'VES' ? equivalentBs.toFixed(2) : totalDoctorShare.toFixed(2),
      bcvExchangeRate: String(bcvExchangeRate),
      equivalentBs: equivalentBs.toFixed(2),
      referenceNumber: watch('referenceNumber')?.trim() || null,
      bankName: pending.doctor.bankName ?? '',
      accountNumber: pending.doctor.accountNumber,
      bankPhone: pending.doctor.bankPhone,
      createdAt: new Date().toISOString(),
      voidReason: null,
      items: selectedPayments.map((payment) => ({
        paymentId: payment.id,
        consultationDate: payment.consultationDate,
        patientName: payment.patientName,
        patientDocument: null,
        description: payment.description,
        services: [],
      })),
    };
    setIsDownloadingPreview(true);
    try {
      const blob = await pdf(
        <DoctorPayoutPDF payout={preview} tenantName={appConfig?.tenant.name} isPreview />,
      ).toBlob();
      downloadBlob(blob, 'borrador-pago-honorarios.pdf');
      notification.success('Se descargó la vista previa marcada como borrador');
    } catch (previewError: unknown) {
      notification.error(
        previewError instanceof Error ? previewError.message : 'No se pudo generar la vista previa',
      );
    } finally {
      setIsDownloadingPreview(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <Controller
        control={control}
        name="doctorId"
        render={({ field }) => (
          <LookupCombobox
            id="doctorId"
            label="Doctor"
            value={field.value ?? ''}
            onChange={field.onChange}
            items={doctorLookup.items}
            isLoading={doctorLookup.isLoading}
            isFetchingNextPage={doctorLookup.isFetchingNextPage}
            hasNextPage={doctorLookup.hasNextPage}
            fetchNextPage={doctorLookup.fetchNextPage}
            canSearch={doctorLookup.canSearch}
            onQueryChange={setDoctorQuery}
            error={errors.doctorId?.message}
          />
        )}
      />
      {doctorId && (
        <>
          <div className="rounded-lg bg-surface-variant p-3 text-sm text-on-surface">
            <p className="font-semibold">{pending?.doctor.name}</p>
            <p className="text-on-surface-variant">
              {pending?.doctor.bankName ?? 'Sin banco'} ·{' '}
              {pending?.doctor.bankPhone ?? pending?.doctor.accountNumber ?? 'Sin dato bancario'}
            </p>
          </div>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-outline p-2">
            {isLoading && <p className="p-2 text-sm">Cargando consultas…</p>}
            {!isLoading && pending?.payments.length === 0 && (
              <p className="p-2 text-sm text-on-surface-variant">
                No hay consultas pendientes por pagar.
              </p>
            )}
            {pending?.payments.map((payment) => (
              <label
                key={payment.id}
                className="flex cursor-pointer items-center justify-between gap-3 border-b border-outline-variant p-2 last:border-0"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(payment.id)}
                  onChange={() =>
                    setSelectedIds((current) =>
                      current.includes(payment.id)
                        ? current.filter((id) => id !== payment.id)
                        : [...current, payment.id],
                    )
                  }
                />
                <span className="flex-1 text-sm">
                  <b>{payment.patientName}</b>
                  <br />
                  {payment.description}
                </span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 rounded-lg bg-primary-container p-3 text-sm text-on-primary-container md:grid-cols-2">
            <span>
              Total a pagar: <b>{formatUsd(totalDoctorShare)}</b>
            </span>
            <span>
              Equivalente BCV:{' '}
              <b>{bcvExchangeRate ? formatBs(equivalentBs) : 'Ingresá la tasa BCV'}</b>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              {...register('paymentMethod')}
              label="Método de pago"
              options={[
                { value: 'PAGO_MOVIL', label: 'Pago Móvil' },
                { value: 'WIRE_TRANSFER_USD', label: 'Transferencia USD' },
                { value: 'ZELLE', label: 'Zelle' },
                { value: 'CASH_USD', label: 'Efectivo USD' },
              ]}
            />
            <Select
              {...register('currency')}
              label="Moneda"
              options={[
                { value: 'USD', label: 'USD' },
                { value: 'VES', label: 'Bolívares' },
              ]}
              disabled={paymentMethod === 'PAGO_MOVIL'}
            />
          </div>
          <Input
            {...register('bcvExchangeRate', { valueAsNumber: true })}
            type="number"
            step="0.0001"
            label="Tasa BCV (Bs/USD)"
            error={errors.bcvExchangeRate?.message}
          />
          {bcvExchangeRate ? (
            <p className="text-sm text-on-surface-variant">
              {currency === 'VES'
                ? `Monto a pagar: ${formatBs(equivalentBs)}`
                : `Pago en USD: ${formatUsd(totalDoctorShare)} · Referencia BCV: ${formatBs(equivalentBs)}`}
            </p>
          ) : null}
          <Input
            {...register('referenceNumber')}
            label={
              paymentMethod === 'PAGO_MOVIL' ? 'Número de referencia *' : 'Número de referencia'
            }
            error={
              paymentMethod === 'PAGO_MOVIL' && !watch('referenceNumber')
                ? 'La referencia es obligatoria para Pago Móvil'
                : undefined
            }
          />
        </>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={downloadPreview}
          disabled={selectedIds.length === 0 || !bcvExchangeRate}
          isLoading={isDownloadingPreview}
        >
          <FileDown className="h-4 w-4" />
          Descargar vista previa
        </Button>
        <Button
          type="submit"
          disabled={
            selectedIds.length === 0 ||
            !bcvExchangeRate ||
            (paymentMethod === 'PAGO_MOVIL' && !watch('referenceNumber'))
          }
          isLoading={createMutation.isPending}
        >
          Registrar pago de honorarios
        </Button>
      </div>
    </form>
  );
}
