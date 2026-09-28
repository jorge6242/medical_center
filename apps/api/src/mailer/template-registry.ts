import { receiptEmailTemplate } from './templates';
import { appointmentDoctorEmailTemplate } from './templates/appointment-doctor-email.template';
import { appointmentPatientEmailTemplate } from './templates/appointment-patient-email.template';
import { appointmentReminderDoctorEmailTemplate } from './templates/appointment-reminder-doctor-email.template';
import { appointmentReminderPatientEmailTemplate } from './templates/appointment-reminder-patient-email.template';
import { birthdayAdminNotificationEmailTemplate } from './templates/birthday-admin-notification-email.template';
import { birthdayPatientEmailTemplate } from './templates/birthday-patient-email.template';
import { onboardingEmailTemplate } from './templates/onboarding-email.template';

export const TEMPLATE_REGISTRY = {
  receiptEmail: receiptEmailTemplate,
  onboardingEmail: onboardingEmailTemplate,
  appointmentDoctorEmail: appointmentDoctorEmailTemplate,
  appointmentPatientEmail: appointmentPatientEmailTemplate,
  appointmentReminderPatientEmail: appointmentReminderPatientEmailTemplate,
  appointmentReminderDoctorEmail: appointmentReminderDoctorEmailTemplate,
  birthdayPatientEmail: birthdayPatientEmailTemplate,
  birthdayAdminNotificationEmail: birthdayAdminNotificationEmailTemplate,
} as const;

export type TemplateName = keyof typeof TEMPLATE_REGISTRY;
