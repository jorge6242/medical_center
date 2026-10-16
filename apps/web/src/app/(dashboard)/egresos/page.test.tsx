import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expensesFixture, voidedExpenseFixture } from '@/test/fixtures/expenses.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import EgresosPage from './page';

// Solo alta de egresos B fuera de A; listado/detalle/anulación/HTTP reales.
jest.mock('@/features/expenses/components/expense-form', () => ({ ExpenseForm: () => null }));
const list = () => HttpResponse.json({ data: expensesFixture, meta: { total: 14, totalPages: 2 } });
beforeEach(() => server.use(http.get('*/expenses', list)));
const row = (id: string) => screen.getByRole('row', { name: new RegExp(`Egreso ${id}`) });
const confirm = () => screen.getByRole('button', { name: 'Confirmar anulación' });
async function openVoid(id = 'two') {
  const result = renderWithClient(<EgresosPage />);
  await screen.findByText('Egreso two');
  await result.user.click(within(row(id)).getByRole('button', { name: 'Anular' }));
  return result;
}
it('caché fallida no aparenta listado válido ni vacío', async () => {
  const { queryClient } = renderWithClient(<EgresosPage />);
  await screen.findByText('Egreso one');
  server.use(
    http.get('*/expenses', () => HttpResponse.json({ message: 'Egresos caídos' }, { status: 503 })),
  );
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['expenses'] });
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('Egresos caídos');
  expect(screen.queryByText('Egreso one')).not.toBeInTheDocument();
  expect(screen.queryByText('No hay datos para mostrar')).not.toBeInTheDocument();
  server.use(
    http.get('*/expenses', () =>
      HttpResponse.json({ data: [], meta: { total: 0, totalPages: 0 } }),
    ),
  );
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['expenses'] });
  });
  expect(await screen.findByText('No hay datos para mostrar')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('carga retenida no muestra vacío hasta resolver HTTP', async () => {
  let release!: () => void;
  server.use(
    http.get('*/expenses', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return list();
    }),
  );
  renderWithClient(<EgresosPage />);
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.queryByText('No hay datos para mostrar')).not.toBeInTheDocument();
  release();
  expect(await screen.findByText('Egreso one')).toBeVisible();
});
it('busca con parámetros reales y reinicia la página', async () => {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get('*/expenses', ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return list();
    }),
  );
  const { user } = renderWithClient(<EgresosPage />);
  await screen.findByText('Egreso one');
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(requests.at(-1)?.get('page')).toBe('2'));
  await user.type(screen.getByPlaceholderText('Buscar por categoría o descripción…'), 'Insumos');
  await waitFor(() => expect(requests.at(-1)?.get('search')).toBe('Insumos'));
  expect(requests.at(-1)?.get('page')).toBe('1');
  expect(requests.at(-1)?.get('limit')).toBe('10');
});
it.each(['one', 'void'])('detalle de %s conserva snapshot y acciones según estado', async (id) => {
  const { user } = renderWithClient(<EgresosPage />);
  await screen.findByText('Egreso one');
  expect(within(row('void')).queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument();
  await user.click(within(row(id)).getByRole('button', { name: 'Ver' }));
  expect(screen.getAllByText(`Categoría histórica ${id}`)).toHaveLength(2);
  expect(screen.getAllByText(`Egreso ${id}`)).toHaveLength(2);
  expect(screen.getAllByText('Categoría histórica two')).toHaveLength(1);
  if (id === 'void') expect(screen.getByText('Duplicado histórico')).toBeVisible();
  if (id === 'one') {
    expect(screen.getByText(/Bs.*1\.000,00/)).toBeVisible();
    expect(screen.getAllByText(/USD\s25,00/)).toHaveLength(2);
  }
});
it.each(['', '   ', 'abcd'])('motivo inválido %j no envía HTTP', async (reason) => {
  const requests: unknown[] = [];
  server.use(
    http.post('*/expenses/:id/void', async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json(expensesFixture[0]);
    }),
  );
  const { user } = await openVoid();
  if (reason) await user.type(screen.getByRole('textbox', { name: 'Motivo' }), reason);
  expect(confirm()).toBeDisabled();
  await user.click(confirm());
  expect(requests).toEqual([]);
});
it.each(['one', 'two'])(
  'anulación %s conserva contexto pendiente/rechazado y reintenta HTTP correcto',
  async (id) => {
    const requests: { id: string; body: unknown }[] = [];
    let release!: () => void;
    let voided = false;
    let reads = 0;
    server.use(
      http.get('*/expenses', () => {
        reads++;
        return HttpResponse.json({
          data: expensesFixture.map((e) =>
            e.id === `expense-${id}` && voided ? { ...e, status: 'VOIDED' } : e,
          ),
          meta: { total: 3, totalPages: 1 },
        });
      }),
      http.post('*/expenses/:id/void', async ({ request, params }) => {
        requests.push({ id: String(params.id), body: await request.json() });
        if (requests.length === 1) {
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          return HttpResponse.json({ message: 'Anulación rechazada' }, { status: 503 });
        }
        voided = true;
        return HttpResponse.json(voidedExpenseFixture(String(params.id), 'Corrección válida'));
      }),
    );
    const { user } = await openVoid(id);
    const before = reads;
    await user.type(screen.getByRole('textbox', { name: 'Motivo' }), '  Duplicado  ');
    await user.click(confirm());
    await waitFor(() => expect(release).toBeDefined());
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Motivo' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.keyboard('{Escape}');
    await user.click(
      within(row(id === 'one' ? 'two' : 'one')).getByRole('button', { name: 'Anular' }),
    );
    await user.click(confirm());
    expect(requests).toHaveLength(1);
    release();
    expect(await screen.findByRole('alert')).toHaveTextContent('Anulación rechazada');
    expect(screen.getByRole('textbox', { name: 'Motivo' })).toHaveValue('  Duplicado  ');
    await user.clear(screen.getByRole('textbox', { name: 'Motivo' }));
    await user.type(screen.getByRole('textbox', { name: 'Motivo' }), 'Corrección válida');
    await user.click(confirm());
    await waitFor(() => expect(screen.queryByText('Anular egreso')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(within(row(id)).queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument(),
    );
    expect(reads).toBeGreaterThan(before);
    expect(requests).toEqual([
      { id: `expense-${id}`, body: { reason: 'Duplicado' } },
      { id: `expense-${id}`, body: { reason: 'Corrección válida' } },
    ]);
  },
);
it('error anterior no contamina nueva selección y nuevo HTTP usa nuevo egreso', async () => {
  const ids: string[] = [];
  server.use(
    http.post('*/expenses/:id/void', ({ params }) => {
      ids.push(String(params.id));
      return ids.length === 1
        ? HttpResponse.json({ message: 'Error anterior' }, { status: 503 })
        : HttpResponse.json(voidedExpenseFixture(String(params.id), 'Ajuste nuevo'));
    }),
  );
  const { user } = await openVoid();
  await user.type(screen.getByRole('textbox', { name: 'Motivo' }), 'Duplicado');
  await user.click(confirm());
  expect(await screen.findByRole('alert')).toHaveTextContent('Error anterior');
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  await user.click(within(row('one')).getByRole('button', { name: 'Anular' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Motivo' })).toHaveValue('');
  await user.type(screen.getByRole('textbox', { name: 'Motivo' }), 'Ajuste nuevo');
  await user.click(confirm());
  await waitFor(() => expect(screen.queryByText('Anular egreso')).not.toBeInTheDocument());
  expect(ids).toEqual(['expense-two', 'expense-one']);
});
