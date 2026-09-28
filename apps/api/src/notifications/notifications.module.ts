import { Global, Module } from '@nestjs/common';

import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import { NotificationService } from './notifications.service';
import { MailerModule } from '../mailer/mailer.module';

@Global()
@Module({
  imports: [MailerModule],
  providers: [NotificationService, EmailChannel, WhatsAppChannel, SmsChannel],
  exports: [NotificationService],
})
export class NotificationsModule {}
