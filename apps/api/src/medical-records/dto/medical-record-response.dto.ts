import type { MedicalRecordStatus } from '@prisma/client';

export class MedicalRecordResponseDto {
  declare id: string;
  declare tenantId: string;
  declare patientId: string;
  declare doctorId: string;
  declare consultationId: string;
  declare createdById: string;
  declare specialtyName: string;
  declare templateType: string;
  declare templateVersion: string;
  declare templateSnapshot: Record<string, unknown> | null;
  declare clinicalData: Record<string, unknown>;
  declare status: MedicalRecordStatus;
  declare recordedAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare patientName: string;
  declare patientDocumentType: string;
  declare patientDocumentId: string;
  declare doctorName: string;
  declare consultationDate: Date;
  declare createdByName: string;
}
