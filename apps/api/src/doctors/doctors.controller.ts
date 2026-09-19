import {
  BadGatewayException,
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

import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { OnboardingService } from './onboarding.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { LookupQueryDto } from '../common/dto/lookup-query.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

import type { DoctorResponseDto } from './dto/doctor-response.dto';
import type { SacsQueryResult } from './sacs-verification.service';
import type { LookupResponseDto } from '../common/dto/lookup-response.dto';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';


@Controller('doctors')
@UseGuards(JwtAuthGuard, AclGuard)
export class DoctorsController {
  constructor(
    private readonly doctorsService: DoctorsService,
    private readonly onboardingService: OnboardingService,
  ) {}

  @Get('lookup')
  @RequirePermission('doctors', 'read')
  lookup(
    @CurrentUser() user: JwtPayload,
    @Query() query: LookupQueryDto,
  ): Promise<LookupResponseDto> {
    return this.doctorsService.lookup(user.tenantId, query);
  }

  @Get()
  @RequirePermission('doctors', 'read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<DoctorResponseDto>> {
    return this.doctorsService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermission('doctors', 'read')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<DoctorResponseDto> {
    return this.doctorsService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermission('doctors', 'create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDoctorDto,
  ): Promise<DoctorResponseDto> {
    return this.doctorsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('doctors', 'update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
  ): Promise<DoctorResponseDto> {
    return this.doctorsService.update(user.tenantId, id, dto);
  }

  @Post(':id/verify')
  @RequirePermission('doctors', 'update')
  verify(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<DoctorResponseDto> {
    return this.doctorsService.verify(user.tenantId, id);
  }

  @Post('verify-document')
  @RequirePermission('doctors', 'read')
  async verifyDocument(@Body() dto: VerifyDocumentDto): Promise<SacsQueryResult> {
    try {
      return await this.doctorsService.verifyDocument(dto.documentType, dto.documentId);
    } catch {
      throw new BadGatewayException('SACS_UNAVAILABLE', 'No se pudo conectar con SACS. Intente nuevamente.');
    }
  }

  @Get(':id/service-prices')
  @RequirePermission('doctors', 'read')
  getServicePrices(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.doctorsService.getServicePrices(user.tenantId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('doctors', 'delete')
  deactivate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<DoctorResponseDto> {
    return this.doctorsService.deactivate(user.tenantId, id);
  }

  @Post(':id/send-onboarding')
  @RequirePermission('doctors', 'update')
  async sendOnboarding(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ message: string; tokenId: string; sentAt: Date }> {
    const result = await this.onboardingService.sendOnboarding(user.tenantId, id, user.sub);
    return {
      message: 'Invitación enviada exitosamente',
      tokenId: result.tokenId,
      sentAt: result.sentAt,
    };
  }

  @Get(':id/onboarding-status')
  @RequirePermission('doctors', 'read')
  async getOnboardingStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ status: string; sentAt: Date | null; expiresAt: Date | null }> {
    return this.onboardingService.getOnboardingStatus(user.tenantId, id);
  }
}
