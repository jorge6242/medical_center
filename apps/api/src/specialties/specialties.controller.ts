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

import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateServicePriceDto } from './dto/update-service-price.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { SpecialtiesService } from './specialties.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { SpecialtyResponseDto } from './dto/specialty-response.dto';

@Controller('specialties')
@UseGuards(JwtAuthGuard, AclGuard)
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Get()
  @RequirePermission('specialties', 'read')
  findAll(@CurrentUser() user: JwtPayload): Promise<SpecialtyResponseDto[]> {
    return this.specialtiesService.findAll(user.tenantId);
  }

  @Get(':id')
  @RequirePermission('specialties', 'read')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<SpecialtyResponseDto> {
    return this.specialtiesService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermission('specialties', 'create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSpecialtyDto,
  ): Promise<SpecialtyResponseDto> {
    return this.specialtiesService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('specialties', 'update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSpecialtyDto,
  ): Promise<SpecialtyResponseDto> {
    return this.specialtiesService.update(user.tenantId, id, dto);
  }

  @Patch(':specialtyId/services/:servicePriceId')
  @RequirePermission('specialties', 'update')
  updateServicePrice(
    @CurrentUser() user: JwtPayload,
    @Param('specialtyId') specialtyId: string,
    @Param('servicePriceId') servicePriceId: string,
    @Body() dto: UpdateServicePriceDto,
  ): Promise<SpecialtyResponseDto> {
    return this.specialtiesService.updateServicePrice(
      user.tenantId,
      specialtyId,
      servicePriceId,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('specialties', 'delete')
  deactivate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<SpecialtyResponseDto> {
    return this.specialtiesService.deactivate(user.tenantId, id);
  }

  @Delete(':specialtyId/services/:servicePriceId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('specialties', 'delete')
  deactivateService(
    @CurrentUser() user: JwtPayload,
    @Param('specialtyId') specialtyId: string,
    @Param('servicePriceId') servicePriceId: string,
  ): Promise<SpecialtyResponseDto> {
    return this.specialtiesService.deactivateService(
      user.tenantId,
      specialtyId,
      servicePriceId,
    );
  }
}
