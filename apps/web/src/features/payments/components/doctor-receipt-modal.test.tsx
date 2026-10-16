import { act, screen, waitFor, within } from '@testing-library/react';
import { pdf } from '@react-pdf/renderer';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { http, HttpResponse } from 'msw';
import PagosPage from '@/app/(dashboard)/pagos/page';
import type { ReceiptData } from '../services/receipts.service';
import * as receiptService from '../services/receipts.service';
import { paymentsFixture } from '@/test/fixtures/payments.fixture';
import { receiptsFixture } from '@/test/fixtures/receipts.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { DoctorReceiptModal } from './doctor-receipt-modal';

// Solo límites PDF/navegador y formularios ajenos; recibo HTML/servicio reales.
jest.mock('@react-pdf/renderer', () => ({ pdf: jest.fn() }));
// Observabilidad autorizada: ejecuta servicio/HTTP reales, sin sustituir datos.
jest.mock('../services/receipts.service', () => {
  const actual = jest.requireActual<typeof receiptService>('../services/receipts.service');
  return { ...actual, getReceipt: jest.fn(actual.getReceipt) };
});
jest.mock('./doctor-receipt-pdf', () => ({ DoctorReceiptPDF: () => null }));
jest.mock('./payment-form', () => ({ PaymentForm: () => null }));
jest.mock('@/features/medical-records/components/medical-records-create-panel', () => ({
  MedicalRecordsCreatePanel: () => null,
}));
const renderer = jest.mocked(pdf);
const toBlob = jest.fn<Promise<Blob>, []>();
const objectUrl = jest.fn(() => 'blob:receipt');
const originalUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
let requests: string[];
beforeEach(() => {
  requests = [];
  toBlob.mockResolvedValue(new Blob(['synthetic PDF boundary']));
  renderer.mockImplementation(() => ({ toBlob }) as unknown as ReturnType<typeof pdf>);
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: objectUrl });
  jest.spyOn(window, 'open').mockReturnValue(null);
  server.use(
    http.get('*/payments', () =>
      HttpResponse.json({
        data: paymentsFixture.map((p) => ({ ...p, item: { ...p.item, itemType: 'CONSULTATION' } })),
        meta: { total: 4, totalPages: 1 },
      }),
    ),
    http.get('*/receipts/:id/data', ({ params }) => {
      requests.push(String(params.id));
      return HttpResponse.json(receiptsFixture.find((r) => r.paymentId === params.id));
    }),
  );
});
afterAll(() => {
  if (originalUrl) Object.defineProperty(URL, 'createObjectURL', originalUrl);
  else Reflect.deleteProperty(URL, 'createObjectURL');
});
const row = (id: string) => screen.getByRole('row', { name: new RegExp(`Paciente ${id}`) });
const snapshot = () =>
  (renderer.mock.calls.at(-1)?.[0] as ReactElement<{ data: ReceiptData }>).props.data;

it('vista y generador reciben snapshot del pago seleccionado, no nombres/precios vivos', async () => {
  const { user } = renderWithClient(<PagosPage />);
  await screen.findByText('Paciente pay-one');
  for (const data of receiptsFixture) {
    await user.click(within(row(data.paymentId)).getByRole('button', { name: 'Ver' }));
    expect(await screen.findByText(`Recibo de Consulta ${data.receiptNumber}`)).toBeVisible();
    expect(screen.getByText(data.patientName)).toBeVisible();
    expect(screen.getByText(data.doctorName)).toBeVisible();
    expect(screen.getByText(data.services?.[0]?.serviceName ?? '')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    await waitFor(() => expect(snapshot()).toEqual(data));
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
  }
  expect(requests).toEqual(['pay-one', 'pay-two']);
  expect(window.open).toHaveBeenCalledTimes(2);
  expect(objectUrl).toHaveBeenCalledTimes(2);
});

it('descarga directa muestra fallo HTTP y reintenta segundo ID con nueva petición', async () => {
  server.use(
    http.get('*/receipts/:id/data', ({ params }) => {
      requests.push(String(params.id));
      return requests.length === 1
        ? HttpResponse.json({ message: 'Recibo no disponible' }, { status: 503 })
        : HttpResponse.json(receiptsFixture[1]);
    }),
  );
  const { user } = renderWithClient(<PagosPage />);
  await screen.findByText('Paciente pay-two');
  const download = () => within(row('pay-two')).getByRole('button', { name: 'Descargar recibo' });
  await user.click(download());
  expect(await screen.findByRole('alert')).toHaveTextContent('Recibo no disponible');
  expect(window.open).not.toHaveBeenCalled();
  expect(renderer).not.toHaveBeenCalled();
  await user.click(download());
  await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1));
  expect(requests).toEqual(['pay-two', 'pay-two']);
  expect(snapshot()).toEqual(receiptsFixture[1]);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it.each(['listado', 'modal'])(
  'fallo PDF en %s es visible sin abrir ventana y permite reintento',
  async (source) => {
    let release!: () => void;
    toBlob.mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      throw new Error('Generador falló');
    });
    const { user } = renderWithClient(<PagosPage />);
    await screen.findByText('Paciente pay-one');
    if (source === 'modal') {
      await user.click(within(row('pay-one')).getByRole('button', { name: 'Ver' }));
      await screen.findByText('Recibo de Consulta CM-2026-1');
    }
    const download = () =>
      source === 'modal'
        ? screen.getByRole('button', { name: 'Descargar PDF' })
        : within(row('pay-one')).getByRole('button', { name: 'Descargar recibo' });
    await user.click(download());
    await waitFor(() => expect(release).toBeDefined());
    await user.click(download());
    expect(renderer).toHaveBeenCalledTimes(1);
    release();
    expect(await screen.findByRole('alert')).toHaveTextContent('Generador falló');
    expect(window.open).not.toHaveBeenCalled();
    expect(objectUrl).not.toHaveBeenCalled();
    await user.click(download());
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1));
    expect(toBlob).toHaveBeenCalledTimes(2);
    expect(snapshot()).toEqual(receiptsFixture[0]);
    expect(requests).toEqual(source === 'modal' ? ['pay-one'] : ['pay-one', 'pay-one']);
  },
);

