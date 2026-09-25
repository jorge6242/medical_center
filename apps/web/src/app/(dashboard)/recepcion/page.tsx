'use client';

import { useMemo, useState } from 'react';

import { FlaskConical, Search, Stethoscope } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { ConsultationPaymentForm } from '@/features/payments/components/consultation-payment-form';
import { LabOrderForm } from '@/features/lab-orders/components/lab-order-form';
import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/modal';
import { Input } from '@/shared/components/ui/input';
import { apiJson } from '@/config/api';
import { useSpecialties } from '@/features/specialties/hooks/use-specialties';

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
  const { data: specialties = [] } = useSpecialties();
  const filtered = useMemo(
    () =>
      specialties.filter((specialty) =>
        specialty.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [specialties, search],
  );
  const { data, isLoading } = useQuery({
    queryKey: ['specialty-doctors', specialtyId],
    queryFn: () => apiJson<SpecialtyDoctorsResponse>(`/doctors/by-specialty/${specialtyId}`),
    enabled: Boolean(specialtyId),
  });
  const doctor = data?.doctors.find((item) => item.id === doctorId);
  return (
    <div className="flex flex-col gap-4">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        label="Buscar especialidad"
        placeholder="Ej. Cardiología"
      />
      <div className="max-h-40 overflow-y-auto rounded-lg border border-outline p-2">
        {filtered.map((specialty) => (
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
        {filtered.length === 0 && (
          <p className="p-2 text-sm text-on-surface-variant">
            No hay especialidades que coincidan.
          </p>
        )}
      </div>
      {isLoading && <p className="text-sm text-on-surface-variant">Buscando doctores…</p>}
      {data && (
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

export default function RecepcionPage() {
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [showLabOrderModal, setShowLabOrderModal] = useState(false);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-16">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold text-on-surface">Recepción</h1>
        <p className="text-on-surface-variant">Selecciona una acción para comenzar</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          size="lg"
          className="h-auto flex-col gap-3 px-8 py-6"
          onClick={() => setShowConsultationModal(true)}
        >
          <Stethoscope className="h-8 w-8" />
          <div className="flex flex-col gap-1">
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
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold">Consultar especialidades</span>
            <span className="text-xs opacity-80">Ver doctores, servicios y precios</span>
          </div>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-auto flex-col gap-3 px-8 py-6"
          onClick={() => setShowLabOrderModal(true)}
        >
          <FlaskConical className="h-8 w-8" />
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold">Orden de laboratorio</span>
            <span className="text-xs opacity-80">Crear orden de laboratorio</span>
          </div>
        </Button>
      </div>

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
        open={showLabOrderModal}
        onClose={() => setShowLabOrderModal(false)}
        title="Nueva orden de laboratorio"
        className="max-w-lg"
      >
        <LabOrderForm
          onSuccess={() => setShowLabOrderModal(false)}
          onCancel={() => setShowLabOrderModal(false)}
        />
      </Modal>
    </div>
  );
}
