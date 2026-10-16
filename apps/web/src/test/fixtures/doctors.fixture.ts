import type {
  DoctorResponse,
  DoctorServiceResponse,
} from '@/features/payments/services/doctors.service';

export const doctorAnaFixture: DoctorResponse = {
  id: 'doctor-ana',
  name: 'Dra. Ana Pérez',
  documentType: 'V',
  documentId: '87654321',
  primarySpecialtyId: 'spec-cardio',
  primarySpecialtyName: 'Cardiología',
};

export const doctorLookupItemsFixture: DoctorResponse[] = [doctorAnaFixture];

export const doctorServicesFixture: DoctorServiceResponse[] = [
  {
    id: 'ds-1',
    specialtyId: 'spec-cardio',
    specialtyName: 'Cardiología',
    serviceId: 'svc-cons',
    serviceName: 'Consulta general',
    priceUsd: '60.00',
  },
];
