import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import EgresosPage from '@/app/(dashboard)/egresos/page';
import {
  expenseCategoriesFixture,
  createdExpenseFixture,
} from '@/test/fixtures/expense-form.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { ExpenseForm } from './expense-form';

// Sin mocks de UI/hooks/services: formulario y padre reales.
const category = '22222222-2222-4222-8222-222222222222';
const submit = () => screen.getByRole('button', { name: 'Registrar egreso' });
const catalog = () => HttpResponse.json(expenseCategoriesFixture);
beforeEach(() =>
  server.use(
    http.get('*/expenses/categories', catalog),
    http.get('*/expenses', () =>
      HttpResponse.json({ data: [], meta: { total: 0, totalPages: 0 } }),
    ),
  ),
);
async function fill(
  user: ReturnType<typeof renderWithClient>['user'],
  description = 'Compra nueva',
) {
  await screen.findByRole('option', { name: 'Servicios' });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Categoría' }), category);
  await user.type(screen.getByRole('textbox', { name: 'Descripción' }), description);
  await user.type(screen.getByRole('spinbutton', { name: 'Monto USD' }), '0.29');
}
it.each([
  ['OK', ''],
  ['X'.repeat(200), '6.17'],
])(
  'descripción válida límite y Bs %j envían valores precisos sin inventar opcionales',
  async (description, bs) => {
    const bodies: unknown[] = [];
    const close = jest.fn();
    server.use(
      http.post('*/expenses', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(createdExpenseFixture);
      }),
    );
    const { user } = renderWithClient(<ExpenseForm onClose={close} />);
    await fill(user, description);
    if (bs) await user.type(screen.getByRole('spinbutton', { name: 'Monto Bs (opcional)' }), bs);
    await user.click(submit());
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(bodies).toEqual([
      { categoryId: category, description, amountUsd: 0.29, ...(bs ? { amountBs: 6.17 } : {}) },
    ]);
  },
);
it.each([
  ['Categoría', '', 'Selecciona una categoría'],
  ['Descripción', 'X', 'Descripción muy corta'],
  ['Descripción', 'X'.repeat(201), 'Descripción demasiado larga'],
  ['Monto USD', '-1', 'Monto USD requerido'],
  ['Monto USD', '0.001', 'Usa como máximo 2 decimales'],
  ['Monto Bs (opcional)', '-1', 'Monto Bs debe ser positivo'],
  ['Monto Bs (opcional)', '0.001', 'Usa como máximo 2 decimales'],
])('rechaza %s inválido mediante validación antes de HTTP', async (label, value, message) => {
  const bodies: unknown[] = [];
  server.use(
    http.post('*/expenses', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(createdExpenseFixture);
    }),
  );
  const { user } = renderWithClient(<ExpenseForm onClose={jest.fn()} />);
  await fill(user);
  await user.type(screen.getByRole('spinbutton', { name: 'Monto Bs (opcional)' }), '1');
  const input = screen.getByLabelText(label);
  if (label === 'Categoría') await user.selectOptions(input, value);
  if (label !== 'Categoría') {
    await user.clear(input);
    await user.type(input, value);
  }
  // Ejercita Zod incluso cuando step nativo impediría llegar al submit del navegador.
  const form = submit().closest('form');
  if (!form) throw new Error('Formulario ausente');
  fireEvent.submit(form);
  expect(await screen.findByText(message)).toBeVisible();
  expect(bodies).toEqual([]);
});
it('catálogo pendiente/error cacheado bloquea alta sin falso vacío y se recupera', async () => {
  const bodies: unknown[] = [];
  let release!: () => void;
  server.use(
    http.post('*/expenses', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(createdExpenseFixture);
    }),
  );
  const { user, queryClient } = renderWithClient(<ExpenseForm onClose={jest.fn()} />);
  await fill(user);
  server.use(
    http.get('*/expenses/categories', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return HttpResponse.json({ message: 'Categorías caídas' }, { status: 503 });
    }),
  );
  let refresh!: Promise<void>;
  act(() => {
    refresh = queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
  });
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.getByRole('status')).toHaveTextContent('Cargando');
  expect(screen.queryByRole('button', { name: 'Registrar egreso' })).not.toBeInTheDocument();
  release();
  await act(async () => {
    await refresh;
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('Categorías caídas');
  expect(screen.queryByText('No hay categorías disponibles')).not.toBeInTheDocument();
  expect(bodies).toEqual([]);
  server.use(http.get('*/expenses/categories', catalog));
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
  });
  await user.click(submit());
  await waitFor(() => expect(bodies).toHaveLength(1));
  expect(bodies).toEqual([{ categoryId: category, description: 'Compra nueva', amountUsd: 0.29 }]);
});
it('error inicial y vacío válido son distintos y ninguno permite crear', async () => {
  server.use(
    http.get('*/expenses/categories', () =>
      HttpResponse.json({ message: 'Sin conexión' }, { status: 503 }),
    ),
  );
  const { queryClient } = renderWithClient(<ExpenseForm onClose={jest.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  server.use(http.get('*/expenses/categories', () => HttpResponse.json([])));
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
  });
  expect(await screen.findByText('No hay categorías disponibles')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Registrar egreso' })).not.toBeInTheDocument();
});
it('POST pendiente conserva contexto al cerrar; rechazo permite segundo HTTP y fila nueva', async () => {
  const bodies: unknown[] = [];
  let release!: () => void;
  let created = false;
  let reads = 0;
  server.use(
    http.get('*/expenses', () => {
      reads++;
      return HttpResponse.json({
        data: created ? [createdExpenseFixture] : [],
        meta: { total: created ? 1 : 0, totalPages: created ? 1 : 0 },
      });
    }),
    http.post('*/expenses', async ({ request }) => {
      bodies.push(await request.json());
      if (bodies.length === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ message: 'Alta rechazada' }, { status: 503 });
      }
      created = true;
      return HttpResponse.json(createdExpenseFixture);
    }),
  );
  const { user } = renderWithClient(<EgresosPage />);
  await user.click(screen.getByRole('button', { name: 'Nuevo egreso' }));
  await fill(user);
  const before = reads;
  await user.click(submit());
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  await user.keyboard('{Escape}');
  await user.click(screen.getByRole('button', { name: 'Nuevo egreso' }));
  expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue('Compra nueva');
  await user.click(submit());
  expect(bodies).toHaveLength(1);
  release();
  expect(await screen.findByRole('alert')).toHaveTextContent('Alta rechazada');
  expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveValue(category);
  await user.click(submit());
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Registrar egreso' })).not.toBeInTheDocument(),
  );
  expect(await screen.findByText('Compra nueva')).toBeVisible();
  expect(reads).toBeGreaterThan(before);
  expect(bodies).toEqual(
    Array(2).fill({ categoryId: category, description: 'Compra nueva', amountUsd: 0.29 }),
  );
  await user.click(screen.getByRole('button', { name: 'Nuevo egreso' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue('');
});
