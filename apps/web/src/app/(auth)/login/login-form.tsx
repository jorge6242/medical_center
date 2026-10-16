'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { useQuery } from '@tanstack/react-query';

import { useLogin } from '@/features/auth/hooks/use-login';
import { resolveAccessContext, resolveByWebSlug } from '@/features/auth/services/auth.service';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { resolveLogoUrl } from '@/shared/utils/logo-url';

const schema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  webSlug: string | null;
}

export function LoginForm({ webSlug }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const accessToken = searchParams.get('access');

  const isWebSlugFlow = !accessToken && Boolean(webSlug);

  const contextQuery = useQuery({
    queryKey: accessToken ? ['tenant-access-context', accessToken] : ['tenant-by-webslug', webSlug],
    queryFn: () =>
      accessToken ? resolveAccessContext(accessToken) : resolveByWebSlug(webSlug as string),
    enabled: Boolean(accessToken || webSlug),
    retry: false,
  });

  const { mutate, isPending, error } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const tenantName = contextQuery.data?.tenant.name ?? 'Centro Médico';
  const logoUrl = contextQuery.data?.tenant.logoUrl
    ? resolveLogoUrl(contextQuery.data.tenant.logoUrl)
    : null;
  const contextToken = contextQuery.data?.contextToken;
  const canLogin = Boolean(contextToken) && !contextQuery.isPending && !contextQuery.isError;

  if (isWebSlugFlow && contextQuery.isError) {
    router.replace('/tenant-not-found');
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-variant">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-elevation-3">
        {logoUrl ? (
          <div className="mb-6 relative flex h-28 w-full justify-center">
            <Image
              src={logoUrl}
              alt={`Logo de ${tenantName}`}
              fill
              className="object-contain object-center"
              sizes="448px"
            />
          </div>
        ) : null}
        <p className="mb-2 text-sm font-medium text-primary">{tenantName}</p>
        <h1 className="mb-2 text-2xl font-bold text-on-surface">Iniciar sesión</h1>
        <p className="mb-6 text-sm text-on-surface-variant">Accede al panel administrativo</p>

        {contextQuery.isLoading && (
          <p className="text-sm text-on-surface-variant">Validando acceso…</p>
        )}
        {!accessToken && !webSlug && (
          <p
            role="alert"
            className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container"
          >
            Necesitás un link de acceso de tu centro médico para iniciar sesión.
          </p>
        )}
        {!isWebSlugFlow && contextQuery.isError && (
          <p
            role="alert"
            className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container"
          >
            El link de acceso es inválido o expiró. Solicitá un nuevo link a tu centro médico.
          </p>
        )}
        {canLogin && (
          <form
            onSubmit={handleSubmit((data) =>
              mutate({ ...data, contextToken: contextToken as string }),
            )}
            className="flex flex-col gap-4"
          >
            <Input
              {...register('email')}
              id="email"
              label="Email"
              type="email"
              placeholder="usuario@centromedico.com"
              autoComplete="email"
              error={errors.email?.message}
            />
            <Input
              {...register('password')}
              id="password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
            />

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container"
              >
                {error.message}
              </p>
            )}

            <Button type="submit" isLoading={isPending} className="mt-2">
              Iniciar sesión
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
