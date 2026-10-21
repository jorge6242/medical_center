import type { PatientResponse } from '@/features/patients/services/patients.service';

import { patientMariaFixture } from './patients.fixture';

export const patientWithRepresentativeFixture: PatientResponse = {
  ...patientMariaFixture,
  representatives: [
    {
      relationship: 'Madre',
      name: 'Representante de prueba',
      documentType: 'V',
      documentId: '90000000',
      phone: null,
    },
  ],
};