it('distingue carga y error HTTP del modal; cerrar/reabrir recupera con segundo HTTP', async () => {
  let release!: () => void;
  server.use(
    http.get('*/receipts/:id/data', async () => {
      requests.push('pay-one');
      if (requests.length > 1) return HttpResponse.json(receiptsFixture[0]);
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return HttpResponse.json({ message: 'Carga rechazada' }, { status: 503 });
    }),
  );
  const { user } = renderWithClient(<PagosPage />);
  await screen.findByText('Paciente pay-one');
  await user.click(within(row('pay-one')).getByRole('button', { name: 'Ver' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Cargando recibo');
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.queryByRole('button', { name: 'Descargar PDF' })).not.toBeInTheDocument();
  release();
  expect(await screen.findByRole('alert')).toHaveTextContent('Carga rechazada');
  await user.keyboard('{Escape}');
  await user.click(within(row('pay-one')).getByRole('button', { name: 'Ver' }));
  expect(await screen.findByText('Recibo de Consulta CM-2026-1')).toBeVisible();
  expect(requests).toHaveLength(2);
});

it('respuesta anterior tardía no sustituye el nuevo pago seleccionado', async () => {
  let release!: () => void;
  // Spy observador sin implementación: preserva HTTP real y espera su promesa.
  const reads = jest.mocked(receiptService.getReceipt);
  server.use(
    http.get('*/receipts/pay-one/data', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return HttpResponse.json(receiptsFixture[0]);
    }),
  );
  const result = renderWithClient(
    <DoctorReceiptModal open paymentId="pay-one" onClose={jest.fn()} />,
  );
  await waitFor(() => expect(release).toBeDefined());
  result.rerender(
    <QueryClientProvider client={result.queryClient}>
      <DoctorReceiptModal open paymentId="pay-two" onClose={jest.fn()} />
    </QueryClientProvider>,
  );
  expect(await screen.findByText('Recibo de Consulta CM-2026-2')).toBeVisible();
  await act(async () => {
    release();
    await (reads.mock.results[0]?.value as Promise<ReceiptData>);
  });
  expect(screen.queryByText('Recibo de Consulta CM-2026-1')).not.toBeInTheDocument();
  expect(screen.getByText('Snapshot paciente 2')).toBeVisible();
});

it.each(['rechazo', 'éxito'])('PDF anterior con %s no contamina otro recibo', async (outcome) => {
  let finish!: () => void;
  const pending = new Promise<Blob>((resolve, reject) => {
    finish = () =>
      outcome === 'rechazo' ? reject(new Error('PDF anterior falló')) : resolve(new Blob(['A']));
  });
  let finishB!: (blob: Blob) => void;
  const pendingB = new Promise<Blob>((resolve) => {
    finishB = resolve;
  });
  toBlob.mockReturnValueOnce(pending).mockReturnValueOnce(pendingB);
  const { user } = renderWithClient(<PagosPage />);
  await screen.findByText('Paciente pay-one');
  await user.click(within(row('pay-one')).getByRole('button', { name: 'Ver' }));
  await user.click(await screen.findByRole('button', { name: 'Descargar PDF' }));
  await waitFor(() => expect(toBlob).toHaveBeenCalledTimes(1));
  await user.click(screen.getByRole('button', { name: 'Cerrar' }));
  await user.click(within(row('pay-two')).getByRole('button', { name: 'Ver' }));
  await screen.findByText('Recibo de Consulta CM-2026-2');
  await user.click(screen.getByRole('button', { name: 'Descargar PDF' }));
  await waitFor(() => expect(toBlob).toHaveBeenCalledTimes(2));
  await act(async () => {
    finish();
    await pending.catch(() => undefined);
  });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(window.open).not.toHaveBeenCalled();
  expect(objectUrl).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeDisabled();
  await act(async () => {
    finishB(new Blob(['B']));
    await pendingB;
  });
  await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1));
  expect(snapshot()).toEqual(receiptsFixture[1]);
});
