import type { PatientResponse } from '../services/patients.service';
import { patientWithRepresentativeFixture } from '@/test/fixtures/patient-profile.fixture';

export const adult: PatientResponse = {
  ...patientWithRepresentativeFixture,
  gender: 'FEMININE',
  email: 'ana@example.com',
  birthDate: '2000-01-01',
};

export const minor: PatientResponse = {
  ...adult,
  documentType: 'M',
  documentId: '20261001ABCD',
  representatives: [
    {
      relationship: 'Madre',
      name: 'Representante de prueba',
      documentType: 'P',
      documentId: '90000000',
      phone: null,
    },
  ],
};
