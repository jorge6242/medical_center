import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import OrdenesPage from '@/app/(dashboard)/laboratorio/ordenes/page';
import type { CreatePaymentDto } from '@/features/payments/services/payments.service';
import { labDetailFixture, labOrdersFixture } from '@/test/fixtures/lab-orders.fixture';
import { paymentsFixture } from '@/test/fixtures/payments.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { LabPaymentForm } from './lab-payment-form';

// Alta B fuera de C; cobro/página/Modal/HTTP reales.
jest.mock('@/features/lab-orders/components/lab-order-form', () => ({ LabOrderForm: () => null }));
const submit = () => screen.getByRole('button', { name: 'Completar pago' });
const rate = () => screen.getByRole('spinbutton', { name: 'Tasa BCV (Bs/USD)' });
const amount = () => screen.getByRole('spinbutton', { name: 'Monto' });
async function fill(user: ReturnType<typeof renderWithClient>['user']) {
  await user.type(await screen.findByRole('spinbutton', { name: 'Tasa BCV (Bs/USD)' }), '40');
  await user.click(screen.getByRole('button', { name: 'Max' }));
}
beforeEach(() =>
  server.use(
    http.get('*/lab-orders', () =>
      HttpResponse.json({ data: labOrdersFixture, meta: { total: 4, totalPages: 1 } }),
    ),
    http.get('*/lab-orders/:id', ({ params }) =>
      HttpResponse.json(labDetailFixture(String(params.id))),
    ),
  ),
);
it('tasa inválida, monto cero/parcial/negativo impiden POST', async () => {
  const bodies: unknown[] = [];
  server.use(
    http.post('*/payments', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(paymentsFixture[1]);
    }),
  );
  const { user } = renderWithClient(
    <LabPaymentForm order={labDetailFixture('lab-one')} onClose={jest.fn()} />,
  );
  expect(submit()).toBeDisabled();
  expect(amount()).toBeDisabled();
  await user.type(rate(), '0');
  expect(submit()).toBeDisabled();
  await user.clear(rate());
  await user.type(rate(), '40');
  expect(submit()).toBeDisabled();
  await user.clear(amount());
  await user.type(amount(), '-1');
  expect(submit()).toBeDisabled();
  await user.clear(amount());
  await user.type(amount(), '10');
  expect(submit()).toBeDisabled();
  await user.click(submit());
  expect(bodies).toEqual([]);
});
it.each([
  ['lab-one', 'ZELLE', 'USD', 25],
  ['lab-two', 'POS_BS', 'VES', 1000],
] as const)(
  'paga %s con %s y envía moneda/importe/IDs reales',
  async (id, method, currency, paid) => {
    const bodies: CreatePaymentDto[] = [];
    const close = jest.fn();
    server.use(
      http.post('*/payments', async ({ request }) => {
        bodies.push((await request.json()) as CreatePaymentDto);
        return HttpResponse.json(paymentsFixture[1]);
      }),
    );
    const { user } = renderWithClient(
      <LabPaymentForm order={labDetailFixture(id)} onClose={close} />,
    );
    await user.type(rate(), '40');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Método' }), method);
    expect(screen.getByRole('combobox', { name: 'Moneda' })).toHaveValue(currency);
    await user.click(screen.getByRole('button', { name: 'Max' }));
    expect(amount()).toHaveValue(paid);
    await user.click(submit());
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(bodies).toEqual([
      {
        patientId: `patient-${id}`,
        bcvExchangeRate: 40,
        idempotencyKey: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        item: {
          itemType: 'LAB',
          labOrderId: id,
          description: 'Laboratorio - Hematología histórica',
        },
        paymentLines: [{ paymentMethod: method, currency, amount: paid }],
      },
    ]);
  },
);
it('agrega y elimina líneas por acción accesible sin enviar línea removida', async () => {
  const bodies: CreatePaymentDto[] = [];
  server.use(
    http.post('*/payments', async ({ request }) => {
      bodies.push((await request.json()) as CreatePaymentDto);
      return HttpResponse.json(paymentsFixture[1]);
    }),
  );
  const { user } = renderWithClient(
    <LabPaymentForm order={labDetailFixture('lab-two')} onClose={jest.fn()} />,
  );
  await fill(user);
  await user.click(screen.getByRole('button', { name: 'Agregar' }));
  await user.click(screen.getByRole('button', { name: 'Eliminar línea de pago 1' }));
  expect(screen.getAllByRole('spinbutton', { name: 'Monto' })).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Max' }));
  await user.click(submit());
  await waitFor(() => expect(bodies).toHaveLength(1));
  expect(bodies[0]?.paymentLines).toEqual([
    { paymentMethod: 'CASH_USD', currency: 'USD', amount: 25 },
  ]);
});
it('POST pendiente conserva modal y selección; rechazo permite segundo POST y listado actualizado', async () => {
  const bodies: CreatePaymentDto[] = [];
  let release!: () => void;
  let paid = false;
  let reads = 0;
  server.use(
    http.get('*/lab-orders', () => {
      reads++;
      return HttpResponse.json({
        data: labOrdersFixture.map((item) =>
          item.id === 'lab-two' && paid ? { ...item, status: 'PAID' } : item,
        ),
        meta: { total: 4, totalPages: 1 },
      });
    }),
    http.post('*/payments', async ({ request }) => {
      bodies.push((await request.json()) as CreatePaymentDto);
      if (bodies.length === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ message: 'Cobro rechazado' }, { status: 503 });
      }
      paid = true;
      return HttpResponse.json(paymentsFixture[1]);
    }),
  );
  const { user } = renderWithClient(<OrdenesPage />);
  await user.click(
    within(await screen.findByRole('row', { name: /Paciente two/ })).getByRole('button', {
      name: 'Pagar',
    }),
  );
  await fill(user);
  const beforeSave = reads;
  await user.click(submit());
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  await user.keyboard('{Escape}');
  await user.click(
    within(screen.getByRole('row', { name: /Paciente one/ })).getByRole('button', {
      name: 'Pagar',
    }),
  );
  expect(screen.getByText('Detalle lab-two')).toBeVisible();
  await user.click(submit());
  expect(bodies).toHaveLength(1);
  release();
  expect(await screen.findByRole('alert')).toHaveTextContent('Cobro rechazado');
  expect(rate()).toHaveValue(40);
  expect(amount()).toHaveValue(25);
  await user.click(submit());
  await waitFor(() =>
    expect(screen.queryByText('Pagar orden de laboratorio')).not.toBeInTheDocument(),
  );
  await waitFor(() =>
    expect(
      within(screen.getByRole('row', { name: /Paciente two/ })).getByText('Pagada'),
    ).toBeVisible(),
  );
  expect(reads).toBeGreaterThan(beforeSave);
  expect(bodies).toHaveLength(2);
  expect(bodies.map(({ idempotencyKey: _key, ...body }) => body)).toEqual(
    Array(2).fill({
      patientId: 'patient-lab-two',
      bcvExchangeRate: 40,
      item: {
        itemType: 'LAB',
        labOrderId: 'lab-two',
        description: 'Laboratorio - Hematología histórica',
      },
      paymentLines: [{ paymentMethod: 'CASH_USD', currency: 'USD', amount: 25 }],
    }),
  );
});
it.each(['PAID', 'ERROR'])(
  'refetch de detalle %s durante POST no desmonta ni reinicia cobro pendiente',
  async (status) => {
    let release!: () => void;
    const bodies: unknown[] = [];
    server.use(
      http.post('*/payments', async ({ request }) => {
        bodies.push(await request.json());
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(paymentsFixture[1]);
      }),
    );
    const { user, queryClient } = renderWithClient(<OrdenesPage />);
    await user.click(
      within(await screen.findByRole('row', { name: /Paciente two/ })).getByRole('button', {
        name: 'Pagar',
      }),
    );
    await fill(user);
    await user.click(submit());
    await waitFor(() => expect(release).toBeDefined());
    server.use(
      http.get('*/lab-orders/lab-two', () =>
        status === 'ERROR'
          ? HttpResponse.json({ message: 'Detalle caído' }, { status: 503 })
          : HttpResponse.json(labDetailFixture('lab-two', status)),
      ),
    );
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['lab-orders', 'lab-two'], exact: true });
    });
    expect(rate()).toHaveValue(40);
    expect(amount()).toHaveValue(25);
    expect(submit()).toBeDisabled();
    expect(screen.getByText('Detalle lab-two')).toBeVisible();
    await user.keyboard('{Escape}');
    await user.click(submit());
    expect(bodies).toHaveLength(1);
    release();
    await waitFor(() =>
      expect(screen.queryByText('Pagar orden de laboratorio')).not.toBeInTheDocument(),
    );
  },
);
