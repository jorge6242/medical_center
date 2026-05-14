'use client';

import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { queryConfig } from '@/config/query.config';

export function Providers({ children }: { readonly children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(queryConfig));
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
