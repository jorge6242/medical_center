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
  declare from: string;

  @IsString()
  declare to: string;

  @IsOptional()
  @IsEnum(ReportGroupBy)
  declare groupBy?: ReportGroupBy;

  @IsOptional()
  @IsEnum(ReportType)
  declare type?: ReportType;
}

export class GenerateReportDto {
  @IsString()
  declare from: string;

  @IsString()
  declare to: string;

  @IsEnum(ReportType)
  declare type: ReportType;

  @IsEnum(ReportFormat)
  declare format: ReportFormat;

  @IsOptional()
  @IsEnum(ReportGroupBy)
  declare groupBy?: ReportGroupBy;
}

export class ReportJobResponseDto {
  declare jobId: string;
  declare status: 'pending' | 'processing' | 'completed' | 'failed';
  declare progress: number;
  declare format: string;
  declare filename?: string;
  declare sizeBytes?: number;
  declare error?: string;
  declare createdAt: Date;
  declare completedAt?: Date;
}
