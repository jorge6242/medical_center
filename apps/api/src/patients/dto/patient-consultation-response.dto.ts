export class PatientConsultationServiceResponseDto {
  declare serviceName: string;
  declare specialtyName: string;
}

export class PatientConsultationResponseDto {
  declare id: string;
  declare date: Date;
  declare status: 'PAID';
  declare hasMedicalRecord: false;
  declare canCreateMedicalRecord: true;
  declare services: PatientConsultationServiceResponseDto[];
}
