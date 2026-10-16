import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ConsultationResponse } from '@/features/consultations/services/consultations.service';
import { agendaFixture } from '@/test/fixtures/agenda.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import AgendaPage from './page';

// El formulario real se acredita en bloque B; cobro/PDF sigue en tarea 2.2.
jest.mock('@/features/consultations/components/schedule-consultation-form', () => ({
  ScheduleConsultationForm: () => null,
}));
jest.mock('@/features/payments/components/consultation-payment-form', () => ({
  ConsultationPaymentForm: ({ consultation }: { consultation: ConsultationResponse }) => (
    <p>Cobro seleccionado: {consultation.id}</p>
  ),
}));

beforeEach(() => {
  server.use(
    http.get('*/consultations', () =>
      HttpResponse.json({
        data: agendaFixture,
        meta: { total: 14, totalPages: 2 },
      }),
    ),
  );
});

async function open(status = 'SCHEDULED') {
  const result = renderWithClient(<AgendaPage />);
  await screen.findByText(`Paciente ${status}`);
  const row = screen.getByRole('row', { name: new RegExp(`Paciente ${status}`) });
  await result.user.click(within(row).getByRole('button', { name: 'Editar' }));
  return result;
}

it('distingue listado fallido de resultado vacío válido', async () => {
  server.use(
    http.get('*/consultations', () =>
      HttpResponse.json({ message: 'Agenda no disponible' }, { status: 503 }),
    ),
  );
  const { queryClient } = renderWithClient(<AgendaPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Agenda no disponible');
  expect(screen.queryByText('No hay datos para mostrar')).not.toBeInTheDocument();
  server.use(
    http.get('*/consultations', () =>
      HttpResponse.json({ data: [], meta: { total: 0, totalPages: 0 } }),
    ),
  );
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['consultations'] });
  });
  expect(await screen.findByText('No hay datos para mostrar')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it.each([
  [
    'SCHEDULED',
    ['Anular agenda', 'Registrar pago', 'Reenviar correos', 'Confirmar llegada', 'Guardar'],
  ],
  ['PENDING', ['Anular agenda', 'Registrar pago']],
  ['PAID', ['Confirmar llegada']],
])('ofrece solo las acciones permitidas para %s', async (status, allowed) => {
  await open(status);
  for (const name of [
    'Anular agenda',
    'Registrar pago',
    'Reenviar correos',
    'Confirmar llegada',
    'Guardar',
  ]) {
    if (allowed.includes(name)) expect(screen.getByRole('button', { name })).toBeVisible();
    else expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  }
  expect(
    within(screen.getByRole('row', { name: /Paciente VOIDED/ })).queryByRole('button'),
  ).not.toBeInTheDocument();
});

it.each(['SCHEDULED', 'PENDING'])(
  'entrega al límite de cobro la consulta %s seleccionada',
  async (status) => {
    const { user } = await open(status);
    await user.click(screen.getByRole('button', { name: 'Registrar pago' }));
    expect(
      screen.getByText(`Cobro seleccionado: ${status === 'SCHEDULED' ? 'agenda-0' : 'agenda-1'}`),
    ).toBeVisible();
  },
);

it('envía filtros HTTP y reinicia página al cambiar estado y fecha', async () => {
  const requests: string[] = [];
  server.use(
    http.get('*/consultations', ({ request }) => {
      requests.push(new URL(request.url).search);
      return HttpResponse.json({ data: agendaFixture, meta: { total: 14, totalPages: 2 } });
    }),
  );
  const { user } = renderWithClient(<AgendaPage />);
  await screen.findByText('Paciente SCHEDULED');
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(requests.at(-1)).toBe('?page=2&limit=10'));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'PAID');
  await waitFor(() => expect(requests.at(-1)).toBe('?page=1&limit=10&status=PAID'));
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(requests.at(-1)).toContain('page=2'));
  fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-10-14' } });
  await waitFor(() => expect(requests.at(-1)).toBe('?page=1&limit=10&date=2026-10-14&status=PAID'));
});

it('espera HTTP sin mostrar un vacío ficticio', async () => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http.get('*/consultations', async () => {
      await pending;
      return HttpResponse.json({ data: agendaFixture, meta: { total: 4, totalPages: 1 } });
    }),
  );
  renderWithClient(<AgendaPage />);
  try {
    expect(screen.queryByText('No hay datos para mostrar')).not.toBeInTheDocument();
    expect(screen.queryByText('Paciente SCHEDULED')).not.toBeInTheDocument();
  } finally {
    await act(async () => release());
  }
  expect(await screen.findByText('Paciente SCHEDULED')).toBeVisible();
});

