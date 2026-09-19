import { Module } from '@nestjs/common';

import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import { PatientMedicalRecordsController } from './patient-medical-records.controller';

@Module({
  imports: [],
  controllers: [MedicalRecordsController, PatientMedicalRecordsController],
  providers: [MedicalRecordsService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
