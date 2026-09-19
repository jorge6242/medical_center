export interface IncomeRecord {
  consultationsUsd: number;
  laboratoriesUsd: number;
  totalUsd: number;
  totalBs: number;
  igtfUsd: number;
  transactionCount: number;
}

export interface ExpenseRecord {
  totalUsd: number;
  totalBs: number;
  transactionCount: number;
}

export interface ConsolidatedRecord {
  period: string;
  periodStart: string;
  periodEnd: string;
  income: IncomeRecord;
  expenses: ExpenseRecord;
  net: {
    usd: number;
    bs: number;
  };
}

export interface DetailRecord {
  id: string;
  recordType: 'CONSULTATION' | 'LAB' | 'EXPENSE';
  date: Date;
  patientName?: string;
  doctorName?: string;
  description: string;
  categoryName?: string;
  amountUsd: number;
  amountBs?: number;
  paymentMethods?: string[];
  status: string;
}
