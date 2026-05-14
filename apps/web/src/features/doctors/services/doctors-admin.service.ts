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

export const getDoctorsAdmin = (): Promise<DoctorAdminResponse[]> =>
  apiJson('/doctors');

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
