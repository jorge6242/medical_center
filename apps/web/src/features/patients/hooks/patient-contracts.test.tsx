import { DocumentType } from '@centro-medico/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { useConsultations } from '@/features/consultations/hooks/use-consultations';
import { getConsultations } from '@/features/consultations/services/consultations.service';
import { patientMariaFixture } from '@/test/fixtures/patients.fixture';
import { patientWithRepresentativeFixture } from '@/test/fixtures/patient-profile.fixture';
import { scheduledConsultationFixture } from '@/test/fixtures/consultations.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';

import { updatePatient, type UpdatePatientDto } from '../services/patients.service';
import { usePatient } from './use-patients';

const api = 'http://localhost:3001';

function PatientProbe({ id }: { id: string }) {
  const patient = usePatient(id);
  return <output>{patient.data?.name ?? patient.fetchStatus}</output>;
}

function HistoryProbe({ id }: { id: string }) {
  const history = useConsultations({ patientId: id, page: 1, limit: 10 });
  return <output>{history.data?.data[0]?.id ?? 'Cargando'}</output>;
}

it('serializa patientId junto a paginación, fecha y estado', async () => {
  let query = '';
  server.use(
    http.get(`${api}/consultations`, ({ request }) => {
      query = new URL(request.url).searchParams.toString();
      return HttpResponse.json({
        data: [scheduledConsultationFixture],
        meta: { total: 1, totalPages: 1 },
      });
    }),
  );
  const result = await getConsultations({
    patientId: 'patient-a',
    page: 2,
    limit: 10,
    date: '2026-10-20',
    status: 'PAID',
  });
  expect(new URLSearchParams(query).get('patientId')).toBe('patient-a');
  expect(Object.fromEntries(new URLSearchParams(query))).toEqual({
    patientId: 'patient-a',
    page: '2',
    limit: '10',
    date: '2026-10-20',
    status: 'PAID',
  });
  expect(result.data[0]?.id).toBe(scheduledConsultationFixture.id);
});

it('preserva llamadas generales sin filtrar paciente ni agregar estado', async () => {
  let query = '';
  server.use(
    http.get(`${api}/consultations`, ({ request }) => {
      query = new URL(request.url).search;
      return HttpResponse.json({ data: [], meta: { total: 0, totalPages: 0 } });
    }),
  );
  expect(await getConsultations({ page: 1, limit: 20 })).toEqual({
    data: [],
    meta: { total: 0, totalPages: 0 },
  });
  expect(Object.fromEntries(new URLSearchParams(query))).toEqual({
    page: '1',
    limit: '20',
  });
});

it('lee detalle por ID sin consultar el listado', async () => {
  const requests: string[] = [];
  server.use(
    http.get(`${api}/patients/:id`, ({ params, request }) => {
      requests.push(new URL(request.url).pathname);
      return HttpResponse.json({ ...patientMariaFixture, id: params['id'] });
    }),
  );
  const { queryClient } = renderWithClient(<PatientProbe id="patient-a" />);
  expect(await screen.findByText(patientMariaFixture.name)).toBeInTheDocument();
  expect(requests).toEqual(['/patients/patient-a']);
  expect(queryClient.getQueryData(['patients', 'patient-a'])).toMatchObject({
    id: 'patient-a',
  });
});

it('no solicita detalle cuando falta el ID', async () => {
  const requests: string[] = [];
  server.use(
    http.get(`${api}/patients/*`, ({ request }) => {
      requests.push(request.url);
      return HttpResponse.json(patientMariaFixture);
    }),
  );
  const { queryClient } = renderWithClient(<PatientProbe id="" />);
  expect(screen.getByText('idle')).toBeInTheDocument();
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  expect(requests).toEqual([]);
});

it('separa caché de detalle al navegar a otro paciente', async () => {
  server.use(
    http.get(`${api}/patients/:id`, ({ params }) =>
      HttpResponse.json({
        ...patientMariaFixture,
        id: params['id'],
        name: `Paciente ${params['id']}`,
      }),
    ),
  );
  const { rerender, queryClient } = renderWithClient(<PatientProbe id="a" />);
  expect(await screen.findByText('Paciente a')).toBeInTheDocument();
  rerender(
    <QueryClientProvider client={queryClient}>
      <PatientProbe id="b" />
    </QueryClientProvider>,
  );
  expect(screen.queryByText('Paciente a')).not.toBeInTheDocument();
  expect(await screen.findByText('Paciente b')).toBeInTheDocument();
  expect(queryClient.getQueryData(['patients', 'b'])).toMatchObject({
    id: 'b',
  });
});

it('separa historial por paciente y no impone estado', async () => {
  const requests: string[] = [];
  server.use(
    http.get(`${api}/consultations`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params.toString());
      return HttpResponse.json({
        data: [
          {
            ...scheduledConsultationFixture,
            id: `consulta-${params.get('patientId')}`,
          },
        ],
        meta: { total: 1, totalPages: 1 },
      });
    }),
  );
  const { rerender, queryClient } = renderWithClient(<HistoryProbe id="a" />);
  expect(await screen.findByText('consulta-a')).toBeInTheDocument();
  rerender(
    <QueryClientProvider client={queryClient}>
      <HistoryProbe id="b" />
    </QueryClientProvider>,
  );
  expect(screen.queryByText('consulta-a')).not.toBeInTheDocument();
  expect(await screen.findByText('consulta-b')).toBeInTheDocument();
  expect(requests.map((query) => Object.fromEntries(new URLSearchParams(query)))).toEqual([
    { patientId: 'a', page: '1', limit: '10' },
    { patientId: 'b', page: '1', limit: '10' },
  ]);
});

it('envía documento tipado al PATCH correcto y conserva la respuesta de representantes', async () => {
  const dto: UpdatePatientDto = {
    documentType: DocumentType.V,
    documentId: '87654321',
  };
  let body: unknown;
  server.use(
    http.patch(`${api}/patients/patient-a`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json({ ...patientWithRepresentativeFixture, ...dto });
    }),
  );
  const result = await updatePatient('patient-a', dto);
  expect(body).toEqual(dto);
  expect(result).toMatchObject({
    documentType: 'V',
    documentId: '87654321',
    representatives: patientWithRepresentativeFixture.representatives,
  });
});
