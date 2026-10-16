import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { doctorPayoutsFixture } from '@/test/fixtures/doctor-payouts.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import DoctorPayoutsPage from './page';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const list = () => HttpResponse.json({ data: doctorPayoutsFixture });
const row = (id: string) => screen.getByRole('row', { name: new RegExp(`Profesional ${id}`) });
const voidButton = (id: string) => within(row(id)).getByRole('button', { name: 'Anular' });
beforeEach(() => server.use(http.get('*/doctor-payouts', list)));

it('carga retenida no muestra vacío válido', async () => {
  let release!: () => void;
  server.use(
    http.get('*/doctor-payouts', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return list();
    }),
  );
  renderWithClient(<DoctorPayoutsPage />);
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.getByText('Cargando…')).toBeVisible();
  expect(screen.queryByText(/Todavía no hay/)).not.toBeInTheDocument();
  release();
  expect(await screen.findByText('Profesional one')).toBeVisible();
});
it.each([false, true])(
  'fallo HTTP cacheado=%s no muestra listado ni vacío engañoso',
  async (cached) => {
    if (!cached)
      server.use(
        http.get('*/doctor-payouts', () =>
          HttpResponse.json({ message: 'Honorarios caídos' }, { status: 503 }),
        ),
      );
    const { queryClient } = renderWithClient(<DoctorPayoutsPage />);
    if (cached) {
      await screen.findByText('Profesional one');
      server.use(
        http.get('*/doctor-payouts', () =>
          HttpResponse.json({ message: 'Honorarios caídos' }, { status: 503 }),
        ),
      );
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ['doctor-payouts'] });
      });
    }
    expect(await screen.findByRole('alert')).toHaveTextContent('Honorarios caídos');
    expect(screen.queryByText('Profesional one')).not.toBeInTheDocument();
    expect(screen.queryByText(/Todavía no hay/)).not.toBeInTheDocument();
    server.use(http.get('*/doctor-payouts', () => HttpResponse.json({ data: [] })));
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['doctor-payouts'] });
    });
    expect(await screen.findByText(/Todavía no hay/)).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  },
);
it('muestra importes recibidos, enlaces correctos y anular solo COMPLETED', async () => {
  const { user } = renderWithClient(<DoctorPayoutsPage />);
  await screen.findByText('Profesional one');
  expect(within(row('one')).getByText(/USD\s25,00/)).toBeVisible();
  expect(within(row('two')).getByText(/USD\s40,00/)).toBeVisible();
  expect(within(row('one')).getByText(/Bs.*1\.000,00/)).toBeVisible();
  for (const id of ['one', 'two', 'void'])
    expect(within(row(id)).getByRole('link', { name: 'Ver detalle' })).toHaveAttribute(
      'href',
      `/liquidaciones-doctores/${id}`,
    );
  expect(within(row('void')).queryByRole('button')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Nuevo pago de honorarios' }));
  expect(push).toHaveBeenCalledWith('/liquidaciones-doctores/nueva');
});
it.each(['', '   ', 'ab', null])('motivo inválido/cancelado %j no envía HTTP', async (reason) => {
  const requests: unknown[] = [];
  jest.spyOn(window, 'prompt').mockReturnValue(reason);
  server.use(
    http.post('*/doctor-payouts/:id/void', async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json(doctorPayoutsFixture[0]);
    }),
  );
  const { user } = renderWithClient(<DoctorPayoutsPage />);
  await screen.findByText('Profesional one');
  await user.click(voidButton('one'));
  if (reason !== null) expect(await screen.findByRole('alert')).toHaveTextContent(/al menos 3/);
  expect(requests).toHaveLength(0);
});
it('pendiente conserva ID, bloquea otro registro y éxito refetchea fila anulada', async () => {
  let release!: () => void;
  const requests: Array<{ id: string; body: unknown }> = [];
  let updated = false;
  const prompt = jest.spyOn(window, 'prompt').mockReturnValue('  Pago duplicado  ');
  server.use(
    http.get('*/doctor-payouts', () =>
      HttpResponse.json({
        data: doctorPayoutsFixture.map((p) =>
          p.id === 'two' && updated ? { ...p, status: 'VOIDED' } : p,
        ),
      }),
    ),
    http.post('*/doctor-payouts/:id/void', async ({ params, request }) => {
      requests.push({ id: String(params.id), body: await request.json() });
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      updated = true;
      return HttpResponse.json({
        ...doctorPayoutsFixture[1],
        status: 'VOIDED',
      });
    }),
  );
  const { user, queryClient } = renderWithClient(<DoctorPayoutsPage />);
  await screen.findByText('Profesional two');
  await user.click(voidButton('two'));
  await waitFor(() => expect(release).toBeDefined());
  expect(voidButton('one')).toBeDisabled();
  expect(voidButton('two')).toBeDisabled();
  await user.click(voidButton('one'));
  await user.click(voidButton('two'));
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['doctor-payouts'] });
  });
  expect(prompt).toHaveBeenCalledTimes(1);
  expect(requests).toEqual([{ id: 'two', body: { reason: 'Pago duplicado' } }]);
  release();
  expect(await within(row('two')).findByText('Anulada')).toBeVisible();
  expect(within(row('two')).queryByRole('button')).not.toBeInTheDocument();
});
it('rechazo muestra error, reintenta mismo ID con segundo HTTP y no contamina otro', async () => {
  const requests: Array<{ id: string; body: unknown }> = [];
  let updated = false;
  const prompt = jest.spyOn(window, 'prompt').mockReturnValue('  Reintento válido  ');
  server.use(
    http.get('*/doctor-payouts', () =>
      HttpResponse.json({
        data: doctorPayoutsFixture.map((p) =>
          p.id === 'two' && updated ? { ...p, status: 'VOIDED' } : p,
        ),
      }),
    ),
    http.post('*/doctor-payouts/:id/void', async ({ params, request }) => {
      requests.push({ id: String(params.id), body: await request.json() });
      if (requests.length === 1)
        return HttpResponse.json({ message: 'Anulación rechazada' }, { status: 503 });
      updated = true;
      return HttpResponse.json({
        ...doctorPayoutsFixture[1],
        status: 'VOIDED',
      });
    }),
  );
  const { user } = renderWithClient(<DoctorPayoutsPage />);
  await screen.findByText('Profesional two');
  await user.click(voidButton('two'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Anulación rechazada');
  prompt.mockReturnValue(null);
  await user.click(voidButton('one'));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(within(row('one')).getByText('Pagada')).toBeVisible();
  expect(requests).toEqual([{ id: 'two', body: { reason: 'Reintento válido' } }]);
  prompt.mockReturnValue('  Reintento válido  ');
  await user.click(voidButton('two'));
  expect(await within(row('two')).findByText('Anulada')).toBeVisible();
  expect(requests).toEqual(
    Array.from({ length: 2 }, () => ({
      id: 'two',
      body: { reason: 'Reintento válido' },
    })),
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  prompt.mockReturnValue('ab');
  await user.click(voidButton('one'));
  expect(await screen.findByRole('alert')).toHaveTextContent(/al menos 3/);
  prompt.mockReturnValue(null);
  await user.click(voidButton('one'));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(requests).toHaveLength(2);
});
