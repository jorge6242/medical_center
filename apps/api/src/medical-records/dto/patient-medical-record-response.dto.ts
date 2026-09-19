import type { MedicalRecordStatus } from '@prisma/client';

export class PatientMedicalRecordResponseDto {
  declare id: string;
  declare consultationId: string;
  declare doctorName: string;
  declare specialtyName: string;
  declare templateType: string;
  declare templateVersion: string;
  declare recordedAt: Date;
  declare status: MedicalRecordStatus;
}
