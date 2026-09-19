'use client';

import { useLookup } from '@/shared/hooks/use-lookup';

import { lookupPatients } from '../services/patient-lookup.service';

export function usePatientLookup(query: string) {
  return useLookup('patient-lookup', query, lookupPatients);
}
