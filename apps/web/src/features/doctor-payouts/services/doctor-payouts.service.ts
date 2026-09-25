import { apiJson } from '@/config/api';

export interface PendingDoctorPayment {
  id: string;
  createdAt: string;
  consultationDate: string | null;
  description: string;
  patientName: string;
  totalConsultationUsd: string;
  doctorShareUsd: string;
}

export interface PendingDoctorPayout {
  doctor: {
    id: string;
    name: string;
    splitPercentage: string;
    bankName: string | null;
    accountNumber: string | null;
    bankPhone: string | null;
  };
  payments: PendingDoctorPayment[];
  totals: { totalConsultationUsd: string; totalDoctorShareUsd: string };
}

export interface DoctorPayout {
  id: string;
  doctorId: string;
  doctorName: string;
  status: 'COMPLETED' | 'VOIDED';
  paymentMethod: string;
  currency: string;
  amountUsd: string;
  paidAmount: string;
  bcvExchangeRate: string | null;
  equivalentBs: string | null;
  referenceNumber: string | null;
  bankName: string;
  accountNumber: string | null;
  bankPhone: string | null;
  createdAt: string;
  voidReason: string | null;
  items: Array<{ paymentId: string; totalConsultationUsd: string; doctorShareUsd: string }>;
}

export interface CreateDoctorPayoutDto {
  doctorId: string;
  paymentIds: string[];
  paymentMethod: string;
  currency: 'USD' | 'VES';
  bcvExchangeRate: number;
  referenceNumber?: string;
  bankName?: string;
  accountNumber?: string;
  bankPhone?: string;
}

export interface DoctorOption {
  id: string;
  name: string;
  documentType: string;
  documentId: string;
  splitPercentage: string;
}

export interface DoctorPayoutDetail extends Omit<DoctorPayout, 'items'> {
  doctorDocument: string;
  items: Array<{
    paymentId: string;
    consultationDate: string | null;
    patientName: string;
    patientDocument: string | null;
    description: string;
    services: Array<{ serviceName: string; specialtyName: string }>;
  }>;
}

export const getDoctors = () =>
  apiJson<{ data: DoctorOption[] }>('/doctors?limit=100').then((result) => result.data);
export const getPendingDoctorPayout = (doctorId: string) =>
  apiJson<PendingDoctorPayout>(`/doctor-payouts/pending/${doctorId}`);
export const getDoctorPayouts = () =>
  apiJson<{ data: DoctorPayout[] }>('/doctor-payouts?limit=100').then((result) => result.data);
export const getDoctorPayout = (id: string) =>
  apiJson<DoctorPayoutDetail>(`/doctor-payouts/${id}`, { cache: 'no-store' });
export const createDoctorPayout = (dto: CreateDoctorPayoutDto) =>
  apiJson<DoctorPayout>('/doctor-payouts', { method: 'POST', body: JSON.stringify(dto) });
export const voidDoctorPayout = (id: string, reason: string) =>
  apiJson<DoctorPayout>(`/doctor-payouts/${id}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
