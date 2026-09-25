import { Module } from '@nestjs/common';

import { DoctorPayoutsController } from './doctor-payouts.controller';
import { DoctorPayoutsService } from './doctor-payouts.service';

@Module({
  controllers: [DoctorPayoutsController],
  providers: [DoctorPayoutsService],
})
export class DoctorPayoutsModule {}
