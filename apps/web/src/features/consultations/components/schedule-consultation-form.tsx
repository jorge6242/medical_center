"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { z } from "zod/v4";

import { usePatientLookup } from "@/features/patients/hooks/use-patient-lookup";
import { useDoctorLookup } from "@/features/payments/hooks/use-doctor-lookup";
import { useDoctorServices } from "@/features/payments/hooks/use-payments";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { LookupCombobox } from "@/shared/components/ui/lookup-combobox";
import { formatUsd } from "@/shared/utils/format";
import {
  addMinutesToUtc,
  formatDateInput,
  formatTimeInput,
  formatTimeWithTimezone,
  parseDateTimeToUtc,
} from "@/shared/utils/timezone";

import {
  useCreateScheduledConsultation,
  useDoctorAvailability,
} from "../hooks/use-consultations";
import type { ConsultationResponse } from "../services/consultations.service";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

interface ScheduleFormData {
  patientId: string;
  doctorId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  doctorServiceIds: string[];
  notes?: string;
  sendEmailNotification: boolean;
  registerPaymentNow: boolean;
}

const schema: z.ZodSchema<ScheduleFormData> = z.object({
  patientId: z.string().min(1, "Seleccioná un paciente"),
  doctorId: z.string().min(1, "Seleccioná un doctor"),
  date: z.string().min(1, "Indicá la fecha"),
  startTime: z.string().min(1, "Indicá la hora de inicio"),
  durationMinutes: z.preprocess(
    (value) => (typeof value === 'string' ? Number(value) : value),
    z.number().min(1, "Indicá la duración"),
  ),
  doctorServiceIds: z
    .array(z.string())
    .min(1, "Seleccioná al menos un servicio"),
  notes: z.string().optional(),
  sendEmailNotification: z.boolean(),
  registerPaymentNow: z.boolean(),
});

function defaultDateTime() {
  const now = new Date();
  return {
    date: formatDateInput(now),
    startTime: formatTimeInput(now),
    durationMinutes: 30,
  };
}

interface ScheduleConsultationFormProps {
  onSuccess: (
    consultation: ConsultationResponse,
    registerPaymentNow: boolean,
  ) => void;
  onCancel: () => void;
}

