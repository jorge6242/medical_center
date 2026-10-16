import type {
  ConsultationResponse,
  ConsultationStatus,
} from '@/features/consultations/services/consultations.service';
import { scheduledConsultationFixture } from './consultations.fixture';

export const agendaFixture: ConsultationResponse[] = (
  ['SCHEDULED', 'PENDING', 'PAID', 'VOIDED'] as ConsultationStatus[]
).map((status, index) => ({
  ...scheduledConsultationFixture,
  id: `agenda-${index}`,
  patientName: `Paciente ${status}`,
  doctorId: `doctor-${index}`,
  doctorName: `Doctor ${index}`,
  status,
  date: '2026-10-15T03:45:00.000Z',
  startsAt: '2026-10-15T03:45:00.000Z',
  endsAt: '2026-10-15T04:15:00.000Z',
}));
