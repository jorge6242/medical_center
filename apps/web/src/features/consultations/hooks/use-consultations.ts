"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createScheduledConsultation,
  getDoctorAvailability,
  getConsultationDetail,
  getConsultations,
  getTodayConsultations,
  markConsultationAsAttended,
  resendScheduledNotifications,
  voidConsultation,
  updateScheduledConsultation,
  type ConsultationQuery,
} from "../services/consultations.service";

const consultationsKey = ["consultations", "today"] as const;
const consultationsRootKey = ["consultations"] as const;

export function useTodayConsultations() {
  return useQuery({
    queryKey: consultationsKey,
    queryFn: getTodayConsultations,
  });
}

export function useConsultations(query: ConsultationQuery) {
  return useQuery({
    queryKey: ["consultations", query],
    queryFn: () => getConsultations(query),
  });
}

export function useDoctorAvailability(
  doctorId: string,
  date: string,
  startsAt: string,
  endsAt: string,
  excludeConsultationId?: string,
) {
  return useQuery({
    queryKey: [
      "consultations",
      "availability",
      doctorId,
      date,
      startsAt,
      endsAt,
      excludeConsultationId,
    ],
    queryFn: () =>
      getDoctorAvailability(
        doctorId,
        date,
        startsAt,
        endsAt,
        excludeConsultationId,
      ),
    enabled: Boolean(doctorId && date && startsAt && endsAt),
  });
}

export function useConsultationDetail(id: string) {
  return useQuery({
    queryKey: ["consultations", "detail", id],
    queryFn: () => getConsultationDetail(id),
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
}

export function useCreateScheduledConsultation(
  onSuccess?: (
    consultation: Awaited<ReturnType<typeof createScheduledConsultation>>,
  ) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createScheduledConsultation,
    onSuccess: (consultation) => {
      void queryClient.invalidateQueries({ queryKey: consultationsRootKey });
      onSuccess?.(consultation);
    },
  });
}

export function useMarkConsultationAsAttended() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markConsultationAsAttended,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: consultationsRootKey });
    },
  });
}

export function useResendScheduledNotifications() {
  return useMutation({ mutationFn: resendScheduledNotifications });
}

export function useVoidConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      voidConsultation(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: consultationsRootKey });
    },
  });
}

export function useUpdateScheduledConsultation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      startsAt,
      endsAt,
      notes,
    }: {
      id: string;
      startsAt: string;
      endsAt: string;
      notes?: string;
    }) => updateScheduledConsultation(id, { startsAt, endsAt, notes }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: consultationsRootKey });
      onSuccess?.();
    },
  });
}
