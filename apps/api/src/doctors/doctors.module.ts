import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { SacsVerificationCron } from './sacs-verification.cron';
import { SacsVerificationService } from './sacs-verification.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [DoctorsController],
  providers: [DoctorsService, SacsVerificationService, SacsVerificationCron],
  exports: [DoctorsService],
})
export class DoctorsModule {}
