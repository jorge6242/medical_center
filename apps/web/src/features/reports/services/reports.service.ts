import { apiJson } from '@/config/api';

export interface QueryReportsParams {
  from: string;
  to: string;
  groupBy?: 'day' | 'week' | 'month';
  type?: 'consultation' | 'lab' | 'expense' | 'all';
}

export interface GenerateReportParams {
  from: string;
  to: string;
  type: 'consultation' | 'lab' | 'expense' | 'all';
  format: 'pdf' | 'excel';
  groupBy?: 'day' | 'week' | 'month';
}

export interface ReportJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  format: string;
  filename?: string;
  sizeBytes?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ConsolidatedRecord {
  period: string;
  periodStart: string;
  periodEnd: string;
  income: {
    consultationsUsd: string;
    laboratoriesUsd: string;
    totalUsd: string;
    totalBs: string;
    igtfUsd: string;
    transactionCount: number;
  };
  expenses: {
    totalUsd: string;
    totalBs: string;
    transactionCount: number;
  };
  net: {
    usd: string;
    bs: string;
  };
}

export interface DetailRecord {
  id: string;
  recordType: 'CONSULTATION' | 'LAB' | 'EXPENSE';
  date: string;
  patientName?: string;
  doctorName?: string;
  description: string;
  categoryName?: string;
  amountUsd: string;
  amountBs?: string;
  paymentMethods?: string[];
  status: string;
}

export const getConsolidated = (params: QueryReportsParams): Promise<ConsolidatedRecord[]> =>
  apiJson('/reports/consolidated?' + new URLSearchParams(params as unknown as Record<string, string>));

export const getDetail = (params: QueryReportsParams): Promise<DetailRecord[]> =>
  apiJson('/reports/detail?' + new URLSearchParams(params as unknown as Record<string, string>));

export const generateReport = (params: GenerateReportParams): Promise<ReportJob> =>
  apiJson('/reports/generate', { method: 'POST', body: JSON.stringify(params) });

export const getJobStatus = (jobId: string): Promise<ReportJob> =>
  apiJson(`/reports/jobs/${jobId}`);

export const downloadReport = (jobId: string): Promise<Blob> =>
  apiJson(`/reports/jobs/${jobId}/download`, { responseType: 'blob' });
