import { useQuery, type QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { apiJson } from '@/config/api';
import { useAuthStore } from '@/stores/auth.store';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';

const endpoint = 'http://localhost:3001/__harness';
const queryKey = ['harness'];

function HarnessProbe() {
  const { data, refetch } = useQuery({
    queryKey,
    queryFn: () => apiJson<{ message: string }>('/__harness'),
    enabled: false,
  });
  return (
    <>
      <button onClick={() => void refetch()}>Consultar</button>
      <output>{data?.message ?? 'Sin datos'}</output>
    </>
  );
}

describe('aislamiento del harness (orden intencional)', () => {
  let previousClient: QueryClient;

  it('integra alias, user-event, Query y HTTP interceptado', async () => {
    server.use(http.get(endpoint, () => HttpResponse.json({ message: 'Respuesta sintética' })));
    const { queryClient, user } = renderWithClient(<HarnessProbe />);
    previousClient = queryClient;
    useAuthStore.getState().setAuth({
      userId: 'harness-user',
      email: 'harness@example.invalid',
      role: 'test',
      doctorId: null,
      permissions: [{ resource: 'test', action: 'read' }],
    });
    await user.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(await screen.findByText('Respuesta sintética')).toBeInTheDocument();
    expect(queryClient.getQueryData(queryKey)).toEqual({
      message: 'Respuesta sintética',
    });
    expect(useAuthStore.getState().hasPermission('test', 'read')).toBe(true);
  });

  it('no hereda auth, DOM, caché ni overrides del caso previo', async () => {
    expect(useAuthStore.getState()).toMatchObject({
      userId: null,
      permissions: [],
    });
    expect(previousClient.getQueryData(queryKey)).toBeUndefined();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const { queryClient } = renderWithClient(<HarnessProbe />);
    expect(queryClient).not.toBe(previousClient);
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
    // El override anterior fue retirado: no existe handler por defecto para esta URL.
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(fetch(endpoint)).rejects.toThrow('onUnhandledRequest');
    expect(error).toHaveBeenCalledWith(expect.stringContaining('intercepted a request'));
  });

  it('rechaza también mutaciones HTTP no declaradas', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(fetch(`${endpoint}/unexpected`, { method: 'POST' })).rejects.toThrow(
      'onUnhandledRequest',
    );
    expect(error).toHaveBeenCalledWith(expect.stringContaining('POST'));
  });
});
