import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderTemplateString } from './render-template';

import type { TemplateDefinition } from './template.types';

const appointmentPatientEmailTemplateHtml = readFileSync(
  join(__dirname, 'appointment-patient-email.template.html'),
  'utf8',
);

export interface AppointmentPatientEmailTemplateContext {
  centerName: string;
  doctorName: string;
  patientName: string;
  scheduledDate: string;
  scheduledTime: string;
  services: string;
}

export const appointmentPatientEmailTemplate: TemplateDefinition<AppointmentPatientEmailTemplateContext> =
  {
    name: 'appointment-scheduled-patient',
    version: 1,
    category: 'notification',
    audience: 'patient',
    subject: '{{centerName}} — Cita médica agendada',
    render: (context) =>
      renderTemplateString(appointmentPatientEmailTemplateHtml, context),
  };
