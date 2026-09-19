'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getDoctorProfile,
  updateDoctorProfile,
  verifyDoctorLicense,
  type UpdateDoctorProfileDto,
} from '../services/doctors-profile.service';

export function useDoctorProfile() {
  return useQuery({
    queryKey: ['doctor-profile'],
    queryFn: getDoctorProfile,
    retry: 1,
  });
}

export function useUpdateDoctorProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateDoctorProfileDto) => updateDoctorProfile(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
    },
  });
}

export function useVerifyDoctorLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyDoctorLicense,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
    },
  });
}
