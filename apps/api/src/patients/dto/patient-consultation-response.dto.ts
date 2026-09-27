export class PatientConsultationServiceResponseDto {
  declare serviceName: string;
  declare specialtyName: string;
}

export class PatientConsultationResponseDto {
  declare id: string;
  declare date: Date;
  declare status: string;
  declare hasMedicalRecord: boolean;
  declare canCreateMedicalRecord: boolean;
  declare services: PatientConsultationServiceResponseDto[];
}
