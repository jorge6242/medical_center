import { receiptEmailTemplate } from './templates';
import { appointmentEmailTemplate } from './templates/appointment-email.template';
import { onboardingEmailTemplate } from './templates/onboarding-email.template';

export const TEMPLATE_REGISTRY = {
  receiptEmail: receiptEmailTemplate,
  onboardingEmail: onboardingEmailTemplate,
  appointmentEmail: appointmentEmailTemplate,
} as const;

export type TemplateName = keyof typeof TEMPLATE_REGISTRY;
