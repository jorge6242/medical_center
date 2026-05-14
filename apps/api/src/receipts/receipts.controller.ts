import { BadRequestException, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';

import { ReceiptsService } from './receipts.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';
import { InternalRequest } from '../common/decorators/internal-request.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { ReceiptResponseDto } from './dto/receipt-response.dto';

@Controller('receipts')
@UseGuards(JwtAuthGuard, AclGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get(':paymentId/data')
  @RequirePermission('payments', 'read')
  getByPayment(
    @CurrentUser() user: JwtPayload,
    @Param('paymentId') paymentId: string,
  ): Promise<ReceiptResponseDto> {
    return this.receiptsService.findByPayment(user.tenantId, paymentId);
  }

  @Post(':paymentId/generate')
  @InternalRequest()
  generate(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-generated-by-id') generatedById: string | undefined,
    @Param('paymentId') paymentId: string,
  ): Promise<ReceiptResponseDto> {
    if (!tenantId || !generatedById) {
      throw new BadRequestException('Missing internal receipt headers');
    }

    return this.receiptsService.createForPayment(tenantId, paymentId, generatedById);
  }
}
