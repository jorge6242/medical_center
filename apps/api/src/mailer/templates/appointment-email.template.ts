import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderTemplateString } from './render-template';

import type { TemplateDefinition } from './template.types';

const appointmentEmailTemplateHtml = readFileSync(
  join(__dirname, 'appointment-email.template.html'),
  'utf8',
);

export interface AppointmentEmailTemplateContext {
  doctorName: string;
  patientName: string;
  scheduledDate: string;
  scheduledTime: string;
  services: string;
  totalUsd: string;
  centerName: string;
}

export const appointmentEmailTemplate: TemplateDefinition<AppointmentEmailTemplateContext> =
  {
    name: 'appointment-scheduled',
    version: 1,
    category: 'notification',
    audience: 'patient',
    subject: 'Cita médica agendada — {{scheduledDate}}',
    render: (context) =>
      renderTemplateString(appointmentEmailTemplateHtml, context),
  };
