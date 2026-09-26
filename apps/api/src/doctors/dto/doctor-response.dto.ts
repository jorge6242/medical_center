import type {
  AccountType,
  DocumentType,
  VerificationStatus,
} from '@prisma/client';

export class DoctorBankAccountResponseDto {
  declare id: string;
  declare bankName: string;
  declare accountType: AccountType;
  declare accountNumber: string | null;
  declare documentId: string;
  declare phone: string | null;
  declare isDefault: boolean;
}

export class DoctorServiceResponseDto {
  declare id: string;
  declare specialtyId: string;
  declare specialtyName: string;
  declare serviceId: string;
  declare serviceName: string;
  declare priceUsd: string;
}

export class DoctorResponseDto {
  declare id: string;
  declare documentType: DocumentType;
  declare documentId: string;
  declare name: string;
  declare lastName: string;
  declare email: string | null;
  declare phone: string | null;
  declare splitPercentage: string;
  declare isActive: boolean;
  declare primarySpecialtyId: string;
  declare primarySpecialtyName: string;
  declare services: DoctorServiceResponseDto[];
  declare bankAccounts: DoctorBankAccountResponseDto[];
  declare medicalLicenseNumber: string | null;
  declare verificationStatus: VerificationStatus;
  declare verifiedAt: string | null;
  declare lastVerifiedAt: string | null;
}
