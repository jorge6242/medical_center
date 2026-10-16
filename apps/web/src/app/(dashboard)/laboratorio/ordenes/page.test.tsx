import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { LabOrderDetail } from '@/features/lab-orders/services/lab-orders.service';
import { labDetailFixture, labOrdersFixture } from '@/test/fixtures/lab-orders.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import OrdenesPage from './page';

// Límites B/C explícitos: no acredita creación ni cobro internos.
jest.mock('@/features/lab-orders/components/lab-order-form', () => ({ LabOrderForm: () => null }));
jest.mock('@/features/lab-orders/components/lab-payment-form', () => ({
  LabPaymentForm: ({ order }: { order: LabOrderDetail }) => (
    <div role="status">
      Cobrar {order.id}: {order.patient.name}
    </div>
  ),
}));
const list = () =>
  HttpResponse.json({ data: labOrdersFixture, meta: { total: 14, totalPages: 2 } });
beforeEach(() =>
  server.use(
    http.get('*/lab-orders', list),
    http.get('*/lab-orders/:id', ({ params }) =>
      HttpResponse.json(labDetailFixture(String(params.id))),
    ),
  ),
);
const row = (id: string) => screen.getByRole('row', { name: new RegExp(`Paciente ${id}`) });
async function openOrder(id = 'two') {
  const result = renderWithClient(<OrdenesPage />);
  await screen.findByText('Paciente two');
  await result.user.click(within(row(id)).getByRole('button', { name: 'Pagar' }));
  return result;
}
it('distingue listado fallido con caché de vacío válido', async () => {
  const { queryClient } = renderWithClient(<OrdenesPage />);
  await screen.findByText('Paciente one');
  server.use(
    http.get('*/lab-orders', () =>
      HttpResponse.json({ message: 'Listado caído' }, { status: 503 }),
    ),
  );
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('Listado caído');
  expect(screen.queryByText('Paciente one')).not.toBeInTheDocument();
  expect(screen.queryByText('No hay datos para mostrar')).not.toBeInTheDocument();
  server.use(
    http.get('*/lab-orders', () =>
      HttpResponse.json({ data: [], meta: { total: 0, totalPages: 0 } }),
    ),
  );
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
  });
  expect(await screen.findByText('No hay datos para mostrar')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('no muestra vacío durante carga inicial', async () => {
  let release!: () => void;
  server.use(
    http.get('*/lab-orders', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return list();
    }),
  );
  renderWithClient(<OrdenesPage />);
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.queryByText('No hay datos para mostrar')).not.toBeInTheDocument();
  release();
  expect(await screen.findByText('Paciente one')).toBeVisible();
});
it('reinicia página con búsqueda/estado y mantiene parámetros HTTP', async () => {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get('*/lab-orders', ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return list();
    }),
  );
  const { user } = renderWithClient(<OrdenesPage />);
  await screen.findByText('Paciente one');
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(requests.at(-1)?.get('page')).toBe('2'));
  await user.selectOptions(screen.getByRole('combobox'), 'VOIDED');
  await waitFor(() => expect(requests.at(-1)?.get('status')).toBe('VOIDED'));
  expect(requests.at(-1)?.get('page')).toBe('1');
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(requests.at(-1)?.get('page')).toBe('2'));
  await user.type(screen.getByPlaceholderText('Buscar por paciente, documento, ID o test…'), 'Ana');
  await waitFor(() => expect(requests.at(-1)?.get('search')).toBe('Ana'));
  expect(requests.at(-1)?.get('page')).toBe('1');
  expect(requests.at(-1)?.get('status')).toBe('VOIDED');
  expect(requests.at(-1)?.get('limit')).toBe('10');
});
it('solo ofrece pagar pendientes y entrega al límite el detalle del ID seleccionado', async () => {
  const ids: string[] = [];
  server.use(
    http.get('*/lab-orders/:id', ({ params }) => {
      ids.push(String(params.id));
      return HttpResponse.json(labDetailFixture(String(params.id)));
    }),
  );
  const { user } = await openOrder();
  expect(await screen.findByRole('status')).toHaveTextContent('Cobrar lab-two: Detalle lab-two');
  expect(ids).toEqual(['lab-two']);
  for (const id of ['paid', 'void'])
    expect(within(row(id)).queryByRole('button')).not.toBeInTheDocument();
  await user.keyboard('{Escape}');
  await user.click(within(row('one')).getByRole('button', { name: 'Pagar' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Cobrar lab-one: Detalle lab-one');
  expect(ids).toEqual(['lab-two', 'lab-one']);
});
it('muestra fallo de detalle sin carga perpetua y reintenta el mismo HTTP', async () => {
  const ids: string[] = [];
  server.use(
    http.get('*/lab-orders/:id', ({ params }) => {
      ids.push(String(params.id));
      return ids.length === 1
        ? HttpResponse.json({ message: 'Detalle caído' }, { status: 503 })
        : HttpResponse.json(labDetailFixture(String(params.id)));
    }),
  );
  const { user } = await openOrder();
  expect(await screen.findByRole('alert')).toHaveTextContent('Detalle caído');
  expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Cobrar lab-two');
  expect(ids).toEqual(['lab-two', 'lab-two']);
});
it('bloquea detalle cacheado al refrescar y ante fallo, recupera solo con HTTP correcto', async () => {
  const { queryClient, user } = await openOrder();
  await screen.findByRole('status');
  let release!: () => void;
  server.use(
    http.get('*/lab-orders/lab-two', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return HttpResponse.json({ message: 'Detalle no vigente' }, { status: 503 });
    }),
  );
  let refresh!: Promise<void>;
  act(() => {
    refresh = queryClient.invalidateQueries({ queryKey: ['lab-orders', 'lab-two'], exact: true });
  });
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  release();
  await act(async () => {
    await refresh;
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('Detalle no vigente');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  server.use(
    http.get('*/lab-orders/lab-two', () => HttpResponse.json(labDetailFixture('lab-two'))),
  );
  await user.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Cobrar lab-two');
});
it.each(['PAID', 'VOIDED'])(
  'no cobra detalle recibido en estado %s aunque listado diga pendiente',
  async (status) => {
    server.use(
      http.get('*/lab-orders/:id', ({ params }) =>
        HttpResponse.json(labDetailFixture(String(params.id), status)),
      ),
    );
    await openOrder();
    expect(await screen.findByRole('alert')).toHaveTextContent('La orden ya no está pendiente');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  },
);
it('no cobra detalle con ID diferente del solicitado', async () => {
  server.use(http.get('*/lab-orders/:id', () => HttpResponse.json(labDetailFixture('lab-one'))));
  await openOrder();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'El detalle no corresponde a la orden seleccionada',
  );
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
