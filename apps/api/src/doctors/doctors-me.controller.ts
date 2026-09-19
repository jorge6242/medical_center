import { Body, Controller, Get, NotFoundException, Patch, Post, UseGuards } from '@nestjs/common';

import { DoctorsService } from './doctors.service';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { DoctorResponseDto } from './dto/doctor-response.dto';


@Controller('doctors/me')
@UseGuards(JwtAuthGuard, AclGuard)
export class DoctorsMeController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @RequirePermission('doctors', 'read')
  async findMe(@CurrentUser() user: JwtPayload): Promise<DoctorResponseDto> {
    if (!user.doctorId) {
      throw new NotFoundException('No tienes un perfil de doctor asociado');
    }
    return this.doctorsService.findOne(user.tenantId, user.doctorId);
  }

  @Patch()
  @RequirePermission('doctors', 'update')
  async updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDoctorProfileDto,
  ): Promise<DoctorResponseDto> {
    if (!user.doctorId) {
      throw new NotFoundException('No tienes un perfil de doctor asociado');
    }
    return this.doctorsService.updateProfile(user.tenantId, user.doctorId, dto);
  }

  @Post('verify-license')
  @RequirePermission('doctors', 'update')
  async verifyLicense(@CurrentUser() user: JwtPayload): Promise<DoctorResponseDto> {
    if (!user.doctorId) {
      throw new NotFoundException('No tienes un perfil de doctor asociado');
    }
    return this.doctorsService.verify(user.tenantId, user.doctorId);
  }

  @Get('verification-status')
  @RequirePermission('doctors', 'read')
  async getVerificationStatus(@CurrentUser() user: JwtPayload): Promise<{ status: string; licenseNumber: string | null }> {
    if (!user.doctorId) {
      throw new NotFoundException('No tienes un perfil de doctor asociado');
    }
    return this.doctorsService.getVerificationStatus(user.tenantId, user.doctorId);
  }
}
