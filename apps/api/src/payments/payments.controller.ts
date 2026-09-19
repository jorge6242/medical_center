import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CreatePaymentAdjustmentDto } from './dto/create-payment-adjustment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { PaymentsService } from './payments.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { PaymentResponseDto } from './dto/payment-response.dto';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';


@Controller('payments')
@UseGuards(JwtAuthGuard, AclGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @RequirePermission('payments', 'read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaymentQueryDto,
  ): Promise<PaginatedResponseDto<PaymentResponseDto>> {
    return this.paymentsService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermission('payments', 'read')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermission('payments', 'create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.create(user.tenantId, user.sub, dto);
  }

  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('payments', 'delete')
  void(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.voidPayment(user.tenantId, id);
  }

  @Post(':id/adjustments')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('payments', 'delete')
  createAdjustment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreatePaymentAdjustmentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.addAdjustment(user.tenantId, id, dto);
  }
}
