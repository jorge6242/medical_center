import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { CreateDoctorPayoutDto } from '../services/doctor-payouts.service';
import { doctorAnaFixture } from '@/test/fixtures/doctors.fixture';
import { doctorPayoutsFixture, pendingPayoutFixture } from '@/test/fixtures/doctor-payouts.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { DoctorPayoutForm } from './doctor-payout-form';

// Frontera PDF ajena a A; formulario/hooks/services/lookup reales.
jest.mock('@react-pdf/renderer', () => ({ pdf: jest.fn() }));
jest.mock('./doctor-payout-pdf', () => ({ DoctorPayoutPDF: () => null }));
const save = () => screen.getByRole('button', { name: 'Registrar pago de honorarios' });
const rate = () => screen.getByRole('spinbutton', { name: 'Tasa BCV (Bs/USD)' });
const payment = (id: string) =>
  screen.getByRole('checkbox', { name: `Paciente ${id} Consulta ${id}` });
const renderForm = () =>
  renderWithClient(<DoctorPayoutForm onCancel={jest.fn()} onSuccess={jest.fn()} />);
async function choose(result: ReturnType<typeof renderForm>, id = 'doctor-ana') {
  const input = screen.getByLabelText('Doctor');
  await result.user.clear(input);
  await result.user.type(input, id === 'doctor-ana' ? 'Ana' : 'Bruno');
  await result.user.click(
    await screen.findByRole('button', {
      name: id === 'doctor-ana' ? /Dra. Ana Pérez/ : /Dr. Bruno/,
    }),
  );
  await screen.findByText(`Pendiente ${id}`);
}
async function valid(result: ReturnType<typeof renderForm>) {
  await choose(result);
  await result.user.type(rate(), '40');
  await result.user.type(screen.getByLabelText('Número de referencia *'), 'referencia');
}
beforeEach(() =>
  server.use(
    http.get('*/doctors/lookup', () =>
      HttpResponse.json({
        data: [doctorAnaFixture, { ...doctorAnaFixture, id: 'doctor-b', name: 'Dr. Bruno' }],
        nextCursor: null,
      }),
    ),
    http.get('*/doctor-payouts/pending/:id', ({ params }) =>
      HttpResponse.json(pendingPayoutFixture(String(params.id))),
    ),
  ),
);
it('lookup requiere dos caracteres y envía q/limit; vacío se distingue de pendientes', async () => {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get('*/doctors/lookup', ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json({ data: [], nextCursor: null });
    }),
  );
  const result = renderForm();
  await result.user.type(screen.getByLabelText('Doctor'), 'A');
  expect(await screen.findByText('Escribí al menos 2 caracteres.')).toBeVisible();
  expect(queries).toHaveLength(0);
  await result.user.type(screen.getByLabelText('Doctor'), 'n');
  expect(await screen.findByText('Sin resultados.')).toBeVisible();
  expect(queries[0]?.get('q')).toBe('An');
  expect(queries[0]?.get('limit')).toBe('20');
  expect(save()).toBeDisabled();
});
it('envía solo pagos seleccionados y datos bancarios del doctor con importes recibidos', async () => {
  const bodies: CreateDoctorPayoutDto[] = [];
  server.use(
    http.post('*/doctor-payouts', async ({ request }) => {
      bodies.push((await request.json()) as CreateDoctorPayoutDto);
      return HttpResponse.json(doctorPayoutsFixture[0]);
    }),
  );
  const result = renderForm();
  await valid(result);
  await result.user.click(payment('second'));
  expect(screen.getAllByText(/USD\s25,00/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Bs.*1\.000,00/).length).toBeGreaterThan(0);
  await result.user.click(save());
  await waitFor(() =>
    expect(bodies).toEqual([
      {
        doctorId: 'doctor-ana',
        paymentIds: ['first'],
        paymentMethod: 'PAGO_MOVIL',
        currency: 'VES',
        bcvExchangeRate: 40,
        referenceNumber: 'referencia',
        bankName: 'Banco doctor-ana',
        bankPhone: '04120000000',
      },
    ]),
  );
});
it('refetch conserva deselección y elimina pagos ya no elegibles sin seleccionar nuevos', async () => {
  const result = renderForm();
  await valid(result);
  await result.user.click(payment('second'));
  server.use(
    http.get('*/doctor-payouts/pending/:id', () =>
      HttpResponse.json({
        ...pendingPayoutFixture(),
        payments: [
          ...pendingPayoutFixture().payments,
          {
            ...pendingPayoutFixture().payments[0],
            id: 'third',
            patientName: 'Paciente third',
            description: 'Consulta third',
          },
        ],
      }),
    ),
  );
  await act(async () => {
    await result.queryClient.invalidateQueries({
      queryKey: ['doctor-payout-pending'],
    });
  });
  await screen.findByRole('checkbox', {
    name: 'Paciente third Consulta third',
  });
  expect(payment('first')).toBeChecked();
  expect(payment('second')).not.toBeChecked();
  expect(payment('third')).not.toBeChecked();
  server.use(
    http.get('*/doctor-payouts/pending/:id', () =>
      HttpResponse.json({
        ...pendingPayoutFixture(),
        payments: [pendingPayoutFixture().payments[1]],
      }),
    ),
  );
  await act(async () => {
    await result.queryClient.invalidateQueries({
      queryKey: ['doctor-payout-pending'],
    });
  });
  await waitFor(() =>
    expect(
      screen.queryByRole('checkbox', { name: 'Paciente first Consulta first' }),
    ).not.toBeInTheDocument(),
  );
  expect(payment('second')).not.toBeChecked();
  expect(save()).toBeDisabled();
});
it('cambiar doctor reinicia selección incluso con IDs solapados y caché previa', async () => {
  const result = renderForm();
  await valid(result);
  await result.user.click(payment('first'));
  await choose(result, 'doctor-b');
  expect(payment('first')).toBeChecked();
  expect(payment('second')).toBeChecked();
  await result.user.click(payment('second'));
  await choose(result);
  expect(payment('first')).toBeChecked();
  expect(payment('second')).toBeChecked();
});
it('doctor pendiente no conserva pagos anteriores durante HTTP diferido', async () => {
  const result = renderForm();
  await valid(result);
  let release!: () => void;
  server.use(
    http.get('*/doctor-payouts/pending/doctor-b', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return HttpResponse.json(pendingPayoutFixture('doctor-b'));
    }),
  );
  await result.user.clear(screen.getByLabelText('Doctor'));
  await result.user.type(screen.getByLabelText('Doctor'), 'Bruno');
  await result.user.click(await screen.findByRole('button', { name: /Dr. Bruno/ }));
  await waitFor(() => expect(release).toBeDefined());
  expect(save()).toBeDisabled();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  release();
  expect(await screen.findByText('Pendiente doctor-b')).toBeVisible();
  expect(payment('first')).toBeChecked();
});
it('scroll consulta el cursor HTTP y permite elegir el doctor de la segunda página', async () => {
  let intersect!: () => void;
  jest.spyOn(globalThis, 'IntersectionObserver').mockImplementation((callback) => {
    const observer: IntersectionObserver = {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
      takeRecords: () => [],
      root: null,
      rootMargin: '',
      thresholds: [],
    };
    intersect = () => callback([{ isIntersecting: true } as IntersectionObserverEntry], observer);
    return observer;
  });
  const cursors: Array<string | null> = [];
  server.use(
    http.get('*/doctors/lookup', ({ request }) => {
      const cursor = new URL(request.url).searchParams.get('cursor');
      cursors.push(cursor);
      return HttpResponse.json({
        data: cursor
          ? [{ ...doctorAnaFixture, id: 'doctor-b', name: 'Dr. Bruno' }]
          : [doctorAnaFixture],
        nextCursor: cursor ? null : 'cursor-next',
      });
    }),
  );
  const result = renderForm();
  await result.user.type(screen.getByLabelText('Doctor'), 'Do');
  await screen.findByRole('button', { name: /Dra. Ana Pérez/ });
  await waitFor(() => expect(intersect).toBeDefined());
  act(() => intersect());
  await result.user.click(await screen.findByRole('button', { name: /Dr. Bruno/ }));
  expect(await screen.findByText('Pendiente doctor-b')).toBeVisible();
  expect(cursors).toEqual([null, 'cursor-next']);
});
