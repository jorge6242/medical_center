'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Plus, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import {
  useCreateDoctor,
  useDeactivateDoctor,
  useUpdateDoctor,
  useDoctorsAdmin,
  useVerifyDoctor,
  useVerifyDocument,
  useSendDoctorOnboarding,
} from '@/features/doctors/hooks/use-doctors-admin';
import { useSpecialties } from '@/features/specialties/hooks/use-specialties';
import { getDoctorColumns } from '@/features/doctors/components/doctor-columns';
import { DoctorToolbar } from '@/features/doctors/components/doctor-toolbar';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { DataTable } from '@/shared/components/ui/data-table';
import { Input } from '@/shared/components/ui/input';
import { Modal } from '@/shared/components/ui/modal';
import { Select } from '@/shared/components/ui/select';
import type { DoctorAdminResponse } from '@/features/doctors/services/doctors-admin.service';

const schema = z.object({
  documentType: z.enum(['V', 'E', 'J', 'G']),
  documentId: z.string().min(1, 'Requerido'),
  name: z.string().min(2, 'Nombre requerido'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  splitPercentage: z.number().min(0).max(100),
  specialtyId: z.string().uuid('Selecciona una especialidad'),
  medicalLicenseNumber: z.string().optional(),
  bankName: z.string().min(2, 'Banco requerido'),
  accountType: z.enum(['SAVINGS', 'CHECKING']),
  accountNumber: z.string().min(4, 'Cuenta requerida'),
  bankDocumentId: z.string().min(1, 'Requerido'),
  bankPhone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function DoctorForm({ doctor, onClose }: { readonly doctor?: DoctorAdminResponse; readonly onClose: () => void }) {
  const { data: specialties = [] } = useSpecialties();
  const createMutation = useCreateDoctor(onClose);
  const updateMutation = useUpdateDoctor(doctor?.id ?? '', onClose);
  const verifyMutation = useVerifyDocument();
  const isEditing = Boolean(doctor);
  const isPending = isEditing ? updateMutation.isPending : createMutation.isPending;
  const error = isEditing ? updateMutation.error : createMutation.error;
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'found' | 'not_found' | 'error'>('idle');
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: doctor
      ? {
          documentType: doctor.documentType as FormData['documentType'],
          name: doctor.name,
          email: doctor.email ?? '',
          phone: doctor.phone ?? '',
          splitPercentage: Number(doctor.splitPercentage),
        }
      : { documentType: 'V', splitPercentage: 70, accountType: 'SAVINGS' },
  });

  const documentType = watch('documentType');
  const documentId = watch('documentId');
  const debouncedDocumentId = useDebounce(documentId, 1500);

  useEffect(() => {
    if (!debouncedDocumentId || debouncedDocumentId.length < 6) {
      setVerificationStatus('idle');
      return;
    }

    setVerificationStatus('verifying');
    verifyMutation.mutate(
      { documentType, documentId: debouncedDocumentId },
      {
        onSuccess: (result) => {
          setVerificationStatus(result.found ? 'found' : 'not_found');
        },
        onError: () => {
          setVerificationStatus('error');
        },
      },
    );
  }, [debouncedDocumentId, documentType]);

  const onSubmit = (data: FormData) => {
    const payload = {
      documentType: data.documentType,
      documentId: data.documentId,
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      splitPercentage: data.splitPercentage,
      specialtyIds: [data.specialtyId],
      medicalLicenseNumber: data.medicalLicenseNumber || undefined,
      bankAccount: {
        bankName: data.bankName,
        accountType: data.accountType,
        accountNumber: data.accountNumber,
        documentId: data.bankDocumentId,
        phone: data.bankPhone || undefined,
      },
    };

    if (isEditing) {
      updateMutation.mutate({
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        splitPercentage: data.splitPercentage,
        medicalLicenseNumber: data.medicalLicenseNumber || undefined,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const verificationIcon = () => {
    switch (verificationStatus) {
      case 'verifying':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'found':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'not_found':
        return <XCircle className="h-4 w-4 text-error" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <Select {...register('documentType')} id="documentType" label="Tipo doc." options={[{ value: 'V', label: 'V' }, { value: 'E', label: 'E' }, { value: 'J', label: 'J' }, { value: 'G', label: 'G' }]} />
        <div className="col-span-2">
          <Input {...register('documentId')} id="documentId" label="Número" error={errors.documentId?.message} />
          {!isEditing && documentId && documentId.length >= 6 && (
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              {verificationIcon()}
              {verificationStatus === 'verifying' && <span className="text-on-surface-variant">Verificando…</span>}
              {verificationStatus === 'found' && <span className="text-success">Verificado en SACS</span>}
              {verificationStatus === 'not_found' && <span className="text-error">No encontrado en SACS</span>}
              {verificationStatus === 'error' && <span className="text-warning">SACS no disponible</span>}
            </div>
          )}
        </div>
      </div>
      <Input {...register('name')} id="name" label="Nombre completo" placeholder="Dra. María López" error={errors.name?.message} />
      <Input {...register('medicalLicenseNumber')} id="medicalLicenseNumber" label="Nº Licencia médica (opcional)" placeholder="MPPS-12345" error={errors.medicalLicenseNumber?.message} />
      <div className="grid grid-cols-2 gap-4">
        <Input {...register('email')} id="email" label="Email (opcional)" type="email" error={errors.email?.message} />
        <Input {...register('phone')} id="phone" label="Teléfono (opcional)" placeholder="04XX-XXXXXXX" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input {...register('splitPercentage', { valueAsNumber: true })} id="splitPercentage" label="% Doctor" type="number" step="0.01" error={errors.splitPercentage?.message} />
        <Select
          {...register('specialtyId')}
          id="specialtyId"
          label="Especialidad"
          error={errors.specialtyId?.message}
          options={[{ value: '', label: 'Seleccionar…' }, ...specialties.map((s) => ({ value: s.id, label: s.name }))]}
        />
      </div>

      <p className="text-sm font-semibold text-on-surface">Cuenta bancaria</p>
      <div className="grid grid-cols-2 gap-4">
        <Input {...register('bankName')} id="bankName" label="Banco" placeholder="Banesco" error={errors.bankName?.message} />
        <Select {...register('accountType')} id="accountType" label="Tipo cuenta" options={[{ value: 'SAVINGS', label: 'Ahorro' }, { value: 'CHECKING', label: 'Corriente' }]} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input {...register('accountNumber')} id="accountNumber" label="Número de cuenta" error={errors.accountNumber?.message} />
        <Input {...register('bankDocumentId')} id="bankDocumentId" label="Cédula titular" error={errors.bankDocumentId?.message} />
      </div>
      <Input {...register('bankPhone')} id="bankPhone" label="Teléfono cuenta (opcional)" placeholder="04XX-XXXXXXX" />

      {error && <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error.message}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" isLoading={isPending}>{isEditing ? 'Guardar cambios' : 'Registrar doctor'}</Button>
      </div>
    </form>
  );
}

export default function DoctoresPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorAdminResponse | null>(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sendingDoctorId, setSendingDoctorId] = useState<string | null>(null);

  const { data, isLoading } = useDoctorsAdmin({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
  });
  const { mutate: deactivate } = useDeactivateDoctor();
  const { mutate: verify, isPending: isVerifying } = useVerifyDoctor();
  const { mutate: sendOnboarding, isPending: isSendingOnboarding } = useSendDoctorOnboarding();

  const doctors = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Doctores</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" /> Nuevo doctor
        </Button>
      </div>

      <Card className="p-4">
        <DataTable
          data={doctors}
          columns={getDoctorColumns()}
          toolbar={<DoctorToolbar search={search} onSearchChange={setSearch} />}
          isLoading={isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={meta?.totalPages ?? 0}
          rowCount={meta?.total ?? 0}
          meta={{
            onEdit: (doctor: DoctorAdminResponse) => {
              setSelectedDoctor(doctor);
              setShowEditModal(true);
            },
            onVerify: (id: string) => verify(id),
            onDeactivate: (id: string) => deactivate(id),
            onSendOnboarding: (id: string) => {
              setSendingDoctorId(id);
              sendOnboarding(id, {
                onSettled: () => setSendingDoctorId(null),
              });
            },
            isVerifying,
            isSendingOnboarding: sendingDoctorId,
          }}
        />
      </Card>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo doctor" className="max-w-lg">
        <DoctorForm onClose={() => setShowCreateModal(false)} />
      </Modal>

      <Modal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedDoctor(null);
        }}
        title="Editar doctor"
        className="max-w-lg"
      >
        <DoctorForm
          doctor={selectedDoctor ?? undefined}
          onClose={() => {
            setShowEditModal(false);
            setSelectedDoctor(null);
          }}
        />
      </Modal>
    </div>
  );
}
