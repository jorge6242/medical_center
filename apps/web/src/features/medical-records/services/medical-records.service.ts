import { apiJson } from '@/config/api';

export interface ClinicalHistory {
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

export interface MedicalRecordPayload {
  anamnesis?: Record<string, unknown>;
  examenFisicoGinecologico?: Record<string, unknown>;
  controlObstetricoEco?: Record<string, unknown>;
  resolucionMedica?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CreateMedicalRecordDto {
  patientId: string;
  consultationId: string;
  templateType: string;
  templateVersion?: string;
  templateSnapshot?: Record<string, unknown>;
  clinicalData: MedicalRecordPayload;
}

export interface PatientMedicalRecord {
  id: string;
  consultationId: string;
  doctorName: string;
  specialtyName: string;
  templateType: string;
  templateVersion: string;
  recordedAt: string;
  status: 'DRAFT' | 'COMPLETED' | 'VOIDED';
}

export interface PatientMedicalRecordsResponse {
  clinicalHistory: ClinicalHistory | null;
  records: PatientMedicalRecord[];
}

export interface MedicalRecordDetail {
  id: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  specialtyName: string;
  templateType: string;
  templateVersion: string;
  templateSnapshot: Record<string, unknown> | null;
  clinicalData: MedicalRecordPayload;
  status: 'DRAFT' | 'COMPLETED' | 'VOIDED';
  recordedAt: string;
}

export interface ConsultationTemplateResponse {
  templateType: string | null;
  specialtyName: string | null;
}

export interface PatientConsultationService {
  serviceName: string;
  specialtyName: string;
}

export interface PatientConsultation {
  id: string;
  date: string;
  status: 'PAID';
  hasMedicalRecord: false;
  canCreateMedicalRecord: true;
  services: PatientConsultationService[];
}

export interface PaidConsultation {
  id: string;
  date: string;
  status: 'PAID';
  patientId: string;
  patientName: string;
  patientDocument: string;
  doctorId: string;
  doctorName: string;
  services: Array<PatientConsultationService & { priceUsd: string }>;
  medicalRecordId: string | null;
  canCreateMedicalRecord: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface PaidConsultationsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export const getPatientMedicalRecords = (patientId: string): Promise<PatientMedicalRecordsResponse> =>
  apiJson(`/patients/${patientId}/medical-records`);

export const getMedicalRecord = (id: string): Promise<MedicalRecordDetail> =>
  apiJson(`/medical-records/${id}`);

export const createMedicalRecord = (dto: CreateMedicalRecordDto): Promise<MedicalRecordDetail> =>
  apiJson('/medical-records', { method: 'POST', body: JSON.stringify(dto) });

export const getPatientConsultations = (patientId: string): Promise<PatientConsultation[]> =>
  apiJson(`/patients/${patientId}/consultations`);

export const getPaidConsultations = (
  query?: PaidConsultationsQuery,
): Promise<PaginatedResponse<PaidConsultation>> => {
  const params = new URLSearchParams();
  if (query?.page) params.append('page', String(query.page));
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.search) params.append('search', query.search);

  const queryString = params.toString();
  return apiJson(`/medical-records/paid-consultations${queryString ? `?${queryString}` : ''}`);
};

export const getConsultationTemplateType = (consultationId: string): Promise<ConsultationTemplateResponse> =>
  apiJson(`/medical-records/template-type?consultationId=${consultationId}`);
