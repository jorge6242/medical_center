import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

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

abstract class ReportsQueryBaseDto extends PaginationQueryDto {
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

export class ConsolidatedReportsQueryDto extends ReportsQueryBaseDto {}

export class DetailReportsQueryDto extends ReportsQueryBaseDto {}

export type ReportsQueryDto = ReportsQueryBaseDto;

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
