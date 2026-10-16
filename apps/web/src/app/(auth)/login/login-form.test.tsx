import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { apiFetch } from '@/config/api';
import { useAuthStore } from '@/stores/auth.store';
import { loginContextFixture, loginResponseFixture } from '@/test/fixtures/login.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';

import { LoginForm } from './login-form';

const mockReplace = jest.fn();
let mockParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockParams,
}));

function deferred() {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { pending, release };
}

function contextHandler() {
  return http.post('*/auth/access-context', () => HttpResponse.json(loginContextFixture));
}

async function submit(user: ReturnType<typeof renderWithClient>['user']) {
  await user.type(screen.getByLabelText('Email'), loginResponseFixture.email);
  await user.type(screen.getByLabelText('Contraseña'), 'synthetic-password');
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
}

beforeEach(() => {
  mockParams = new URLSearchParams('access=synthetic-access');
});

describe('V01 login: contexto y autenticación en el límite HTTP', () => {
  it('sin contexto no pide datos, no permite login ni simula una carga perpetua', async () => {
    const requests: string[] = [];
    const record = ({ request }: { request: Request }) => requests.push(request.url);
    server.events.on('request:start', record);
    mockParams = new URLSearchParams();
    renderWithClient(<LoginForm webSlug={null} />);
    await act(async () => {});
    server.events.removeListener('request:start', record);
    expect(requests).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent('Necesitás un link de acceso');
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    expect(screen.queryByText('Validando acceso…')).not.toBeInTheDocument();
  });

  it('espera contexto y prioriza access sobre webSlug; envía el token, no un slug manual', async () => {
    const response = deferred();
    const accessBodies: unknown[] = [];
    server.use(
      http.post('*/auth/access-context', async ({ request }) => {
        accessBodies.push(await request.json());
        await response.pending;
        return HttpResponse.json(loginContextFixture);
      }),
    );
    renderWithClient(<LoginForm webSlug="ignored-slug" />);
    expect(screen.getByText('Validando acceso…')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    await act(async () => {
      response.release();
    });
    expect(await screen.findByText('Centro de prueba')).toBeVisible();
    expect(screen.getByLabelText('Email')).toBeEnabled();
    expect(accessBodies).toEqual([{ accessToken: 'synthetic-access' }]);
    expect(screen.queryByLabelText(/slug/i)).not.toBeInTheDocument();
  });

  it.each(['', 'access='])(
    'resuelve webSlug cuando no hay access utilizable (%s)',
    async (params) => {
      mockParams = new URLSearchParams(params);
      server.use(
        http.get('*/auth/tenant-by-webslug/centro-test', () =>
          HttpResponse.json(loginContextFixture),
        ),
      );
      renderWithClient(<LoginForm webSlug="centro-test" />);
      expect(await screen.findByText('Centro de prueba')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
    },
  );

  it('access rechazado no habilita login ni recurre al slug', async () => {
    server.use(
      http.post('*/auth/access-context', () =>
        HttpResponse.json({ message: 'Invalid link' }, { status: 403 }),
      ),
    );
    renderWithClient(<LoginForm webSlug="ignored-slug" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('inválido o expiró');
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('slug inexistente dirige a centro no encontrado', async () => {
    mockParams = new URLSearchParams();
    server.use(
      http.get('*/auth/tenant-by-webslug/desconocido', () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );
    renderWithClient(<LoginForm webSlug="desconocido" />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/tenant-not-found'));
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    expect(useAuthStore.getState().userId).toBeNull();
  });

  it('email inválido y contraseña vacía impiden HTTP; válido envía payload y credentials include', async () => {
    const requests: Array<{ body: unknown; credentials: string }> = [];
    server.use(
      contextHandler(),
      http.post('*/auth/login', async ({ request }) => {
        requests.push({ body: await request.json(), credentials: request.credentials });
        return HttpResponse.json(loginResponseFixture);
      }),
    );
    const { user } = renderWithClient(<LoginForm webSlug={null} />);
    await screen.findByLabelText('Email');
    await user.type(screen.getByLabelText('Email'), 'invalid-email');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(requests).toEqual([]);
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), loginResponseFixture.email);
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('Contraseña requerida')).toBeVisible();
    expect(requests).toEqual([]);
    await user.type(screen.getByLabelText('Contraseña'), 'synthetic-password');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/inicio'));
    expect(requests).toEqual([
      {
        body: {
          email: loginResponseFixture.email,
          password: 'synthetic-password',
          contextToken: 'synthetic-context',
        },
        credentials: 'include',
      },
    ]);
    expect(useAuthStore.getState()).toMatchObject({
      userId: 'user-test',
      email: loginResponseFixture.email,
      role: 'RECEPTIONIST',
      permissions: loginResponseFixture.permissions,
    });
  });

  it('login pendiente impide doble envío e invalida configuración al completar', async () => {
    const response = deferred();
    let requests = 0;
    server.use(
      contextHandler(),
      http.post('*/auth/login', async () => {
        requests += 1;
        await response.pending;
        return HttpResponse.json(loginResponseFixture);
      }),
    );
    const { user, queryClient } = renderWithClient(<LoginForm webSlug={null} />);
    queryClient.setQueryDefaults(['config', 'init'], { gcTime: Infinity });
    queryClient.setQueryData(['config', 'init'], { synthetic: true });
    await screen.findByLabelText('Email');
    await submit(user);
    const button = screen.getByRole('button', { name: 'Iniciar sesión' });
    await waitFor(() => expect(button).toBeDisabled());
    await user.click(button);
    expect(requests).toBe(1);
    expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => {
      response.release();
    });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/inicio'));
    expect(queryClient.getQueryState(['config', 'init'])?.isInvalidated).toBe(true);
  });

  it('rechazo 401 muestra error accesible, no autentica y permite reintentar', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const bodies: unknown[] = [];
    server.use(
      contextHandler(),
      http.post('*/auth/login', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ message: 'Credenciales inválidas' }, { status: 401 });
      }),
    );
    const { user } = renderWithClient(<LoginForm webSlug={null} />);
    await screen.findByLabelText('Email');
    await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
    expect(useAuthStore.getState().userId).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(mockParams.get('access')).toBe('synthetic-access');
    server.use(
      http.post('*/auth/login', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(loginResponseFixture);
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/inicio'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(bodies).toEqual(
      [1, 2].map(() => ({
        email: loginResponseFixture.email,
        password: 'synthetic-password',
        contextToken: 'synthetic-context',
      })),
    );
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.not.objectContaining({ redirectOnUnauthorized: expect.anything() }),
    );
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('límite API: un 401 protegido conserva el intento de redirección global', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    server.use(
      http.get('*/patients', () =>
        HttpResponse.json({ message: 'Sesión expirada' }, { status: 401 }),
      ),
    );
    const response = await apiFetch('/patients');
    expect(response.status).toBe(401);
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(String(consoleError.mock.calls[0]?.[0])).toMatch(/Not implemented: navigation/);
    // Solo prueba el intento del límite; jsdom NO acredita navegación real.
  });

  it.each([
    ['/agenda?dia=hoy#turno', '/agenda?dia=hoy#turno'],
    ['https://external.example.test', '/inicio'],
    ['//external.example.test', '/inicio'],
    ['/\\external.example.test', '/inicio'],
    ['/\n/external.example.test', '/inicio'],
  ])('redirect %j se limita a destino local %j', async (redirect, expected) => {
    mockParams.set('redirect', redirect);
    server.use(
      contextHandler(),
      http.post('*/auth/login', () => HttpResponse.json(loginResponseFixture)),
    );
    const { user } = renderWithClient(<LoginForm webSlug={null} />);
    await screen.findByLabelText('Email');
    await submit(user);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(expected));
    expect(useAuthStore.getState().userId).toBe('user-test');
  });
});
