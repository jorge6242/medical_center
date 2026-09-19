import type {
  AccountType,
  DocumentType,
  VerificationStatus,
} from '@prisma/client';

export class DoctorBankAccountResponseDto {
  declare id: string;
  declare bankName: string;
  declare accountType: AccountType;
  declare accountNumber: string;
  declare documentId: string;
  declare phone: string | null;
  declare isDefault: boolean;
}

export class DoctorSpecialtyResponseDto {
  declare specialtyId: string;
  declare specialtyName: string;
  declare isPrimary: boolean;
}

export class DoctorResponseDto {
  declare id: string;
  declare documentType: DocumentType;
  declare documentId: string;
  declare name: string;
  declare email: string | null;
  declare phone: string | null;
  declare splitPercentage: string;
  declare isActive: boolean;
  declare specialties: DoctorSpecialtyResponseDto[];
  declare bankAccounts: DoctorBankAccountResponseDto[];
  declare medicalLicenseNumber: string | null;
  declare verificationStatus: VerificationStatus;
  declare verifiedAt: string | null;
  declare lastVerifiedAt: string | null;
}
