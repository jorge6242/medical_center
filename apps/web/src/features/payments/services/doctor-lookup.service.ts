import { apiJson } from '@/config/api';
import type { LookupResponse } from '@/shared/types/lookup.types';

import type { DoctorResponse } from './doctors.service';

export const lookupDoctors = (query: string, cursor: string | null): Promise<LookupResponse<DoctorResponse>> => {
  const params = new URLSearchParams({ q: query, limit: '20' });
  if (cursor) params.set('cursor', cursor);
  return apiJson(`/doctors/lookup?${params.toString()}`);
};
