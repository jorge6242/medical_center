import { patientMariaFixture } from './patients.fixture';
export const labPatientsFixture = [
  patientMariaFixture,
  { ...patientMariaFixture, id: 'patient-ana', name: 'Ana Ruiz', documentId: '22222222' },
];
export const labCatalogFixture = [
  { labTestId: 'test-one', testName: 'Hematología', priceUsd: '25.00' },
  { labTestId: 'test-two', testName: 'Orina', priceUsd: '10.00' },
];

export const createdLabOrderFixture = {
  id: 'new-order',
  patientName: 'Ana Ruiz - orden creada',
  totalUsd: '25.00',
  status: 'PENDING',
  createdAt: '2026-10-16T14:00:00Z',
};
