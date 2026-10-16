import type {
  LabOrderDetail,
  LabOrderListItem,
} from '@/features/lab-orders/services/lab-orders.service';

export const labOrdersFixture: LabOrderListItem[] = ['one', 'two', 'paid', 'void'].map(
  (id, index) => ({
    id: `lab-${id}`,
    patientName: `Paciente ${id}`,
    totalUsd: '25.00',
    status: index < 2 ? 'PENDING' : index === 2 ? 'PAID' : 'VOIDED',
    createdAt: '2026-10-15T14:00:00Z',
  }),
);
export const labDetailFixture = (id: string, status = 'PENDING'): LabOrderDetail => ({
  id,
  status,
  patient: {
    id: `patient-${id}`,
    name: `Detalle ${id}`,
    documentType: 'V',
    documentId: '12345678',
  },
  tests: [{ labTestId: 'test-one', testName: 'Hematología histórica', priceUsd: '25.00' }],
  totalUsd: '25.00',
  createdAt: '2026-10-15T14:00:00Z',
});
