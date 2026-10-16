import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { paymentsFixture } from '@/test/fixtures/payments.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import PagosPage from './page';

// Límites de bloques B/C e informe médico: no acreditan sus comportamientos.
jest.mock('@/features/payments/components/payment-form', () => ({ PaymentForm: () => null }));
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

const list = () => HttpResponse.json({ data: paymentsFixture, meta: { total: 14, totalPages: 2 } });
beforeEach(() => server.use(http.get('*/payments', list)));
const row = (id: string) => screen.getByRole('row', { name: new RegExp(`Paciente ${id}`) });
async function openAdjustment() {
  const result = renderWithClient(<PagosPage />);
  await screen.findByText('Paciente pay-two');
  await result.user.click(within(row('pay-two')).getByRole('button', { name: 'Ajustes' }));
  return result;
}

it('distingue error de listado, caché fallida y vacío válido', async () => {
  const { queryClient } = renderWithClient(<PagosPage />);
  await screen.findByText('Paciente pay-one');
  server.use(
    http.get('*/payments', () =>
      HttpResponse.json({ message: 'Pagos no disponibles' }, { status: 503 }),
    ),
  );
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['payments'] });
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('Pagos no disponibles');
  expect(screen.queryByText('Paciente pay-one')).not.toBeInTheDocument();
  expect(screen.queryByText('No hay datos para mostrar')).not.toBeInTheDocument();
  server.use(
    http.get('*/payments', () =>
      HttpResponse.json({ data: [], meta: { total: 0, totalPages: 0 } }),
    ),
  );
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['payments'] });
  });
  expect(await screen.findByText('No hay datos para mostrar')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('no presenta vacío mientras carga', async () => {
  let release!: () => void;
  server.use(
    http.get('*/payments', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return list();
    }),
  );
  renderWithClient(<PagosPage />);
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.queryByText('No hay datos para mostrar')).not.toBeInTheDocument();
  release();
  expect(await screen.findByText('Paciente pay-one')).toBeVisible();
});

it('envía búsqueda/estado y reinicia página en cada filtro', async () => {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get('*/payments', ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return list();
    }),
  );
  const { user } = renderWithClient(<PagosPage />);
  await screen.findByText('Paciente pay-one');
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(requests.at(-1)?.get('page')).toBe('2'));
  await user.selectOptions(screen.getByRole('combobox'), 'VOIDED');
  await waitFor(() => expect(requests.at(-1)?.get('status')).toBe('VOIDED'));
  expect(requests.at(-1)?.get('page')).toBe('1');
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(requests.at(-1)?.get('page')).toBe('2'));
  await user.type(screen.getByPlaceholderText('Buscar por paciente o descripción…'), 'Ana');
  await waitFor(() => expect(requests.at(-1)?.get('search')).toBe('Ana'));
  expect(requests.at(-1)?.get('page')).toBe('1');
  expect(requests.at(-1)?.get('status')).toBe('VOIDED');
  expect(requests.at(-1)?.get('limit')).toBe('10');
});

it('restringe acciones al estado y tipo recibido', async () => {
  renderWithClient(<PagosPage />);
  await screen.findByText('Paciente pay-one');
  for (const id of ['pay-void', 'pay-processing'])
    expect(within(row(id)).queryByRole('button')).not.toBeInTheDocument();
  for (const id of ['pay-one', 'pay-two']) {
    expect(within(row(id)).getByRole('button', { name: 'Anular' })).toBeVisible();
    expect(within(row(id)).getByRole('button', { name: 'Ajustes' })).toBeVisible();
  }
  expect(within(row('pay-two')).queryByRole('button', { name: 'Ver' })).not.toBeInTheDocument();
  expect(within(row('pay-one')).getByRole('button', { name: 'Ver' })).toBeVisible();
});

it.each(['description', 'amount'])('bloquea ajuste inválido %s sin HTTP', async (field) => {
  const bodies: unknown[] = [];
  server.use(
    http.post('*/payments/:id/adjustments', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(paymentsFixture[1]);
    }),
  );
  const { user } = await openAdjustment();
  if (field === 'amount') {
    await user.type(screen.getByLabelText('Descripción'), 'Corrección');
    await user.clear(screen.getByLabelText('Monto USD'));
    await user.type(screen.getByLabelText('Monto USD'), '-1');
  }
  await user.click(screen.getByRole('button', { name: 'Guardar ajuste' }));
  expect(
    await screen.findByText(field === 'description' ? 'Descripción requerida' : 'Monto requerido'),
  ).toBeVisible();
  expect(bodies).toEqual([]);
});

