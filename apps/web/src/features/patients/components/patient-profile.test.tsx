import { QueryClientProvider } from '@tanstack/react-query';
import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { useAuthStore } from '@/stores/auth.store';
import { patientWithRepresentativeFixture } from '@/test/fixtures/patient-profile.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';

import PatientDetailPage from '@/app/(dashboard)/pacientes/[id]/page';

const api = 'http://localhost:3001';
const patient = {
  ...patientWithRepresentativeFixture,
  id: 'patient-a',
  name: 'Ana Pérez',
  documentType: 'V',
  documentId: '12345678',
  birthDate: '2000-01-01T00:00:00.000Z',
  gender: 'FEMININE',
  email: 'ana@example.com',
  phone: '04141234567',
  clinicalHistory: { secret: 'Antecedente clínico privado' },
  representatives: [
    ...(patientWithRepresentativeFixture.representatives ?? []),
    {
      relationship: 'Padre',
      name: 'Otro representante',
      documentType: 'V',
      documentId: '87654321',
      phone: '04241234567',
    },
  ],
};

beforeEach(() => {
  useAuthStore.setState({
    permissions: [{ resource: 'patients', action: 'read' }],
  });
});

const page = (id = patient.id) => PatientDetailPage({ params: Promise.resolve({ id }) });

it('muestra ficha personal, todos los representantes y nacimiento sin desplazamiento de día; omite clínica', async () => {
  const requests: string[] = [];
  server.use(
    http.get(`${api}/*`, ({ request }) => {
      requests.push(new URL(request.url).pathname);
      const path = new URL(request.url).pathname;
      if (path.endsWith('/consultations')) return HttpResponse.json([]);
      if (path.endsWith('/medical-records')) return HttpResponse.json({ records: [] });
      return HttpResponse.json(patient);
    }),
  );
  renderWithClient(await page());
  expect(await screen.findByRole('heading', { name: patient.name })).toBeInTheDocument();
  for (const value of [
    'V-12345678',
    '01/01/2000',
    'Femenino',
    patient.email,
    patient.phone,
    'Representante de prueba',
    'Otro representante',
    '04241234567',
  ]) {
    expect(screen.getByText(value)).toBeInTheDocument();
  }
  expect(screen.getByText('Activo')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Pacientes' })).toHaveAttribute('href', '/pacientes');
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByText('Antecedente clínico privado')).not.toBeInTheDocument();
  expect(screen.queryByText('Informes médicos')).not.toBeInTheDocument();
  expect(screen.queryByText('Historiales médicos')).not.toBeInTheDocument();
  expect(requests).toEqual(['/patients/patient-a']);
});

it('muestra el documento manual del menor y distingue campos ausentes', async () => {
  server.use(
    http.get(`${api}/patients/:id`, () =>
      HttpResponse.json({
        ...patient,
        documentType: 'M',
        documentId: '12345678',
        birthDate: null,
        email: null,
        gender: null,
        phone: null,
        representatives: [],
      }),
    ),
  );
  renderWithClient(await page());
  expect(await screen.findByText('Menor de edad')).toBeInTheDocument();
  expect(screen.getByText('M-12345678')).toBeInTheDocument();
  expect(screen.getByText('Sin representantes registrados')).toBeInTheDocument();
  expect(screen.getAllByText('No registrado')).toHaveLength(4);
});

it('sin permiso no solicita ni muestra datos del paciente', async () => {
  useAuthStore.setState({ permissions: [] });
  const requests: string[] = [];
  server.use(
    http.get(`${api}/*`, ({ request }) => {
      requests.push(request.url);
      return HttpResponse.json(patient);
    }),
  );
  const { queryClient } = renderWithClient(await page());
  expect(screen.getByRole('alert')).toHaveTextContent('No tenés permiso para ver este paciente');
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  expect(requests).toEqual([]);
  expect(screen.queryByText(patient.name)).not.toBeInTheDocument();
});

it('distingue carga pendiente de ficha vacía', async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http.get(`${api}/patients/:id`, async () => {
      await pending;
      return HttpResponse.json(patient);
    }),
  );
  renderWithClient(await page());
  expect(screen.getByRole('status')).toHaveTextContent('Cargando paciente');
  release();
  expect(await screen.findByRole('heading', { name: patient.name })).toBeInTheDocument();
});

it.each([
  [404, 'Paciente no encontrado'],
  [403, 'No tenés permiso para ver este paciente'],
  [503, 'No se pudo cargar el paciente'],
])('distingue HTTP %s sin fabricar datos y permite reintentar', async (status, message) => {
  server.use(
    http.get(`${api}/patients/:id`, () => HttpResponse.json({ message: 'Error' }, { status })),
  );
  const { user } = renderWithClient(await page());
  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(screen.queryByRole('heading', { name: patient.name })).not.toBeInTheDocument();
  server.use(http.get(`${api}/patients/:id`, () => HttpResponse.json(patient)));
  await user.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByRole('heading', { name: patient.name })).toBeInTheDocument();
});

it('oculta datos cacheados si falla su actualización', async () => {
  server.use(http.get(`${api}/patients/:id`, () => HttpResponse.json(patient)));
  const { queryClient } = renderWithClient(await page());
  expect(await screen.findByRole('heading', { name: patient.name })).toBeInTheDocument();
  server.use(http.get(`${api}/patients/:id`, () => HttpResponse.json({}, { status: 503 })));
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['patients', patient.id] });
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el paciente');
  expect(screen.queryByRole('heading', { name: patient.name })).not.toBeInTheDocument();
});

it('navegar de paciente no muestra datos del anterior ni acepta una respuesta de otro ID', async () => {
  server.use(http.get(`${api}/patients/:id`, () => HttpResponse.json(patient)));
  const { queryClient, rerender } = renderWithClient(await page());
  expect(await screen.findByRole('heading', { name: patient.name })).toBeInTheDocument();
  rerender(
    <QueryClientProvider client={queryClient}>{await page('patient-b')}</QueryClientProvider>,
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Paciente no encontrado');
  expect(screen.queryByRole('heading', { name: patient.name })).not.toBeInTheDocument();
});

it('distingue error de red sin mostrar una ficha vacía', async () => {
  server.use(http.get(`${api}/patients/:id`, () => HttpResponse.error()));
  renderWithClient(await page());
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el paciente');
  expect(screen.queryByText(patient.name)).not.toBeInTheDocument();
});
