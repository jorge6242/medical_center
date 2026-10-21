import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { scheduledConsultationFixture } from '@/test/fixtures/consultations.fixture';
import { paymentsFixture } from '@/test/fixtures/payments.fixture';
import { ConsultationPaymentForm } from './consultation-payment-form';

it('blocks mobile payments without reference and submits after entering it', async () => {
  const bodies: unknown[] = [];
  server.use(
    http.post('*/payments', async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(paymentsFixture[0]);
    }),
  );
  const { user } = renderWithClient(
    <ConsultationPaymentForm consultation={scheduledConsultationFixture} />,
  );
  fireEvent.change(screen.getByPlaceholderText('36.50'), {
    target: { value: '40' },
  });
  await user.selectOptions(screen.getByDisplayValue('Efectivo USD'), 'PAGO_MOVIL');
  await user.click(screen.getByRole('button', { name: 'Max' }));
  await user.click(screen.getByRole('button', { name: 'Registrar pago' }));
  expect(await screen.findByText('Referencia requerida para Pago Móvil')).toBeVisible();
  expect(bodies).toEqual([]);
  await user.type(screen.getByPlaceholderText('Referencia requerida'), 'REF-123');
  await user.click(screen.getByRole('button', { name: 'Registrar pago' }));
  await waitFor(() => expect(bodies).toHaveLength(1));
});
