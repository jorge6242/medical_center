'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createDoctor,
  deactivateDoctor,
  getDoctorsAdmin,
  updateDoctor,
  verifyDoctor,
  verifyDocument,
  type CreateDoctorDto,
  type UpdateDoctorDto,
  type VerifyDocumentDto,
  type SacsVerificationResult,
} from '../services/doctors-admin.service';

export function useDoctorsAdmin() {
  return useQuery({ queryKey: ['doctors-admin'], queryFn: getDoctorsAdmin });
}

export function useCreateDoctor(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDoctorDto) => createDoctor(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['doctors-admin'] });
      void qc.invalidateQueries({ queryKey: ['doctors'] });
      onSuccess?.();
    },
  });
}

export function useUpdateDoctor(id: string, onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateDoctorDto) => updateDoctor(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['doctors-admin'] });
      void qc.invalidateQueries({ queryKey: ['doctors'] });
      onSuccess?.();
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
