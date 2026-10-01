import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  CreateLabTestCatalogDto,
  UpdateLabTestCatalogDto,
} from './dto/create-lab-test-catalog.dto';
import { LabsService } from './labs.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

import type { LabTestCatalogResponseDto } from './dto/lab-test-catalog-response.dto';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Controller('laboratories')
@UseGuards(JwtAuthGuard, AclGuard)
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Get()
  @RequirePermission('laboratories', 'read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<LabTestCatalogResponseDto>> {
    return this.labsService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermission('laboratories', 'read')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<LabTestCatalogResponseDto> {
    return this.labsService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermission('laboratories', 'create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLabTestCatalogDto,
  ): Promise<LabTestCatalogResponseDto> {
    return this.labsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('laboratories', 'update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLabTestCatalogDto,
  ): Promise<LabTestCatalogResponseDto> {
    return this.labsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('laboratories', 'delete')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<LabTestCatalogResponseDto> {
    return this.labsService.remove(user.tenantId, id);
  }
}
