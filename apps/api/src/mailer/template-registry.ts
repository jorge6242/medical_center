import { receiptEmailTemplate } from './templates';
import { appointmentDoctorEmailTemplate } from './templates/appointment-doctor-email.template';
import { appointmentPatientEmailTemplate } from './templates/appointment-patient-email.template';
import { onboardingEmailTemplate } from './templates/onboarding-email.template';

export const TEMPLATE_REGISTRY = {
  receiptEmail: receiptEmailTemplate,
  onboardingEmail: onboardingEmailTemplate,
  appointmentDoctorEmail: appointmentDoctorEmailTemplate,
  appointmentPatientEmail: appointmentPatientEmailTemplate,
} as const;

export type TemplateName = keyof typeof TEMPLATE_REGISTRY;
