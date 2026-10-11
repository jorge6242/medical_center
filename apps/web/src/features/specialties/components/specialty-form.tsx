'use client';

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { FormActions } from '@/shared/components/form/form-actions';
import { FormError } from '@/shared/components/form/form-error';
import { Input } from '@/shared/components/ui/input';

import { useCreateSpecialty, useUpdateSpecialty } from '../hooks/use-specialties';
import type { SpecialtyResponse } from '../services/specialties.service';

const schema = z.object({ name: z.string().trim().min(2, 'Nombre requerido').max(100) });
type FormData = z.infer<typeof schema>;

interface SpecialtyFormProps {
  specialty?: SpecialtyResponse;
  onClose: () => void;
}

export function SpecialtyForm({ specialty, onClose }: SpecialtyFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: specialty?.name ?? '' },
  });
  const createMutation = useCreateSpecialty(onClose);
  const updateMutation = useUpdateSpecialty(specialty?.id ?? '', onClose);
  const isEditing = Boolean(specialty);

  useEffect(() => reset({ name: specialty?.name ?? '' }), [specialty, reset]);

  const submit = (data: FormData) => {
    if (specialty) {
      updateMutation.mutate(data);
      return;
    }
    createMutation.mutate(data);
  };

  const error = createMutation.error ?? updateMutation.error;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <Input
        {...register('name')}
        label="Nombre de especialidad"
        placeholder="Medicina Ocupacional"
        error={errors.name?.message}
      />
      <FormError error={error} />
      <FormActions
        onCancel={onClose}
        isPending={isPending}
        submitLabel={isEditing ? 'Guardar cambios' : 'Crear especialidad'}
      />
    </form>
  );
}
