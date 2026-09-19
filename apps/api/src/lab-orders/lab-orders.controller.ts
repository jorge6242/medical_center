import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { LabOrderQueryDto } from './dto/lab-order-query.dto';
import { LabOrdersService } from './lab-orders.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { LabOrderListResponseDto } from './dto/lab-order-response.dto';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';


@Controller('lab-orders')
@UseGuards(JwtAuthGuard, AclGuard)
export class LabOrdersController {
  constructor(private readonly labOrdersService: LabOrdersService) {}

  @Get()
  @RequirePermission('laboratories', 'read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: LabOrderQueryDto,
  ): Promise<PaginatedResponseDto<LabOrderListResponseDto>> {
    return this.labOrdersService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermission('laboratories', 'read')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.labOrdersService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermission('laboratories', 'create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLabOrderDto,
  ) {
    return this.labOrdersService.create(user.tenantId, dto);
  }
}
