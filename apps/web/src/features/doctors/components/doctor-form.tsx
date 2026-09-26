'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Plus, XCircle } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import {
  useCreateDoctor,
  useUpdateDoctor,
  useVerifyDocument,
} from '@/features/doctors/hooks/use-doctors-admin';
import type { DoctorAdminResponse } from '@/features/doctors/services/doctors-admin.service';
import { useSpecialties } from '@/features/specialties/hooks/use-specialties';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { useNotification } from '@/shared/hooks/use-notification';

const doctorFormSchema = z.object({
  documentType: z.enum(['V', 'E', 'J', 'G']),
  documentId: z.string().min(1, 'Requerido'),
  name: z.string().min(2, 'Nombre requerido'),
  lastName: z.string().min(2, 'Apellido requerido'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  splitPercentage: z.number().min(0).max(100),
  specialtyId: z.string().min(1, 'Selecciona una especialidad'),
  services: z
    .array(
      z.object({
        specialtyId: z.string().min(1, 'Selecciona una especialidad'),
        serviceName: z.string().min(2, 'Servicio requerido'),
        priceUsd: z.number().positive('Precio requerido'),
      }),
    )
    .min(1, 'Agrega al menos un servicio'),
  medicalLicenseNumber: z.string().optional(),
  bankName: z.string().min(2, 'Banco requerido'),
  accountType: z.enum(['SAVINGS', 'CHECKING']),
  accountNumber: z.string().optional(),
  bankDocumentId: z.string().min(1, 'Requerido'),
  bankPhone: z.string().optional(),
});

type DoctorFormData = z.infer<typeof doctorFormSchema>;

function getDoctorFormDefaults(doctor?: DoctorAdminResponse): Partial<DoctorFormData> {
  if (!doctor) {
    return {
      documentType: 'V',
      splitPercentage: 70,
      accountType: 'SAVINGS',
      services: [{ specialtyId: '', serviceName: '', priceUsd: 0 }],
    };
  }

  return {
    documentId: doctor.documentId,
    documentType: doctor.documentType as DoctorFormData['documentType'],
    name: doctor.name,
    lastName: doctor.lastName,
    email: doctor.email ?? '',
    phone: doctor.phone ?? '',
    splitPercentage: Number(doctor.splitPercentage),
    specialtyId: doctor.primarySpecialtyId,
    medicalLicenseNumber: doctor.medicalLicenseNumber ?? '',
    services: doctor.services.map((service) => ({
      specialtyId: service.specialtyId,
      serviceName: service.serviceName,
      priceUsd: Number(service.priceUsd),
    })),
    bankName: doctor.bankAccounts[0]?.bankName ?? '',
    accountType: (doctor.bankAccounts[0]?.accountType ??
      'SAVINGS') as DoctorFormData['accountType'],
    accountNumber: doctor.bankAccounts[0]?.accountNumber ?? '',
    bankDocumentId: doctor.bankAccounts[0]?.documentId ?? '',
    bankPhone: doctor.bankAccounts[0]?.phone ?? '',
  };
}

interface DoctorFormProps {
  doctor?: DoctorAdminResponse;
  onCancel: () => void;
  onSuccess?: (doctor: DoctorAdminResponse) => void;
}

export function DoctorForm({ doctor, onCancel, onSuccess }: DoctorFormProps) {
  const { data: specialties = [] } = useSpecialties();
  const isEditing = Boolean(doctor);
  const notification = useNotification();
  const { mutate: verifyDocument } = useVerifyDocument();
  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'verifying' | 'found' | 'rejected' | 'not_found' | 'error'
  >('idle');
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isDirty },
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: getDoctorFormDefaults(doctor),
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'services',
  });
  const handleSuccess = (updatedDoctor: DoctorAdminResponse) => {
    if (isEditing) {
      reset(getDoctorFormDefaults(updatedDoctor));
    }
    notification.success(
      isEditing ? 'Doctor actualizado correctamente.' : 'Doctor creado correctamente.',
    );
    onSuccess?.(updatedDoctor);
  };
  const createMutation = useCreateDoctor(handleSuccess);
  const updateMutation = useUpdateDoctor(doctor?.id ?? '', handleSuccess);
  const isPending = isEditing ? updateMutation.isPending : createMutation.isPending;
  const error = isEditing ? updateMutation.error : createMutation.error;
  const documentType = watch('documentType');
  const documentId = watch('documentId');
  const debouncedDocumentId = useDebounce(documentId, 1500);
  const specialtyOptions = specialties.map((specialty) => ({
    value: specialty.id,
    label: specialty.name,
  }));

  useEffect(() => {
    reset(getDoctorFormDefaults(doctor));
  }, [doctor, reset]);

  useEffect(() => {
    if (!doctor || specialties.length === 0) return;

    const primarySpecialtyId = doctor.primarySpecialtyId;
    if (primarySpecialtyId) {
      setValue('specialtyId', primarySpecialtyId, { shouldDirty: false });
    }

    doctor.services.forEach((service, index) => {
      setValue(`services.${index}.specialtyId`, service.specialtyId, {
        shouldDirty: false,
      });
      setValue(`services.${index}.serviceName`, service.serviceName, {
        shouldDirty: false,
      });
      setValue(`services.${index}.priceUsd`, Number(service.priceUsd), {
        shouldDirty: false,
      });
    });
  }, [doctor, setValue, specialties.length]);

  useEffect(() => {
    if (isEditing || !debouncedDocumentId || debouncedDocumentId.length < 6) {
      setVerificationStatus('idle');
      return;
    }

    setVerificationStatus('verifying');
    verifyDocument(
      { documentType, documentId: debouncedDocumentId },
      {
        onSuccess: (result) => {
          if (result.verificationStatus === 'REJECTED') {
            setVerificationStatus('rejected');
            return;
          }
          setVerificationStatus(result.found ? 'found' : 'not_found');
        },
        onError: () => setVerificationStatus('error'),
      },
    );
  }, [debouncedDocumentId, documentType, isEditing, verifyDocument]);

  const onSubmit = (data: DoctorFormData) => {
    const bankAccount = {
      bankName: data.bankName,
      accountType: data.accountType,
      accountNumber: data.accountNumber?.trim() || null,
      documentId: data.bankDocumentId,
      phone: data.bankPhone?.trim() || null,
    };

    if (isEditing) {
      updateMutation.mutate({
        documentType: data.documentType,
        documentId: data.documentId,
        name: data.name,
        lastName: data.lastName,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        splitPercentage: data.splitPercentage,
        primarySpecialtyId: data.specialtyId,
        medicalLicenseNumber: data.medicalLicenseNumber?.trim() || null,
        services: data.services,
        bankAccount,
      });
      return;
    }

    createMutation.mutate({
      documentType: data.documentType,
      documentId: data.documentId,
      name: data.name,
      lastName: data.lastName,
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      splitPercentage: data.splitPercentage,
      primarySpecialtyId: data.specialtyId,
      services: data.services,
      medicalLicenseNumber: data.medicalLicenseNumber?.trim() || undefined,
      bankAccount: {
        ...bankAccount,
        accountNumber: bankAccount.accountNumber ?? undefined,
        phone: bankAccount.phone ?? undefined,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <Select
          {...register('documentType')}
          id="documentType"
          label="Tipo doc."
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
          {!isEditing && documentId && documentId.length >= 6 && (
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              {verificationStatus === 'verifying' && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {verificationStatus === 'found' && <CheckCircle2 className="h-4 w-4 text-success" />}
              {(verificationStatus === 'rejected' ||
                verificationStatus === 'not_found' ||
                verificationStatus === 'error') && <XCircle className="h-4 w-4 text-error" />}
              {verificationStatus === 'verifying' && (
                <span className="text-on-surface-variant">Verificando…</span>
              )}
              {verificationStatus === 'found' && (
                <span className="text-success">Verificado en SACS</span>
              )}
              {verificationStatus === 'rejected' && (
                <span className="text-error">
                  La persona no está registrada como profesional en SACS
                </span>
              )}
              {verificationStatus === 'not_found' && (
                <span className="text-error">No encontrado en SACS</span>
              )}
              {verificationStatus === 'error' && (
                <span className="text-warning">SACS no disponible</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input {...register('name')} id="name" label="Nombre" error={errors.name?.message} />
        <Input
          {...register('lastName')}
          id="lastName"
          label="Apellido"
          error={errors.lastName?.message}
        />
      </div>
      <Input
        {...register('medicalLicenseNumber')}
        id="medicalLicenseNumber"
        label="Nº Licencia médica (opcional)"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          {...register('email')}
          id="email"
          label="Email (opcional)"
          type="email"
          error={errors.email?.message}
        />
        <Input {...register('phone')} id="phone" label="Teléfono (opcional)" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          {...register('splitPercentage', { valueAsNumber: true })}
          id="splitPercentage"
          label="% Doctor"
          type="number"
          step="0.01"
          error={errors.splitPercentage?.message}
        />
        <Select
          {...register('specialtyId')}
          id="specialtyId"
          label="Especialidad base"
          error={errors.specialtyId?.message}
          options={[{ value: '', label: 'Seleccionar…' }, ...specialtyOptions]}
        />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-on-surface">Servicios y precios</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ specialtyId: '', serviceName: '', priceUsd: 0 })}
          >
            <Plus className="h-3.5 w-3.5" /> Agregar
          </Button>
        </div>
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-[1fr_1fr_8rem_auto] items-end gap-2">
            <Select
              {...register(`services.${index}.specialtyId`)}
              label="Especialidad"
              options={[{ value: '', label: 'Seleccionar…' }, ...specialtyOptions]}
              error={errors.services?.[index]?.specialtyId?.message}
            />
            <Input
              {...register(`services.${index}.serviceName`)}
              label="Servicio"
              error={errors.services?.[index]?.serviceName?.message}
            />
            <Input
              {...register(`services.${index}.priceUsd`, {
                valueAsNumber: true,
              })}
              label="Precio USD"
              type="number"
              step="0.01"
              error={errors.services?.[index]?.priceUsd?.message}
            />
            {fields.length > 1 && (
              <Button type="button" variant="ghost" onClick={() => remove(index)}>
                Quitar
              </Button>
            )}
          </div>
        ))}
      </div>
      <p className="text-sm font-semibold text-on-surface">Cuenta bancaria</p>
      <div className="grid grid-cols-2 gap-4">
        <Input
          {...register('bankName')}
          id="bankName"
          label="Banco"
          error={errors.bankName?.message}
        />
        <Select
          {...register('accountType')}
          id="accountType"
          label="Tipo cuenta"
          options={[
            { value: 'SAVINGS', label: 'Ahorro' },
            { value: 'CHECKING', label: 'Corriente' },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          {...register('accountNumber')}
          id="accountNumber"
          label="Número de cuenta (opcional)"
          error={errors.accountNumber?.message}
        />
        <Input
          {...register('bankDocumentId')}
          id="bankDocumentId"
          label="Cédula titular"
          error={errors.bankDocumentId?.message}
        />
      </div>
      <Input {...register('bankPhone')} id="bankPhone" label="Teléfono asociado (opcional)" />
      {error && (
        <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
          {error.message}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isPending} disabled={isPending || (isEditing && !isDirty)}>
          {isEditing ? 'Guardar cambios' : 'Registrar doctor'}
        </Button>
      </div>
    </form>
  );
}
