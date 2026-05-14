'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { usePatients } from '@/features/patients/hooks/use-patients';
import { PatientForm } from '@/features/patients/components/patient-form';
import {
  useCreatePayment,
  useDoctorServicePrices,
  useDoctors,
} from '@/features/payments/hooks/use-payments';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Modal } from '@/shared/components/ui/modal';
import { Select } from '@/shared/components/ui/select';
import { formatUsd } from '@/shared/utils/format';

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
  { value: 'VES', label: 'Bs' },
];

const lineSchema = z.object({
  paymentMethod: z.string().min(1),
  currency: z.enum(['USD', 'VES']),
  amount: z.number().positive('Monto requerido'),
  referenceNumber: z.string().optional(),
});

const schema = z.object({
  patientId: z.string().min(1, 'Selecciona un paciente'),
  doctorId: z.string().min(1, 'Selecciona un doctor'),
  bcvExchangeRate: z.number().positive('Tasa BCV requerida'),
  servicePriceIds: z.array(z.string()).min(1, 'Selecciona al menos un servicio'),
  paymentLines: z.array(lineSchema).min(1, 'Agrega al menos una línea de pago'),
});

type FormData = z.infer<typeof schema>;

export default function RecepcionPage() {
  const { data: patients = [] } = usePatients();
  const { data: doctors = [] } = useDoctors();
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [success, setSuccess] = useState(false);

  const { mutate, isPending, error } = useCreatePayment(() => {
    setSuccess(true);
    reset();
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      paymentLines: [{ paymentMethod: 'CASH_USD', currency: 'USD', amount: 0 }],
      servicePriceIds: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'paymentLines' });
  const selectedDoctorId = watch('doctorId');
  const selectedServiceIds = watch('servicePriceIds');

  const { data: servicePrices = [] } = useDoctorServicePrices(selectedDoctorId || null);

  const [totalService, setTotalService] = useState(0);

  useEffect(() => {
    const total = servicePrices
      .filter((sp) => selectedServiceIds.includes(sp.id))
      .reduce((sum, sp) => sum + parseFloat(sp.priceUsd), 0);
    setTotalService(total);
  }, [selectedServiceIds, servicePrices]);

  useEffect(() => {
    setValue('servicePriceIds', []);
  }, [selectedDoctorId, setValue]);

  const toggleService = (id: string) => {
    const current = selectedServiceIds;
    const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id];
    setValue('servicePriceIds', next, { shouldValidate: true });
  };

  const onSubmit = (data: FormData) => {
    mutate({ ...data, idempotencyKey: crypto.randomUUID() });
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-on-surface">Recepción</h1>

      {success && (
        <div className="rounded-lg bg-primary-container px-4 py-3 text-sm font-medium text-on-primary-container">
          Pago registrado exitosamente.{' '}
          <button type="button" onClick={() => setSuccess(false)} className="underline">
            Registrar otro
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Paciente */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-on-surface">Paciente</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Select
                {...register('patientId')}
                id="patientId"
                label="Seleccionar paciente"
                error={errors.patientId?.message}
                options={[
                  { value: '', label: 'Seleccionar…' },
                  ...patients.map((p) => ({
                    value: p.id,
                    label: `${p.name} (${p.documentType}-${p.documentId})`,
                  })),
                ]}
              />
            </div>
            <Button type="button" variant="outline" onClick={() => setShowPatientModal(true)}>
              <Plus className="h-4 w-4" /> Nuevo paciente
            </Button>
          </div>
        </Card>

        {/* Doctor + Servicios */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-on-surface">Doctor y Servicios</p>
          <div className="flex flex-col gap-4">
            <Select
              {...register('doctorId')}
              id="doctorId"
              label="Doctor"
              error={errors.doctorId?.message}
              options={[
                { value: '', label: 'Seleccionar…' },
                ...doctors.map((d) => ({ value: d.id, label: `Dr. ${d.name}` })),
              ]}
            />

            {selectedDoctorId && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-on-surface">Servicios</p>
                {servicePrices.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">Sin servicios disponibles para este doctor</p>
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
                          {sp.serviceName} · {sp.specialtyName} — {formatUsd(sp.priceUsd)}
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.servicePriceIds && (
                  <p className="text-xs text-error">{errors.servicePriceIds.message}</p>
                )}
                {totalService > 0 && (
                  <p className="text-sm font-semibold text-on-surface">
                    Total: <span className="text-primary">{formatUsd(totalService)}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Tasa BCV */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-on-surface">Tasa de cambio</p>
          <div className="max-w-xs">
            <Input
              {...register('bcvExchangeRate', { valueAsNumber: true })}
              id="bcvExchangeRate"
              label="Tasa BCV (Bs/USD)"
              type="number"
              step="0.0001"
              placeholder="36.50"
              error={errors.bcvExchangeRate?.message}
            />
          </div>
        </Card>

        {/* Líneas de pago */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-on-surface">Forma de pago</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ paymentMethod: 'CASH_USD', currency: 'USD', amount: 0 })}
            >
              <Plus className="h-3.5 w-3.5" /> Agregar línea
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {fields.map((field, i) => (
              <div key={field.id} className="flex items-end gap-3 rounded-lg bg-surface-variant p-3">
                <Select {...register(`paymentLines.${i}.paymentMethod`)} label="Método" options={PAYMENT_METHODS} className="flex-1" />
                <Select {...register(`paymentLines.${i}.currency`)} label="Moneda" options={CURRENCIES} className="w-24" />
                <Input {...register(`paymentLines.${i}.amount`, { valueAsNumber: true })} label="Monto" type="number" step="0.01" placeholder="0.00" error={errors.paymentLines?.[i]?.amount?.message} className="w-28" />
                <Input {...register(`paymentLines.${i}.referenceNumber`)} label="Referencia" placeholder="Opcional" className="flex-1" />
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="mb-0.5 rounded-lg p-2 text-on-surface-variant hover:text-error">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {errors.paymentLines?.message && <p className="text-xs text-error">{errors.paymentLines.message}</p>}
          </div>
        </Card>

        {error && (
          <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
            {error.message}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" isLoading={isPending} className="px-8">
            Registrar pago
          </Button>
        </div>
      </form>

      <Modal open={showPatientModal} onClose={() => setShowPatientModal(false)} title="Nuevo paciente">
        <PatientForm onClose={() => setShowPatientModal(false)} />
      </Modal>
    </div>
  );
}
