'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ApiError } from '@/config/api';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';

import { usePatient } from '../hooks/use-patients';
import type { PatientResponse } from '../services/patients.service';
import { PatientForm } from './patient-form';
import { PatientConsultations } from './patient-consultations';

function birthDateLabel(value: string | null): string {
  if (!value) return 'No registrado';
  const date = value.slice(0, 10).split('-');
  return `${date[2]}/${date[1]}/${date[0]}`;
}

function PatientPersonalData({ patient }: { patient: PatientResponse }) {
  const fields = [
    ['Teléfono', patient.phone],
    ['Correo electrónico', patient.email],
    ['Fecha de nacimiento', birthDateLabel(patient.birthDate)],
    [
      'Sexo',
      patient.gender === 'FEMININE'
        ? 'Femenino'
        : patient.gender === 'MASCULINE'
          ? 'Masculino'
          : patient.gender === 'OTHER'
            ? 'Otro'
            : patient.gender,
    ],
  ];
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Datos del paciente</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-on-surface-variant">{label}</dt>
            <dd>{value || 'No registrado'}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mb-2 mt-6 font-semibold">Representantes</h3>
      {!patient.representatives?.length && <p>Sin representantes registrados</p>}
      <ul className="space-y-3">
        {patient.representatives?.map((representative, index) => (
          <li key={`${representative.documentType}-${representative.documentId}-${index}`}>
            <p className="font-medium">{representative.name}</p>
            <p>
              {representative.relationship} · {representative.documentType}-
              {representative.documentId}
            </p>
            <p>{representative.phone || 'Teléfono no registrado'}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PatientReadProfile({ patientId }: { patientId: string }) {
  const query = usePatient(patientId);
  const canEdit = useAuthStore((state) => state.hasPermission('patients', 'update'));
  const [draftPatient, setDraftPatient] = useState<PatientResponse | null>(null);
  if (draftPatient && canEdit) {
    return (
      <section aria-label="Editar paciente">
        <h1 className="text-2xl font-bold">Editar paciente</h1>
        <PatientForm patient={draftPatient} onClose={() => setDraftPatient(null)} />
      </section>
    );
  }
  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : undefined;
    const message =
      status === 404
        ? 'Paciente no encontrado'
        : status === 403
          ? 'No tenés permiso para ver este paciente'
          : 'No se pudo cargar el paciente';
    return (
      <div>
        <p role="alert">{message}</p>
        <Button onClick={() => void query.refetch()}>Reintentar</Button>
      </div>
    );
  }
  if (query.isPending) return <p role="status">Cargando paciente…</p>;
  const patient = query.data;
  if (patient.id !== patientId) return <p role="alert">Paciente no encontrado</p>;
  return (
    <>
      <div className="flex justify-between">
        <div className="flex flex-col">
          <Link href="/pacientes" className="text-primary hover:underline">
            Pacientes
          </Link>
          <header>
            <h1 className="text-2xl font-bold">{patient.name}</h1>
            <p>
              {patient.documentType}-{patient.documentId}
            </p>
            {patient.documentType === 'M' && <p>Menor de edad</p>}
            <Badge variant={patient.isActive ? 'success' : 'secondary'}>
              {patient.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          </header>
        </div>

        {canEdit && <Button onClick={() => setDraftPatient(patient)}>Editar datos</Button>}
      </div>
      <PatientPersonalData patient={patient} />
      <PatientConsultations patientId={patientId} />
    </>
  );
}

export function PatientProfile({ patientId }: { patientId: string }) {
  const canRead = useAuthStore((state) => state.hasPermission('patients', 'read'));
  return (
    <div className="flex flex-col gap-6">
      {canRead ? (
        <PatientReadProfile key={patientId} patientId={patientId} />
      ) : (
        <p role="alert">No tenés permiso para ver este paciente</p>
      )}
    </div>
  );
}
