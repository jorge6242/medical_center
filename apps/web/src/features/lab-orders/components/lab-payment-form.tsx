"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod/v4";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { formatUsd } from "@/shared/utils/format";
import {
  calculatePaidUsdEquivalent,
  getMaxPaymentAmount,
  getPaymentCurrency,
  paymentTotalsMatch,
} from "@/features/payments/utils/payment-calculations";

import { useQueryClient } from "@tanstack/react-query";

import { useCreatePayment } from "@/features/payments/hooks/use-payments";

import type { LabOrderDetail } from "@/features/lab-orders/services/lab-orders.service";

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
  { value: "VES", label: "VES (Bs)" },
];

const lineSchema = z.object({
  paymentMethod: z.string().min(1),
  currency: z.enum(["USD", "VES"]),
  amount: z.number().positive("Monto debe ser positivo"),
  referenceNumber: z.string().optional(),
});

const schema = z.object({
  bcvExchangeRate: z.number().positive("Tasa BCV requerida"),
  paymentLines: z.array(lineSchema).min(1, "Agrega al menos una línea de pago"),
});

type FormData = z.infer<typeof schema>;

function generateUUID(): string {
  return crypto.randomUUID();
}

interface LabPaymentFormProps {
  order: LabOrderDetail;
  onClose: () => void;
}

export function LabPaymentForm({ order, onClose }: LabPaymentFormProps) {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useCreatePayment(() => {
    void queryClient.invalidateQueries({ queryKey: ["lab-orders"] });
    onClose();
  });

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      paymentLines: [{ paymentMethod: "CASH_USD", currency: "USD", amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "paymentLines",
  });
  const paymentLines = watch("paymentLines");

  const orderTotal = parseFloat(order.totalUsd);
  const bcvExchangeRate = watch("bcvExchangeRate");
  const totalPaidUsdEquivalent = calculatePaidUsdEquivalent(
    paymentLines,
    bcvExchangeRate,
  );
  const canRegisterPayment = paymentTotalsMatch(
    totalPaidUsdEquivalent,
    orderTotal,
  );
  const hasValidExchangeRate =
    Number.isFinite(bcvExchangeRate) && bcvExchangeRate > 0;

  const getLineMaxAmount = (index: number) =>
    getMaxPaymentAmount(paymentLines, index, orderTotal, bcvExchangeRate);

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
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const onSubmit = (data: FormData) => {
    if (!paymentTotalsMatch(totalPaidUsdEquivalent, orderTotal)) {
      setError("paymentLines", {
        type: "manual",
        message: `El pago debe totalizar ${formatUsd(orderTotal)}. Equivalente recibido: ${formatUsd(totalPaidUsdEquivalent)}`,
      });
      return;
    }

    const testNames = order.tests.map((t) => t.testName).join(", ");

    mutate({
      patientId: order.patient.id,
      bcvExchangeRate: data.bcvExchangeRate,
      idempotencyKey: generateUUID(),
      item: {
        itemType: "LAB" as const,
        description: `Laboratorio - ${testNames}`,
        labOrderId: order.id,
      },
      paymentLines: data.paymentLines,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Order Summary */}
      <div className="rounded-lg bg-surface-variant p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">Paciente</span>
          <span className="text-sm font-medium text-on-surface">
            {order.patient.name}
          </span>
        </div>
        <div className="mb-3 border-b border-outline-variant pb-3">
          <span className="text-sm text-on-surface-variant">Documento</span>
          <span className="ml-2 text-sm font-medium text-on-surface">
            {order.patient.documentType}-{order.patient.documentId}
          </span>
        </div>
        <p className="mb-2 text-sm font-medium text-on-surface">Tests:</p>
        <div className="flex flex-col gap-1">
          {order.tests.map((test) => (
            <div
              key={test.labTestId}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-on-surface">{test.testName}</span>
              <span className="text-on-surface-variant">
                {formatUsd(test.priceUsd)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-outline-variant pt-3">
          <span className="text-sm font-medium text-on-surface">
            Total orden:
          </span>
          <span className="text-lg font-bold text-primary">
            {formatUsd(order.totalUsd)}
          </span>
        </div>
      </div>

      {/* BCV Rate */}
      <Input
        {...register("bcvExchangeRate", { valueAsNumber: true })}
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
            disabled={!hasValidExchangeRate}
            onClick={() =>
              append({ paymentMethod: "CASH_USD", currency: "USD", amount: 0 })
            }
          >
            <Plus className="mr-1 h-3 w-3" />
            Agregar
          </Button>
        </div>

        {!hasValidExchangeRate && (
          <p className="text-xs text-error">
            Ingresá la tasa BCV para habilitar las formas de pago.
          </p>
        )}

        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-12 gap-2">
            <div className="col-span-4">
              <Select
                {...register(`paymentLines.${index}.paymentMethod`)}
                onChange={(event) => {
                  const method = event.target.value;
                  setValue(`paymentLines.${index}.paymentMethod`, method, {
                    shouldValidate: true,
                  });
                  setValue(
                    `paymentLines.${index}.currency`,
                    getPaymentCurrency(method),
                    {
                      shouldValidate: true,
                    },
                  );
                }}
                id={`paymentMethod-${index}`}
                label="Método"
                options={PAYMENT_METHODS}
                disabled={!hasValidExchangeRate}
              />
            </div>
            <div className="col-span-3">
              <Select
                {...register(`paymentLines.${index}.currency`)}
                id={`currency-${index}`}
                label="Moneda"
                options={CURRENCIES}
                disabled
              />
            </div>
            <div className="col-span-3 flex min-w-0 items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  {...register(`paymentLines.${index}.amount`, {
                    valueAsNumber: true,
                  })}
                  onChange={(event) => handleAmountChange(index, event)}
                  id={`amount-${index}`}
                  label="Monto"
                  type="number"
                  step="0.01"
                  min="0"
                  max={getLineMaxAmount(index)}
                  disabled={!hasValidExchangeRate}
                />
              </div>
              <button
                type="button"
                onClick={() => setMaximumAmount(index)}
                disabled={!hasValidExchangeRate || getLineMaxAmount(index) <= 0}
                className="mb-0.5 rounded-lg border border-outline px-2 py-2 text-xs font-semibold text-primary hover:bg-primary-container disabled:text-on-surface-variant"
              >
                Max
              </button>
            </div>
            <div className="col-span-2 flex items-end">
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-error hover:text-error"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {errors.paymentLines && (
          <p className="text-xs text-error">{errors.paymentLines.message}</p>
        )}
      </div>

      {/* Totals */}
      <div className="flex items-center justify-between rounded-lg bg-surface-variant px-4 py-3">
        <span className="text-sm text-on-surface-variant">Total pagado:</span>
        <span
          className={`text-sm font-bold ${canRegisterPayment ? "text-success" : "text-error"}`}
        >
          {formatUsd(totalPaidUsdEquivalent)} {canRegisterPayment ? "✓" : ""}
        </span>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-error">{(error as Error).message}</p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={isPending}
          disabled={!hasValidExchangeRate || !canRegisterPayment}
        >
          Completar pago
        </Button>
      </div>
    </form>
  );
}
