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
  UseGuards,
} from '@nestjs/common';

import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { PatientResponseDto } from './dto/patient-response.dto';


@Controller('patients')
@UseGuards(JwtAuthGuard, AclGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @RequirePermission('patients', 'read')
  findAll(@CurrentUser() user: JwtPayload): Promise<PatientResponseDto[]> {
    return this.patientsService.findAll(user.tenantId);
  }

  @Get(':id')
  @RequirePermission('patients', 'read')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<PatientResponseDto> {
    return this.patientsService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermission('patients', 'create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePatientDto,
  ): Promise<PatientResponseDto> {
    return this.patientsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('patients', 'update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ): Promise<PatientResponseDto> {
    return this.patientsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('patients', 'delete')
  deactivate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<PatientResponseDto> {
    return this.patientsService.deactivate(user.tenantId, id);
  }
}
