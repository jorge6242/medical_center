import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { MedicalRecordsService } from './medical-records.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';


@Controller('patients/:patientId/medical-records')
@UseGuards(JwtAuthGuard, AclGuard)
@RequirePermission('patients', 'read')
export class PatientMedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get()
  findByPatient(@CurrentUser() user: JwtPayload, @Param('patientId') patientId: string) {
    return this.medicalRecordsService.findByPatient(user.tenantId, patientId);
  }
}
