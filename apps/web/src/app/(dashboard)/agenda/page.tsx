"use client";

import { useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  CalendarPlus,
  CheckCircle2,
  CreditCard,
  Pencil,
  Send,
  XCircle,
} from "lucide-react";

import { ScheduleConsultationForm } from "@/features/consultations/components/schedule-consultation-form";
import {
  useConsultations,
  useDoctorAvailability,
  useMarkConsultationAsAttended,
  useResendScheduledNotifications,
  useUpdateScheduledConsultation,
  useVoidConsultation,
} from "@/features/consultations/hooks/use-consultations";
import type {
  ConsultationResponse,
  ConsultationStatus,
} from "@/features/consultations/services/consultations.service";
import { ConsultationPaymentForm } from "@/features/payments/components/consultation-payment-form";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import { Input } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import {
  formatDate,
  formatDateShort,
  formatTime,
  formatUsd,
} from "@/shared/utils/format";
import {
  addMinutesToUtc,
  formatDateInput,
  formatTimeInput,
  parseDateTimeToUtc,
} from "@/shared/utils/timezone";

const labels: Record<ConsultationStatus, string> = {
  SCHEDULED: "Agendada",
  PENDING: "Pendiente de cobro",
  PAID: "Pagada",
  VOIDED: "Anulada",
};
export default function AgendaPage() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [status, setStatus] = useState<ConsultationStatus | "">("");
  const [date, setDate] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedulePayment, setSchedulePayment] =
    useState<ConsultationResponse | null>(null);
  const [editing, setEditing] = useState<ConsultationResponse | null>(null);
  const [paying, setPaying] = useState<ConsultationResponse | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editDurationMinutes, setEditDurationMinutes] = useState(30);
  const [editNotes, setEditNotes] = useState("");
  const { data, isLoading, error } = useConsultations({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    ...(status ? { status } : {}),
    ...(date ? { date } : {}),
  });
  const attend = useMarkConsultationAsAttended();
  const resendNotifications = useResendScheduledNotifications();
  const update = useUpdateScheduledConsultation(() => setEditing(null));
  const voidConsultation = useVoidConsultation();

  const editStartsAt =
    editDate && editStartTime ? parseDateTimeToUtc(editDate, editStartTime) : null;
  const editEndsAt = editStartsAt
    ? addMinutesToUtc(editStartsAt, editDurationMinutes)
    : null;
  const editStartsAtIso = editStartsAt?.toISOString() ?? "";
  const editEndsAtIso = editEndsAt?.toISOString() ?? "";
  const editAvailability = useDoctorAvailability(
    editing?.doctorId ?? "",
    editDate,
    editStartsAtIso,
    editEndsAtIso,
    editing?.id,
  );
  const isEditIntervalAvailable =
    editAvailability.data?.isRequestedSlotAvailable === true;

  const openEdit = (consultation: ConsultationResponse) => {
    setEditing(consultation);
    const start = consultation.startsAt ?? consultation.date;
    setEditDate(formatDateInput(start));
    setEditStartTime(formatTimeInput(start));
    const duration = consultation.endsAt
      ? Math.round(
          (new Date(consultation.endsAt).getTime() - new Date(start).getTime()) /
            60_000,
        )
      : 30;
    setEditDurationMinutes(duration);
    setEditNotes(consultation.notes ?? "");
  };
  const cancel = (consultation: ConsultationResponse) => {
    const reason = window.prompt(
      `Motivo para cancelar la consulta de ${consultation.patientName}:`,
    );
    if (reason)
      voidConsultation.mutate(
        { id: consultation.id, reason },
        { onSuccess: () => setEditing(null) },
      );
  };
  const columns: ColumnDef<ConsultationResponse>[] = [
    {
      header: "Día",
      cell: ({ row }) => (
        <p className="text-sm text-on-surface">
          {formatDateShort(row.original.startsAt ?? row.original.date)}
        </p>
      ),
    },
    {
      header: "Hora",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-on-surface">
            {formatTime(row.original.startsAt ?? row.original.date)} –{" "}
            {row.original.endsAt
              ? formatTime(row.original.endsAt)
              : "sin fin"}
          </p>
          {row.original.endsAt ? null : (
            <p className="text-xs text-error">Actualizá el API</p>
          )}
        </div>
      ),
    },
    {
      header: "Paciente",
      cell: ({ row }) => (
        <div>
          <p>{row.original.patientName}</p>
          <p className="text-xs text-on-surface-variant">
            {row.original.patientDocument}
          </p>
        </div>
      ),
    },
    {
      header: "Doctor y servicios",
      cell: ({ row }) => (
        <div>
          <p>{row.original.doctorName}</p>
          <p className="text-xs text-on-surface-variant">
            {row.original.services
              .map((service) => service.serviceName)
              .join(", ")}
          </p>
        </div>
      ),
    },
    { header: "Total", cell: ({ row }) => formatUsd(row.original.totalUsd) },
    {
      header: "Estado",
      cell: ({ row }) => (
        <span className="rounded-full bg-surface-variant px-2 py-1 text-xs font-medium">
          {labels[row.original.status]}
        </span>
      ),
    },
    {
      header: "Acciones",
      cell: ({ row }) =>
        row.original.status === "VOIDED" ? (
          <span className="text-xs text-on-surface-variant">Sin acciones</span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Agenda</h1>
          <p className="text-sm text-on-surface-variant">
            Consultas programadas, ordenadas por creación (más reciente primero).
          </p>
        </div>
        <Button onClick={() => setScheduleOpen(true)}>
          <CalendarPlus className="h-4 w-4" /> Agendar consulta
        </Button>
      </div>
      {error ? <p className="text-sm text-error">{error.message}</p> : null}
      <Card className="p-4">
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          isLoading={isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={data?.meta.totalPages ?? 0}
          rowCount={data?.meta.total ?? 0}
          toolbar={
            <>
              <Input
                id="agenda-date"
                label="Fecha"
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setPagination((value) => ({ ...value, pageIndex: 0 }));
                }}
              />
              <select
                aria-label="Estado"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as ConsultationStatus | "");
                  setPagination((value) => ({ ...value, pageIndex: 0 }));
                }}
                className="h-10 rounded-lg border border-outline bg-surface px-3 text-sm"
              >
                <option value="">Todos los estados</option>
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </>
          }
        />
      </Card>
      <Modal
        open={scheduleOpen}
        onClose={() => {
          setScheduleOpen(false);
          setSchedulePayment(null);
        }}
        title={schedulePayment ? "Registrar pago" : "Agendar consulta"}
        className="max-w-3xl"
      >
        {schedulePayment ? (
          <ConsultationPaymentForm
            consultation={schedulePayment}
            onSuccess={() => {
              setScheduleOpen(false);
              setSchedulePayment(null);
            }}
            onCancel={() => {
              setScheduleOpen(false);
              setSchedulePayment(null);
            }}
          />
        ) : (
          <ScheduleConsultationForm
            onSuccess={(consultation, registerPaymentNow) => {
              if (registerPaymentNow) {
                setSchedulePayment(consultation);
                return;
              }
              setScheduleOpen(false);
            }}
            onCancel={() => setScheduleOpen(false)}
          />
        )}
      </Modal>
      <Modal
        open={!!paying}
        onClose={() => setPaying(null)}
        title="Cobrar consulta"
        className="max-w-3xl"
      >
        {paying ? (
          <ConsultationPaymentForm
            consultation={paying}
            onSuccess={() => setPaying(null)}
            onCancel={() => setPaying(null)}
          />
        ) : null}
      </Modal>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Editar consulta"
      >
        {editing ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (editing.status === "SCHEDULED" && editStartsAt && editEndsAt)
                update.mutate({
                  id: editing.id,
                  startsAt: editStartsAt.toISOString(),
                  endsAt: editEndsAt.toISOString(),
                  notes: editNotes || undefined,
                });
            }}
          >
            {editing.status === "SCHEDULED" ? (
              <>
                {!editing.endsAt ? (
                  <p className="text-sm text-error">
                    El API aún no devuelve la hora de fin. Actualizalo antes de editar esta cita.
                  </p>
                ) : null}
                <div className="grid w-full gap-3 md:grid-cols-3">
                  <Input
                    id="edit-date"
                    label="Fecha"
                    type="date"
                    value={editDate}
                    onChange={(event) => setEditDate(event.target.value)}
                  />
                  <Input
                    id="edit-start-time"
                    label="Hora de inicio"
                    type="time"
                    value={editStartTime}
                    onChange={(event) => setEditStartTime(event.target.value)}
                  />
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="edit-duration"
                      className="text-sm font-medium text-on-surface"
                    >
                      Duración
                    </label>
                    <select
                      id="edit-duration"
                      value={editDurationMinutes}
                      onChange={(event) =>
                        setEditDurationMinutes(Number(event.target.value))
                      }
                      className="h-10 rounded-lg border border-outline bg-surface px-3 text-sm text-on-surface"
                    >
                      {[15, 30, 45, 60, 90, 120].map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {minutes} minutos
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {editEndsAt ? (
                  <p className="text-sm text-on-surface-variant">
                    Termina a las{" "}
                    <span className="font-medium text-on-surface">
                      {formatTime(editEndsAt)}
                    </span>
                  </p>
                ) : null}
                {editAvailability.data?.isRequestedSlotAvailable === false ? (
                  <p className="text-sm font-medium text-error">
                    El doctor ya tiene otra consulta dentro de este intervalo.
                  </p>
                ) : null}
                <Input
                  id="edit-notes"
                  label="Observaciones"
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                />
              </>
            ) : null}
            {editing.attendedAt ? (
              <p className="rounded-lg bg-primary-container p-3 text-sm text-on-primary-container">
                Llegada registrada: {formatDate(editing.attendedAt)}.
              </p>
            ) : (
              <p className="rounded-lg bg-surface-variant p-3 text-sm text-on-surface-variant">
                La llegada del paciente todavía no fue confirmada.
              </p>
            )}
            {editing.status === "PAID" ? (
              <p className="rounded-lg bg-surface-variant p-3 text-sm">
                Pago registrado. La llegada se mantiene como un registro
                independiente.
              </p>
            ) : null}
            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {editing.status !== "PAID" ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => cancel(editing)}
                    isLoading={voidConsultation.isPending}
                  >
                    <XCircle className="h-4 w-4" /> Anular agenda
                  </Button>
                ) : null}
                {editing.status === "SCHEDULED" ||
                editing.status === "PENDING" ? (
                  <Button
                    type="button"
                    onClick={() => {
                      setPaying(editing);
                      setEditing(null);
                    }}
                  >
                    <CreditCard className="h-4 w-4" /> Registrar pago
                  </Button>
                ) : null}
                {editing.status === "SCHEDULED" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => resendNotifications.mutate(editing.id)}
                    isLoading={resendNotifications.isPending}
                  >
                    <Send className="h-4 w-4" /> Reenviar correos
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Cerrar
                </Button>
                {!editing.attendedAt &&
                (editing.status === "SCHEDULED" ||
                  editing.status === "PAID") ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      attend.mutate(editing.id, {
                        onSuccess: (consultation) => setEditing(consultation),
                      })
                    }
                    isLoading={attend.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Confirmar llegada
                  </Button>
                ) : null}
                {editing.status === "SCHEDULED" ? (
                  <Button
                    type="submit"
                    isLoading={update.isPending}
                    disabled={
                      !editStartsAt ||
                      !editEndsAt ||
                      editAvailability.isFetching ||
                      !isEditIntervalAvailable
                    }
                  >
                    Guardar
                  </Button>
                ) : null}
              </div>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
