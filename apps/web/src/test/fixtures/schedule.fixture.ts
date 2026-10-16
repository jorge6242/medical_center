import { doctorAnaFixture, doctorServicesFixture } from './doctors.fixture';
import { scheduledConsultationFixture } from './consultations.fixture';

export const otherScheduleDoctorFixture = {
  ...doctorAnaFixture,
  id: 'doctor-b',
  name: 'Dr. Bruno Díaz',
};
export const otherScheduleServicesFixture = doctorServicesFixture.map((service) => ({
  ...service,
  id: 'ds-2',
  serviceName: 'Control especializado',
}));
export const createdScheduleFixture = {
  ...scheduledConsultationFixture,
  status: 'SCHEDULED' as const,
  date: '2026-10-15T03:45:00.000Z',
  startsAt: '2026-10-15T03:45:00.000Z',
  endsAt: '2026-10-15T04:15:00.000Z',
};
