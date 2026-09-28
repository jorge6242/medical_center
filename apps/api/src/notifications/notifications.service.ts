import { Injectable, Logger } from '@nestjs/common';

import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import {
  NotificationChannel,
  NotificationType,
  type NotificationPayload,
} from './notification.types';

import type { NotificationChannelHandler } from './channels/notification-channel.interface';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly channels: Record<
    NotificationChannel,
    NotificationChannelHandler
  >;

  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly whatsAppChannel: WhatsAppChannel,
    private readonly smsChannel: SmsChannel,
  ) {
    this.channels = {
      [NotificationChannel.EMAIL]: this.emailChannel,
      [NotificationChannel.WHATSAPP]: this.whatsAppChannel,
      [NotificationChannel.SMS]: this.smsChannel,
    };
  }

  async send(
    type: NotificationType,
    tenantId: string,
    recipientEmail: string,
    context: Record<string, unknown>,
    channel: NotificationChannel = NotificationChannel.EMAIL,
  ): Promise<void> {
    const payload: NotificationPayload = {
      type,
      tenantId,
      recipientEmail,
      context,
    };

    const handler = this.channels[channel];

    if (!handler) {
      this.logger.warn(`No handler found for notification channel ${channel}`);
      return;
    }

    await handler.send(payload);
  }
}
