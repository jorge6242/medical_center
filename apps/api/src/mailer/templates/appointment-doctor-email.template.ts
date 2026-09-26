import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderTemplateString } from './render-template';

import type { TemplateDefinition } from './template.types';

const appointmentDoctorEmailTemplateHtml = readFileSync(
  join(__dirname, 'appointment-doctor-email.template.html'),
  'utf8',
);

export interface AppointmentDoctorEmailTemplateContext {
  centerName: string;
  patientName: string;
  scheduledDate: string;
  scheduledTime: string;
  services: string;
}

export const appointmentDoctorEmailTemplate: TemplateDefinition<AppointmentDoctorEmailTemplateContext> =
  {
    name: 'appointment-scheduled-doctor',
    version: 1,
    category: 'notification',
    audience: 'doctor',
    subject: 'Nueva cita agendada — {{scheduledDate}} {{scheduledTime}}',
    render: (context) =>
      renderTemplateString(appointmentDoctorEmailTemplateHtml, context),
  };
