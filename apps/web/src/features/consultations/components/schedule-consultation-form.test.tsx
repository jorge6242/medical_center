import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { doctorAnaFixture } from '@/test/fixtures/doctors.fixture';
import { patientLookupItemsFixture } from '@/test/fixtures/patients.fixture';
import {
  createdScheduleFixture,
  otherScheduleDoctorFixture,
  otherScheduleServicesFixture,
} from '@/test/fixtures/schedule.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { ScheduleConsultationForm } from './schedule-consultation-form';

function mount() {
  const onSuccess = jest.fn();
  return {
    ...renderWithClient(<ScheduleConsultationForm onSuccess={onSuccess} onCancel={() => {}} />),
    onSuccess,
  };
}
async function fill() {
  const result = mount();
  await result.user.type(screen.getByLabelText('Paciente'), 'María');
  await result.user.click(await screen.findByRole('button', { name: /María González/ }));
  await result.user.type(screen.getByLabelText('Doctor'), 'Ana');
  await result.user.click(await screen.findByRole('button', { name: /Dra. Ana Pérez/ }));
  await result.user.click(await screen.findByRole('button', { name: /Consulta general/ }));
  fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-10-14' } });
  fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '23:45' } });
  return result;
}
function hold() {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { pending, release };
}

it('requiere selección real de paciente y doctor, fecha y hora antes de crear', async () => {
  const post = jest.fn();
  server.use(
    http.post('*/consultations', () => {
      post();
      return HttpResponse.json(createdScheduleFixture);
    }),
  );
  const { user, onSuccess } = mount();
  fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '' } });
  await user.click(screen.getByRole('button', { name: 'Agendar consulta' }));
  for (const text of [
    'Seleccioná un paciente',
    'Seleccioná un doctor',
    'Indicá la fecha',
    'Indicá la hora de inicio',
  ]) {
    expect(await screen.findByText(text)).toBeVisible();
  }
  expect(post).not.toHaveBeenCalled();
  expect(onSuccess).not.toHaveBeenCalled();
});

it.each([
  ['23:45', '30', '2026-10-15T03:45:00.000Z', '2026-10-15T04:15:00.000Z', false],
  ['09:00', '60', '2026-10-14T13:00:00.000Z', '2026-10-14T14:00:00.000Z', true],
])(
  'crea intervalo Caracas %s/duración%s y devuelve solo la consulta recibida',
  async (time, duration, startsAt, endsAt, payNow) => {
    const calls: unknown[] = [];
    server.use(
      http.post('*/consultations', async ({ request }) => {
        calls.push(await request.json());
        return HttpResponse.json(createdScheduleFixture);
      }),
    );
    const { user, onSuccess } = await fill();
    fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: time } });
    await user.selectOptions(screen.getByLabelText('Duración'), duration);
    await user.type(screen.getByLabelText('Observaciones'), 'Control anual');
    if (payNow) {
      await user.click(screen.getByLabelText('Registrar pago ahora'));
      await user.click(screen.getByLabelText('Notificar por email al doctor y al paciente'));
    }
    const submit = screen.getByRole('button', {
      name: payNow ? 'Agendar y continuar al pago' : 'Agendar consulta',
    });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(createdScheduleFixture, payNow));
    expect(calls).toEqual([
      {
        patientId: 'patient-maria',
        doctorId: 'doctor-ana',
        doctorServiceIds: ['ds-1'],
        startsAt,
        endsAt,
        notes: 'Control anual',
        sendEmailNotification: !payNow,
      },
    ]);
  },
);

