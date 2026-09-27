import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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

import type { LabTestCatalogResponseDto } from './dto/lab-test-catalog-response.dto';

@Controller('laboratories')
@UseGuards(JwtAuthGuard, AclGuard)
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Get()
  @RequirePermission('laboratories', 'read')
  findAll(
    @CurrentUser() user: JwtPayload,
  ): Promise<LabTestCatalogResponseDto[]> {
    return this.labsService.findAll(user.tenantId);
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