it('ajuste conserva datos tras rechazo y reintenta ID/body exactos; éxito actualiza listado', async () => {
  const requests: { id: string; body: unknown }[] = [];
  let finish!: () => void;
  server.use(
    http.post('*/payments/:id/adjustments', async ({ params, request }) => {
      requests.push({ id: String(params.id), body: await request.json() });
      if (requests.length === 1) {
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        return HttpResponse.json({ message: 'Ajuste rechazado' }, { status: 503 });
      }
      server.use(
        http.get('*/payments', () =>
          HttpResponse.json({
            data: paymentsFixture.map((p) =>
              p.id === 'pay-two' ? { ...p, totalPaidUsdEquivalent: '32.50' } : p,
            ),
            meta: { total: 4, totalPages: 1 },
          }),
        ),
      );
      return HttpResponse.json(paymentsFixture[1]);
    }),
  );
  const { user } = await openAdjustment();
  await user.type(screen.getByLabelText('Descripción'), 'Corrección');
  await user.clear(screen.getByLabelText('Monto USD'));
  await user.type(screen.getByLabelText('Monto USD'), '7.50');
  await user.click(screen.getByRole('button', { name: 'Guardar ajuste' }));
  await waitFor(() => expect(finish).toBeDefined());
  expect(screen.getByRole('button', { name: 'Guardar ajuste' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  await user.keyboard('{Escape}');
  await user.click(within(row('pay-one')).getByRole('button', { name: 'Ajustes' }));
  await user.click(within(row('pay-two')).getByRole('button', { name: 'Ajustes' }));
  expect(screen.getByText('Pago pay-two…')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Guardar ajuste' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Guardar ajuste' }));
  expect(requests).toHaveLength(1);
  finish();
  expect(await screen.findByRole('alert')).toHaveTextContent('Ajuste rechazado');
  expect(screen.getByLabelText('Descripción')).toHaveValue('Corrección');
  await user.click(screen.getByRole('button', { name: 'Guardar ajuste' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Guardar ajuste' })).not.toBeInTheDocument(),
  );
  await waitFor(() => expect(row('pay-two')).toHaveTextContent('32,50'));
  expect(requests).toEqual(
    Array(2).fill({ id: 'pay-two', body: { description: 'Corrección', amountUsd: 7.5 } }),
  );
});

it.each(['pay-one', 'pay-two'])(
  'anulación %s bloquea doble envío, muestra fallo y segundo HTTP actualiza estado',
  async (id) => {
    const ids: string[] = [];
    let finish!: () => void;
    server.use(
      http.post('*/payments/:id/void', async ({ params, request }) => {
        ids.push(String(params.id));
        expect(await request.text()).toBe('');
        if (ids.length === 1) {
          await new Promise<void>((resolve) => {
            finish = resolve;
          });
          return HttpResponse.json({ message: 'Anulación rechazada' }, { status: 503 });
        }
        server.use(
          http.get('*/payments', () =>
            HttpResponse.json({
              data: paymentsFixture.map((p) => (p.id === id ? { ...p, status: 'VOIDED' } : p)),
              meta: { total: 4, totalPages: 1 },
            }),
          ),
        );
        return HttpResponse.json({ ...paymentsFixture[0], id, status: 'VOIDED' });
      }),
    );
    const { user } = renderWithClient(<PagosPage />);
    await screen.findByText(`Paciente ${id}`);
    await user.click(within(row(id)).getByRole('button', { name: 'Anular' }));
    await waitFor(() => expect(finish).toBeDefined());
    expect(within(row(id)).getByRole('button', { name: 'Anular' })).toBeDisabled();
    await user.click(within(row(id)).getByRole('button', { name: 'Anular' }));
    expect(ids).toEqual([id]);
    finish();
    expect(await screen.findByRole('alert')).toHaveTextContent('Anulación rechazada');
    await user.click(within(row(id)).getByRole('button', { name: 'Anular' }));
    await waitFor(() =>
      expect(within(row(id)).queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument(),
    );
    expect(row(id)).toHaveTextContent('Anulado');
    expect(ids).toEqual([id, id]);
  },
);

it('no arrastra el error de ajuste al abrir otro pago y envía su ID', async () => {
  const ids: string[] = [];
  server.use(
    http.post('*/payments/:id/adjustments', ({ params }) => {
      ids.push(String(params.id));
      return ids.length === 1
        ? HttpResponse.json({ message: 'Rechazo anterior' }, { status: 503 })
        : HttpResponse.json(paymentsFixture[0]);
    }),
  );
  const { user } = await openAdjustment();
  await user.type(screen.getByLabelText('Descripción'), 'Corrección');
  await user.click(screen.getByRole('button', { name: 'Guardar ajuste' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Rechazo anterior');
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  await user.click(within(row('pay-one')).getByRole('button', { name: 'Ajustes' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Guardar ajuste' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Guardar ajuste' })).not.toBeInTheDocument(),
  );
  expect(ids).toEqual(['pay-two', 'pay-one']);
});
