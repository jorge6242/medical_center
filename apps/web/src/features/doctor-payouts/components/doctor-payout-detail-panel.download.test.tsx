import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { pdf } from '@react-pdf/renderer';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { payoutDetailsFixture } from '@/test/fixtures/doctor-payouts.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import type { DoctorPayoutDetail } from '../services/doctor-payouts.service';
import { DoctorPayoutDetailPanel } from './doctor-payout-detail-panel';

// Panel/hooks/services/HTTP reales;renderer/blob/anchor/notificaciones son fronteras.
jest.mock('@react-pdf/renderer', () => ({ pdf: jest.fn() }));
jest.mock('./doctor-payout-pdf', () => ({ DoctorPayoutPDF: () => null }));
const renderer = jest.mocked(pdf);
const toBlob = jest.fn<Promise<Blob>, []>();
const objectUrl = jest.fn(() => 'blob:detail');
const originalUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
let filenames: string[];
const download = () => screen.getByRole('button', { name: 'Descargar detalle PDF' });
const snapshot = () =>
  (
    renderer.mock.calls.at(-1)?.[0] as ReactElement<{
      payout: DoctorPayoutDetail;
    }>
  ).props.payout;
function deferred() {
  let resolve!: (value: Blob) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Blob>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const response = (id: string) => HttpResponse.json(payoutDetailsFixture.find((p) => p.id === id));
async function prepared() {
  const result = renderWithClient(<DoctorPayoutDetailPanel payoutId="one" />);
  await screen.findByText('Profesional one');
  return result;
}
async function selectTwo(result: ReturnType<typeof renderWithClient>) {
  result.rerender(
    <QueryClientProvider client={result.queryClient}>
      <DoctorPayoutDetailPanel payoutId="two" />
    </QueryClientProvider>,
  );
  await screen.findByText('Profesional two');
}
beforeEach(() => {
  filenames = [];
  toBlob.mockReset().mockResolvedValue(new Blob(['synthetic receipt']));
  renderer.mockReset().mockImplementation(() => ({ toBlob }) as unknown as ReturnType<typeof pdf>);
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: objectUrl,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: jest.fn(),
  });
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filenames.push(this.download);
  });
  jest.spyOn(toast, 'error').mockReturnValue('notification');
  jest.spyOn(toast, 'success').mockReturnValue('notification');
  server.use(http.get('*/doctor-payouts/:id', ({ params }) => response(String(params.id))));
});
afterAll(() => {
  for (const [key, descriptor] of [
    ['createObjectURL', originalUrl],
    ['revokeObjectURL', originalRevoke],
  ] as const) {
    if (descriptor) Object.defineProperty(URL, key, descriptor);
    else Reflect.deleteProperty(URL, key);
  }
});
it('generador recibe snapshots completos históricos y filename de cada ID seleccionado', async () => {
  const result = await prepared();
  await result.user.click(download());
  await waitFor(() => expect(filenames).toEqual(['pago-honorarios-one.pdf']));
  expect(snapshot()).toEqual(payoutDetailsFixture[0]);
  await selectTwo(result);
  await result.user.click(download());
  await waitFor(() =>
    expect(filenames).toEqual(['pago-honorarios-one.pdf', 'pago-honorarios-two.pdf']),
  );
  expect(snapshot()).toEqual(payoutDetailsFixture[1]);
});
it('PDF rechazado muestra error,sin descargar y reintenta mismo snapshot con otro generador', async () => {
  toBlob.mockRejectedValueOnce(new Error('PDF rechazado'));
  const result = await prepared();
  await result.user.click(download());
  expect(await screen.findByRole('alert')).toHaveTextContent('PDF rechazado');
  expect(filenames).toEqual([]);
  expect(objectUrl).not.toHaveBeenCalled();
  await result.user.click(download());
  await waitFor(() => expect(filenames).toEqual(['pago-honorarios-one.pdf']));
  expect(renderer).toHaveBeenCalledTimes(2);
  expect(snapshot()).toEqual(payoutDetailsFixture[0]);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it.each([false, true])('PDF viejo fallido=%s no afecta descarga B pendiente', async (failed) => {
  const old = deferred();
  const current = deferred();
  toBlob.mockImplementationOnce(() => old.promise).mockImplementationOnce(() => current.promise);
  const result = await prepared();
  await result.user.click(download());
  fireEvent.click(download());
  expect(renderer).toHaveBeenCalledTimes(1);
  await selectTwo(result);
  await result.user.click(download());
  expect(renderer).toHaveBeenCalledTimes(2);
  await act(async () => {
    if (failed) old.reject(new Error('Viejo'));
    else old.resolve(new Blob(['old']));
  });
  expect(filenames).toEqual([]);
  expect(objectUrl).not.toHaveBeenCalled();
  expect(toast.error).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
  expect(download()).toBeDisabled();
  const blob = new Blob(['current']);
  await act(async () => current.resolve(blob));
  await waitFor(() => expect(filenames).toEqual(['pago-honorarios-two.pdf']));
  expect(objectUrl).toHaveBeenCalledWith(blob);
  expect(objectUrl).toHaveBeenCalledTimes(1);
  expect(snapshot()).toEqual(payoutDetailsFixture[1]);
});
it.each([false, true])(
  'unmount ignora resultado tardío fallido=%s y notificaciones',
  async (failed) => {
    const old = deferred();
    toBlob.mockImplementationOnce(() => old.promise);
    const result = await prepared();
    await result.user.click(download());
    result.unmount();
    await act(async () => {
      if (failed) old.reject(new Error('Viejo'));
      else old.resolve(new Blob(['old']));
    });
    expect(objectUrl).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  },
);
it('refetch503 y recuperación no pierden guard de exportación válida ya iniciada', async () => {
  const old = deferred();
  toBlob.mockImplementationOnce(() => old.promise);
  const result = await prepared();
  await result.user.click(download());
  server.use(
    http.get('*/doctor-payouts/one', () =>
      HttpResponse.json({ message: 'Detalle caído' }, { status: 503 }),
    ),
  );
  await act(async () => {
    await result.queryClient.invalidateQueries({
      queryKey: ['doctor-payout', 'one'],
    });
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('Detalle caído');
  server.use(http.get('*/doctor-payouts/one', () => response('one')));
  await act(async () => {
    await result.queryClient.invalidateQueries({
      queryKey: ['doctor-payout', 'one'],
    });
  });
  await screen.findByText('Profesional one');
  expect(download()).toBeDisabled();
  fireEvent.click(download());
  expect(renderer).toHaveBeenCalledTimes(1);
  await act(async () => old.resolve(new Blob(['valid initial snapshot'])));
  await waitFor(() => expect(filenames).toEqual(['pago-honorarios-one.pdf']));
});
