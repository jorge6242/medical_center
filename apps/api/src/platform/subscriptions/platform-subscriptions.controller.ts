import {
  Body,
  Controller,
  Get,
  BadRequestException,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ChangeStatusDto,
  CreatePeriodDto,
  RegisterPaymentDto,
  UpdateContractDto,
  VoidPaymentDto,
} from './dto/subscription-dto';
import { PlatformTenantIdPipe } from '../common/platform-tenant-id';
import { SubscriptionHistoryQueryDto } from './dto/subscription-history-query.dto';
import { PlatformSubscriptionPaymentsService } from './platform-subscription-payments.service';
import { PlatformSubscriptionsService } from './platform-subscriptions.service';
import { PrismaService } from '../../database/prisma.service';
import { CurrentPlatformAdmin } from '../auth/current-platform-admin.decorator';
import { PlatformCsrfGuard } from '../auth/platform-csrf.guard';
import { PlatformRealm } from '../auth/platform-realm.decorator';

import type { PlatformIdentity } from '../auth/platform-auth.service';

const MIN_KEY = 8;
const MAX_KEY = 128;

@Controller('platform')
@PlatformRealm()
@UseGuards(PlatformCsrfGuard)
export class PlatformSubscriptionsController {
  constructor(
    private readonly subscriptions: PlatformSubscriptionsService,
    private readonly payments: PlatformSubscriptionPaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('tenants/:id/subscription/invoices/:invoiceId/payments')
  registerPayment(
    @CurrentPlatformAdmin() admin: PlatformIdentity,
    @Param('id', PlatformTenantIdPipe) id: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: RegisterPaymentDto,
  ) {
    return this.payments.registerPayment(admin, id, invoiceId, {
      ...dto,
      rate: dto.rate ?? null,
      idempotencyKey: requireKey(key),
    });
  }

  @Post('tenants/:id/subscription/payments/:paymentId/void')
  voidPayment(
    @CurrentPlatformAdmin() admin: PlatformIdentity,
    @Param('id', PlatformTenantIdPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: VoidPaymentDto,
  ) {
    return this.payments.voidPayment(admin, id, paymentId, {
      reason: dto.reason,
      idempotencyKey: requireKey(key),
    });
  }

  @Get('subscription-plans')
  plans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, basePriceUsd: true },
    });
  }

  @Get('tenants/:id/subscription')
  getContract(
    @Param('id', PlatformTenantIdPipe) id: string,
    @Query() query: SubscriptionHistoryQueryDto,
  ) {
    return this.subscriptions.getContract(id, query);
  }

  @Patch('tenants/:id/subscription')
  updateContract(
    @CurrentPlatformAdmin() admin: PlatformIdentity,
    @Param('id', PlatformTenantIdPipe) id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.subscriptions.updateContract(admin, id, dto);
  }

  @Post('tenants/:id/subscription/status')
  changeStatus(
    @CurrentPlatformAdmin() admin: PlatformIdentity,
    @Param('id', PlatformTenantIdPipe) id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.subscriptions.changeStatus(admin, id, dto);
  }

  @Post('tenants/:id/subscription/periods')
  createPeriod(
    @CurrentPlatformAdmin() admin: PlatformIdentity,
    @Param('id', PlatformTenantIdPipe) id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: CreatePeriodDto,
  ) {
    if (!key || key.length < MIN_KEY || key.length > MAX_KEY) {
      throw new BadRequestException(
        `Idempotency-Key requerido (${MIN_KEY}-${MAX_KEY} caracteres)`,
      );
    }
    return this.subscriptions.createPeriod(admin, id, {
      ...dto,
      idempotencyKey: key,
    });
  }
}

function requireKey(key: string | undefined): string {
  if (!key || key.length < MIN_KEY || key.length > MAX_KEY) {
    throw new BadRequestException(
      `Idempotency-Key requerido (${MIN_KEY}-${MAX_KEY} caracteres)`,
    );
  }
  return key;
}
