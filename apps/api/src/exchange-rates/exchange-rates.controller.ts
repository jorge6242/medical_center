import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { ExchangeRatesService } from './exchange-rates.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { ExchangeRateResponseDto } from './dto/exchange-rate-response.dto';

@Controller('exchange-rates')
@UseGuards(JwtAuthGuard, AclGuard)
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  @Get()
  @RequirePermission('reports', 'read')
  findAll(@CurrentUser() user: JwtPayload): Promise<ExchangeRateResponseDto[]> {
    return this.service.findAll(user.tenantId);
  }

  @Get('latest')
  @RequirePermission('reports', 'read')
  findLatest(
    @CurrentUser() user: JwtPayload,
  ): Promise<ExchangeRateResponseDto | null> {
    return this.service.findLatest(user.tenantId);
  }

  @Post()
  @RequirePermission('reports', 'read')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExchangeRateDto,
  ): Promise<ExchangeRateResponseDto> {
    return this.service.create(user.tenantId, dto);
  }

  @Put(':id')
  @RequirePermission('reports', 'read')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateExchangeRateDto,
  ): Promise<ExchangeRateResponseDto> {
    return this.service.update(user.tenantId, id, dto);
  }
}
