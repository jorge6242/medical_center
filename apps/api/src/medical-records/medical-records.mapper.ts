
import type { MedicalRecordResponseDto } from './dto/medical-record-response.dto';
import type { PatientMedicalRecordResponseDto } from './dto/patient-medical-record-response.dto';
import type { MedicalRecord, Patient } from '@prisma/client';

type MedicalRecordWithRelations = MedicalRecord & {
  patient: Pick<Patient, 'id' | 'name' | 'documentType' | 'documentId'>;
  doctor: { id: string; name: string };
  consultation: { id: string; date: Date; services: Array<{ specialtyName: string }> };
  createdBy: { id: string; name: string };
};

function getSpecialtyName(services: Array<{ specialtyName: string }>): string {
  return services[0]?.specialtyName ?? 'Sin especialidad';
}

export function toMedicalRecordResponse(record: MedicalRecordWithRelations): MedicalRecordResponseDto {
  return {
    id: record.id,
    tenantId: record.tenantId,
    patientId: record.patientId,
    doctorId: record.doctorId,
    consultationId: record.consultationId,
    createdById: record.createdById,
    specialtyName: getSpecialtyName(record.consultation.services),
    templateType: record.templateType,
    templateVersion: record.templateVersion,
    templateSnapshot: record.templateSnapshot as Record<string, unknown> | null,
    clinicalData: record.clinicalData as Record<string, unknown>,
    status: record.status,
    recordedAt: record.recordedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    patientName: record.patient.name,
    patientDocumentType: record.patient.documentType,
    patientDocumentId: record.patient.documentId,
    doctorName: record.doctor.name,
    consultationDate: record.consultation.date,
    createdByName: record.createdBy.name,
  };
}

export function toPatientMedicalRecordResponse(
  record: MedicalRecordWithRelations,
): PatientMedicalRecordResponseDto {
  return {
    id: record.id,
    consultationId: record.consultationId,
    doctorName: record.doctor.name,
    specialtyName: getSpecialtyName(record.consultation.services),
    templateType: record.templateType,
    templateVersion: record.templateVersion,
    recordedAt: record.recordedAt,
    status: record.status,
  };
}
