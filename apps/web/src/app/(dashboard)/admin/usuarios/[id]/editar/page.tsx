'use client';

import { useParams, useRouter } from 'next/navigation';

import { UserEditForm } from '../../page';
import { useUsers } from '@/features/users/hooks/use-users';

export default function UserEditRoute() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { data: users = [] } = useUsers();
  const user = users.find((item) => item.id === id);
  if (!user) return null;
  return <UserEditForm user={user} onClose={() => router.push('/admin/usuarios')} />;
}
