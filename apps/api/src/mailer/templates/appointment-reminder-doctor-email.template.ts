import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderTemplateString } from './render-template';

import type { TemplateDefinition } from './template.types';

const appointmentReminderDoctorEmailTemplateHtml = readFileSync(
  join(__dirname, 'appointment-reminder-doctor-email.template.html'),
  'utf8',
);

export interface AppointmentReminderDoctorEmailTemplateContext {
  centerName: string;
  logoUrl: string;
  patientName: string;
  scheduledDate: string;
  scheduledTime: string;
  services: string;
}

export const appointmentReminderDoctorEmailTemplate: TemplateDefinition<AppointmentReminderDoctorEmailTemplateContext> =
  {
    name: 'appointment-reminder-doctor',
    version: 1,
    category: 'notification',
    audience: 'doctor',
    subject: '{{centerName}} — Recordatorio de consulta para mañana',
    render: (context) =>
      renderTemplateString(appointmentReminderDoctorEmailTemplateHtml, context),
  };
