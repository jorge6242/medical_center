export class ReceiptResponseDto {
  declare id: string;
  declare receiptNumber: string;
  declare paymentId: string;
  declare doctorName: string;
  declare doctorPhone?: string | null;
  declare doctorDocument: string;
  declare bankName: string;
  declare accountNumber: string;
  declare splitPercentage: string;
  declare totalConsultation: string;
  declare doctorShare: string;
  declare centerShare: string;
  declare status: string;
  declare generatedAt: Date;
  declare details?: Array<{
    paymentMethod: string;
    currency: string;
    amount: string;
    referenceNumber?: string | null;
    appliedIgtfAmount: string;
  }>;
}
