'use client';

import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { queryConfig } from '@/config/query.config';
import { PlatformSessionRecovery } from '@/features/platform-auth/components/platform-session-recovery';

export function Providers({ children }: { readonly children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(queryConfig));
  return (
    <QueryClientProvider client={queryClient}>
      <PlatformSessionRecovery />
      {children}
      <Toaster closeButton position="top-right" richColors />
    </QueryClientProvider>
  );
}
