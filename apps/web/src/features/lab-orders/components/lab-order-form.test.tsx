import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import OrdenesPage from '@/app/(dashboard)/laboratorio/ordenes/page';
import {
  labPatientsFixture,
  labCatalogFixture,
  createdLabOrderFixture,
} from '@/test/fixtures/lab-order-form.fixture';
import { labDetailFixture } from '@/test/fixtures/lab-orders.fixture';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { LabOrderForm } from './lab-order-form';

// Solo cobro C fuera de este bloque; página/modal/alta son reales.
jest.mock('@/features/lab-orders/components/lab-payment-form', () => ({
  LabPaymentForm: () => null,
}));
const patients = () => HttpResponse.json({ data: labPatientsFixture });
const catalog = () => HttpResponse.json(labCatalogFixture);
beforeEach(() =>
  server.use(
    http.get('*/patients', patients),
    http.get('*/catalog/laboratories', catalog),
    http.get('*/lab-orders', () =>
      HttpResponse.json({ data: [], meta: { total: 0, totalPages: 0 } }),
    ),
  ),
);
const create = () => screen.getByRole('button', { name: 'Crear orden' });
async function fill(user: ReturnType<typeof renderWithClient>['user']) {
  await screen.findByRole('button', { name: /Hematología/ });
  await user.selectOptions(screen.getByDisplayValue('Seleccionar...'), 'patient-ana');
  await user.click(screen.getByRole('button', { name: /Hematología/ }));
}
it('exige paciente/test y envía selección final sin incluir tests removidos ni otro paciente', async () => {
  const bodies: unknown[] = [];
  const success = jest.fn();
  server.use(
    http.post('*/lab-orders', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(labDetailFixture('new-order'));
    }),
  );
  const { user } = renderWithClient(<LabOrderForm onSuccess={success} />);
  await screen.findByRole('button', { name: /Hematología/ });
  expect(create()).toBeDisabled();
  await user.selectOptions(screen.getByRole('combobox'), 'patient-maria');
  expect(create()).toBeDisabled();
  await user.click(screen.getByRole('button', { name: /Hematología/ }));
  await user.click(screen.getByRole('button', { name: /Orina/ }));
  expect(screen.getByText(/USD\s35,00/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: /Hematología/ }));
  await user.selectOptions(screen.getByRole('combobox'), 'patient-ana');
  await user.click(create());
  await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
  expect(bodies).toEqual([{ patientId: 'patient-ana', labTestIds: ['test-two'] }]);
});
it.each([
  ['patients', 'patients'],
  ['catalog/laboratories', 'laboratory-catalog'],
])('distingue error de %s y bloquea selección cacheada hasta recuperar', async (path, key) => {
  const bodies: unknown[] = [];
  server.use(
    http.post('*/lab-orders', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(labDetailFixture('new-order'));
    }),
  );
  const { user, queryClient } = renderWithClient(<LabOrderForm />);
  await fill(user);
  let release!: () => void;
  server.use(
    http.get(`*/${path}`, async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return HttpResponse.json({ message: 'Catálogo caído' }, { status: 503 });
    }),
  );
  let refresh!: Promise<void>;
  act(() => {
    refresh = queryClient.invalidateQueries({ queryKey: [key] });
  });
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.getByRole('status')).toHaveTextContent('Cargando');
  expect(screen.queryByRole('button', { name: 'Crear orden' })).not.toBeInTheDocument();
  release();
  await act(async () => {
    await refresh;
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('Catálogo caído');
  expect(screen.queryByText('No hay tests disponibles')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Crear orden' })).not.toBeInTheDocument();
  expect(bodies).toEqual([]);
  server.use(http.get(`*/${path}`, path === 'patients' ? patients : catalog));
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: [key] });
  });
  await user.click(create());
  expect(await screen.findByText('Orden creada exitosamente')).toBeVisible();
  expect(bodies).toEqual([{ patientId: 'patient-ana', labTestIds: ['test-one'] }]);
});
it('distingue carga de catálogo vacío válido y no permite crear', async () => {
  let release!: () => void;
  server.use(
    http.get('*/catalog/laboratories', async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return HttpResponse.json([]);
    }),
  );
  renderWithClient(<LabOrderForm />);
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.getByRole('status')).toHaveTextContent('Cargando');
  expect(screen.queryByText('No hay tests disponibles')).not.toBeInTheDocument();
  release();
  expect(await screen.findByText('No hay tests disponibles')).toBeVisible();
  expect(create()).toBeDisabled();
});
it('POST pendiente conserva modal ante Cancelar/Escape y rechazo permite segundo HTTP real', async () => {
  let listRequests = 0;
  let created = false;
  const bodies: unknown[] = [];
  let release!: () => void;
  server.use(
    http.get('*/lab-orders', () => {
      listRequests++;
      return HttpResponse.json({
        data: created ? [createdLabOrderFixture] : [],
        meta: { total: created ? 1 : 0, totalPages: created ? 1 : 0 },
      });
    }),
    http.post('*/lab-orders', async ({ request }) => {
      bodies.push(await request.json());
      if (bodies.length === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ message: 'Alta rechazada' }, { status: 503 });
      }
      created = true;
      return HttpResponse.json(labDetailFixture('new-order'));
    }),
  );
  const { user } = renderWithClient(<OrdenesPage />);
  await user.click(screen.getByRole('button', { name: 'Nueva orden' }));
  await fill(user);
  const beforeSave = listRequests;
  await user.click(create());
  await waitFor(() => expect(release).toBeDefined());
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  await user.keyboard('{Escape}');
  await user.click(screen.getByRole('button', { name: 'Nueva orden' }));
  expect(screen.getByRole('combobox', { name: 'Seleccionar paciente' })).toHaveValue('patient-ana');
  expect(bodies).toHaveLength(1);
  release();
  expect(await screen.findByRole('alert')).toHaveTextContent('Alta rechazada');
  expect(screen.getByRole('combobox', { name: 'Seleccionar paciente' })).toHaveValue('patient-ana');
  await user.click(create());
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Crear orden' })).not.toBeInTheDocument(),
  );
  expect(bodies).toEqual(Array(2).fill({ patientId: 'patient-ana', labTestIds: ['test-one'] }));
  expect(await screen.findByText(createdLabOrderFixture.patientName)).toBeVisible();
  expect(listRequests).toBeGreaterThan(beforeSave);
});
it('éxito cierra inmediatamente sin callback tardío que cierre la próxima alta', async () => {
  server.use(http.post('*/lab-orders', () => HttpResponse.json(labDetailFixture('new-order'))));
  const { user } = renderWithClient(<OrdenesPage />);
  await user.click(screen.getByRole('button', { name: 'Nueva orden' }));
  await fill(user);
  await user.click(create());
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Crear orden' })).not.toBeInTheDocument(),
  );
  await user.click(screen.getByRole('button', { name: 'Nueva orden' }));
  expect(await screen.findByRole('button', { name: 'Crear orden' })).toBeDisabled();
});
