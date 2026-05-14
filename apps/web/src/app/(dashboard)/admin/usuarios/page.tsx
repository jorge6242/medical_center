'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { useRoles } from '@/features/roles/hooks/use-roles';
import { useCreateUser, useDeactivateUser, useUsers } from '@/features/users/hooks/use-users';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Modal } from '@/shared/components/ui/modal';
import { Select } from '@/shared/components/ui/select';
import { formatDate } from '@/shared/utils/format';

const schema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  roleId: z.string().uuid('Selecciona un rol'),
});

type FormData = z.infer<typeof schema>;

function UserForm({ onClose }: { readonly onClose: () => void }) {
  const { data: roles = [] } = useRoles();
  const { mutate, isPending, error } = useCreateUser(onClose);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutate(d))} className="flex flex-col gap-4">
      <Input {...register('name')} id="name" label="Nombre completo" placeholder="Ana García" error={errors.name?.message} />
      <Input {...register('email')} id="email" label="Email" type="email" placeholder="usuario@clinica.com" error={errors.email?.message} />
      <Input {...register('password')} id="password" label="Contraseña" type="password" error={errors.password?.message} />
      <Select
        {...register('roleId')}
        id="roleId"
        label="Rol"
        error={errors.roleId?.message}
        options={[{ value: '', label: 'Seleccionar…' }, ...roles.map((r) => ({ value: r.id, label: r.name }))]}
      />

      {error && <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error.message}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" isLoading={isPending}>Crear usuario</Button>
      </div>
    </form>
  );
}

export default function UsuariosPage() {
  const { data: users = [], isLoading } = useUsers();
  const { mutate: deactivate } = useDeactivateUser();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Usuarios</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-variant" />)}</div>
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
                      <Badge variant={u.isActive ? 'success' : 'error'}>{u.isActive ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="py-3">
                      {u.isActive && (
                        <Button variant="ghost" size="sm" onClick={() => deactivate(u.id)} className="text-error hover:text-error">
                          Desactivar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !isLoading && (
                  <tr><td colSpan={6} className="py-8 text-center text-on-surface-variant">No hay usuarios registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo usuario">
        <UserForm onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  );
}
