export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: string;
  permissions: Array<{ resource: string; action: string }>;
  roleVersion: number;
}

export interface Patient {
  id: string;
  tenantId: string;
  documentType: string;
  documentId: string;
  name: string;
  phone?: string;
  email?: string;
  birthDate?: Date;
  gender?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Doctor {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  documentType: string;
  documentId: string;
  splitPercentage: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Specialty {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  isActive: boolean;
}

export interface ServicePrice {
  id: string;
  specialtyId: string;
  serviceId: string;
  priceUsd: string;
  isActive: boolean;
}

export interface Consultation {
  id: string;
  tenantId: string;
  patientId: string;
  doctorId: string;
  date: Date;
  status: string;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  totalServiceUsd: string;
  bcvExchangeRate: string;
  totalPaidUsd: string;
  totalPaidUsdEquivalent: string;
  totalPaidBs: string;
  totalIgtfUsd: string;
  doctorShareUsd: string;
  centerShareUsd: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Expense {
  id: string;
  tenantId: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amountUsd: string;
  amountBs?: string;
  status: string;
  voidedBy?: string;
  voidReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorReceipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  generatedById: string;
  doctorName: string;
  doctorDocument: string;
  bankName: string;
  accountNumber: string;
  splitPercentage: string;
  totalConsultation: string;
  doctorShare: string;
  centerShare: string;
  status: string;
  generatedAt: Date;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  createdAt: Date;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  isActive: boolean;
  roleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  roleId: string;
  resource: string;
  action: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemConfig {
  id: string;
  tenantId: string;
  key: string;
  value: string;
}

export interface ExchangeRate {
  id: string;
  tenantId: string;
  rate: string;
  date: Date;
  source: string;
  createdAt: Date;
}
