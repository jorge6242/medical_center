import type { PaymentResponse } from '@/features/payments/services/payments.service';

export const paymentsFixture: PaymentResponse[] = (
  [
    ['pay-one', 'COMPLETED', 'CONSULTATION'],
    ['pay-two', 'COMPLETED', 'LAB'],
    ['pay-void', 'VOIDED', 'CONSULTATION'],
    ['pay-processing', 'PROCESSING', 'CONSULTATION'],
  ] as const
).map(([id, status, itemType]) => ({
  id,
  status,
  idempotencyKey: null,
  item: {
    id: `item-${id}`,
    itemType,
    description: `Servicio ${id}`,
    quantity: 1,
    unitPriceUsd: '25.00',
    totalPriceUsd: '25.00',
    patientName: `Paciente ${id}`,
  },
  totalServiceUsd: '25.00',
  bcvExchangeRate: '40.00',
  totalPaidUsd: '25.00',
  totalPaidUsdEquivalent: '25.00',
  totalPaidBs: '0.00',
  totalIgtfUsd: '0.00',
  doctorShareUsd: '15.00',
  centerShareUsd: '10.00',
  details: [],
  adjustments: [],
  createdAt: '2026-10-15T15:00:00.000Z',
}));
