import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { adult, minor } from './patient-form.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { PatientForm } from './patient-form';
import { patientFormSchema } from './patient-form.schema';

const api = 'http://localhost:3001';
it.each([undefined, '', '12345'])('rechaza documento inválido de menor: %s', (documentId) => {
  expect(
    patientFormSchema.safeParse({
      name: 'Paciente menor',
      documentType: 'M',
      documentId,
    }).success,
  ).toBe(false);
});
beforeEach(() => {
  server.use(
    http.get(`${api}/patients/representatives/lookup`, () => HttpResponse.json({ found: false })),
  );
});

it('precarga representante y conserva código de menor al actualizar por su ID', async () => {
  let body: unknown;
  server.use(
    http.patch(`${api}/patients/${minor.id}`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json(minor);
    }),
  );
  const close = jest.fn();
  const { user } = renderWithClient(<PatientForm patient={minor} onClose={close} />);
  expect(screen.getByRole('heading', { name: 'Representante del menor' })).toBeVisible();
  expect(screen.getByLabelText('Nombre completo del representante')).toHaveValue(
    'Representante de prueba',
  );
  expect(screen.getByDisplayValue('P')).toBeInTheDocument();
  expect(screen.getByText(/los vínculos existentes se conservan/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(body).toMatchObject({
    documentType: 'M',
    documentId: minor.documentId,
    representative: { documentType: 'P', documentId: '90000000' },
  });
});

it('envía tipo y número de documento juntos y no resetea borrador por refetch', async () => {
  let body: unknown;
  server.use(
    http.patch(`${api}/patients/${adult.id}`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json(adult);
    }),
  );
  const close = jest.fn();
  const { user, rerender, queryClient } = renderWithClient(
    <PatientForm patient={adult} onClose={close} />,
  );
  await user.selectOptions(screen.getByLabelText('Tipo de documento'), 'E');
  await user.clear(screen.getByLabelText('Número de documento'));
  await user.type(screen.getByLabelText('Número de documento'), '76543210');
  // Mismo provider y formulario: refetch cambia props, no debe resetear RHF.
  rerender(
    <QueryClientProvider client={queryClient}>
      <PatientForm patient={{ ...adult, name: 'Refetch' }} onClose={close} />
    </QueryClientProvider>,
  );
  expect(screen.getByLabelText('Nombre completo')).toHaveValue(adult.name);
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(body).toMatchObject({
    documentType: 'E',
    documentId: '76543210',
    name: adult.name,
  });
});

it('informa que vaciar email, nacimiento y sexo no los elimina; omite esos campos', async () => {
  let body: Record<string, unknown> | undefined;
  server.use(
    http.patch(`${api}/patients/${adult.id}`, async ({ request }) => {
      body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(adult);
    }),
  );
  const close = jest.fn();
  const { user } = renderWithClient(<PatientForm patient={adult} onClose={close} />);
  expect(
    screen.getByText(/Vaciar email, fecha de nacimiento o sexo no elimina/),
  ).toBeInTheDocument();
  await user.clear(screen.getByLabelText('Email (opcional)'));
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento (opcional)'), {
    target: { value: '' },
  });
  await user.selectOptions(screen.getByLabelText('Sexo (opcional)'), '');
  await user.clear(screen.getByLabelText('Teléfono (opcional)'));
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(body).toMatchObject({ phone: '' });
  expect(body).not.toHaveProperty('email');
  expect(body).not.toHaveProperty('birthDate');
  expect(body).not.toHaveProperty('gender');
});

