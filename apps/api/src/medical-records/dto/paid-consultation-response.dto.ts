export class PaidConsultationServiceResponseDto {
  declare serviceName: string;
  declare specialtyName: string;
  declare priceUsd: string;
}

export class PaidConsultationResponseDto {
  declare id: string;
  declare date: Date;
  declare status: 'PAID';
  declare patientId: string;
  declare patientName: string;
  declare patientDocument: string;
  declare doctorId: string;
  declare doctorName: string;
  declare services: PaidConsultationServiceResponseDto[];
  declare medicalRecordId: string | null;
  declare canCreateMedicalRecord: boolean;
}
