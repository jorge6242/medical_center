import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderTemplateString } from './render-template';

import type { TemplateDefinition } from './template.types';

const onboardingEmailTemplateHtml = readFileSync(
  join(__dirname, 'onboarding-email.template.html'),
  'utf8',
);

export interface OnboardingEmailTemplateContext {
  doctorName: string;
  onboardingUrl: string;
  expiresIn: string;
}

export const onboardingEmailTemplate: TemplateDefinition<OnboardingEmailTemplateContext> =
  {
    name: 'doctor-onboarding',
    version: 1,
    category: 'auth',
    audience: 'doctor',
    subject: 'Activa tu cuenta - Centro Médico',
    render: (context) =>
      renderTemplateString(onboardingEmailTemplateHtml, context),
  };
