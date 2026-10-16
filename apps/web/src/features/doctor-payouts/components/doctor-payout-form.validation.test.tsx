import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { doctorAnaFixture } from '@/test/fixtures/doctors.fixture';
import { doctorPayoutsFixture, pendingPayoutFixture } from '@/test/fixtures/doctor-payouts.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { DoctorPayoutForm } from './doctor-payout-form';

jest.mock('@react-pdf/renderer', () => ({ pdf: jest.fn() }));
jest.mock('./doctor-payout-pdf', () => ({ DoctorPayoutPDF: () => null }));
const save = () => screen.getByRole('button', { name: 'Registrar pago de honorarios' });
const rate = () => screen.getByLabelText('Tasa BCV (Bs/USD)');
function submitForm() {
  const form = save().closest('form');
  if (!form) throw new Error('Formulario ausente');
  fireEvent.submit(form);
}
const renderForm = () =>
  renderWithClient(<DoctorPayoutForm onCancel={jest.fn()} onSuccess={jest.fn()} />);
async function choose(result: ReturnType<typeof renderForm>) {
  await result.user.type(screen.getByLabelText('Doctor'), 'Ana');
  await result.user.click(await screen.findByRole('button', { name: /Dra. Ana Pérez/ }));
}
async function valid(result: ReturnType<typeof renderForm>) {
  await choose(result);
  await result.user.type(await screen.findByLabelText('Tasa BCV (Bs/USD)'), '40');
  await result.user.type(screen.getByLabelText('Número de referencia *'), 'referencia');
}
beforeEach(() =>
  server.use(
    http.get('*/doctor-payouts/pending/:id', () => HttpResponse.json(pendingPayoutFixture())),
  ),
);
it.each([false, true])(
  'pendientes HTTP fallido cacheado=%s no es vacío ni permite pagar',
  async (cached) => {
    const result = renderForm();
    if (cached) await valid(result);
    server.use(
      http.get('*/doctor-payouts/pending/:id', () =>
        HttpResponse.json({ message: 'Pendientes caídos' }, { status: 503 }),
      ),
    );
    if (cached)
      await act(async () => {
        await result.queryClient.invalidateQueries({
          queryKey: ['doctor-payout-pending'],
        });
      });
    else await choose(result);
    expect(await screen.findByRole('alert')).toHaveTextContent('Pendientes caídos');
    expect(save()).toBeDisabled();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText('No hay consultas pendientes por pagar.')).not.toBeInTheDocument();
    server.use(
      http.get('*/doctor-payouts/pending/:id', () => HttpResponse.json(pendingPayoutFixture())),
    );
    await act(async () => {
      await result.queryClient.invalidateQueries({
        queryKey: ['doctor-payout-pending'],
      });
    });
    expect(await screen.findByRole('checkbox', { name: /Paciente first/ })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  },
);
it.each([false, true])('lookup HTTP fallido cacheado=%s no es Sin resultados', async (cached) => {
  const result = renderForm();
  if (cached) await valid(result);
  server.use(
    http.get('*/doctors/lookup', () =>
      HttpResponse.json({ message: 'Doctores caídos' }, { status: 503 }),
    ),
  );
  if (cached)
    await act(async () => {
      await result.queryClient.invalidateQueries({
        queryKey: ['doctor-lookup'],
      });
    });
  else await result.user.type(screen.getByLabelText('Doctor'), 'Ana');
  expect(await screen.findByRole('alert')).toHaveTextContent('Doctores caídos');
  expect(screen.queryByText('Sin resultados.')).not.toBeInTheDocument();
  expect(save()).toBeDisabled();
  server.use(
    http.get('*/doctors/lookup', () =>
      HttpResponse.json({ data: [doctorAnaFixture], nextCursor: null }),
    ),
  );
  await result.user.click(screen.getByRole('button', { name: 'Reintentar búsqueda' }));
  expect(await screen.findByLabelText('Doctor')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('refetch bloquea POST y vacío válido no permite alta', async () => {
  const bodies: unknown[] = [];
  server.use(
    http.post('*/doctor-payouts', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(doctorPayoutsFixture[0]);
    }),
  );
  const result = renderForm();
  await valid(result);
  let release!: () => void;
  server.use(
    http.get('*/doctor-payouts/pending/:id', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return HttpResponse.json({ ...pendingPayoutFixture(), payments: [] });
    }),
  );
  let refetch!: Promise<void>;
  act(() => {
    refetch = result.queryClient.invalidateQueries({
      queryKey: ['doctor-payout-pending'],
    });
  });
  await waitFor(() => expect(release).toBeDefined());
  const blocked = save().hasAttribute('disabled');
  submitForm();
  release();
  await act(async () => {
    await refetch;
  });
  expect(await screen.findByText('No hay consultas pendientes por pagar.')).toBeVisible();
  expect(blocked).toBe(true);
  expect(save()).toBeDisabled();
  expect(bodies).toHaveLength(0);
});
it('doctor/selección obligatorios impiden POST incluso disparando submit', async () => {
  const bodies: unknown[] = [];
  server.use(
    http.post('*/doctor-payouts', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(doctorPayoutsFixture[0]);
    }),
  );
  const result = renderForm();
  submitForm();
  await waitFor(() => expect(save()).toBeDisabled());
  await valid(result);
  for (const checkbox of screen.getAllByRole('checkbox')) await result.user.click(checkbox);
  submitForm();
  await waitFor(() => expect(save()).toBeDisabled());
  expect(bodies).toHaveLength(0);
});
it('BCV inválido no envía; acepta mínimo y decimales seguros en USD, referencia blanca bloqueada', async () => {
  const bodies: Array<{ bcvExchangeRate: number; currency: string }> = [];
  server.use(
    http.post('*/doctor-payouts', async ({ request }) => {
      bodies.push((await request.json()) as { bcvExchangeRate: number; currency: string });
      return HttpResponse.json(doctorPayoutsFixture[0]);
    }),
  );
  const result = renderForm();
  await valid(result);
  await result.user.selectOptions(screen.getByLabelText('Método de pago'), 'CASH_USD');
  await result.user.selectOptions(screen.getByLabelText('Moneda'), 'USD');
  for (const value of ['', 'Infinity', '0', '-1', '0.00001', '40.12345']) {
    fireEvent.change(rate(), { target: { value } });
    submitForm();
    expect(await screen.findByText(/tasa BCV válida/)).toBeVisible();
  }
  expect(bodies).toHaveLength(0);
  for (const value of ['0.0001', '0.29', '123.4567']) {
    fireEvent.change(rate(), { target: { value } });
    submitForm();
    await waitFor(() =>
      expect(bodies.at(-1)).toMatchObject({
        bcvExchangeRate: Number(value),
        currency: 'USD',
      }),
    );
    await waitFor(() => expect(save()).not.toBeDisabled());
  }
  expect(bodies).toHaveLength(3);
  await result.user.selectOptions(screen.getByLabelText('Método de pago'), 'PAGO_MOVIL');
  fireEvent.change(screen.getByLabelText('Número de referencia *'), {
    target: { value: '   ' },
  });
  submitForm();
  await waitFor(() => expect(save()).toBeDisabled());
  expect(bodies).toHaveLength(3);
});
it('carga inicial no presenta cero como resumen válido', async () => {
  let release!: () => void;
  server.use(
    http.get('*/doctor-payouts/pending/:id', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return HttpResponse.json(pendingPayoutFixture());
    }),
  );
  const result = renderForm();
  await choose(result);
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.getByText('Cargando consultas…')).toBeVisible();
  const summary = screen.queryByText('Total a pagar:');
  release();
  expect(await screen.findByRole('checkbox', { name: /Paciente first/ })).toBeVisible();
  expect(summary).not.toBeInTheDocument();
});
