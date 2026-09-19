'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { completeOnboarding } from '@/features/onboarding/services/onboarding.service';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card } from '@/shared/components/ui/card';

const passwordSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: PasswordFormData) => {
    if (!token) return;

    try {
      await completeOnboarding(token, data.password);
      setIsSuccess(true);
      setIsError(false);
    } catch (error) {
      setIsError(true);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'El enlace ha expirado o ya fue utilizado. Contacta al administrador.',
      );
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Card className="w-full max-w-md p-8">
          <h1 className="mb-2 text-2xl font-bold text-on-surface">Enlace inválido</h1>
          <p className="text-on-surface-variant">
            No se encontró un token de activación. Solicita una nueva invitación al administrador.
          </p>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Card className="w-full max-w-md p-8">
          <h1 className="mb-2 text-2xl font-bold text-green-600">¡Cuenta activada!</h1>
          <p className="mb-4 text-on-surface-variant">
            Tu cuenta ha sido activada exitosamente. Ya puedes iniciar sesión.
          </p>
          <Button onClick={() => (window.location.href = '/login')} className="w-full">
            Ir al login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <Card className="w-full max-w-md p-8">
        <h1 className="mb-2 text-2xl font-bold text-on-surface">Activa tu cuenta</h1>
        <p className="mb-6 text-on-surface-variant">
          Configura tu contraseña para acceder al sistema.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface">Contraseña</label>
            <Input
              {...form.register('password')}
              type="password"
              placeholder="Mínimo 8 caracteres"
            />
            {form.formState.errors.password && (
              <p className="mt-1 text-sm text-red-500">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface">
              Confirmar contraseña
            </label>
            <Input
              {...form.register('confirmPassword')}
              type="password"
              placeholder="Repite tu contraseña"
            />
            {form.formState.errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {isError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{errorMessage}</div>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? 'Activando...' : 'Activar cuenta'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
