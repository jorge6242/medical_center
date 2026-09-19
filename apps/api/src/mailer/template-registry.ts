import { receiptEmailTemplate } from './templates';
import { onboardingEmailTemplate } from './templates/onboarding-email.template';

export const TEMPLATE_REGISTRY = {
  receiptEmail: receiptEmailTemplate,
  onboardingEmail: onboardingEmailTemplate,
} as const;

export type TemplateName = keyof typeof TEMPLATE_REGISTRY;
