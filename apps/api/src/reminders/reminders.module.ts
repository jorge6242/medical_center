import { Module } from '@nestjs/common';

import { AppointmentRemindersCron } from './appointment-reminders.cron';
import { BirthdayRemindersCron } from './birthday-reminders.cron';
import { RemindersService } from './reminders.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RailwayBucketModule } from '../railway-bucket/railway-bucket.module';

@Module({
  imports: [NotificationsModule, RailwayBucketModule],
  providers: [
    RemindersService,
    AppointmentRemindersCron,
    BirthdayRemindersCron,
  ],
})
export class RemindersModule {}
