import type { ConsultationResponse } from '@/features/consultations/services/consultations.service';

export const scheduledConsultationFixture: ConsultationResponse = {
  id: 'consulta-a',
  patientId: 'patient-maria',
  patientName: 'María González',
  patientDocument: 'V-12345678',
  doctorId: 'doctor-ana',
  doctorName: 'Dra. Ana Pérez',
  date: '2026-03-10',
  status: 'PENDING',
  services: [
    {
      serviceName: 'Consulta general',
      specialtyName: 'Cardiología',
      priceUsd: '60.00',
    },
  ],
  totalUsd: '60.00',
  notes: null,
};

/** Centinela: ningún payload debe llevar el ID de una consulta distinta a la abierta. */
export const otherConsultationFixture: ConsultationResponse = {
  ...scheduledConsultationFixture,
  id: 'consulta-b',
  patientId: 'patient-otro',
};
