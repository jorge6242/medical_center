'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { useLogin } from '@/features/auth/hooks/use-login';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

const schema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { mutate, isPending, error } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-variant">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-elevation-3">
        <h1 className="mb-2 text-2xl font-bold text-on-surface">Centro Médico</h1>
        <p className="mb-6 text-sm text-on-surface-variant">Inicia sesión para continuar</p>

        <form onSubmit={handleSubmit((data) => mutate(data))} className="flex flex-col gap-4">
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
            <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
              {error.message}
            </p>
          )}

          <Button type="submit" isLoading={isPending} className="mt-2">
            Iniciar sesión
          </Button>
        </form>

        <div className="mt-6 border-t border-outline-variant pt-4 text-center">
          <a
            href="/catalogo"
            className="text-sm font-medium text-primary hover:text-primary-variant"
          >
            Ver catálogo de servicios y precios
          </a>
        </div>
      </div>
    </div>
  );
}
