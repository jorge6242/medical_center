export const RECEIPT_GENERATION_QUEUE = 'receipt-generation' as const;
export const RECEIPT_EMAIL_QUEUE = 'receipt-email' as const;

export interface ReceiptGenerationJobData {
  tenantId: string;
  paymentId: string;
  generatedById: string;
}

export interface ReceiptEmailJobData {
  tenantId: string;
  paymentId: string;
  recipientEmail: string;
}
