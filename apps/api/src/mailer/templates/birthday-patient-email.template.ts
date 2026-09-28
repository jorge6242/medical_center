import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderTemplateString } from './render-template';

import type { TemplateDefinition } from './template.types';

const birthdayPatientEmailTemplateHtml = readFileSync(
  join(__dirname, 'birthday-patient-email.template.html'),
  'utf8',
);

export interface BirthdayPatientEmailTemplateContext {
  centerName: string;
  logoUrl: string;
  patientName: string;
}

export const birthdayPatientEmailTemplate: TemplateDefinition<BirthdayPatientEmailTemplateContext> =
  {
    name: 'birthday-patient',
    version: 1,
    category: 'notification',
    audience: 'patient',
    subject: '{{centerName}} — ¡Feliz cumpleaños!',
    render: (context) =>
      renderTemplateString(birthdayPatientEmailTemplateHtml, context),
  };