it('envía búsquedas tipadas y al cambiar doctor limpia servicios antes de crear con el nuevo ID', async () => {
  const lookups: string[] = [];
  const calls: unknown[] = [];
  server.use(
    http.get('*/patients/lookup', ({ request }) => {
      lookups.push(new URL(request.url).search);
      return HttpResponse.json({
        data: patientLookupItemsFixture,
        hasNextPage: false,
        nextCursor: null,
      });
    }),
    http.get('*/doctors/lookup', ({ request }) => {
      lookups.push(new URL(request.url).search);
      return HttpResponse.json({
        data: [doctorAnaFixture, otherScheduleDoctorFixture],
        hasNextPage: false,
        nextCursor: null,
      });
    }),
    http.get('*/doctors/doctor-b/services', () => HttpResponse.json(otherScheduleServicesFixture)),
    http.post('*/consultations', async ({ request }) => {
      calls.push(await request.json());
      return HttpResponse.json(createdScheduleFixture);
    }),
  );
  const { user, onSuccess } = await fill();
  expect(lookups).toContain('?q=Ana&limit=20');
  expect(lookups).toContain('?q=Mar%C3%ADa&limit=20');
  await user.clear(screen.getByLabelText('Doctor'));
  await user.type(screen.getByLabelText('Doctor'), 'Bruno');
  await waitFor(() => expect(lookups).toContain('?q=Bruno&limit=20'));
  await user.click(await screen.findByRole('button', { name: /Dr. Bruno Díaz/ }));
  const service = await screen.findByRole('button', { name: /Control especializado/ });
  const submit = screen.getByRole('button', { name: 'Agendar consulta' });
  await waitFor(() => expect(submit).toBeEnabled());
  await user.click(submit);
  expect(await screen.findByText('Seleccioná al menos un servicio')).toBeVisible();
  expect(calls).toEqual([]);
  await user.click(service);
  await user.click(submit);
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(calls).toEqual([
    expect.objectContaining({ doctorId: 'doctor-b', doctorServiceIds: ['ds-2'] }),
  ]);
});

it('bloquea mientras consulta disponibilidad y ante conflicto, sin crear ni simular éxito', async () => {
  const response = hold();
  const post = jest.fn();
  server.use(
    http.get('*/consultations/availability', async () => {
      await response.pending;
      return HttpResponse.json({
        occupiedSlots: [
          { startsAt: createdScheduleFixture.startsAt, endsAt: createdScheduleFixture.endsAt },
        ],
        isRequestedSlotAvailable: false,
      });
    }),
    http.post('*/consultations', () => {
      post();
      return HttpResponse.json(createdScheduleFixture);
    }),
  );
  const { user, onSuccess } = await fill();
  try {
    expect(screen.getByLabelText('Consultando disponibilidad')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Agendar consulta' })).toBeDisabled();
  } finally {
    await act(async () => response.release());
  }
  expect(await screen.findByText('Este horario está ocupado para este doctor.')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Agendar consulta' }));
  expect(post).not.toHaveBeenCalled();
  expect(onSuccess).not.toHaveBeenCalled();
});

it.each([false, true])(
  'error disponibilidad503 es explícito y bloquea crear (cache=%s)',
  async (cached) => {
    const post = jest.fn();
    const failure = http.get('*/consultations/availability', () =>
      HttpResponse.json({ message: 'Disponibilidad no disponible' }, { status: 503 }),
    );
    server.use(
      http.post('*/consultations', () => {
        post();
        return HttpResponse.json(createdScheduleFixture);
      }),
    );
    if (!cached) server.use(failure);
    const { user, queryClient, onSuccess } = await fill();
    if (cached) {
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Agendar consulta' })).toBeEnabled(),
      );
      server.use(failure);
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ['consultations', 'availability'] });
      });
    }
    expect(await screen.findByRole('alert')).toHaveTextContent('Disponibilidad no disponible');
    expect(screen.getByRole('button', { name: 'Agendar consulta' })).toBeDisabled();
    expect(screen.queryByText(/ – .* disponible$/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Agendar consulta' }));
    expect(post).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  },
);

it('POST pendiente impide doble envío; rechazo mantiene formulario y reintento HTTP acredita éxito', async () => {
  const response = hold();
  const calls: unknown[] = [];
  server.use(
    http.post('*/consultations', async ({ request }) => {
      calls.push(await request.json());
      await response.pending;
      return HttpResponse.json({ message: 'No se pudo agendar' }, { status: 503 });
    }),
  );
  const { user, onSuccess } = await fill();
  const submit = screen.getByRole('button', { name: 'Agendar consulta' });
  await waitFor(() => expect(submit).toBeEnabled());
  await user.click(submit);
  try {
    await waitFor(() => expect(submit).toBeDisabled());
    await user.click(submit);
    expect(calls).toHaveLength(1);
    expect(onSuccess).not.toHaveBeenCalled();
  } finally {
    await act(async () => response.release());
  }
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo agendar');
  expect(screen.getByLabelText('Paciente')).toHaveValue('María González');
  expect(onSuccess).not.toHaveBeenCalled();
  server.use(
    http.post('*/consultations', async ({ request }) => {
      calls.push(await request.json());
      return HttpResponse.json(createdScheduleFixture);
    }),
  );
  await user.click(submit);
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(onSuccess).toHaveBeenCalledWith(createdScheduleFixture, false);
  expect(calls).toHaveLength(2);
  expect(calls[1]).toEqual(calls[0]);
});
