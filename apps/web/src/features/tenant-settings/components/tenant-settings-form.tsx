'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { useAppConfig } from '@/features/config/hooks/use-app-config';
import type { ReminderType } from '@/features/config/services/config.service';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';

import { useUpdateTenantLogo } from '../hooks/use-update-tenant-logo';
import { useUpdateTenantSettings } from '../hooks/use-update-tenant-settings';
import { TenantSubscriptionCard } from './tenant-subscription-card';

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const reminderSchema = z.object({
  isActive: z.boolean(),
  sendToPatient: z.boolean(),
  sendToDoctor: z.boolean(),
  sendToAdmin: z.boolean(),
});

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
  appointmentReminder: reminderSchema,
  birthdayReminder: reminderSchema,
});

type TenantSettingsFormData = z.infer<typeof schema>;

const DEFAULT_REMINDER = {
  isActive: true,
  sendToPatient: true,
  sendToDoctor: false,
  sendToAdmin: false,
};

function findReminderConfig(
  type: ReminderType,
  configs:
    | {
        type: ReminderType;
        isActive: boolean;
        sendToPatient: boolean;
        sendToDoctor: boolean;
        sendToAdmin: boolean;
      }[]
    | undefined,
) {
  return configs?.find((config) => config.type === type) ?? DEFAULT_REMINDER;
}

function hasReminderChanged(
  type: ReminderType,
  formValue: {
    isActive: boolean;
    sendToPatient: boolean;
    sendToDoctor: boolean;
    sendToAdmin: boolean;
  },
  configs:
    | {
        type: ReminderType;
        isActive: boolean;
        sendToPatient: boolean;
        sendToDoctor: boolean;
        sendToAdmin: boolean;
      }[]
    | undefined,
) {
  const current = findReminderConfig(type, configs);
  return (
    current.isActive !== formValue.isActive ||
    current.sendToPatient !== formValue.sendToPatient ||
    current.sendToDoctor !== formValue.sendToDoctor ||
    current.sendToAdmin !== formValue.sendToAdmin
  );
}

export function TenantSettingsForm() {
  const { data: config } = useAppConfig();
  const updateLogo = useUpdateTenantLogo();
  const updateSettings = useUpdateTenantSettings();
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TenantSettingsFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: config?.tenant.email ?? '',
      appointmentReminder: findReminderConfig('APPOINTMENT', config?.reminderConfigs),
      birthdayReminder: findReminderConfig('BIRTHDAY', config?.reminderConfigs),
    },
  });
  const tenant = config?.tenant;
  const appointmentReminder = watch('appointmentReminder');
  const birthdayReminder = watch('birthdayReminder');

  useEffect(() => {
    reset({
      email: tenant?.email ?? '',
      appointmentReminder: findReminderConfig('APPOINTMENT', config?.reminderConfigs),
      birthdayReminder: findReminderConfig('BIRTHDAY', config?.reminderConfigs),
    });
  }, [reset, tenant?.email, config?.reminderConfigs]);

  const onSubmit = (data: TenantSettingsFormData) => {
    if (data.logo) updateLogo.mutate(data.logo, { onSuccess: () => reset() });

    const emailChanged = data.email !== (tenant?.email ?? '');
    const appointmentChanged = hasReminderChanged(
      'APPOINTMENT',
      data.appointmentReminder,
      config?.reminderConfigs,
    );
    const birthdayChanged = hasReminderChanged(
      'BIRTHDAY',
      data.birthdayReminder,
      config?.reminderConfigs,
    );

    if (emailChanged || appointmentChanged || birthdayChanged) {
      updateSettings.mutate({
        email: emailChanged ? data.email || undefined : undefined,
        reminderConfigs:
          appointmentChanged || birthdayChanged
            ? [
                {
                  type: 'APPOINTMENT',
                  isActive: data.appointmentReminder.isActive,
                  sendToPatient: data.appointmentReminder.sendToPatient,
                  sendToDoctor: data.appointmentReminder.sendToDoctor,
                  sendToAdmin: false,
                },
                {
                  type: 'BIRTHDAY',
                  isActive: data.birthdayReminder.isActive,
                  sendToPatient: data.birthdayReminder.sendToPatient,
                  sendToDoctor: false,
                  sendToAdmin: data.birthdayReminder.sendToAdmin,
                },
              ]
            : undefined,
      });
    }
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

      <TenantSubscriptionCard />

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
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-on-surface">Recordatorios automáticos</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Configura qué recordatorios se envían por correo a pacientes, doctores y administradores.
        </p>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="font-medium text-on-surface">Citas agendadas</h3>
            <p className="text-sm text-on-surface-variant">
              Recordatorio un día antes de la consulta.
            </p>
            <div className="mt-3 space-y-3">
              <Controller
                control={control}
                name="appointmentReminder.isActive"
                render={({ field: { value, onChange, ref } }) => (
                  <Switch
                    ref={ref}
                    label="Activar recordatorios de citas"
                    checked={value}
                    onChange={(event) => onChange(event.target.checked)}
                  />
                )}
              />
              {appointmentReminder?.isActive && (
                <div className="ml-8 space-y-3">
                  <Controller
                    control={control}
                    name="appointmentReminder.sendToPatient"
                    render={({ field: { value, onChange, ref } }) => (
                      <Switch
                        ref={ref}
                        label="Enviar al paciente"
                        checked={value}
                        onChange={(event) => onChange(event.target.checked)}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="appointmentReminder.sendToDoctor"
                    render={({ field: { value, onChange, ref } }) => (
                      <Switch
                        ref={ref}
                        label="Enviar al doctor"
                        checked={value}
                        onChange={(event) => onChange(event.target.checked)}
                      />
                    )}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-outline pt-6">
            <h3 className="font-medium text-on-surface">Cumpleaños de pacientes</h3>
            <p className="text-sm text-on-surface-variant">
              Felicitación automática el día del cumpleaños.
            </p>
            <div className="mt-3 space-y-3">
              <Controller
                control={control}
                name="birthdayReminder.isActive"
                render={({ field: { value, onChange, ref } }) => (
                  <Switch
                    ref={ref}
                    label="Activar recordatorios de cumpleaños"
                    checked={value}
                    onChange={(event) => onChange(event.target.checked)}
                  />
                )}
              />
              {birthdayReminder?.isActive && (
                <div className="ml-8 space-y-3">
                  <Controller
                    control={control}
                    name="birthdayReminder.sendToPatient"
                    render={({ field: { value, onChange, ref } }) => (
                      <Switch
                        ref={ref}
                        label="Enviar felicitación al paciente"
                        checked={value}
                        onChange={(event) => onChange(event.target.checked)}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="birthdayReminder.sendToAdmin"
                    render={({ field: { value, onChange, ref } }) => (
                      <Switch
                        ref={ref}
                        label="Notificar al administrador"
                        checked={value}
                        onChange={(event) => onChange(event.target.checked)}
                      />
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" isLoading={updateLogo.isPending || updateSettings.isPending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
