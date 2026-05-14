'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

import type { PatientResponse, CreatePatientDto, UpdatePatientDto } from '../services/patients.service';
import { useCreatePatient, useUpdatePatient } from '../hooks/use-patients';

const schema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  documentType: z.enum(['V', 'E', 'J', 'G']),
  documentId: z.string().min(1, 'Requerido'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  gender: z.enum(['MASCULINE', 'FEMININE', 'OTHER']).optional(),
});

type FormData = z.infer<typeof schema>;

interface PatientFormProps {
  patient?: PatientResponse;
  onClose: () => void;
}

function toDefaultValues(patient?: PatientResponse): Partial<FormData> {
  if (!patient) return { documentType: 'V' };

  return {
    name: patient.name,
    documentType: patient.documentType as FormData['documentType'],
    documentId: patient.documentId,
    phone: patient.phone ?? '',
    email: patient.email ?? '',
    birthDate: patient.birthDate ? patient.birthDate.slice(0, 10) : '',
    gender: (patient.gender as FormData['gender']) ?? undefined,
  };
}

export function PatientForm({ patient, onClose }: PatientFormProps) {
  const isEditing = Boolean(patient);
  const createMutation = useCreatePatient(onClose);
  const updateMutation = useUpdatePatient(patient?.id ?? '', onClose);
  const isPending = isEditing ? updateMutation.isPending : createMutation.isPending;
  const error = isEditing ? updateMutation.error : createMutation.error;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: toDefaultValues(patient),
  });

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        {...register('name')}
        id="name"
        label="Nombre completo"
        placeholder="Juan Pérez"
        error={errors.name?.message}
      />

      <div className="grid grid-cols-3 gap-4">
        <Select
          {...register('documentType')}
          id="documentType"
          label="Tipo"
          options={[
            { value: 'V', label: 'V' },
            { value: 'E', label: 'E' },
            { value: 'J', label: 'J' },
            { value: 'G', label: 'G' },
          ]}
        />
        <div className="col-span-2">
          <Input
            {...register('documentId')}
            id="documentId"
            label="Número"
            error={errors.documentId?.message}
          />
        </div>
      </div>

      <Input
        {...register('phone')}
        id="phone"
        label="Teléfono (opcional)"
        placeholder="04XX-XXXXXXX"
      />
      <Input
        {...register('birthDate')}
        id="birthDate"
        label="Fecha de nacimiento (opcional)"
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
        {...register('gender')}
        id="gender"
        label="Sexo (opcional)"
        options={[
          { value: '', label: 'Sin especificar' },
          { value: 'MASCULINE', label: 'Masculino' },
          { value: 'FEMININE', label: 'Femenino' },
          { value: 'OTHER', label: 'Otro' },
        ]}
      />

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
          {isEditing ? 'Guardar cambios' : 'Registrar paciente'}
        </Button>
      </div>
    </form>
  );
}
