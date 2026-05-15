import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReportGroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum ReportType {
  CONSULTATION = 'consultation',
  LAB = 'lab',
  EXPENSE = 'expense',
  ALL = 'all',
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
}

export class QueryReportsDto {
  @IsString()
  from: string = '';

  @IsString()
  to: string = '';

  @IsOptional()
  @IsEnum(ReportGroupBy)
  groupBy?: ReportGroupBy = ReportGroupBy.DAY;

  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType = ReportType.ALL;
}

export class GenerateReportDto {
  @IsString()
  from: string = '';

  @IsString()
  to: string = '';

  @IsEnum(ReportType)
  type: ReportType = ReportType.ALL;

  @IsEnum(ReportFormat)
  format: ReportFormat = ReportFormat.PDF;

  @IsOptional()
  @IsEnum(ReportGroupBy)
  groupBy?: ReportGroupBy = ReportGroupBy.DAY;
}

export class ReportJobResponseDto {
  jobId!: string;
  status!: 'pending' | 'processing' | 'completed' | 'failed';
  progress!: number;
  format!: string;
  filename?: string;
  sizeBytes?: number;
  error?: string;
  createdAt!: Date;
  completedAt?: Date;
}
