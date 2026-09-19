"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { Controller } from "react-hook-form";
import { z } from "zod/v4";

import { usePatientLookup } from "@/features/patients/hooks/use-patient-lookup";
import { PatientForm } from "@/features/patients/components/patient-form";
import {
  useCreatePayment,
  useDoctorServicePrices,
} from "@/features/payments/hooks/use-payments";
import { useDoctorLookup } from "@/features/payments/hooks/use-doctor-lookup";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { LookupCombobox } from "@/shared/components/ui/lookup-combobox";
import { Modal } from "@/shared/components/ui/modal";
import { Select } from "@/shared/components/ui/select";
import { formatUsd } from "@/shared/utils/format";
import {
  calculatePaidUsdEquivalent,
  getMaxPaymentAmount,
  getPaymentCurrency,
  paymentTotalsMatch,
} from "@/features/payments/utils/payment-calculations";

const PAYMENT_METHODS = [
  { value: "CASH_USD", label: "Efectivo USD" },
  { value: "ZELLE", label: "Zelle" },
  { value: "WIRE_TRANSFER_USD", label: "Transferencia USD" },
  { value: "POS_USD_CARD", label: "POS USD (exento IGTF)" },
  { value: "POS_BS", label: "POS Bs" },
  { value: "PAGO_MOVIL", label: "Pago Móvil" },
];

const CURRENCIES = [
  { value: "USD", label: "USD" },
  { value: "VES", label: "Bs" },
];

const lineSchema = z.object({
  paymentMethod: z.string().min(1),
  currency: z.enum(["USD", "VES"]),
  amount: z.number().positive("Monto requerido"),
  referenceNumber: z.string().optional(),
});

const schema = z.object({
  patientId: z.string().min(1, "Selecciona un paciente"),
  doctorId: z.string().min(1, "Selecciona un doctor"),
  bcvExchangeRate: z.number().positive("Tasa BCV requerida"),
  servicePriceIds: z
    .array(z.string())
    .min(1, "Selecciona al menos un servicio"),
  paymentLines: z.array(lineSchema).min(1, "Agrega al menos una línea de pago"),
});

export type ConsultationFormData = z.infer<typeof schema>;

