import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';

import {
  ConsolidatedReportsQueryDto,
  DetailReportsQueryDto,
  GenerateReportDto,
} from './dto/query-reports.dto';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('reports')
@RequirePermission('reports', 'read')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('consolidated')
  async getConsolidated(
    @CurrentUser() user: JwtPayload,
    @Query() query: ConsolidatedReportsQueryDto,
  ) {
    return this.reportsService.getConsolidated(user.tenantId, query);
  }

  @Get('detail')
  async getDetail(
    @CurrentUser() user: JwtPayload,
    @Query() query: DetailReportsQueryDto,
  ) {
    return this.reportsService.getDetail(user.tenantId, query);
  }

  @Post('generate')
  async generate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateReportDto,
  ) {
    return this.reportsService.createJob(user.tenantId, user.sub, dto);
  }

  @Get('jobs/:jobId')
  async getJobStatus(
    @CurrentUser() user: JwtPayload,
    @Param('jobId') jobId: string,
  ) {
    return this.reportsService.getJobStatus(user.tenantId, jobId);
  }

  @Get('jobs/:jobId/download')
  async download(
    @CurrentUser() user: JwtPayload,
    @Param('jobId') jobId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const report = await this.reportsService.downloadReport(user.tenantId, jobId);
    
    res.set({
      'Content-Type': report.mimeType,
      'Content-Disposition': `attachment; filename="${report.filename}"`,
    });

    return new StreamableFile(report.blob as unknown as Buffer);
  }
}
