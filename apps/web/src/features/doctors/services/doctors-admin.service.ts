import { apiJson } from '@/config/api';

export interface DoctorBankAccountResponse {
  id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  documentId: string;
  phone: string | null;
  isDefault: boolean;
}

export interface DoctorSpecialtyResponse {
  specialtyId: string;
  specialtyName: string;
  isPrimary: boolean;
}

export interface DoctorAdminResponse {
  id: string;
  documentType: string;
  documentId: string;
  name: string;
  email: string | null;
  phone: string | null;
  splitPercentage: string;
  isActive: boolean;
  specialties: DoctorSpecialtyResponse[];
  bankAccounts: DoctorBankAccountResponse[];
  medicalLicenseNumber: string | null;
  verificationStatus: string;
  verifiedAt: string | null;
  lastVerifiedAt: string | null;
}

export interface CreateDoctorDto {
  documentType: string;
  documentId: string;
  name: string;
  email?: string;
  phone?: string;
  splitPercentage: number;
  specialtyIds: string[];
  bankAccount: {
    bankName: string;
    accountType: string;
    accountNumber: string;
    documentId: string;
    phone?: string;
  };
  medicalLicenseNumber?: string;
}

export interface UpdateDoctorDto {
  name?: string;
  email?: string;
  phone?: string;
  splitPercentage?: number;
  medicalLicenseNumber?: string;
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

export interface GetDoctorsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export const getDoctorsAdmin = (query?: GetDoctorsQuery): Promise<PaginatedResponse<DoctorAdminResponse>> => {
  const params = new URLSearchParams();
  if (query?.page) params.append('page', String(query.page));
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.search) params.append('search', query.search);
  const qs = params.toString();
  return apiJson(`/doctors${qs ? `?${qs}` : ''}`);
};

export const createDoctor = (dto: CreateDoctorDto): Promise<DoctorAdminResponse> =>
  apiJson('/doctors', { method: 'POST', body: JSON.stringify(dto) });

export const updateDoctor = (
  id: string,
  dto: UpdateDoctorDto,
): Promise<DoctorAdminResponse> =>
  apiJson(`/doctors/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });

export const deactivateDoctor = (id: string): Promise<DoctorAdminResponse> =>
  apiJson(`/doctors/${id}`, { method: 'DELETE' });

export const verifyDoctor = (id: string): Promise<DoctorAdminResponse> =>
  apiJson(`/doctors/${id}/verify`, { method: 'POST' });

export interface VerifyDocumentDto {
  documentType: string;
  documentId: string;
}

export interface SacsVerificationResult {
  found: boolean;
  doctorName?: string;
  specialty?: string;
  licenseNumber?: string;
}

export const verifyDocument = (
  dto: VerifyDocumentDto,
): Promise<SacsVerificationResult> =>
  apiJson('/doctors/verify-document', {
    method: 'POST',
    body: JSON.stringify({
      documentType: dto.documentType,
      documentId: dto.documentId,
    }),
  });

export interface OnboardingStatusResponse {
  status: string;
  sentAt: string | null;
  expiresAt: string | null;
}

export const getDoctorOnboardingStatus = (id: string): Promise<OnboardingStatusResponse> =>
  apiJson(`/doctors/${id}/onboarding-status`);

export const sendDoctorOnboarding = (id: string): Promise<{ message: string; tokenId: string; sentAt: string }> =>
  apiJson(`/doctors/${id}/send-onboarding`, { method: 'POST' });