interface ConsultationPaymentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ConsultationPaymentForm({
  onSuccess,
  onCancel,
}: ConsultationPaymentFormProps) {
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const [doctorQuery, setDoctorQuery] = useState("");
  const [success, setSuccess] = useState(false);
  const patientLookup = usePatientLookup(patientQuery);
  const doctorLookup = useDoctorLookup(doctorQuery);

  const { mutate, isPending, error } = useCreatePayment(() => {
    setSuccess(true);
    reset();
    setTimeout(() => {
      onSuccess?.();
    }, 1200);
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    control,
    formState: { errors },
  } = useForm<ConsultationFormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      paymentLines: [{ paymentMethod: "CASH_USD", currency: "USD", amount: 0 }],
      servicePriceIds: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "paymentLines",
  });
  const selectedDoctorId = watch("doctorId");
  const selectedServiceIds = watch("servicePriceIds");
  const [totalService, setTotalService] = useState(0);
  const bcvExchangeRate = watch("bcvExchangeRate");
  const paymentLines = watch("paymentLines");
  const totalPaidUsdEquivalent = calculatePaidUsdEquivalent(
    paymentLines,
    bcvExchangeRate,
  );
  const canRegisterPayment = paymentTotalsMatch(
    totalPaidUsdEquivalent,
    totalService,
  );
  const hasValidExchangeRate =
    Number.isFinite(bcvExchangeRate) && bcvExchangeRate > 0;

  const getLineMaxAmount = (index: number) =>
    getMaxPaymentAmount(paymentLines, index, totalService, bcvExchangeRate);

  const setMaximumAmount = (index: number) => {
    setValue(`paymentLines.${index}.amount`, getLineMaxAmount(index), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleAmountChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const amount = Number(event.target.value);
    setValue(
      `paymentLines.${index}.amount`,
      Math.min(amount, getLineMaxAmount(index)),
      {
        shouldValidate: true,
        shouldDirty: true,
      },
    );
  };

  const { data: servicePrices = [] } = useDoctorServicePrices(
    selectedDoctorId || null,
  );

  useEffect(() => {
    const total = servicePrices
      .filter((sp) => selectedServiceIds.includes(sp.id))
      .reduce((sum, sp) => sum + parseFloat(sp.priceUsd), 0);
    setTotalService(total);
  }, [selectedServiceIds, servicePrices]);

  useEffect(() => {
    setValue("servicePriceIds", []);
  }, [selectedDoctorId, setValue]);

  const toggleService = (id: string) => {
    const current = selectedServiceIds;
    const next = current.includes(id)
      ? current.filter((s) => s !== id)
      : [...current, id];
    setValue("servicePriceIds", next, { shouldValidate: true });
  };

  const onSubmit = (data: ConsultationFormData) => {
    if (!paymentTotalsMatch(totalPaidUsdEquivalent, totalService)) {
      setError("paymentLines", {
        type: "manual",
        message: `El pago debe totalizar ${formatUsd(totalService)}. Equivalente recibido: ${formatUsd(totalPaidUsdEquivalent)}`,
      });
      return;
    }

    const selectedServices = servicePrices.filter((sp) =>
      data.servicePriceIds.includes(sp.id),
    );
    const serviceNames = selectedServices.map((s) => s.serviceName).join(", ");

    mutate({
      patientId: data.patientId,
      bcvExchangeRate: data.bcvExchangeRate,
      idempotencyKey: crypto.randomUUID(),
      item: {
        itemType: "CONSULTATION" as const,
        description: `Consulta - ${serviceNames}`,
        doctorId: data.doctorId,
        servicePriceIds: data.servicePriceIds,
      },
      paymentLines: data.paymentLines,
    });
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="rounded-full bg-primary-container p-4">
          <svg
            className="h-8 w-8 text-on-primary-container"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-lg font-semibold text-on-surface">
          Pago registrado exitosamente
        </p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Paciente */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-on-surface">Paciente</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Controller
                control={control}
                name="patientId"
                render={({ field }) => (
                  <LookupCombobox
                    id="patientId"
                    label="Seleccionar paciente"
                    value={field.value}
                    onChange={field.onChange}
                    items={patientLookup.items}
                    isLoading={patientLookup.isLoading}
                    isFetchingNextPage={patientLookup.isFetchingNextPage}
                    hasNextPage={patientLookup.hasNextPage ?? false}
                    fetchNextPage={patientLookup.fetchNextPage}
                    canSearch={patientLookup.canSearch}
                    error={errors.patientId?.message}
                    onQueryChange={setPatientQuery}
                  />
                )}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPatientModal(true)}
            >
              <Plus className="h-4 w-4" /> Nuevo
            </Button>
          </div>
        </Card>

        {/* Doctor + Servicios */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-on-surface">
            Doctor y Servicios
          </p>
          <div className="flex flex-col gap-4">
            <Controller
              control={control}
              name="doctorId"
              render={({ field }) => (
                <LookupCombobox
                  id="doctorId"
                  label="Doctor"
                  value={field.value}
                  onChange={field.onChange}
                  items={doctorLookup.items}
                  isLoading={doctorLookup.isLoading}
                  isFetchingNextPage={doctorLookup.isFetchingNextPage}
                  hasNextPage={doctorLookup.hasNextPage ?? false}
                  fetchNextPage={doctorLookup.fetchNextPage}
                  canSearch={doctorLookup.canSearch}
                  error={errors.doctorId?.message}
                  onQueryChange={setDoctorQuery}
                />
              )}
            />

            {selectedDoctorId && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-on-surface">Servicios</p>
                {servicePrices.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">
                    Sin servicios disponibles para este doctor
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
                              ? "border-primary bg-primary-container text-on-primary-container"
                              : "border-outline bg-surface text-on-surface-variant hover:bg-surface-variant"
                          }`}
                        >
                          {sp.serviceName} · {sp.specialtyName} —{" "}
                          {formatUsd(sp.priceUsd)}
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.servicePriceIds && (
                  <p className="text-xs text-error">
                    {errors.servicePriceIds.message}
                  </p>
                )}
                {totalService > 0 && (
                  <p className="text-sm font-semibold text-on-surface">
                    Total:{" "}
                    <span className="text-primary">
                      {formatUsd(totalService)}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Tasa BCV */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-on-surface">
            Tasa de cambio
          </p>
          <div className="max-w-xs">
            <Input
              {...register("bcvExchangeRate", { valueAsNumber: true })}
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
            <p className="text-sm font-semibold text-on-surface">
              Forma de pago
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasValidExchangeRate}
              onClick={() =>
                append({
                  paymentMethod: "CASH_USD",
                  currency: "USD",
                  amount: 0,
                })
              }
            >
              <Plus className="h-3.5 w-3.5" /> Agregar línea
            </Button>
          </div>
          {!hasValidExchangeRate && (
            <p className="mt-2 text-xs text-error">
              Ingresá la tasa BCV para habilitar las formas de pago.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {fields.map((field, i) => (
              <div
                key={field.id}
                className="flex items-end gap-3 rounded-lg bg-surface-variant p-3"
              >
                <Select
                  {...register(`paymentLines.${i}.paymentMethod`)}
                  onChange={(event) => {
                    const method = event.target.value;
                    setValue(`paymentLines.${i}.paymentMethod`, method, {
                      shouldValidate: true,
                    });
                    setValue(
                      `paymentLines.${i}.currency`,
                      getPaymentCurrency(method),
                      {
                        shouldValidate: true,
                      },
                    );
                  }}
                  label="Método"
                  options={PAYMENT_METHODS}
                  className="flex-1"
                  disabled={!hasValidExchangeRate}
                />
                <Select
                  {...register(`paymentLines.${i}.currency`)}
                  label="Moneda"
                  options={CURRENCIES}
                  className="w-24"
                  disabled
                />
                <div className="flex min-w-40 items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      {...register(`paymentLines.${i}.amount`, {
                        valueAsNumber: true,
                      })}
                      onChange={(event) => handleAmountChange(i, event)}
                      label="Monto"
                      type="number"
                      step="0.01"
                      min="0"
                      max={getLineMaxAmount(i)}
                      placeholder="0.00"
                      error={errors.paymentLines?.[i]?.amount?.message}
                      className="w-full"
                      disabled={!hasValidExchangeRate}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaximumAmount(i)}
                    disabled={!hasValidExchangeRate || getLineMaxAmount(i) <= 0}
                    className="mb-0.5 rounded-lg border border-outline px-2 py-2 text-xs font-semibold text-primary hover:bg-primary-container disabled:text-on-surface-variant"
                  >
                    Max
                  </button>
                </div>
                <Input
                  {...register(`paymentLines.${i}.referenceNumber`)}
                  label="Referencia"
                  placeholder="Opcional"
                  className="flex-1"
                  disabled={!hasValidExchangeRate}
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="mb-0.5 rounded-lg p-2 text-on-surface-variant hover:text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {errors.paymentLines?.message && (
              <p className="text-xs text-error">
                {errors.paymentLines.message}
              </p>
            )}
            {hasValidExchangeRate && (
              <p
                className={`text-xs ${canRegisterPayment ? "text-success" : "text-on-surface-variant"}`}
              >
                Equivalente recibido: {formatUsd(totalPaidUsdEquivalent)} de{" "}
                {formatUsd(totalService)}
              </p>
            )}
          </div>
        </Card>

        {error && (
          <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
            {error.message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            isLoading={isPending}
            disabled={!hasValidExchangeRate || !canRegisterPayment}
          >
            Registrar pago
          </Button>
        </div>
      </form>

      <Modal
        open={showPatientModal}
        onClose={() => setShowPatientModal(false)}
        title="Nuevo paciente"
      >
        <PatientForm onClose={() => setShowPatientModal(false)} />
      </Modal>
    </>
  );
}
