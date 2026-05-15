import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import type { QueryReportsDto, GenerateReportDto, ReportJobResponseDto } from './dto/query-reports.dto';
import type { ConsolidatedRecord, DetailRecord } from './interfaces/report-records.interface';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('reports-export')
    private readonly reportsQueue: Queue,
  ) {}

  async getConsolidated(tenantId: string, dto: QueryReportsDto): Promise<ConsolidatedRecord[]> {
    const from = new Date(dto.from);
    const to = new Date(dto.to);
    to.setHours(23, 59, 59, 999);

    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: { gte: from, lte: to },
      },
      include: {
        item: { select: { itemType: true } },
        details: { select: { currency: true, amount: true } },
      },
    });

    const expenses = await this.prisma.expense.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        createdAt: { gte: from, lte: to },
      },
    });

    const groups = new Map<string, ConsolidatedRecord>();

    for (const payment of payments) {
      const key = this.getPeriodKey(payment.createdAt, dto.groupBy);
      const existing = groups.get(key) || this.emptyRecord(key, payment.createdAt, dto.groupBy);
      
      const totalUsd = Number(payment.totalServiceUsd);
      const totalBs = Number(payment.totalPaidBs);
      const igtf = Number(payment.totalIgtfUsd);
      
      existing.income.totalUsd += totalUsd;
      existing.income.totalBs += totalBs;
      existing.income.igtfUsd += igtf;
      existing.income.transactionCount += 1;
      
      if (payment.item?.itemType === 'CONSULTATION') {
        existing.income.consultationsUsd += totalUsd;
      } else if (payment.item?.itemType === 'LAB') {
        existing.income.laboratoriesUsd += totalUsd;
      }
      
      groups.set(key, existing);
    }

    for (const expense of expenses) {
      const key = this.getPeriodKey(expense.createdAt, dto.groupBy);
      const existing = groups.get(key) || this.emptyRecord(key, expense.createdAt, dto.groupBy);
      
      existing.expenses.totalUsd += Number(expense.amountUsd);
      if (expense.amountBs) {
        existing.expenses.totalBs += Number(expense.amountBs);
      }
      existing.expenses.transactionCount += 1;
      
      groups.set(key, existing);
    }

    return Array.from(groups.values())
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  async getDetail(tenantId: string, dto: QueryReportsDto): Promise<DetailRecord[]> {
    const from = new Date(dto.from);
    const to = new Date(dto.to);
    to.setHours(23, 59, 59, 999);

    const records: DetailRecord[] = [];

    if (dto.type === 'all' || dto.type === 'consultation' || dto.type === 'lab') {
      const payments = await this.prisma.payment.findMany({
        where: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: from, lte: to },
          ...(dto.type !== 'all' && {
            item: { itemType: dto.type!.toUpperCase() as 'CONSULTATION' | 'LAB' },
          }),
        },
        include: {
          item: {
            include: {
              consultation: { include: { patient: true, doctor: true, services: true } },
              labOrder: { include: { patient: true, tests: true } },
            },
          },
          details: { select: { paymentMethod: true, currency: true, amount: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const payment of payments) {
        const item = payment.item;
        if (item?.itemType === 'CONSULTATION' && item.consultation) {
          records.push({
            id: payment.id,
            recordType: 'CONSULTATION',
            date: payment.createdAt,
            patientName: item.consultation.patient?.name,
            doctorName: item.consultation.doctor?.name,
            description: item.description,
            amountUsd: Number(payment.totalServiceUsd),
            amountBs: Number(payment.totalPaidBs),
            paymentMethods: payment.details.map(d => `${d.paymentMethod} (${d.currency})`),
            status: payment.status,
          });
        } else if (item?.itemType === 'LAB' && item.labOrder) {
          records.push({
            id: payment.id,
            recordType: 'LAB',
            date: payment.createdAt,
            patientName: item.labOrder.patient?.name,
            description: item.description,
            amountUsd: Number(payment.totalServiceUsd),
            amountBs: Number(payment.totalPaidBs),
            paymentMethods: payment.details.map(d => `${d.paymentMethod} (${d.currency})`),
            status: payment.status,
          });
        }
      }
    }

    if (dto.type === 'all' || dto.type === 'expense') {
      const expenses = await this.prisma.expense.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          createdAt: { gte: from, lte: to },
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const expense of expenses) {
        records.push({
          id: expense.id,
          recordType: 'EXPENSE',
          date: expense.createdAt,
          description: expense.description,
          categoryName: expense.categoryName,
          amountUsd: Number(expense.amountUsd),
          amountBs: expense.amountBs ? Number(expense.amountBs) : undefined,
          status: expense.status,
        });
      }
    }

    return records.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async createJob(tenantId: string, userId: string, dto: GenerateReportDto): Promise<ReportJobResponseDto> {
    const job = await this.reportsQueue.add('generate', {
      tenantId,
      userId,
      ...dto,
    });

    return {
      jobId: job.id!,
      status: 'pending',
      progress: 0,
      format: dto.format,
      createdAt: new Date(),
    };
  }

  async getJobStatus(tenantId: string, jobId: string): Promise<ReportJobResponseDto> {
    const report = await this.prisma.generatedReport.findFirst({
      where: { jobId, tenantId },
    });

    if (!report) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    return {
      jobId: report.jobId,
      status: report.status as any,
      progress: report.status === 'completed' ? 100 : report.status === 'processing' ? 50 : 0,
      format: report.format,
      filename: report.filename,
      sizeBytes: report.sizeBytes,
      error: report.error || undefined,
      createdAt: report.createdAt,
      completedAt: report.status === 'completed' ? report.createdAt : undefined,
    };
  }

  async downloadReport(tenantId: string, jobId: string) {
    const report = await this.prisma.generatedReport.findFirst({
      where: { jobId, tenantId },
    });

    if (!report) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    if (report.status === 'pending') {
      throw new Error('Report not ready yet');
    }

    if (report.status === 'failed') {
      throw new Error(`Report generation failed: ${report.error}`);
    }

    if (new Date() > report.expiresAt) {
      throw new Error('Report expired');
    }

    return {
      blob: report.blob,
      filename: report.filename,
      mimeType: report.mimeType,
    };
  }

  private getPeriodKey(date: Date, groupBy?: string): string {
    const d = new Date(date);
    switch (groupBy) {
      case 'week':
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        return `${startOfWeek.getFullYear()}-W${this.getWeekNumber(startOfWeek)}`;
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      default:
        return d.toISOString().split('T')[0]!;
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((+d - +yearStart) / 86400000) + 1) / 7);
  }

  private emptyRecord(key: string, date: Date, groupBy?: string): ConsolidatedRecord {
    const periodStart = new Date(date);
    const periodEnd = new Date(date);
    
    if (groupBy === 'week') {
      periodEnd.setDate(periodEnd.getDate() + 6);
    } else if (groupBy === 'month') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0);
    }

    return {
      period: key,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      income: {
        consultationsUsd: 0,
        laboratoriesUsd: 0,
        totalUsd: 0,
        totalBs: 0,
        igtfUsd: 0,
        transactionCount: 0,
      },
      expenses: {
        totalUsd: 0,
        totalBs: 0,
        transactionCount: 0,
      },
      net: {
        usd: 0,
        bs: 0,
      },
    };
  }
}
