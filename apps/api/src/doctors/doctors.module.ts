import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';

import { DoctorsMeController } from './doctors-me.controller';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { OnboardingService } from './onboarding.service';
import { SacsVerificationCron } from './sacs-verification.cron';
import { SacsVerificationService } from './sacs-verification.service';

@Module({
  imports: [JwtModule.register({}), ScheduleModule.forRoot()],
  controllers: [DoctorsMeController, DoctorsController],
  providers: [
    DoctorsService,
    OnboardingService,
    SacsVerificationService,
    SacsVerificationCron,
  ],
  exports: [DoctorsService, OnboardingService],
})
export class DoctorsModule {}
