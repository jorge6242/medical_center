import { SCHEDULE_CRON_OPTIONS } from '@nestjs/schedule/dist/schedule.constants';

import { AppointmentRemindersCron } from './appointment-reminders.cron';
import { BirthdayRemindersCron } from './birthday-reminders.cron';

const CARACAS_TIME_ZONE = 'America/Caracas';

describe('Reminder cron configuration', () => {
  it.each([
    [AppointmentRemindersCron, 'handleAppointmentReminders'],
    [BirthdayRemindersCron, 'handleBirthdayReminders'],
  ])('runs %p at 8 AM Caracas time', (cronClass, methodName) => {
    const method =
      cronClass.prototype[methodName as keyof typeof cronClass.prototype];
    const metadata = Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, method) as {
      timeZone?: string;
    };

    expect(metadata.timeZone).toBe(CARACAS_TIME_ZONE);
  });
});
