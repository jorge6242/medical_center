'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { usePatients } from '@/features/patients/hooks/use-patients';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { formatUsd } from '@/shared/utils/format';

import { useDoctorServices, useDoctors, useCreatePayment } from '../hooks/use-payments';

const PAYMENT_METHODS = [
  { value: 'CASH_USD', label: 'Efectivo USD' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'WIRE_TRANSFER_USD', label: 'Transferencia USD' },
  { value: 'POS_USD_CARD', label: 'POS USD (exento IGTF)' },
  { value: 'POS_BS', label: 'POS Bs' },
  { value: 'PAGO_MOVIL', label: 'Pago Móvil' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'VES', label: 'VES (Bs)' },
];

const lineSchema = z.object({
  paymentMethod: z.string().min(1),
  currency: z.enum(['USD', 'VES']),
  amount: z.number().positive('Monto debe ser positivo'),
  referenceNumber: z.string().optional(),
});

const schema = z.object({
  patientId: z.string().min(1, 'Selecciona un paciente'),
  doctorId: z.string().min(1, 'Selecciona un doctor'),
  bcvExchangeRate: z.number().positive('Tasa BCV requerida'),
  doctorServiceIds: z.array(z.string()).min(1, 'Selecciona al menos un servicio'),
  consultationDate: z.string().min(1, 'Indica la fecha y hora de la consulta'),
  paymentLines: z.array(lineSchema).min(1, 'Agrega al menos una línea de pago'),
});

type FormData = z.infer<typeof schema>;

function generateUUID(): string {
  return crypto.randomUUID();
}

function currentDateTimeLocal(): string {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function PaymentForm({ onClose }: { readonly onClose: () => void }) {
  const { data: patients = [] } = usePatients();
  const { data: doctors = [] } = useDoctors();
  const { mutate, isPending, error } = useCreatePayment(onClose);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    control,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      paymentLines: [{ paymentMethod: 'CASH_USD', currency: 'USD', amount: 0 }],
      doctorServiceIds: [],
      consultationDate: currentDateTimeLocal(),
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'paymentLines' });
  const selectedDoctorId = watch('doctorId');
  const selectedServiceIds = watch('doctorServiceIds');

  const { data: servicePrices = [] } = useDoctorServices(selectedDoctorId || null);

  const [totalService, setTotalService] = useState(0);

  useEffect(() => {
    const total = servicePrices
      .filter((sp) => selectedServiceIds.includes(sp.id))
      .reduce((sum, sp) => sum + parseFloat(sp.priceUsd), 0);
    setTotalService(total);
  }, [selectedServiceIds, servicePrices]);

  const toggleService = (id: string) => {
    const current = selectedServiceIds;
    const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id];
    setValue('doctorServiceIds', next, { shouldValidate: true });
  };

  const onSubmit = (data: FormData) => {
    const selectedServices = servicePrices.filter((sp) => data.doctorServiceIds.includes(sp.id));
    const serviceNames = selectedServices.map((s) => s.serviceName).join(', ');

    mutate({
      patientId: data.patientId,
      bcvExchangeRate: data.bcvExchangeRate,
      consultationDate: new Date(data.consultationDate).toISOString(),
      idempotencyKey: generateUUID(),
      item: {
        itemType: 'CONSULTATION' as const,
        description: `Consulta - ${serviceNames}`,
        doctorId: data.doctorId,
        doctorServiceIds: data.doctorServiceIds,
      },
      paymentLines: data.paymentLines,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Patient + Doctor */}
      <div className="grid grid-cols-2 gap-4">
        <Select
          {...register('patientId')}
          id="patientId"
          label="Paciente"
          error={errors.patientId?.message}
          options={[
            { value: '', label: 'Seleccionar…' },
            ...patients.map((p) => ({
              value: p.id,
              label: `${p.name} (${p.documentType}-${p.documentId})`,
            })),
          ]}
        />
        <Select
          {...register('doctorId')}
          id="doctorId"
          label="Doctor"
          error={errors.doctorId?.message}
          options={[
            { value: '', label: 'Seleccionar…' },
            ...doctors.map((d) => ({
              value: d.id,
              label: `Dr. ${d.name}`,
            })),
          ]}
        />
      </div>

      {/* Services */}
      {selectedDoctorId && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-on-surface">Servicios</p>
          {servicePrices.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No hay servicios disponibles para este doctor
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {servicePrices.map((sp) => {
                const selected = selectedServiceIds.includes(sp.id);
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => toggleService(sp.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? 'border-primary bg-primary-container text-on-primary-container'
                        : 'border-outline bg-surface text-on-surface-variant hover:bg-surface-variant'
                    }`}
                  >
                    {sp.serviceName} — {formatUsd(sp.priceUsd)}
                  </button>
                );
              })}
            </div>
          )}
          {errors.doctorServiceIds && (
            <p className="text-xs text-error">{errors.doctorServiceIds.message}</p>
          )}
          {totalService > 0 && (
            <p className="text-sm font-medium text-on-surface">
              Total servicios: <span className="text-primary">{formatUsd(totalService)}</span>
            </p>
          )}
        </div>
      )}

      <Input
        {...register('consultationDate')}
        id="consultationDate"
        label="Fecha y hora de la consulta"
        type="datetime-local"
        error={errors.consultationDate?.message}
      />

      {/* BCV Rate */}
      <Input
        {...register('bcvExchangeRate', { valueAsNumber: true })}
        id="bcvExchangeRate"
        label="Tasa BCV (Bs/USD)"
        type="number"
        step="0.0001"
        placeholder="36.50"
        error={errors.bcvExchangeRate?.message}
      />

      {/* Payment Lines */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-on-surface">Líneas de pago</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ paymentMethod: 'CASH_USD', currency: 'USD', amount: 0 })}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar línea
          </Button>
        </div>

        {fields.map((field, i) => (
          <div key={field.id} className="flex items-end gap-3 rounded-lg bg-surface-variant p-3">
            <Select
              {...register(`paymentLines.${i}.paymentMethod`)}
              label="Método"
              options={PAYMENT_METHODS}
              className="flex-1"
            />
            <Select
              {...register(`paymentLines.${i}.currency`)}
              label="Moneda"
              options={CURRENCIES}
              className="w-28"
            />
            <Input
              {...register(`paymentLines.${i}.amount`, { valueAsNumber: true })}
              label="Monto"
              type="number"
              step="0.01"
              placeholder="0.00"
              error={errors.paymentLines?.[i]?.amount?.message}
              className="w-32"
            />
            <Input
              {...register(`paymentLines.${i}.referenceNumber`)}
              label="Referencia"
              placeholder="Opcional"
              className="flex-1"
            />
            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="mb-[2px] rounded-lg p-2 text-on-surface-variant hover:bg-surface hover:text-error"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {errors.paymentLines && <p className="text-xs text-error">{errors.paymentLines.message}</p>}
      </div>

      {error && (
        <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
          {error.message}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isPending}>
          Registrar pago
        </Button>
      </div>
    </form>
  );
}
