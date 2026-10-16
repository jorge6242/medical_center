import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import NewDoctorPayoutPage from '@/app/(dashboard)/liquidaciones-doctores/nueva/page';
import { doctorPayoutsFixture, pendingPayoutFixture } from '@/test/fixtures/doctor-payouts.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import type { CreateDoctorPayoutDto } from '../services/doctor-payouts.service';

// Página/formulario/HTTP reales;router y PDF importado son fronteras externas.
const push = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));
jest.mock('@react-pdf/renderer', () => ({ pdf: jest.fn() }));
jest.mock('./doctor-payout-pdf', () => ({ DoctorPayoutPDF: () => null }));
const save = () => screen.getByRole('button', { name: 'Registrar pago de honorarios' });
const checkbox = () => screen.getByRole('checkbox', { name: /Paciente first/ });
function submitForm() {
  const form = save().closest('form');
  if (!form) throw new Error('Formulario ausente');
  fireEvent.submit(form);
}
async function prepared() {
  const result = renderWithClient(<NewDoctorPayoutPage />);
  await result.user.type(screen.getByLabelText('Doctor'), 'Ana');
  await result.user.click(await screen.findByRole('button', { name: /Dra. Ana Pérez/ }));
  await result.user.type(await screen.findByLabelText('Tasa BCV (Bs/USD)'), '40');
  await result.user.type(screen.getByLabelText('Número de referencia *'), 'ref-b1');
  await result.user.click(screen.getByRole('checkbox', { name: /Paciente second/ }));
  return result;
}
const expected = {
  doctorId: 'doctor-ana',
  paymentIds: ['first'],
  paymentMethod: 'PAGO_MOVIL',
  currency: 'VES',
  bcvExchangeRate: 40,
  referenceNumber: 'ref-b1',
  bankName: 'Banco doctor-ana',
  bankPhone: '04120000000',
};
beforeEach(() =>
  server.use(
    http.get('*/doctor-payouts/pending/:id', () => HttpResponse.json(pendingPayoutFixture())),
  ),
);
it('POST pendiente conserva snapshot ante refetch vacío/503 y bloquea Cancelar/campos/otro envío', async () => {
  let release!: () => void;
  const bodies: CreateDoctorPayoutDto[] = [];
  server.use(
    http.post('*/doctor-payouts', async ({ request }) => {
      bodies.push((await request.json()) as CreateDoctorPayoutDto);
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return HttpResponse.json({
        ...doctorPayoutsFixture[0],
        id: 'created-one',
      });
    }),
  );
  const result = await prepared();
  await result.user.click(save());
  await waitFor(() => expect(release).toBeDefined());
  submitForm();
  const cancelDisabled = screen.getByRole('button', { name: 'Cancelar' }).matches(':disabled');
  await result.user.click(screen.getByRole('button', { name: 'Cancelar' }));
  const doctorDisabled = screen.getByLabelText('Doctor').matches(':disabled');
  server.use(
    http.get('*/doctor-payouts/pending/:id', () =>
      HttpResponse.json({ ...pendingPayoutFixture(), payments: [] }),
    ),
  );
  await act(async () => {
    await result.queryClient.invalidateQueries({
      queryKey: ['doctor-payout-pending'],
    });
  });
  server.use(
    http.get('*/doctor-payouts/pending/:id', () =>
      HttpResponse.json({ message: 'Pendientes caídos' }, { status: 503 }),
    ),
  );
  await act(async () => {
    await result.queryClient.invalidateQueries({
      queryKey: ['doctor-payout-pending'],
    });
  });
  const retained = screen.queryByRole('checkbox', {
    name: /Paciente first/,
    checked: true,
  });
  submitForm();
  release();
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/liquidaciones-doctores/created-one'));
  expect(bodies).toEqual([expected]);
  expect(push).not.toHaveBeenCalled();
  expect(cancelDisabled).toBe(true);
  expect(doctorDisabled).toBe(true);
  expect(retained).not.toBeNull();
});
it('rechazo conserva datos,reintenta segundo HTTP y éxito navega ID/invalida ambas cachés reales', async () => {
  const bodies: CreateDoctorPayoutDto[] = [];
  let pendingReads = 0;
  server.use(
    http.get('*/doctor-payouts/pending/:id', () => {
      pendingReads += 1;
      return HttpResponse.json(pendingPayoutFixture());
    }),
    http.post('*/doctor-payouts', async ({ request }) => {
      bodies.push((await request.json()) as CreateDoctorPayoutDto);
      return bodies.length === 1
        ? HttpResponse.json({ message: 'Registro rechazado' }, { status: 503 })
        : HttpResponse.json({ ...doctorPayoutsFixture[1], id: 'created-two' });
    }),
  );
  const result = await prepared();
  result.queryClient.setQueryDefaults(['doctor-payouts'], { gcTime: Infinity });
  result.queryClient.setQueryData(['doctor-payouts'], doctorPayoutsFixture);
  expect(result.queryClient.getQueryState(['doctor-payouts'])?.isInvalidated).toBe(false);
  await result.user.click(save());
  expect(await screen.findByRole('alert')).toHaveTextContent('Registro rechazado');
  expect(replace).not.toHaveBeenCalled();
  expect(checkbox()).toBeChecked();
  expect(screen.getByLabelText('Número de referencia *')).toHaveValue('ref-b1');
  await result.user.click(save());
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/liquidaciones-doctores/created-two'));
  expect(bodies).toEqual([expected, expected]);
  await waitFor(() => expect(pendingReads).toBe(2));
  expect(result.queryClient.getQueryState(['doctor-payouts'])?.isInvalidated).toBe(true);
  expect(replace).toHaveBeenCalledTimes(1);
});
it('tras rechazo y catálogo fallido no reintenta datos obsoletos hasta recuperar HTTP', async () => {
  const bodies: CreateDoctorPayoutDto[] = [];
  let release!: () => void;
  server.use(
    http.post('*/doctor-payouts', async ({ request }) => {
      bodies.push((await request.json()) as CreateDoctorPayoutDto);
      if (bodies.length === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ message: 'Registro rechazado' }, { status: 503 });
      }
      return HttpResponse.json({ ...doctorPayoutsFixture[0], id: 'recovered' });
    }),
  );
  const result = await prepared();
  await result.user.click(save());
  await waitFor(() => expect(release).toBeDefined());
  server.use(
    http.get('*/doctor-payouts/pending/:id', () =>
      HttpResponse.json({ message: 'Pendientes caídos' }, { status: 503 }),
    ),
  );
  await act(async () => {
    await result.queryClient.invalidateQueries({
      queryKey: ['doctor-payout-pending'],
    });
  });
  release();
  expect(await screen.findByText(/Registro rechazado/)).toBeVisible();
  expect(save()).toBeDisabled();
  submitForm();
  expect(bodies).toHaveLength(1);
  server.use(
    http.get('*/doctor-payouts/pending/:id', () => HttpResponse.json(pendingPayoutFixture())),
  );
  await act(async () => {
    await result.queryClient.invalidateQueries({
      queryKey: ['doctor-payout-pending'],
    });
  });
  await screen.findByRole('checkbox', { name: /Paciente first/ });
  await result.user.click(save());
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/liquidaciones-doctores/recovered'));
  expect(bodies).toEqual([expected, expected]);
});
it('Cancelar sin POST vuelve al listado sin navegación de éxito', async () => {
  const result = renderWithClient(<NewDoctorPayoutPage />);
  await result.user.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(push).toHaveBeenCalledWith('/liquidaciones-doctores');
  expect(replace).not.toHaveBeenCalled();
});
