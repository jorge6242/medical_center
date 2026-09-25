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

import { type DoctorPayoutsService } from './doctor-payouts.service';
import { type CreateDoctorPayoutDto } from './dto/create-doctor-payout.dto';
import { type DoctorPayoutQueryDto } from './dto/doctor-payout-query.dto';
import { type VoidDoctorPayoutDto } from './dto/void-doctor-payout.dto';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('doctor-payouts')
@UseGuards(JwtAuthGuard, AclGuard)
export class DoctorPayoutsController {
  constructor(private readonly doctorPayoutsService: DoctorPayoutsService) {}

  @Get('pending/:doctorId')
  @RequirePermission('doctor_payouts', 'read')
  findPending(
    @CurrentUser() user: JwtPayload,
    @Param('doctorId') doctorId: string,
  ) {
    return this.doctorPayoutsService.findPending(user.tenantId, doctorId);
  }

  @Get()
  @RequirePermission('doctor_payouts', 'read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: DoctorPayoutQueryDto,
  ) {
    return this.doctorPayoutsService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermission('doctor_payouts', 'read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.doctorPayoutsService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermission('doctor_payouts', 'create')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDoctorPayoutDto) {
    return this.doctorPayoutsService.create(user.tenantId, user.sub, dto);
  }

  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('doctor_payouts', 'delete')
  void(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: VoidDoctorPayoutDto,
  ) {
    return this.doctorPayoutsService.void(
      user.tenantId,
      user.sub,
      id,
      dto.reason,
    );
  }
}
