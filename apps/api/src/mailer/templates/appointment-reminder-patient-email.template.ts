import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderTemplateString } from './render-template';

import type { TemplateDefinition } from './template.types';

const appointmentReminderPatientEmailTemplateHtml = readFileSync(
  join(__dirname, 'appointment-reminder-patient-email.template.html'),
  'utf8',
);

export interface AppointmentReminderPatientEmailTemplateContext {
  centerName: string;
  logoUrl: string;
  doctorName: string;
  patientName: string;
  scheduledDate: string;
  scheduledTime: string;
  services: string;
}

export const appointmentReminderPatientEmailTemplate: TemplateDefinition<AppointmentReminderPatientEmailTemplateContext> =
  {
    name: 'appointment-reminder-patient',
    version: 1,
    category: 'notification',
    audience: 'patient',
    subject: '{{centerName}} — Recordatorio de cita médica para mañana',
    render: (context) =>
      renderTemplateString(
        appointmentReminderPatientEmailTemplateHtml,
        context,
      ),
  };
