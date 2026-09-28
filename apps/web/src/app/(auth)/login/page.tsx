import { Suspense } from 'react';
import { headers } from 'next/headers';

import { LoginForm } from './login-form';

export default async function LoginPage() {
  const headersList = await headers();
  const webSlug = headersList.get('x-tenant-web-slug') ?? null;

  return (
    <Suspense>
      <LoginForm webSlug={webSlug} />
    </Suspense>
  );
}
