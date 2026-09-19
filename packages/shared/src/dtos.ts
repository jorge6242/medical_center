export interface CreatePatientDto {
  documentType: string;
  documentId: string;
  name: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
}

export interface UpdatePatientDto {
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
}

export interface CreateDoctorDto {
  name: string;
  email?: string;
  phone?: string;
  documentType: string;
  documentId: string;
  splitPercentage: string;
  specialties?: Array<{ specialtyId: string; isPrimary: boolean }>;
  bankAccounts?: Array<{
    bankName: string;
    accountType: string;
    accountNumber: string;
    documentId: string;
    phone?: string;
    isDefault: boolean;
  }>;
}

export interface UpdateDoctorDto {
  name?: string;
  email?: string;
  phone?: string;
  splitPercentage?: number;
}

export interface CreateSpecialtyDto {
  name: string;
}

export interface UpdateSpecialtyDto {
  name?: string;
}

export interface CreateServiceDto {
  name: string;
}

export interface UpdateServicePriceDto {
  priceUsd: string;
}

export interface CreateConsultationDto {
  patientId: string;
  doctorId: string;
  specialtyId: string;
  serviceIds: string[];
}

export interface PaymentItemDto {
  itemType: 'CONSULTATION' | 'LAB';
  description: string;
  doctorId?: string;
  servicePriceIds?: string[];
  labOrderId?: string;
}

export interface PaymentLineDto {
  paymentMethod: string;
  currency: string;
  amount: number;
  referenceNumber?: string;
}

export interface CreatePaymentDto {
  idempotencyKey: string;
  patientId: string;
  bcvExchangeRate: number;
  item: PaymentItemDto;
  paymentLines: PaymentLineDto[];
}

export interface CreateExpenseDto {
  categoryId: string;
  description: string;
  amountUsd: string;
  amountBs?: string;
}

export interface CreateExpenseCategoryDto {
  name: string;
}

export interface VoidExpenseDto {
  voidReason: string;
}

export interface LoginDto {
  email: string;
  password: string;
  tenantSlug: string;
}

export interface AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
}

export interface ExchangeRateDto {
  rate: string;
  date: string;
  source: string;
}

export interface AppConfigDto {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  systemConfig: Array<{ key: string; value: string }>;
  exchangeRate: {
    rate: string;
    date: string;
  };
}
