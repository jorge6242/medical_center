import { DateTime } from 'luxon';

const DEFAULT_TIMEZONE = 'America/Caracas';

export function getAppTimezone(): string {
  return process.env.NEXT_PUBLIC_APP_TIMEZONE ?? DEFAULT_TIMEZONE;
}

export function parseDateTimeToUtc(date: string, time: string): Date {
  const zone = getAppTimezone();
  const dt = DateTime.fromISO(`${date}T${time}`, { zone });
  if (!dt.isValid) {
    throw new Error(`Fecha u hora inválida: ${date}T${time}`);
  }
  return dt.toUTC().toJSDate();
}

export function addMinutesToUtc(date: Date, minutes: number): Date {
  return DateTime.fromJSDate(date).toUTC().plus({ minutes }).toJSDate();
}

export function formatDateInput(date: string | Date): string {
  const zone = getAppTimezone();
  return DateTime.fromJSDate(new Date(date), { zone }).toISODate() ?? '';
}

export function formatTimeInput(date: string | Date): string {
  const zone = getAppTimezone();
  return DateTime.fromJSDate(new Date(date), { zone }).toFormat('HH:mm');
}

export function formatTimeWithTimezone(date: string | Date): string {
  const zone = getAppTimezone();
  return DateTime.fromJSDate(new Date(date), { zone })
    .setLocale('es-VE')
    .toFormat('h:mm a');
}
