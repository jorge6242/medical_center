'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

import { usePlatformSession } from '@/features/platform-auth/hooks/use-platform-session';
import {
  useSetPlatformTenantActivation,
  useUpdatePlatformTenant,
} from '../hooks/use-platform-tenant-mutations';
import { usePlatformTenant } from '../hooks/use-platform-tenants';
import { PlatformTenantActivationModal } from './platform-tenant-activation-modal';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;

const schema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(120),
  email: z.string().trim().max(120).optional(),
  webSlug: z
    .string()
    .regex(DNS_LABEL, 'Subdominio: 3-63 minúsculas, números o guiones internos')
    .refine((v) => !['admin', 'www', 'api'].includes(v), 'Subdominio reservado'),
});

type FormValues = z.infer<typeof schema>;

export function PlatformTenantDetail({ id }: { readonly id: string }) {
  const session = usePlatformSession();
  const tenant = usePlatformTenant(id);
  const update = useUpdatePlatformTenant(id, session.data?.csrfToken);
  const activation = useSetPlatformTenantActivation(id, session.data?.csrfToken);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: tenant.data
      ? {
          name: tenant.data.name,
          email: tenant.data.email ?? '',
          webSlug: tenant.data.webSlug ?? '',
        }
      : undefined,
  });

  if (tenant.isPending) return <p className="text-sm text-on-surface-variant">Cargando centro…</p>;
  if (tenant.isError) {
    return (
      <p
        role="alert"
        className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container"
      >
        {tenant.error.message}
      </p>
    );
  }

  const current = tenant.data;

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/platform/tenants" className="text-sm text-primary hover:underline">
            ← Volver a centros
          </Link>
          <h1 className="mt-2 text-xl font-bold text-on-surface">{current.name}</h1>
          <p className="text-sm text-on-surface-variant">
            {current.slug} · {current.isActive ? 'Activo' : 'Inactivo'} · versión {current.version}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/platform/tenants/${current.id}/suscripcion`}>
            <Button variant="outline">Suscripción</Button>
          </Link>
          <Button
            variant={current.isActive ? 'destructive' : 'primary'}
            onClick={() => setConfirmOpen(true)}
          >
            {current.isActive ? 'Desactivar centro' : 'Reactivar centro'}
          </Button>
        </div>
      </header>

      <form
        onSubmit={handleSubmit((values) =>
          update.mutate({
            name: values.name,
            email: values.email ? values.email : null,
            webSlug: values.webSlug,
            expectedVersion: current.version,
          }),
        )}
        className="grid gap-4 rounded-xl bg-surface p-6 shadow-elevation-1 md:grid-cols-2"
      >
        <Input {...register('name')} id="name" label="Nombre" error={errors.name?.message} />
        <Input
          {...register('email')}
          id="email"
          label="Email de contacto"
          error={errors.email?.message}
        />
        <Input
          {...register('webSlug')}
          id="webSlug"
          label="Subdominio web"
          error={errors.webSlug?.message}
        />
        <p className="self-end text-xs text-on-surface-variant">
          El slug interno no se puede cambiar. Al guardar se usa la versión {current.version}; si
          otro usuario cambió el centro, recargá.
        </p>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" isLoading={update.isPending}>
            Guardar cambios
          </Button>
        </div>
      </form>

      <PlatformTenantActivationModal
        open={confirmOpen}
        tenantName={current.name}
        nextIsActive={!current.isActive}
        isPending={activation.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={(reason) =>
          activation.mutate(
            {
              isActive: !current.isActive,
              reason,
              expectedVersion: current.version,
            },
            { onSuccess: () => setConfirmOpen(false) },
          )
        }
      />
    </section>
  );
}
