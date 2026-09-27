export interface ConsultationServiceDto {
  serviceName: string;
  specialtyName: string;
  priceUsd: string;
}

export interface ConsultationResponseDto {
  id: string;
  patientId: string;
  patientName: string;
  patientDocument: string;
  doctorId: string;
  doctorName: string;
  date: Date;
  status: string;
  services: ConsultationServiceDto[];
  totalUsd: string;
  notes?: string | null;
  paymentId?: string | null;
  attendedAt?: Date | null;
  createdAt: Date;
}
