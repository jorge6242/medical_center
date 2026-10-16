import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { homeStatsAlertFixture, homeStatsFixture } from '@/test/fixtures/home-stats.fixture';
import { cardioDoctorsFixture, pediatriaDoctorsFixture } from '@/test/fixtures/specialties.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';

import InicioPage from './page';

// Cobro/PDF y catálogo son otras tareas; no se abren en esta suite V03.
jest.mock('@/features/payments/components/consultation-payment-form', () => ({
  ConsultationPaymentForm: () => null,
}));

function metric(label: string) {
  const card = screen.getAllByText(label)[0]?.parentElement;
  if (!card) throw new Error(`No se encontró la tarjeta ${label}`);
  return within(card);
}

async function openSpecialties() {
  const result = renderWithClient(<InicioPage />);
  await result.user.click(screen.getByRole('button', { name: /Consultar especialidades/ }));
  await screen.findByRole('button', { name: 'Cardiología' });
  return result;
}

function deferredResponse() {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { pending, release };
}

describe('V03 Inicio: datos recibidos y selección operativa', () => {
  it('presenta los cuatro KPIs no triviales y la alerta recibida', async () => {
    renderWithClient(<InicioPage />);
    await screen.findByText(homeStatsAlertFixture.message);
    expect(metric('Pacientes hoy').getByText('7')).toBeVisible();
    expect(metric('Doctores hoy').getByText('3')).toBeVisible();
    expect(metric('Doctores con honorarios pendientes').getByText('2')).toBeVisible();
    expect(metric('Honorarios pendientes').getByText(/150,50/)).toHaveTextContent(/USD|US\$/);
    expect(screen.getByText('warning')).toBeVisible();
    expect(screen.queryByText('Sin alertas por ahora.')).not.toBeInTheDocument();
  });

  it('espera los KPIs y distingue una respuesta válida sin alertas', async () => {
    const response = deferredResponse();
    server.use(
      http.get('*/stats/home', async () => {
        await response.pending;
        return HttpResponse.json({
          ...homeStatsFixture,
          patientsToday: 12,
          alerts: [],
        });
      }),
    );
    renderWithClient(<InicioPage />);
    try {
      expect(metric('Pacientes hoy').getByText('...')).toBeVisible();
      expect(metric('Doctores hoy').getByText('...')).toBeVisible();
      expect(metric('Doctores con honorarios pendientes').getByText('...')).toBeVisible();
      expect(metric('Honorarios pendientes').getByText('...')).toBeVisible();
    } finally {
      await act(async () => response.release());
    }
    await waitFor(() => expect(metric('Pacientes hoy').getByText('12')).toBeVisible());
    expect(screen.getByText('Sin alertas por ahora.')).toBeVisible();
    expect(screen.queryByText(homeStatsAlertFixture.message)).not.toBeInTheDocument();
  });

  it('busca sin distinguir mayúsculas y muestra vacío solo cuando no hay coincidencias', async () => {
    const { user } = await openSpecialties();
    const search = screen.getByPlaceholderText('Ej. Cardiología');
    await user.type(search, 'cArDiO');
    expect(screen.getByRole('button', { name: 'Cardiología' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Pediatría' })).not.toBeInTheDocument();
    await user.clear(search);
    await user.type(search, 'inexistente');
    expect(screen.getByText('No hay especialidades que coincidan.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Cardiología' })).not.toBeInTheDocument();
    await user.clear(search);
    expect(screen.getByRole('button', { name: 'Pediatría' })).toBeVisible();
  });

  it('consulta doctores solo después de seleccionar especialidad y muestra sus servicios', async () => {
    const requests: string[] = [];
    const response = deferredResponse();
    server.use(
      http.get('*/doctors/by-specialty/:specialtyId', async ({ params }) => {
        requests.push(String(params['specialtyId']));
        await response.pending;
        return HttpResponse.json(cardioDoctorsFixture);
      }),
    );
    const { user } = await openSpecialties();
    expect(requests).toEqual([]);
    try {
      await user.click(screen.getByRole('button', { name: 'Cardiología' }));
      await screen.findByText('Buscando doctores…');
      expect(requests).toEqual(['spec-cardio']);
      expect(screen.queryByText('Ecocardiograma')).not.toBeInTheDocument();
    } finally {
      await act(async () => response.release());
    }
    await user.click(await screen.findByRole('button', { name: /Dra. Ana Pérez/ }));
    expect(screen.getByText('Servicios y precios de Dra. Ana Pérez')).toBeVisible();
    expect(screen.getByText('Ecocardiograma')).toBeVisible();
    expect(screen.getByText('US$ 80.00')).toBeVisible();
    expect(screen.queryByText('Consulta pediátrica')).not.toBeInTheDocument();
  });

  it('limpia doctor al cambiar especialidad aunque el mismo ID exista en ambas respuestas', async () => {
    server.use(
      http.get('*/doctors/by-specialty/spec-pediatria', () =>
        HttpResponse.json({
          ...pediatriaDoctorsFixture,
          doctors: cardioDoctorsFixture.doctors.map((doctor) => ({
            ...doctor,
            services: pediatriaDoctorsFixture.doctors.flatMap((item) => item.services),
          })),
        }),
      ),
    );
    const { user } = await openSpecialties();
    await user.click(screen.getByRole('button', { name: 'Cardiología' }));
    await user.click(await screen.findByRole('button', { name: /Dra. Ana Pérez/ }));
    expect(screen.getByText('US$ 80.00')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Pediatría' }));
    await screen.findByText('Doctores de Pediatría');
    expect(screen.queryByText('Servicios y precios de Dra. Ana Pérez')).not.toBeInTheDocument();
    expect(screen.queryByText('Consulta pediátrica')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Dra. Ana Pérez/ }));
    expect(screen.getByText('Consulta pediátrica')).toBeVisible();
    expect(screen.getByText('US$ 40.00')).toBeVisible();
    expect(screen.queryByText('Ecocardiograma')).not.toBeInTheDocument();
  });

  it('distingue especialidad sin doctores de doctor sin servicios', async () => {
    server.use(
      http.get('*/doctors/by-specialty/:specialtyId', ({ params }) =>
        HttpResponse.json(
          params['specialtyId'] === 'spec-cardio'
            ? { ...cardioDoctorsFixture, doctors: [] }
            : {
                ...pediatriaDoctorsFixture,
                doctors: pediatriaDoctorsFixture.doctors.map((doctor) => ({
                  ...doctor,
                  services: [],
                })),
              },
        ),
      ),
    );
    const { user } = await openSpecialties();
    await user.click(screen.getByRole('button', { name: 'Cardiología' }));
    await screen.findByText('No hay doctores activos para esta especialidad.');
    await user.click(screen.getByRole('button', { name: 'Pediatría' }));
    await user.click(await screen.findByRole('button', { name: /Dr. Luis Mora/ }));
    expect(
      screen.getByText('Este doctor no tiene servicios configurados para la especialidad.'),
    ).toBeVisible();
    expect(
      screen.queryByText('No hay doctores activos para esta especialidad.'),
    ).not.toBeInTheDocument();
  });
});

describe('V03 errores operativos sin resultados ficticios', () => {
  it('muestra error del resumen sin KPIs cero ni alertas vacías exitosas', async () => {
    server.use(
      http.get('*/stats/home', () =>
        HttpResponse.json({ message: 'No disponible' }, { status: 503 }),
      ),
    );
    renderWithClient(<InicioPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el resumen.');
    expect(screen.queryByText('Pacientes hoy')).not.toBeInTheDocument();
    expect(screen.queryByText('Sin alertas por ahora.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Consultar especialidades/ })).toBeEnabled();
  });

  it('no disfraza un error de especialidades como búsqueda sin coincidencias', async () => {
    server.use(
      http.get('*/specialties', () =>
        HttpResponse.json({ message: 'No disponible' }, { status: 503 }),
      ),
    );
    const { user } = renderWithClient(<InicioPage />);
    await user.click(screen.getByRole('button', { name: /Consultar especialidades/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las especialidades.',
    );
    expect(screen.queryByText('No hay especialidades que coincidan.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cardiología' })).not.toBeInTheDocument();
  });

  it('distingue error de doctores de vacío y se recupera al elegir otra especialidad', async () => {
    server.use(
      http.get('*/doctors/by-specialty/spec-cardio', () =>
        HttpResponse.json({ message: 'No disponible' }, { status: 503 }),
      ),
    );
    const { user } = await openSpecialties();
    await user.click(screen.getByRole('button', { name: 'Cardiología' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar los doctores.',
    );
    expect(
      screen.queryByText('No hay doctores activos para esta especialidad.'),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pediatría' }));
    await user.click(await screen.findByRole('button', { name: /Dr. Luis Mora/ }));
    expect(screen.getByText('Consulta pediátrica')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('advierte también si falla la actualización de un resumen previamente válido', async () => {
    const { queryClient } = renderWithClient(<InicioPage />);
    await screen.findByText(homeStatsAlertFixture.message);
    expect(metric('Pacientes hoy').getByText('7')).toBeVisible();
    server.use(
      http.get('*/stats/home', () =>
        HttpResponse.json({ message: 'No disponible' }, { status: 503 }),
      ),
    );
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['home-stats'] });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el resumen.');
    expect(screen.queryByText('Pacientes hoy')).not.toBeInTheDocument();
    expect(screen.queryByText(homeStatsAlertFixture.message)).not.toBeInTheDocument();
  });
});
