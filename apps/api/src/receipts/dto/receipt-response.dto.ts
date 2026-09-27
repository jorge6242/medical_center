export class ReceiptResponseDto {
  declare id: string;
  declare receiptNumber: string;
  declare paymentId: string;
  declare patientName: string;
  declare patientDocumentId?: string | null;
  declare patientPhone?: string | null;
  declare patientAge?: number | null;
  declare doctorName: string;
  declare doctorPhone?: string | null;
  declare doctorDocument: string;
  declare doctorSpecialtyName?: string | null;
  declare bankName: string;
  declare accountNumber: string;
  declare splitPercentage: string;
  declare totalConsultation: string;
  declare doctorShare: string;
  declare centerShare: string;
  declare status: string;
  declare generatedAt: Date;
  declare services?: Array<{
    serviceId: string;
    serviceName: string;
    specialtyName: string;
    priceUsd: string;
  }>;
  declare details?: Array<{
    paymentMethod: string;
    currency: string;
    amount: string;
    referenceNumber?: string | null;
    appliedIgtfAmount: string;
  }>;
}
