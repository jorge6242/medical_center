import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RemindersService } from './reminders.service';

@Injectable()
export class BirthdayRemindersCron {
  private readonly logger = new Logger(BirthdayRemindersCron.name);

  constructor(private readonly remindersService: RemindersService) {}

  @Cron('40 17 * * *', { timeZone: 'America/Caracas' })
  async handleBirthdayReminders(): Promise<void> {
    this.logger.log('Triggering daily birthday reminders');
    await this.remindersService.sendBirthdayReminders();
  }
}
