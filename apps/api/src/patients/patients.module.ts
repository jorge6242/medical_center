import { Module } from '@nestjs/common';

import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { RailwayBucketModule } from '../railway-bucket/railway-bucket.module';

@Module({
  imports: [RailwayBucketModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
