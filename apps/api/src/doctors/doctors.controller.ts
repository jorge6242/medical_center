import {
  BadGatewayException,
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

import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { DoctorResponseDto } from './dto/doctor-response.dto';
import type { SacsQueryResult } from './sacs-verification.service';


@Controller('doctors')
@UseGuards(JwtAuthGuard, AclGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @RequirePermission('doctors', 'read')
  findAll(@CurrentUser() user: JwtPayload): Promise<DoctorResponseDto[]> {
    return this.doctorsService.findAll(user.tenantId);
  }

  @Get(':id')
  @RequirePermission('doctors', 'read')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<DoctorResponseDto> {
    return this.doctorsService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermission('doctors', 'create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDoctorDto,
  ): Promise<DoctorResponseDto> {
    return this.doctorsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('doctors', 'update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
  ): Promise<DoctorResponseDto> {
    return this.doctorsService.update(user.tenantId, id, dto);
  }

  @Post(':id/verify')
  @RequirePermission('doctors', 'update')
  verify(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<DoctorResponseDto> {
    return this.doctorsService.verify(user.tenantId, id);
  }

  @Post('verify-document')
  @RequirePermission('doctors', 'read')
  async verifyDocument(@Body() dto: VerifyDocumentDto): Promise<SacsQueryResult> {
    try {
      return await this.doctorsService.verifyDocument(dto.documentType, dto.documentId);
    } catch {
      throw new BadGatewayException('SACS_UNAVAILABLE', 'No se pudo conectar con SACS. Intente nuevamente.');
    }
  }

  @Get(':id/service-prices')
  @RequirePermission('doctors', 'read')
  getServicePrices(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.doctorsService.getServicePrices(user.tenantId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('doctors', 'delete')
  deactivate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<DoctorResponseDto> {
    return this.doctorsService.deactivate(user.tenantId, id);
  }
}
