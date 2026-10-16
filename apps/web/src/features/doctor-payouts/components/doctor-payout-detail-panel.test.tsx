import { act, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import * as payoutService from '../services/doctor-payouts.service';
import { payoutDetailsFixture } from '@/test/fixtures/doctor-payouts.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { DoctorPayoutDetailPanel } from './doctor-payout-detail-panel';

// Observa promesa real sin sustituir datos/HTTP;PDF ajeno a lectura A.
jest.mock('../services/doctor-payouts.service', () => {
  const actual = jest.requireActual<typeof payoutService>('../services/doctor-payouts.service');
  return { ...actual, getDoctorPayout: jest.fn(actual.getDoctorPayout) };
});
jest.mock('@react-pdf/renderer', () => ({ pdf: jest.fn() }));
jest.mock('./doctor-payout-pdf', () => ({ DoctorPayoutPDF: () => null }));
const getDetail = jest.mocked(payoutService.getDoctorPayout);
const download = () => screen.getByRole('button', { name: 'Descargar detalle PDF' });
const response = (id: string) =>
  HttpResponse.json(payoutDetailsFixture.find((payout) => payout.id === id));
beforeEach(() =>
  server.use(http.get('*/doctor-payouts/:id', ({ params }) => response(String(params.id)))),
);
it.each(['one', 'two', 'void'])(
  'detalle %s muestra snapshot recibido incluso anulado',
  async (id) => {
    renderWithClient(<DoctorPayoutDetailPanel payoutId={id} />);
    expect(await screen.findByText(`Profesional ${id}`)).toBeVisible();
    expect(screen.getByText(`V-${id}`)).toBeVisible();
    expect(screen.getByText(/16.*oct.*2026/)).toBeVisible();
    expect(screen.getByText('PAGO MOVIL')).toBeVisible();
    expect(screen.getByText(id === 'void' ? 'Anulada' : 'Pagada')).toBeVisible();
    expect(screen.getByText(id === 'one' ? /USD\s25,00/ : /USD\s40,00/)).toBeVisible();
    expect(screen.getByText(/Bs.*1\.000,00/)).toBeVisible();
    expect(screen.getByText(`Histórico ${id} · V-patient-${id}`)).toBeVisible();
    expect(
      screen.getByText(
        id === 'void'
          ? 'Descripción void'
          : `Servicio histórico ${id} · Especialidad histórica ${id}`,
      ),
    ).toBeVisible();
    expect(download()).not.toBeDisabled();
  },
);
it.each([404, 503])('HTTP %s fresco muestra error sin documento ficticio', async (status) => {
  server.use(
    http.get('*/doctor-payouts/:id', () =>
      HttpResponse.json({ message: `HTTP ${status}` }, { status }),
    ),
  );
  renderWithClient(<DoctorPayoutDetailPanel payoutId="one" />);
  expect(await screen.findByRole('alert')).toHaveTextContent(`HTTP ${status}`);
  expect(screen.queryByRole('button', { name: 'Descargar detalle PDF' })).not.toBeInTheDocument();
});
it.each([null, payoutDetailsFixture[0]])(
  'null o ID ajeno no se presenta como detalle solicitado',
  async (body) => {
    server.use(http.get('*/doctor-payouts/:id', () => HttpResponse.json(body)));
    renderWithClient(<DoctorPayoutDetailPanel payoutId="two" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('no encontrado');
    expect(screen.queryByText('Profesional one')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar detalle PDF' })).not.toBeInTheDocument();
  },
);
it('HTTP viejo resuelto tras nuevo ID no cambia detalle con Provider conservado', async () => {
  let release!: () => void;
  server.use(
    http.get('*/doctor-payouts/one', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return response('one');
    }),
  );
  const result = renderWithClient(<DoctorPayoutDetailPanel payoutId="one" />);
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.getByText('Cargando pago de honorarios...')).toBeVisible();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  const oldPromise = getDetail.mock.results[0]?.value;
  expect(oldPromise).toBeInstanceOf(Promise);
  result.rerender(
    <QueryClientProvider client={result.queryClient}>
      <DoctorPayoutDetailPanel payoutId="two" />
    </QueryClientProvider>,
  );
  expect(await screen.findByText('Profesional two')).toBeVisible();
  release();
  await act(async () => {
    await oldPromise;
  });
  expect(screen.getByText('Profesional two')).toBeVisible();
  expect(screen.queryByText('Profesional one')).not.toBeInTheDocument();
  expect(getDetail.mock.calls.map(([id]) => id)).toEqual(['one', 'two']);
});
it('refetch bloquea descarga y fallo cacheado no muestra éxito; recuperación vuelve al snapshot', async () => {
  const result = renderWithClient(<DoctorPayoutDetailPanel payoutId="one" />);
  await screen.findByText('Profesional one');
  let release!: () => void;
  server.use(
    http.get('*/doctor-payouts/one', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return HttpResponse.json({ message: 'Detalle caído' }, { status: 503 });
    }),
  );
  let refetch!: Promise<void>;
  act(() => {
    refetch = result.queryClient.invalidateQueries({
      queryKey: ['doctor-payout', 'one'],
    });
  });
  await waitFor(() => expect(release).toBeDefined());
  const blocked = download().matches(':disabled');
  release();
  await act(async () => {
    await refetch;
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('Detalle caído');
  expect(screen.queryByText('Profesional one')).not.toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(blocked).toBe(true);
  server.use(http.get('*/doctor-payouts/one', () => response('one')));
  await act(async () => {
    await result.queryClient.invalidateQueries({
      queryKey: ['doctor-payout', 'one'],
    });
  });
  expect(await screen.findByText('Profesional one')).toBeVisible();
  expect(download()).not.toBeDisabled();
});
