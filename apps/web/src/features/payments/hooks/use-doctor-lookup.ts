'use client';

import { useLookup } from '@/shared/hooks/use-lookup';

import { lookupDoctors } from '../services/doctor-lookup.service';

export function useDoctorLookup(query: string) {
  return useLookup('doctor-lookup', query, lookupDoctors);
}
