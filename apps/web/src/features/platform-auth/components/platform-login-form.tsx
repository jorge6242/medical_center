'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { usePlatformLogin } from '../hooks/use-platform-login';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Usuario requerido (mínimo 3 caracteres)')
    .max(32, 'Usuario demasiado largo'),
  password: z.string().min(1, 'Contraseña requerida').max(128),
});

type FormData = z.infer<typeof schema>;

export function PlatformLoginForm() {
  const { mutate, isPending, error } = usePlatformLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-variant">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-elevation-3">
        <p className="mb-2 text-sm font-medium text-primary">Administración de plataforma</p>
        <h1 className="mb-2 text-2xl font-bold text-on-surface">Iniciar sesión</h1>
        <p className="mb-6 text-sm text-on-surface-variant">
          Acceso global para gestionar centros médicos
        </p>

        <form onSubmit={handleSubmit((data) => mutate(data))} className="flex flex-col gap-4">
          <Input
            {...register('username')}
            id="username"
            label="Usuario"
            autoComplete="username"
            error={errors.username?.message}
          />
          <Input
            {...register('password')}
            id="password"
            label="Contraseña"
            type="password"
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
      </div>
    </div>
  );
}