it('edita intervalo local cruzando medianoche, excluye consulta actual y envía su ID', async () => {
  let availability: URL | undefined;
  const updates: unknown[] = [];
  server.use(
    http.get('*/consultations/availability', ({ request }) => {
      availability = new URL(request.url);
      return HttpResponse.json({ occupiedSlots: [], isRequestedSlotAvailable: true });
    }),
    http.patch('*/consultations/:id', async ({ request, params }) => {
      updates.push({ id: params.id, body: await request.json() });
      return HttpResponse.json(agendaFixture[0]);
    }),
  );
  const { user } = await open();
  expect(document.getElementById('edit-date')).toHaveValue('2026-10-14');
  expect(screen.getByLabelText('Hora de inicio')).toHaveValue('23:45');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled());
  expect(Object.fromEntries(availability?.searchParams ?? [])).toEqual({
    doctorId: 'doctor-0',
    date: '2026-10-14',
    startsAt: '2026-10-15T03:45:00.000Z',
    endsAt: '2026-10-15T04:15:00.000Z',
    excludeConsultationId: 'agenda-0',
  });
  await user.type(screen.getByLabelText('Observaciones'), 'Control');
  await user.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() =>
    expect(updates).toEqual([
      {
        id: 'agenda-0',
        body: {
          startsAt: '2026-10-15T03:45:00.000Z',
          endsAt: '2026-10-15T04:15:00.000Z',
          notes: 'Control',
        },
      },
    ]),
  );
  await waitFor(() => expect(screen.queryByText('Editar consulta')).not.toBeInTheDocument());
});

it('bloquea conflicto y fecha vacía sin mutación', async () => {
  const update = jest.fn();
  server.use(
    http.get('*/consultations/availability', () =>
      HttpResponse.json({ occupiedSlots: [], isRequestedSlotAvailable: false }),
    ),
    http.patch('*/consultations/:id', () => {
      update();
      return HttpResponse.json(agendaFixture[0]);
    }),
  );
  const { user } = await open();
  expect(await screen.findByText(/El doctor ya tiene otra consulta/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Fecha', { selector: '#edit-date' }), {
    target: { value: '' },
  });
  await user.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(update).not.toHaveBeenCalled();
});

it('no acepta disponibilidad cacheada tras refetch503', async () => {
  const { queryClient } = await open();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled());
  server.use(
    http.get('*/consultations/availability', () =>
      HttpResponse.json({ message: 'Disponibilidad fallida' }, { status: 503 }),
    ),
  );
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['consultations', 'availability'] });
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('Disponibilidad fallida');
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
});

it.each([
  ['Confirmar llegada', 'patch', '*/consultations/:id/attend', 'SCHEDULED', 0],
  ['Confirmar llegada', 'patch', '*/consultations/:id/attend', 'PAID', 2],
  ['Reenviar correos', 'post', '*/consultations/:id/resend-notifications', 'SCHEDULED', 0],
  ['Anular agenda', 'delete', '*/consultations/:id', 'SCHEDULED', 0],
  ['Guardar', 'patch', '*/consultations/:id', 'SCHEDULED', 0],
] as const)(
  'mantiene selección y hace visible error de %s; permite reintento',
  async (action, method, path, status, index) => {
    const calls: unknown[] = [];
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const prompt = jest.spyOn(window, 'prompt').mockReturnValue('Paciente cancela');
    server.use(
      http[method](path, async ({ params, request }) => {
        calls.push({ id: params.id, body: method === 'delete' ? await request.json() : null });
        await pending;
        return HttpResponse.json({ message: `Falló ${action}` }, { status: 503 });
      }),
    );
    const { user } = await open(status);
    const button = screen.getByRole('button', { name: action });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    try {
      await waitFor(() => expect(button).toBeDisabled());
    } finally {
      await act(async () => release());
    }
    expect(await screen.findByRole('alert')).toHaveTextContent(`Falló ${action}`);
    expect(screen.getByText('Editar consulta')).toBeVisible();
    expect(calls).toEqual([
      { id: `agenda-${index}`, body: method === 'delete' ? { reason: 'Paciente cancela' } : null },
    ]);
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    await user.click(
      within(screen.getByRole('row', { name: new RegExp(`Paciente ${status}`) })).getByRole(
        'button',
        { name: 'Editar' },
      ),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    server.use(
      http[method](path, async ({ params, request }) => {
        calls.push({ id: params.id, body: method === 'delete' ? await request.json() : null });
        return HttpResponse.json(
          action === 'Reenviar correos'
            ? { message: 'Enviado' }
            : { ...agendaFixture[index], attendedAt: '2026-10-15T03:45:00.000Z' },
        );
      }),
    );
    await user.click(screen.getByRole('button', { name: action }));
    await waitFor(() =>
      expect(calls).toEqual([
        {
          id: `agenda-${index}`,
          body: method === 'delete' ? { reason: 'Paciente cancela' } : null,
        },
        {
          id: `agenda-${index}`,
          body: method === 'delete' ? { reason: 'Paciente cancela' } : null,
        },
      ]),
    );
    if (action === 'Guardar' || action === 'Anular agenda')
      await waitFor(() => expect(screen.queryByText('Editar consulta')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    if (action === 'Confirmar llegada')
      expect(screen.getByText(/Llegada registrada:/)).toBeVisible();
    prompt.mockRestore();
  },
);

it('no anula sin motivo', async () => {
  const cancel = jest.fn();
  jest.spyOn(window, 'prompt').mockReturnValue(null);
  server.use(
    http.delete('*/consultations/:id', () => {
      cancel();
      return HttpResponse.json(agendaFixture[0]);
    }),
  );
  const { user } = await open('PENDING');
  await user.click(screen.getByRole('button', { name: 'Anular agenda' }));
  expect(cancel).not.toHaveBeenCalled();
  expect(screen.getByText('Editar consulta')).toBeVisible();
});
