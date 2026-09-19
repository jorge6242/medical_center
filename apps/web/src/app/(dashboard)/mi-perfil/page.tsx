'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useDoctorProfile, useUpdateDoctorProfile, useVerifyDoctorLicense } from '@/features/doctors-profile/hooks/use-doctor-profile';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';

const profileSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function MiPerfilPage() {
  const { data: profile, isLoading } = useDoctorProfile();
  const updateMutation = useUpdateDoctorProfile();
  const verifyMutation = useVerifyDoctorLicense();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      name: profile?.name ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data, {
      onSuccess: () => setIsEditing(false),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
      case 'NOT_FOUND':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'Verificado';
      case 'PENDING':
        return 'Pendiente';
      case 'REJECTED':
        return 'Rechazado';
      case 'NOT_FOUND':
        return 'No encontrado';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-on-surface">Mi Perfil</h1>
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-1/3 rounded bg-surface-variant" />
            <div className="h-4 w-1/2 rounded bg-surface-variant" />
            <div className="h-4 w-1/4 rounded bg-surface-variant" />
          </div>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-on-surface">Mi Perfil</h1>
        <Card className="p-6">
          <p className="text-on-surface-variant">
            No se pudo cargar tu perfil. Por favor, contacta al administrador.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Mi Perfil</h1>
        <p className="text-sm text-on-surface-variant">
          Gestiona tu información y verifica tu licencia médica.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-on-surface">Información Personal</h2>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-on-surface">Nombre completo</label>
                <Input {...form.register('name')} placeholder="Tu nombre" />
                {form.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-on-surface">Email</label>
                <Input {...form.register('email')} type="email" placeholder="tu@email.com" />
                {form.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-500">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-on-surface">Teléfono</label>
                <Input {...form.register('phone')} placeholder="0412-1234567" />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-on-surface-variant">Nombre</label>
                <p className="text-on-surface">{profile.name}</p>
              </div>
              <div>
                <label className="text-xs text-on-surface-variant">Email</label>
                <p className="text-on-surface">{profile.email ?? '—'}</p>
              </div>
              <div>
                <label className="text-xs text-on-surface-variant">Teléfono</label>
                <p className="text-on-surface">{profile.phone ?? '—'}</p>
              </div>
              <div>
                <label className="text-xs text-on-surface-variant">Cédula</label>
                <p className="text-on-surface">{profile.documentType}-{profile.documentId}</p>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-on-surface">Licencia Médica</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs text-on-surface-variant">Estado</label>
                <div className="mt-1">
                  <Badge className={getStatusColor(profile.verificationStatus)}>
                    {getStatusLabel(profile.verificationStatus)}
                  </Badge>
                </div>
              </div>
            </div>

            {profile.medicalLicenseNumber && (
              <div>
                <label className="text-xs text-on-surface-variant">Número de licencia</label>
                <p className="text-on-surface">{profile.medicalLicenseNumber}</p>
              </div>
            )}

            {profile.verifiedAt && (
              <div>
                <label className="text-xs text-on-surface-variant">Verificado el</label>
                <p className="text-on-surface">
                  {new Date(profile.verifiedAt).toLocaleDateString('es-VE')}
                </p>
              </div>
            )}

            <Button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {verifyMutation.isPending ? 'Verificando...' : 'Verificar licencia'}
            </Button>

            {verifyMutation.isSuccess && (
              <p className="text-sm text-green-600">Licencia verificada exitosamente</p>
            )}
            {verifyMutation.isError && (
              <p className="text-sm text-red-600">Error al verificar. Intenta de nuevo.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
