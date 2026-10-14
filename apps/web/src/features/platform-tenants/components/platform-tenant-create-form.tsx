'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { usePlatformSession } from '@/features/platform-auth/hooks/use-platform-session';
import { UncertainMutationNotice } from '@/features/platform-shared/uncertain-mutation-notice';
import { useCreatePlatformTenant } from '../hooks/use-platform-tenant-mutations';
import { usePlatformPlans } from '../hooks/use-platform-tenants';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

import type { TenantCreateDto } from '../services/platform-tenants.service';

const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;
const RESERVED = ['admin', 'www', 'api'];
const PRICE = /^\d+(\.\d{1,2})?$/;

const schema = z
  .object({
    name: z.string().trim().min(1, 'Nombre requerido').max(120),
    slug: z.string().regex(DNS_LABEL, 'Slug: 3-63 minúsculas, números o guiones internos'),
    webSlug: z
      .string()
      .regex(DNS_LABEL, 'Subdominio: 3-63 minúsculas, números o guiones internos')
      .refine((v) => !RESERVED.includes(v), 'Subdominio reservado'),
    email: z.string().trim().max(120).optional(),
    adminName: z.string().trim().min(1, 'Nombre del administrador requerido').max(120),
    adminEmail: z.email('Email del administrador inválido'),
    adminPassword: z.string().min(8, 'Mínimo 8 caracteres').max(128),
    planCode: z.string().min(1, 'Seleccioná un plan'),
    agreedPriceUsd: z
      .string()
      .regex(PRICE, 'Precio: positivo, hasta 2 decimales')
      .refine((v) => Number(v) > 0, 'Precio positivo requerido'),
    startsAt: z.string().min(1, 'Inicio requerido'),
    dueAt: z.string().min(1, 'Vencimiento requerido'),
    gracePeriodDays: z.number().int().min(0, 'Entre 0 y 30').max(30, 'Entre 0 y 30'),
  })
  .refine((v) => new Date(v.dueAt) >= new Date(v.startsAt), {
    message: 'El vencimiento no puede ser anterior al inicio',
    path: ['dueAt'],
  });

type FormValues = z.infer<typeof schema>;

function toDto(v: FormValues): TenantCreateDto {
  return {
    name: v.name,
    slug: v.slug,
    webSlug: v.webSlug,
    ...(v.email ? { email: v.email } : {}),
    initialAdmin: {
      name: v.adminName,
      email: v.adminEmail,
      password: v.adminPassword,
    },
    initialSubscription: {
      planCode: v.planCode,
      agreedPriceUsd: v.agreedPriceUsd,
      startsAt: new Date(v.startsAt).toISOString(),
      dueAt: new Date(v.dueAt).toISOString(),
      gracePeriodDays: v.gracePeriodDays,
    },
  };
}

export function PlatformTenantCreateForm() {
  const router = useRouter();
  const session = usePlatformSession();
  const plans = usePlatformPlans();
  const create = useCreatePlatformTenant(session.data?.csrfToken, session.data?.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gracePeriodDays: 3, agreedPriceUsd: '' },
  });

  const onSubmit = (values: FormValues) =>
    create.mutate(toDto(values), {
      onSuccess: (result) => router.replace(`/platform/tenants/${result.tenant.id}`),
    });

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <header>
        <Link href="/platform/tenants" className="text-sm text-primary hover:underline">
          ← Volver a centros
        </Link>
        <h1 className="mt-2 text-xl font-bold text-on-surface">Nuevo centro</h1>
      </header>

      {create.uncertain && (
        <UncertainMutationNotice
          pending={create.isPending}
          retry={() =>
            create.retryOriginal((result) =>
              router.replace(`/platform/tenants/${result.tenant.id}`),
            )
          }
        />
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6 rounded-xl bg-surface p-6 shadow-elevation-1"
      >
        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold text-on-surface">Centro</legend>
          <Input {...register('name')} id="name" label="Nombre" error={errors.name?.message} />
          <Input
            {...register('email')}
            id="email"
            label="Email de contacto (opcional)"
            error={errors.email?.message}
          />
          <Input
            {...register('slug')}
            id="slug"
            label="Slug interno"
            error={errors.slug?.message}
          />
          <Input
            {...register('webSlug')}
            id="webSlug"
            label="Subdominio web"
            error={errors.webSlug?.message}
          />
        </fieldset>

        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold text-on-surface">
            Administrador inicial
          </legend>
          <Input
            {...register('adminName')}
            id="adminName"
            label="Nombre"
            error={errors.adminName?.message}
          />
          <Input
            {...register('adminEmail')}
            id="adminEmail"
            label="Email"
            type="email"
            error={errors.adminEmail?.message}
          />
          <Input
            {...register('adminPassword')}
            id="adminPassword"
            label="Contraseña inicial"
            type="password"
            autoComplete="new-password"
            error={errors.adminPassword?.message}
          />
        </fieldset>

        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold text-on-surface">Suscripción SaaS</legend>
          <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">
            Plan
            <select
              className="h-10 rounded-lg border border-outline bg-surface px-3 text-sm"
              {...register('planCode')}
            >
              <option value="">Seleccioná…</option>
              {plans.data?.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.name} ({plan.code})
                </option>
              ))}
            </select>
            {errors.planCode && (
              <span className="text-xs text-error">{errors.planCode.message}</span>
            )}
          </label>
          <Input
            {...register('agreedPriceUsd')}
            id="agreedPriceUsd"
            label="Precio acordado (USD)"
            inputMode="decimal"
            error={errors.agreedPriceUsd?.message}
          />
          <Input
            {...register('startsAt')}
            id="startsAt"
            label="Inicio del contrato"
            type="datetime-local"
            error={errors.startsAt?.message}
          />
          <Input
            {...register('dueAt')}
            id="dueAt"
            label="Vencimiento de la primera factura"
            type="datetime-local"
            error={errors.dueAt?.message}
          />
          <Input
            {...register('gracePeriodDays', { valueAsNumber: true })}
            id="gracePeriodDays"
            label="Días de gracia (0-30)"
            type="number"
            min={0}
            max={30}
            error={errors.gracePeriodDays?.message}
          />
        </fieldset>

        <div className="flex justify-end gap-3">
          <Link href="/platform/tenants">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" isLoading={create.isPending} disabled={create.uncertain}>
            Crear centro
          </Button>
        </div>
      </form>
    </section>
  );
}
