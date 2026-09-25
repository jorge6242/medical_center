'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createDoctor,
  deactivateDoctor,
  getDoctorAdmin,
  getDoctorsAdmin,
  getDoctorOnboardingStatus,
  sendDoctorOnboarding,
  updateDoctor,
  verifyDoctor,
  verifyDocument,
  type CreateDoctorDto,
  type DoctorAdminResponse,
  type GetDoctorsQuery,
  type UpdateDoctorDto,
  type VerifyDocumentDto,
  type SacsVerificationResult,
} from '../services/doctors-admin.service';

export function useDoctorsAdmin(query?: GetDoctorsQuery) {
  return useQuery({
    queryKey: ['doctors-admin', query?.page, query?.limit, query?.search],
    queryFn: () => getDoctorsAdmin(query),
  });
}

export function useDoctorAdmin(id: string) {
  return useQuery({
    queryKey: ['doctor-admin', id],
    queryFn: () => getDoctorAdmin(id),
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useCreateDoctor(onSuccess?: (doctor: DoctorAdminResponse) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDoctorDto) => createDoctor(dto),
    onSuccess: async (doctor) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['doctors-admin'] }),
        qc.invalidateQueries({ queryKey: ['doctors'] }),
      ]);
      onSuccess?.(doctor);
    },
  });
}

export function useUpdateDoctor(id: string, onSuccess?: (doctor: DoctorAdminResponse) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateDoctorDto) => updateDoctor(id, dto),
    onSuccess: async (doctor) => {
      qc.setQueryData(['doctor-admin', id], doctor);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['doctors-admin'] }),
        qc.invalidateQueries({ queryKey: ['doctors'] }),
      ]);
      onSuccess?.(doctor);
    },
  });
}

export function useDeactivateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deactivateDoctor,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['doctors-admin'] });
      void qc.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
}

export function useVerifyDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: verifyDoctor,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['doctors-admin'] });
    },
  });
}

export function useVerifyDocument() {
  return useMutation<SacsVerificationResult, Error, VerifyDocumentDto>({
    mutationFn: verifyDocument,
  });
}

export function useDoctorOnboardingStatus(doctorId: string) {
  return useQuery({
    queryKey: ['doctor-onboarding-status', doctorId],
    queryFn: () => getDoctorOnboardingStatus(doctorId),
    enabled: !!doctorId,
    retry: false,
  });
}

export function useSendDoctorOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendDoctorOnboarding,
    onSuccess: (_data, doctorId) => {
      void qc.invalidateQueries({ queryKey: ['doctor-onboarding-status', doctorId] });
    },
  });
}