export function ScheduleConsultationForm({
  onSuccess,
  onCancel,
}: ScheduleConsultationFormProps) {
  const [patientQuery, setPatientQuery] = useState("");
  const [doctorQuery, setDoctorQuery] = useState("");
  const patientLookup = usePatientLookup(patientQuery);
  const doctorLookup = useDoctorLookup(doctorQuery);
  const { mutate, isPending, error } = useCreateScheduledConsultation();
  const {
    control,
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      doctorServiceIds: [],
      sendEmailNotification: true,
      registerPaymentNow: false,
      ...defaultDateTime(),
    },
  });

  const doctorId = watch("doctorId");
  const date = watch("date");
  const startTime = watch("startTime");
  const durationMinutes = watch("durationMinutes");
  const selectedServiceIds = watch("doctorServiceIds");
  const registerPaymentNow = watch("registerPaymentNow");
  const { data: doctorServices = [] } = useDoctorServices(doctorId || null);

  const startsAt =
    date && startTime ? parseDateTimeToUtc(date, startTime) : null;
  const endsAt = startsAt
    ? addMinutesToUtc(startsAt, durationMinutes)
    : null;
  const startsAtIso = startsAt?.toISOString() ?? "";
  const endsAtIso = endsAt?.toISOString() ?? "";

  const { data: availability, isFetching: isLoadingAvailability } =
    useDoctorAvailability(doctorId, date, startsAtIso, endsAtIso);
  const occupiedSlots = [...new Set(availability?.occupiedSlots ?? [])];
  const isAvailabilityKnown =
    availability?.isRequestedSlotAvailable !== undefined;
  const isRequestedSlotAvailable =
    availability?.isRequestedSlotAvailable === true;
  const shouldDisableScheduling =
    Boolean(doctorId && startsAt && endsAt) &&
    (isLoadingAvailability || !isRequestedSlotAvailable);
  const selectedTime = startsAt
    ? `${formatTimeWithTimezone(startsAt)} – ${formatTimeWithTimezone(endsAt ?? startsAt)}`
    : "";

  useEffect(() => {
    setValue("doctorServiceIds", []);
  }, [doctorId, setValue]);

  const toggleService = (id: string) => {
    const next = selectedServiceIds.includes(id)
      ? selectedServiceIds.filter((serviceId) => serviceId !== id)
      : [...selectedServiceIds, id];
    setValue("doctorServiceIds", next, { shouldValidate: true });
  };

  const totalUsd = doctorServices
    .filter((service) => selectedServiceIds.includes(service.id))
    .reduce((total, service) => total + Number(service.priceUsd), 0);

  const onSubmit = (data: ScheduleFormData) => {
    if (!startsAt || !endsAt) return;
    mutate(
      {
        patientId: data.patientId,
        doctorId: data.doctorId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        doctorServiceIds: data.doctorServiceIds,
        notes: data.notes,
        sendEmailNotification: data.sendEmailNotification,
      },
      {
        onSuccess: (consultation) =>
          onSuccess(consultation, data.registerPaymentNow),
      },
    );
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Card className="p-4">
        <Controller
          control={control}
          name="patientId"
          render={({ field }) => (
            <LookupCombobox
              id="scheduled-patient"
              label="Paciente"
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
      </Card>

      <Card className="flex flex-col gap-4 p-4">
        <Controller
          control={control}
          name="doctorId"
          render={({ field }) => (
            <LookupCombobox
              id="scheduled-doctor"
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

        {doctorId ? (
          <div>
            <p className="mb-2 text-sm font-medium text-on-surface">
              Servicios
            </p>
            <div className="flex flex-wrap gap-2">
              {doctorServices.map((service) => {
                const selected = selectedServiceIds.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selected ? "border-primary bg-primary-container text-on-primary-container" : "border-outline text-on-surface-variant"}`}
                  >
                    {service.serviceName} · {service.specialtyName} —{" "}
                    {formatUsd(service.priceUsd)}
                  </button>
                );
              })}
            </div>
            {errors.doctorServiceIds ? (
              <p className="mt-2 text-xs text-error">
                {errors.doctorServiceIds.message}
              </p>
            ) : null}
            {totalUsd > 0 ? (
              <p className="mt-3 text-sm font-semibold text-on-surface">
                Total: {formatUsd(totalUsd)}
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4 p-4">
        <div className="grid w-full gap-3 md:grid-cols-3">
          <Input
            {...register("date")}
            id="scheduled-date"
            label="Fecha"
            type="date"
            error={errors.date?.message}
          />
          <Input
            {...register("startTime")}
            id="scheduled-start-time"
            label="Hora de inicio"
            type="time"
            error={
              errors.startTime?.message ||
              (isAvailabilityKnown && !isRequestedSlotAvailable
                ? "El doctor ya tiene una consulta en este horario."
                : undefined)
            }
          />
          <div className="flex flex-col gap-1">
            <label
              htmlFor="scheduled-duration"
              className="text-sm font-medium text-on-surface"
            >
              Duración
            </label>
            <select
              id="scheduled-duration"
              {...register("durationMinutes", { valueAsNumber: true })}
              className="h-10 rounded-lg border border-outline bg-surface px-3 text-sm text-on-surface"
            >
              {DURATION_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutos
                </option>
              ))}
            </select>
          </div>
        </div>
        {endsAt ? (
          <p className="text-sm text-on-surface-variant">
            Termina a las{" "}
            <span className="font-medium text-on-surface">
              {formatTimeWithTimezone(endsAt)}
            </span>
          </p>
        ) : null}
        <div className="w-full">
          {doctorId && date ? (
            <div className="rounded-md border border-outline-variant p-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-on-surface">
                  Horarios ocupados
                </p>
                {isLoadingAvailability ? (
                  <Loader2
                    aria-label="Consultando disponibilidad"
                    className="h-3 w-3 animate-spin text-on-surface-variant"
                  />
                ) : null}
              </div>
              {isAvailabilityKnown && isRequestedSlotAvailable ? (
                <p className="mt-1 text-sm font-medium text-primary">
                  {selectedTime} disponible
                </p>
              ) : null}
              {occupiedSlots.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {occupiedSlots.map((slot) => (
                    <span
                      key={`${slot.startsAt}-${slot.endsAt}`}
                      className="rounded-full bg-error-container px-2 py-1 text-xs text-on-error-container"
                    >
                      {formatTimeWithTimezone(slot.startsAt)}
                      {" – "}
                      {formatTimeWithTimezone(slot.endsAt)} ocupado
                    </span>
                  ))}
                </div>
              ) : null}
              {isAvailabilityKnown && !isRequestedSlotAvailable ? (
                <p className="mt-3 text-sm font-medium text-error">
                  Este horario está ocupado para este doctor.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <Input
          {...register("notes")}
          id="scheduled-notes"
          label="Observaciones"
        />
        <label className="flex items-center gap-2 text-sm text-on-surface">
          <input type="checkbox" {...register("sendEmailNotification")} />
          Notificar por email al doctor y al paciente
        </label>
        <label className="flex items-center gap-2 text-sm text-on-surface">
          <input type="checkbox" {...register("registerPaymentNow")} />
          Registrar pago ahora
        </label>
      </Card>

      {error ? <p className="text-sm text-error">{error.message}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={isPending}
          disabled={shouldDisableScheduling}
        >
          {registerPaymentNow
            ? "Agendar y continuar al pago"
            : "Agendar consulta"}
        </Button>
      </div>
    </form>
  );
}
