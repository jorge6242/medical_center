import 'reflect-metadata';

import { validate } from 'class-validator';

import { CreateScheduledConsultationDto } from './create-scheduled-consultation.dto';
import { DoctorAvailabilityQueryDto } from './doctor-availability-query.dto';

describe('DoctorAvailabilityQueryDto', () => {
  it('accepts the stable identifiers used by the demo doctors', async () => {
    const dto = Object.assign(new DoctorAvailabilityQueryDto(), {
      doctorId: 'demo-doc-001',
      date: '2026-09-29',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts demo identifiers when creating a scheduled consultation', async () => {
    const dto = Object.assign(new CreateScheduledConsultationDto(), {
      patientId: 'demo-patient-001',
      doctorId: 'demo-doc-001',
      startsAt: new Date('2026-09-29T14:00:00.000Z'),
      endsAt: new Date('2026-09-29T15:00:00.000Z'),
      doctorServiceIds: ['demo-doc-001-service-001'],
      sendEmailNotification: true,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
