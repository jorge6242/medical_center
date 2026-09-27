export function formatUsd(amount: string | number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatBs(amount: string | number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE;

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'Fecha no disponible';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...(APP_TIMEZONE ? { timeZone: APP_TIMEZONE } : {}),
  }).format(parsedDate);
}

export function formatDateShort(
  date: string | Date | null | undefined,
): string {
  if (!date) return 'Fecha no disponible';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'medium',
    ...(APP_TIMEZONE ? { timeZone: APP_TIMEZONE } : {}),
  }).format(parsedDate);
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '--:--';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return '--:--';

  return new Intl.DateTimeFormat('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    ...(APP_TIMEZONE ? { timeZone: APP_TIMEZONE } : {}),
  }).format(parsedDate);
}
