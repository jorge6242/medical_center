import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { pdf } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { doctorAnaFixture } from '@/test/fixtures/doctors.fixture';
import { pendingPayoutFixture } from '@/test/fixtures/doctor-payouts.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import type { DoctorPayoutDetail } from '../services/doctor-payouts.service';
import { DoctorPayoutForm } from './doctor-payout-form';

// Solo renderer/documento importado/descarga nativa;formulario y HTTP reales.
jest.mock('@react-pdf/renderer', () => ({ pdf: jest.fn() }));
jest.mock('./doctor-payout-pdf', () => ({ DoctorPayoutPDF: () => null }));
const renderer = jest.mocked(pdf);
const toBlob = jest.fn<Promise<Blob>, []>();
const objectUrl = jest.fn(() => 'blob:preview');
const originalUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
const preview = () => screen.getByRole('button', { name: 'Descargar vista previa' });
const snapshot = () =>
  (
    renderer.mock.calls.at(-1)?.[0] as ReactElement<{
      payout: DoctorPayoutDetail;
      isPreview: boolean;
    }>
  ).props;
function deferred() {
  let resolve!: (value: Blob) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<Blob>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function choose(result: ReturnType<typeof renderWithClient>, other = false) {
  await result.user.clear(screen.getByLabelText('Doctor'));
  await result.user.type(screen.getByLabelText('Doctor'), other ? 'Bruno' : 'Ana');
  await result.user.click(
    await screen.findByRole('button', {
      name: other ? /Dr. Bruno/ : /Dra. Ana Pérez/,
    }),
  );
  await screen.findByText(`Pendiente ${other ? 'doctor-b' : 'doctor-ana'}`);
}
async function prepared() {
  const result = renderWithClient(<DoctorPayoutForm onCancel={jest.fn()} onSuccess={jest.fn()} />);
  await choose(result);
  await result.user.type(screen.getByLabelText('Tasa BCV (Bs/USD)'), '40');
  await result.user.type(screen.getByLabelText('Número de referencia *'), ' ref-preview ');
  return result;
}
beforeEach(() => {
  toBlob.mockReset();
  renderer.mockReset();
  toBlob.mockResolvedValue(new Blob(['synthetic preview']));
  renderer.mockImplementation(() => ({ toBlob }) as unknown as ReturnType<typeof pdf>);
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: objectUrl,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: jest.fn(),
  });
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  jest.spyOn(toast, 'error').mockReturnValue('notification');
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
  );
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
it('generador recibe doctor/pagos/importes/banco seleccionados y marca borrador', async () => {
  const result = await prepared();
  await result.user.click(screen.getByRole('checkbox', { name: /Paciente second/ }));
  await result.user.click(preview());
  await waitFor(() => expect(objectUrl).toHaveBeenCalledTimes(1));
  expect(snapshot()).toMatchObject({
    isPreview: true,
    payout: {
      doctorId: 'doctor-ana',
      doctorName: doctorAnaFixture.name,
      amountUsd: '25.00',
      equivalentBs: '1000.00',
      bankName: 'Banco doctor-ana',
      bankPhone: '04120000000',
      accountNumber: null,
      referenceNumber: 'ref-preview',
      paymentMethod: 'PAGO_MOVIL',
      currency: 'VES',
      items: [{ paymentId: 'first', patientName: 'Paciente first' }],
    },
  });
  await choose(result, true);
  await result.user.click(preview());
  await waitFor(() => expect(objectUrl).toHaveBeenCalledTimes(2));
  expect(snapshot().payout).toMatchObject({
    doctorId: 'doctor-b',
    doctorName: 'Dr. Bruno',
    bankName: 'Banco doctor-b',
    amountUsd: '40.00',
  });
  expect(snapshot().payout.items.map((item) => item.paymentId)).toEqual(['first', 'second']);
});
it('fallo PDF muestra error local y reintento genera otra vez sin descarga falsa', async () => {
  toBlob.mockRejectedValueOnce(new Error('PDF caído'));
  const result = await prepared();
  await result.user.click(preview());
  expect(await screen.findByRole('alert')).toHaveTextContent('PDF caído');
  expect(objectUrl).not.toHaveBeenCalled();
  await result.user.click(preview());
  await waitFor(() => expect(objectUrl).toHaveBeenCalledTimes(1));
  expect(renderer).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it.each([
  ['doctor', false],
  ['doctor', true],
  ['payment', false],
  ['rate', false],
  ['reference', false],
  ['method', false],
] as const)(
  'cambio %s con resultado viejo fallido=%s no afecta preview nuevo pendiente',
  async (change, failed) => {
    const old = deferred();
    const current = deferred();
    toBlob.mockImplementationOnce(() => old.promise).mockImplementationOnce(() => current.promise);
    const result = await prepared();
    await result.user.click(preview());
    expect(preview()).toBeDisabled();
    fireEvent.click(preview());
    expect(renderer).toHaveBeenCalledTimes(1);
    if (change === 'doctor') await choose(result, true);
    if (change === 'payment')
      await result.user.click(screen.getByRole('checkbox', { name: /Paciente second/ }));
    if (change === 'rate')
      fireEvent.change(screen.getByLabelText('Tasa BCV (Bs/USD)'), {
        target: { value: '41' },
      });
    if (change === 'reference')
      fireEvent.change(screen.getByLabelText('Número de referencia *'), {
        target: { value: 'nueva referencia' },
      });
    if (change === 'method')
      await result.user.selectOptions(screen.getByLabelText('Método de pago'), 'ZELLE');
    await result.user.click(preview());
    expect(renderer).toHaveBeenCalledTimes(2);
    await act(async () => {
      if (failed) old.reject(new Error('PDF anterior'));
      else old.resolve(new Blob(['old']));
    });
    expect(objectUrl).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(preview()).toBeDisabled();
    const blob = new Blob(['current']);
    await act(async () => current.resolve(blob));
    await waitFor(() => expect(objectUrl).toHaveBeenCalledWith(blob));
    expect(objectUrl).toHaveBeenCalledTimes(1);
    expect(snapshot().payout.doctorId).toBe(change === 'doctor' ? 'doctor-b' : 'doctor-ana');
  },
);
it('desmontar descarta resultado pendiente sin descargar', async () => {
  const old = deferred();
  toBlob.mockImplementationOnce(() => old.promise);
  const result = await prepared();
  await result.user.click(preview());
  result.unmount();
  await act(async () => old.resolve(new Blob(['old'])));
  expect(objectUrl).not.toHaveBeenCalled();
});
it('tasa inválida y referencia blanca no generan preview ni con click programático', async () => {
  const result = await prepared();
  fireEvent.change(screen.getByLabelText('Tasa BCV (Bs/USD)'), {
    target: { value: '-1' },
  });
  fireEvent.click(preview());
  expect(renderer).not.toHaveBeenCalled();
  expect(preview()).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Tasa BCV (Bs/USD)'), {
    target: { value: '40' },
  });
  fireEvent.change(screen.getByLabelText('Número de referencia *'), {
    target: { value: '   ' },
  });
  expect(preview()).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Número de referencia *'), {
    target: { value: 'válida' },
  });
  expect(preview()).not.toBeDisabled();
  server.use(
    http.get('*/doctor-payouts/pending/:id', () =>
      HttpResponse.json({ message: 'Catálogo caído' }, { status: 503 }),
    ),
  );
  await act(async () => {
    await result.queryClient.invalidateQueries({
      queryKey: ['doctor-payout-pending'],
    });
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('Catálogo caído');
  fireEvent.click(preview());
  expect(renderer).not.toHaveBeenCalled();
  expect(preview()).toBeDisabled();
});
