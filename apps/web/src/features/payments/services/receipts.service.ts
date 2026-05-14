import { apiJson } from '@/config/api';

export interface ReceiptData {
  id: string;
  receiptNumber: string;
  paymentId: string;
  doctorName: string;
  doctorPhone?: string | null;
  doctorDocument: string;
  bankName: string;
  accountNumber: string;
  splitPercentage: string;
  totalConsultation: string;
  doctorShare: string;
  centerShare: string;
  details?: Array<{
    paymentMethod: string;
    currency: string;
    amount: string;
    referenceNumber?: string | null;
    appliedIgtfAmount: string;
  }>;
  status: string;
  generatedAt: string;
}

export const getReceipt = (paymentId: string): Promise<ReceiptData> =>
  apiJson(`/receipts/${paymentId}/data`);
