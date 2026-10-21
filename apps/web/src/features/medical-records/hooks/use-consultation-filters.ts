'use client';

import { DateTime } from 'luxon';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useConsultationFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawDate = params.get('date') ?? '';
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && DateTime.fromISO(rawDate).isValid;
  const rawPage = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawLimit = Number(params.get('limit') ?? 10);
  const limit = Number.isSafeInteger(rawLimit) && rawLimit > 0 && rawLimit <= 100 ? rawLimit : 10;
  const query = {
    date: validDate ? rawDate : undefined,
    search: params.get('search') ?? '',
    page,
    limit,
  };

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    if ('date' in changes || 'search' in changes || 'limit' in changes) next.delete('page');
    for (const [key, value] of Object.entries(changes)) {
      if (!value || (key === 'page' && value === '1')) next.delete(key);
      else next.set(key, value);
    }
    router.push(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  }

  return { query, update };
}
