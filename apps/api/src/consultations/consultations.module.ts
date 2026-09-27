import { Module } from '@nestjs/common';

import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import { RailwayBucketModule } from '../railway-bucket/railway-bucket.module';

@Module({
  imports: [RailwayBucketModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
