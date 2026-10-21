import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import PacientesPage from '@/app/(dashboard)/pacientes/page';
import { useAuthStore } from '@/stores/auth.store';
import { patientMariaFixture } from '@/test/fixtures/patients.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';

const api = 'http://localhost:3001';
const secondPatient = { ...patientMariaFixture, id: 'other-patient', name: 'Paciente secundario' };

beforeEach(() => {
  useAuthStore.setState({
    permissions: [
      { resource: 'patients', action: 'read' },
      { resource: 'patients', action: 'update' },
    ],
  });
  server.use(
    http.get(`${api}/patients`, () =>
      HttpResponse.json({
        data: [patientMariaFixture, secondPatient],
        meta: { total: 2, totalPages: 1 },
      }),
    ),
  );
});

it('cada fila lleva a la misma ficha en lectura para ver o abrir edición', async () => {
  renderWithClient(<PacientesPage />);
  expect(await screen.findByText(patientMariaFixture.name)).toBeInTheDocument();
  for (const patient of [patientMariaFixture, secondPatient]) {
    const row = screen.getByText(patient.name).closest('tr');
    if (!row) throw new Error('Fila de paciente ausente');
    const scope = within(row);
    expect(scope.getByRole('link', { name: patient.name })).toHaveAttribute(
      'href',
      `/pacientes/${patient.id}`,
    );
    expect(scope.getByRole('link', { name: `Ver ficha de ${patient.name}` })).toHaveAttribute(
      'href',
      `/pacientes/${patient.id}`,
    );
    expect(
      scope.getByRole('link', { name: `Abrir ficha para editar a ${patient.name}` }),
    ).toHaveAttribute('href', `/pacientes/${patient.id}`);
    expect(scope.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
  }
  expect(screen.queryByRole('heading', { name: 'Editar paciente' })).not.toBeInTheDocument();
});

it.each([
  [true, false],
  [false, true],
  [false, false],
])('respeta permisos lectura=%s edición=%s en links', async (read, update) => {
  useAuthStore.setState({
    permissions: [
      { resource: 'patients', action: read ? 'read' : 'none' },
      { resource: 'patients', action: update ? 'update' : 'none' },
    ],
  });
  renderWithClient(<PacientesPage />);
  expect(await screen.findByText(patientMariaFixture.name)).toBeInTheDocument();
  expect(screen.queryAllByRole('link', { name: /^Ver ficha/ })).toHaveLength(read ? 2 : 0);
  expect(screen.queryAllByRole('link')).toHaveLength(read ? 4 : 0);
  expect(screen.queryByRole('link', { name: /Abrir ficha para editar/ })).not.toBeInTheDocument();
});

it('conserva alta en modal sin editar el paciente seleccionado', async () => {
  let created: unknown;
  server.use(
    http.post(`${api}/patients`, async ({ request }) => {
      created = await request.json();
      return HttpResponse.json(patientMariaFixture);
    }),
  );
  const { user } = renderWithClient(<PacientesPage />);
  expect(await screen.findByText(patientMariaFixture.name)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Nuevo paciente' }));
  expect(screen.getByRole('textbox', { name: 'Nombre completo' })).toHaveValue('');
  await user.type(screen.getByRole('textbox', { name: 'Nombre completo' }), 'Paciente Nuevo');
  await user.type(screen.getByRole('textbox', { name: 'Número de documento' }), '12345678');
  await user.click(screen.getByRole('button', { name: 'Registrar paciente' }));
  await waitFor(() =>
    expect(created).toMatchObject({
      name: 'Paciente Nuevo',
      documentType: 'V',
      documentId: '12345678',
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole('textbox', { name: 'Nombre completo' })).not.toBeInTheDocument(),
  );
});

it('conserva desactivación y eliminación apuntando al ID de su fila', async () => {
  const ids: string[] = [];
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  server.use(
    http.post(`${api}/patients/:id/deactivate`, ({ params }) => {
      ids.push(`deactivate:${params['id']}`);
      return HttpResponse.json(secondPatient);
    }),
    http.delete(`${api}/patients/:id/permanent`, ({ params }) => {
      ids.push(`delete:${params['id']}`);
      return HttpResponse.json({ id: params['id'] });
    }),
  );
  const { user } = renderWithClient(<PacientesPage />);
  const row = (await screen.findByText(secondPatient.name)).closest('tr');
  if (!row) throw new Error('Fila de paciente ausente');
  await user.click(within(row).getByRole('button', { name: 'Desactivar' }));
  await waitFor(() => expect(ids).toContain(`deactivate:${secondPatient.id}`));
  await user.click(within(row).getByRole('button', { name: 'Eliminar' }));
  await waitFor(() =>
    expect(ids).toEqual([`deactivate:${secondPatient.id}`, `delete:${secondPatient.id}`]),
  );
});
