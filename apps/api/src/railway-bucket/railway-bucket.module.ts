import { Module } from '@nestjs/common';

import { RailwayBucketService } from './railway-bucket.service';

@Module({
  providers: [RailwayBucketService],
  exports: [RailwayBucketService],
})
export class RailwayBucketModule {}
