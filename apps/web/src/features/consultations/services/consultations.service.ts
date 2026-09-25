import { apiJson } from '@/config/api';

export type ConsultationStatus = 'SCHEDULED' | 'PENDING' | 'PAID' | 'VOIDED';

export interface ConsultationResponse {
  id: string;
  patientId: string;
  patientName: string;
  patientDocument: string;
  doctorId: string;
  doctorName: string;
  date: string;
  status: ConsultationStatus;
  services: Array<{
    serviceName: string;
    specialtyName: string;
    priceUsd: string;
  }>;
  totalUsd: string;
  notes?: string | null;
  attendedAt?: string | null;
}

export interface ConsultationDetail extends ConsultationResponse {
  doctorDocument: string;
  medicalRecordId: string | null;
}

export interface CreateScheduledConsultationDto {
  patientId: string;
  doctorId: string;
  date: string;
  doctorServiceIds: string[];
  notes?: string;
  sendEmailNotification: boolean;
}

export interface ConsultationQuery {
  page?: number;
  limit?: number;
  date?: string;
  status?: ConsultationStatus;
}

export interface PaginatedConsultations {
  data: ConsultationResponse[];
  meta: { total: number; totalPages: number };
}

export const getTodayConsultations = (): Promise<ConsultationResponse[]> =>
  apiJson('/consultations/today');

export const getConsultationDetail = (id: string): Promise<ConsultationDetail> =>
  apiJson(`/consultations/${id}`, { cache: 'no-store' });

export const getConsultations = (query: ConsultationQuery): Promise<PaginatedConsultations> => {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.date) params.set('date', query.date);
  if (query.status) params.set('status', query.status);
  return apiJson(`/consultations?${params.toString()}`);
};

export const createScheduledConsultation = (
  dto: CreateScheduledConsultationDto,
): Promise<ConsultationResponse> =>
  apiJson('/consultations', { method: 'POST', body: JSON.stringify(dto) });

export const markConsultationAsAttended = (id: string): Promise<ConsultationResponse> =>
  apiJson(`/consultations/${id}/attend`, { method: 'PATCH' });

export const voidConsultation = (id: string, reason: string): Promise<ConsultationResponse> =>
  apiJson(`/consultations/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });

export const updateScheduledConsultation = (
  id: string,
  dto: { date: string; notes?: string },
): Promise<ConsultationResponse> =>
  apiJson(`/consultations/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
