import { QueryClientProvider } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { useAuthStore } from '@/stores/auth.store';
import { scheduledConsultationFixture } from '@/test/fixtures/consultations.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';

import { PatientConsultations } from './patient-consultations';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const api = 'http://localhost:3001';
const consultation = {
  ...scheduledConsultationFixture,
  patientId: 'a',
  totalUsd: '987654.32',
  services: [
    {
      serviceName: 'Servicio histórico',
      specialtyName: 'Especialidad histórica',
      priceUsd: '987654.32',
    },
  ],
};

const mount = () => renderWithClient(<PatientConsultations patientId="a" />);
const result = (data = [consultation]) =>
  HttpResponse.json({ data, meta: { total: 11, totalPages: 2 } });

beforeEach(() =>
  useAuthStore.setState({
    permissions: [
      { resource: 'patients', action: 'read' },
      { resource: 'consultations', action: 'read' },
    ],
  }),
);

it('solicita todas las consultas del paciente y muestra snapshots, atención real y enlaces sin importes', async () => {
  const requests: string[] = [];
  server.use(
    http.get(`${api}/*`, ({ request }) => {
      requests.push(new URL(request.url).pathname + new URL(request.url).search);
      return HttpResponse.json({
        data: (['SCHEDULED', 'PENDING', 'PAID', 'VOIDED'] as const).map((status) => ({
          ...consultation,
          id: status,
          status,
          attendedAt: status === 'PENDING' ? '2026-10-20T16:00:00Z' : null,
        })),
        meta: { total: 4, totalPages: 1 },
      });
    }),
  );
  mount();
  const table = await screen.findByRole('table');
  for (const state of ['Programada', 'Pendiente', 'Pagada', 'Anulada'])
    expect(within(table).getByText(state)).toBeInTheDocument();
  expect(within(table).getAllByText('Servicio histórico')).toHaveLength(4);
  expect(within(table).getAllByText('Especialidad histórica')).toHaveLength(4);
  expect(within(table).getAllByText(consultation.doctorName)).toHaveLength(4);
  expect(within(table).getAllByText('Sin atención registrada')).toHaveLength(3);
  expect(within(table).getByText(/Atendida:/)).toBeInTheDocument();
  expect(screen.queryByText(/987654/)).not.toBeInTheDocument();
  for (const state of ['SCHEDULED', 'PENDING', 'PAID', 'VOIDED'])
    expect(screen.getByRole('link', { name: `Ver consulta ${state}` })).toHaveAttribute(
      'href',
      `/consultas/${state}`,
    );
  expect(requests).toEqual(['/consultations?patientId=a&page=1&limit=10']);
});

it('pagina, filtra y cambia paciente sin mezclar datos', async () => {
  const queries: Record<string, string>[] = [];
  server.use(
    http.get(`${api}/consultations`, ({ request }) => {
      queries.push(Object.fromEntries(new URL(request.url).searchParams));
      const id = new URL(request.url).searchParams.get('patientId');
      return result([{ ...consultation, doctorName: `Doctor ${id}` }]);
    }),
  );
  const { user, queryClient, rerender } = mount();
  expect(await screen.findByRole('table')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(queries.at(-1)).toEqual({ patientId: 'a', page: '2', limit: '10' }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Estado de consulta' }), 'PAID');
  await waitFor(() =>
    expect(queries.at(-1)).toEqual({
      patientId: 'a',
      page: '1',
      limit: '10',
      status: 'PAID',
    }),
  );
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(queries.at(-1)?.['page']).toBe('2'));
  rerender(
    <QueryClientProvider client={queryClient}>
      <PatientConsultations patientId="b" />
    </QueryClientProvider>,
  );
  expect(screen.queryByText('Doctor a')).not.toBeInTheDocument();
  expect(await screen.findByText('Doctor b')).toBeInTheDocument();
  expect(queries.at(-1)).toEqual({ patientId: 'b', page: '1', limit: '10' });
  expect(screen.getByRole('combobox')).toHaveValue('');
});

it.each(['patients', 'consultations'])(
  'sin permiso %s no solicita historial ni simula vacío',
  async (resource) => {
    const allowed = resource === 'patients' ? 'consultations' : 'patients';
    useAuthStore.setState({
      permissions: [{ resource: allowed, action: 'read' }],
    });
    const requests: string[] = [];
    server.use(
      http.get(`${api}/*`, ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json({ data: [] });
      }),
    );
    const { queryClient } = mount();
    expect(screen.getByText('No tenés permiso para ver las consultas')).toBeInTheDocument();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(requests).toEqual([]);
    expect(screen.queryByText('Sin consultas registradas')).not.toBeInTheDocument();
  },
);

it('distingue carga pendiente de historial vacío', async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http.get(`${api}/consultations`, async () => {
      await pending;
      return HttpResponse.json({ data: [], meta: { total: 0, totalPages: 0 } });
    }),
  );
  mount();
  expect(screen.getByRole('status')).toHaveTextContent('Cargando consultas');
  expect(screen.queryByText('Sin consultas registradas')).not.toBeInTheDocument();
  release();
  expect(await screen.findByText('Sin consultas registradas')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

it('un error incluso con caché no presenta filas antiguas; reintenta realmente', async () => {
  let requests = 0;
  server.use(
    http.get(`${api}/consultations`, () => {
      requests++;
      return result();
    }),
  );
  const { queryClient, user } = mount();
  expect(await screen.findByRole('table')).toBeInTheDocument();
  server.use(
    http.get(`${api}/consultations`, () => {
      requests++;
      return HttpResponse.json({}, { status: 503 });
    }),
  );
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['consultations'] });
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las consultas');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  server.use(
    http.get(`${api}/consultations`, () => {
      requests++;
      return result();
    }),
  );
  await user.click(screen.getByRole('button', { name: 'Reintentar consultas' }));
  expect(await screen.findByRole('table')).toBeInTheDocument();
  expect(requests).toBe(3);
});

it('abre la consulta desde toda la fila y conserva enlace accesible sin columna detalle', async () => {
  mockPush.mockClear();
  server.use(http.get(`${api}/consultations`, () => result()));
  const { user } = mount();
  const table = await screen.findByRole('table');
  expect(within(table).queryByRole('columnheader', { name: 'Detalle' })).not.toBeInTheDocument();
  const row = within(table).getByText(consultation.doctorName).closest('tr');
  if (!row) throw new Error('Fila de consulta ausente');
  await user.click(within(row).getByText(consultation.doctorName));
  expect(mockPush).toHaveBeenCalledWith(`/consultas/${consultation.id}`);
  mockPush.mockClear();
  const link = within(row).getByRole('link', {
    name: `Ver consulta ${consultation.id}`,
  });
  expect(link).toHaveAttribute('href', `/consultas/${consultation.id}`);
  link.addEventListener('click', (event) => event.preventDefault());
  link.focus();
  expect(link).toHaveFocus();
  await user.keyboard('{Enter}');
  await user.click(link);
  expect(mockPush).not.toHaveBeenCalled();
});
