import { Injectable, Logger } from '@nestjs/common';

import type { NotificationChannelHandler } from './notification-channel.interface';
import type { NotificationPayload } from '../notification.types';

@Injectable()
export class SmsChannel implements NotificationChannelHandler {
  private readonly logger = new Logger(SmsChannel.name);

  async send(payload: NotificationPayload): Promise<void> {
    this.logger.warn(
      `SMS delivery is not implemented yet. Notification ${payload.type} to ${payload.recipientEmail} was not sent.`,
    );
  }
}
