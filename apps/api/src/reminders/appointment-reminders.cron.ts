import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RemindersService } from './reminders.service';

@Injectable()
export class AppointmentRemindersCron {
  private readonly logger = new Logger(AppointmentRemindersCron.name);

  constructor(private readonly remindersService: RemindersService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM, { timeZone: 'America/Caracas' })
  async handleAppointmentReminders(): Promise<void> {
    this.logger.log('Triggering daily appointment reminders');
    await this.remindersService.sendAppointmentReminders();
  }
}
