import { Body, Controller, Get, Param, Post, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';


import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { GenerateMedicalRecordExportDto } from './dto/generate-medical-record-export.dto';
import { MedicalRecordsService } from './medical-records.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';


import type { Response } from 'express';

@Controller('medical-records')
@UseGuards(JwtAuthGuard, AclGuard)
@RequirePermission('patients', 'read')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @RequirePermission('patients', 'create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.create(user.tenantId, user.sub, dto);
  }

  @Get('template-type')
  @RequirePermission('patients', 'read')
  inferTemplateType(
    @CurrentUser() user: JwtPayload,
    @Query('consultationId') consultationId: string,
  ) {
    return this.medicalRecordsService.inferTemplateType(user.tenantId, consultationId);
  }

  @Get('paid-consultations')
  @RequirePermission('patients', 'read')
  findPaidConsultations(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ) {
    return this.medicalRecordsService.findPaidConsultations(user, query);
  }

  @Get(':id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})')
  @RequirePermission('patients', 'read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.medicalRecordsService.findOne(user.tenantId, id);
  }

  @Post(':id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/export')
  @RequirePermission('patients', 'read')
  export(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: GenerateMedicalRecordExportDto,
  ) {
    return this.medicalRecordsService.createExportJob(user.tenantId, user.sub, id, dto);
  }

  @Get(':id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/export/:jobId')
  @RequirePermission('patients', 'read')
  exportStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('jobId') jobId: string,
  ) {
    return this.medicalRecordsService.getExportJobStatus(user.tenantId, id, jobId);
  }

  @Get(':id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/export/:jobId/download')
  @RequirePermission('patients', 'read')
  async downloadExport(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('jobId') jobId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const report = await this.medicalRecordsService.downloadExport(user.tenantId, id, jobId);

    res.set({
      'Content-Type': report.mimeType,
      'Content-Disposition': `attachment; filename="${report.filename}"`,
    });

    return new StreamableFile(report.blob as unknown as Buffer);
  }
}
