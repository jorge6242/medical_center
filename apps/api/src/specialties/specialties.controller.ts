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

import { type CreateSpecialtyDto } from './dto/create-specialty.dto';
import { type UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { type SpecialtiesService } from './specialties.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { type PaginationQueryDto } from '../common/dto/pagination-query.dto';

import type { SpecialtyResponseDto } from './dto/specialty-response.dto';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Controller('specialties')
@UseGuards(JwtAuthGuard, AclGuard)
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Get()
  @RequirePermission('specialties', 'read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<SpecialtyResponseDto>> {
    return this.specialtiesService.findAll(user.tenantId, query);
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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('specialties', 'delete')
  deactivate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<SpecialtyResponseDto> {
    return this.specialtiesService.deactivate(user.tenantId, id);
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('specialties', 'delete')
  permanentlyDelete(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ id: string }> {
    return this.specialtiesService.permanentlyDelete(user.tenantId, id);
  }
}
