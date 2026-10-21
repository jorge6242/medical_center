'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Cake } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

import type {
  PatientResponse,
  CreatePatientDto,
  UpdatePatientDto,
} from '../services/patients.service';
import { useCreatePatient, useSendBirthdayEmail, useUpdatePatient } from '../hooks/use-patients';
import { useNotification } from '@/shared/hooks/use-notification';
import { PatientRepresentativeSection } from './patient-representative-section';
import { patientFormSchema, type DocumentType, type PatientFormData } from './patient-form.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'V', label: 'V — Venezolano' },
  { value: 'E', label: 'E — Extranjero' },
  { value: 'J', label: 'J — Jurídico' },
  { value: 'G', label: 'G — Gobierno' },
  { value: 'P', label: 'P — Pasaporte' },
  { value: 'M', label: 'M — Menor sin cédula' },
];

function toDefaultValues(patient?: PatientResponse): Partial<PatientFormData> {
  if (!patient) return { documentType: 'V' };
  return {
    name: patient.name,
    documentType: patient.documentType as DocumentType,
    documentId: patient.documentId,
    phone: patient.phone ?? '',
    email: patient.email ?? '',
    birthDate: patient.birthDate ? patient.birthDate.slice(0, 10) : '',
    gender: (patient.gender as PatientFormData['gender']) ?? undefined,
    representative: patient.representatives?.[0]
      ? {
          ...patient.representatives[0],
          documentType: patient.representatives[0].documentType as 'V' | 'E' | 'P',
          phone: patient.representatives[0].phone ?? '',
        }
      : undefined,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PatientFormProps {
  patient?: PatientResponse;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientForm({ patient, onClose }: PatientFormProps) {
  const isEditing = Boolean(patient);
  const createMutation = useCreatePatient(onClose);
  const updateMutation = useUpdatePatient(patient?.id ?? '', onClose);
  const sendBirthdayMutation = useSendBirthdayEmail();
  const notification = useNotification();

  const isPending = isEditing ? updateMutation.isPending : createMutation.isPending;
  const error = isEditing ? updateMutation.error : createMutation.error;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: toDefaultValues(patient),
  });

  const documentType = useWatch({ control, name: 'documentType' });
  const isMinor = documentType === 'M';

  const handleDocumentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as DocumentType;
    setValue('documentType', value);
    if (value === 'M') {
      setValue('representative', undefined);
    }
  };

  const onSubmit = (data: PatientFormData) => {
    if (isPending) return;
    const payload = {
      ...data,
      documentId: data.documentId,
      email: data.email || undefined,
      birthDate: data.birthDate || undefined,
      gender: data.gender || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(payload as UpdatePatientDto);
      return;
    }
    createMutation.mutate(payload as CreatePatientDto);
  };

  const handleSendBirthdayEmail = () => {
    if (!patient?.id) return;
    if (!patient.email) {
      notification.error('El paciente no tiene correo electrónico');
      return;
    }
    sendBirthdayMutation.mutate(patient.id, {
      onSuccess: (response) => notification.success(response.message),
      onError: (err) => notification.error(err.message),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        {...register('name')}
        id="name"
        label="Nombre completo"
        placeholder="Juan Pérez"
        error={errors.name?.message}
      />

      <Select
        {...register('documentType')}
        id="documentType"
        label="Tipo de documento"
        options={DOCUMENT_TYPE_OPTIONS}
        onChange={handleDocumentTypeChange}
      />

      <Input
        {...register('documentId')}
        id="documentId"
        label="Número de documento"
        placeholder="Ej. 18934576"
        error={errors.documentId?.message}
      />

      {isMinor && (
        <div className="rounded-lg border border-primary-container bg-primary-container px-4 py-3 text-sm text-on-primary-container">
          <p className="font-medium">Paciente menor de edad</p>
          <p className="mt-0.5 text-xs opacity-80">
            Ingresá el número de documento o código del menor manualmente. Para facilitar búsquedas
            futuras, completá la fecha de nacimiento.
          </p>
        </div>
      )}

      {isMinor && (
        <PatientRepresentativeSection control={control} setValue={setValue} errors={errors} />
      )}

      <Input
        {...register('phone')}
        id="phone"
        label={isMinor ? 'Teléfono (opcional)' : 'Teléfono (opcional)'}
        placeholder="04XX-XXXXXXX"
      />
      <Input
        {...register('birthDate')}
        id="birthDate"
        label={
          isMinor
            ? 'Fecha de nacimiento (recomendada para menores)'
            : 'Fecha de nacimiento (opcional)'
        }
        type="date"
      />
      <Input
        {...register('email')}
        id="email"
        label="Email (opcional)"
        type="email"
        error={errors.email?.message}
      />
      <Select
        {...register('gender', { setValueAs: (value: string) => value || undefined })}
        id="gender"
        label="Sexo (opcional)"
        options={[
          { value: '', label: 'Sin especificar' },
          { value: 'MASCULINE', label: 'Masculino' },
          { value: 'FEMININE', label: 'Femenino' },
          { value: 'OTHER', label: 'Otro' },
        ]}
      />

      {isEditing && (
        <p className="text-sm">
          Vaciar email, fecha de nacimiento o sexo no elimina el dato guardado. El representante se
          asocia por documento; los vínculos existentes se conservan.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
          {error.message}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {isEditing && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSendBirthdayEmail}
            isLoading={sendBirthdayMutation.isPending}
            disabled={isPending || !patient?.email}
            title={patient?.email ? 'Enviar correo de cumpleaños' : 'El paciente no tiene correo'}
          >
            <Cake className="mr-2 h-4 w-4" />
            Cumpleaños
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isPending}>
          {isEditing ? 'Guardar cambios' : 'Registrar paciente'}
        </Button>
      </div>
    </form>
  );
}
