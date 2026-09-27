'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { useAppConfig } from '@/features/config/hooks/use-app-config';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

import { useUpdateTenantLogo } from '../hooks/use-update-tenant-logo';
import { useUpdateTenantSettings } from '../hooks/use-update-tenant-settings';

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const schema = z.object({
  email: z.string().email('Ingresá un correo válido').optional().or(z.literal('')),
  logo: z
    .instanceof(File, { message: 'Seleccioná un archivo de imagen' })
    .refine((file) => ACCEPTED_LOGO_TYPES.includes(file.type), {
      message: 'El logo debe ser PNG, JPEG o WebP',
    })
    .refine((file) => file.size <= MAX_LOGO_SIZE_BYTES, {
      message: 'El logo no puede superar 2 MB',
    })
    .optional(),
});

type TenantSettingsFormData = z.infer<typeof schema>;

export function TenantSettingsForm() {
  const { data: config } = useAppConfig();
  const updateLogo = useUpdateTenantLogo();
  const updateSettings = useUpdateTenantSettings();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TenantSettingsFormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: config?.tenant.email ?? '' },
  });
  const tenant = config?.tenant;

  useEffect(() => {
    reset({ email: tenant?.email ?? '' });
  }, [reset, tenant?.email]);

  const onSubmit = (data: TenantSettingsFormData) => {
    if (data.logo) updateLogo.mutate(data.logo, { onSuccess: () => reset() });
    if (data.email !== (tenant?.email ?? ''))
      updateSettings.mutate({ email: data.email || undefined });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Configuración del centro</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Administrá la información e identidad visual de tu centro médico.
        </p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-on-surface">Información general</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-on-surface-variant">Centro médico</dt>
            <dd className="mt-1 font-medium text-on-surface">{tenant?.name ?? 'Cargando...'}</dd>
          </div>
          <div>
            <Input
              label="Correo del centro"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
          </div>
          <div>
            <dt className="text-sm text-on-surface-variant">Identificador</dt>
            <dd className="mt-1 font-medium text-on-surface">{tenant?.slug ?? '—'}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-on-surface">Identidad visual</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Usá PNG, JPEG o WebP con un tamaño máximo de 2 MB.
        </p>

        {tenant?.logoUrl && (
          <div className="relative mt-5 h-24 w-56 rounded-lg border border-outline bg-surface-variant p-3">
            <Image
              src={tenant.logoUrl}
              alt={`Logo de ${tenant.name}`}
              fill
              className="object-contain p-3"
              sizes="224px"
            />
          </div>
        )}

        <div className="mt-5 max-w-md">
          <Controller
            control={control}
            name="logo"
            render={({ field: { name, onChange, ref } }) => (
              <Input
                ref={ref}
                id="logo"
                name={name}
                label="Nuevo logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                error={errors.logo?.message}
                onChange={(event) => onChange(event.target.files?.[0])}
              />
            )}
          />
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="submit" isLoading={updateLogo.isPending || updateSettings.isPending}>
            Actualizar logo
          </Button>
        </div>
      </Card>
    </form>
  );
}
