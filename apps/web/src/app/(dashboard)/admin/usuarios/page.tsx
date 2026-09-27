'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { useAssignableRoles } from '@/features/roles/hooks/use-roles';
import {
  useCreateUser,
  useDeactivateUser,
  useUpdateUser,
  useUsers,
} from '@/features/users/hooks/use-users';
import type { UserResponse } from '@/features/users/services/users.service';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Modal } from '@/shared/components/ui/modal';
import { Select } from '@/shared/components/ui/select';
import { formatDate } from '@/shared/utils/format';
import { useAuthStore } from '@/stores/auth.store';

const schema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  lastName: z.string().min(2, 'Apellido requerido'),
  identificationNumber: z.string().optional(),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  roleId: z.string().min(1, 'Selecciona un rol'),
});

type FormData = z.infer<typeof schema>;

const updateSchema = schema.extend({
  password: z.string().min(8, 'Mínimo 8 caracteres').optional().or(z.literal('')),
});

type UpdateFormData = z.infer<typeof updateSchema>;

export function UserForm({
  onClose,
  onSuccess,
}: {
  readonly onClose: () => void;
  readonly onSuccess?: (user: UserResponse) => void;
}) {
  const { data: roles = [] } = useAssignableRoles();
  const { mutate, isPending, error } = useCreateUser((user) => {
    onSuccess?.(user);
    onClose();
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutate(d))} className="flex flex-col gap-4">
      <Input
        {...register('name')}
        id="name"
        label="Nombre"
        placeholder="Gladys"
        error={errors.name?.message}
      />
      <Input
        {...register('lastName')}
        id="lastName"
        label="Apellido"
        placeholder="de Gómez"
        error={errors.lastName?.message}
      />
      <Input
        {...register('identificationNumber')}
        id="identificationNumber"
        label="Número de identificación (opcional)"
        placeholder="V-12345678"
        error={errors.identificationNumber?.message}
      />
      <Input
        {...register('email')}
        id="email"
        label="Email"
        type="email"
        placeholder="usuario@clinica.com"
        error={errors.email?.message}
      />
      <Input
        {...register('password')}
        id="password"
        label="Contraseña"
        type="password"
        error={errors.password?.message}
      />
      <Select
        {...register('roleId')}
        id="roleId"
        label="Rol"
        error={errors.roleId?.message}
        options={[
          { value: '', label: 'Seleccionar…' },
          ...roles.map((r) => ({ value: r.id, label: r.name })),
        ]}
      />

      {error && (
        <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
          {error.message}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isPending}>
          Crear usuario
        </Button>
      </div>
    </form>
  );
}

export function UserEditForm({
  user,
  onClose,
}: {
  readonly user: UserResponse;
  readonly onClose: () => void;
}) {
  const { data: roles = [] } = useAssignableRoles();
  const { mutate, isPending, error } = useUpdateUser(onClose);
  const roleOptions = [
    { value: user.role.id, label: user.role.name },
    ...roles
      .filter((role) => role.id !== user.role.id)
      .map((role) => ({ value: role.id, label: role.name })),
  ];
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      name: user.name,
      lastName: user.lastName ?? '',
      identificationNumber: user.identificationNumber ?? '',
      email: user.email,
      roleId: user.role.id,
    },
  });

  return (
    <form
      onSubmit={handleSubmit((dto) =>
        mutate({ id: user.id, dto: { ...dto, password: dto.password || undefined } }),
      )}
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-on-surface-variant">
        Actualizá la información de <span className="font-medium text-on-surface">{user.name}</span>
        .
      </p>
      <Input {...register('name')} id="edit-name" label="Nombre" error={errors.name?.message} />
      <Input
        {...register('lastName')}
        id="edit-last-name"
        label="Apellido"
        error={errors.lastName?.message}
      />
      <Input
        {...register('identificationNumber')}
        id="edit-identification-number"
        label="Número de identificación (opcional)"
        error={errors.identificationNumber?.message}
      />
      <Input
        {...register('email')}
        id="edit-email"
        label="Email"
        type="email"
        error={errors.email?.message}
      />
      <Input
        {...register('password')}
        id="edit-password"
        label="Nueva contraseña"
        type="password"
        error={errors.password?.message}
      />
      <Select
        {...register('roleId', { required: 'Seleccioná un rol' })}
        id="roleId"
        label="Rol"
        error={errors.roleId?.message}
        options={roleOptions}
      />
      {error && (
        <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
          {error.message}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isPending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

export default function UsuariosPage() {
  const router = useRouter();
  const { data: users = [], isLoading } = useUsers();
  const { mutate: deactivate } = useDeactivateUser();
  const userId = useAuthStore((state) => state.userId);
  const [showModal, setShowModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserResponse | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Usuarios</h1>
        <Button onClick={() => router.push('/admin/usuarios/nuevo')}>
          <Plus className="h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-variant" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                  <th className="pb-3 pr-4 font-medium">Nombre</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Rol</th>
                  <th className="pb-3 pr-4 font-medium">Creado</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-outline-variant last:border-0">
                    <td className="py-3 pr-4 font-medium text-on-surface">{u.name}</td>
                    <td className="py-3 pr-4 text-on-surface-variant">{u.email}</td>
                    <td className="py-3 pr-4 capitalize text-on-surface-variant">{u.role.name}</td>
                    <td className="py-3 pr-4 text-on-surface-variant">{formatDate(u.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={u.isActive ? 'success' : 'error'}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {userId && u.id !== userId && u.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/usuarios/${u.id}/editar`)}
                        >
                          <Pencil className="h-4 w-4" /> Editar
                        </Button>
                      )}
                      {userId && u.id !== userId && u.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deactivate(u.id)}
                          className="text-error hover:text-error"
                        >
                          Desactivar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                      No hay usuarios registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo usuario">
        <UserForm onClose={() => setShowModal(false)} />
      </Modal>
      <Modal open={userToEdit !== null} onClose={() => setUserToEdit(null)} title="Editar usuario">
        {userToEdit && <UserEditForm user={userToEdit} onClose={() => setUserToEdit(null)} />}
      </Modal>
    </div>
  );
}
