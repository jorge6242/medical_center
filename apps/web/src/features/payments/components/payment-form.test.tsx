import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import PagosPage from '@/app/(dashboard)/pagos/page';
import type { CreatePaymentDto } from '../services/payments.service';
import { patientMariaFixture } from '@/test/fixtures/patients.fixture';
import { paymentsFixture } from '@/test/fixtures/payments.fixture';
import {
  paymentFormDoctors,
  paymentFormServices,
  secondDoctorServices,
} from '@/test/fixtures/payment-form.fixture';
import { renderWithClient, type RenderWithClientResult } from '@/test/render';
import { server } from '@/test/server';
import { PaymentForm } from './payment-form';

// Recibos/PDF e informe médico fuera de B; página, formulario y HTTP reales.
jest.mock('@/features/payments/components/doctor-receipt-modal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/features/payments/components/doctor-receipt-pdf', () => ({
  DoctorReceiptPDF: () => null,
}));
jest.mock('@react-pdf/renderer', () => ({ pdf: jest.fn() }));
jest.mock('@/features/medical-records/components/medical-records-create-panel', () => ({
  MedicalRecordsCreatePanel: () => null,
}));

beforeEach(() =>
  server.use(
    http.get('*/patients', () => HttpResponse.json({ data: [patientMariaFixture] })),
    http.get('*/doctors', () => HttpResponse.json({ data: paymentFormDoctors })),
    http.get('*/doctors/:id/services', ({ params }) =>
      HttpResponse.json(params.id === 'doctor-b' ? secondDoctorServices : paymentFormServices),
    ),
    http.get('*/payments', () =>
      HttpResponse.json({ data: paymentsFixture, meta: { total: 4, totalPages: 1 } }),
    ),
  ),
);
const submit = () => screen.getByRole('button', { name: 'Registrar pago' });
it('requires a nonblank mobile payment reference and allows blank after changing method', async () => {
  const bodies: unknown[] = [];
  server.use(
    http.post('*/payments', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(paymentsFixture[0]);
    }),
  );
  const result = renderWithClient(<PaymentForm onClose={jest.fn()} />);
  await fill(result);
  await result.user.selectOptions(screen.getByDisplayValue('Efectivo USD'), 'PAGO_MOVIL');
  await result.user.type(screen.getByPlaceholderText('Referencia requerida'), '   ');
  await result.user.click(submit());
  expect(await screen.findByText('Referencia requerida para Pago Móvil')).toBeVisible();
  expect(bodies).toEqual([]);
  await result.user.selectOptions(screen.getByDisplayValue('Pago Móvil'), 'CASH_USD');
  await result.user.click(submit());
  await waitFor(() => expect(bodies).toHaveLength(1));
});
async function fill({ user }: RenderWithClientResult) {
  await screen.findByRole('option', { name: /María González/ });
  await user.selectOptions(screen.getByLabelText('Paciente'), 'patient-maria');
  await user.selectOptions(screen.getByLabelText('Doctor'), 'doctor-ana');
  await user.click(await screen.findByRole('button', { name: /Consulta general —/ }));
  await user.type(screen.getByLabelText('Tasa BCV (Bs/USD)'), '40');
  fireEvent.change(screen.getByLabelText('Fecha y hora de la consulta'), {
    target: { value: '2026-10-15T23:45' },
  });
  await user.clear(screen.getByPlaceholderText('0.00'));
  await user.type(screen.getByPlaceholderText('0.00'), '60');
}

