import { appointmentDoctorEmailTemplate } from './appointment-doctor-email.template';
import { appointmentPatientEmailTemplate } from './appointment-patient-email.template';

const centerName = 'Centro Médico Virgen del Rosario';

describe('appointment email templates', () => {
  it('identifies the tenant in both email subjects', () => {
    const doctorSubject = appointmentDoctorEmailTemplate.subject.replace(
      '{{centerName}}',
      centerName,
    );
    const patientSubject = appointmentPatientEmailTemplate.subject.replace(
      '{{centerName}}',
      centerName,
    );

    expect(doctorSubject).toBe(
      'Centro Médico Virgen del Rosario — Nueva cita agendada',
    );
    expect(patientSubject).toBe(
      'Centro Médico Virgen del Rosario — Cita médica agendada',
    );
  });
});
