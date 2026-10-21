'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FlaskConical, Search, Stethoscope } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/modal';
import { Input } from '@/shared/components/ui/input';

import { useHomeStats } from '@/features/stats/hooks/use-stats';
import { formatUsd } from '@/shared/utils/format';
import { apiJson } from '@/config/api';
import { useSpecialties } from '@/features/specialties/hooks/use-specialties';
import { ConsultationPaymentForm } from '@/features/payments/components/consultation-payment-form';
import { LaboratoryPriceCatalog } from '@/features/labs/components/laboratory-price-catalog';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateInput } from '@/shared/utils/timezone';

interface SpecialtyDoctorsResponse {
  specialty: { id: string; name: string };
  doctors: Array<{
    id: string;
    name: string;
    services: Array<{ id: string; name: string; priceUsd: string }>;
  }>;
}

function SpecialtyConsultation({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const { data: specialties = [], isError: specialtiesError } = useSpecialties();
  const filtered = useMemo(
    () =>
      specialties.filter((specialty) =>
        specialty.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [specialties, search],
  );
  const {
    data,
    isLoading,
    isError: doctorsError,
  } = useQuery({
    queryKey: ['specialty-doctors', specialtyId],
    queryFn: () => apiJson<SpecialtyDoctorsResponse>(`/doctors/by-specialty/${specialtyId}`),
    enabled: Boolean(specialtyId),
  });
  const doctor = doctorsError ? undefined : data?.doctors.find((item) => item.id === doctorId);
  return (
    <div className="flex flex-col gap-4">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        label="Buscar especialidad"
        placeholder="Ej. Cardiología"
      />
      {specialtiesError && <p role="alert">No se pudieron cargar las especialidades.</p>}
      <div className="max-h-40 overflow-y-auto rounded-lg border border-outline p-2">
        {!specialtiesError &&
          filtered.map((specialty) => (
            <button
              key={specialty.id}
              type="button"
              onClick={() => {
                setSpecialtyId(specialty.id);
                setDoctorId('');
              }}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${specialtyId === specialty.id ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-variant'}`}
            >
              {specialty.name}
            </button>
          ))}
        {!specialtiesError && filtered.length === 0 && (
          <p className="p-2 text-sm text-on-surface-variant">
            No hay especialidades que coincidan.
          </p>
        )}
      </div>
      {doctorsError && <p role="alert">No se pudieron cargar los doctores.</p>}
      {isLoading && <p className="text-sm text-on-surface-variant">Buscando doctores…</p>}
      {data && !doctorsError && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Doctores de {data.specialty.name}</p>
          {data.doctors.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setDoctorId(item.id)}
              className={`rounded-lg border p-3 text-left ${doctorId === item.id ? 'border-primary bg-primary-container' : 'border-outline hover:bg-surface-variant'}`}
            >
              <b>{item.name}</b>
              <span className="ml-2 text-sm text-on-surface-variant">
                {item.services.length} servicio(s)
              </span>
            </button>
          ))}
          {data.doctors.length === 0 && (
            <p className="text-sm text-on-surface-variant">
              No hay doctores activos para esta especialidad.
            </p>
          )}
        </div>
      )}
      {doctor && (
        <div className="rounded-lg bg-surface-variant p-3">
          <p className="mb-2 font-semibold">Servicios y precios de {doctor.name}</p>
          {doctor.services.length ? (
            <ul className="flex flex-col gap-1">
              {doctor.services.map((service) => (
                <li key={service.id} className="flex justify-between text-sm">
                  <span>{service.name}</span>
                  <b>US$ {service.priceUsd}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Este doctor no tiene servicios configurados para la especialidad.
            </p>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}

export default function InicioPage() {
  const { data, isLoading, isError } = useHomeStats();
  const canReadPatients = useAuthStore((state) => state.hasPermission('patients', 'read'));

  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [showLabPricesModal, setShowLabPricesModal] = useState(false);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Inicio</h1>
        <p className="text-sm text-on-surface-variant">Resumen operativo del día y del mes.</p>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <Button
          size="lg"
          className="h-auto flex-col gap-3 px-8 py-6"
          onClick={() => setShowConsultationModal(true)}
        >
          <Stethoscope className="h-8 w-8" />
          <div className="flex flex-col gap-1 text-center">
            <span className="text-base font-semibold">Nueva consulta</span>
            <span className="text-xs opacity-80">Registrar pago de consulta médica</span>
          </div>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-auto flex-col gap-3 px-8 py-6"
          onClick={() => setShowSpecialtyModal(true)}
        >
          <Search className="h-8 w-8" />
          <div className="flex flex-col gap-1 text-center">
            <span className="text-base font-semibold">Consultar especialidades</span>
            <span className="text-xs opacity-80">Ver doctores, servicios y precios</span>
          </div>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-auto flex-col gap-3 px-8 py-6"
          onClick={() => setShowLabPricesModal(true)}
        >
          <FlaskConical className="h-8 w-8" />
          <div className="flex flex-col gap-1 text-center">
            <span className="text-base font-semibold">Consultar laboratorios</span>
            <span className="text-xs opacity-80">Ver exámenes y precios</span>
          </div>
        </Button>
      </div>

      {isError ? (
        <p role="alert">No se pudo cargar el resumen.</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Pacientes con consulta hoy"
              href={canReadPatients ? `/consultas?date=${formatDateInput(new Date())}` : undefined}
              value={data?.patientsToday ?? 0}
              loading={isLoading}
            />
            <MetricCard label="Doctores hoy" value={data?.doctorsToday ?? 0} loading={isLoading} />
            <MetricCard
              label="Doctores con honorarios pendientes"
              value={data?.pendingPayoutDoctors ?? 0}
              loading={isLoading}
            />
            <MetricCard
              label="Honorarios pendientes"
              value={data ? formatUsd(data.pendingPayoutAmountUsd) : '$0.00'}
              loading={isLoading}
            />
          </div>

          <Card>
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-on-surface">Alertas</h2>
              {data?.alerts?.length ? (
                <div className="space-y-3">
                  {data.alerts.map((alert, index) => (
                    <div key={index} className="rounded-lg border border-outline-variant p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-on-surface">{alert.title}</p>
                          <p className="text-sm text-on-surface-variant">{alert.message}</p>
                        </div>
                        <Badge variant={alert.severity === 'warning' ? 'warning' : 'secondary'}>
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">Sin alertas por ahora.</p>
              )}
            </div>
          </Card>
        </>
      )}

      <Modal
        open={showConsultationModal}
        onClose={() => setShowConsultationModal(false)}
        title="Nueva consulta"
        className="max-w-4xl"
      >
        <ConsultationPaymentForm
          onSuccess={() => setShowConsultationModal(false)}
          onCancel={() => setShowConsultationModal(false)}
        />
      </Modal>

      <Modal
        open={showSpecialtyModal}
        onClose={() => setShowSpecialtyModal(false)}
        title="Consultar especialidades"
        className="max-w-2xl"
      >
        <SpecialtyConsultation onClose={() => setShowSpecialtyModal(false)} />
      </Modal>

      <Modal
        open={showLabPricesModal}
        onClose={() => setShowLabPricesModal(false)}
        title="Precios de laboratorio"
        className="max-w-lg"
      >
        <LaboratoryPriceCatalog onClose={() => setShowLabPricesModal(false)} />
      </Modal>
    </div>
  );
}

function MetricCard({
  label,
  value,
  loading,
  href,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly loading: boolean;
  readonly href?: string;
}) {
  const content = (
    <Card>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-on-surface">{loading ? '...' : value}</p>
    </Card>
  );
  return href ? (
    <Link
      href={href}
      className="rounded-xl focus-visible:outline-2 focus-visible:outline-primary hover:opacity-90"
    >
      {content}
    </Link>
  ) : (
    content
  );
}
