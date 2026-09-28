import { Injectable, Logger } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { MailerService } from '../../mailer/mailer.service';
import { NotificationType } from '../notification.types';

import type { NotificationChannelHandler } from './notification-channel.interface';
import type { TemplateName } from '../../mailer/template-registry';
import type { NotificationPayload } from '../notification.types';

const TEMPLATE_BY_NOTIFICATION_TYPE: Record<NotificationType, TemplateName> = {
  [NotificationType.APPOINTMENT_REMINDER_PATIENT]:
    'appointmentReminderPatientEmail',
  [NotificationType.APPOINTMENT_REMINDER_DOCTOR]:
    'appointmentReminderDoctorEmail',
  [NotificationType.BIRTHDAY_PATIENT]: 'birthdayPatientEmail',
  [NotificationType.BIRTHDAY_ADMIN_NOTIFICATION]:
    'birthdayAdminNotificationEmail',
};

@Injectable()
export class EmailChannel implements NotificationChannelHandler {
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private readonly mailer: MailerService) {}

  async send(payload: NotificationPayload): Promise<void> {
    const template = TEMPLATE_BY_NOTIFICATION_TYPE[payload.type];

    const { subject, html } = this.mailer.renderTemplate(
      template,
      payload.context,
    );

    await this.mailer.sendEmail(payload.recipientEmail, subject, html);

    this.logger.log(
      `Email sent for ${payload.type} to ${payload.recipientEmail}`,
    );
  }
}
