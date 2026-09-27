'use client';
import { useRouter } from 'next/navigation';
import { UserForm } from '../page';
export default function UserCreateRoute() {
  const router = useRouter();
  return (
    <UserForm
      onClose={() => router.push('/admin/usuarios')}
      onSuccess={(user) => router.replace(`/admin/usuarios/${user.id}/editar`)}
    />
  );
}
