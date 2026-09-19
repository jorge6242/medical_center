import type { FlatRow } from '../interfaces/export-strategy.interface';
import type { ConsolidatedRecord, DetailRecord } from '../interfaces/report-records.interface';

export class ReportFlattener {
  mapConsolidated(records: ConsolidatedRecord[]): FlatRow[] {
    return records.map((r) => ({
      period: r.period,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      consultationsUsd: r.income.consultationsUsd.toFixed(2),
      laboratoriesUsd: r.income.laboratoriesUsd.toFixed(2),
      incomeTotalUsd: r.income.totalUsd.toFixed(2),
      incomeTotalBs: r.income.totalBs.toFixed(2),
      igtfUsd: r.income.igtfUsd.toFixed(2),
      incomeCount: r.income.transactionCount,
      expensesTotalUsd: r.expenses.totalUsd.toFixed(2),
      expensesTotalBs: r.expenses.totalBs.toFixed(2),
      expensesCount: r.expenses.transactionCount,
      netUsd: r.net.usd.toFixed(2),
      netBs: r.net.bs.toFixed(2),
    }));
  }

  mapDetail(records: DetailRecord[]): FlatRow[] {
    return records.map((r) => ({
      id: r.id,
      recordType: r.recordType,
      date: r.date.toISOString(),
      patientName: r.patientName || '',
      doctorName: r.doctorName || '',
      description: r.description,
      categoryName: r.categoryName || '',
      amountUsd: r.amountUsd.toFixed(2),
      amountBs: r.amountBs?.toFixed(2) || '0.00',
      paymentMethods: r.paymentMethods?.join(', ') || '',
      status: r.status,
    }));
  }
}