it('exige selecciones, fecha, tasa y monto sin POST inválido', async () => {
  const bodies: unknown[] = [];
  server.use(
    http.post('*/payments', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(paymentsFixture[0]);
    }),
  );
  const result = renderWithClient(<PaymentForm onClose={jest.fn()} />);
  await screen.findByRole('option', { name: /María González/ });
  await result.user.click(submit());
  expect(await screen.findByText('Selecciona un paciente')).toBeVisible();
  expect(screen.getByText('Selecciona un doctor')).toBeVisible();
  await fill(result);
  await result.user.click(screen.getByRole('button', { name: /Consulta general —/ }));
  await result.user.click(submit());
  expect(await screen.findByText('Selecciona al menos un servicio')).toBeVisible();
  await result.user.click(screen.getByRole('button', { name: /Consulta general —/ }));
  for (const [label, value] of [
    ['Fecha y hora de la consulta', ''],
    ['Tasa BCV (Bs/USD)', '0'],
  ] as const) {
    const input = screen.getByLabelText(label);
    const old = (input as HTMLInputElement).value;
    fireEvent.change(input, { target: { value } });
    await result.user.click(submit());
    fireEvent.change(input, { target: { value: old } });
  }
  await result.user.clear(screen.getByPlaceholderText('0.00'));
  await result.user.type(screen.getByPlaceholderText('0.00'), '-1');
  await result.user.click(submit());
  expect(await screen.findByText('Monto debe ser positivo')).toBeVisible();
  expect(bodies).toEqual([]);
});

it('envía IDs/fecha UTC y líneas elegidas sin recalcular autoridad financiera', async () => {
  const bodies: CreatePaymentDto[] = [];
  server.use(
    http.post('*/payments', async ({ request }) => {
      bodies.push((await request.json()) as CreatePaymentDto);
      return HttpResponse.json(paymentsFixture[0]);
    }),
  );
  const closed = jest.fn();
  const result = renderWithClient(<PaymentForm onClose={closed} />);
  await fill(result);
  await result.user.click(screen.getByRole('button', { name: /Control —/ }));
  expect(screen.getByText(/Total servicios:/)).toHaveTextContent('85,00');
  await result.user.click(screen.getByRole('button', { name: 'Agregar línea' }));
  await result.user.selectOptions(
    screen.getAllByDisplayValue('Efectivo USD')[1] as HTMLElement,
    'PAGO_MOVIL',
  );
  await result.user.selectOptions(screen.getAllByDisplayValue('USD')[1] as HTMLElement, 'VES');
  await result.user.type(screen.getAllByPlaceholderText('0.00')[1] as HTMLElement, '1000');
  await result.user.type(screen.getByPlaceholderText('Referencia requerida'), 'REF-2');
  await result.user.click(screen.getByRole('button', { name: 'Agregar línea' }));
  await result.user.click(screen.getByRole('button', { name: 'Eliminar línea 3' }));
  await result.user.click(submit());
  await waitFor(() => expect(closed).toHaveBeenCalledTimes(1));
  expect(bodies).toEqual([
    {
      patientId: 'patient-maria',
      bcvExchangeRate: 40,
      consultationDate: '2026-10-16T03:45:00.000Z',
      idempotencyKey: expect.any(String),
      item: {
        itemType: 'CONSULTATION',
        doctorId: 'doctor-ana',
        doctorServiceIds: ['ds-1', 'ds-extra'],
        description: 'Consulta - Consulta general, Control',
      },
      paymentLines: [
        { paymentMethod: 'CASH_USD', currency: 'USD', amount: 60, referenceNumber: '' },
        { paymentMethod: 'PAGO_MOVIL', currency: 'VES', amount: 1000, referenceNumber: 'REF-2' },
      ],
    },
  ]);
});

