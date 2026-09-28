export enum NotificationType {
  APPOINTMENT_REMINDER_PATIENT = 'APPOINTMENT_REMINDER_PATIENT',
  APPOINTMENT_REMINDER_DOCTOR = 'APPOINTMENT_REMINDER_DOCTOR',
  BIRTHDAY_PATIENT = 'BIRTHDAY_PATIENT',
  BIRTHDAY_ADMIN_NOTIFICATION = 'BIRTHDAY_ADMIN_NOTIFICATION',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  SMS = 'SMS',
}

export interface NotificationPayload {
  type: NotificationType;
  tenantId: string;
  recipientEmail: string;
  context: Record<string, unknown>;
}
