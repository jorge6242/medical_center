import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';

export interface RenderWithClientResult extends RenderResult {
  queryClient: QueryClient;
  user: UserEvent;
}

const clients = new Set<QueryClient>();

export async function clearTestClients(): Promise<void> {
  await Promise.all([...clients].map((client) => client.cancelQueries()));
  clients.forEach((client) => client.clear());
  clients.clear();
}

/**
 * Render con QueryClient nuevo por test: retries desactivados y caché sin
 * persistencia (gcTime 0), para que ningún test herede estado del anterior.
 * No modifica la config de producción de `query.config.ts`.
 */
export function renderWithClient(ui: ReactElement): RenderWithClientResult {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
  const user = userEvent.setup();
  clients.add(queryClient);
  const result = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return { ...result, queryClient, user };
}
