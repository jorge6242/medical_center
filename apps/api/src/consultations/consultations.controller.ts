import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ConsultationsService } from './consultations.service';
import { ConsultationQueryDto } from './dto/consultation-query.dto';
import { CreateScheduledConsultationDto } from './dto/create-scheduled-consultation.dto';
import { UpdateScheduledConsultationDto } from './dto/update-scheduled-consultation.dto';
import { VoidConsultationDto } from './dto/void-consultation.dto';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { ConsultationDetailResponseDto } from './dto/consultation-detail-response.dto';
import type { ConsultationResponseDto } from './dto/consultation-response.dto';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Controller('consultations')
@UseGuards(JwtAuthGuard, AclGuard)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  @RequirePermission('consultations', 'create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateScheduledConsultationDto,
  ): Promise<ConsultationResponseDto> {
    return this.consultationsService.createScheduled(
      user.tenantId,
      user.sub,
      dto,
    );
  }

  @Get('today')
  @RequirePermission('consultations', 'read')
  findToday(
    @CurrentUser() user: JwtPayload,
  ): Promise<ConsultationResponseDto[]> {
    return this.consultationsService.findToday(user.tenantId);
  }

  @Get()
  @RequirePermission('consultations', 'read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ConsultationQueryDto,
  ): Promise<PaginatedResponseDto<ConsultationResponseDto>> {
    return this.consultationsService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermission('patients', 'read')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ConsultationDetailResponseDto> {
    return this.consultationsService.findOne(user.tenantId, id);
  }

  @Patch(':id/attend')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('consultations', 'update')
  markAsAttended(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ConsultationResponseDto> {
    return this.consultationsService.markAsAttended(
      user.tenantId,
      id,
      user.sub,
    );
  }

  @Patch(':id')
  @RequirePermission('consultations', 'update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateScheduledConsultationDto,
  ): Promise<ConsultationResponseDto> {
    return this.consultationsService.updateScheduled(
      user.tenantId,
      id,
      user.sub,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('consultations', 'delete')
  void(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: VoidConsultationDto,
  ): Promise<ConsultationResponseDto> {
    return this.consultationsService.void(
      user.tenantId,
      id,
      dto.reason,
      user.sub,
    );
  }
}
