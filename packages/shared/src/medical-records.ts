export interface PatientClinicalHistory {
  antecedentesPersonales?: {
    patologiasBase?: string;
    alergias?: string;
    quirurgicos?: string;
  };
  antecedentesGinecologicos?: {
    menarquiaEdad?: number;
    formulaMenstrual?: string;
    sexarquiaEdad?: number;
  };
  antecedentesObstetricos?: {
    gestas?: number;
    partos?: number;
    cesareas?: number;
    abortos?: number;
  };
}

export interface MedicalRecordClinicalData {
  anamnesis?: Record<string, unknown>;
  examenFisicoGeneral?: Record<string, unknown>;
  resolucionMedica?: Record<string, unknown>;
  [key: string]: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isPatientClinicalHistory(value: unknown): value is PatientClinicalHistory {
  return value === undefined || value === null || isPlainObject(value);
}

export function isMedicalRecordClinicalData(value: unknown): value is MedicalRecordClinicalData {
  return isPlainObject(value);
}

export interface MedicalRecordResponse {
  id: string;
  tenantId: string;
  patientId: string;
  doctorId: string;
  consultationId: string;
  createdById: string;
  specialtyName: string;
  templateType: string;
  templateVersion: string;
  templateSnapshot: Record<string, unknown> | null;
  clinicalData: MedicalRecordClinicalData;
  status: 'DRAFT' | 'COMPLETED' | 'VOIDED';
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicalRecordDto {
  patientId: string;
  consultationId: string;
  templateType: string;
  templateVersion?: string;
  templateSnapshot?: Record<string, unknown>;
  clinicalData: MedicalRecordClinicalData;
}

export interface PatientDetailMedicalRecord {
  id: string;
  consultationId: string;
  doctorName: string;
  specialtyName: string;
  templateType: string;
  templateVersion: string;
  recordedAt: string;
  status: 'DRAFT' | 'COMPLETED' | 'VOIDED';
}

export interface ConsultationTemplateResponse {
  templateType: string | null;
  specialtyName: string | null;
}
