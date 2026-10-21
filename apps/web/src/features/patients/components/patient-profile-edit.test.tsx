import { QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { useAuthStore } from '@/stores/auth.store';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { adult } from './patient-form.fixture';
import { PatientProfile } from './patient-profile';

const api = 'http://localhost:3001';
beforeEach(() => {
  useAuthStore.setState({
    permissions: [
      { resource: 'patients', action: 'read' },
      { resource: 'patients', action: 'update' },
    ],
  });
  server.use(
    http.get(`${api}/patients/:id`, ({ params }) => HttpResponse.json({ ...adult, id: params.id })),
  );
});

it('presenta sexo real del contrato y exige edición explícita con permiso', async () => {
  const { user } = renderWithClient(<PatientProfile patientId={adult.id} />);
  expect(await screen.findByText('Femenino')).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Editar datos' }));
  expect(screen.getByLabelText('Nombre completo')).toHaveValue(adult.name);
  expect(screen.queryByRole('link', { name: 'Pacientes' })).not.toBeInTheDocument();
});

it('sin patients:update mantiene lectura y no ofrece editar', async () => {
  useAuthStore.setState({
    permissions: [{ resource: 'patients', action: 'read' }],
  });
  renderWithClient(<PatientProfile patientId={adult.id} />);
  expect(await screen.findByRole('heading', { name: adult.name })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Editar datos' })).not.toBeInTheDocument();
});

it('cancelar descarta borrador; guardar PATCH real invalida lista y vuelve a lectura actualizada', async () => {
  const requests: unknown[] = [];
  let patient = adult;
  server.use(
    http.get(`${api}/patients/:id`, () => HttpResponse.json(patient)),
    http.patch(`${api}/patients/${adult.id}`, async ({ request }) => {
      const dto = (await request.json()) as { name: string };
      requests.push(dto);
      patient = { ...adult, name: dto.name };
      return HttpResponse.json(patient);
    }),
  );
  const { user, queryClient } = renderWithClient(<PatientProfile patientId={adult.id} />);
  const observer = new QueryObserver(queryClient, {
    queryKey: ['patients', 1],
    enabled: false,
  });
  const unsubscribe = observer.subscribe(() => undefined);
  queryClient.setQueryData(['patients', 1], { data: [adult] });
  await user.click(await screen.findByRole('button', { name: 'Editar datos' }));
  await user.clear(screen.getByLabelText('Nombre completo'));
  await user.type(screen.getByLabelText('Nombre completo'), 'Descartado');
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByRole('heading', { name: adult.name })).toBeInTheDocument();
  expect(requests).toEqual([]);
  await user.click(screen.getByRole('button', { name: 'Editar datos' }));
  expect(screen.getByLabelText('Nombre completo')).toHaveValue(adult.name);
  await user.clear(screen.getByLabelText('Nombre completo'));
  await user.type(screen.getByLabelText('Nombre completo'), 'Actualizado');
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('heading', { name: 'Actualizado' })).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByText('Representante de prueba')).toBeInTheDocument();
  expect(requests).toHaveLength(1);
  expect(queryClient.getQueryState(['patients', 1])?.isInvalidated).toBe(true);
  unsubscribe();
});

it('refetch fallido no desmonta borrador y PATCH fallido permite reintento sin descartar', async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  server.use(
    http.patch(`${api}/patients/:id`, async () => {
      calls += 1;
      if (calls === 1) {
        await pending;
        return HttpResponse.json({ message: 'Fallo temporal' }, { status: 503 });
      }
      return HttpResponse.json(adult);
    }),
  );
  const { user, queryClient } = renderWithClient(<PatientProfile patientId={adult.id} />);
  await user.click(await screen.findByRole('button', { name: 'Editar datos' }));
  await user.clear(screen.getByLabelText('Nombre completo'));
  await user.type(screen.getByLabelText('Nombre completo'), 'Borrador');
  server.use(http.get(`${api}/patients/:id`, () => HttpResponse.json({}, { status: 503 })));
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['patients', adult.id] });
  });
  expect(screen.getByLabelText('Nombre completo')).toHaveValue('Borrador');
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(calls).toBe(1));
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  release();
  expect(await screen.findByText('Fallo temporal')).toBeInTheDocument();
  expect(screen.getByLabelText('Nombre completo')).toHaveValue('Borrador');
  server.use(http.get(`${api}/patients/:id`, () => HttpResponse.json(adult)));
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('heading', { name: adult.name })).toBeInTheDocument();
  expect(calls).toBe(2);
});

it('respuesta tardía de A no cierra ni reemplaza edición del paciente B', async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http.patch(`${api}/patients/${adult.id}`, async () => {
      await pending;
      return HttpResponse.json({ ...adult, name: 'Respuesta A' });
    }),
  );
  const { user, queryClient, rerender } = renderWithClient(<PatientProfile patientId={adult.id} />);
  await user.click(await screen.findByRole('button', { name: 'Editar datos' }));
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(queryClient.isMutating()).toBe(1));
  rerender(
    <QueryClientProvider client={queryClient}>
      <PatientProfile patientId="patient-b" />
    </QueryClientProvider>,
  );
  await user.click(await screen.findByRole('button', { name: 'Editar datos' }));
  await user.clear(screen.getByLabelText('Nombre completo'));
  await user.type(screen.getByLabelText('Nombre completo'), 'Borrador B');
  release();
  await waitFor(() => expect(queryClient.isMutating()).toBe(0));
  expect(screen.getByLabelText('Nombre completo')).toHaveValue('Borrador B');
  expect(screen.queryByText('Respuesta A')).not.toBeInTheDocument();
});

it.each([
  ['MASCULINE', 'Masculino'],
  ['OTHER', 'Otro'],
])('traduce sexo %s sin exponer enum al usuario', async (gender, label) => {
  server.use(http.get(`${api}/patients/:id`, () => HttpResponse.json({ ...adult, gender })));
  renderWithClient(<PatientProfile patientId={adult.id} />);
  expect(await screen.findByText(label)).toBeInTheDocument();
  expect(screen.queryByText(gender)).not.toBeInTheDocument();
});

it('monta historial para el mismo paciente cuando existe permiso independiente', async () => {
  useAuthStore.setState({
    permissions: [
      { resource: 'patients', action: 'read' },
      { resource: 'consultations', action: 'read' },
    ],
  });
  const ids: Array<string | null> = [];
  server.use(
    http.get(`${api}/consultations`, ({ request }) => {
      ids.push(new URL(request.url).searchParams.get('patientId'));
      return HttpResponse.json({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    }),
  );
  renderWithClient(<PatientProfile patientId={adult.id} />);
  expect(await screen.findByText('Sin consultas registradas')).toBeInTheDocument();
  expect(ids).toEqual([adult.id]);
});
