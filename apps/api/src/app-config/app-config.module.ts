import { Module } from '@nestjs/common';

import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { RailwayBucketModule } from '../railway-bucket/railway-bucket.module';

@Module({
  imports: [ExchangeRatesModule, RailwayBucketModule],
  controllers: [AppConfigController],
  providers: [AppConfigService],
})
export class AppConfigModule {}
