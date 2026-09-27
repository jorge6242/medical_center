export interface DoctorAvailabilityResponseDto {
  occupiedSlots: Date[];
  isRequestedSlotAvailable?: boolean;
}
