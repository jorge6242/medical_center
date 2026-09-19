import { apiJson } from '@/config/api';

export interface DoctorProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentType: string;
  documentId: string;
  medicalLicenseNumber: string | null;
  verificationStatus: string;
  verifiedAt: string | null;
  lastVerifiedAt: string | null;
  specialties: Array<{ specialtyId: string; specialtyName: string; isPrimary: boolean }>;
}

export interface UpdateDoctorProfileDto {
  name: string;
  email?: string;
  phone?: string;
}

export const getDoctorProfile = (): Promise<DoctorProfile> =>
  apiJson('/doctors/me');

export const updateDoctorProfile = (dto: UpdateDoctorProfileDto): Promise<DoctorProfile> =>
  apiJson('/doctors/me', {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });

export const verifyDoctorLicense = (): Promise<DoctorProfile> =>
  apiJson('/doctors/me/verify-license', {
    method: 'POST',
  });

export const getDoctorVerificationStatus = (): Promise<{ status: string; licenseNumber: string | null }> =>
  apiJson('/doctors/me/verification-status');