it('registra menores con documento ingresado manualmente', async () => {
  let body: unknown;
  server.use(
    http.post(`${api}/patients`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json(minor);
    }),
  );
  const close = jest.fn();
  const { user } = renderWithClient(<PatientForm onClose={close} />);
  await user.type(screen.getByLabelText('Nombre completo'), 'Paciente nuevo');
  await user.selectOptions(screen.getByLabelText('Tipo de documento'), 'M');
  await user.type(screen.getByLabelText('Número de documento'), '12345678');
  await user.click(screen.getByRole('button', { name: 'Registrar paciente' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(body).toMatchObject({ name: 'Paciente nuevo', documentType: 'M' });
  expect(body).toHaveProperty('documentId', '12345678');
  expect(body).not.toHaveProperty('representative');
});

it('permite ingresar un representante visible y precarga sus datos por documento', async () => {
  let body: unknown;
  server.use(
    http.get(`${api}/patients/representatives/lookup`, () =>
      HttpResponse.json({
        found: true,
        representative: { name: 'Madre encontrada', phone: '04141234567' },
      }),
    ),
    http.post(`${api}/patients`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json(minor);
    }),
  );
  const close = jest.fn();
  const { user } = renderWithClient(<PatientForm onClose={close} />);
  await user.type(screen.getByLabelText('Nombre completo'), 'Paciente nuevo');
  await user.selectOptions(screen.getByLabelText('Tipo de documento'), 'M');
  await user.type(screen.getByLabelText('Número de documento'), '12345678');
  await user.type(screen.getByLabelText('Número de cédula / pasaporte'), '23456789');
  await waitFor(() =>
    expect(screen.getByLabelText('Nombre completo del representante')).toHaveValue(
      'Madre encontrada',
    ),
  );
  await user.selectOptions(screen.getByLabelText('Parentesco'), 'Madre');
  await user.click(screen.getByRole('button', { name: 'Registrar paciente' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(body).toMatchObject({
    representative: {
      documentType: 'V',
      documentId: '23456789',
      name: 'Madre encontrada',
      phone: '04141234567',
      relationship: 'Madre',
    },
  });
});

it('permite modificar el documento de un menor sin cambiar su tipo', async () => {
  let body: unknown;
  server.use(
    http.patch(`${api}/patients/${minor.id}`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json(minor);
    }),
  );
  const close = jest.fn();
  const { user } = renderWithClient(<PatientForm patient={minor} onClose={close} />);
  await user.clear(screen.getByLabelText('Número de documento'));
  await user.type(screen.getByLabelText('Número de documento'), '87654321');
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(body).toMatchObject({ documentType: 'M', documentId: '87654321' });
});

it('cancelar sin enviar no hace PATCH', async () => {
  const requests: string[] = [];
  server.use(
    http.patch(`${api}/patients/:id`, ({ request }) => {
      requests.push(request.url);
      return HttpResponse.json(adult);
    }),
  );
  const close = jest.fn();
  const { user } = renderWithClient(<PatientForm patient={adult} onClose={close} />);
  await user.clear(screen.getByLabelText('Nombre completo'));
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(close).toHaveBeenCalledTimes(1);
  expect(requests).toEqual([]);
});

it('bloquea cancelar y duplicados durante PATCH; conserva valores tras fallo para reintentar', async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  server.use(
    http.patch(`${api}/patients/:id`, async () => {
      requests += 1;
      if (requests === 1) {
        await pending;
        return HttpResponse.json({ message: 'No se pudo guardar' }, { status: 503 });
      }
      return HttpResponse.json(adult);
    }),
  );
  const close = jest.fn();
  const { user } = renderWithClient(<PatientForm patient={adult} onClose={close} />);
  await user.clear(screen.getByLabelText('Nombre completo'));
  await user.type(screen.getByLabelText('Nombre completo'), 'Nombre editado');
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(requests).toBe(1));
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(requests).toBe(1);
  release();
  expect(await screen.findByText('No se pudo guardar')).toBeInTheDocument();
  expect(screen.getByLabelText('Nombre completo')).toHaveValue('Nombre editado');
  expect(close).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(requests).toBe(2);
});

it('promover menor exige documento válido antes de PATCH y conserva tipo E', async () => {
  let body: unknown;
  const requests: string[] = [];
  server.use(
    http.patch(`${api}/patients/${minor.id}`, async ({ request }) => {
      requests.push(request.url);
      body = await request.json();
      return HttpResponse.json(adult);
    }),
  );
  const close = jest.fn();
  const { user } = renderWithClient(<PatientForm patient={minor} onClose={close} />);
  await user.selectOptions(screen.getByLabelText('Tipo de documento'), 'E');
  await user.clear(screen.getByLabelText('Número de documento'));
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(
    await screen.findByText('Número de documento requerido (mínimo 6 caracteres)'),
  ).toBeInTheDocument();
  expect(requests).toEqual([]);
  await user.type(screen.getByLabelText('Número de documento'), '54321987');
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(body).toMatchObject({ documentType: 'E', documentId: '54321987' });
});
