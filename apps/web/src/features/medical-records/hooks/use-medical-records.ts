'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createMedicalRecord,
  getConsultationTemplateType,
  getMedicalRecord,
  getPaidConsultations,
  getPatientConsultations,
  getPatientMedicalRecords,
  type CreateMedicalRecordDto,
  type PaidConsultationsQuery,
} from '../services/medical-records.service';

export function usePatientMedicalRecords(patientId: string) {
  return useQuery({
    queryKey: ['patients', patientId, 'medical-records'],
    queryFn: () => getPatientMedicalRecords(patientId),
    enabled: !!patientId,
  });
}

export function usePatientConsultations(patientId: string) {
  return useQuery({
    queryKey: ['patients', patientId, 'consultations'],
    queryFn: () => getPatientConsultations(patientId),
    enabled: !!patientId,
  });
}

export function usePaidConsultations(query?: PaidConsultationsQuery) {
  return useQuery({
    queryKey: ['medical-records', 'paid-consultations', query?.page ?? 1, query?.limit ?? 10, query?.search ?? ''],
    queryFn: () => getPaidConsultations(query),
    placeholderData: (previousData) => previousData,
  });
}

export function useMedicalRecord(id: string) {
  return useQuery({
    queryKey: ['medical-records', id],
    queryFn: () => getMedicalRecord(id),
    enabled: !!id,
  });
}

export function useConsultationTemplateType(consultationId: string) {
  return useQuery({
    queryKey: ['consultations', consultationId, 'template-type'],
    queryFn: () => getConsultationTemplateType(consultationId),
    enabled: !!consultationId,
  });
}

export function useSaveMedicalRecord(patientId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateMedicalRecordDto) => createMedicalRecord(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patients', patientId, 'medical-records'] });
      void queryClient.invalidateQueries({ queryKey: ['patients', patientId, 'consultations'] });
      void queryClient.invalidateQueries({ queryKey: ['medical-records', 'paid-consultations'] });
      onSuccess?.();
    },
  });
}