it('limpia servicios al cambiar doctor aun con respuesta demorada', async () => {
  const bodies: CreatePaymentDto[] = [];
  let release!: () => void;
  server.use(
    http.get('*/doctors/doctor-b/services', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return HttpResponse.json(secondDoctorServices);
    }),
    http.post('*/payments', async ({ request }) => {
      bodies.push((await request.json()) as CreatePaymentDto);
      return HttpResponse.json(paymentsFixture[0]);
    }),
  );
  const result = renderWithClient(<PaymentForm onClose={jest.fn()} />);
  await fill(result);
  await result.user.selectOptions(screen.getByLabelText('Doctor'), 'doctor-b');
  await waitFor(() => expect(release).toBeDefined());
  expect(submit()).toBeDisabled();
  expect(
    screen.queryByText('No hay servicios disponibles para este doctor'),
  ).not.toBeInTheDocument();
  release();
  await screen.findByRole('button', { name: /Consulta Bruno —/ });
  await result.user.click(submit());
  expect(await screen.findByText('Selecciona al menos un servicio')).toBeVisible();
  expect(bodies).toEqual([]);
  await result.user.click(screen.getByRole('button', { name: /Consulta Bruno —/ }));
  await result.user.click(submit());
  await waitFor(() => expect(bodies).toHaveLength(1));
  expect(bodies[0]?.item).toEqual({
    itemType: 'CONSULTATION',
    doctorId: 'doctor-b',
    doctorServiceIds: ['ds-b'],
    description: 'Consulta - Consulta Bruno',
  });
});

it.each(['patients', 'doctors', 'doctors/doctor-ana/services'])(
  'distingue fallo HTTP %s de vacío y bloquea envío',
  async (path) => {
    const result = renderWithClient(<PaymentForm onClose={jest.fn()} />);
    await fill(result);
    server.use(
      http.get(`*/${path}`, () =>
        HttpResponse.json({ message: 'Catálogo no disponible' }, { status: 503 }),
      ),
    );
    await act(async () => {
      await result.queryClient.invalidateQueries({
        queryKey: [
          path === 'patients'
            ? 'patients'
            : path === 'doctors'
              ? 'doctors'
              : 'doctor-service-prices',
        ],
      });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Catálogo no disponible');
    expect(submit()).toBeDisabled();
    expect(
      screen.queryByText('No hay servicios disponibles para este doctor'),
    ).not.toBeInTheDocument();
  },
);

it('padre y formulario conservan POST pendiente; rechazo permite segundo HTTP y éxito invalida caché', async () => {
  const bodies: CreatePaymentDto[] = [];
  let release!: () => void;
  server.use(
    http.post('*/payments', async ({ request }) => {
      bodies.push((await request.json()) as CreatePaymentDto);
      if (bodies.length === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ message: 'Pago rechazado' }, { status: 503 });
      }
      return HttpResponse.json(paymentsFixture[0]);
    }),
  );
  const result = renderWithClient(<PagosPage />);
  await result.user.click(screen.getByRole('button', { name: 'Nuevo pago' }));
  await fill(result);
  result.queryClient.setQueryDefaults(['consultations'], { gcTime: Infinity });
  result.queryClient.setQueryData(['consultations'], []);
  await result.user.click(submit());
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await result.user.click(screen.getByRole('button', { name: 'Cancelar' }));
  await result.user.keyboard('{Escape}');
  expect(submit()).toBeDisabled();
  await result.user.click(submit());
  expect(bodies).toHaveLength(1);
  release();
  expect(await screen.findByRole('alert')).toHaveTextContent('Pago rechazado');
  expect(screen.getByLabelText('Paciente')).toHaveValue('patient-maria');
  await result.user.click(submit());
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument(),
  );
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual({ ...bodies[0], idempotencyKey: expect.any(String) });
  expect(result.queryClient.getQueryState(['consultations'])?.isInvalidated).toBe(true);
});

it('muestra servicios vacíos válidos y exige nueva selección al cambiar doctor', async () => {
  const bodies: unknown[] = [];
  server.use(
    http.get('*/doctors/doctor-b/services', () => HttpResponse.json([])),
    http.post('*/payments', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(paymentsFixture[0]);
    }),
  );
  const result = renderWithClient(<PaymentForm onClose={jest.fn()} />);
  await fill(result);
  await result.user.selectOptions(screen.getByLabelText('Doctor'), 'doctor-b');
  expect(await screen.findByText('No hay servicios disponibles para este doctor')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  await result.user.click(submit());
  expect(await screen.findByText('Selecciona al menos un servicio')).toBeVisible();
  expect(bodies).toEqual([]);
});
