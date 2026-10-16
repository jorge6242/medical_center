import type { PatientResponse } from '@/features/patients/services/patients.service';

export const patientMariaFixture: PatientResponse = {
  id: 'patient-maria',
  name: 'María González',
  documentType: 'V',
  documentId: '12345678',
  phone: null,
  email: null,
  birthDate: null,
  gender: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  representatives: null,
};

export const patientLookupItemsFixture: PatientResponse[] = [patientMariaFixture];
