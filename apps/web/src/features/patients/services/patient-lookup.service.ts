import { apiJson } from '@/config/api';
import type { LookupResponse } from '@/shared/types/lookup.types';

import type { PatientResponse } from './patients.service';

export const lookupPatients = (query: string, cursor: string | null): Promise<LookupResponse<PatientResponse>> => {
  const params = new URLSearchParams({ q: query, limit: '20' });
  if (cursor) params.set('cursor', cursor);
  return apiJson(`/patients/lookup?${params.toString()}`);
};
