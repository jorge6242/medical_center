export interface DoctorAvailabilityResponseDto {
  occupiedSlots: Array<{ startsAt: Date; endsAt: Date }>;
  isRequestedSlotAvailable?: boolean;
}
