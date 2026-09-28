import type { NotificationPayload } from '../notification.types';

export interface NotificationChannelHandler {
  send(payload: NotificationPayload): Promise<void>;
}
