export enum DocumentType {
  V = 'V',
  E = 'E',
  J = 'J',
  G = 'G',
}

export enum GenderType {
  MASCULINE = 'MASCULINE',
  FEMININE = 'FEMININE',
  OTHER = 'OTHER',
}

export enum AccountType {
  SAVINGS = 'SAVINGS',
  CHECKING = 'CHECKING',
}

export enum ConsultationStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  VOIDED = 'VOIDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  VOIDED = 'VOIDED',
}

export enum PaymentMethod {
  CASH_USD = 'CASH_USD',
  ZELLE = 'ZELLE',
  WIRE_TRANSFER_USD = 'WIRE_TRANSFER_USD',
  POS_USD_CARD = 'POS_USD_CARD',
  POS_BS = 'POS_BS',
  PAGO_MOVIL = 'PAGO_MOVIL',
}

export enum Currency {
  USD = 'USD',
  VES = 'VES',
}

export enum ConsultationPaymentStatus {
  INITIATED = 'INITIATED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  VOIDED = 'VOIDED',
}

export enum ReceiptStatus {
  GENERATED = 'GENERATED',
  VOIDED = 'VOIDED',
}

export enum ExpenseStatus {
  ACTIVE = 'ACTIVE',
  VOIDED = 'VOIDED',
}

export enum ExchangeRateSource {
  MANUAL = 'MANUAL',
  API = 'API',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  NOT_FOUND = 'NOT_FOUND',
}